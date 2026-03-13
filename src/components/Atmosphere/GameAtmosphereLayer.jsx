/**
 * 游戏页面动态氛围层
 * 纯视觉装饰，不参与任何游戏逻辑
 * 根据天气和灯光数据渲染对应的粒子/光效
 */
import React, { useMemo } from 'react';
import './GameAtmosphereLayer.css';

const GameAtmosphereLayer = ({ weather = 'clear', lighting = 'warm' }) => {
  // 读取设置页的特效等级
  const effectsLevel = localStorage.getItem('bartender_effects_level') || 'full';

  if (effectsLevel === 'off') return null;

  const isRain = ['rainy', 'stormy'].includes(weather);
  const isSnow = weather === 'snowy';
  const isFog = weather === 'foggy';
  const isStorm = weather === 'stormy';
  const isHeat = weather === 'heatwave';
  const isReduced = effectsLevel === 'reduced';

  // 预计算飞行器位置，避免每次渲染都重新生成
  const aircraftPositions = useMemo(() => 
    Array.from({ length: 3 }).map((_, i) => ({
      delay: i * 7,
      top: 12 + Math.random() * 18,
    })), []);

  return (
    <div className={`game-atmosphere-layer lighting-${lighting}`}>
      {/* 扫描线 - 始终存在 */}
      <div className="game-scanlines" />

      {/* 霓虹竖线 - 始终存在 */}
      <div className="game-neon-lines">
        <div className="game-neon-line" />
        <div className="game-neon-line" />
        <div className="game-neon-line" />
      </div>

      {/* 霓虹光晕 - 始终存在 */}
      <div className="game-glow-orbs">
        <div className="game-glow game-glow-1" />
        <div className="game-glow game-glow-2" />
      </div>

      {/* 城市剪影层 - 窗外的城市 */}
      {!isReduced && (
        <div className="city-silhouette-layer">
          {/* 远景城市轮廓 */}
          <div className="city-skyline" />
          
          {/* 飞行器尾灯 */}
          {aircraftPositions.map((pos, i) => (
            <div
              key={`aircraft-${i}`}
              className="aircraft-light"
              style={{
                animationDelay: `${pos.delay}s`,
                top: `${pos.top}%`,
              }}
            />
          ))}
          
          {/* 远处霓虹广告的微光 */}
          <div className="distant-neon-glow" />
        </div>
      )}

      {/* 以下天气特效仅在完整模式下渲染 */}
      {!isReduced && (
        <>
          {/* 雨滴粒子 */}
          {isRain && (
            <div className={`game-rain ${isStorm ? 'heavy' : ''}`}>
              {Array.from({ length: isStorm ? 35 : 20 }).map((_, i) => (
                <div
                  key={`rain-${i}`}
                  className="game-raindrop"
                  style={{
                    left: `${Math.random() * 100}%`,
                    animationDuration: `${0.6 + Math.random() * 0.5}s`,
                    animationDelay: `${Math.random() * 2}s`,
                    opacity: 0.08 + Math.random() * 0.12,
                  }}
                />
              ))}
            </div>
          )}

          {/* 雪花粒子 */}
          {isSnow && (
            <div className="game-snow">
              {Array.from({ length: 15 }).map((_, i) => (
                <div
                  key={`snow-${i}`}
                  className="game-snowflake"
                  style={{
                    left: `${Math.random() * 100}%`,
                    animationDuration: `${4 + Math.random() * 5}s`,
                    animationDelay: `${Math.random() * 3}s`,
                    opacity: 0.06 + Math.random() * 0.1,
                    width: `${2 + Math.random() * 3}px`,
                    height: `${2 + Math.random() * 3}px`,
                  }}
                />
              ))}
            </div>
          )}

          {/* 雾层 */}
          {isFog && <div className="game-fog" />}

          {/* 闪电闪光 (暴风雨) */}
          {isStorm && <div className="game-lightning" />}

          {/* 热浪扭曲 */}
          {isHeat && <div className="game-heatwave" />}
        </>
      )}
    </div>
  );
};

export default GameAtmosphereLayer;
