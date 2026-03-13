// 教学遮罩组件
import React from 'react';
import './TutorialOverlay.css';

/**
 * 教学遮罩层
 * 非可交互区域覆盖半透明遮罩
 * @param {Object} props
 * @param {string[]} props.visibleAreas - 可交互的区域列表 ['chat', 'emotion', 'bartender']
 * @param {boolean} props.active - 是否激活遮罩
 */
const TutorialOverlay = ({ visibleAreas = ['chat'], active = true }) => {
  if (!active) return null;

  const isChatVisible = visibleAreas.includes('chat');
  const isEmotionVisible = visibleAreas.includes('emotion');
  const isBartenderVisible = visibleAreas.includes('bartender');

  return (
    <>
      {/* 情绪面板遮罩 */}
      {!isEmotionVisible && (
        <div className="tutorial-mask tutorial-mask-emotion">
          <div className="mask-label">🔒 继续对话后解锁</div>
        </div>
      )}

      {/* 调酒面板遮罩 */}
      {!isBartenderVisible && (
        <div className="tutorial-mask tutorial-mask-bartender">
          <div className="mask-label">🔒 猜对情绪后解锁</div>
        </div>
      )}
    </>
  );
};

export default TutorialOverlay;
