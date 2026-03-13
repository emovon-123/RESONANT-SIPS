// 引导气泡组件
import React from 'react';
import { TUTORIAL_TOOLTIPS } from '../../data/tutorialData.js';
import './TutorialTooltip.css';

/**
 * 教学引导气泡
 * @param {Object} props
 * @param {string} props.tooltipId - 引导气泡ID（对应 TUTORIAL_TOOLTIPS 中的 key）
 * @param {string} props.position - 位置 'top' | 'bottom' | 'left' | 'right' | 'center'
 * @param {Function} props.onDismiss - 关闭回调
 */
const TutorialTooltip = ({ tooltipId, position = 'bottom', onDismiss }) => {
  if (!tooltipId) return null;

  const text = TUTORIAL_TOOLTIPS[tooltipId];
  if (!text) return null;

  return (
    <div className={`tutorial-tooltip tooltip-${position}`}>
      <div className="tooltip-content">
        {text.split('\n').map((line, i) => (
          <p key={i} className="tooltip-line">{line}</p>
        ))}
      </div>
      {onDismiss && (
        <button className="tooltip-dismiss" onClick={onDismiss}>
          知道了
        </button>
      )}
    </div>
  );
};

export default TutorialTooltip;
