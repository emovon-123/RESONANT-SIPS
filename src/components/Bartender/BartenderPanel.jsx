import React from 'react';
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
  mixingMode = 'strict'
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

  return (
    <div className="bartender-panel bartender-panel--stage">
      <div className="bartender-header">
        <h3>{'\ud83c\udf78 \u8c03\u9152\u53f0'}</h3>
        <button className="reset-btn" type="button" onClick={session.handleReset} title={'\u91cd\u65b0\u5f00\u59cb'}>
          {'\ud83d\udd04'}
        </button>
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
