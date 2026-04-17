import { API_CONFIG, getActiveAPIType, generateCustomerPrompt } from '../../config/api.js';
import {
  ALL_CATEGORY_IDS,
  AI_CUSTOMER_TYPES,
  getAIConfig,
  getCategoryConfig,
  pickRandom,
  pickRandomMultiple,
  randomInRange,
} from '../../data/aiCustomers.js';
import { getAvatarFromCache, saveAvatarToCache } from '../avatarCache.js';
import {
  analyzeStoryworldCharacterEmotion,
  getStoryworldCharacterByName,
} from '../storyworldRepository.js';
import { getSettings } from '../storage.js';
import { EMOTION_IDS_8, normalizeEmotionList } from '../emotionSchema.js';
import { extractCleanJSON, tryRepairTruncatedJSON } from './jsonUtils.js';
import { callDeepSeekAPIHelper } from './sharedApi.js';

const parseCustomerJSON = (response) => {
  if (!response || typeof response !== 'string') {
    console.error('❌ 无效的响应:', response);
    return null;
  }

  console.log('📝 原始响应长度:', response.length);

  const cleanedResponse = extractCleanJSON(response);
  if (!cleanedResponse) return null;

  try {
    const parsed = JSON.parse(cleanedResponse);
    console.log('✅ JSON解析成功');
    return parsed;
  } catch (e) {
    console.log('⚠️ 直接解析失败，尝试提取JSON对象...');
  }

  const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log('✅ 从文本中提取JSON成功');
      return parsed;
    } catch (e2) {
      console.log('⚠️ 顾客JSON不完整，尝试修复...');
      const repaired = tryRepairTruncatedJSON(jsonMatch[0]);
      if (repaired) {
        console.log('✅ 顾客JSON修复成功');
        return repaired;
      }
      console.error('❌ JSON解析失败:', e2.message);
      console.error('📄 提取的JSON片段:', jsonMatch[0].substring(0, 300));
      return null;
    }
  }

  const jsonStart = cleanedResponse.match(/\{[\s\S]*/);
  if (jsonStart) {
    const repaired = tryRepairTruncatedJSON(jsonStart[0]);
    if (repaired) {
      console.log('✅ 从截断文本修复顾客JSON成功');
      return repaired;
    }
  }

  console.error('❌ 未找到JSON对象，原始响应:', cleanedResponse.substring(0, 300));
  return null;
};

const VALID_EMOTION_IDS = [...EMOTION_IDS_8];

const validateEmotions = (emotions, fallbackPool, isRealityEmotion = false) => {
  if (!emotions || !Array.isArray(emotions) || emotions.length === 0) {
    return isRealityEmotion
      ? pickRandomMultiple(fallbackPool, 2, 2)
      : pickRandomMultiple(fallbackPool, 1, 2);
  }

  const validEmotions = normalizeEmotionList(emotions, {
    min: 0,
    max: isRealityEmotion ? 2 : 2,
    fallback: fallbackPool,
  }).filter((emotion) => VALID_EMOTION_IDS.includes(emotion));

  if (validEmotions.length === 0) {
    console.warn('⚠️ 无效的情绪ID，使用降级值:', emotions);
    return isRealityEmotion
      ? normalizeEmotionList(pickRandomMultiple(fallbackPool, 2, 2), { min: 2, max: 2, fallback: ['fear', 'sadness'] })
      : normalizeEmotionList(pickRandomMultiple(fallbackPool, 1, 2), { min: 1, max: 2, fallback: ['trust'] });
  }

  if (isRealityEmotion) {
    if (validEmotions.length < 2) {
      const additionalEmotions = normalizeEmotionList(pickRandomMultiple(
        fallbackPool.filter((emotion) => !validEmotions.includes(emotion)),
        2 - validEmotions.length,
        2 - validEmotions.length
      ), { min: 2 - validEmotions.length, max: 2 - validEmotions.length, fallback: ['fear', 'sadness'] });
      return [...validEmotions, ...additionalEmotions];
    }

    if (validEmotions.length > 2) {
      return validEmotions.slice(0, 2);
    }

    return validEmotions;
  }

  return validEmotions;
};

const validateTone = (tone, options) => {
  if (!tone || !options.includes(tone)) {
    return pickRandom(options);
  }
  return tone;
};

const validateLength = (length, options) => {
  const validLengths = ['short', 'medium', 'long'];
  if (!length || !validLengths.includes(length)) {
    return pickRandom(options);
  }
  return length;
};

const completeCustomerConfig = (parsedConfig, categoryConfig) => {
  const thresholds = categoryConfig.trustThresholdRange;

  const surfaceEmotions = validateEmotions(
    parsedConfig.emotionMask?.surface,
    categoryConfig.surfaceEmotionPool,
    false
  );
  const realEmotions = validateEmotions(
    parsedConfig.emotionMask?.reality,
    categoryConfig.realEmotionPool,
    true
  );

  return {
    id: `${categoryConfig.id}_${Date.now()}`,
    name: parsedConfig.name || `${categoryConfig.category}·访客`,
    avatar: pickRandom(categoryConfig.avatarOptions),
    personality: parsedConfig.personality || pickRandomMultiple(categoryConfig.personalityPool, 2, 3),
    dialogueStyle: {
      tone: validateTone(parsedConfig.dialogueStyle?.tone, categoryConfig.toneOptions),
      length: validateLength(parsedConfig.dialogueStyle?.length, categoryConfig.lengthOptions),
      features: parsedConfig.dialogueStyle?.features || pickRandomMultiple(categoryConfig.featurePool, 2, 3),
    },
    emotionMask: {
      surface: surfaceEmotions,
      reality: realEmotions,
      trustThreshold: {
        low: randomInRange(thresholds.low),
        medium: randomInRange(thresholds.medium),
        high: randomInRange(thresholds.high),
      },
    },
    preferences: {
      iceType: pickRandom(categoryConfig.preferredIce),
      garnishes: pickRandomMultiple(categoryConfig.preferredGarnishes, 1, 2),
      decorations: pickRandomMultiple(categoryConfig.preferredDecorations, 1, 2),
    },
    initialDialogue: parsedConfig.initialDialogue || [
      '你好，我想在这里坐一会儿...',
      '今天有点累，随便聊聊吧。',
      '能给我推荐一杯酒吗？',
    ],
    triggerKeywords: parsedConfig.triggerKeywords || {},
    memoryStyle: pickRandom(categoryConfig.memoryStyleOptions),
    metaphorLevel: pickRandom(categoryConfig.metaphorLevelOptions),
    backstory: parsedConfig.backstory || '',
    categoryId: categoryConfig.id,
    isGenerated: true,
  };
};

const AVATAR_STYLE_PREFIX =
  'Cyberpunk portrait, dark moody bar background with neon glow, ' +
  'digital illustration, semi-realistic anime style, ' +
  'cinematic lighting, shallow depth of field, ' +
  'close-up bust shot, facing slightly to the side, ';

const CATEGORY_APPEARANCE = {
  workplace: {
    clothing: 'wearing a formal dark suit or business attire with subtle tech details',
    vibe: 'tired but composed, hiding exhaustion behind a professional facade',
    extras: 'perhaps a loosened tie or holographic ID badge',
  },
  artistic: {
    clothing: 'wearing layered bohemian clothes with paint stains or vintage accessories',
    vibe: 'dreamy and melancholic, eyes reflecting unspoken stories',
    extras: 'perhaps a sketchbook or old headphones around the neck',
  },
  student: {
    clothing: 'wearing a hoodie or casual streetwear with tech patches',
    vibe: 'young and nervous, wide eyes showing uncertainty',
    extras: 'perhaps a backpack strap visible or earbuds dangling',
  },
  midlife: {
    clothing: 'wearing a worn leather jacket or simple practical clothes',
    vibe: 'weathered and nostalgic, eyes that have seen better days',
    extras: 'perhaps visible gray hair or old-fashioned wristwatch',
  },
};

const CHARACTER_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

const hashCharacterId = (text) => {
  const value = String(text || '');
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

const splitListLikeText = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/[;,，、]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const buildAvatarPrompt = (customerConfig) => {
  const category = customerConfig.categoryId || 'workplace';
  const appearance = CATEGORY_APPEARANCE[category] || CATEGORY_APPEARANCE.workplace;
  const personality = (customerConfig.personality || []).slice(0, 3).join(', ');
  const backstory = customerConfig.backstory || '';
  const visualHint = backstory.length > 0
    ? `, with a hint of their story: ${backstory.substring(0, 60)}`
    : '';

  return (
    AVATAR_STYLE_PREFIX +
    `${appearance.clothing}, ` +
    `${appearance.vibe}, ` +
    `${appearance.extras}, ` +
    `personality: ${personality}` +
    `${visualHint}, ` +
    'high quality, detailed face, expressive eyes, ' +
    'neon cyan and magenta accent lighting from the bar behind'
  );
};

export const generateCustomerAvatar = async (customerConfig) => {
  const config = API_CONFIG.gemini;
  if (!config.enabled || !config.apiKey) return null;

  if (API_CONFIG.imageGen?.enabled === false) return null;
  const settings = getSettings();
  if (settings && settings.avatarEnabled === false) return null;

  const imageModel = API_CONFIG.imageGen?.model || 'gemini-2.5-flash-image';
  const endpoint = API_CONFIG.imageGen?.endpoint || config.endpoint;
  const url = `${endpoint}/${imageModel}:generateContent?key=${config.apiKey}`;

  const prompt = buildAvatarPrompt(customerConfig);
  console.log('🎨 开始生成头像...');

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const requestBody = {
      contents: [{
        parts: [{ text: `Generate a single portrait image: ${prompt}` }],
      }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify(requestBody),
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error(`❌ 头像API错误 (${response.status}):`, err);
      return null;
    }

    const data = await response.json();
    const parts = data.candidates?.[0]?.content?.parts || [];

    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        const imageBase64 = part.inlineData.data;
        console.log('✅ 头像生成成功，大小:', Math.round(imageBase64.length * 0.75 / 1024), 'KB');
        return imageBase64;
      }
    }

    console.warn('⚠️ 响应中未找到图片数据，parts:', parts.map((part) => Object.keys(part)));
    return null;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn('⚠️ 头像生成超时（>30s），跳过');
    } else {
      console.error('❌ 头像生成失败:', error.message || error);
    }
    return null;
  }
};

const generateAndCacheAvatar = async (customer) => {
  const imageBase64 = await generateCustomerAvatar(customer);
  if (imageBase64) {
    customer.avatarBase64 = imageBase64;
    const cacheKey = customer.avatarCacheKey || customer.id || customer.name;
    await saveAvatarToCache(cacheKey, imageBase64);
    console.log('✅ 头像已缓存:', customer.name);
    window.dispatchEvent(new CustomEvent('avatar-ready', {
      detail: { customerId: cacheKey },
    }));
  }
};

export const generateCustomer = async (categoryId) => {
  const categoryConfig = getCategoryConfig(categoryId);
  const prompt = generateCustomerPrompt(categoryConfig);

  console.log('🎭 开始生成顾客，类型:', categoryConfig.category);

  try {
    const response = await callGeminiAPIForCustomer(prompt);
    const parsed = parseCustomerJSON(response);

    const customer = parsed
      ? completeCustomerConfig(parsed, categoryConfig)
      : completeCustomerConfig({}, categoryConfig);

    console.log('✅ 顾客生成成功:', customer.name);

    customer.avatarBase64 = null;
    customer.avatarCacheKey = `${categoryConfig.id}_${customer.name}_${Date.now()}`;

    try {
      const cachedAvatar = await getAvatarFromCache(customer.avatarCacheKey);
      if (cachedAvatar) {
        customer.avatarBase64 = cachedAvatar;
        console.log('✅ 使用缓存头像:', customer.name);
      } else {
        generateAndCacheAvatar(customer).catch((err) => {
          console.warn('⚠️ 后台头像生成失败:', err);
        });
      }
    } catch (avatarErr) {
      console.warn('⚠️ 头像处理跳过:', avatarErr);
    }

    return customer;
  } catch (error) {
    console.error('❌ 顾客生成失败:', error);
    return completeCustomerConfig({}, categoryConfig);
  }
};

export const generateCustomerFromCharacterId = async (characterId) => {
  const roleId = String(characterId || '').trim();
  if (!CHARACTER_ID_PATTERN.test(roleId)) {
    throw new Error('invalid_character_id');
  }

  let context = null;
  let emotionAnalysis = null;
  try {
    context = await getStoryworldCharacterByName(roleId);
  } catch (error) {
    console.warn('⚠️ Storyworld角色读取失败，降级为占位角色:', error?.message || error);
  }

  try {
    emotionAnalysis = await analyzeStoryworldCharacterEmotion({
      query: roleId,
      character: context || undefined,
    });
  } catch (error) {
    console.warn('⚠️ 角色8维情绪分析失败，使用默认情绪流程:', error?.message || error);
  }

  const mappedCategoryId = String(context?.categoryId || '').trim();
  const categoryId = ALL_CATEGORY_IDS.includes(mappedCategoryId)
    ? mappedCategoryId
    : (ALL_CATEGORY_IDS[hashCharacterId(roleId) % ALL_CATEGORY_IDS.length] || 'workplace');

  const categoryConfig = getCategoryConfig(categoryId);
  const personality = splitListLikeText(context?.profile?.personality);
  const dialogueFeatures = splitListLikeText(context?.dialogueStyle?.features);
  const openingLines = Array.isArray(context?.dialogueStyle?.openingLines)
    ? context.dialogueStyle.openingLines.map((line) => String(line || '').trim()).filter(Boolean)
    : [];

  const base = completeCustomerConfig({
    name: context?.displayName || roleId,
    personality,
    dialogueStyle: {
      tone: context?.dialogueStyle?.tone || undefined,
      length: 'medium',
      features: dialogueFeatures,
    },
    backstory: context?.background?.backstory || `来自角色库的角色 ${roleId}，今晚来到酒吧。`,
    initialDialogue: openingLines.length > 0
      ? openingLines
      : [
        `我是 ${context?.displayName || roleId}。`,
        '今晚想找个人说说话。',
        '给我一杯适合我现在心情的酒。'
      ],
  }, categoryConfig);

  base.customCharacterId = roleId;
  base.isCustomCharacter = true;
  base.customCharacterSource = context?.source || null;

  if (emotionAnalysis && typeof emotionAnalysis === 'object') {
    const top3 = Array.isArray(emotionAnalysis.top3)
      ? normalizeEmotionList(emotionAnalysis.top3, { min: 0, max: 3, fallback: [] })
      : [];

    if (top3.length > 0) {
      const surface = normalizeEmotionList(top3.slice(0, 2), { min: 1, max: 2, fallback: ['trust'] });
      const reality = normalizeEmotionList(top3, { min: 2, max: 2, fallback: ['fear', 'sadness'] });
      base.emotionMask = {
        ...(base.emotionMask || {}),
        surface,
        reality,
      };
    }

    base.emotionAnalysis = emotionAnalysis;
    base.currentEmotionWeights = emotionAnalysis.weights || null;
    base.currentEmotionTop3 = top3;
  }

  base.avatarBase64 = null;
  base.avatarCacheKey = `custom_${roleId}_${Date.now()}`;
  try {
    const cachedAvatar = await getAvatarFromCache(base.avatarCacheKey);
    if (cachedAvatar) {
      base.avatarBase64 = cachedAvatar;
    } else {
      generateAndCacheAvatar(base).catch(() => {});
    }
  } catch {
    // ignore avatar errors
  }

  return base;
};

export const generateCustomerWithCharacterPool = async ({
  activeCharacterIds = [],
  usedCharacterIds = []
} = {}) => {
  const validIds = Array.isArray(activeCharacterIds)
    ? activeCharacterIds
      .map((item) => String(item || '').trim())
      .filter((item) => CHARACTER_ID_PATTERN.test(item))
    : [];

  if (validIds.length === 0) {
    throw new Error('no_active_characters');
  }

  const used = new Set((Array.isArray(usedCharacterIds) ? usedCharacterIds : []).map((item) => String(item || '').trim()));

  const remainingCustom = validIds.filter((id) => !used.has(id));
  const candidatePool = remainingCustom.length > 0 ? remainingCustom : validIds;
  const chosen = pickRandom(candidatePool);
  return generateCustomerFromCharacterId(chosen);
};

const callGeminiAPIForCustomer = async (prompt) => {
  const apiType = getActiveAPIType();

  if (apiType === 'deepseek') {
    const text = await callDeepSeekAPIHelper(prompt, { temperature: 0.9, max_tokens: 8192 });
    console.log('📥 顾客生成原始返回长度:', text?.length, '字符');
    console.log('📥 顾客生成返回预览:', text?.substring(0, 100));
    return text;
  }

  const config = API_CONFIG.gemini;

  if (!config.enabled) {
    throw new Error('没有启用的API');
  }

  const url = `${config.endpoint}/${config.model}:generateContent?key=${config.apiKey}`;

  if (config.openaiCompatible) {
    const endpoint = String(config.endpoint || '').replace(/\/$/, '');
    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
        max_tokens: 8192,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini(OpenAI兼容)调用失败: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error('Gemini(OpenAI兼容)返回格式异常');
    }
    return text;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt,
        }],
      }],
      generationConfig: {
        temperature: 0.9,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
        candidateCount: 1,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('❌ Gemini API错误:', errorData);
    throw new Error(`Gemini API调用失败: ${response.status}`);
  }

  const data = await response.json();

  if (data.candidates && data.candidates.length > 0) {
    const candidate = data.candidates[0];

    console.log('📊 finishReason:', candidate.finishReason);
    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
      console.warn('⚠️ 响应被截断，原因:', candidate.finishReason);
    }

    if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
      const text = candidate.content.parts[0].text;
      console.log('📥 Gemini原始返回长度:', text?.length, '字符');
      console.log('📥 Gemini返回预览:', text?.substring(0, 100));
      return text;
    }
  }

  console.error('❌ 响应结构异常:', JSON.stringify(data).substring(0, 500));
  throw new Error('Gemini返回格式异常');
};

export const generateDailyCustomers = async (day, onProgress) => {
  const count = Math.min(2 + Math.floor(day / 3), 5);
  const customers = [];

  console.log(`🌙 开始生成第${day}天的${count}个顾客...`);

  const shuffledCategories = [...ALL_CATEGORY_IDS].sort(() => Math.random() - 0.5);

  for (let i = 0; i < count; i++) {
    const categoryId = shuffledCategories[i % shuffledCategories.length];

    if (onProgress) {
      onProgress(i + 1, count, `正在创建第${i + 1}位顾客...`);
    }

    try {
      const customer = await generateCustomer(categoryId);
      customers.push({
        id: `${day}-${i}`,
        type: customer.categoryId || categoryId,
        config: customer,
      });
    } catch (error) {
      console.error(`❌ 第${i + 1}个顾客生成失败:`, error);
      const fallbackType = Object.keys(AI_CUSTOMER_TYPES)[i % 3];
      customers.push({
        id: `${day}-${i}`,
        type: fallbackType,
        config: getAIConfig(fallbackType),
      });
    }

    if (i < count - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  console.log(`✅ 第${day}天的顾客生成完成，共${customers.length}人`);
  return customers;
};
