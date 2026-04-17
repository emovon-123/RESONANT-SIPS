/**
 * 章节里程碑系统
 * 将 30-50 天的游戏分为 5 个章节，由里程碑条件触发
 * 章节为游戏提供阶段感——玩家知道自己处于故事的哪个阶段
 */

export const CHAPTERS = [
  {
    id: 1,
    title: '无名小店',
    subtitle: '在这座城市最深的巷子里，你点亮了一盏灯。',
    conditions: {
      auto: true
    },
    theme: {
      weatherBias: ['rainy', 'foggy'],
      customerTypeBias: null,
      atmosphereMood: 'quiet'
    },
    mixingMode: 'strict'
  },
  {
    id: 2,
    title: '第一个回头客',
    subtitle: '有人记住了这条巷子的路。',
    conditions: {
      minDay: 3,
      hasReturnCustomer: true
    },
    theme: {
      weatherBias: ['rainy', 'foggy', 'clear'],
      customerTypeBias: null,
      atmosphereMood: 'warming'
    },
    mixingMode: 'transitional'
  },
  {
    id: 3,
    title: '巷子里的传说',
    subtitle: '他们开始在低语中提起这个地方。',
    conditions: {
      minDay: 7,
      returnCustomerEscalation: 1
    },
    theme: {
      weatherBias: ['rainy', 'clear', 'foggy'],
      customerTypeBias: ['artistic', 'midlife'],
      atmosphereMood: 'alive'
    },
    mixingMode: 'expressive'
  },
  {
    id: 4,
    title: '霓虹之下',
    subtitle: '这座城市有一万个去处，但有些人只来这里。',
    conditions: {
      minDay: 13,
      returnCustomerTurningPoint: 1
    },
    theme: {
      weatherBias: null,
      customerTypeBias: null,
      atmosphereMood: 'intense'
    },
    mixingMode: 'expressive'
  },
  {
    id: 5,
    title: '最后一杯',
    subtitle: '你终于知道自己为什么在这里了。',
    conditions: {
      minDay: 20,
      OR_totalCustomersServed: 100
    },
    theme: {
      weatherBias: null,
      customerTypeBias: null,
      atmosphereMood: 'transcendent'
    },
    mixingMode: 'master'
  }
];

/**
 * 章节开场白降级文本
 */
export const FALLBACK_CHAPTER_OPENINGS = {
  1: '你点亮了吧台的灯。巷子外面在下雨。',
  2: '今晚来的人，看起来不像是第一次。',
  3: '有人在问路的时候提起了这间酒吧。',
  4: '门外排起了不长不短的队。',
  5: '你望向窗外的城市，忽然想不起来是哪一年来到这里的。'
};

/**
 * 结局触发条件
 */
export const ENDING_CONDITIONS = [
  { type: 'arc_complete', description: '至少一个回头客走完全部弧光' },
  { type: 'day_limit', description: '累计天数达到50天' },
  { type: 'all_fragments', description: '所有回忆碎片解锁' }
];

/**
 * 回忆碎片触发条件
 */
export const FRAGMENT_TRIGGERS = [
  { type: 'chapter_advance', description: '章节推进时必定触发一个碎片' },
  { type: 'milestone', condition: 'totalCustomersServed >= 20', description: '服务满20人' },
  { type: 'milestone', condition: 'totalCustomersServed >= 50', description: '服务满50人' },
  { type: 'deep_trust', condition: 'customerTrust >= 0.9', description: '某顾客信任度达到90%+' },
  { type: 'crossroads_resolved', description: '某回头客的十字路口被解决' },
  { type: 'perfect_resonance', condition: 'mixingMode !== "strict"', description: '获得"完美共鸣"' },
  { type: 'silence_used', condition: 'silenceCount >= 5', description: '累计使用5次沉默' },
  { type: 'plain_water', condition: 'plainWaterCount >= 3', description: '累计递出3杯白水' }
];

/**
 * 章节机制变化提示（固定文本，非AI生成）
 * 在章节转场时展示，告知玩家调酒机制的变化
 */
export const CHAPTER_MECHANIC_HINTS = {
  1: null,
  2: '数值依然重要，但不再是唯一的答案。\n'
   + '注意每种材料传递的感觉——悬停可以看到。\n'
   + '「这杯酒在说......」会告诉你，你的酒正在表达什么。',
  3: '你已经不需要看数值了。\n'
   + '只有顾客的情绪和你的酒之间的共鸣，才决定这杯酒对不对。\n'
   + '用材料的感觉去组合你想说的话。',
  4: null,
  5: '没有目标，没有提示。\n'
   + '你面前只有一个人，和你手边的这些瓶瓶罐罐。\n'
   + '你知道该怎么做。'
};

/**
 * 过渡期（transitional）调酒失败引导消息
 * 帮助玩家适应从数值匹配到情感共鸣的过渡
 */
export const TRANSITIONAL_FAILURE_HINTS = [
  '也许该注意一下酒传达的态度了——它在说什么？',
  '数值只是骨架，酒的感觉才是血肉。试着从材料的 feeling 出发。',
  '这杯酒的"态度"和他此刻的心情合拍吗？',
  '不必精确——问题不在于数字差了多少，而在于方向对不对。',
  '悬停在材料上看看它们的 feeling，然后想想这个人需要听到什么。'
];

/**
 * 获取过渡期失败引导（随机一条）
 */
export const getTransitionalFailureHint = () => {
  return TRANSITIONAL_FAILURE_HINTS[
    Math.floor(Math.random() * TRANSITIONAL_FAILURE_HINTS.length)
  ];
};

/**
 * 结局 fallback 模板（AI 完全不可用时使用）
 */
export const FALLBACK_ENDING_TEMPLATE = (params) => {
  const keyLine = params.keyCustomerName
    ? `你还记得${params.keyCustomerName}。${params.keyCustomerOneLiner || '那个人来过，又走了。'}\n\n`
    : '';
  return `收拾最后一个杯子的时候，你的手停了一下。

${params.totalDays || '?'}天。${params.totalCustomers || '?'}个人。
每个人都带着自己的故事推开那扇门，坐下来，看着你。
你从来不问他们为什么来。你只是调酒。

${keyLine}窗外的霓虹灯还在闪。雨还在下。这座城市不会因为一间酒吧而改变。
但也许有几个人——在某个深夜喝完那杯酒之后——改变了一点点。

你关掉吧台的灯。
但你没有锁门。`.trim();
};

/**
 * 碎片降级文本
 */
export const FALLBACK_FRAGMENTS = {
  vague: '有什么东西在搅动，像水底的淤泥被翻起。很快就沉下去了。',
  hazy: '某个房间。光线从窗帘缝里漏进来。有人在说话，但听不清内容。',
  clear: '手上的旧伤疤。你记得那把刀，记得那个厨房，记得有人叫你的名字。',
  vivid: '你想起了一切。但你选择继续站在这里。'
};

/**
 * 碎片清晰度与章节的对应关系
 */
export const getFragmentClarity = (chapterId) => {
  if (chapterId <= 2) return 'vague';
  if (chapterId === 3) return 'hazy';
  if (chapterId === 4) return 'clear';
  return 'vivid';
};
