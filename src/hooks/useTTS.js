import { useEffect, useState, useCallback } from 'react';

/**
 * useTTS - Web Speech API 文本转语音 Hook
 * 负责管理系统语音列表，并根据 AI 配置提供符合角色特性的发音
 */
export const useTTS = () => {
  const [voices, setVoices] = useState([]);

  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;

    const updateVoices = () => {
      setVoices(synth.getVoices());
    };

    // 初始化获取
    updateVoices();

    // 监听语音加载完成事件（部分浏览器异步加载）
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = updateVoices;
    }
  }, []);

  // 根据字符串计算哈希，用于伪随机一致地分配音色
  const hashStr = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
  };

  /**
   * 播放角色的语音
   * @param {string} text - 需要播报的文本
   * @param {object} aiConfig - AI 的配置，包含 id, avatar, dialogueStyle 等
   */
  const speak = useCallback((text, aiConfig) => {
    const synth = window.speechSynthesis;
    if (!synth || !text) return;

    // 清除之前的播报
    synth.cancel();

    // 过滤掉文本中的旁白/动作描写（例如包裹在 *星号* 或者 括号 里的内容）
    const cleanText = text
      .replace(/[\*\(\[（【].*?[\*\)\]）】]/g, '')
      .replace(/[\~\-]/g, ' ')
      .trim();

    if (!cleanText) return;

    const hash = hashStr(aiConfig?.id || aiConfig?.name || 'default');
    
    // 直接使用原文进行英文播报（时长自然由文本长度决定）
    const utterance = new SpeechSynthesisUtterance(cleanText);

    // 过滤并寻找英文语音（不要中文播报）
    const enVoices = voices.filter(v => v.lang.startsWith('en'));

    if (enVoices.length > 0) {
      // 简单判断性别倾向：分析 avatar 中是否包含明显的性别 emoji 提示
      const avatar = aiConfig?.avatar || '';
      const isMale = ['👨', '🧑', '👦', '👴', '🤵', '👨‍💼', '👨‍🚀', '👨‍💻'].some(a => avatar.includes(a));
      const isFemale = ['👩', '👧', '👵', '🤶', '👩‍💼', '👩‍🚀', '👩‍💻'].some(a => avatar.includes(a));

      let pool = enVoices;
      if (isMale) {
        const mPool = enVoices.filter(v => /male|boy|m|david|mark|james|guy|ryan/i.test(v.name));
        if (mPool.length > 0) pool = mPool;
      } else if (isFemale) {
        const fPool = enVoices.filter(v => /female|girl|f|zira|susan|linda|eva|jenny|heather/i.test(v.name));
        if (fPool.length > 0) pool = fPool;
      }
      
      // 固定分配一个音色给这个角色
      const selectedVoice = pool[hash % pool.length] || enVoices[hash % enVoices.length];
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    }

    // 根据性格/语调微调音高和语速。注意：用户提到音量不要太大
    utterance.volume = 0.4; // 适中音量，作为环境音的一部分，不要喧宾夺主
    
    const tone = aiConfig?.dialogueStyle?.tone || '';
    const features = aiConfig?.dialogueStyle?.features || [];
    
    if (['formal', 'tired', 'melancholic', 'philosophical'].includes(tone) || features.includes('疲惫')) {
      utterance.rate = 0.85; // 稍慢
      utterance.pitch = 0.8; // 稍低
    } else if (['casual', 'excited', 'passionate'].includes(tone) || features.includes('易慌')) {
      utterance.rate = 1.15; // 稍快
      utterance.pitch = 1.2; // 稍高
    } else {
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
    }

    synth.speak(utterance);
  }, [voices]);

  const stop = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  return { speak, stopTTS: stop };
};
