import React from 'react';
import { EMOTIONS } from '../../data/emotions.js';
import PixiMixingBoard from '../../game/pixi/PixiMixingBoard.jsx';
import './BartenderPanel.css';

const BartenderPanel = ({
  session,
  unlockedGlasses = [],
  unlockedIceTypes = [],
  unlockedDecorations = [],
  disabled = false,
  disabledMessage = '\u8bf7\u5148\u731c\u6d4b\u987e\u5ba2\u7684\u771f\u5b9e\u60c5\u7eea',
  targetHint = '',
  mixingMode = 'strict',
  guessedCorrectly = false,
  selectedEmotions = [],
  unlockedEmotions = [],
  onEmotionSelect,
  onCancelEmotionGuess,
  onConfirmEmotionGuess,
  onBackToDialogue
}) => {
  if (!session) {
    return null;
  }

  if (disabled) {
    return (
      <div className="bartender-panel disabled">
        <div className="bartender-header">
          <h3>{'\ud83c\udf78 \u8c03\u9152\u53f0'}</h3>
        </div>
        <div className="disabled-overlay">
          <div className="disabled-message">
            <span className="lock-icon">{'\ud83d\udd12'}</span>
            <p>{disabledMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!guessedCorrectly) {
    return (
      <div className="bartender-panel bartender-panel--stage">
        <div className="bartender-header">
          <h3>{'\ud83c\udf78 \u8c03\u9152\u53f0'}</h3>
          <button
            className="reset-btn"
            type="button"
            onClick={onBackToDialogue}
            title={'\u8fd4\u56de\u5bf9\u8bdd'}
          >
            {'\u21a9'}
          </button>
        </div>

        <div className="bartender-emotion-step">
          <div className="bartender-emotion-step__header">
            <div>
              <div className="bartender-emotion-step__eyebrow">Step 0/5</div>
              <h4>先在调酒台确认情绪</h4>
              <p>把你的判断带进杯子里。先选 3 种情绪，确认后再进入杯型与配方步骤。</p>
            </div>
            <div className="bartender-emotion-step__count">
              {selectedEmotions.length}/3
            </div>
          </div>

          <div className="bartender-emotion-grid">
            {Object.values(EMOTIONS)
              .filter((emotion) => unlockedEmotions.includes(emotion.id))
              .map((emotion) => {
                const isSelected = selectedEmotions.includes(emotion.id);
                return (
                  <button
                    key={emotion.id}
                    className={`bartender-emotion-card ${isSelected ? 'selected' : ''}`}
                    type="button"
                    onClick={() => onEmotionSelect?.(emotion.id)}
                    style={{
                      borderColor: isSelected ? emotion.color : 'rgba(255, 255, 255, 0.12)',
                      boxShadow: isSelected ? `0 0 18px ${emotion.color}40` : 'none'
                    }}
                  >
                    <span className="bartender-emotion-card__icon">{emotion.icon}</span>
                    <span className="bartender-emotion-card__name">{emotion.name}</span>
                  </button>
                );
              })}
          </div>

          <div className="bartender-emotion-step__actions">
            <button className="bartender-emotion-step__ghost" type="button" onClick={onCancelEmotionGuess}>
              返回对话
            </button>
            <button
              className="bartender-emotion-step__confirm"
              type="button"
              onClick={onConfirmEmotionGuess}
              disabled={selectedEmotions.length < 3}
            >
              确认猜测 ({selectedEmotions.length}/3)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bartender-panel bartender-panel--stage">
      <div className="bartender-header">
        <h3>{'\ud83c\udf78 \u8c03\u9152\u53f0'}</h3>
        <div className="bartender-header__actions">
          <button className="reset-btn" type="button" onClick={onBackToDialogue} title={'\u8fd4\u56de\u5bf9\u8bdd'}>
            {'\u21a9'}
          </button>
          <button className="reset-btn" type="button" onClick={session.handleReset} title={'\u91cd\u65b0\u5f00\u59cb'}>
            {'\ud83d\udd04'}
          </button>
        </div>
      </div>

      <div className="bartender-panel__stage-scroll">
        <PixiMixingBoard
          mixingMode={mixingMode}
          session={session}
          targetHint={targetHint}
          unlockedDecorations={unlockedDecorations}
          unlockedGlasses={unlockedGlasses}
          unlockedIceTypes={unlockedIceTypes}
        />
      </div>

      <button className="plain-water-btn" type="button" onClick={session.handleServeWater}>
        {'\ud83e\udd5b \u5012\u4e00\u676f\u767d\u6c34'}
      </button>
    </div>
  );
};

export default BartenderPanel;
