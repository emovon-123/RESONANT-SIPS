const GUESS_REQUIREMENTS = {
  strict: { trust: 0.3, clues: 2, turns: 2 },
  transitional: { trust: 0.28, clues: 1, turns: 2 },
  expressive: { trust: 0.25, clues: 1, turns: 1 },
  master: { trust: 0.25, clues: 1, turns: 1 }
};

const ATTR_LABELS = {
  thickness: '稠度',
  sweetness: '甜度',
  strength: '烈度'
};

const ATTR_ADJUST_HINTS = {
  thickness: { higher: '更厚重一些', lower: '更轻盈一些' },
  sweetness: { higher: '更甜一点', lower: '更干一点' },
  strength: { higher: '更烈一点', lower: '更柔和一点' }
};

export const buildGuessReadinessStatus = ({ mixingMode = 'strict', trustLevel = 0, clueCount = 0, playerTurns = 0, tutorialMode = false }) => {
  if (tutorialMode) {
    return {
      canGuess: true,
      trustReady: true,
      clueReady: true,
      turnsReady: true,
      trustLevel,
      clueCount,
      playerTurns,
      requiredTrust: 0,
      requiredClues: 0,
      requiredTurns: 0,
      reason: '教学模式可直接猜测。'
    };
  }

  const requirement = GUESS_REQUIREMENTS[mixingMode] || GUESS_REQUIREMENTS.strict;
  const trustReady = trustLevel >= requirement.trust;
  const clueReady = clueCount >= requirement.clues;
  const turnsReady = playerTurns >= requirement.turns;
  const canGuess = trustReady && clueReady && turnsReady;

  let reason = '继续观察顾客的表达，再尝试猜测。';
  if (!trustReady) {
    reason = `信任度至少达到 ${Math.round(requirement.trust * 100)}%`;
  } else if (!turnsReady) {
    reason = `再交流 ${requirement.turns - playerTurns} 轮，先看说话方式`;
  } else if (!clueReady) {
    reason = `至少再捕捉 ${requirement.clues - clueCount} 条线索`;
  } else {
    reason = '顾客开始露出破绽，可以尝试猜测。';
  }

  return {
    canGuess,
    trustReady,
    clueReady,
    turnsReady,
    trustLevel,
    clueCount,
    playerTurns,
    requiredTrust: requirement.trust,
    requiredClues: requirement.clues,
    requiredTurns: requirement.turns,
    reason
  };
};

export const buildStrictJudgmentExplanation = (targetCheck) => {
  const results = Array.isArray(targetCheck?.results) ? targetCheck.results : [];
  if (results.length === 0) {
    return {
      summary: '本次没有可复盘的目标维度。',
      shortHint: '请先完成情绪猜测再调酒。',
      details: []
    };
  }

  const unmet = results.filter(item => !item.met);
  if (unmet.length === 0) {
    const labels = results.map(item => ATTR_LABELS[item.attr] || item.attr).join('、');
    return {
      summary: `三维目标全部命中（${labels}）。`,
      shortHint: '三维目标全部命中。',
      details: []
    };
  }

  const details = unmet.map((item) => {
    const attr = item.attr;
    const label = ATTR_LABELS[attr] || attr;
    const currentValue = Number(item.currentValue || 0);
    const targetValue = Number(item.value || 0);

    const needHigher = currentValue < targetValue;

    const hints = ATTR_ADJUST_HINTS[attr] || { higher: '提高一点', lower: '降低一点' };
    const action = (() => {
      if (item.op === '<=' || item.op === '<') {
        return currentValue > targetValue ? hints.lower : hints.higher;
      }
      if (item.op === '=') {
        return currentValue < targetValue ? hints.higher : hints.lower;
      }
      return needHigher ? hints.higher : hints.lower;
    })();

    return `${label}未达标（目标 ${item.op}${targetValue.toFixed(1)}，当前 ${currentValue.toFixed(1)}），建议${action}`;
  });

  return {
    summary: `命中 ${targetCheck?.metCount || 0}/${targetCheck?.totalConditions || results.length} 个目标。`,
    shortHint: details.slice(0, 2).join('；'),
    details
  };
};

