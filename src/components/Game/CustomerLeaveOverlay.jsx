// 顾客离开动画覆盖层组件
import React from 'react';
import CustomerAvatar from '../Avatar/CustomerAvatar.jsx';
import './CustomerLeaveOverlay.css';

/**
 * 顾客离开动画覆盖层
 * @param {Object} props
 * @param {Object} props.aiConfig - 顾客配置
 * @param {number} props.trustLevel - 信任度（用于判断是满意还是失望）
 */
const CustomerLeaveOverlay = ({ aiConfig, trustLevel = 0 }) => {
  const isSatisfied = trustLevel > 0;

  return (
    <div className="customer-leave-overlay">
      <div className={`customer-leave-modal ${isSatisfied ? 'satisfied' : 'disappointed'}`}>
        <div className="leave-avatar">
          <CustomerAvatar
            avatarBase64={aiConfig?.avatarBase64}
            emoji={aiConfig?.avatar || '👤'}
            size={80}
            customerId={aiConfig?.id || aiConfig?.avatarCacheKey}
          />
        </div>
        <p className="leave-text">
          {isSatisfied ? '😊 顾客满意地离开了！' : '😢 顾客失望地离开了...'}
        </p>
        <p className="leave-subtext">下一位顾客即将到来...</p>
      </div>
    </div>
  );
};

export default CustomerLeaveOverlay;
