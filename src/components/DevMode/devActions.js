/**
 * 开发者模式调试操作函数
 */

import { GLASS_TYPES } from '../../data/emotions.js';
import { ICE_TYPES, GARNISH_TYPES, DECORATION_TYPES, COMBO_BONUS } from '../../data/addons.js';
import { INGREDIENTS } from '../../data/ingredients.js';
import { BAR_LEVELS } from '../../data/chapterMilestones.js';
import {
  getStorageUsage,
  clearAllCache,
  saveUnlockedItems,
  getUnlockedItems,
  saveDiscoveredCombo,
  getDiscoveredCombos,
  getGameProgress,
  getCocktailRecipes,
  getShortMemory,
  getSettings,
  getWorldState,
  saveWorldState,
  getReturnCustomers,
  saveReturnCustomers,
  updateReturnCustomer,
  getChapterState,
  saveChapterState,
  getAchievementStats,
  saveAchievementStats
} from '../../utils/storage.js';

/**
 * 获取所有物品ID列表
 */
const getAllItemIds = () => {
  return {
    emotions: ['nostalgia', 'courage', 'loneliness', 'relief', 'anxiety', 'calm', 'regret', 'aspiration', 'pressure', 'dependence', 'confusion', 'happiness'],
    glasses: Object.keys(GLASS_TYPES),
    iceTypes: Object.keys(ICE_TYPES),
    garnishes: Object.keys(GARNISH_TYPES),
    decorations: Object.keys(DECORATION_TYPES),
    ingredients: Object.keys(INGREDIENTS)
  };
};

/**
 * 解锁所有物品
 */
export const unlockAllItems = () => {
  const allItems = getAllItemIds();
  const unlocked = {
    emotions: allItems.emotions,
    glasses: allItems.glasses,
    iceTypes: allItems.iceTypes,
    garnishes: allItems.garnishes,
    decorations: allItems.decorations,
    ingredients: allItems.ingredients,
    aiCustomers: ['workplace', 'artistic', 'student'],
    successCount: 999
  };
  saveUnlockedItems(unlocked);
  console.log('🔓 已解锁全部物品:', unlocked);
  return unlocked;
};

/**
 * 解锁指定类别的物品
 */
export const unlockCategory = (currentUnlocked, category) => {
  const allItems = getAllItemIds();
  
  if (!allItems[category]) {
    console.warn('未知类别:', category);
    return currentUnlocked;
  }
  
  const updated = {
    ...currentUnlocked,
    [category]: allItems[category]
  };
  
  saveUnlockedItems(updated);
  console.log(`🔓 已解锁全部${category}:`, allItems[category]);
  return updated;
};

/**
 * 发现所有黄金组合
 */
export const discoverAllCombos = () => {
  const combos = Object.entries(COMBO_BONUS);
  
  combos.forEach(([comboId, combo]) => {
    saveDiscoveredCombo(comboId, {
      name: combo.name,
      icon: combo.icon,
      description: combo.description,
      bonus: combo.bonus,
      requires: combo.requires
    });
  });
  
  console.log('🎊 已发现全部黄金组合:', combos.length, '个');
  return getDiscoveredCombos();
};

/**
 * 导出所有游戏数据
 */
export const exportGameData = () => {
  const data = {
    exportTime: new Date().toISOString(),
    version: '1.0',
    gameProgress: getGameProgress(),
    unlockedItems: getUnlockedItems(),
    discoveredCombos: getDiscoveredCombos(),
    cocktailRecipes: getCocktailRecipes(),
    settings: getSettings(),
    worldState: getWorldState(),
    chapterState: getChapterState(),
    returnCustomers: getReturnCustomers(),
    achievementStats: getAchievementStats(),
    shortMemory: {
      workplace: getShortMemory('workplace'),
      artistic: getShortMemory('artistic'),
      student: getShortMemory('student')
    }
  };
  
  console.log('📦 游戏数据已导出:', data);
  return data;
};

/**
 * 根据声誉计算酒吧等级ID
 */
const getBarLevelIdByReputation = (rep) => {
  const reputation = Math.max(0, Number(rep) || 0);
  const levels = Object.values(BAR_LEVELS || {});
  levels.sort((a, b) => (a.minReputation || 0) - (b.minReputation || 0));
  let chosen = levels[0]?.id || 'unknown';
  for (const level of levels) {
    if (reputation >= (level.minReputation || 0)) chosen = level.id;
  }
  return chosen;
};

/**
 * 设置酒吧声誉（并自动同步 barLevel）
 */
export const setBarReputation = (barReputation) => {
  const world = getWorldState();
  const rep = Math.max(0, Math.min(100, Math.round(Number(barReputation) || 0)));
  const updated = {
    ...world,
    barReputation: rep,
    barLevel: getBarLevelIdByReputation(rep)
  };
  saveWorldState(updated);
  console.log('🏷️ [DEV] 已设置声誉:', rep, 'barLevel:', updated.barLevel);
  return updated;
};

/**
 * 设置当前章节（仅修改持久化章节状态）
 */
export const setCurrentChapter = (chapterId, currentDay = 1) => {
  const id = Math.max(1, Math.min(5, Math.round(Number(chapterId) || 1)));
  const prev = getChapterState();
  const updated = {
    ...prev,
    currentChapter: id,
    endingTriggered: false,
    freeMode: false,
    endingNarrative: null,
    chapterHistory: [
      ...(prev.chapterHistory || []).filter(Boolean),
      {
        chapter: id,
        enteredOnDay: Math.max(1, Math.round(Number(currentDay) || 1)),
        openingNarrative: null,
        triggeredBy: 'dev'
      }
    ].slice(-10)
  };
  saveChapterState(updated);
  console.log('📖 [DEV] 已设置当前章节:', id);
  return updated;
};

/**
 * 创建一个最小可用的回头客（用于测试）
 */
export const createTestReturnCustomer = (options = {}) => {
  const now = Date.now();
  const category = options.categoryId || 'workplace';
  const name = options.name || `回头客${String(now).slice(-4)}`;
  const phase = options.phase || 'introduction';
  const baseEmotions = options.realEmotions || ['pressure', 'loneliness'];

  const customer = {
    id: `return_${category}_${name}_${now}`,
    originalConfig: {
      id: `dev_${category}_${now}`,
      name,
      categoryId: category,
      avatar: '👤',
      personality: ['寡言', '警惕', '在试探'],
      dialogueStyle: { tone: 'casual', length: 'short', features: ['停顿多', '回答简短', '只输出台词'] },
      emotionMask: {
        surface: ['calm'],
        reality: baseEmotions.slice(0, 2),
        trustThreshold: { low: 0.25, medium: 0.55, high: 0.75 }
      },
      preferences: { iceType: 'no_ice', garnishes: [], decorations: [] },
      backstory: '（DEV）用于回头客连贯性与十字路口测试的样例人物。'
    },
    name,
    category,
    relationship: {
      totalVisits: 1,
      intimacy: 0.6,
      sharedHistory: [{
        day: 1,
        summary: '第一次来（DEV 创建）。'
      }]
    },
    characterArc: {
      currentPhase: phase,
      phases: [{
        phase,
        day: 1,
        state: '（DEV）故事从这里开始',
        emotions: baseEmotions.slice(0, 2),
        resolved: true
      }],
      nextVisitSetup: {
        visitReason: '想再来坐坐',
        openingMood: 'familiar',
        storyDirection: '续上次的话题',
        suggestedDayGap: 1
      }
    },
    crossroads: {
      active: false,
      dilemma: '',
      options: [],
      influenceFactors: { cocktailAttitudes: [], trustAtEnd: 0, dialogueKeywords: [] },
      resolvedOption: null,
      resolvedDay: null
    },
    emotionTrajectory: [{
      day: 1,
      emotions: { surface: ['calm'], reality: baseEmotions.slice(0, 2) }
    }],
    scheduling: {
      nextPossibleDay: 1,
      returnPriority: 90,
      weatherCondition: null,
      isScheduled: false
    }
  };

  const pool = getReturnCustomers();
  const updated = [...pool, customer].slice(0, 15);
  saveReturnCustomers(updated);
  console.log('🔄 [DEV] 已创建回头客:', customer.name, customer.id);
  return customer;
};

/**
 * 强制安排回头客在指定天数可来访（不保证一定被抽到）
 */
export const scheduleReturnCustomerOnDay = (returnCustomerId, day) => {
  const customers = getReturnCustomers();
  const idx = customers.findIndex(c => c.id === returnCustomerId);
  if (idx < 0) return null;
  const d = Math.max(1, Math.round(Number(day) || 1));
  customers[idx] = {
    ...customers[idx],
    scheduling: {
      ...(customers[idx].scheduling || {}),
      nextPossibleDay: d,
      isScheduled: false,
      returnPriority: Math.max(95, customers[idx].scheduling?.returnPriority || 0)
    }
  };
  saveReturnCustomers(customers);
  console.log('📅 [DEV] 已安排回头客可来访日:', d, returnCustomerId);
  return customers[idx];
};

/**
 * 强制设置回头客弧光阶段
 */
export const setReturnCustomerPhase = (returnCustomerId, phase) => {
  const customers = getReturnCustomers();
  const idx = customers.findIndex(c => c.id === returnCustomerId);
  if (idx < 0) return null;
  const allowed = ['introduction', 'escalation', 'turning_point', 'resolution', 'epilogue'];
  const nextPhase = allowed.includes(phase) ? phase : 'introduction';
  const updated = {
    ...customers[idx],
    characterArc: {
      ...(customers[idx].characterArc || {}),
      currentPhase: nextPhase
    }
  };
  customers[idx] = updated;
  saveReturnCustomers(customers);
  console.log('🧭 [DEV] 已设置回头客阶段:', nextPhase, returnCustomerId);
  return updated;
};

/**
 * 设置回头客的“已解决十字路口”用于后果叙述测试
 */
export const setResolvedCrossroadsForReturnCustomer = (returnCustomerId, crossroads) => {
  const customers = getReturnCustomers();
  const idx = customers.findIndex(c => c.id === returnCustomerId);
  if (idx < 0) return null;
  const updated = {
    ...customers[idx],
    crossroads: {
      active: false,
      dilemma: crossroads?.dilemma || '（DEV）要不要做出改变？',
      options: Array.isArray(crossroads?.options) && crossroads.options.length > 0
        ? crossroads.options.map(o => ({ ...o }))
        : [
          { id: 'option_a', description: '继续坚持', consequence: '', wasChosen: false },
          { id: 'option_b', description: '尝试改变', consequence: '', wasChosen: true }
        ],
      influenceFactors: customers[idx].crossroads?.influenceFactors || { cocktailAttitudes: [], trustAtEnd: 0, dialogueKeywords: [] },
      resolvedOption: crossroads?.resolvedOption || 'option_b',
      resolvedDay: crossroads?.resolvedDay || 1
    }
  };
  customers[idx] = updated;
  saveReturnCustomers(customers);
  console.log('🔀 [DEV] 已设置十字路口结果:', returnCustomerId);
  return updated;
};

/**
 * 准备章节切换测试的“门槛条件”（写入 localStorage 持久化状态）
 * 注意：真正触发章节转场需要在 GamePage 内执行一次 processDayEnd（可由 DevPanel 按钮触发）
 */
export const prepareChapterGate = (targetChapterId) => {
  const t = Math.max(2, Math.min(5, Math.round(Number(targetChapterId) || 2)));
  // 将当前章节设为上一章
  setCurrentChapter(t - 1, 1);

  // 设置声誉到门槛（+1 防止边界问题）
  const repByChapter = { 2: 21, 3: 41, 4: 61, 5: 81 };
  setBarReputation((repByChapter[t] || 21) + 1);

  // 准备回头客池满足条件
  let pool = getReturnCustomers();
  const need = (phase) => pool.filter(c => c.characterArc?.currentPhase === phase).length;
  const push = (phase) => {
    const c = createTestReturnCustomer({ phase });
    pool = getReturnCustomers();
    return c;
  };

  if (t === 2) {
    if (pool.length === 0) push('introduction');
  } else if (t === 3) {
    while (need('escalation') < 2) push('escalation');
  } else if (t === 4) {
    if (pool.filter(c => ['turning_point', 'resolution', 'epilogue'].includes(c.characterArc?.currentPhase)).length < 1) {
      push('turning_point');
    }
  } else if (t === 5) {
    // 无硬性回头客要求，但可选地把总服务数设置到安全值，避免 OR 路径干扰
    const stats = getAchievementStats();
    saveAchievementStats({ ...stats, totalCustomersServed: Math.max(stats.totalCustomersServed || 0, 100) });
  }

  console.log('🚦 [DEV] 已准备章节门槛条件，目标章节:', t);
  return { targetChapter: t };
};

/**
 * 创建开发者操作对象（传递给DevPanel）
 */
export const createDevActions = () => {
  return {
    unlockAllItems,
    unlockCategory,
    discoverAllCombos,
    exportGameData,
    getStorageUsage,
    clearAllCache,
    getAllItemIds,
    // 🆕 AI/叙事/章节调试
    setBarReputation,
    setCurrentChapter,
    prepareChapterGate,
    createTestReturnCustomer,
    scheduleReturnCustomerOnDay,
    setReturnCustomerPhase,
    setResolvedCrossroadsForReturnCustomer,
    // 透传读取（给 DevPanel 列表用）
    getWorldState,
    getReturnCustomers,
    getChapterState,
    getAchievementStats
  };
};

export default createDevActions;
