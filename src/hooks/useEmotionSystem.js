/**
 * useEmotionSystem - 情绪系统状态管理 Hook
 * 
 * 管理情绪面板相关的所有状态：
 * - surfaceEmotions（表面情绪列表）
 * - selectedEmotions（玩家选中的情绪）
 * - emotionHints（情绪提示）
 * - dynamicCustomerEmotions（动态顾客情绪，每次喝酒后可能变化）
 * - handleEmotionSelect（情绪选择切换）
 * - updateEmotions（根据信任度更新提示）
 * - resetEmotionState
 */
import { useState, useCallback } from 'react';
import { getEmotionHint, getHintLevel } from '../data/emotions.js';

const CLUE_RULES = [
  { type: 'topic_avoidance', label: '回避关键话题', pattern: /(先不聊|不想谈|别问|不重要|算了|换个话题|不提这个|不说这个)/ },
  { type: 'self_interruption', label: '说到一半停住', pattern: /(……|\.\.\.|没什么|算了吧|就这样吧)/ },
  { type: 'joking_cover', label: '用玩笑掩饰认真', pattern: /(开玩笑|逗你|别当真|哈哈|笑死|随便说说)/ },
  { type: 'defensive_posture', label: '防御姿态明显', pattern: /(你不懂|说了你也不懂|没必要解释|别管我|不用你管)/ },
  { type: 'downplay_then_care', label: '嘴上轻描淡写却在意', pattern: /(没事|还好|无所谓|就那样).*(但是|不过|其实)/ },
  { type: 'symbol_repetition', label: '反复提到同一意象', pattern: /(总是|一直|反复|每次).*(今天|以前|那件事|同样|一样)/ }
];

const trimSnippet = (content = '') => {
  const normalized = String(content).replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  return normalized.length > 30 ? `${normalized.slice(0, 30)}…` : normalized;
};

const inferDialogueClues = (content = '') => {
  const text = String(content).trim();
  if (!text) return [];

  const inferred = CLUE_RULES
    .filter(rule => rule.pattern.test(text))
    .map(rule => ({
      type: rule.type,
      label: rule.label,
      snippet: trimSnippet(text)
    }));

  const dedup = [];
  const seen = new Set();
  for (const clue of inferred) {
    if (seen.has(clue.type)) continue;
    seen.add(clue.type);
    dedup.push(clue);
    if (dedup.length >= 2) break;
  }

  return dedup;
};

export const useEmotionSystem = ({ playSFX = () => {}, showGameHint = () => {} } = {}) => {
  const [surfaceEmotions, setSurfaceEmotions] = useState([]);
  const [selectedEmotions, setSelectedEmotions] = useState([]);
  const [emotionHints, setEmotionHints] = useState([]);
  const [dynamicCustomerEmotions, setDynamicCustomerEmotions] = useState({ surface: [], reality: [] });
  const [observedClues, setObservedClues] = useState([]);

  /** 情绪选择切换（最多3个） */
  const handleEmotionSelect = useCallback((emotionId) => {
    if (selectedEmotions.includes(emotionId)) {
      setSelectedEmotions(prev => prev.filter(id => id !== emotionId));
    } else if (selectedEmotions.length < 3) {
      playSFX('select');
      setSelectedEmotions(prev => [...prev, emotionId]);
    }
  }, [selectedEmotions, playSFX]);

  /**
   * 根据信任度更新情绪提示
   * @param {Object} aiConfig - 顾客配置
   * @param {number} trustLevel - 当前信任度
   */
  const updateEmotions = useCallback((aiConfig, trustLevel) => {
    const customerRealEmotions = dynamicCustomerEmotions.reality.length > 0
      ? dynamicCustomerEmotions.reality
      : (aiConfig?.emotionMask?.reality || []);
    const hintLevel = getHintLevel(trustLevel);

    if (hintLevel && customerRealEmotions.length > 0) {
      let hintsToShow = [];

      if (trustLevel >= 0.7) {
        hintsToShow = customerRealEmotions.map(emotionId => ({
          emotionId,
          hint: getEmotionHint(emotionId, trustLevel),
          level: 'high'
        }));
        if (emotionHints.length === 0 || emotionHints[0]?.level !== 'high') {
          showGameHint('trust_high');
        }
      } else if (trustLevel >= 0.5) {
        const partialEmotions = customerRealEmotions.slice(0, Math.ceil(customerRealEmotions.length / 2));
        hintsToShow = partialEmotions.map(emotionId => ({
          emotionId,
          hint: getEmotionHint(emotionId, trustLevel),
          level: 'medium'
        }));
        if (emotionHints.length === 0 || emotionHints[0]?.level === 'low') {
          showGameHint('trust_medium');
        }
      } else if (trustLevel >= 0.3) {
        hintsToShow = [{
          emotionId: customerRealEmotions[0],
          hint: getEmotionHint(customerRealEmotions[0], trustLevel),
          level: 'low'
        }];
      }

      setEmotionHints(hintsToShow);

    }
  }, [dynamicCustomerEmotions, emotionHints, showGameHint]);

  const registerDialogueClues = useCallback((content) => {
    const inferred = inferDialogueClues(content);
    if (inferred.length === 0) return [];

    const now = Date.now();
    const next = [...observedClues];
    const added = [];

    inferred.forEach((clue) => {
      const existingIndex = next.findIndex(item => item.type === clue.type);
      if (existingIndex >= 0) {
        const current = next[existingIndex];
        next[existingIndex] = {
          ...current,
          snippet: clue.snippet,
          count: Math.min((current.count || 1) + 1, 9),
          lastSeenAt: now
        };
      } else {
        const item = {
          ...clue,
          id: `${clue.type}-${now}-${Math.random().toString(36).slice(2, 7)}`,
          count: 1,
          firstSeenAt: now,
          lastSeenAt: now
        };
        next.push(item);
        added.push(item);
      }
    });

    setObservedClues(next.slice(-8));
    return added;
  }, [observedClues]);

  const clearObservedClues = useCallback(() => {
    setObservedClues([]);
  }, []);

  /** 重置所有情绪状态（新顾客时） */
  const resetEmotionState = useCallback(() => {
    setSurfaceEmotions([]);
    setSelectedEmotions([]);
    setEmotionHints([]);
    setDynamicCustomerEmotions({ surface: [], reality: [] });
    setObservedClues([]);
  }, []);

  return {
    surfaceEmotions, setSurfaceEmotions,
    selectedEmotions, setSelectedEmotions,
    emotionHints, setEmotionHints,
    dynamicCustomerEmotions, setDynamicCustomerEmotions,
    observedClues, setObservedClues,
    handleEmotionSelect,
    updateEmotions,
    registerDialogueClues,
    clearObservedClues,
    resetEmotionState,
  };
};

export default useEmotionSystem;
