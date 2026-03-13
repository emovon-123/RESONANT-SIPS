/**
 * 回忆碎片展示组件
 * 根据清晰度（vague/hazy/clear/vivid）有不同的视觉效果
 */
import React from 'react';
import './MemoryFragment.css';

const MemoryFragment = ({ fragment, onDismiss }) => {
  if (!fragment) return null;

  return (
    <div className={`memory-fragment-overlay`} onClick={onDismiss}>
      <div className={`memory-fragment clarity-${fragment.clarity}`} onClick={e => e.stopPropagation()}>
        <div className="fragment-header">
          <span className="fragment-icon">◈</span>
          <span className="fragment-label">回忆碎片</span>
          <span className="fragment-clarity-badge">{
            fragment.clarity === 'vague' ? '模糊' :
            fragment.clarity === 'hazy' ? '朦胧' :
            fragment.clarity === 'clear' ? '清晰' : '鲜明'
          }</span>
        </div>
        <p className="fragment-text">{fragment.content}</p>
        <button className="fragment-dismiss" onClick={onDismiss}>
          继续
        </button>
      </div>
    </div>
  );
};

/**
 * 小型碎片展示（用在 DayEndModal 中）
 */
export const MemoryFragmentInline = ({ fragment }) => {
  if (!fragment) return null;

  return (
    <div className={`memory-fragment-inline clarity-${fragment.clarity}`}>
      <div className="fragment-header-inline">
        <span className="fragment-icon">◈</span>
        <span className="fragment-label">回忆碎片</span>
      </div>
      <p className="fragment-text-inline">{fragment.content}</p>
    </div>
  );
};

export default MemoryFragment;
