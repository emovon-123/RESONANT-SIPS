import React, { useState, useRef, useEffect, useCallback } from 'react';
import { EMOTIONS } from '../../data/emotions.js';
import { callAIForCocktailJudgment } from '../../utils/aiService.js';
import { interpretCocktailAttitude } from '../../utils/cocktailAttitude.js';
import { getRelevantMemoryContext } from '../../utils/memoryContext.js';
import './DevPanel.css';

// 获取情绪的中文名称
const getEmotionName = (emotionId) => {
  if (EMOTIONS[emotionId]) {
    return `${EMOTIONS[emotionId].icon} ${EMOTIONS[emotionId].name}`;
  }
  return emotionId;
};

/**
 * 开发者调试面板
 * 提供金币调整、解锁物品、信任度控制等调试功能
 */
const DevPanel = ({
  // 全局状态
  money,
  setMoney,
  unlockedItems,
  setUnlockedItems,
  // 游戏状态（仅在游戏页面可用）
  trustLevel,
  setTrustLevel,
  currentDay,
  setCurrentDay,
  customerRealEmotions,
  customerSuccessCount,
  setCustomerSuccessCount,
  onSkipCustomer,
  // 面板控制
  isVisible,
  onClose,
  // 调试操作
  devActions,
  // 自动测试
  onAutoTest,
  autoTestRunning,
  guessedCorrectly,
  emotionGuessMode,
  // 🆕 游戏内调试上下文（可选）
  devGame
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [customMoney, setCustomMoney] = useState('');
  const [showEmotions, setShowEmotions] = useState(false);
  const [lockTrust, setLockTrust] = useState(false);
  const [storageInfo, setStorageInfo] = useState({ usedKB: '0' });
  const [returnCustomers, setReturnCustomers] = useState([]);
  const [selectedReturnId, setSelectedReturnId] = useState('');
  const [memoryPreview, setMemoryPreview] = useState('');
  const [abResult, setAbResult] = useState(null);
  const [abRunning, setAbRunning] = useState(false);
  const panelRef = useRef(null);

  // 获取存储使用情况
  useEffect(() => {
    if (isVisible && devActions?.getStorageUsage) {
      const info = devActions.getStorageUsage();
      if (info) setStorageInfo(info);
    }
  }, [isVisible, devActions]);

  // 回头客池刷新
  useEffect(() => {
    if (!isVisible) return;
    if (devActions?.getReturnCustomers) {
      const pool = devActions.getReturnCustomers() || [];
      setReturnCustomers(pool);
      if (!selectedReturnId && pool.length > 0) {
        setSelectedReturnId(pool[0].id);
      }
    }
  }, [isVisible, devActions, selectedReturnId]);

  // 拖拽处理
  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('.dev-panel-header')) {
      setIsDragging(true);
      const rect = panelRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      setPosition({
        x: window.innerWidth - e.clientX - (panelRef.current?.offsetWidth || 300) + dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  }, [isDragging, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // 金币操作
  const handleAddMoney = (amount) => {
    setMoney(prev => prev + amount);
  };

  const handleSetMoney = () => {
    const amount = parseInt(customMoney, 10);
    if (!isNaN(amount) && amount >= 0) {
      setMoney(amount);
      setCustomMoney('');
    }
  };

  // 解锁操作
  const handleUnlockAll = () => {
    if (devActions?.unlockAllItems) {
      const allUnlocked = devActions.unlockAllItems();
      setUnlockedItems(allUnlocked);
    }
  };

  const handleUnlockCategory = (category) => {
    if (devActions?.unlockCategory) {
      const updated = devActions.unlockCategory(unlockedItems, category);
      setUnlockedItems(updated);
    }
  };

  const handleDiscoverAllCombos = () => {
    if (devActions?.discoverAllCombos) {
      devActions.discoverAllCombos();
    }
  };

  // 信任度操作
  const handleSetTrust = (value) => {
    if (setTrustLevel) {
      setTrustLevel(value);
    }
  };

  // 游戏控制
  const handleCompleteCustomer = () => {
    if (setCustomerSuccessCount) {
      setCustomerSuccessCount(3);
    }
  };

  const handleSkipCustomer = () => {
    if (onSkipCustomer) {
      onSkipCustomer();
    }
  };

  const handleSetDay = (day) => {
    if (setCurrentDay && day >= 1) {
      setCurrentDay(day);
    }
  };

  // 数据操作
  const handleExportData = () => {
    if (devActions?.exportGameData) {
      const data = devActions.exportGameData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bartender_save_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleResetGame = () => {
    if (window.confirm('确定要重置所有游戏数据吗？此操作不可撤销！')) {
      if (devActions?.clearAllCache) {
        devActions.clearAllCache();
        window.location.reload();
      }
    }
  };

  // 🆕 重置所有（包括教学、序幕、规则等全部 localStorage）
  const handleResetEverything = () => {
    if (window.confirm('⚠️ 这将清除所有数据，包括教学进度、序幕、游戏存档等。\n确定要完全重置吗？')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  // ==================== AI质量测试台 ====================

  const refreshReturnCustomers = useCallback(() => {
    if (devActions?.getReturnCustomers) {
      const pool = devActions.getReturnCustomers() || [];
      setReturnCustomers(pool);
      if (pool.length > 0 && !pool.some(c => c.id === selectedReturnId)) {
        setSelectedReturnId(pool[0].id);
      }
    }
  }, [devActions, selectedReturnId]);

  const handleCreateTestReturnCustomer = useCallback(() => {
    if (!devActions?.createTestReturnCustomer) return;
    devActions.createTestReturnCustomer();
    refreshReturnCustomers();
  }, [devActions, refreshReturnCustomers]);

  const handleScheduleSelectedReturnTomorrow = useCallback(() => {
    if (!devActions?.scheduleReturnCustomerOnDay) return;
    if (!selectedReturnId || !currentDay) return;
    devActions.scheduleReturnCustomerOnDay(selectedReturnId, Number(currentDay) + 1);
    refreshReturnCustomers();
  }, [devActions, selectedReturnId, currentDay, refreshReturnCustomers]);

  const handleInsertSelectedReturnNext = useCallback(async () => {
    if (!devGame?.insertReturnCustomerNext) return;
    if (!selectedReturnId) return;
    await devGame.insertReturnCustomerNext(selectedReturnId);
  }, [devGame, selectedReturnId]);

  const handleLockReturnCustomerDailyFirst = useCallback(() => {
    if (!selectedReturnId) return;
    localStorage.setItem('bartender_dev_forced_return_customer_id', selectedReturnId);
  }, [selectedReturnId]);

  const handleClearLockReturnCustomer = useCallback(() => {
    localStorage.removeItem('bartender_dev_forced_return_customer_id');
  }, []);

  const handleJumpToChapter = useCallback((targetChapterId) => {
    if (!devGame?.jumpToChapter) return;
    devGame.jumpToChapter(targetChapterId);
  }, [devGame]);

  const handlePrepareChapterGate = useCallback(async (targetChapterId) => {
    if (!devActions?.prepareChapterGate) return;
    devActions.prepareChapterGate(targetChapterId);
    refreshReturnCustomers();
    if (devGame?.runChapterCheck) {
      await devGame.runChapterCheck();
    }
  }, [devActions, devGame, refreshReturnCustomers]);

  const handleRunChapterCheck = useCallback(async () => {
    if (devGame?.runChapterCheck) {
      await devGame.runChapterCheck();
    }
  }, [devGame]);

  const handleUpdateMemoryPreview = useCallback(() => {
    if (!devGame?.aiConfig) return;
    const ctx = getRelevantMemoryContext(devGame.aiConfig);
    setMemoryPreview(ctx || '（当前没有可注入的共享记忆/世界状态）');
  }, [devGame]);

  const handleRunABFeedback = useCallback(async () => {
    if (!devGame?.aiConfig) return;
    if (!devGame?.emotionState) return;
    if (!Array.isArray(devGame?.dialogueHistory)) return;

    setAbRunning(true);
    setAbResult(null);

    const mixtureA = { thickness: 3, sweetness: -2, strength: 4 };
    const mixtureB = { thickness: -2, sweetness: 3, strength: 0 };
    const attitudeA = interpretCocktailAttitude(mixtureA, false);
    const attitudeB = interpretCocktailAttitude(mixtureB, false);

    const baseParams = {
      aiConfig: devGame.aiConfig,
      trustLevel: trustLevel || 0.5,
      emotionState: devGame.emotionState,
      dialogueHistory: devGame.dialogueHistory,
      isSuccess: true,
      satisfaction: 0.8
    };

    try {
      const [resA, resB] = await Promise.all([
        callAIForCocktailJudgment({
          ...baseParams,
          cocktailRecipe: { mixture: mixtureA, glass: 'martini', ice: 'no_ice', ingredients: [] },
          cocktailAttitude: attitudeA
        }),
        callAIForCocktailJudgment({
          ...baseParams,
          cocktailRecipe: { mixture: mixtureB, glass: 'martini', ice: 'no_ice', ingredients: [] },
          cocktailAttitude: attitudeB
        })
      ]);

      setAbResult({
        A: { mixture: mixtureA, attitude: attitudeA, result: resA },
        B: { mixture: mixtureB, attitude: attitudeB, result: resB }
      });
    } catch (e) {
      setAbResult({ error: String(e?.message || e) });
    } finally {
      setAbRunning(false);
    }
  }, [devGame, trustLevel]);

  if (!isVisible) return null;

  return (
    <div
      ref={panelRef}
      className={`dev-panel ${isMinimized ? 'minimized' : ''}`}
      style={{ right: position.x, top: position.y }}
      onMouseDown={handleMouseDown}
    >
      <div className="dev-panel-header">
        <span className="dev-panel-title">🔧 开发者工具</span>
        <div className="dev-panel-controls">
          <button
            className="dev-panel-btn minimize"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? '展开' : '最小化'}
          >
            {isMinimized ? '▢' : '—'}
          </button>
          <button
            className="dev-panel-btn close"
            onClick={onClose}
            title="关闭"
          >
            ×
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="dev-panel-content">
          {/* 金币部分 */}
          <div className="dev-section">
            <div className="dev-section-header">
              <span>💰 金币: <strong>{money}</strong></span>
            </div>
            <div className="dev-section-body">
              <div className="dev-btn-group">
                <button onClick={() => handleAddMoney(100)}>+100</button>
                <button onClick={() => handleAddMoney(500)}>+500</button>
                <button onClick={() => handleAddMoney(1000)}>+1000</button>
                <button onClick={() => setMoney(99999)} className="gold">99999</button>
              </div>
              <div className="dev-input-group">
                <input
                  type="number"
                  value={customMoney}
                  onChange={(e) => setCustomMoney(e.target.value)}
                  placeholder="自定义金额"
                  min="0"
                />
                <button onClick={handleSetMoney}>设置</button>
              </div>
            </div>
          </div>

          {/* 解锁部分 */}
          <div className="dev-section">
            <div className="dev-section-header">
              <span>🔓 解锁物品</span>
            </div>
            <div className="dev-section-body">
              <div className="dev-btn-group">
                <button onClick={() => handleUnlockCategory('glasses')}>全部杯型</button>
                <button onClick={() => handleUnlockCategory('iceTypes')}>全部冰块</button>
              </div>
              <div className="dev-btn-group">
                <button onClick={() => handleUnlockCategory('garnishes')}>全部配料</button>
                <button onClick={() => handleUnlockCategory('decorations')}>全部装饰</button>
              </div>
              <div className="dev-btn-group">
                <button onClick={() => handleUnlockCategory('ingredients')}>全部原浆</button>
                <button onClick={handleDiscoverAllCombos}>全部组合</button>
              </div>
              <div className="dev-btn-group">
                <button onClick={handleUnlockAll} className="primary">一键全解锁</button>
              </div>
            </div>
          </div>

          {/* 信任度部分（仅在游戏页面显示） */}
          {setTrustLevel && (
            <div className="dev-section">
              <div className="dev-section-header">
                <span>💖 信任度: <strong>{Math.round((trustLevel || 0) * 100)}%</strong></span>
              </div>
              <div className="dev-section-body">
                <div className="dev-btn-group">
                  <button onClick={() => handleSetTrust(0)}>0%</button>
                  <button onClick={() => handleSetTrust(0.3)}>30%</button>
                  <button onClick={() => handleSetTrust(0.5)}>50%</button>
                  <button onClick={() => handleSetTrust(0.7)}>70%</button>
                  <button onClick={() => handleSetTrust(1)}>100%</button>
                </div>
                <label className="dev-checkbox">
                  <input
                    type="checkbox"
                    checked={lockTrust}
                    onChange={(e) => setLockTrust(e.target.checked)}
                  />
                  <span>锁定信任度（暂不支持）</span>
                </label>
              </div>
            </div>
          )}

          {/* 情绪透视（仅在游戏页面显示） */}
          {customerRealEmotions && customerRealEmotions.length > 0 && (
            <div className="dev-section">
              <div className="dev-section-header">
                <span>👁️ 情绪透视</span>
              </div>
              <div className="dev-section-body">
                <button
                  onClick={() => setShowEmotions(!showEmotions)}
                  className={showEmotions ? 'active' : ''}
                >
                  {showEmotions ? '隐藏 Top3 情绪' : '显示 Top3 情绪'}
                </button>
                {showEmotions && (
                  <div className="dev-emotions-reveal">
                    <span>Top3 情绪: </span>
                    {customerRealEmotions.map((emotion, idx) => (
                      <span key={idx} className="dev-emotion-tag">
                        {getEmotionName(emotion)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 🤖 自动测试（仅在游戏页面显示） */}
          {onAutoTest && (
            <div className="dev-section">
              <div className="dev-section-header">
                <span>🤖 自动测试</span>
                {autoTestRunning && <span className="dev-running-badge">运行中</span>}
              </div>
              <div className="dev-section-body">
                <div className="dev-auto-status">
                  <span>状态: {
                    autoTestRunning ? '⚡ 自动运行中...' :
                    guessedCorrectly ? '🍸 调酒模式' :
                    emotionGuessMode ? '🎯 猜测模式' :
                    '💬 对话模式'
                  }</span>
                </div>
                <div className="dev-btn-group">
                  <button
                    onClick={() => onAutoTest(false)}
                    className={autoTestRunning ? 'danger' : 'primary'}
                  >
                    {autoTestRunning ? '⏹ 停止' : '▶ 单次测试'}
                  </button>
                  <button
                    onClick={() => onAutoTest(true)}
                    className={autoTestRunning ? 'danger' : 'gold'}
                  >
                    {autoTestRunning ? '⏹ 停止' : '🔄 循环测试'}
                  </button>
                </div>
                <div className="dev-info">
                  <span>自动猜对情绪 → 调酒 → 递酒</span>
                </div>
              </div>
            </div>
          )}

          {/* 游戏控制（仅在游戏页面显示） */}
          {setCurrentDay && (
            <div className="dev-section">
              <div className="dev-section-header">
                <span>🎮 游戏控制</span>
              </div>
              <div className="dev-section-body">
                <div className="dev-btn-group">
                  <button onClick={handleSkipCustomer}>跳过顾客</button>
                  <button onClick={handleCompleteCustomer}>完成3杯任务</button>
                </div>
                <div className="dev-day-control">
                  <span>Day: {currentDay}</span>
                  <button onClick={() => handleSetDay(currentDay - 1)} disabled={currentDay <= 1}>-1</button>
                  <button onClick={() => handleSetDay(currentDay + 1)}>+1</button>
                </div>
                {customerSuccessCount !== undefined && (
                  <div className="dev-info">
                    <span>当前顾客进度: {customerSuccessCount}/3</span>
                  </div>
                )}

                {/* 直接跳转章节 */}
                {devGame?.jumpToChapter && (
                  <>
                    <div className="dev-section-subtitle">直接跳转章节</div>
                    <div className="dev-btn-group">
                      {[1, 2, 3, 4, 5].map(ch => (
                        <button
                          key={ch}
                          onClick={() => handleJumpToChapter(ch)}
                          className={devGame?.chapterId === ch ? 'active' : ''}
                          title={`跳转到第${ch}章`}
                        >
                          第{ch}章
                        </button>
                      ))}
                    </div>
                    <div className="dev-info">
                      <span>直接跳转章节，无需走门槛条件。当前: 第{devGame?.chapterId || '?'}章</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* 🧪 AI质量测试台（仅在游戏页面显示） */}
          {devGame && (
            <div className="dev-section">
              <div className="dev-section-header">
                <span>🧪 AI质量测试台</span>
              </div>
              <div className="dev-section-body">
                <div className="dev-info">
                  <span>
                    章节: {devGame.chapterId ?? '-'} · 判定模式: <strong>{devGame.mixingMode ?? '-'}</strong>
                  </span>
                </div>

                <div className="dev-btn-group">
                  <button onClick={() => handlePrepareChapterGate(2)}>准备 1→2</button>
                  <button onClick={() => handlePrepareChapterGate(3)}>准备 2→3</button>
                  <button onClick={() => handlePrepareChapterGate(4)}>准备 3→4</button>
                  <button onClick={() => handlePrepareChapterGate(5)}>准备 4→5</button>
                </div>
                <div className="dev-btn-group">
                  <button onClick={handleRunChapterCheck} className="gold">运行章节检查</button>
                </div>
                <div className="dev-info">
                  <span>提示：准备门槛后点击“运行章节检查”，即可立刻看到章节转场与 AI 开场白。</span>
                </div>

                <hr className="dev-divider" />

                <div className="dev-section-subtitle">回头客（连贯性 / 十字路口）</div>
                <div className="dev-input-group">
                  <select value={selectedReturnId} onChange={(e) => setSelectedReturnId(e.target.value)}>
                    {returnCustomers.length === 0 && <option value="">（暂无回头客）</option>}
                    {returnCustomers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} · {c.characterArc?.currentPhase || 'unknown'} · visits:{c.relationship?.totalVisits || 1}
                      </option>
                    ))}
                  </select>
                  <button onClick={handleCreateTestReturnCustomer}>+样例</button>
                </div>
                <div className="dev-btn-group">
                  <button onClick={handleScheduleSelectedReturnTomorrow} disabled={!selectedReturnId}>安排明天可来访</button>
                  <button onClick={handleInsertSelectedReturnNext} disabled={!selectedReturnId}>插入今日下一位</button>
                </div>
                <div className="dev-btn-group">
                  <button onClick={handleLockReturnCustomerDailyFirst} disabled={!selectedReturnId} className="primary">锁定为每日首位</button>
                  <button onClick={handleClearLockReturnCustomer} className="danger">取消锁定</button>
                </div>
                <div className="dev-info">
                  <span>锁定后，每天开始时会强制插入该回头客，便于连续跟完 3-5 次来访弧光。</span>
                </div>

                <hr className="dev-divider" />

                <div className="dev-section-subtitle">记忆注入预览</div>
                <div className="dev-btn-group">
                  <button onClick={handleUpdateMemoryPreview}>刷新预览</button>
                  {memoryPreview && (
                    <button onClick={() => navigator.clipboard?.writeText(memoryPreview)}>复制</button>
                  )}
                </div>
                {memoryPreview && (
                  <textarea className="dev-textarea" value={memoryPreview} readOnly rows={5} />
                )}

                <hr className="dev-divider" />

                <div className="dev-section-subtitle">A/B 调酒反馈对比（同一顾客，两杯极端态度）</div>
                <div className="dev-btn-group">
                  <button onClick={handleRunABFeedback} className={abRunning ? 'danger' : 'primary'} disabled={abRunning}>
                    {abRunning ? '运行中...' : '运行 A/B 对比'}
                  </button>
                </div>
                {abResult?.error && (
                  <div className="dev-info"><span>错误: {abResult.error}</span></div>
                )}
                {abResult && !abResult.error && (
                  <div className="dev-ab-grid">
                    <div className="dev-ab-col">
                      <div className="dev-ab-title">A：直面问题 + 承认苦涩</div>
                      <div className="dev-info"><span>态度：{abResult.A.attitude.summary}</span></div>
                      <div className="dev-ab-output">{abResult.A.result?.feedback || JSON.stringify(abResult.A.result)}</div>
                    </div>
                    <div className="dev-ab-col">
                      <div className="dev-ab-title">B：先休息 + 给予希望</div>
                      <div className="dev-info"><span>态度：{abResult.B.attitude.summary}</span></div>
                      <div className="dev-ab-output">{abResult.B.result?.feedback || JSON.stringify(abResult.B.result)}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 数据管理 */}
          <div className="dev-section">
            <div className="dev-section-header">
              <span>📦 数据管理</span>
            </div>
            <div className="dev-section-body">
              <div className="dev-btn-group">
                <button onClick={handleExportData}>导出存档</button>
                <button onClick={handleResetGame} className="danger">重置游戏</button>
              </div>
              <div className="dev-btn-group">
                <button onClick={handleResetEverything} className="danger">🗑️ 重置所有（含教学/序幕）</button>
              </div>
              <div className="dev-info">
                <span>存储使用: {storageInfo.usedKB} KB</span>
              </div>
            </div>
          </div>

          {/* 快捷键提示 */}
          <div className="dev-footer">
            <span>Ctrl+Shift+D 切换面板</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DevPanel;
