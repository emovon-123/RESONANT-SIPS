// 新手教学系统数据

/**
 * 教学顾客固定配置
 */
export const TUTORIAL_CUSTOMER = {
  id: 'tutorial_customer',
  name: '林澈',
  avatar: '🧥',
  personality: ['安静', '疲惫', '防备'],
  dialogueStyle: {
    tone: 'tired',
    length: 'short',
    features: ['话少', '停顿多', '偶尔叹气']
  },
  emotionMask: {
    surface: ['calm'],
    reality: ['pressure', 'loneliness'],
    trustThreshold: { low: 0.2, medium: 0.4, high: 0.6 }
  },
  preferences: {
    iceType: 'less_ice',
    garnishes: ['sugar'],
    decorations: ['orange']
  },
  initialDialogue: ['......有酒吗。'],
  backstory: '他是第一个推开这扇门的人。后来你才知道，他是偶然走错路的——但那个晚上，他需要一杯酒。',
  categoryId: 'workplace',
  isTutorialCustomer: true,
  isFirstEverCustomer: true,
  isGenerated: false
};

/**
 * 共情关键词（玩家输入包含这些词时使用 empathetic 回复）
 */
const EMPATHETIC_KEYWORDS = [
  '累', '辛苦', '怎么了', '没关系', '不容易', '加班',
  '关心', '休息', '还好吗', '开心', '难过', '孤独',
  '压力', '陪', '听', '理解', '在意'
];

/**
 * 检查玩家输入是否包含共情关键词
 */
export const isEmpatheticInput = (input) => {
  return EMPATHETIC_KEYWORDS.some(keyword => input.includes(keyword));
};

/**
 * 教学对话固定脚本
 */
export const TUTORIAL_RESPONSES = {
  round1: {
    quickOptions: [
      '当然，想喝点什么？',
      '看你今天挺累的。',
      '随便坐，不着急。'
    ],
    default: '......随便吧。什么都行。',
    empathetic: '......你怎么知道？算了，就来一杯吧。'
  },
  round2: {
    quickOptions: [
      '工作不顺心？',
      '一个人来的吗？',
      '这个时间还在外面，辛苦了。',
      '……'
    ],
    default: '嗯......公司的事。没什么大不了的。',
    empathetic: '......没什么。就是有时候觉得，忙了一天回到家也没人说话。',
    silence: '（他看了你一眼，沉默了一会儿）......你不问吗？大多数人都会问。'
  },
  round3: {
    quickOptions: [
      '在这里可以说说，我听着。',
      '有时候不说也没关系。',
      '你经常加班吗？'
    ],
    default: '（沉默了一会儿）......谢谢。',
    empathetic: '（他看了你一眼，像是没想到有人会这么说）......好久没人这么说了。'
  }
};

/**
 * 教学固定调酒目标
 */
export const TUTORIAL_TARGET = {
  conditions: [
    { attr: 'thickness', op: '>=', value: 1 },
    { attr: 'sweetness', op: '>=', value: 1 },
    { attr: 'strength', op: '<=', value: 3 }
  ],
  hint: '压力和孤独需要一杯温暖而不太烈的酒。厚实一点、甜一点，让TA感受到被包裹的安全感。'
};

/**
 * 教学顾客调酒成功后的固定反馈
 */
export const TUTORIAL_COCKTAIL_FEEDBACK = 
  '......（他接过酒，沉默了很久，喝了一口）\n嗯......挺好的。谢谢你。\n很久没喝过真正的酒了。外面那些合成的......不是一回事。';

/**
 * 教学顾客调酒失败的提示
 */
export const getTutorialFailHint = (conditions, mixture) => {
  const hints = [];
  for (const cond of conditions) {
    const actual = mixture[cond.attr] || 0;
    const attrNames = { thickness: '浓稠度', sweetness: '甜度', strength: '烈度' };
    const name = attrNames[cond.attr] || cond.attr;
    
    if (cond.op === '>=' && actual < cond.value) {
      hints.push(`${name}不够（当前${actual}，需要≥${cond.value}）。试试加点果汁或利口酒？`);
    } else if (cond.op === '<=' && actual > cond.value) {
      hints.push(`${name}超标了（当前${actual}，需要≤${cond.value}）。试试去掉一份基酒，换成果汁？`);
    }
  }
  return hints.length > 0 ? hints.join('\n') : '数值还不太对，再调整一下配方试试。';
};

/**
 * 教学模式下可见的 6 个情绪（简化版）
 */
export const TUTORIAL_VISIBLE_EMOTIONS = [
  'calm', 'pressure', 'loneliness', 'happiness', 'anxiety', 'relief'
];

/**
 * 引导气泡文本
 */
export const TUTORIAL_TOOLTIPS = {
  // 阶段 2A：对话
  dialogue_start: '💡 顾客看起来有话想说。试着用下方的选项回应TA，或者自己打字。',
  trust_rising: '💡 信任度在上升。越真诚地交流，顾客越愿意敞开心扉。',
  transition_to_emotion: '💡 你似乎感受到了什么......\n   TA的情绪不像表面看起来那么平静。\n   试着猜猜TA真正的感受。',

  // 沉默铺垫
  silence_intro: '💡 "……"是沉默。有时候不说话，比说什么都好。\n   现在可以不用管它，等你们更熟了再试试。',

  // 阶段 2B：猜情绪
  emotion_guide_v2: '💡 这座城市的人习惯戴面具。\n   「平静」是他展示给你看的——但你从对话里感受到了别的。\n   选择你认为他真正藏着的 2 个情绪。',
  emotion_guide: '💡 顾客表面看起来「平静」，但TA真正的感受可能不是这样。\n   根据对话内容，选择你认为的 2 个真实情绪。',
  emotion_confirm: '💡 选好了？点击确认。猜对了就能为TA调酒。\n   猜错了信任度会下降，所以先观察线索再决定。',
  emotion_wrong: '💡 不太对......再想想。\n   TA说"忙了一天回到家也没人说话"——这像是什么感受？',
  emotion_correct: '🎯 没错，TA内心真正的感受是「压力」和「孤独」。\n   现在，为TA调一杯酒吧。',

  // 阶段 2C：调酒
  target_guide: '💡 右上角是目标条件。你需要调一杯满足这些条件的酒。\n   浓稠度 ≥ 1、甜度 ≥ 1、烈度 ≤ 3',
  step_glass: '💡 先选一个杯型。马提尼杯可以放 2 份原浆，够用了。',
  step_ice: '💡 选择冰块。冰块会影响烈度。少冰或无冰都可以。',
  step_ingredients: '💡 这是最关键的一步。看每种原浆的三维属性。\n   试试：朗姆酒（浓+1，甜+1，烈+2）+ 橙汁（浓+1，甜+2，烈0）\n   观察右边的数值变化。',
  step_extras: '💡 配料和装饰可以微调数值，也可以跳过。新手先不用管。',
  step_serve: '💡 三维值都满足目标了？点"递酒"把酒端给顾客。\n   如果数值还不对，可以重新选择原浆。',
  
  // 态度预览铺垫
  attitude_preview: '💡 看到下面那句话了吗？\n   "这杯酒在说……"\n   每杯酒都有一种态度。以后你会更理解它的意义。\n   现在先递酒吧。'
};

/**
 * 序幕文本（5屏）
 */
export const PROLOGUE_SCREENS = [
  '这座城市里\n没有人需要开口',
  'AI 三秒读完你的情绪\n药物十分钟抹掉你的不安\n一切都被解决了\n高效，安静，妥当。\n在人工智能普及的世界里\n人们似乎失去了真实',
  '但是有的时候\n人们不想情绪就这么\n轻易的被解决',
  '他们顺着雨声走进巷子深处\n推开一扇没有招牌的门',
  '你在吧台后面等着\n没有扫描仪\n没有算法\n但是这里有真的酒。\n\n今晚，又有人来了'
];
