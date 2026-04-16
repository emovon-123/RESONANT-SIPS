import React from 'react';
import { EMOTIONS } from '../../data/emotions.js';
import './EmotionPanel.css';

/**
 * 情绪识别面板组件（基础模式）
 * 功能：仅保留基础猜情绪流程
 */
const EmotionPanel = ({ 
  surfaceEmotions = [],
  realEmotions = [],
  emotionHints = [],
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

  // 检查情绪是否已解锁
  const isEmotionUnlocked = (emotionId) => {
    return unlockedEmotions.includes(emotionId);
  };

  // 获取情绪状态
  const getEmotionStatus = (emotionId) => {
    const isSelected = selectedEmotions.includes(emotionId);

    return { isSelected };
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
    const isUnlocked = isEmotionUnlocked(emotion.id);

    // 未解锁的情绪不显示
    if (!isUnlocked) return null;

    // 在猜测模式下，显示所有已解锁的情绪，但样式更明显
    const canSelect = isUnlocked && guessMode; // 只在猜测模式下才能选择

    return (
      <div
        key={emotion.id}
        className={`emotion-card ${status.isSelected ? 'selected' : ''} ${canSelect ? 'unlocked-clickable' : ''} ${guessMode ? 'guess-mode' : ''}`}
        onClick={() => handleEmotionClick(emotion.id)}
        style={{
          borderColor: status.isSelected ? emotion.color : 'rgba(255, 255, 255, 0.2)',
          opacity: isUnlocked ? 0.85 : 0.4,
          cursor: canSelect ? 'pointer' : 'default',
          boxShadow: guessMode && status.isSelected ? `0 0 15px ${emotion.color}` : 'none'
        }}
      >
        <div className="emotion-icon" style={{ fontSize: status.isSelected ? '32px' : '24px' }}>
          {emotion.icon}
        </div>
        <div className="emotion-name">{emotion.name}</div>
        
        {/* 猜测模式提示 */}
        {guessMode && isUnlocked && (
          <div className="guess-mode-hint">
            {status.isSelected ? '已选择' : '点击猜测'}
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


    </div>
  );
};

export default EmotionPanel;
