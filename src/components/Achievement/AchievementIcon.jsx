import React from 'react';
import { ICONS, ACHIEVEMENT_ICON_MAP, CATEGORY_ICON_MAP } from '../../data/achievementIcons.js';
import { ACHIEVEMENT_RARITY } from '../../data/achievements.js';
import './AchievementIcon.css';

/**
 * 成就图标渲染组件
 * 
 * 将 achievementIcons.js 中的 path 数据渲染为带霓虹发光效果的 SVG
 * 
 * @param {Object} props
 * @param {string} props.iconId - 图标 ID（直接引用 ICONS 的 key）
 * @param {string} [props.achievementId] - 成就 ID（自动查找对应图标）
 * @param {string} [props.categoryId] - 分类 ID（自动查找对应图标）
 * @param {number} [props.size=32] - 图标尺寸（px）
 * @param {string} [props.rarity='common'] - 稀有度，决定颜色主题
 * @param {boolean} [props.locked=false] - 是否锁定状态（灰色 + 无发光）
 * @param {boolean} [props.glow=true] - 是否启用发光效果
 * @param {string} [props.className] - 额外 CSS 类名
 */
const AchievementIcon = ({
  iconId,
  achievementId,
  categoryId,
  size = 32,
  rarity = 'common',
  locked = false,
  glow = true,
  className = ''
}) => {
  // 解析图标 ID
  let resolvedIconId = iconId;
  if (!resolvedIconId && achievementId) {
    resolvedIconId = ACHIEVEMENT_ICON_MAP[achievementId];
  }
  if (!resolvedIconId && categoryId) {
    resolvedIconId = CATEGORY_ICON_MAP[categoryId];
  }

  const iconData = ICONS[resolvedIconId];
  if (!iconData) {
    // 兜底：显示一个问号
    return (
      <div
        className={`achievement-icon fallback ${className}`}
        style={{ width: size, height: size }}
      >
        ?
      </div>
    );
  }

  // 颜色主题
  const colorThemes = {
    common:    { primary: '#a0a0a0', secondary: '#707070', glow: 'rgba(160,160,160,0.4)' },
    uncommon:  { primary: '#4fc3f7', secondary: '#0288d1', glow: 'rgba(79,195,247,0.5)' },
    rare:      { primary: '#ce93d8', secondary: '#8e24aa', glow: 'rgba(206,147,216,0.5)' },
    legendary: { primary: '#ffd54f', secondary: '#ff8f00', glow: 'rgba(255,213,79,0.6)' }
  };

  const theme = locked
    ? { primary: '#3a3a3a', secondary: '#2a2a2a', glow: 'none' }
    : (colorThemes[rarity] || colorThemes.common);

  const filterId = `glow-${resolvedIconId}-${rarity}`;
  const showGlow = glow && !locked;

  /**
   * 渲染单个 SVG 元素
   */
  const renderElement = (el, index) => {
    const commonProps = {
      key: index,
      stroke: el.fill === 'currentColor' ? 'none' : theme.primary,
      strokeWidth: el.strokeWidth || 1.5,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      fill: el.fill === 'currentColor' ? theme.primary : (el.fill || 'none'),
      opacity: el.opacity || 1
    };

    switch (el.type) {
      case 'path':
        return <path {...commonProps} d={el.d} />;
      case 'circle':
        return <circle {...commonProps} cx={el.cx} cy={el.cy} r={el.r} />;
      case 'ellipse':
        return <ellipse {...commonProps} cx={el.cx} cy={el.cy} rx={el.rx} ry={el.ry} />;
      case 'line':
        return <line {...commonProps} x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} fill="none" />;
      case 'rect':
        return <rect {...commonProps} x={el.x} y={el.y} width={el.width} height={el.height} rx={el.rx || 0} />;
      case 'polygon':
        return <polygon {...commonProps} points={el.points} />;
      default:
        return null;
    }
  };

  return (
    <div
      className={`achievement-icon ${locked ? 'locked' : ''} rarity-${rarity} ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* 发光滤镜 */}
        {showGlow && (
          <defs>
            <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
        )}

        {/* 图标内容 */}
        <g filter={showGlow ? `url(#${filterId})` : undefined}>
          {iconData.paths.map((el, i) => renderElement(el, i))}
        </g>
      </svg>
    </div>
  );
};

export default AchievementIcon;
