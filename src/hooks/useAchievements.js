import { useState, useCallback, useRef } from 'react';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { getAchievements, saveAchievements, getAchievementStats, saveAchievementStats } from '../utils/storage.js';
import { BASE_SPIRITS, INGREDIENTS } from '../data/ingredients.js';
import { EMOTIONS, GLASS_TYPES } from '../data/emotions.js';
import { ICE_TYPES, GARNISH_TYPES, DECORATION_TYPES, COMBO_BONUS } from '../data/addons.js';
import { CUSTOMER_CATEGORIES } from '../data/aiCustomers.js';

// 先聚焦核心玩法：暂时关闭成就系统
const ACHIEVEMENTS_ENABLED = false;

function compareValue(actual, op, expected) {
  switch (op) {
    case '>=': return actual >= expected;
    case '<=': return actual <= expected;
    case '>':  return actual > expected;
    case '<':  return actual < expected;
    case '=': case '==': return actual === expected;
    default: return false;
  }
}

function checkCollection(stat, target, currentStats) {
  const collected = currentStats[stat];
  if (!Array.isArray(collected)) return false;
  let required = [];
  switch (target) {
    case 'all_spirits': required = Object.keys(BASE_SPIRITS); break;
    case 'all_emotions': required = Object.keys(EMOTIONS); break;
    case 'all_categories': required = Object.keys(CUSTOMER_CATEGORIES); break;
    case 'all_combos': required = Object.keys(COMBO_BONUS); break;
    case 'all_glasses': required = Object.keys(GLASS_TYPES); break;
    case 'all_ingredients': required = Object.keys(INGREDIENTS); break;
    case 'all_addons':
      required = [...Object.keys(ICE_TYPES), ...Object.keys(GARNISH_TYPES), ...Object.keys(DECORATION_TYPES)];
      break;
    default: return false;
  }
  return required.every(id => collected.includes(id));
}

export const useAchievements = () => {
  const [unlockedAchievements, setUnlockedAchievements] = useState(() => getAchievements());
  const [stats, setStats] = useState(() => getAchievementStats());
  const [pendingNotifications, setPendingNotifications] = useState([]);
  const processingRef = useRef(false);

  // 用 ref 同步追踪已解锁成就，避免异步状态导致同一成就重复解锁
  const unlockedRef = useRef(unlockedAchievements);

  // 解锁成就
  const tryUnlock = useCallback((achievementId) => {
    // 使用 ref 做同步判重，防止同一 tick 内重复触发
    if (unlockedRef.current[achievementId]) return { unlocked: false };
    const achievement = ACHIEVEMENTS[achievementId];
    if (!achievement) return { unlocked: false };

    const updated = { ...unlockedRef.current, [achievementId]: { unlockedAt: Date.now(), seen: false } };
    unlockedRef.current = updated; // 同步更新，后续调用立即可见
    setUnlockedAchievements(updated);
    saveAchievements(updated);
    setPendingNotifications(prev => [...prev, achievement]);
    console.log(`🏆 [成就解锁] ${achievement.name}`);
    return { unlocked: true, achievement };
  }, []);

  // 用 ref 同步追踪 pending 列表，防止闭包导致重复 pop
  const pendingRef = useRef(pendingNotifications);
  pendingRef.current = pendingNotifications;

  const popNotification = useCallback(() => {
    if (pendingRef.current.length === 0) return null;
    const [next, ...rest] = pendingRef.current;
    pendingRef.current = rest; // 同步更新 ref，后续调用立即可见
    setPendingNotifications(rest);
    return next;
  }, []);

  const markAsSeen = useCallback((achievementId) => {
    const updated = { ...unlockedRef.current };
    if (updated[achievementId]) {
      updated[achievementId].seen = true;
      unlockedRef.current = updated;
      setUnlockedAchievements(updated);
      saveAchievements(updated);
    }
  }, []);

  const getUnseenCount = useCallback(() => {
    return Object.values(unlockedRef.current).filter(a => !a.seen).length;
  }, []);

  // 检查 stat/collection/streak 成就
  const checkStatAchievements = useCallback((currentStats) => {
    for (const achievement of Object.values(ACHIEVEMENTS)) {
      if (unlockedRef.current[achievement.id]) continue;
      const { condition } = achievement;
      let met = false;

      if (condition.type === 'stat') {
        const value = currentStats[condition.stat];
        if (value !== undefined) met = compareValue(value, condition.op, condition.value);
      } else if (condition.type === 'collection') {
        met = checkCollection(condition.stat, condition.target, currentStats);
      } else if (condition.type === 'streak') {
        const value = currentStats[condition.stat];
        if (value !== undefined) met = compareValue(value, condition.op, condition.value);
      }

      if (met) tryUnlock(achievement.id);
    }
  }, [tryUnlock]);

  // 触发事件型成就
  const triggerEventAchievement = useCallback((eventName, eventValue) => {
    for (const achievement of Object.values(ACHIEVEMENTS)) {
      if (unlockedRef.current[achievement.id]) continue;
      if (achievement.condition.type !== 'event') continue;
      if (achievement.condition.event !== eventName) continue;
      if (achievement.condition.value !== undefined && eventValue < achievement.condition.value) continue;
      tryUnlock(achievement.id);
    }
  }, [tryUnlock]);

  // ==================== 便捷方法 ====================

  const onCocktailSuccess = useCallback((recipe) => {
    setStats(prev => {
      const n = { ...prev };
      n.totalCocktailsMade += 1;
      n.consecutiveSuccess += 1;
      n.maxConsecutiveSuccess = Math.max(n.maxConsecutiveSuccess, n.consecutiveSuccess);
      if (recipe?.ingredients) {
        for (const ing of recipe.ingredients) {
          if (!n.usedIngredients.includes(ing.id)) n.usedIngredients = [...n.usedIngredients, ing.id];
          if (BASE_SPIRITS[ing.id] && !n.usedSpirits.includes(ing.id)) n.usedSpirits = [...n.usedSpirits, ing.id];
        }
      }
      saveAchievementStats(n);
      setTimeout(() => checkStatAchievements(n), 0);
      return n;
    });
  }, [checkStatAchievements]);

  const onCocktailFail = useCallback(() => {
    setStats(prev => {
      const n = { ...prev, consecutiveSuccess: 0 };
      saveAchievementStats(n);
      return n;
    });
  }, []);

  const onEmotionGuessSuccess = useCallback((isFirstTry, emotions) => {
    setStats(prev => {
      const n = { ...prev };
      if (isFirstTry) n.perfectGuessCount += 1;
      for (const e of emotions) {
        if (!n.seenEmotions.includes(e)) n.seenEmotions = [...n.seenEmotions, e];
      }
      saveAchievementStats(n);
      setTimeout(() => {
        checkStatAchievements(n);
        if (isFirstTry) triggerEventAchievement('emotion_guess_perfect_first_try');
      }, 0);
      return n;
    });
  }, [checkStatAchievements, triggerEventAchievement]);

  const onCustomerLeave = useCallback((params) => {
    const { category, trustLevel, dialogueRounds, isReturnCustomer } = params;
    setStats(prev => {
      const n = { ...prev };
      n.totalCustomersServed += 1;
      if (category && !n.servedCategories.includes(category)) n.servedCategories = [...n.servedCategories, category];
      n.maxDialogueRounds = Math.max(n.maxDialogueRounds, dialogueRounds || 0);
      if (trustLevel >= 1.0) n.customerLeftMaxTrust += 1;
      saveAchievementStats(n);
      setTimeout(() => {
        checkStatAchievements(n);
        if (trustLevel >= 1.0) triggerEventAchievement('customer_leave_max_trust');
        if (dialogueRounds >= 10) triggerEventAchievement('dialogue_rounds_exceeded', dialogueRounds);
        if (isReturnCustomer) triggerEventAchievement('first_return_customer');
      }, 0);
      return n;
    });
  }, [checkStatAchievements, triggerEventAchievement]);

  const onMoneyEarned = useCallback((amount, currentMoney, dayEarnings) => {
    setStats(prev => {
      const n = { ...prev };
      n.totalMoneyEarned += amount;
      n.maxDailyEarnings = Math.max(n.maxDailyEarnings, dayEarnings);
      saveAchievementStats(n);
      setTimeout(() => {
        for (const a of Object.values(ACHIEVEMENTS)) {
          if (unlockedRef.current[a.id]) continue;
          if (a.condition.type === 'stat' && a.condition.stat === 'currentMoney')
            if (compareValue(currentMoney, a.condition.op, a.condition.value)) tryUnlock(a.id);
          if (a.condition.type === 'stat' && a.condition.stat === 'totalMoney')
            if (compareValue(n.totalMoneyEarned, a.condition.op, a.condition.value)) tryUnlock(a.id);
        }
        if (dayEarnings >= 500) triggerEventAchievement('daily_earnings_exceeded', dayEarnings);
        checkStatAchievements(n);
      }, 0);
      return n;
    });
  }, [checkStatAchievements, triggerEventAchievement, tryUnlock]);

  const onMoneySpent = useCallback((amount) => {
    setStats(prev => {
      const n = { ...prev, totalSpent: prev.totalSpent + amount };
      saveAchievementStats(n);
      setTimeout(() => checkStatAchievements(n), 0);
      return n;
    });
  }, [checkStatAchievements]);

  const onEventChoice = useCallback((eventNarrative, choiceIndex) => {
    setStats(prev => {
      const n = { ...prev };
      n.eventChoicesMade += 1;
      const fp = (eventNarrative || '').slice(0, 20);
      if (!n.uniqueEventNarratives.includes(fp)) {
        n.uniqueEventNarratives = [...n.uniqueEventNarratives, fp].slice(-50);
        n.uniqueEventsExperienced = n.uniqueEventNarratives.length;
      }
      n.consecutiveBoldChoices = choiceIndex === 1 ? n.consecutiveBoldChoices + 1 : 0;
      saveAchievementStats(n);
      setTimeout(() => checkStatAchievements(n), 0);
      return n;
    });
  }, [checkStatAchievements]);

  const onDayEnd = useCallback((day) => {
    setStats(prev => {
      const n = { ...prev, totalDaysPlayed: day };
      saveAchievementStats(n);
      setTimeout(() => checkStatAchievements(n), 0);
      return n;
    });
  }, [checkStatAchievements]);

  const checkTrustLevel = useCallback((trustLevel) => {
    for (const a of Object.values(ACHIEVEMENTS)) {
      if (unlockedRef.current[a.id]) continue;
      if (a.condition.type === 'threshold' && a.condition.stat === 'trustLevel')
        if (compareValue(trustLevel, a.condition.op, a.condition.value)) tryUnlock(a.id);
    }
  }, [tryUnlock]);

  const checkUnlockAchievements = useCallback((unlockedItems) => {
    if (unlockedItems.glasses && Object.keys(GLASS_TYPES).every(g => unlockedItems.glasses.includes(g))) tryUnlock('all_glasses');
    if (unlockedItems.ingredients && Object.keys(INGREDIENTS).every(i => unlockedItems.ingredients.includes(i))) tryUnlock('ingredient_collector');
    const allIce = Object.keys(ICE_TYPES).every(i => unlockedItems.iceTypes?.includes(i));
    const allGar = Object.keys(GARNISH_TYPES).every(g => unlockedItems.garnishes?.includes(g));
    const allDec = Object.keys(DECORATION_TYPES).every(d => unlockedItems.decorations?.includes(d));
    if (allIce && allGar && allDec) tryUnlock('addon_collector');
  }, [tryUnlock]);

  const checkComboAchievements = useCallback((discoveredCount) => {
    setStats(prev => {
      const n = { ...prev, discoveredCombos: discoveredCount };
      saveAchievementStats(n);
      setTimeout(() => checkStatAchievements(n), 0);
      return n;
    });
    if (discoveredCount >= Object.keys(COMBO_BONUS).length) tryUnlock('all_combos');
  }, [checkStatAchievements, tryUnlock]);

  const checkMidnightAchievement = useCallback(() => {
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 5) {
      setStats(prev => {
        if (prev.playedAtMidnight) return prev;
        const n = { ...prev, playedAtMidnight: true };
        saveAchievementStats(n);
        return n;
      });
      triggerEventAchievement('played_at_midnight');
    }
  }, [triggerEventAchievement]);

  const onSaveFromLowTrust = useCallback((trustLevel) => {
    if (trustLevel < 0.1) triggerEventAchievement('save_customer_low_trust');
  }, [triggerEventAchievement]);

  if (!ACHIEVEMENTS_ENABLED) {
    return {
      enabled: false,
      unlockedAchievements,
      stats,
      pendingNotifications: [],
      popNotification: () => null,
      markAsSeen: () => {},
      getUnseenCount: () => 0,
      onCocktailSuccess: () => {},
      onCocktailFail: () => {},
      onEmotionGuessSuccess: () => {},
      onCustomerLeave: () => {},
      onMoneyEarned: () => {},
      onMoneySpent: () => {},
      onEventChoice: () => {},
      onDayEnd: () => {},
      checkTrustLevel: () => {},
      checkUnlockAchievements: () => {},
      checkComboAchievements: () => {},
      checkMidnightAchievement: () => {},
      onSaveFromLowTrust: () => {},
      triggerEventAchievement: () => {}
    };
  }

  return {
    enabled: true,
    unlockedAchievements, stats, pendingNotifications,
    popNotification, markAsSeen, getUnseenCount,
    onCocktailSuccess, onCocktailFail, onEmotionGuessSuccess,
    onCustomerLeave, onMoneyEarned, onMoneySpent, onEventChoice, onDayEnd,
    checkTrustLevel, checkUnlockAchievements, checkComboAchievements,
    checkMidnightAchievement, onSaveFromLowTrust, triggerEventAchievement
  };
};

export default useAchievements;
