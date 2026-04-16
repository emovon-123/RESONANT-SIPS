import { useCallback } from 'react';
import { callAIForCocktailJudgment } from '../../utils/aiService.js';
import { saveCocktailRecipe, saveDiscoveredCombo, saveGameProgress, saveUnlockedItems } from '../../utils/storage.js';
import { EMOTIONS, GLASS_TYPES } from '../../data/emotions.js';
import { DECORATION_TYPES, GARNISH_TYPES, ICE_TYPES, checkComboBonus } from '../../data/addons.js';
import { calculateCocktailPrice } from '../../utils/cocktailPrice.js';
import { checkTargetConditions } from '../../utils/cocktailMixing.js';
import { interpretCocktailAttitude, getAttitudeInfluence } from '../../utils/cocktailAttitude.js';
import { RESONANCE_EFFECTS, getTransitionalFailureHint, judgeCocktail } from '../../utils/cocktailJudgment.js';
import { TUTORIAL_COCKTAIL_FEEDBACK, TUTORIAL_TARGET, getTutorialFailHint } from '../../data/tutorialData.js';
import { buildStrictJudgmentExplanation } from './helpers.js';
import { appendActiveNpcEvent, queueActiveSlotGameStateSync } from '../../utils/saveRepository.js';

// 先聚焦核心玩法：暂时关闭图鉴联动（黄金组合发现）
const ENCYCLOPEDIA_ENABLED = false;

export const useServeProgressHandlers = ({ ctx }) => {
  const {
    tutorial, progress, customerFlow, dialogue, emotionSystem, cocktailFlow,
    achievements, chapterSystem, playSFX, addToast, showGameHint, aiConfig, aiType,
    trustLevel, setTrustLevel, money, setMoney, unlockedItems, setUnlockedItems,
    atmosphere, shouldTriggerEvent, triggerEvent, updateStreak, handleEventChoice,
    dismissEvent, applyAtmosphereChange, currentEvent, eventsEnabled
  } = ctx;

  const tryTriggerEventAfterServe = useCallback(async (isSuccess) => {
    if (!eventsEnabled) return;

    const context = {
      day: customerFlow.currentDay, customerIndex: customerFlow.currentCustomerIndex, lastWasSuccess: isSuccess
    };
    if (shouldTriggerEvent(context)) {
      await triggerEvent({
        day: customerFlow.currentDay, customersServed: customerFlow.customersServed,
        atmosphere, currentCustomer: customerFlow.currentCustomer
      });
    }
  }, [eventsEnabled, customerFlow.currentDay, customerFlow.currentCustomerIndex, customerFlow.customersServed, atmosphere, customerFlow.currentCustomer, shouldTriggerEvent, triggerEvent]);

  const handleServeCocktail = useCallback(async (recipe) => {
    playSFX('shake');
    cocktailFlow.triggerServeAnim();
    cocktailFlow.resetForServe();
    emotionSystem.setSelectedEmotions([]);
    dialogue.setIsLoading(true);

    try {
      saveCocktailRecipe({ aiType, aiName: aiConfig.name, ...recipe });

      if (ENCYCLOPEDIA_ENABLED) {
        const matchedCombos = checkComboBonus(recipe);
        matchedCombos.forEach(combo => {
          const isNew = saveDiscoveredCombo(combo.id, {
            name: combo.name, icon: combo.icon, description: combo.description, bonus: combo.bonus, requires: combo.requires
          });
          if (isNew) addToast(`🎊 发现黄金组合：${combo.icon} ${combo.name}！已加入图鉴`, 'success');
        });
      }

      const currentEmotions = {
        surface: emotionSystem.dynamicCustomerEmotions.surface.length > 0
          ? emotionSystem.dynamicCustomerEmotions.surface : (aiConfig?.emotionMask?.surface || []),
        reality: emotionSystem.dynamicCustomerEmotions.reality.length > 0
          ? emotionSystem.dynamicCustomerEmotions.reality : (aiConfig?.emotionMask?.reality || [])
      };

      const cocktailAttitude = recipe.cocktailAttitude || interpretCocktailAttitude(recipe.mixture || {}, recipe.isPlainWater, recipe);
      const attitudeInfluence = getAttitudeInfluence(cocktailAttitude);
      cocktailFlow.setCocktailAttitudes(prev => [...prev, attitudeInfluence]);

      // 白水特殊处理
      if (recipe.isPlainWater) {
        const waterTrustChange = trustLevel >= 0.6 ? 0.08 : trustLevel >= 0.3 ? 0.05 : 0.03;
        setTrustLevel(prev => Math.min(1, prev + waterTrustChange));
        cocktailFlow.addTrustFly(waterTrustChange);
        try {
          const waterFeedback = await callAIForCocktailJudgment({
            aiConfig, trustLevel, emotionState: currentEmotions,
            cocktailRecipe: { ...recipe, mixture: { thickness: 0, sweetness: 0, strength: 0 } },
            dialogueHistory: dialogue.dialogueHistory, isSuccess: true, satisfaction: 0.6, cocktailAttitude
          });
          dialogue.addMessage('ai', waterFeedback?.feedback || '……你只是把一杯白水放在了我面前。', true);
        } catch { dialogue.addMessage('ai', '……你只是把一杯白水放在了我面前。', true); }
        playSFX('serve');
        addToast('🚰 倒了一杯白水', 'info');
        dialogue.setIsLoading(false);
        return;
      }

      const mixingMode = chapterSystem?.currentChapter?.mixingMode || 'strict';
      const mixture = recipe.mixture || {};

      // 统一判定系统：strict/transitional/expressive/master
      const customerState = {
        realEmotions: currentEmotions.reality,
        dialogueContext: (dialogue.dialogueHistory || [])
          .slice(-4)
          .map(d => `${d.role === 'player' ? '调酒师' : aiConfig.name}：${d.content}`)
          .join(' ')
      };

      const judgment = await judgeCocktail({
        mixture,
        targetConditions: cocktailFlow.targetConditions,
        attitude: cocktailAttitude,
        customerState,
        mixingMode
      });

      const targetCheck = judgment?.targetCheck
        || recipe.targetCheck
        || checkTargetConditions(mixture, cocktailFlow.targetConditions);

      const isSuccess = judgment?.success === true;
      const satisfaction = typeof judgment?.satisfaction === 'number'
        ? judgment.satisfaction
        : (targetCheck?.satisfaction || 0.5);
      const strictExplanation = buildStrictJudgmentExplanation(targetCheck);

      // 教学模式
      if (tutorial.isTutorialMode) {
        if (isSuccess) {
          dialogue.addMessage('ai', TUTORIAL_COCKTAIL_FEEDBACK, true);
          playSFX('success');
          setMoney(prev => prev + 50);
          customerFlow.setDayEarnings(prev => prev + 50);
          addToast('💰 收入 ¥50', 'success');
          addToast('🎉 调酒成功！', 'success');
          tutorial.advanceTutorial('cocktail_served');
        } else {
          const failHint = getTutorialFailHint(TUTORIAL_TARGET.conditions, recipe.mixture || {});
          addToast(`💡 ${failHint}`, 'info');
          playSFX('fail');
          tutorial.advanceTutorial('cocktail_failed');
          cocktailFlow.setGuessedCorrectly(true);
          cocktailFlow.setTargetConditions(TUTORIAL_TARGET.conditions);
          cocktailFlow.setTargetHint(TUTORIAL_TARGET.hint);
        }
        dialogue.setIsLoading(false);
        return;
      }

      // AI 反馈
      let feedback = '';
      let aiJudgmentSuccess = false;
      try {
        const aiResult = await callAIForCocktailJudgment({
          aiConfig, trustLevel, emotionState: currentEmotions,
          cocktailRecipe: { ...recipe, mixture: recipe.mixture, glass: recipe.glass, ice: recipe.ice, garnish: recipe.garnish, decoration: recipe.decoration },
          dialogueHistory: dialogue.dialogueHistory, isSuccess, satisfaction, cocktailAttitude,
          judgmentExplanation: strictExplanation
        });
        if (aiResult?.feedback) { feedback = aiResult.feedback; aiJudgmentSuccess = true; }
      } catch { /* fallback below */ }
      if (!aiJudgmentSuccess) {
        if (isSuccess) {
          const opts = ['嗯...这杯酒正是我需要的，谢谢你。', '完美。你真的懂我想要什么。', '这个味道...恰到好处，很舒服。', '终于有人调出我想要的酒了。'];
          feedback = opts[Math.floor(Math.random() * opts.length)];
        } else {
          const opts = ['这杯酒...不太对味，好像少了什么。', '嗯，口感有点偏...不是我想要的感觉。', '差一点点...味道不太对。', '谢谢，但这不是我今天想喝的。'];
          feedback = opts[Math.floor(Math.random() * opts.length)];
        }
      }

      dialogue.addMessage('ai', feedback, true);
      appendActiveNpcEvent({
        role: 'ai',
        type: 'cocktail_feedback',
        content: feedback,
        meta: {
          isSuccess,
          satisfaction
        },
        timestamp: Date.now()
      }).catch(() => {});
      playSFX('serve');
      customerFlow.updateGameProgressRef.current(isSuccess, recipe, satisfaction);
      queueActiveSlotGameStateSync('serve_result');
      showResultToast(isSuccess, recipe, '');
      if (!tutorial.isTutorialMode && mixingMode === 'strict') {
        if (isSuccess) {
          addToast(`🧭 复盘：${strictExplanation.summary}`, 'success');
        } else if (strictExplanation.shortHint) {
          addToast(`🧭 复盘：${strictExplanation.shortHint}`, 'info');
        }
      }
      cocktailFlow.showResultCard({
        isSuccess,
        mixture: mixture || {},
        targetCheck,
        glass: recipe.glass,
        ingredients: recipe.ingredients,
        judgment: {
          mixingMode,
          method: judgment?.method || null,
          resonance: judgment?.resonance || null,
          resonanceLabel: judgment?.resonance
            ? (RESONANCE_EFFECTS[judgment.resonance]?.label || judgment.resonance)
            : null
        }
      });

      if (!tutorial.isTutorialMode) {
        if (isSuccess) achievements.onCocktailSuccess(recipe);
        else achievements.onCocktailFail();
      }

      // 过渡期失败引导（帮助玩家/测试理解“态度权重”的变化）
      if (!isSuccess && mixingMode === 'transitional') {
        addToast(`💡 ${getTransitionalFailureHint()}`, 'info');
      }

      // 顾客离开判定：基于总杯数（成功+失败）+ 提前离开概率
      const cocktailCount = customerFlow.customerCocktailCountRef.current;
      let willLeave = cocktailCount >= customerFlow.MAX_COCKTAILS_PER_CUSTOMER; // 3杯到了必走
      if (!willLeave && cocktailCount >= 1) {
        // 提前离开概率：信任度低或失败时更容易走
        let earlyLeaveChance = 0;
        if (!isSuccess) {
          // 失败后离开概率较高
          earlyLeaveChance = cocktailCount === 1 ? 0.25 : 0.40;
          if (trustLevel < 0.2) earlyLeaveChance += 0.30; // 信任很低加大离开概率
        } else {
          // 成功但可能满足了就走
          earlyLeaveChance = cocktailCount === 1 ? 0.05 : 0.15;
        }
        if (Math.random() < earlyLeaveChance) {
          willLeave = true;
          // 提前离开：直接触发（不等 useEffect，因为 cocktailCount 还没到3）
          const leaveReason = isSuccess ? 'success_complete' : 'trust_zero';
          console.log(`🚶 顾客决定提前离开（第${cocktailCount}杯后，概率${Math.round(earlyLeaveChance * 100)}%）`);
          setTimeout(() => customerFlow.handleCustomerLeaveRef.current(leaveReason), 1500);
        }
      }
      if (!willLeave) {
        setTimeout(() => tryTriggerEventAfterServe(isSuccess), 2000);
      }

      // 情绪变化
      {
        const allEmotionIds = Object.keys(EMOTIONS);
        const positivePool = ['relief', 'calm', 'happiness', 'courage', 'aspiration'];
        const negativePool = ['anxiety', 'loneliness', 'pressure', 'regret', 'confusion', 'dependence'];
        const currentReality = [...currentEmotions.reality];
        const guessedEmotions = cocktailFlow.lastCorrectGuesses || [];
        const emotionsToReplace = currentReality.filter(e => guessedEmotions.includes(e));
        const emotionsToKeep = currentReality.filter(e => !guessedEmotions.includes(e));
        const replacementPool = isSuccess ? positivePool : negativePool;
        let newReality = [...emotionsToKeep];
        for (let i = 0; i < emotionsToReplace.length; i++) {
          const available = replacementPool.filter(e => !newReality.includes(e) && !currentReality.includes(e));
          if (available.length > 0) newReality.push(available[Math.floor(Math.random() * available.length)]);
          else {
            const fallback = allEmotionIds.filter(e => !newReality.includes(e) && !currentReality.includes(e));
            if (fallback.length > 0) newReality.push(fallback[Math.floor(Math.random() * fallback.length)]);
            else { const last = allEmotionIds.filter(e => !newReality.includes(e)); newReality.push(last[Math.floor(Math.random() * last.length)]); }
          }
        }
        while (newReality.length < 2) {
          const fill = allEmotionIds.filter(e => !newReality.includes(e));
          newReality.push(fill[Math.floor(Math.random() * fill.length)]);
        }
        const hasChange = !currentReality.every(e => newReality.includes(e)) || !newReality.every(e => currentReality.includes(e));
        if (hasChange) {
          if (emotionsToKeep.length > 0) addToast('🌟 顾客的心情似乎有些变化，但有些感受依然在...', 'success');
          else addToast(isSuccess ? '🌟 顾客的心情发生了很大变化...再观察观察吧' : '😔 顾客的情绪似乎完全变了...需要重新了解TA', isSuccess ? 'success' : 'info');
        }
        emotionSystem.setDynamicCustomerEmotions(prev => ({ ...prev, reality: newReality }));
        cocktailFlow.setLastCorrectGuesses([]);
        emotionSystem.setEmotionHints([]);
      }
    } catch (error) {
      console.error('递酒失败:', error);
      const fallbackSuccess = Math.random() > 0.5;
      dialogue.addMessage('ai', fallbackSuccess ? '嗯...这杯酒还不错，谢谢你。' : '这杯酒...不太对味，不过还是谢谢。', true);
      appendActiveNpcEvent({
        role: 'ai',
        type: 'cocktail_feedback_fallback',
        content: fallbackSuccess ? '嗯...这杯酒还不错，谢谢你。' : '这杯酒...不太对味，不过还是谢谢。',
        meta: { isSuccess: fallbackSuccess },
        timestamp: Date.now()
      }).catch(() => {});
      playSFX('serve');
      customerFlow.updateGameProgressRef.current(fallbackSuccess, recipe, 0.5);
      queueActiveSlotGameStateSync('serve_result_fallback');
      showResultToast(fallbackSuccess, recipe, '');
    } finally {
      dialogue.setIsLoading(false);
    }
  }, [aiConfig, aiType, trustLevel, dialogue.dialogueHistory, emotionSystem.dynamicCustomerEmotions,
    cocktailFlow.targetConditions, cocktailFlow.lastCorrectGuesses, unlockedItems, playSFX, showGameHint, addToast, tryTriggerEventAfterServe, chapterSystem, tutorial]);

  // ==================== 进度 & 事件 & 商店 ====================

  const updateGameProgress = useCallback((isSuccess, recipe, satisfaction = 0.5) => {
    const newStats = {
      ...progress.gameStats,
      totalServed: progress.gameStats.totalServed + 1,
      successCount: isSuccess ? progress.gameStats.successCount + 1 : progress.gameStats.successCount,
      failureCount: isSuccess ? progress.gameStats.failureCount : progress.gameStats.failureCount + 1
    };
    progress.setGameStats(newStats);
    updateStreak(isSuccess);

    // 递增每日成功/失败计数（用于当天声誉结算）
    if (isSuccess) {
      customerFlow.daySuccessCountRef.current += 1;
    } else {
      customerFlow.dayFailureCountRef.current += 1;
    }

    // 递增顾客酒杯计数 & 每日总杯数
    customerFlow.customerCocktailCountRef.current += 1;
    customerFlow.setCustomerCocktailCount(customerFlow.customerCocktailCountRef.current);
    customerFlow.dailyCocktailCountRef.current += 1;

    if (!isSuccess) {
      setTrustLevel(prev => Math.max(0, prev - 0.1));
      showGameHint('cocktail_failed');
    }

    if (isSuccess) {
      const customerPreferences = aiConfig?.preferences || null;
      const basePrice = calculateCocktailPrice(recipe, customerPreferences, true);
      const satisfactionMultiplier = 0.8 + (satisfaction * 0.4);
      const atmospherePriceMultiplier = atmosphere?.modifiers?.priceMultiplier || 1.0;
      const price = Math.round(basePrice * satisfactionMultiplier * atmospherePriceMultiplier);
      setMoney(prev => prev + price);
      customerFlow.setDayEarnings(prev => prev + price);
      addToast(`💰 收入 ¥${price}`, 'success');
      achievements.onMoneyEarned(price, money + price, customerFlow.dayEarnings + price);

      const newSuccessCount = customerFlow.customerSuccessCountRef.current + 1;
      customerFlow.customerSuccessCountRef.current = newSuccessCount;
      customerFlow.setCustomerSuccessCount(newSuccessCount);
      setTrustLevel(prev => Math.min(1, prev + 0.05));

      const newUnlocked = { ...unlockedItems, successCount: newStats.successCount };
      if (newStats.successCount % 5 === 0 && newUnlocked.glasses.length < 4) {
        const allGlasses = Object.keys(GLASS_TYPES);
        const nextGlass = allGlasses.find(g => !newUnlocked.glasses.includes(g));
        if (nextGlass) {
          newUnlocked.glasses.push(nextGlass);
          addToast(`🏆 解锁新杯型：${GLASS_TYPES[nextGlass].name}`, 'success');
        }
      }
      setUnlockedItems(newUnlocked);
      saveUnlockedItems(newUnlocked);
    }
    saveGameProgress({ day: customerFlow.currentDay, money, stats: newStats, trustLevel });
  }, [progress.gameStats, aiConfig, customerFlow.currentDay, money, trustLevel, customerFlow.customerSuccessCount,
    unlockedItems, atmosphere, setMoney, setUnlockedItems, showGameHint, addToast, updateStreak]);
  customerFlow.updateGameProgressRef.current = updateGameProgress;

  const handleEventChoiceAction = useCallback((choiceIndex) => {
    const result = handleEventChoice(choiceIndex);
    if (!result) return;
    const choiceEffect = result.choiceEffect || {};
    const trustChange = (result.trustModifier || 0) + (choiceEffect.trustModifier || 0);
    if (trustChange !== 0) {
      setTrustLevel(prev => Math.max(0, Math.min(1, prev + trustChange)));
      if (trustChange > 0) addToast(`💫 信任度 +${Math.round(trustChange * 100)}%`, 'success');
      else addToast(`😟 信任度 ${Math.round(trustChange * 100)}%`, 'warning');
    }
    const atmosphereChange = result.atmosphereChange || choiceEffect.atmosphereChange;
    if (atmosphereChange) applyAtmosphereChange(atmosphereChange);
    const reward = result.bonusReward || choiceEffect.bonusReward;
    if (reward?.type === 'money') {
      setMoney(prev => prev + reward.amount);
      customerFlow.setDayEarnings(prev => prev + reward.amount);
      addToast(`💰 获得 ¥${reward.amount}`, 'success');
    }
    if (currentEvent) achievements.onEventChoice(currentEvent.narrative || '', choiceIndex);
  }, [handleEventChoice, currentEvent, setTrustLevel, applyAtmosphereChange, setMoney, addToast]);

  const handleEventDismissAction = useCallback(() => {
    const effects = dismissEvent();
    if (effects?.trustModifier) setTrustLevel(prev => Math.max(0, Math.min(1, prev + effects.trustModifier)));
  }, [dismissEvent]);

  const showResultToast = useCallback((isSuccess, recipe, aiReason = '') => {
    playSFX(isSuccess ? 'success' : 'fail');
    const message = isSuccess
      ? (aiReason.length > 0 ? `🎉 调酒成功！${aiReason}` : '🎉 调酒成功！顾客很满意')
      : (aiReason.length > 0 ? `💔 ${aiReason}` : '💔 这杯酒没有触动顾客的心...');
    addToast(message, isSuccess ? 'success' : 'error');
  }, [playSFX, addToast]);

  const handleShopPurchase = useCallback((itemType, itemId, price) => {
    if (money < price) { addToast('💸 金钱不足，无法购买！', 'error'); return; }
    setMoney(prev => prev - price);
    const newUnlocked = { ...unlockedItems };
    if (!newUnlocked[itemType]) newUnlocked[itemType] = [];
    if (!newUnlocked[itemType].includes(itemId)) newUnlocked[itemType].push(itemId);
    setUnlockedItems(newUnlocked);
    saveUnlockedItems(newUnlocked);
    let itemName = itemId;
    if (itemType === 'glasses' && GLASS_TYPES[itemId]) itemName = GLASS_TYPES[itemId].name;
    else if (itemType === 'iceTypes' && ICE_TYPES[itemId]) itemName = ICE_TYPES[itemId].name;
    else if (itemType === 'garnishes' && GARNISH_TYPES[itemId]) itemName = GARNISH_TYPES[itemId].name;
    else if (itemType === 'decorations' && DECORATION_TYPES[itemId]) itemName = DECORATION_TYPES[itemId].name;
    addToast(`🎉 成功购买：${itemName}`, 'success');
    playSFX('success');
  }, [money, unlockedItems, setMoney, setUnlockedItems, addToast, playSFX]);


  return {
    tryTriggerEventAfterServe,
    handleServeCocktail,
    updateGameProgress,
    handleEventChoiceAction,
    handleEventDismissAction,
    showResultToast,
    handleShopPurchase
  };
};
