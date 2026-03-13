// 日结算弹窗组件
import React from 'react';
import ShopPanel from '../Shop/ShopPanel.jsx';
import './DayEndModal.css';

/**
 * 日结算弹窗
 * @param {Object} props
 * @param {number} props.currentDay - 当前天数
 * @param {number} props.customersServed - 服务顾客数
 * @param {number} props.successCount - 成功调酒数
 * @param {number} props.dayEarnings - 今日收入
 * @param {number} props.totalMoney - 总资产
 * @param {Function} props.onStartNewDay - 开始新一天回调
 * @param {Object} props.unlockedItems - 已解锁物品
 * @param {Function} props.onShopPurchase - 商店购买回调
 */
const DayEndModal = ({
  currentDay = 1,
  customersServed = 0,
  successCount = 0,
  dayEarnings = 0,
  totalMoney = 0,
  onStartNewDay,
  unlockedItems,
  onShopPurchase,
  dailyMemory = null  // 🆕 日记忆数据
}) => {
  // 根据收入显示不同消息
  const getMessage = () => {
    if (dayEarnings >= 200) return '🌟 今天生意不错！';
    if (dayEarnings >= 100) return '😊 还算可以的一天';
    return '💪 明天继续加油！';
  };

  return (
    <div className="day-end-overlay">
      <div className="day-end-modal with-shop">
        {/* 左侧：统计信息 */}
        <div className="day-end-left">
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
            <div className="stat-item highlight">
              <span className="stat-icon">💰</span>
              <span className="stat-label">今日收入</span>
              <span className="stat-value">¥{dayEarnings}</span>
            </div>
            <div className="stat-item total">
              <span className="stat-icon">🏦</span>
              <span className="stat-label">总资产</span>
              <span className="stat-value">¥{totalMoney}</span>
            </div>
          </div>

          <div className="day-end-message">
            {getMessage()}
          </div>

          <button className="next-day-button" onClick={onStartNewDay}>
            ☀️ 开始新的一天
          </button>
        </div>

        {/* 右侧：商店面板 */}
        <div className="day-end-right">
          <div className="shop-hint">🛒 趁休息时间进点货吧</div>
          <ShopPanel
            money={totalMoney}
            unlockedItems={unlockedItems}
            onPurchase={onShopPurchase}
            compact={true}
          />
        </div>
      </div>
    </div>
  );
};

export default DayEndModal;
