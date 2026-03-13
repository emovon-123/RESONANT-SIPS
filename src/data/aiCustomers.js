import aiCustomersData from './aiCustomers.json';

export const CUSTOMER_CATEGORIES = aiCustomersData.customerCategories;
export const AI_CUSTOMER_TYPES = aiCustomersData.aiCustomerTypes;

export const ALL_CATEGORY_IDS = Object.keys(CUSTOMER_CATEGORIES);
export const ALL_CUSTOMER_TYPES = Object.keys(AI_CUSTOMER_TYPES);

export const getAIConfig = (aiType) => {
  return AI_CUSTOMER_TYPES[aiType] || AI_CUSTOMER_TYPES.workplace;
};

export const getEmotionMaskLevel = (aiType, trustLevel) => {
  const config = getAIConfig(aiType);
  const thresholds = config.emotionMask.trustThreshold;

  if (trustLevel < thresholds.low) {
    return 'full_mask';
  }

  if (trustLevel < thresholds.medium) {
    return 'partial_mask';
  }

  if (trustLevel < thresholds.high) {
    return 'subtle_reveal';
  }

  return 'honest';
};

export const getCategoryConfig = (categoryId) => {
  return CUSTOMER_CATEGORIES[categoryId] || CUSTOMER_CATEGORIES.workplace;
};

export const randomInRange = (range) => {
  const [min, max] = range;
  return Math.random() * (max - min) + min;
};

export const pickRandom = (arr, count = 1) => {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return count === 1 ? shuffled[0] : shuffled.slice(0, count);
};

export const pickRandomMultiple = (arr, minCount = 1, maxCount = 3) => {
  const count = Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;
  const result = pickRandom(arr, Math.min(count, arr.length));
  return Array.isArray(result) ? result : [result];
};
