import { ALL_CATEGORY_IDS, getCategoryConfig, pickRandom, pickRandomMultiple, randomInRange } from '../../data/aiCustomers.js';

const FALLBACK_SURNAMES = ['陈', '林', '张', '李', '王', '赵', '周', '吴', '郑', '孙', '刘', '杨', '徐', '沈', '韩', '朱', '许', '何', '曹', '谢', '宋', '萧', '唐', '方'];
const FALLBACK_GIVEN_NAMES = ['明远', '安宁', '知秋', '晚晴', '雨桐', '以沫', '清扬', '若晨', '思远', '星辰', '暮雪', '云深', '逸风', '念卿', '微澜', '长安', '晓月', '子夜', '南笙', '北辰', '问渠', '听雨', '拾光', '半夏'];

/**
 * 生成降级顾客（不调用 API，基于类别配置随机组合）
 * 每次生成的角色名字、性格、情绪都不同
 */
export const generateFallbackCustomers = (day) => {
  const count = Math.min(2 + Math.floor(day / 3), 5);
  const customers = [];
  const categoryIds = ALL_CATEGORY_IDS;
  const usedNames = new Set();
  
  for (let i = 0; i < count; i++) {
    const catId = categoryIds[Math.floor(Math.random() * categoryIds.length)];
    const cat = getCategoryConfig(catId);
    if (!cat) continue;

    // 随机生成唯一名字
    let name;
    do {
      const surname = FALLBACK_SURNAMES[Math.floor(Math.random() * FALLBACK_SURNAMES.length)];
      const given = FALLBACK_GIVEN_NAMES[Math.floor(Math.random() * FALLBACK_GIVEN_NAMES.length)];
      name = `${surname}${given}`;
    } while (usedNames.has(name));
    usedNames.add(name);

    // 随机选取性格、情绪、对话风格
    const personality = pickRandomMultiple(cat.personalityPool || ['沉默', '平和'], 2 + Math.floor(Math.random() * 2));
    const avatar = pickRandom(cat.avatarOptions || ['👤']);
    const surfaceEmotions = pickRandomMultiple(cat.surfaceEmotionPool || ['calm'], 1 + Math.floor(Math.random() * 2));
    const realEmotions = pickRandomMultiple(cat.realEmotionPool || ['pressure'], 1 + Math.floor(Math.random() * 2));
    const tone = pickRandom(cat.toneOptions || ['casual']);
    const length = pickRandom(cat.lengthOptions || ['medium']);
    const features = pickRandomMultiple(cat.featurePool || ['简短回答'], 2);
    const thresholds = cat.trustThresholdRange || { low: [0.25, 0.35], medium: [0.55, 0.65], high: [0.75, 0.85] };

    const config = {
      id: `fallback-${day}-${i}-${Date.now()}`,
      categoryId: catId,
      name: name,
      avatar: avatar,
      backstory: `${cat.category}，今晚来到酒吧寻找一份宁静。`,
      personality: personality,
      dialogueStyle: { tone, length, features },
      emotionMask: {
        surface: surfaceEmotions,
        reality: realEmotions,
        trustThreshold: {
          low: randomInRange(thresholds.low),
          medium: randomInRange(thresholds.medium),
          high: randomInRange(thresholds.high)
        }
      },
      preferences: {
        iceType: pickRandom(cat.preferredIce || ['no_ice']),
        garnishes: [pickRandom(cat.preferredGarnishes || ['lemon'])],
        decorations: [pickRandom(cat.preferredDecorations || ['mint'])]
      },
      initialDialogue: [`你好，我叫${name}。今天想在这里坐坐。`],
      triggerKeywords: cat.triggerKeywordThemes ? 
        cat.triggerKeywordThemes.reduce((acc, theme) => ({ ...acc, [theme]: [] }), {}) : {},
      memoryStyle: pickRandom(cat.memoryStyleOptions || ['emotional']),
      metaphorLevel: pickRandom(cat.metaphorLevelOptions || ['low'])
    };

    customers.push({
      id: `${day}-${i}`,
      type: catId,
      config: config
    });
  }
  
  return customers;
};
