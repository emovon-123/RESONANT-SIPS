import React, { useState } from 'react';
import CustomerAvatar from '../Avatar/CustomerAvatar.jsx';
import {
  WEATHER_ICONS, WEATHER_NAMES,
  MUSIC_ICONS, MUSIC_NAMES
} from '../../data/atmosphereTemplates.js';
import './GameHeader.css';

const GameHeader = ({
  onBack,
  onShowRules,
  currentDay = 1,
  aiConfig,
  currentCustomerIndex = 0,
  isMuted = false,
  toggleMute,
  sfxVolume = 0.5,
  setSfxVolume,
  playSFX = () => {},
  atmosphere = null,
  onShowHelp
}) => {
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [showAtmoDetail, setShowAtmoDetail] = useState(false);

  const atmoModifiers = [];
  if (atmosphere?.modifiers?.targetShift) {
    const shift = atmosphere.modifiers.targetShift;
    if (shift.sweetness) atmoModifiers.push(`甜${shift.sweetness > 0 ? '+' : ''}${shift.sweetness}`);
    if (shift.thickness) atmoModifiers.push(`浓${shift.thickness > 0 ? '+' : ''}${shift.thickness}`);
    if (shift.strength) atmoModifiers.push(`烈${shift.strength > 0 ? '+' : ''}${shift.strength}`);
  }

  return (
    <div className="game-header">
      <div className="header-left">
        <button className="back-button" onClick={onBack} title="返回主页">←</button>
        <button className="header-icon-btn" onClick={onShowRules} title="查看规则">?</button>
        {onShowHelp && (
          <button className="header-icon-btn help-icon-btn" onClick={onShowHelp} title="帮助">
            📖
          </button>
        )}
      </div>

      <div className="header-center">
        <div className="day-badge">
          <span className="day-icon">📆</span>
          <span className="day-text">第 {currentDay} 天</span>
        </div>

        <div className="customer-compact">
          <span className="customer-avatar-mini">
            <CustomerAvatar
              avatarBase64={aiConfig?.avatarBase64}
              emoji={aiConfig?.avatar || '👤'}
              size={22}
              customerId={aiConfig?.id || aiConfig?.avatarCacheKey}
            />
          </span>
          <span className="customer-name-mini">{aiConfig?.name || '顾客'}</span>
          <span className="queue-badge">{currentCustomerIndex + 1}号</span>
        </div>
      </div>

      <div className="header-right">
        {atmosphere && (
          <div
            className="atmo-compact"
            onMouseEnter={() => setShowAtmoDetail(true)}
            onMouseLeave={() => setShowAtmoDetail(false)}
          >
            <span className="atmo-icon-btn" title="今日氛围">
              {WEATHER_ICONS[atmosphere.weather] || '🌤'}
              {atmoModifiers.length > 0 && <span className="atmo-dot" />}
            </span>
            {showAtmoDetail && (
              <div className="atmo-detail-panel">
                <div className="atmo-detail-row">
                  {WEATHER_ICONS[atmosphere.weather]} {WEATHER_NAMES[atmosphere.weather] || '未知天气'}
                </div>
                <div className="atmo-detail-row">
                  {MUSIC_ICONS[atmosphere.music] || '🎵'} {MUSIC_NAMES[atmosphere.music] || '未知曲风'}
                </div>
                {atmoModifiers.length > 0 && (
                  <div className="atmo-detail-modifiers">
                    {atmoModifiers.map((modifier, index) => (
                      <span key={index} className="atmo-modifier-tag">{modifier}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="audio-controls">
          <button
            className={`audio-btn ${isMuted ? 'muted' : ''}`}
            onClick={() => {
              playSFX('click');
              toggleMute && toggleMute();
            }}
            title={isMuted ? '取消静音' : '静音'}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
          <button
            className="audio-btn settings-btn"
            onClick={() => {
              playSFX('click');
              setShowAudioSettings(!showAudioSettings);
            }}
            title="音量设置"
          >
            ⚙️
          </button>

          {showAudioSettings && (
            <div className="audio-settings-panel">
              <div className="audio-setting-item">
                <label>🔂 音效</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sfxVolume * 100}
                  onChange={(e) => setSfxVolume && setSfxVolume(e.target.value / 100)}
                />
                <span>{Math.round(sfxVolume * 100)}%</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameHeader;
