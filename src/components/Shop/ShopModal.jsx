import React, { useState } from 'react';
import { GLASS_TYPES } from '../../data/emotions.js';
import { ICE_TYPES, GARNISH_TYPES, DECORATION_TYPES } from '../../data/addons.js';
import './ShopModal.css';

/**
 * 商店弹窗组件
 * 用于购买解锁酒杯、冰块、配料、装饰
 */
const ShopModal = ({ 
  money,
  unlockedItems,
  onPurchase,
  onClose 
}) => {
  const [activeTab, setActiveTab] = useState('glasses');
  const [purchaseConfirm, setPurchaseConfirm] = useState(null);

  // 标签页配置
  const tabs = [
    { id: 'glasses', name: '酒杯', icon: '🍸' },
    { id: 'ice', name: '冰块', icon: '🧊' },
    { id: 'garnishes', name: '配料', icon: '🍋' },
    { id: 'decorations', name: '装饰', icon: '🍒' }
  ];

  // 获取当前标签页的物品列表
  const getItemsForTab = () => {
    switch (activeTab) {
      case 'glasses':
        return Object.values(GLASS_TYPES).map(item => ({
          ...item,
          type: 'glasses',
          isUnlocked: unlockedItems.glasses?.includes(item.id)
        }));
      case 'ice':
        return Object.values(ICE_TYPES).map(item => ({
          ...item,
          type: 'iceTypes',
          isUnlocked: unlockedItems.iceTypes?.includes(item.id)
        }));
      case 'garnishes':
        return Object.values(GARNISH_TYPES).map(item => ({
          ...item,
          type: 'garnishes',
          isUnlocked: unlockedItems.garnishes?.includes(item.id)
        }));
      case 'decorations':
        return Object.values(DECORATION_TYPES).map(item => ({
          ...item,
          type: 'decorations',
          isUnlocked: unlockedItems.decorations?.includes(item.id)
        }));
      default:
        return [];
    }
  };

  // 处理购买
  const handlePurchase = (item) => {
    if (item.isUnlocked) return;
    if (money < item.price) return;
    
    setPurchaseConfirm(item);
  };

  // 确认购买
  const confirmPurchase = () => {
    if (purchaseConfirm) {
      onPurchase(purchaseConfirm.type, purchaseConfirm.id, purchaseConfirm.price);
      setPurchaseConfirm(null);
    }
  };

  // 取消购买
  const cancelPurchase = () => {
    setPurchaseConfirm(null);
  };

  const items = getItemsForTab();

  return (
    <div className="shop-modal-overlay" onClick={onClose}>
      <div className="shop-modal" onClick={e => e.stopPropagation()}>
        {/* 头部 */}
        <div className="shop-header">
          <h2 className="shop-title">🏪 调酒师商店</h2>
          <div className="shop-money">
            <span className="money-icon">💰</span>
            <span className="money-amount">¥{money}</span>
          </div>
          <button className="shop-close" onClick={onClose}>×</button>
        </div>

        {/* 标签页 */}
        <div className="shop-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`shop-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-name">{tab.name}</span>
            </button>
          ))}
        </div>

        {/* 物品列表 */}
        <div className="shop-items">
          {items.map(item => (
            <div 
              key={item.id}
              className={`shop-item ${item.isUnlocked ? 'unlocked' : ''} ${money < item.price && !item.isUnlocked ? 'insufficient' : ''}`}
            >
              <div className="item-icon">{item.icon}</div>
              <div className="item-info">
                <div className="item-name">{item.name}</div>
                <div className="item-description">{item.description}</div>
                {item.compatibleEmotions && (
                  <div className="item-emotions">
                    适配情绪：{item.compatibleEmotions.join('、')}
                  </div>
                )}
                {item.bonus && (
                  <div className="item-bonus">
                    加成情绪：{item.bonus.join('、')}
                  </div>
                )}
              </div>
              <div className="item-action">
                {item.isUnlocked ? (
                  <span className="item-owned">已拥有</span>
                ) : item.price === 0 ? (
                  <span className="item-free">免费</span>
                ) : (
                  <button 
                    className={`item-buy-btn ${money < item.price ? 'disabled' : ''}`}
                    onClick={() => handlePurchase(item)}
                    disabled={money < item.price}
                  >
                    ¥{item.price}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 提示信息 */}
        <div className="shop-tips">
          <p>💡 提示：选择与顾客情绪匹配的配料和装饰可以提升酒的价格！</p>
        </div>

        {/* 购买确认弹窗 */}
        {purchaseConfirm && (
          <div className="purchase-confirm-overlay">
            <div className="purchase-confirm-modal">
              <div className="confirm-icon">{purchaseConfirm.icon}</div>
              <h3 className="confirm-title">确认购买</h3>
              <p className="confirm-text">
                是否花费 <span className="confirm-price">¥{purchaseConfirm.price}</span> 购买 <strong>{purchaseConfirm.name}</strong>？
              </p>
              <div className="confirm-buttons">
                <button className="confirm-cancel" onClick={cancelPurchase}>取消</button>
                <button className="confirm-buy" onClick={confirmPurchase}>确认购买</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShopModal;
