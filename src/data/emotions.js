import emotionsData from './emotions.json';

export const EMOTIONS = emotionsData.emotions;
export const INITIAL_UNLOCKED_EMOTIONS = emotionsData.initialUnlockedEmotions;
export const EMOTION_HINTS = emotionsData.emotionHints;
export const EMOTION_COMPATIBILITY = emotionsData.emotionCompatibility;
export const GLASS_TYPES = emotionsData.glassTypes;
export const EMOTION_TARGETS = emotionsData.emotionTargets;

export const getHintLevel = (trustLevel) => {
  if (trustLevel >= 0.7) return 'high';
  if (trustLevel >= 0.5) return 'medium';
  if (trustLevel >= 0.3) return 'low';
  return null;
};

export const getEmotionHint = (emotionId, trustLevel) => {
  const level = getHintLevel(trustLevel);
  if (!level) return null;
  return EMOTION_HINTS[level][emotionId] || null;
};

export const checkEmotionCompatibility = (emotions) => {
  if (emotions.length < 2) return 'neutral';

  const emotionIds = emotions.map((emotion) => emotion.id).sort();

  for (const pair of EMOTION_COMPATIBILITY.compatible) {
    const sortedPair = [...pair].sort();
    if (
      emotionIds.length === 2 &&
      emotionIds[0] === sortedPair[0] &&
      emotionIds[1] === sortedPair[1]
    ) {
      return 'compatible';
    }
  }

  for (const pair of EMOTION_COMPATIBILITY.conflict) {
    const sortedPair = [...pair].sort();
    if (
      emotionIds.length === 2 &&
      emotionIds[0] === sortedPair[0] &&
      emotionIds[1] === sortedPair[1]
    ) {
      return 'conflict';
    }
  }

  return 'neutral';
};

export const generateTargetFromEmotion = (emotionId, variance = 1, atmosphereShift = null) => {
  const base = EMOTION_TARGETS[emotionId];
  if (!base) return null;

  const conditions = base.conditions.map((condition) => {
    const actualVariance = condition.op === '=' ? Math.floor(variance / 2) : variance;
    const randomOffset = Math.floor(Math.random() * (actualVariance * 2 + 1)) - actualVariance;

    let value = condition.value + randomOffset;

    if (atmosphereShift && atmosphereShift[condition.attr] !== undefined) {
      value += atmosphereShift[condition.attr];
    }

    return {
      ...condition,
      value
    };
  });

  return {
    emotionId,
    conditions,
    hint: base.hint,
    description: base.description
  };
};
