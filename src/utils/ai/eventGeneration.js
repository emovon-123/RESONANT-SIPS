import {
  DEBUG_CONFIG,
  PROMPT_TYPES,
  generatePrompt,
  getActiveAPIType,
} from '../../config/api.js';
import { extractCleanJSON, tryRepairTruncatedJSON } from './jsonUtils.js';
import { callDeepSeekAPIHelper, callGeminiAPIHelper } from './sharedApi.js';

export const generateBarEvent = async (context) => {
  console.log('⚡ 开始AI生成事件...');

  try {
    const prompt = generatePrompt(PROMPT_TYPES.GENERATE_EVENT, context);

    if (DEBUG_CONFIG.logPrompts) {
      console.log('=== Event Prompt ===');
      console.log(prompt);
      console.log('====================');
    }

    const response = await callGeminiAPIForEvent(prompt);
    const result = parseEventJSON(response);

    if (result) {
      console.log('✅ 事件生成成功:', result.type);
      return result;
    }

    console.warn('⚠️ 事件JSON解析失败');
    return null;
  } catch (error) {
    console.error('❌ 事件生成失败:', error);
    return null;
  }
};

const callGeminiAPIForEvent = async (prompt) => {
  const apiType = getActiveAPIType();

  if (apiType === 'deepseek') {
    const text = await callDeepSeekAPIHelper(prompt, { temperature: 0.85, max_tokens: 4096 });
    console.log('📥 事件生成原始返回:', text);
    return text;
  }

  const text = await callGeminiAPIHelper(prompt, {
    temperature: 0.85,
    topK: 35,
    topP: 0.9,
    maxOutputTokens: 4096,
    candidateCount: 1,
    label: 'Gemini',
  });
  console.log('📥 事件生成原始返回:', text);
  return text;
};

const parseEventJSON = (response) => {
  if (!response || typeof response !== 'string') {
    console.warn('⚠️ 事件响应为空或非字符串:', response);
    return null;
  }

  console.log('🔍 解析事件JSON，原始长度:', response.length);

  const cleaned = extractCleanJSON(response);
  if (!cleaned) return null;

  try {
    const parsed = JSON.parse(cleaned);
    return validateEvent(parsed);
  } catch (e) {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return validateEvent(parsed);
      } catch (e2) {
        console.log('⚠️ 事件JSON不完整，尝试修复...');
        const repaired = tryRepairTruncatedJSON(jsonMatch[0]);
        if (repaired) {
          console.log('✅ 事件JSON修复成功');
          return validateEvent(repaired);
        }
      }
    }

    const jsonStart = cleaned.match(/\{[\s\S]*/);
    if (jsonStart) {
      const repaired = tryRepairTruncatedJSON(jsonStart[0]);
      if (repaired) {
        console.log('✅ 从截断文本修复事件JSON成功');
        return validateEvent(repaired);
      }
    }

    console.error('❌ 事件JSON解析最终失败');
    console.error('📄 原始内容:', cleaned.substring(0, 300));
  }
  return null;
};

const validateEvent = (parsed) => {
  const validTypes = ['atmosphere', 'customer', 'challenge', 'reward', 'narrative'];
  const validDurations = ['immediate', 'current_customer', 'rest_of_day'];

  const type = validTypes.includes(parsed.type) ? parsed.type : 'atmosphere';
  const duration = validDurations.includes(parsed.duration) ? parsed.duration : 'immediate';
  const narrative = typeof parsed.narrative === 'string' && parsed.narrative.length > 0
    ? parsed.narrative
    : '酒吧里发生了一些有趣的事情。';

  const effects = parsed.effects || {};
  const validatedEffects = {
    atmosphereChange: effects.atmosphereChange || null,
    trustModifier: typeof effects.trustModifier === 'number'
      ? Math.max(-0.1, Math.min(0.1, effects.trustModifier))
      : 0,
    emotionShift: Array.isArray(effects.emotionShift) ? effects.emotionShift : null,
    itemRestriction: effects.itemRestriction || null,
    bonusReward: effects.bonusReward || null,
  };

  let choices = [];
  if (Array.isArray(parsed.choices)) {
    choices = parsed.choices.slice(0, 2).map((choice) => ({
      text: typeof choice.text === 'string' ? choice.text : '继续',
      effect: choice.effect || {},
    }));
  }

  return {
    type,
    narrative,
    effects: validatedEffects,
    duration,
    choices,
  };
};
