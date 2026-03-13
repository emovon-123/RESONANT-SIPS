import React, { useState, useEffect } from 'react';
import { ACHIEVEMENT_RARITY } from '../../data/achievements.js';
import './AchievementNotification.css';

/**
 * 成就解锁通知弹窗
 * 从底部滑入，停留后自动滑出
 */
const AchievementNotification = ({ achievement, onClose, isVisible }) => {
  const [phase, setPhase] = useState('enter'); // enter | show | exit

  useEffect(() => {
    if (!isVisible) return;
    setPhase('enter');
    const showTimer = setTimeout(() => setPhase('show'), 100);
    const exitTimer = setTimeout(() => setPhase('exit'), 3500);
    const closeTimer = setTimeout(() => onClose && onClose(), 4200);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(exitTimer);
      clearTimeout(closeTimer);
    };
  }, [isVisible, onClose]);

  if (!isVisible || !achievement) return null;

  const rarity = ACHIEVEMENT_RARITY[achievement.rarity] || ACHIEVEMENT_RARITY.common;

  return (
    <div
      className={`achievement-notification ${phase} rarity-${achievement.rarity}`}
      onClick={() => onClose && onClose()}
    >
      <div className="achievement-notif-glow" style={{ background: rarity.color }} />
      <div className="achievement-notif-content">
        <div className="achievement-notif-header">
          <span className="achievement-notif-label">成就解锁</span>
          <span className="achievement-notif-rarity" style={{ color: rarity.color }}>
            {rarity.name}
          </span>
        </div>
        <div className="achievement-notif-name">{achievement.name}</div>
        <div className="achievement-notif-desc">
          {achievement.unlockDescription || achievement.description}
        </div>
        {achievement.reward?.type === 'money' && (
          <div className="achievement-notif-reward">
            +¥{achievement.reward.amount}
          </div>
        )}
      </div>
    </div>
  );
};

export default AchievementNotification;
