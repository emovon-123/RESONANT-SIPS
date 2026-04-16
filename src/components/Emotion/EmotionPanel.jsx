import React, { useState } from 'react';
import { EMOTIONS } from '../../data/emotions.js';
import './EmotionPanel.css';

/**
 * 情绪识别面板组件
 * 功能：显示情绪候选、记录可观察线索、展示提示辅助玩家推断真实情绪
 */
const EmotionPanel = ({ 
  surfaceEmotions = [],  // 可观察情绪 [{id}]
  realEmotions = [],     // 真实情绪（不再自动填充，保持空）
  emotionHints = [],     // 情绪模糊提示 [{emotionId, hint, level}]
  onEmotionSelect,       // 手动标记情绪回调
  selectedEmotions = [], // 已选择用于调酒的情绪
  unlockedEmotions = [], // 已解锁的情绪
  dialogueClues = [],
  guessMode = false,     // 是否处于猜测模式
  guessedCorrectly = false, // 是否已猜对
  onStartGuess,          // 开始猜测回调
  onCancelGuess,         // 取消猜测回调
  onConfirmGuess         // 确认猜测回调
}) => {
  const [activeTab, setActiveTab] = useState('all'); // all | surface | hints
  const [hoveredEmotion, setHoveredEmotion] = useState(null);
  
  // 检查情绪是否已解锁
  const isEmotionUnlocked = (emotionId) => {
    return unlockedEmotions.includes(emotionId);
  };

  // 获取情绪状态
  const getEmotionStatus = (emotionId) => {
    const isSurface = surfaceEmotions.some(e => e.id === emotionId);
    const isReal = realEmotions.some(e => e.id === emotionId);
    const isSelected = selectedEmotions.includes(emotionId);
    
    return { isSurface, isReal, isSelected };
  };

  // 点击情绪卡片
  const handleEmotionClick = (emotionId) => {
    // 只在猜测模式下才能选择情绪
    if (guessMode && isEmotionUnlocked(emotionId)) {
      onEmotionSelect && onEmotionSelect(emotionId);
    }
  };

  // 渲染情绪卡片
  const renderEmotionCard = (emotion) => {
    const status = getEmotionStatus(emotion.id);
    const isActive = status.isSurface || status.isReal;
    const isUnlocked = isEmotionUnlocked(emotion.id);
    
    // 根据tab过滤（hints tab 不显示卡片，显示提示区域）
    if (activeTab === 'hints') return null;
    if (activeTab === 'surface' && !status.isSurface) return null;

    // 未解锁的情绪不显示
    if (!isUnlocked) return null;

    // 在猜测模式下，显示所有已解锁的情绪，但样式更明显
    const canSelect = isUnlocked && guessMode; // 只在猜测模式下才能选择

    return (
      <div
        key={emotion.id}
        className={`emotion-card ${isActive ? 'active' : ''} ${status.isSelected ? 'selected' : ''} ${canSelect ? 'unlocked-clickable' : ''} ${guessMode ? 'guess-mode' : ''}`}
        onClick={() => handleEmotionClick(emotion.id)}
        onMouseEnter={() => setHoveredEmotion(emotion.id)}
        onMouseLeave={() => setHoveredEmotion(null)}
        style={{
          borderColor: isActive ? emotion.color : (status.isSelected ? emotion.color : 'rgba(255, 255, 255, 0.2)'),
          opacity: isActive ? 1 : (isUnlocked ? 0.7 : 0.4),
          cursor: canSelect ? 'pointer' : 'default',
          boxShadow: guessMode && status.isSelected ? `0 0 15px ${emotion.color}` : 'none'
        }}
      >
        <div className="emotion-icon" style={{ fontSize: isActive ? '32px' : '24px' }}>
          {emotion.icon}
        </div>
        <div className="emotion-name">{emotion.name}</div>
        
        {/* 猜测模式提示 */}
        {guessMode && isUnlocked && (
          <div className="guess-mode-hint">
            {status.isSelected ? '已选择' : '点击猜测'}
          </div>
        )}
        
        {/* 可观察情绪指示 */}
        {status.isSurface && (
          <div className="emotion-indicator surface" style={{ backgroundColor: `${emotion.color}40` }}>
            <span className="indicator-label">观察</span>
          </div>
        )}
        
        {/* 真实情绪指示 */}
        {status.isReal && (
          <div className="emotion-indicator real" style={{ backgroundColor: `${emotion.color}80` }}>
            <span className="indicator-label">真实</span>
          </div>
        )}
        
        {/* 选中标记 */}
        {status.isSelected && (
          <div className="selected-badge">✓</div>
        )}
      </div>
    );
  };

  return (
    <div className="emotion-panel">
      <div className="emotion-header">
        <h3>情绪识别面板</h3>
        <div className="emotion-tabs">
          <button 
            className={activeTab === 'all' ? 'active' : ''} 
            onClick={() => setActiveTab('all')}
          >
            全部
          </button>
          <button 
            className={activeTab === 'surface' ? 'active' : ''} 
            onClick={() => setActiveTab('surface')}
          >
            已观察情绪 ({surfaceEmotions.length})
          </button>
          <button 
            className={activeTab === 'hints' ? 'active' : ''} 
            onClick={() => setActiveTab('hints')}
          >
            情绪线索 {emotionHints.length > 0 ? `(${emotionHints.length})` : '(?)'}
          </button>
        </div>
      </div>

      {/* 猜测模式横幅 */}
      {guessMode && (
        <div className="guess-mode-banner">
          🎯 <strong>猜测模式</strong> - 选择你认为的顾客真实情绪（已选 {selectedEmotions.length} 个）
        </div>
      )}

      {/* 已猜对横幅 */}
      {guessedCorrectly && (
        <div className="guessed-correctly-banner">
          ✅ <strong>已识别情绪</strong> - 现在可以开始调酒了！
        </div>
      )}

      {/* 情绪线索区域 - 显示模糊提示 */}
      {activeTab === 'hints' && (
        <div className="emotion-hints-section">
          <div className="hints-header">
            <span className="hints-icon">🔍</span>
            <span className="hints-title">顾客真实情绪线索</span>
          </div>
          {emotionHints.length > 0 ? (
            <div className="hints-list">
              {emotionHints.map((hintData, index) => (
                <div 
                  key={index} 
                  className={`hint-card hint-level-${hintData.level}`}
                >
                  <div className="hint-text">{hintData.hint}</div>
                  <div className="hint-level-badge">
                    {hintData.level === 'high' ? '💎 清晰' : 
                     hintData.level === 'medium' ? '✨ 模糊' : '🌫️ 隐约'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-hints">
              <div className="no-hints-icon">🤔</div>
              <p>暂未观察到稳定线索...</p>
              <p className="no-hints-tip">继续对话，留意反复出现的表达。</p>
            </div>
          )}
        </div>
      )}

      {dialogueClues.length > 0 && (
        <div className="dialogue-clues-section">
          <div className="dialogue-clues-header">🧩 对话观察记录（{dialogueClues.length}）</div>
          <div className="dialogue-clues-list">
            {dialogueClues.slice(-4).reverse().map((clue) => (
              <div className="dialogue-clue-item" key={clue.id || `${clue.type}-${clue.label}`}>
                <div className="dialogue-clue-label">{clue.label}</div>
                {clue.snippet && <div className="dialogue-clue-snippet">“{clue.snippet}”</div>}
                {(clue.count || 1) > 1 && <div className="dialogue-clue-count">出现 {clue.count} 次</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab !== 'hints' && (
        <div className="emotion-legend">
          <div className="legend-item">
            <div className="legend-color surface"></div>
            <span>已观察到的情绪线索</span>
          </div>
          <div className="legend-item">
            <div className="legend-color hint"></div>
            <span>根据线索推断真实情绪</span>
          </div>
        </div>
      )}

      <div className="emotion-grid">
        {Object.values(EMOTIONS).map(emotion => renderEmotionCard(emotion))}
      </div>

      {/* 只在猜测模式下显示已选择情绪 */}
      {guessMode && selectedEmotions.length > 0 && (
        <div className="selected-emotions">
          <h4>已选择情绪（{selectedEmotions.length}/3）</h4>
          <div className="selected-list">
            {selectedEmotions.map(emotionId => {
              const emotion = EMOTIONS[emotionId];
              return (
                <div key={emotionId} className="selected-item" style={{ color: emotion.color }}>
                  {emotion.icon} {emotion.name}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 调酒提示 */}
      <div className="cocktail-hint">
        💡 根据「情绪线索」推断顾客的<strong>真实情绪</strong>，选对才能调酒成功！
      </div>

      {/* 情绪猜测控制区 */}
      <div className="emotion-guess-controls-inner">
        {!guessedCorrectly ? (
          guessMode ? (
            <div className="guess-actions">
              <p className="guess-prompt">选择你认为的顾客真实情绪（必须选 3 个）</p>
              <div className="guess-buttons">
                <button 
                  className="guess-btn cancel"
                  onClick={onCancelGuess}
                >
                  取消
                </button>
                <button 
                  className="guess-btn confirm"
                  onClick={onConfirmGuess}
                  disabled={selectedEmotions.length < 3}
                >
                  确认猜测 ({selectedEmotions.length})
                </button>
              </div>
            </div>
          ) : (
            <button 
              className="start-guess-btn"
              onClick={onStartGuess}
            >
              🎯 猜测真实情绪
            </button>
          )
        ) : (
          <div className="guess-success">
            ✅ 已识别情绪，开始调酒吧！
          </div>
        )}
      </div>

      {/* 悬停提示 */}
      {hoveredEmotion && isEmotionUnlocked(hoveredEmotion) && (
        <div className="emotion-tooltip">
          <p>{EMOTIONS[hoveredEmotion].name}</p>
          <p className="tooltip-hint">
            {guessMode ? '点击选择猜测此情绪' : (guessedCorrectly ? '已识别情绪，正在调酒中' : '开始猜测模式后可选择')}
          </p>
          {getEmotionStatus(hoveredEmotion).isSurface && <p className="tooltip-tag surface-tag">⚠️ 已观察线索，不代表全部信息</p>}
        </div>
      )}
      
    </div>
  );
};

export default EmotionPanel;
