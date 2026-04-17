// 日结算弹窗组件
import React from 'react';
import './DayEndModal.css';

/**
 * 日结算弹窗
 * @param {Object} props
 * @param {number} props.currentDay - 当前天数
 * @param {number} props.customersServed - 服务顾客数
 * @param {number} props.successCount - 成功调酒数
 * @param {Function} props.onStartNewDay - 开始新一天回调
 */
const DayEndModal = ({
  currentDay = 1,
  customersServed = 0,
  successCount = 0,
  onStartNewDay,
  dailyMemory = null  // 🆕 日记忆数据
}) => {
  // 根据调酒表现显示不同消息
  const getMessage = () => {
    if (successCount >= 3) return '🌟 今晚你状态很好！';
    if (successCount >= 1) return '😊 还算可以的一天';
    return '💪 明天继续加油！';
  };

  return (
    <div className="day-end-overlay">
      <div className="day-end-modal">
        <h2 className="day-end-title">🌙 第 {currentDay} 天结束</h2>

          {/* 🆕 日记展示 */}
          {dailyMemory?.journalEntry && (
            <div className="day-journal">
              <div className="journal-header">📖 日记</div>
              <p className="journal-text">"{dailyMemory.journalEntry}"</p>
              {dailyMemory.playerPerformance && (
                <div className="journal-performance">
                  {dailyMemory.playerPerformance.strengths?.length > 0 && (
                    <div className="perf-item perf-strength">
                      ✅ {dailyMemory.playerPerformance.strengths.join('、')}
                    </div>
                  )}
                  {dailyMemory.playerPerformance.growthAreas?.length > 0 && (
                    <div className="perf-item perf-growth">
                      💡 {dailyMemory.playerPerformance.growthAreas.join('、')}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="day-end-stats">
            <div className="stat-item">
              <span className="stat-icon">👥</span>
              <span className="stat-label">服务顾客</span>
              <span className="stat-value">{customersServed} 位</span>
            </div>
            <div className="stat-item">
              <span className="stat-icon">🍸</span>
              <span className="stat-label">成功调酒</span>
              <span className="stat-value">{successCount} 杯</span>
            </div>
          </div>

          <div className="day-end-message">
            {getMessage()}
          </div>

        <button className="next-day-button" onClick={onStartNewDay}>
          ☀️ 开始新的一天
        </button>
      </div>
    </div>
  );
};

export default DayEndModal;
