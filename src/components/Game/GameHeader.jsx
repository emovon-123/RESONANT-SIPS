// 游戏顶部导航栏组件（精简版）
import React, { useState, useEffect, useRef } from 'react';
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
  money = 0,
  aiConfig,
  customerSuccessCount = 0,
  customerCocktailCount = 0,
  currentCustomerIndex = 0,
  totalCustomers = 0,
  isMuted = false,
  toggleMute,
  sfxVolume = 0.5,
  setSfxVolume,
  playSFX = () => {},
  atmosphere = null,
  // 灯塔系统 props
  barLevelInfo = null,
  chapterInfo = null,
  // 帮助系统
  onShowHelp
}) => {
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [showAtmoDetail, setShowAtmoDetail] = useState(false);

  // 金钱飞字动画
  const [moneyFlies, setMoneyFlies] = useState([]);
  const prevMoneyRef = useRef(money);

  useEffect(() => {
    if (money > prevMoneyRef.current) {
      const diff = money - prevMoneyRef.current;
      const id = Date.now();
      setMoneyFlies(prev => [...prev, { id, amount: diff }]);
      setTimeout(() => {
        setMoneyFlies(prev => prev.filter(f => f.id !== id));
      }, 1200);
    }
    prevMoneyRef.current = money;
  }, [money]);

  // 构建氛围修正摘要
  const atmoModifiers = [];
  if (atmosphere?.modifiers?.targetShift) {
    const s = atmosphere.modifiers.targetShift;
    if (s.sweetness) atmoModifiers.push(`甜${s.sweetness > 0 ? '+' : ''}${s.sweetness}`);
    if (s.thickness) atmoModifiers.push(`浓${s.thickness > 0 ? '+' : ''}${s.thickness}`);
    if (s.strength) atmoModifiers.push(`烈${s.strength > 0 ? '+' : ''}${s.strength}`);
  }

  return (
    <div className="game-header">
      {/* 左侧：返回 + 帮助 */}
      <div className="header-left">
        <button className="back-button" onClick={onBack} title="返回主页">←</button>
        <button className="header-icon-btn" onClick={onShowRules} title="查看规则">?</button>
        {onShowHelp && <button className="header-icon-btn help-icon-btn" onClick={onShowHelp} title="帮助">📖</button>}
      </div>

      {/* 中间：天数 + 金钱 + 顾客进度 */}
      <div className="header-center">
        <div className="day-badge">
          <span className="day-icon">📅</span>
          <span className="day-text">第 {currentDay} 天</span>
        </div>
        <div className="money-badge" style={{ position: 'relative' }}>
          <span className="money-icon">💰</span>
          <span className="money-text">¥{money}</span>
          {moneyFlies.map(fly => (
            <span key={fly.id} className="money-fly">+¥{fly.amount}</span>
          ))}
        </div>

        {/* 🆕 酒吧等级展示 */}
        {barLevelInfo && (
          <div className="bar-reputation-display" title={barLevelInfo.description}>
            <span className="bar-level-name">{barLevelInfo.name}</span>
            <div className="bar-reputation-bar">
              <div
                className="bar-reputation-fill"
                style={{ width: `${barLevelInfo.reputation}%` }}
              />
            </div>
            {chapterInfo && (
              <span className="chapter-badge" title={chapterInfo.subtitle}>
                {chapterInfo.id}章
              </span>
            )}
          </div>
        )}

        {/* 顾客进度（紧凑版） */}
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
          <div className="progress-dots">
            {[0, 1, 2].map(i => (
              <span key={i} className={`progress-dot ${i < customerCocktailCount ? (i < customerSuccessCount ? 'filled' : 'failed') : ''}`}>
                {i < customerCocktailCount ? (i < customerSuccessCount ? '🍸' : '💔') : '○'}
              </span>
            ))}
          </div>
          <span className="queue-badge">{currentCustomerIndex + 1}号</span>
        </div>
      </div>

      {/* 右侧：氛围图标 + 音频 */}
      <div className="header-right">
        {/* 氛围指示器（折叠为图标，hover 展开） */}
        {atmosphere && (
          <div
            className="atmo-compact"
            onMouseEnter={() => setShowAtmoDetail(true)}
            onMouseLeave={() => setShowAtmoDetail(false)}
          >
            <span className="atmo-icon-btn" title="今日氛围">
              {WEATHER_ICONS[atmosphere.weather] || '🌙'}
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
                    {atmoModifiers.map((m, i) => (
                      <span key={i} className="atmo-modifier-tag">{m}</span>
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
            onClick={() => { playSFX('click'); toggleMute && toggleMute(); }}
            title={isMuted ? '取消静音' : '静音'}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
          <button
            className="audio-btn settings-btn"
            onClick={() => { playSFX('click'); setShowAudioSettings(!showAudioSettings); }}
            title="音量设置"
          >
            ⚙️
          </button>

          {showAudioSettings && (
            <div className="audio-settings-panel">
              <div className="audio-setting-item">
                <label>🔔 音效</label>
                <input
                  type="range" min="0" max="100"
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
