// 游戏加载界面组件 - 赛博朋克沉浸式
import React, { useState, useEffect, useMemo } from 'react';
import './GameLoadingScreen.css';

const LOADING_TIPS = [
  '每位顾客都戴着面具，但裂缝中会透出真实',
  '信任需要时间，别急着追问',
  '有些话，需要几杯酒才能说出口',
  '这座城市不缺方案，缺的是愿意听的人',
  '酒的味道对了，心就近了',
  '调酒师最强的工具，是沉默',
  '没有扫描仪，没有算法，但这里有真的酒',
  '雨声是最好的伪装',
];


/**
 * 游戏加载界面 — 沉浸式赛博朋克风格
 */
const GameLoadingScreen = ({
  isLoadingCustomers = false,
  progress = '',
  showRecoveryActions = false,
  onBack = null,
  onBackToSetup = null,
}) => {
  const [tip] = useState(() => LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)]);
  const [dots, setDots] = useState('');

  // 打字机式叙事文字
  const [narrativeIndex, setNarrativeIndex] = useState(0);
  const [narrativeCharIndex, setNarrativeCharIndex] = useState(0);
  const [isNarrativeTyping, setIsNarrativeTyping] = useState(true);
  const narrative = '吧台灯亮了。\n酒瓶在架子上排成一排，等着今夜的故事。';


  // 随机粒子位置（useMemo 缓存避免重渲染闪烁）
  const particles = useMemo(() =>
    Array.from({ length: 15 }).map((_, i) => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      duration: `${3 + Math.random() * 4}s`,
      delay: `${Math.random() * 3}s`,
      size: `${2 + Math.random() * 3}px`,
    })),
  []);

  // 雨滴位置
  const raindrops = useMemo(() =>
    Array.from({ length: 30 }).map((_, i) => ({
      left: `${Math.random() * 100}%`,
      duration: `${0.6 + Math.random() * 0.6}s`,
      delay: `${Math.random() * 2}s`,
      opacity: 0.06 + Math.random() * 0.12,
    })),
  []);

  // 点点点动画
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // 打字机效果
  useEffect(() => {
    if (narrativeCharIndex < narrative.length) {
      const char = narrative[narrativeCharIndex];
      const delay = char === '\n' ? 400 : char === '。' ? 300 : 50 + Math.random() * 40;
      const timer = setTimeout(() => setNarrativeCharIndex(prev => prev + 1), delay);
      return () => clearTimeout(timer);
    } else {
      setIsNarrativeTyping(false);
    }
  }, [narrativeCharIndex, narrative]);


  const narrativeText = narrative.slice(0, narrativeCharIndex);

  return (
    <div className="game-loading">
      {/* 雨幕背景 */}
      <div className="loading-rain">
        {raindrops.map((drop, i) => (
          <div
            key={i}
            className="loading-raindrop"
            style={{
              left: drop.left,
              animationDuration: drop.duration,
              animationDelay: drop.delay,
              opacity: drop.opacity,
            }}
          />
        ))}
      </div>

      {/* 背景粒子 */}
      <div className="loading-particles">
        {particles.map((p, i) => (
          <div
            key={i}
            className="loading-particle"
            style={{
              left: p.left,
              top: p.top,
              animationDuration: p.duration,
              animationDelay: p.delay,
              width: p.size,
              height: p.size,
            }}
          />
        ))}
      </div>

      {/* 霓虹横线装饰 */}
      <div className="loading-neon-line loading-neon-top" />
      <div className="loading-neon-line loading-neon-bottom" />

      <div className="loading-content">
        {/* 调酒台场景 */}
        <div className="loading-scene">
          {/* 酒架 */}
          <div className="bottle-shelf">
            <div className="bottle bottle-1">🍾</div>
            <div className="bottle bottle-2">🥃</div>
            <div className="bottle bottle-3">🍷</div>
          </div>

          {/* 马提尼杯（倒酒动画） */}
          <div className="loading-cocktail">
            <div className="pour-stream" />
            <div className="cocktail-glass">
              <div className="cocktail-liquid" />
              <div className="cocktail-shine" />
              <div className="cocktail-bubbles">
                <span /><span /><span />
              </div>
            </div>
            <div className="cocktail-stem" />
            <div className="cocktail-base" />
          </div>
        </div>

        {/* 叙事文字（打字机） */}
        <div className="loading-narrative">
          {narrativeText.split('\n').map((line, i) => (
            <p key={i}>{line}</p>
          ))}
          {isNarrativeTyping && <span className="typewriter-cursor" />}
        </div>

        {/* 状态文字 */}
        <p className="loading-text">
          {isLoadingCustomers ? '正在为您准备今日顾客' : '酒吧准备中'}
          <span className="loading-dots">{dots}</span>
        </p>

        {progress && (
          <p className="loading-subtext">{progress}</p>
        )}

        {showRecoveryActions && (
          <div className="loading-actions">
            {typeof onBackToSetup === 'function' && (
              <button type="button" className="loading-action-btn loading-action-primary" onClick={onBackToSetup}>
                返回新游戏配置
              </button>
            )}
            {typeof onBack === 'function' && (
              <button type="button" className="loading-action-btn loading-action-secondary" onClick={onBack}>
                返回上一级
              </button>
            )}
          </div>
        )}

        {/* 进度条 */}
        <div className="loading-bar">
          <div className="loading-bar-fill" />
        </div>

        {/* 沉浸式提示 */}
        <p className="loading-tip">"{tip}"</p>
      </div>
    </div>
  );
};

export default GameLoadingScreen;
