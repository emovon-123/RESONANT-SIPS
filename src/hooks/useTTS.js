import { useEffect, useState, useCallback, useRef } from 'react';

/**
 * TTS strategy:
 * Use remote TTS only. If the returned transcript does not match the on-screen text,
 * drop the audio instead of falling back to browser SpeechSynthesis.
 */
export const useTTS = () => {
  const [voices, setVoices] = useState([]);
  const currentAudioRef = useRef(null);
  const activeFetchRef = useRef(null);
  const strictTextSync = String(import.meta.env.VITE_TTS_STRICT_TEXT_SYNC ?? '1') !== '0';
  const remoteTtsEnabled = String(import.meta.env.VITE_ENABLE_REMOTE_TTS ?? '1') !== '0';
  const ttsDebug = String(import.meta.env.VITE_TTS_DEBUG ?? '1') !== '0';
  const remoteTtsEndpoint = String(
    import.meta.env.VITE_GEMINI_TTS_ENDPOINT ||
      import.meta.env.VITE_GEMINI_ENDPOINT ||
      'https://openrouter.ai/api/v1'
  ).replace(/\/$/, '');
  const isOpenRouterEndpoint = /openrouter\.ai$/i.test(
    (() => {
      try {
        return new URL(remoteTtsEndpoint).hostname;
      } catch {
        return '';
      }
    })()
  );
  const remoteTtsApiKey = String(import.meta.env.VITE_GEMINI_API_KEY || '').trim();
  const remoteTtsVoice = String(import.meta.env.VITE_GEMINI_TTS_VOICE || 'Kore').trim();
  const remoteTtsFormat = String(import.meta.env.VITE_GEMINI_TTS_FORMAT || 'pcm16').trim().toLowerCase();
  const remoteTtsModelRaw = String(
    import.meta.env.VITE_GEMINI_TTS_MODEL || 'gemini-2.5-flash-preview-tts'
  ).trim();

  const remoteTtsModels = Array.from(
    new Set(
      [
        remoteTtsModelRaw,
        /^(google|openai)\//.test(remoteTtsModelRaw)
          ? remoteTtsModelRaw
          : `google/${remoteTtsModelRaw}`,
      ].filter(Boolean)
    )
  );

  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;

    const updateVoices = () => {
      setVoices(synth.getVoices());
    };

    updateVoices();
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = updateVoices;
    }
  }, []);

  const normalizeSpokenText = useCallback((text) => {
    return String(text || '')
      .replace(/\*+([^*]+)\*+/g, '$1')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, '\'')
      .replace(/\s+/g, ' ')
      .trim();
  }, []);

  const normalizeTtsComparisonText = useCallback((text) => {
    return normalizeSpokenText(text)
      .replace(/[.,!?;:]/g, '')
      .replace(/…/g, '')
      .replace(/["']/g, '')
      .toLowerCase();
  }, [normalizeSpokenText]);

  const isTranscriptCloseEnough = useCallback((expectedText, actualText) => {
    const expected = normalizeTtsComparisonText(expectedText);
    const actual = normalizeTtsComparisonText(actualText);
    if (!expected || !actual) return false;
    if (expected === actual) return true;
    if (expected.includes(actual) || actual.includes(expected)) return true;

    const expectedTokens = expected.split(/\s+/).filter(Boolean);
    const actualTokens = actual.split(/\s+/).filter(Boolean);
    if (expectedTokens.length === 0 || actualTokens.length === 0) return false;

    let matches = 0;
    const actualBag = new Map();
    for (const token of actualTokens) {
      actualBag.set(token, (actualBag.get(token) || 0) + 1);
    }

    for (const token of expectedTokens) {
      const count = actualBag.get(token) || 0;
      if (count > 0) {
        matches += 1;
        actualBag.set(token, count - 1);
      }
    }

    const overlap = matches / Math.max(expectedTokens.length, actualTokens.length);
    return overlap >= 0.85;
  }, [normalizeTtsComparisonText]);

  const createTtsScript = useCallback((text) => {
    return normalizeSpokenText(text)
      .replace(/\s*\.\.\.\s*/g, ', ')
      .replace(/\s*…\s*/g, ', ')
      .replace(/\s*--\s*/g, ', ')
      .replace(/\s*-\s*/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }, [normalizeSpokenText]);

  const logTtsDebug = useCallback((label, payload = {}) => {
    if (!ttsDebug) return;
    console.log(`[TTS] ${label}`, payload);
  }, [ttsDebug]);

  const hashStr = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i += 1) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
  };

  const pcm16ToWavBlob = (pcmBytes, sampleRate = 24000, channels = 1, trailingSilenceMs = 900) => {
    const bytesPerSample = 2;
    const blockAlign = channels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const wavHeaderSize = 44;
    const silenceBytes = Math.max(
      0,
      Math.round((sampleRate * blockAlign * trailingSilenceMs) / 1000)
    );
    const dataSize = pcmBytes.length + silenceBytes;
    const totalSize = wavHeaderSize + dataSize;

    const wav = new ArrayBuffer(totalSize);
    const view = new DataView(wav);
    let offset = 0;

    const writeStr = (s) => {
      for (let i = 0; i < s.length; i += 1) {
        view.setUint8(offset + i, s.charCodeAt(i));
      }
      offset += s.length;
    };

    writeStr('RIFF');
    view.setUint32(offset, totalSize - 8, true); offset += 4;
    writeStr('WAVE');
    writeStr('fmt ');
    view.setUint32(offset, 16, true); offset += 4;
    view.setUint16(offset, 1, true); offset += 2; // PCM
    view.setUint16(offset, channels, true); offset += 2;
    view.setUint32(offset, sampleRate, true); offset += 4;
    view.setUint32(offset, byteRate, true); offset += 4;
    view.setUint16(offset, blockAlign, true); offset += 2;
    view.setUint16(offset, 16, true); offset += 2; // bits per sample
    writeStr('data');
    view.setUint32(offset, dataSize, true); offset += 4;

    const body = new Uint8Array(wav, wavHeaderSize);
    body.set(pcmBytes);
    return new Blob([wav], { type: 'audio/wav' });
  };

  const decodeBase64AudioChunks = useCallback((chunks) => {
    const decodedChunks = [];
    let totalLength = 0;
    let carry = '';

    const pushDecodedBase64 = (base64Chunk) => {
      const cleanChunk = String(base64Chunk || '').replace(/\s+/g, '');
      if (!cleanChunk) return;

      const bin = atob(cleanChunk);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i += 1) {
        bytes[i] = bin.charCodeAt(i);
      }

      decodedChunks.push(bytes);
      totalLength += bytes.length;
    };

    for (const chunk of chunks) {
      const cleanChunk = String(chunk || '').replace(/\s+/g, '');
      if (!cleanChunk) continue;

      const mergedChunk = `${carry}${cleanChunk}`;
      const hasPadding = mergedChunk.includes('=');

      if (hasPadding) {
        try {
          pushDecodedBase64(mergedChunk);
          carry = '';
          continue;
        } catch {
          // fall through to partial decoding
        }
      }

      const decodableLength = mergedChunk.length - (mergedChunk.length % 4);
      if (decodableLength > 0) {
        const readyPart = mergedChunk.slice(0, decodableLength);
        const restPart = mergedChunk.slice(decodableLength);
        try {
          pushDecodedBase64(readyPart);
          carry = restPart;
          continue;
        } catch {
          // fall through to store everything in carry
        }
      }

      carry = mergedChunk;
    }

    if (carry) {
      const paddedCarry = carry.padEnd(carry.length + ((4 - (carry.length % 4)) % 4), '=');
      pushDecodedBase64(paddedCarry);
    }

    const merged = new Uint8Array(totalLength);
    let offset = 0;
    for (const bytes of decodedChunks) {
      merged.set(bytes, offset);
      offset += bytes.length;
    }

    return merged;
  }, []);

  const getPreferredChatAudioFormats = useCallback((model) => {
    if (/^openai\//.test(model) && isOpenRouterEndpoint) {
      if (remoteTtsFormat === 'mp3') {
        return ['mp3', 'pcm16'];
      }
      return ['mp3', 'pcm16'];
    }
    return [remoteTtsFormat === 'mp3' ? 'mp3' : 'pcm16'];
  }, [isOpenRouterEndpoint, remoteTtsFormat]);

  const stopRemoteAudio = useCallback(() => {
    if (activeFetchRef.current) {
      activeFetchRef.current.abort();
      activeFetchRef.current = null;
    }
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
      } catch {
        // noop
      }
      currentAudioRef.current = null;
    }
  }, []);

  const waitForAudioReady = useCallback((audio) => {
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        audio.removeEventListener('canplaythrough', onReady);
        audio.removeEventListener('error', onError);
      };
      const onReady = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error('audio_failed_to_buffer'));
      };

      if (audio.readyState >= 4) {
        resolve();
        return;
      }

      audio.addEventListener('canplaythrough', onReady, { once: true });
      audio.addEventListener('error', onError, { once: true });
      audio.load();
    });
  }, []);

  const playAudioBlob = useCallback(async (blob, metadata = {}) => {
    if (!blob || blob.size === 0) {
      logTtsDebug('empty_audio_blob', metadata);
      return false;
    }

    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    audio.preload = 'auto';
    currentAudioRef.current = audio;

    await waitForAudioReady(audio);
    await audio.play();

    logTtsDebug('playback_started', metadata);

    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      if (currentAudioRef.current === audio) {
        currentAudioRef.current = null;
      }
    };

    return true;
  }, [logTtsDebug, waitForAudioReady]);

  const playSpeechEndpointTTS = useCallback(async (spokenScript, model, verbatimInstruction) => {
    const speechResponseFormat = remoteTtsFormat === 'pcm16' ? 'wav' : remoteTtsFormat;
    const controller = new AbortController();
    activeFetchRef.current = controller;

    try {
      const response = await fetch(`${remoteTtsEndpoint}/audio/speech`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${remoteTtsApiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'future-bartender-game',
        },
        body: JSON.stringify({
          model,
          voice: remoteTtsVoice,
          input: spokenScript,
          instructions: verbatimInstruction,
          response_format: speechResponseFormat,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        logTtsDebug('speech_endpoint_not_ok', {
          status: response.status,
          model,
          responseFormat: speechResponseFormat,
        });
        return false;
      }

      const audioBuffer = await response.arrayBuffer();
      const bytes = new Uint8Array(audioBuffer);
      const blobType =
        speechResponseFormat === 'mp3'
          ? 'audio/mpeg'
          : speechResponseFormat === 'wav'
            ? 'audio/wav'
            : speechResponseFormat === 'flac'
              ? 'audio/flac'
              : speechResponseFormat === 'opus'
                ? 'audio/ogg; codecs=opus'
                : 'audio/wav';
      const blob = new Blob([bytes], { type: blobType });

      const played = await playAudioBlob(blob, {
        model,
        format: speechResponseFormat,
        bytes: bytes.length,
        transcript: spokenScript,
        endpoint: 'audio/speech',
      });

      activeFetchRef.current = null;
      return played;
    } catch (error) {
      logTtsDebug('speech_endpoint_error', {
        model,
        error: error?.message || String(error),
      });
      return false;
    }
  }, [
    logTtsDebug,
    playAudioBlob,
    remoteTtsApiKey,
    remoteTtsEndpoint,
    remoteTtsFormat,
    remoteTtsVoice,
  ]);

  const playRemoteTTS = useCallback(
    async (spokenScript) => {
      if (!remoteTtsEnabled || !remoteTtsApiKey || !spokenScript) return false;

      const verbatimInstruction = [
        'You are a text-to-speech renderer.',
        'Read the provided text verbatim.',
        'Do not add, remove, summarize, paraphrase, translate, explain, roleplay, or answer.',
        'Speak exactly the text between <verbatim> and </verbatim>.',
        'If the text contains punctuation, preserve it only as natural speech pauses.',
        'Output audio only for that exact text.'
      ].join(' ');

      const verbatimPayload = [
        'Speak exactly this text and nothing else.',
        'Do not answer it, continue it, or describe it.',
        `TEXT: ${spokenScript}`
      ].join('\n');

      const processSseBlock = (block, audioChunks, textChunks) => {
        const lines = String(block || '')
          .split('\n')
          .filter((item) => item.trim().startsWith('data:'));

        for (const line of lines) {
          const payload = line.replace(/^data:\s*/, '').trim();
          if (!payload || payload === '[DONE]') continue;

          try {
            const parsed = JSON.parse(payload);
            const audioDelta = parsed?.choices?.[0]?.delta?.audio;
            const audioData = audioDelta?.data;
            const textDelta = audioDelta?.transcript;
            if (audioData) audioChunks.push(audioData);
            if (typeof textDelta === 'string' && textDelta.trim()) {
              textChunks.push(textDelta);
            }
          } catch {
            // ignore malformed SSE chunk
          }
        }
      };

      for (const model of remoteTtsModels) {
        if (/^openai\//.test(model) && !isOpenRouterEndpoint) {
          const played = await playSpeechEndpointTTS(spokenScript, model, verbatimInstruction);
          if (played) {
            return true;
          }
        }

        for (const chatAudioFormat of getPreferredChatAudioFormats(model)) {
          const controller = new AbortController();
          activeFetchRef.current = controller;

          try {
            const response = await fetch(`${remoteTtsEndpoint}/chat/completions`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${remoteTtsApiKey}`,
                'HTTP-Referer': window.location.origin,
                'X-Title': 'future-bartender-game',
              },
              body: JSON.stringify({
                model,
                messages: [
                  { role: 'system', content: verbatimInstruction },
                  { role: 'user', content: verbatimPayload }
                ],
                modalities: ['text', 'audio'],
                audio: {
                  voice: remoteTtsVoice,
                  format: chatAudioFormat,
                },
                temperature: 0,
                max_tokens: Math.max(64, Math.ceil(spokenScript.length * 1.5)),
                stream: true,
              }),
              signal: controller.signal,
            });

            if (!response.ok) {
              logTtsDebug('response_not_ok', {
                status: response.status,
                model,
                format: chatAudioFormat,
              });
              continue;
            }

            const reader = response.body?.getReader?.();
            if (!reader) continue;

            const decoder = new TextDecoder();
            const audioChunks = [];
            const textChunks = [];
            let buffer = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });

              let splitIndex;
              while ((splitIndex = buffer.indexOf('\n\n')) >= 0) {
                const block = buffer.slice(0, splitIndex);
                buffer = buffer.slice(splitIndex + 2);
                processSseBlock(block, audioChunks, textChunks);
              }
            }

            buffer += decoder.decode();
            if (buffer.trim()) {
              processSseBlock(buffer, audioChunks, textChunks);
            }

            if (audioChunks.length === 0) {
              logTtsDebug('no_audio_chunks', { model, format: chatAudioFormat });
              continue;
            }

            const remoteTranscript = textChunks.join('').trim();
            if (strictTextSync) {
              if (!remoteTranscript) {
                logTtsDebug('drop_no_transcript', { model, spokenScript, format: chatAudioFormat });
                continue;
              }
              const expected = normalizeTtsComparisonText(spokenScript);
              const actual = normalizeTtsComparisonText(remoteTranscript);
              if (!isTranscriptCloseEnough(spokenScript, remoteTranscript)) {
                logTtsDebug('drop_transcript_mismatch', {
                  model,
                  format: chatAudioFormat,
                  spokenScript,
                  remoteTranscript,
                  expected,
                  actual,
                });
                continue;
              }
            }

            const bytes = decodeBase64AudioChunks(audioChunks);
            const blob = chatAudioFormat === 'mp3'
              ? new Blob([bytes], { type: 'audio/mpeg' })
              : pcm16ToWavBlob(bytes, 24000, 1);

            const played = await playAudioBlob(blob, {
              model,
              format: chatAudioFormat,
              bytes: bytes.length,
              transcript: remoteTranscript,
            });
            if (!played) {
              continue;
            }

            activeFetchRef.current = null;
            return true;
          } catch (error) {
            logTtsDebug('play_remote_error', {
              model,
              error: error?.message || String(error),
            });
            continue;
          }
        }
      }

      activeFetchRef.current = null;
      logTtsDebug('playback_dropped', { spokenScript });
      return false;
    },
    [
      logTtsDebug,
      remoteTtsApiKey,
      remoteTtsEnabled,
      remoteTtsEndpoint,
      remoteTtsModels,
      remoteTtsVoice,
      remoteTtsFormat,
      getPreferredChatAudioFormats,
      isOpenRouterEndpoint,
      decodeBase64AudioChunks,
      playAudioBlob,
      playSpeechEndpointTTS,
      normalizeTtsComparisonText,
      isTranscriptCloseEnough,
      strictTextSync,
    ]
  );

  const speak = useCallback(
    (text, aiConfig) => {
      void aiConfig;
      if (!text) return;

      stopRemoteAudio();
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }

      const cleanText = normalizeSpokenText(text);
      const spokenScript = createTtsScript(cleanText);

      if (!spokenScript) return;

      void (async () => {
        await playRemoteTTS(spokenScript);
      })();
    },
    [createTtsScript, normalizeSpokenText, playRemoteTTS, stopRemoteAudio]
  );

  const stop = useCallback(() => {
    stopRemoteAudio();
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, [stopRemoteAudio]);

  return { speak, stopTTS: stop };
};
