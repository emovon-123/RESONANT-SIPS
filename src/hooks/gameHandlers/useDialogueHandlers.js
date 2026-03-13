import { useCallback } from 'react';
import { callAIAPI, callAIForTrustJudgment } from '../../utils/aiService.js';
import { PROMPT_TYPES } from '../../config/api.js';
import { INITIAL_UNLOCKED_INGREDIENTS } from '../../data/ingredients.js';
import { generateSolvableTarget } from '../../utils/cocktailMixing.js';
import { EVENT_TRIGGER_CONFIG } from '../../data/eventTemplates.js';
import { TUTORIAL_RESPONSES, TUTORIAL_TARGET } from '../../data/tutorialData.js';
import { getRelevantMemoryContext } from '../../utils/memoryContext.js';
import {
  appendActiveNpcEvent,
  buildNpcDecisionContext,
  queueActiveSlotGameStateSync
} from '../../utils/saveRepository.js';

export const useDialogueHandlers = ({ ctx, refs, syncGuessReadiness }) => {
  const { consecutiveSilenceRef, totalSilenceRef } = refs;
  const {
    tutorial, customerFlow, dialogue, emotionSystem, cocktailFlow,
    playSFX, addToast, showGameHint, aiConfig, trustLevel, setTrustLevel,
    unlockedItems, atmosphere, dailyEventCount, triggerEvent, chapterSystem
  } = ctx;

  const startConversation = useCallback(async () => {
    dialogue.setIsLoading(true);
    try {
      const realityEmotions = Array.isArray(aiConfig.emotionMask?.reality) ? aiConfig.emotionMask.reality : [];
      const surfaceEmotionIds = Array.isArray(aiConfig.emotionMask?.surface) ? aiConfig.emotionMask.surface : [];
      emotionSystem.setDynamicCustomerEmotions({ surface: surfaceEmotionIds, reality: realityEmotions });

      if (tutorial.isTutorialMode) {
        dialogue.addMessage('ai', '......有酒吗。');
        const initialSurface = surfaceEmotionIds.map(emotionId => ({ id: emotionId, intensity: 3, confidence: 0.3 }));
        emotionSystem.setSurfaceEmotions(initialSurface);
        dialogue.setQuickOptions(tutorial.getTutorialQuickOptions(1));
        syncGuessReadiness({ clueCount: 0, playerTurns: 0 });
        dialogue.setIsLoading(false);
        return;
      }

      const initialPromptType = aiConfig.isReturnCustomer ? PROMPT_TYPES.RETURN_CUSTOMER_INITIAL : PROMPT_TYPES.INITIAL;
      const returnParams = aiConfig.isReturnCustomer ? {
        customer: aiConfig, visitCount: aiConfig.visitCount, sharedHistory: aiConfig.sharedHistory,
        characterArc: aiConfig.characterArc, currentEmotions: realityEmotions,
        visitReason: aiConfig.characterArc?.nextVisitSetup?.visitReason || '',
        intimacy: aiConfig.intimacy || 0, crossroads: aiConfig.crossroads || null
      } : {};

      // 流式输出开场白
      dialogue.addMessage('ai', '');
      dialogue.setIsLoading(false);

      const initialMessage = await callAIAPI(initialPromptType, {
        aiConfig, trustLevel, emotionState: { surface: [], reality: realityEmotions }, ...returnParams
      }, (accumulated) => {
        dialogue.updateLastMessage(accumulated);
      });
      dialogue.updateLastMessage(initialMessage);
      appendActiveNpcEvent({
        role: 'ai',
        type: 'dialogue_opening',
        content: initialMessage,
        timestamp: Date.now()
      }).catch(() => {});

      const initialSurface = surfaceEmotionIds.map(emotionId => ({ id: emotionId, intensity: 3, confidence: 0.3 }));
      emotionSystem.setSurfaceEmotions(initialSurface);
      syncGuessReadiness({ clueCount: 0, playerTurns: 0 });

      customerFlow.generateNextCustomerInBackground();

      // 事件触发点1 已移到 handleSendMessage 中（玩家发送第一条消息后），
      // 避免开场白后挂机也会自动弹出事件
    } catch (error) {
      console.error('开始对话失败:', error);
      const fallback = '......今晚有点安静。';
      dialogue.updateLastMessage(fallback);
      appendActiveNpcEvent({
        role: 'ai',
        type: 'dialogue_opening_fallback',
        content: fallback,
        timestamp: Date.now()
      }).catch(() => {});
    } finally {
      dialogue.setIsLoading(false);
    }
  }, [aiConfig, trustLevel, tutorial.isTutorialMode, syncGuessReadiness]);

  const handleSendMessage = useCallback(async (message, source) => {
    playSFX('click');
    dialogue.addMessage('player', message);
    appendActiveNpcEvent({
      role: 'player',
      type: 'dialogue_player',
      content: message,
      timestamp: Date.now()
    }).catch(() => {});
    dialogue.setIsLoading(true);

    // 教学模式对话处理
    if (tutorial.isTutorialMode && tutorial.tutorialPhase === 'dialogue') {
      // 先用当前轮次获取回复，再推进（advanceTutorial 会递增 round）
      const respondRound = tutorial.dialogueRound; // 递增前的轮次（玩家发消息时所在的轮次）
      const newRound = tutorial.advanceTutorial('dialogue_sent'); // 递增后的轮次

      let response;
      // 处理沉默选项
      if (message === '……') {
        const roundKey = `round${respondRound}`;
        const responses = TUTORIAL_RESPONSES[roundKey];
        response = responses?.silence || responses?.default || '......';
        await new Promise(r => setTimeout(r, 800));
      } else if (source === 'quick') {
        response = tutorial.getTutorialResponse(message, respondRound);
        await new Promise(r => setTimeout(r, 800));
      } else {
        try {
          const realityEmotions = Array.isArray(aiConfig.emotionMask?.reality) ? aiConfig.emotionMask.reality : [];
          const tutorialAiConfig = {
            ...aiConfig, name: '林澈',
            personality: ['刚下班的中年人', '很累', '话少', '用省略号停顿', '只说自己的台词，禁止加旁白和动作描写'],
            dialogueStyle: { ...aiConfig.dialogueStyle, tone: 'tired', length: 'short', features: ['话少', '停顿多', '回答简短', '只输出角色说的话'] }
          };
          response = await callAIAPI(PROMPT_TYPES.RESPONSE, {
            aiConfig: tutorialAiConfig, trustLevel,
            emotionState: { surface: ['calm'], reality: realityEmotions },
            playerInput: message, dialogueHistory: dialogue.dialogueHistory
          });
        } catch {
          response = tutorial.getTutorialResponse(message, respondRound);
        }
      }
      dialogue.addMessage('ai', response, true);
      playSFX('message');
      setTrustLevel(prev => Math.min(1, prev + 0.10));
      if (newRound < 3) {
        dialogue.setQuickOptions(tutorial.getTutorialQuickOptions(newRound + 1));
      } else {
        dialogue.setQuickOptions([]);
      }
      dialogue.setIsLoading(false);
      return;
    }

    try {
      const currentRealEmotions = emotionSystem.dynamicCustomerEmotions.reality.length > 0
        ? emotionSystem.dynamicCustomerEmotions.reality
        : (Array.isArray(aiConfig.emotionMask?.reality) ? aiConfig.emotionMask.reality : []);
      const currentEmotionState = {
        surface: emotionSystem.surfaceEmotions.map(e => e.id),
        reality: currentRealEmotions
      };
      const localMemoryContext = getRelevantMemoryContext(aiConfig);
      const saveDecisionContext = await buildNpcDecisionContext();
      const runtimeAiConfig = saveDecisionContext?.profile?.initialProfile
        ? { ...aiConfig, ...saveDecisionContext.profile.initialProfile }
        : aiConfig;
      const memoryContext = [localMemoryContext, saveDecisionContext?.memoryContext || '']
        .filter(Boolean)
        .join('\n');

      const promptType = runtimeAiConfig.isReturnCustomer ? PROMPT_TYPES.RETURN_CUSTOMER_RESPONSE : PROMPT_TYPES.RESPONSE;
      const extraParams = runtimeAiConfig.isReturnCustomer ? {
        customer: runtimeAiConfig, visitCount: runtimeAiConfig.visitCount, sharedHistory: runtimeAiConfig.sharedHistory,
        characterArc: runtimeAiConfig.characterArc, realEmotions: currentEmotionState.reality,
        dialogueStyle: runtimeAiConfig.dialogueStyle
      } : {};

      // 流式输出：先添加空的 AI 消息占位，再逐步更新
      dialogue.addMessage('ai', '', false);
      dialogue.setIsLoading(false); // 隐藏打字指示器，由实际文字替代

      const response = await callAIAPI(promptType, {
        aiConfig: runtimeAiConfig, trustLevel, emotionState: currentEmotionState,
        playerInput: message, dialogueHistory: dialogue.dialogueHistory,
        memoryContext, ...extraParams
      }, (accumulated) => {
        // 流式回调：实时更新最后一条消息
        dialogue.updateLastMessage(accumulated);
      });

      // 流式结束后用最终清理过的文本覆盖
      dialogue.updateLastMessage(response);
      appendActiveNpcEvent({
        role: 'ai',
        type: 'dialogue_ai',
        content: response,
        timestamp: Date.now()
      }).catch(() => {});
      const addedClues = emotionSystem.registerDialogueClues
        ? emotionSystem.registerDialogueClues(response)
        : [];
      dialogue.updateLastMessageMeta?.({ hasEmotionClue: addedClues.length > 0 });
      playSFX('message');

      if (addedClues.length > 0 && !tutorial.isTutorialMode) {
        addToast(`🔎 观察到线索：${addedClues[0].label}`, 'info');
      }

      const wasGuessReady = cocktailFlow.guessReadiness?.canGuess === true;
      const playerMsgCount = dialogue.dialogueHistory.filter(d => d.role === 'player').length + 1;
      const totalClueCount = (emotionSystem.observedClues?.length || 0) + addedClues.length;
      const readiness = syncGuessReadiness({
        clueCount: totalClueCount,
        playerTurns: playerMsgCount
      });

      if (!wasGuessReady && readiness.canGuess && !tutorial.isTutorialMode) {
        addToast('🧩 顾客开始露出破绽，现在可以尝试猜测真实情绪。', 'success');
      }

      // 沉默特殊处理（加入连续沉默递减和惩罚机制）
      if (message === '……') {
        consecutiveSilenceRef.current += 1;
        totalSilenceRef.current += 1;
        const consecutive = consecutiveSilenceRef.current;
        const total = totalSilenceRef.current;

        let silenceChange;
        if (consecutive === 1 && trustLevel >= 0.3) {
          // 第一次沉默：适当的沉默传递默契
          silenceChange = trustLevel >= 0.5 ? 0.04 : 0.02;
        } else if (consecutive === 2 && trustLevel >= 0.4) {
          // 第二次连续沉默：效果减弱
          silenceChange = 0.01;
        } else if (consecutive >= 3) {
          // 第三次及以上连续沉默：开始尴尬，扣信任
          silenceChange = -0.03 * Math.min(consecutive - 2, 3); // 最多扣 -0.09
        } else {
          // 信任度太低时沉默
          silenceChange = -0.02;
        }

        // 总沉默次数过多也会递减（一个顾客内沉默 5 次以上全部扣分）
        if (total > 5 && silenceChange > 0) {
          silenceChange = -0.02;
        }

        setTrustLevel(prev => Math.max(0, Math.min(1, prev + silenceChange)));
        cocktailFlow.addTrustFly(silenceChange);
        if (silenceChange > 0) addToast('🤫 沉默中传递了默契', 'success');
        else if (silenceChange < -0.05) addToast('😶 持续的沉默让气氛变得很僵...', 'warning');
        else if (silenceChange < 0) addToast('😶 沉默让气氛有些尴尬...', 'info');
      } else {
        // 发送了正常消息，重置连续沉默计数
        consecutiveSilenceRef.current = 0;
        try {
          const trustJudgment = await callAIForTrustJudgment({
            aiConfig: runtimeAiConfig, trustLevel, emotionState: currentEmotionState,
            playerInput: message, dialogueHistory: dialogue.dialogueHistory
          });
          if (trustJudgment) {
            let { change, reason } = trustJudgment;
            
            // === 信任度变化后处理：难度校准 + 保护机制 ===
            const metaphorLvl = aiConfig.metaphorLevel || aiConfig.dialogueStyle?.metaphorLevel || 'none';
            const playerMsgNum = dialogue.dialogueHistory.filter(d => d.role === 'player').length;
            
            // 1. 暖场保护：前2轮对话，负面变化减半，且下限为 -0.03
            if (playerMsgNum <= 2 && change < 0) {
              change = Math.max(change * 0.5, -0.03);
              console.log(`🛡️ 暖场保护：负面变化已减轻 (轮次${playerMsgNum})`);
            }
            
            // 2. 隐喻难度校准：高隐喻顾客的负面变化封顶
            if (metaphorLvl === 'high' && change < 0) {
              change = Math.max(change, -0.05); // 高隐喻顾客单轮最多扣 0.05
              console.log(`🎭 隐喻校准：高隐喻顾客负面变化已封顶`);
            } else if (metaphorLvl === 'medium' && change < 0) {
              change = Math.max(change, -0.08); // 中隐喻顾客单轮最多扣 0.08
            }
            
            // 3. 底线保护：信任度不会因单次对话从正常区间直接掉到危险区
            if (trustLevel >= 0.2 && trustLevel + change < 0.1) {
              change = 0.1 - trustLevel; // 最多掉到 0.1，不会直接归零
              console.log(`🛡️ 底线保护：防止信任度骤降至危险区`);
            }
            
            // 4. 正面倾斜：高隐喻顾客的正面变化略微增加（奖励勇于交流）
            if (metaphorLvl === 'high' && change > 0) {
              change = Math.min(change * 1.2, 0.15); // 正面变化增加20%
            }
            
            if (change !== 0) {
              setTrustLevel(prev => Math.max(0, Math.min(1, prev + change)));
              cocktailFlow.addTrustFly(change);
              if (change >= 0.08) addToast(`💝 ${reason}，信任度大幅提升！`, 'success');
              else if (change >= 0.03) addToast(`💬 ${reason}`, 'success');
              else if (change >= 0.01) addToast(`💬 ${reason}`, 'info');
              else if (change <= -0.08) { addToast(`😔 ${reason}，信任度大幅下降...`, 'warning'); showGameHint('reply_poor'); }
              else if (change <= -0.03) { addToast(`💭 ${reason}`, 'info'); showGameHint('reply_poor'); }
              // -0.01 ~ -0.02 的轻微扣分不弹toast，减少负面反馈轰炸
            }
          }
        } catch {
          const isGoodResponse = dialogue.analyzePlayerResponse(message, dialogue.dialogueHistory);
          if (isGoodResponse) setTrustLevel(prev => Math.min(1, prev + (source === 'custom' ? 0.05 : 0.03)));
          else { setTrustLevel(prev => Math.max(0, prev - 0.03)); showGameHint('reply_poor'); } // 降级判定也减轻惩罚：0.05→0.03
        }
      }

      emotionSystem.updateEmotions(aiConfig, trustLevel);

      // 事件触发点：基于玩家对话行为（非挂机被动触发）
      if (!tutorial.isTutorialMode) {
        const playerMsgCount = dialogue.dialogueHistory.filter(d => d.role === 'player').length + 1;

        // 触发点1：第1轮对话后（替代原来开场白后的 setTimeout）
        if (playerMsgCount === 1) {
          const chance = EVENT_TRIGGER_CONFIG.triggerPointChance?.after_greeting || 0.15;
          if (Math.random() < chance && dailyEventCount < EVENT_TRIGGER_CONFIG.maxEventsPerDay) {
            setTimeout(() => {
              triggerEvent({
                day: customerFlow.currentDay, customersServed: customerFlow.customersServed,
                atmosphere, currentCustomer: customerFlow.currentCustomer
              });
            }, 2000);
          }
        }

        // 触发点2：第3轮对话后
        if (playerMsgCount === 3) {
          const chance = EVENT_TRIGGER_CONFIG.triggerPointChance?.after_dialogue_3 || 0.20;
          if (Math.random() < chance && dailyEventCount < EVENT_TRIGGER_CONFIG.maxEventsPerDay) {
            setTimeout(() => {
              triggerEvent({
                day: customerFlow.currentDay, customersServed: customerFlow.customersServed,
                atmosphere, currentCustomer: customerFlow.currentCustomer
              });
            }, 1500);
          }
        }
      }
      queueActiveSlotGameStateSync('dialogue_turn');
    } catch (error) {
      console.error('发送消息失败:', error);
      const fallback = '......我有点走神了，你可以再说一遍吗？';
      dialogue.updateLastMessage(fallback);
      appendActiveNpcEvent({
        role: 'ai',
        type: 'dialogue_ai_fallback',
        content: fallback,
        timestamp: Date.now()
      }).catch(() => {});
    } finally {
      dialogue.setIsLoading(false);
    }
  }, [
    aiConfig,
    trustLevel,
    emotionSystem.surfaceEmotions,
    emotionSystem.dynamicCustomerEmotions,
    emotionSystem.registerDialogueClues,
    emotionSystem.observedClues,
    dialogue.dialogueHistory,
    dialogue.updateLastMessageMeta,
    playSFX,
    showGameHint,
    addToast,
    tutorial.isTutorialMode,
    cocktailFlow.guessReadiness,
    syncGuessReadiness
  ]);

  // ==================== 情绪猜测 ====================

  const handleConfirmGuess = useCallback(() => {
    if (emotionSystem.selectedEmotions.length === 0) { addToast('请至少选择一种情绪', 'warning'); return; }
    playSFX('click');
    cocktailFlow.setGuessAttempts(prev => prev + 1);

    const customerRealEmotions = emotionSystem.dynamicCustomerEmotions.reality.length > 0
      ? emotionSystem.dynamicCustomerEmotions.reality : (aiConfig?.emotionMask?.reality || []);
    const correctGuesses = emotionSystem.selectedEmotions.filter(e => customerRealEmotions.includes(e));
    let isCorrect = correctGuesses.length > 0;
    if (tutorial.isTutorialMode && tutorial.shouldAutoRevealAnswer) isCorrect = true;

    if (isCorrect) {
      cocktailFlow.setGuessedCorrectly(true);
      cocktailFlow.setEmotionGuessMode(false);
      cocktailFlow.setLastCorrectGuesses(correctGuesses);
      playSFX('success');
      const clueNames = (emotionSystem.observedClues || []).slice(-2).map(item => item.label);
      const clueText = clueNames.length > 0 ? `你抓住了：${clueNames.join('、')}` : '你抓住了关键表达差异';
      addToast(`🎯 猜对了！${clueText}`, 'success');
      cocktailFlow.triggerGuessCorrectAnim();

      if (!tutorial.isTutorialMode) {
        const isFirstTry = cocktailFlow.guessAttempts === 0;
        achievements.onEmotionGuessSuccess(isFirstTry, correctGuesses);
      }
      if (tutorial.isTutorialMode) tutorial.advanceTutorial('emotion_guessed');

      if (tutorial.isTutorialMode) {
        cocktailFlow.setTargetConditions(TUTORIAL_TARGET.conditions);
        cocktailFlow.setTargetHint(TUTORIAL_TARGET.hint);
      } else {
        const mixingMode = chapterSystem?.currentChapter?.mixingMode || 'strict';

        // expressive/master：不再依赖数值目标（直接用“态度”调酒）
        if (mixingMode === 'master') {
          cocktailFlow.setTargetConditions([]);
          cocktailFlow.setTargetHint('你已经不需要提示了。感受他们的情绪，用一杯酒回应。');
        } else if (mixingMode === 'expressive') {
          cocktailFlow.setTargetConditions([]);
          cocktailFlow.setTargetHint('不看目标，听这个人需要什么，然后用酒说出来。');
        } else {
          const primaryEmotion = correctGuesses[0];
          const availableIngredients = unlockedItems.ingredients || INITIAL_UNLOCKED_INGREDIENTS;
          const target = generateSolvableTarget(primaryEmotion, availableIngredients);
          if (target) {
            let finalConditions = target.conditions;
            const atmosphereShift = atmosphere?.modifiers?.targetShift;
            if (atmosphereShift) {
              finalConditions = target.conditions.map(cond => {
                const shift = atmosphereShift[cond.attr];
                return (shift !== undefined && shift !== 0) ? { ...cond, value: cond.value + shift } : cond;
              });
            }
            cocktailFlow.setTargetConditions(finalConditions);
            cocktailFlow.setTargetHint(target.hint);
          }
        }
      }
      setTrustLevel(prev => Math.min(1, prev + 0.1));
      showGameHint('emotion_guessed');
    } else {
      cocktailFlow.triggerGuessWrongAnim();
      if (tutorial.isTutorialMode) {
        tutorial.advanceTutorial('emotion_guess_wrong');
        addToast('❌ 不太对......再想想。', 'warning');
        emotionSystem.setSelectedEmotions([]);
      } else {
        const penalty = 0.05 + (cocktailFlow.guessAttempts * 0.02);
        setTrustLevel(prev => Math.max(0, prev - penalty));
        const surfaceIds = (emotionSystem.surfaceEmotions || []).map(item => item.id);
        const selectedSurfaceCount = emotionSystem.selectedEmotions.filter(item => surfaceIds.includes(item)).length;
        let failDirection = '线索还不够，先继续观察顾客的回避与停顿。';
        if (selectedSurfaceCount > 0) {
          failDirection = '你把表面情绪当成了真实情绪，试着看顾客没说出口的部分。';
        } else if (emotionSystem.selectedEmotions.length >= 2) {
          failDirection = '你的猜测有点发散，优先抓“反复出现”的迹象。';
        }
        addToast(`❌ 猜错了。${failDirection} 信任度-${Math.round(penalty * 100)}%`, 'error');
        emotionSystem.setSelectedEmotions([]);
        if (cocktailFlow.guessAttempts >= 2) showGameHint('guess_hint');
        syncGuessReadiness();
      }
    }
  }, [emotionSystem.selectedEmotions, emotionSystem.dynamicCustomerEmotions, emotionSystem.observedClues, emotionSystem.surfaceEmotions, aiConfig, cocktailFlow.guessAttempts, unlockedItems, atmosphere, tutorial, addToast, playSFX, showGameHint, chapterSystem, syncGuessReadiness]);

  // ==================== 调酒 ====================


  return {
    startConversation,
    handleSendMessage,
    handleConfirmGuess
  };
};
