import React from 'react';
import { EMOTIONS } from '../../data/emotions.js';
import './EmotionPanel.css';

const EmotionPanel = ({
  onEmotionSelect,
  selectedEmotions = [],
  unlockedEmotions = [],
  guessMode = false,
  guessedCorrectly = false,
  onStartGuess,
  onCancelGuess,
  onConfirmGuess,
  showGuessControls = true
}) => {
  const isEmotionUnlocked = (emotionId) => unlockedEmotions.includes(emotionId);

  const handleEmotionClick = (emotionId) => {
    if (guessMode && isEmotionUnlocked(emotionId)) {
      onEmotionSelect?.(emotionId);
    }
  };

  const renderEmotionCard = (emotion) => {
    if (!isEmotionUnlocked(emotion.id)) {
      return null;
    }

    const isSelected = selectedEmotions.includes(emotion.id);
    const canSelect = guessMode;

    return (
      <div
        key={emotion.id}
        className={`emotion-card ${isSelected ? 'selected' : ''} ${canSelect ? 'unlocked-clickable' : ''} ${guessMode ? 'guess-mode' : ''}`}
        onClick={() => handleEmotionClick(emotion.id)}
        style={{
          borderColor: isSelected ? emotion.color : 'rgba(255, 255, 255, 0.2)',
          opacity: 0.85,
          cursor: canSelect ? 'pointer' : 'default',
          boxShadow: guessMode && isSelected ? `0 0 15px ${emotion.color}` : 'none'
        }}
      >
        <div className="emotion-icon" style={{ fontSize: isSelected ? '32px' : '24px' }}>
          {emotion.icon}
        </div>
        <div className="emotion-name">{emotion.name}</div>

        {guessMode && (
          <div className="guess-mode-hint">
            {isSelected ? '已选择' : '点击猜测'}
          </div>
        )}

        {isSelected && (
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

      {guessMode && (
        <div className="guess-mode-banner">
          🎯 <strong>猜测模式</strong> - 选择你认为顾客真实的 3 种情绪（已选 {selectedEmotions.length} 个）
        </div>
      )}

      {guessedCorrectly && (
        <div className="guessed-correctly-banner">
          ✓ <strong>已识别情绪</strong> - 现在可以开始调酒了
        </div>
      )}

      <div className="emotion-grid">
        {Object.values(EMOTIONS).map((emotion) => renderEmotionCard(emotion))}
      </div>

      {guessMode && selectedEmotions.length > 0 && (
        <div className="selected-emotions">
          <h4>已选择情绪（{selectedEmotions.length}/3）</h4>
          <div className="selected-list">
            {selectedEmotions.map((emotionId) => {
              const emotion = EMOTIONS[emotionId];
              if (!emotion) {
                return null;
              }

              return (
                <div key={emotionId} className="selected-item" style={{ color: emotion.color }}>
                  {emotion.icon} {emotion.name}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showGuessControls && (
        <div className="emotion-guess-controls-inner">
          {!guessedCorrectly ? (
            guessMode ? (
              <div className="guess-actions">
                <p className="guess-prompt">选择你认为的顾客真实情绪（必须选 3 个）</p>
                <div className="guess-buttons">
                  <button className="guess-btn cancel" onClick={onCancelGuess}>
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
              <button className="start-guess-btn" onClick={onStartGuess}>
                🎯 猜测真实情绪
              </button>
            )
          ) : (
            <div className="guess-success">✓ 已识别情绪，开始调酒吧</div>
          )}
        </div>
      )}
    </div>
  );
};

export default EmotionPanel;
