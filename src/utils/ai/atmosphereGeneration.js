import {
  API_CONFIG,
  DEBUG_CONFIG,
  PROMPT_TYPES,
  generatePrompt,
  getActiveAPIType,
} from '../../config/api.js';
import { extractCleanJSON, tryRepairTruncatedJSON } from './jsonUtils.js';
import { callDeepSeekAPIHelper } from './sharedApi.js';

export const generateDailyAtmosphere = async (day, recentAtmospheres = [], recentCrossroadsSummaries = []) => {
  console.log(`🌍 开始生成第${day}天的氛围...`);

  try {
    const prompt = generatePrompt(PROMPT_TYPES.GENERATE_ATMOSPHERE, {
      day,
      recentAtmospheres,
      recentCrossroadsSummaries,
    });

    if (DEBUG_CONFIG.logPrompts) {
      console.log('=== Atmosphere Prompt ===');
      console.log(prompt);
      console.log('========================');
    }

    const response = await callGeminiAPIForAtmosphere(prompt);
    const result = parseAtmosphereJSON(response);

    if (result) {
      console.log('✅ 氛围生成成功:', result.weather, result.lighting);
      return result;
    }

    console.warn('⚠️ 氛围JSON解析失败');
    return null;
  } catch (error) {
    console.error('❌ 氛围生成失败:', error);
    return null;
  }
};

const callGeminiAPIForAtmosphere = async (prompt) => {
  const apiType = getActiveAPIType();

  if (apiType === 'deepseek') {
    const text = await callDeepSeekAPIHelper(prompt, { temperature: 0.8, max_tokens: 4096 });
    console.log('📥 氛围生成原始返回:', text.substring(0, 200));
    return text;
  }

  const config = API_CONFIG.gemini;

  if (!config.enabled) {
    throw new Error('没有启用的API');
  }

  const url = `${config.endpoint}/${config.model}:generateContent?key=${config.apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.8,
        topK: 35,
        topP: 0.9,
        maxOutputTokens: 4096,
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

  if (data.candidates?.[0]?.content?.parts) {
    const parts = data.candidates[0].content.parts;
    for (let i = parts.length - 1; i >= 0; i--) {
      if (parts[i].text) {
        const text = parts[i].text;
        console.log('📥 氛围生成原始返回:', text.substring(0, 200));
        return text;
      }
    }
  }

  throw new Error('Gemini返回格式异常');
};

const parseAtmosphereJSON = (response) => {
  if (!response || typeof response !== 'string') {
    console.warn('⚠️ 氛围响应为空或非字符串');
    return null;
  }

  console.log('🔍 解析氛围JSON，原始长度:', response.length);

  const cleaned = extractCleanJSON(response);
  if (!cleaned) return null;

  try {
    const parsed = JSON.parse(cleaned);
    return validateAtmosphere(parsed);
  } catch (e) {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return validateAtmosphere(parsed);
      } catch (e2) {
        console.log('⚠️ JSON不完整，尝试修复...');
        const repaired = tryRepairTruncatedJSON(jsonMatch[0]);
        if (repaired) {
          console.log('✅ JSON修复成功');
          return validateAtmosphere(repaired);
        }
      }
    }

    const jsonStart = cleaned.match(/\{[\s\S]*/);
    if (jsonStart) {
      const repaired = tryRepairTruncatedJSON(jsonStart[0]);
      if (repaired) {
        console.log('✅ 从截断文本修复JSON成功');
        return validateAtmosphere(repaired);
      }
    }

    console.error('❌ 氛围JSON解析最终失败');
    console.error('📄 原始内容:', cleaned.substring(0, 300));
  }
  return null;
};

const validateAtmosphere = (parsed) => {
  const validWeathers = ['clear', 'rainy', 'stormy', 'foggy', 'snowy', 'heatwave'];
  const validTimesOfDay = ['evening', 'night', 'late_night', 'dawn'];
  const validLighting = ['bright', 'dim_warm', 'neon', 'candlelight', 'flickering'];
  const validMusic = ['jazz_slow', 'electronic', 'classical', 'silence', 'lo_fi'];
  const validCrowdLevels = ['empty', 'sparse', 'moderate', 'crowded'];
  const validEmotionIds = [
    'nostalgia', 'courage', 'loneliness', 'relief', 'anxiety',
    'calm', 'regret', 'aspiration', 'pressure', 'dependence',
    'confusion', 'happiness',
  ];

  const weather = validWeathers.includes(parsed.weather) ? parsed.weather : 'clear';
  const timeOfDay = validTimesOfDay.includes(parsed.timeOfDay) ? parsed.timeOfDay : 'night';
  const lighting = validLighting.includes(parsed.lighting) ? parsed.lighting : 'dim_warm';
  const music = validMusic.includes(parsed.music) ? parsed.music : 'jazz_slow';
  const crowdLevel = validCrowdLevels.includes(parsed.crowdLevel) ? parsed.crowdLevel : 'sparse';

  const modifiers = parsed.modifiers || {};
  const trustBonus = typeof modifiers.trustBonus === 'number'
    ? Math.max(-0.03, Math.min(0.05, modifiers.trustBonus))
    : 0;

  const emotionBias = Array.isArray(modifiers.emotionBias)
    ? modifiers.emotionBias.filter((emotion) => validEmotionIds.includes(emotion)).slice(0, 2)
    : ['calm'];

  const targetShift = modifiers.targetShift || {};
  const clampShift = (value) => typeof value === 'number' ? Math.max(-1, Math.min(1, Math.round(value))) : 0;

  const priceMultiplier = typeof modifiers.priceMultiplier === 'number'
    ? Math.max(0.8, Math.min(1.5, modifiers.priceMultiplier))
    : 1.0;

  const customerCountMod = typeof modifiers.customerCountMod === 'number'
    ? Math.max(-2, Math.min(3, Math.round(modifiers.customerCountMod)))
    : 0;

  return {
    weather,
    timeOfDay,
    season: parsed.season || 'autumn',
    lighting,
    music,
    crowdLevel,
    scent: typeof parsed.scent === 'string' ? parsed.scent : '',
    narrative: typeof parsed.narrative === 'string' ? parsed.narrative : '今晚的酒吧很安静。',
    modifiers: {
      trustBonus,
      emotionBias,
      targetShift: {
        thickness: clampShift(targetShift.thickness),
        sweetness: clampShift(targetShift.sweetness),
        strength: clampShift(targetShift.strength),
      },
      priceMultiplier,
      customerCountMod,
    },
  };
};
