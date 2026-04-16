import React, { useState, useEffect, useRef } from 'react';
import CustomerAvatar from '../Avatar/CustomerAvatar.jsx';
import './ChatPanel.css';

/**
 * 对话面板组件
 * 功能：展示AI与玩家对话、快捷选项、自定义输入
 */
const ChatPanel = ({ 
  aiConfig, 
  trustLevel, 
  dialogueHistory, 
  onSendMessage,
  quickOptions = [],
  isLoading = false
}) => {
  const [inputValue, setInputValue] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(null);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  // 🆕 信任度变化脉冲动画
  const [trustAnim, setTrustAnim] = useState('');
  const prevTrustRef = useRef(trustLevel);

  useEffect(() => {
    if (trustLevel > prevTrustRef.current) {
      setTrustAnim('trust-up');
    } else if (trustLevel < prevTrustRef.current) {
      setTrustAnim('trust-down');
    }
    prevTrustRef.current = trustLevel;
    const timer = setTimeout(() => setTrustAnim(''), 600);
    return () => clearTimeout(timer);
  }, [trustLevel]);

  // 自动滚动到底部
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dialogueHistory]);

  // 发送消息
  const handleSend = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim(), 'custom');
      setInputValue('');
      inputRef.current?.focus();
    }
  };

  // 快捷选项点击
  const handleQuickOption = (option, index) => {
    onSendMessage(option, 'quick');
    // 短暂高亮效果
    setHighlightedIndex(index);
    setTimeout(() => setHighlightedIndex(null), 300);
  };

  // 回车发送
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 高亮情绪线索句
  const renderMessageContent = (content, hasEmotionClue, isThinking = false) => {
    if (isThinking) {
      return <span className="thinking-ellipsis" aria-label="思考中">……</span>;
    }

    return (
      <span className={hasEmotionClue ? 'emotion-clue' : ''}>
        {content}
      </span>
    );
  };

  return (
    <div className="chat-panel">
      {/* 顶部AI信息栏 */}
      <div className="chat-header">
        <div className="ai-avatar">
          <CustomerAvatar
            avatarBase64={aiConfig.avatarBase64}
            emoji={aiConfig.avatar}
            size={56}
            customerId={aiConfig.id || aiConfig.avatarCacheKey}
          />
        </div>
        <div className="ai-info">
          <h3>{aiConfig.name}</h3>
          <div className="ai-personality">
            {aiConfig.personality.map((trait, i) => (
              <span key={i} className="trait-tag">{trait}</span>
            ))}
          </div>
        </div>
        <div className="trust-indicator">
          <span className="trust-label">信任度</span>
          <div className="trust-bar">
            <div 
              className={`trust-fill ${trustAnim}`}
              style={{ 
                width: `${trustLevel * 100}%`,
                backgroundColor: trustLevel < 0.3 ? '#E63946' : trustLevel < 0.6 ? '#FFB703' : '#06FFA5'
              }}
            />
          </div>
          <span className="trust-value">{Math.round(trustLevel * 100)}%</span>
        </div>
      </div>

      {/* 对话区域 */}
      <div className="chat-messages">
        {dialogueHistory.length === 0 && (
          <div className="welcome-message">
            <p>欢迎来到 Mixologist</p>
            <p className="subtitle">通过对话了解顾客的真实情绪，为TA调制专属鸡尾酒</p>
          </div>
        )}
        
        {dialogueHistory.map((msg, index) => (
          <div 
            key={msg.id || `msg-${index}`} 
            className={`message ${msg.role === 'player' ? 'player-message' : 'ai-message'}`}
          >
            <div className="message-avatar">
              {msg.role === 'player' ? '🧑' : (
                <CustomerAvatar
                  avatarBase64={aiConfig.avatarBase64}
                  emoji={aiConfig.avatar}
                  size={36}
                  customerId={aiConfig.id || aiConfig.avatarCacheKey}
                />
              )}
            </div>
            <div className="message-bubble">
              {renderMessageContent(msg.content, msg.hasEmotionClue, msg.isThinking)}
              {!msg.isThinking && (
                <span className="message-time">
                  {new Date(msg.timestamp).toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="message ai-message">
            <div className="message-avatar">
              <CustomerAvatar
                avatarBase64={aiConfig.avatarBase64}
                emoji={aiConfig.avatar}
                size={36}
                customerId={aiConfig.id || aiConfig.avatarCacheKey}
              />
            </div>
            <div className="message-bubble loading">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={chatEndRef} />
      </div>

      {/* 快捷选项 */}
      {quickOptions.length > 0 && (
        <div className="quick-options">
          {quickOptions.map((option, index) => (
            <button
              key={index}
              className={`quick-option ${highlightedIndex === index ? 'active' : ''} ${option === '……' ? 'silence' : ''}`}
              onClick={() => handleQuickOption(option, index)}
              disabled={isLoading}
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {/* 输入框 */}
      <div className="chat-input-container">
        <textarea
          ref={inputRef}
          className="chat-input"
          placeholder="输入你的回应... (Enter发送，Shift+Enter换行)"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
          rows={2}
        />
        <button 
          className="send-button" 
          onClick={handleSend}
          disabled={isLoading || !inputValue.trim()}
        >
          发送
        </button>
      </div>
    </div>
  );
};

export default ChatPanel;
