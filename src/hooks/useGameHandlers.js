/**
 * Game handler composition hook.
 */
import { useCallback, useRef } from 'react';
import { buildGuessReadinessStatus } from './gameHandlers/helpers.js';
import { useCustomerDayHandlers } from './gameHandlers/useCustomerDayHandlers.js';
import { useDialogueHandlers } from './gameHandlers/useDialogueHandlers.js';
import { useServeProgressHandlers } from './gameHandlers/useServeProgressHandlers.js';

export const useGameHandlers = (ctx) => {
  const consecutiveSilenceRef = useRef(0);
  const totalSilenceRef = useRef(0);

  const {
    chapterSystem,
    emotionSystem,
    dialogue,
    trustLevel,
    tutorial,
    cocktailFlow,
  } = ctx;

  const syncGuessReadiness = useCallback((override = {}) => {
    const mixingMode = chapterSystem?.currentChapter?.mixingMode || 'strict';
    const clueCount = typeof override.clueCount === 'number'
      ? override.clueCount
      : (emotionSystem.observedClues?.length || 0);
    const playerTurns = typeof override.playerTurns === 'number'
      ? override.playerTurns
      : (dialogue.dialogueHistory || []).filter((msg) => msg.role === 'player').length;
    const effectiveClueCount = Math.max(clueCount, Math.floor(playerTurns / 2));

    const status = buildGuessReadinessStatus({
      mixingMode,
      trustLevel,
      clueCount: effectiveClueCount,
      playerTurns,
      tutorialMode: tutorial.isTutorialMode
    });

    cocktailFlow.updateGuessReadiness(status);
    return status;
  }, [
    chapterSystem,
    emotionSystem.observedClues,
    dialogue.dialogueHistory,
    trustLevel,
    tutorial.isTutorialMode,
    cocktailFlow.updateGuessReadiness
  ]);

  const refs = {
    consecutiveSilenceRef,
    totalSilenceRef
  };

  const customerDayHandlers = useCustomerDayHandlers({ ctx, refs });
  const dialogueHandlers = useDialogueHandlers({ ctx, refs, syncGuessReadiness });
  const serveProgressHandlers = useServeProgressHandlers({ ctx });

  return {
    ...customerDayHandlers,
    ...dialogueHandlers,
    ...serveProgressHandlers
  };
};
