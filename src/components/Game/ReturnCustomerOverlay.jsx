// 回头客到达通知组件
import React from 'react';
import CustomerAvatar from '../Avatar/CustomerAvatar.jsx';

const PHASE_NAMES = {
  introduction: '初见', escalation: '深入', turning_point: '转折',
  resolution: '解决', epilogue: '尾声'
};

/**
 * 回头客到达时的通知弹窗
 */
const ReturnCustomerOverlay = ({ customer, onContinue }) => {
  if (!customer) return null;

  const lastMemory = customer.relationship?.sharedHistory?.slice(-1)[0];
  const phaseName = PHASE_NAMES[customer.characterArc?.currentPhase] || '未知';

  return (
    <div className="return-customer-overlay">
      <div className="return-customer-card">
        <div className="rc-header">
          <span className="rc-wave">👋</span>
          <h3 className="rc-title">一位老朋友回来了</h3>
        </div>

        <div className="rc-info">
          <span className="rc-avatar">
            <CustomerAvatar
              avatarBase64={customer.originalConfig?.avatarBase64}
              emoji={customer.originalConfig?.avatar || '👤'}
              size={48}
              customerId={customer.id}
            />
          </span>
          <div className="rc-details">
            <div className="rc-name">{customer.name}</div>
            <div className="rc-visit">第 {(customer.relationship?.totalVisits || 0) + 1} 次来访 · {phaseName}</div>
          </div>
        </div>

        {lastMemory && (
          <div className="rc-memory">
            <span className="rc-memory-label">💭 上次的记忆</span>
            <p className="rc-memory-text">{lastMemory.summary}</p>
          </div>
        )}

        <button className="rc-continue-btn" onClick={onContinue}>
          迎接TA
        </button>
      </div>
    </div>
  );
};

// 内联样式通过 GamePage.css 管理
export default ReturnCustomerOverlay;
