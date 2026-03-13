// 共同记忆面板组件（回头客时显示）
import React, { useState } from 'react';

const PHASE_NAMES = {
  introduction: '初见', escalation: '深入', turning_point: '转折',
  resolution: '解决', epilogue: '尾声'
};

/**
 * 共同记忆面板
 * 仅当顾客是回头客时在侧边显示
 * 🆕 可折叠，避免挤占情绪面板空间
 */
const SharedMemoryPanel = ({ sharedHistory = [], intimacy = 0, currentPhase = 'introduction', crossroads = null }) => {
  const [collapsed, setCollapsed] = useState(true);

  if (!sharedHistory || sharedHistory.length === 0) return null;

  return (
    <div className={`shared-memory-panel ${collapsed ? 'sm-collapsed' : ''}`}>
      <div className="sm-header" onClick={() => setCollapsed(!collapsed)} style={{ cursor: 'pointer' }}>
        <span className="sm-icon">📖</span>
        <span className="sm-title">共同记忆</span>
        <span className="sm-stat" style={{ marginLeft: 'auto', fontSize: '11px' }}>
          📊 {Math.round(intimacy * 100)}% · 🎭 {PHASE_NAMES[currentPhase] || currentPhase}
        </span>
        <span className="sm-toggle">{collapsed ? '▼' : '▲'}</span>
      </div>

      {!collapsed && (
        <>
          <div className="sm-timeline">
            {sharedHistory.slice(-5).map((entry, idx) => (
              <div key={idx} className={`sm-entry ${entry.isCrossroads ? 'crossroads' : ''}`}>
                <div className={`sm-dot ${entry.isCrossroads ? 'crossroads-dot' : ''}`} />
                <div className="sm-content">
                  <span className="sm-day">
                    Day {entry.day}
                    {entry.isCrossroads && <span className="sm-crossroads-badge">🔀</span>}
                  </span>
                  <span className="sm-summary">{entry.summary}</span>
                </div>
              </div>
            ))}
          </div>

          {/* 活跃十字路口提示 */}
          {crossroads?.active && crossroads.dilemma && (
            <div className="sm-crossroads-active">
              <span className="sm-crossroads-icon">🔀</span>
              <span className="sm-crossroads-text">正面临抉择：{crossroads.dilemma}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SharedMemoryPanel;
