/**
 * 酒的态度系统
 * 根据三维值 + 材料 feeling 计算酒传递的"态度"
 * 不影响成功/失败判定，只影响AI叙事
 */

import { INGREDIENTS } from '../data/ingredients.js';
import { GLASS_TYPES } from '../data/emotions.js';
import { ICE_TYPES, GARNISH_TYPES, DECORATION_TYPES } from '../data/addons.js';

/**
 * 根据三维值 + 具体材料计算酒传递的"态度"
 * @param {Object} mixture - { thickness, sweetness, strength }
 * @param {boolean} isPlainWater - 是否是白水
 * @param {Object} recipe - 完整配方（可选），含 ingredients, glass, ice, garnish, decoration
 * @returns {Object} 态度对象
 */
export const interpretCocktailAttitude = (mixture, isPlainWater = false, recipe = null) => {
  // 白水特殊处理
  if (isPlainWater) {
    return {
      approach: 'gentle',
      tone: 'honest',
      depth: 'lighten',
      summary: '调酒师没有调酒。他只是倒了一杯白水放在你面前。有时候人不需要酒——只需要有人在这里。',
      feelingSummary: '',
      isWater: true
    };
  }

  const { thickness = 0, sweetness = 0, strength = 0 } = mixture;

  const attitude = {
    // 烈度维度：温柔 vs 直面
    approach: strength >= 3 ? 'confront'
            : strength >= 1 ? 'moderate'
            :                  'gentle',

    // 甜度维度：承认苦涩 vs 给予希望
    tone: sweetness >= 2 ? 'hopeful'
        : sweetness >= 0 ? 'balanced'
        :                   'honest',

    // 浓稠度维度：放下 vs 沉淀
    depth: thickness >= 2 ? 'reflective'
         : thickness >= 0 ? 'moderate'
         :                   'lighten',
  };

  // === 基础态度文本（用组合 key 生成自然语句，而非三段拼接）===
  const attitudeKey = `${attitude.approach}_${attitude.tone}_${attitude.depth}`;
  const attitudeSentences = {
    // confront (烈) 组合
    confront_hopeful_reflective: '你该面对了——但别怕，想清楚了再走',
    confront_hopeful_moderate: '去做吧，你比自己以为的更行',
    confront_hopeful_lighten: '没什么大不了的，你能搞定',
    confront_balanced_reflective: '事情就是这样，想想你真正要的是什么',
    confront_balanced_moderate: '看清楚，然后做你的选择',
    confront_balanced_lighten: '别想太多，该做的就去做',
    confront_honest_reflective: '这条路不好走，但你清楚自己为什么在这里',
    confront_honest_moderate: '没有人替你扛，但你扛得住',
    confront_honest_lighten: '疼就疼了，站起来',

    // moderate (中) 组合
    moderate_hopeful_reflective: '慢慢来，好好想，会好的',
    moderate_hopeful_moderate: '没那么糟，一步一步来',
    moderate_hopeful_lighten: '放松一点，明天会更好',
    moderate_balanced_reflective: '不急，但也别停下来，想想自己想要什么',
    moderate_balanced_moderate: '就这样吧，不好不坏，继续走',
    moderate_balanced_lighten: '别太较真，过去的就过去了',
    moderate_honest_reflective: '确实不容易，但你比以前更懂了',
    moderate_honest_moderate: '有些事就是这样，接受也是一种勇气',
    moderate_honest_lighten: '算了吧，别为难自己',

    // gentle (柔) 组合
    gentle_hopeful_reflective: '先歇歇，你值得这杯酒，想通了再说',
    gentle_hopeful_moderate: '今晚不用想那些，喝完会好一点',
    gentle_hopeful_lighten: '什么都先放下，此刻就只是喝一杯',
    gentle_balanced_reflective: '不急，慢慢想，我在这里',
    gentle_balanced_moderate: '今晚只管喝酒，其他的明天再说',
    gentle_balanced_lighten: '别管了，先歇一口气',
    gentle_honest_reflective: '这杯酒不会解决任何问题，但至少你不用一个人待着',
    gentle_honest_moderate: '没关系，什么都不用说',
    gentle_honest_lighten: '累了就累了，不丢人'
  };

  const baseSummary = attitudeSentences[attitudeKey] || '我在这里，你想说就说';

  // === 材料 feeling 融合 ===
  // 收集各部分的 feeling，每种角色只取一条
  let mainFeeling = null;   // 主料（用量最多的原料）
  let subFeeling = null;    // 副料
  let vesselFeeling = null; // 杯子或冰块
  let finishFeeling = null; // 配料或装饰（收尾的一笔）

  if (recipe) {
    const sortedIngredients = [...(recipe.ingredients || [])].sort((a, b) => (b.count || 1) - (a.count || 1));
    if (sortedIngredients[0]) mainFeeling = INGREDIENTS[sortedIngredients[0].id]?.feeling;
    if (sortedIngredients[1]) subFeeling = INGREDIENTS[sortedIngredients[1].id]?.feeling;

    const glass = GLASS_TYPES[recipe.glass];
    const ice = (recipe.ice && recipe.ice !== 'no_ice') ? ICE_TYPES[recipe.ice] : null;
    vesselFeeling = glass?.feeling || ice?.feeling || null;

    const garnish = GARNISH_TYPES[recipe.garnish];
    const deco = DECORATION_TYPES[recipe.decoration];
    finishFeeling = garnish?.feeling || deco?.feeling || null;
  }

  // 编织成一段自然的叙述，而非分号罗列
  let feelingSummary = '';
  if (mainFeeling) {
    feelingSummary = mainFeeling;
    if (subFeeling) {
      // 两种原料间用转折/递进连接
      const connectors = ['，然后', '，又', '——同时', '，混着'];
      const conn = connectors[Math.abs(hashStr(mainFeeling + subFeeling)) % connectors.length];
      feelingSummary += `${conn}${subFeeling}`;
    }
    if (vesselFeeling) {
      feelingSummary += `。${vesselFeeling}`;
    }
    if (finishFeeling) {
      feelingSummary += `。最后——${finishFeeling}`;
    }
  }

  attitude.baseSummary = baseSummary;
  attitude.feelingSummary = feelingSummary;
  // 最终 summary
  attitude.summary = feelingSummary ? `${baseSummary}。\n${feelingSummary}` : baseSummary;
  attitude.isWater = false;

  return attitude;
};

/**
 * 简单字符串哈希（确定性，相同输入永远相同输出）
 * 用于从连接词列表中稳定选择，避免每次渲染随机变化
 */
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return h;
}

/**
 * 判断态度的影响方向
 * 用于十字路口系统判定酒对决策的影响
 * @param {Object} attitude - 态度对象
 * @returns {string} 影响方向
 */
export const getAttitudeInfluence = (attitude) => {
  if (!attitude) return 'neutral';
  
  // 白水固定为 accept
  if (attitude.isWater) return 'accept';

  // confront + honest = "该行动了"
  if (attitude.approach === 'confront' && attitude.tone === 'honest') {
    return 'push_action';
  }
  // gentle + hopeful = "别冲动，会好的"
  if (attitude.approach === 'gentle' && attitude.tone === 'hopeful') {
    return 'encourage_patience';
  }
  // confront + hopeful = "你能行的，去做吧"
  if (attitude.approach === 'confront' && attitude.tone === 'hopeful') {
    return 'empower';
  }
  // gentle + honest = "现在不行也没关系"
  if (attitude.approach === 'gentle' && attitude.tone === 'honest') {
    return 'accept';
  }
  return 'neutral';
};

/**
 * 🆕 检测酒的态度与顾客情绪是否明显失调
 * 只排除"显然说错话"的情况，其他都允许
 * @param {Object} attitude - 态度对象（来自 interpretCocktailAttitude）
 * @param {Object} customerState - 顾客状态 { realEmotions: string[] }
 * @returns {boolean} true = 失调
 */
export const checkDissonance = (attitude, customerState) => {
  if (!attitude || !customerState) return false;

  const realEmotions = customerState.realEmotions || [];

  const hasFragile = realEmotions.some(e =>
    ['anxiety', 'loneliness', 'dependence', 'pressure'].includes(e)
  );
  const hasPositive = realEmotions.some(e =>
    ['happiness', 'relief', 'aspiration', 'courage'].includes(e)
  );

  // 规则1：顾客脆弱时，给极度激烈对抗的酒 = 失调
  if (hasFragile && attitude.approach === 'confront' && attitude.tone === 'honest') {
    return true;
  }

  // 规则2：顾客开心/有勇气时，给极度消沉的酒 = 失调
  if (hasPositive && attitude.approach === 'gentle' && attitude.tone === 'honest' && attitude.depth === 'reflective') {
    return true;
  }

  // 其他情况都不算失调——给AI足够的解读空间
  return false;
};
