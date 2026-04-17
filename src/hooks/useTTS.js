import { useEffect, useState, useCallback, useRef } from 'react';

/**
 * TTS strategy:
 * 1) Try OpenRouter chat/completions audio streaming.
 * 2) Fallback to browser SpeechSynthesis when remote TTS is unavailable.
 */
export const useTTS = () => {
  const [voices, setVoices] = useState([]);
  const currentAudioRef = useRef(null);
  const activeFetchRef = useRef(null);

  const remoteTtsEnabled = String(import.meta.env.VITE_ENABLE_REMOTE_TTS ?? '1') !== '0';
  const remoteTtsEndpoint = String(
    import.meta.env.VITE_GEMINI_TTS_ENDPOINT ||
      import.meta.env.VITE_GEMINI_ENDPOINT ||
      'https://openrouter.ai/api/v1'
  ).replace(/\/$/, '');
  const remoteTtsApiKey = String(import.meta.env.VITE_GEMINI_API_KEY || '').trim();
  const remoteTtsVoice = String(import.meta.env.VITE_GEMINI_TTS_VOICE || 'Kore').trim();
  const remoteTtsModelRaw = String(
    import.meta.env.VITE_GEMINI_TTS_MODEL || 'gemini-2.5-flash-preview-tts'
  ).trim();

  const remoteTtsModels = Array.from(
    new Set(
      [
        remoteTtsModelRaw,
        remoteTtsModelRaw.startsWith('google/')
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

  const hashStr = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i += 1) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
  };

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

  const playRemoteTTS = useCallback(
    async (cleanText) => {
      if (!remoteTtsEnabled || !remoteTtsApiKey || !cleanText) return false;

      for (const model of remoteTtsModels) {
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
              messages: [{ role: 'user', content: cleanText }],
              modalities: ['text', 'audio'],
              audio: {
                voice: remoteTtsVoice,
                format: 'mp3',
              },
              stream: true,
            }),
            signal: controller.signal,
          });

          if (!response.ok) continue;

          const reader = response.body?.getReader?.();
          if (!reader) continue;

          const decoder = new TextDecoder();
          const audioChunks = [];
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            let splitIndex;
            while ((splitIndex = buffer.indexOf('\n\n')) >= 0) {
              const block = buffer.slice(0, splitIndex);
              buffer = buffer.slice(splitIndex + 2);

              const line = block
                .split('\n')
                .find((item) => item.trim().startsWith('data:'));
              if (!line) continue;

              const payload = line.replace(/^data:\s*/, '').trim();
              if (!payload || payload === '[DONE]') continue;

              try {
                const parsed = JSON.parse(payload);
                const audioData = parsed?.choices?.[0]?.delta?.audio?.data;
                if (audioData) audioChunks.push(audioData);
              } catch {
                // ignore malformed SSE chunk
              }
            }
          }

          if (audioChunks.length === 0) continue;

          const base64 = audioChunks.join('');
          const bin = atob(base64);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i += 1) {
            bytes[i] = bin.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: 'audio/mpeg' });
          if (!blob || blob.size === 0) continue;

          const audioUrl = URL.createObjectURL(blob);
          const audio = new Audio(audioUrl);
          currentAudioRef.current = audio;
          await audio.play();

          activeFetchRef.current = null;
          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            if (currentAudioRef.current === audio) {
              currentAudioRef.current = null;
            }
          };
          return true;
        } catch {
          // try next model/fallback
        }
      }

      activeFetchRef.current = null;
      return false;
    },
    [
      remoteTtsApiKey,
      remoteTtsEnabled,
      remoteTtsEndpoint,
      remoteTtsModels,
      remoteTtsVoice,
    ]
  );

  const speak = useCallback(
    (text, aiConfig) => {
      const synth = window.speechSynthesis;
      if (!synth || !text) return;

      stopRemoteAudio();
      synth.cancel();

      const cleanText = String(text)
        .replace(/[\*\(\[（【].*?[\*\)\]）】]/g, '')
        .replace(/[~\-]/g, ' ')
        .trim();

      if (!cleanText) return;

      void (async () => {
        const played = await playRemoteTTS(cleanText);
        if (played) return;

        const hash = hashStr(aiConfig?.id || aiConfig?.name || 'default');
        const utterance = new SpeechSynthesisUtterance(cleanText);
        const enVoices = voices.filter((v) => v.lang.startsWith('en'));

        if (enVoices.length > 0) {
          const avatar = aiConfig?.avatar || '';
          const isMale = ['👦', '🧑', '👨', '🙎', '🕴', '👨‍🎤', '👨‍🦰', '👨‍🦱'].some((a) =>
            avatar.includes(a)
          );
          const isFemale = ['👧', '👩', '🙍', '🙋', '👩‍🎤', '👩‍🦰', '👩‍🦱'].some((a) =>
            avatar.includes(a)
          );

          let pool = enVoices;
          if (isMale) {
            const mPool = enVoices.filter((v) =>
              /male|boy|m|david|mark|james|guy|ryan/i.test(v.name)
            );
            if (mPool.length > 0) pool = mPool;
          } else if (isFemale) {
            const fPool = enVoices.filter((v) =>
              /female|girl|f|zira|susan|linda|eva|jenny|heather/i.test(v.name)
            );
            if (fPool.length > 0) pool = fPool;
          }

          const selectedVoice = pool[hash % pool.length] || enVoices[hash % enVoices.length];
          if (selectedVoice) {
            utterance.voice = selectedVoice;
          }
        }

        utterance.volume = 0.4;
        const tone = aiConfig?.dialogueStyle?.tone || '';
        const features = aiConfig?.dialogueStyle?.features || [];

        if (
          ['formal', 'tired', 'melancholic', 'philosophical'].includes(tone) ||
          features.includes('疲惫')
        ) {
          utterance.rate = 0.85;
          utterance.pitch = 0.8;
        } else if (
          ['casual', 'excited', 'passionate'].includes(tone) ||
          features.includes('易慌')
        ) {
          utterance.rate = 1.15;
          utterance.pitch = 1.2;
        } else {
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
        }

        synth.speak(utterance);
      })();
    },
    [playRemoteTTS, stopRemoteAudio, voices]
  );

  const stop = useCallback(() => {
    stopRemoteAudio();
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, [stopRemoteAudio]);

  return { speak, stopTTS: stop };
};
