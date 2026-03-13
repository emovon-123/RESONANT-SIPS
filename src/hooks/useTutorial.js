// 新手教学流程管理 Hook
import { useState, useCallback, useRef } from 'react';
import { TUTORIAL_RESPONSES, isEmpatheticInput } from '../data/tutorialData.js';

/**
 * 教学流程管理 Hook
 * 管理对话→猜情绪→调酒三阶段的渐进式引导
 */
export const useTutorial = () => {
  // 是否教学模式
  const [isTutorialMode, setIsTutorialMode] = useState(
    () => !localStorage.getItem('bartender_tutorial_completed')
  );
  // 教学阶段: 'dialogue' | 'emotion' | 'cocktail' | 'completed'
  const [tutorialPhase, setTutorialPhase] = useState('dialogue');
  // 当前对话轮次 (0-3)，用 ref 保证读到最新值
  const dialogueRoundRef = useRef(0);
  const [dialogueRound, setDialogueRound] = useState(0);
  // 当前活跃的引导气泡ID
  const [activeTooltip, setActiveTooltip] = useState('dialogue_start');
  // 当前可交互的区域
  const [visibleAreas, setVisibleAreas] = useState(['chat']);
  // 猜情绪错误次数
  const guessErrorCountRef = useRef(0);
  const [guessErrorCount, setGuessErrorCount] = useState(0);
  // 调酒步骤追踪
  const [cocktailStep, setCocktailStep] = useState('glass');
  // 是否显示教学完成画面
  const [showTutorialComplete, setShowTutorialComplete] = useState(false);

  /**
   * 获取当前轮的固定回复
   * @param {string} playerInput - 玩家输入
   * @param {number} round - 对话轮次 (1-3)
   * @returns {string} 固定回复文本
   */
  const getTutorialResponse = useCallback((playerInput, round) => {
    const roundKey = `round${round}`;
    const responses = TUTORIAL_RESPONSES[roundKey];
    if (!responses) return '......';

    // 检查是否包含共情关键词
    if (isEmpatheticInput(playerInput)) {
      return responses.empathetic;
    }
    return responses.default;
  }, []);

  /**
   * 获取当前轮的快捷选项
   * @param {number} round - 对话轮次 (1-3)
   * @returns {string[]} 快捷选项列表
   */
  const getTutorialQuickOptions = useCallback((round) => {
    const roundKey = `round${round}`;
    return TUTORIAL_RESPONSES[roundKey]?.quickOptions || [];
  }, []);

  /**
   * 推进教学进度
   * @param {string} event - 事件类型
   */
  /**
   * 推进教学进度，返回更新后的轮次/计数
   */
  const advanceTutorial = useCallback((event) => {
    switch (event) {
      case 'dialogue_sent': {
        const newRound = dialogueRoundRef.current + 1;
        dialogueRoundRef.current = newRound;
        setDialogueRound(newRound);

        if (newRound === 2) {
          // 第2轮后显示信任度提示
          setActiveTooltip('trust_rising');
        } else if (newRound >= 3) {
          // 第3轮结束，过渡到猜情绪阶段
          setTimeout(() => {
            setActiveTooltip('transition_to_emotion');
            // 延迟后解锁情绪面板
            setTimeout(() => {
              setTutorialPhase('emotion');
              setVisibleAreas(['chat', 'emotion']);
              setActiveTooltip('emotion_guide');
            }, 3000);
          }, 1500);
        } else {
          setActiveTooltip(null);
        }
        return newRound;
      }

      case 'emotion_guess_start':
        setActiveTooltip('emotion_confirm');
        break;

      case 'emotion_guess_wrong': {
        guessErrorCountRef.current += 1;
        const newCount = guessErrorCountRef.current;
        setGuessErrorCount(newCount);
        if (newCount >= 3) {
          // 第3次错误，自动提示答案
          setActiveTooltip('emotion_correct');
        } else {
          setActiveTooltip('emotion_wrong');
        }
        break;
      }

      case 'emotion_guessed':
        // 猜对了，过渡到调酒阶段
        setActiveTooltip('emotion_correct');
        setTimeout(() => {
          setTutorialPhase('cocktail');
          setVisibleAreas(['chat', 'emotion', 'bartender']);
          setActiveTooltip('target_guide');
          setCocktailStep('glass');
        }, 2000);
        break;

      case 'cocktail_step_glass':
        setCocktailStep('ice');
        setActiveTooltip('step_ice');
        break;

      case 'cocktail_step_ice':
        setCocktailStep('ingredients');
        setActiveTooltip('step_ingredients');
        break;

      case 'cocktail_step_ingredients':
        setCocktailStep('extras');
        setActiveTooltip('step_extras');
        break;

      case 'cocktail_step_extras':
        setCocktailStep('serve');
        setActiveTooltip('step_serve');
        break;

      case 'cocktail_failed':
        // 失败后仍然停留在调酒阶段
        setActiveTooltip('step_serve');
        break;

      case 'cocktail_served':
        // 调酒成功，显示教学完成画面
        setTutorialPhase('completed');
        setActiveTooltip(null);
        setShowTutorialComplete(true);
        break;

      default:
        break;
    }
  }, []);  // 不再依赖 state，全部通过 ref 读取最新值

  /**
   * 完成教学
   */
  const completeTutorial = useCallback(() => {
    localStorage.setItem('bartender_tutorial_completed', 'true');
    setIsTutorialMode(false);
    setTutorialPhase('completed');
    setShowTutorialComplete(false);
  }, []);

  /**
   * 关闭当前引导气泡
   */
  const dismissTooltip = useCallback(() => {
    setActiveTooltip(null);
  }, []);

  /**
   * 是否应该自动提示猜情绪答案（错误3次后）
   */
  const shouldAutoRevealAnswer = guessErrorCount >= 3;

  return {
    // 状态
    isTutorialMode,
    tutorialPhase,
    dialogueRound,
    activeTooltip,
    visibleAreas,
    guessErrorCount,
    cocktailStep,
    showTutorialComplete,
    shouldAutoRevealAnswer,

    // 方法
    advanceTutorial,
    getTutorialResponse,
    getTutorialQuickOptions,
    completeTutorial,
    dismissTooltip
  };
};

export default useTutorial;
