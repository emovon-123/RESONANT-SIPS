// 教学完成画面组件
import React from 'react';
import './TutorialCompleteModal.css';

/**
 * 教学完成画面
 * @param {Object} props
 * @param {Function} props.onContinue - 继续营业回调
 */
const TutorialCompleteModal = ({ onContinue }) => {
  return (
    <div className="tutorial-complete-overlay">
      <div className="tutorial-complete-modal">
        <div className="tc-header">
          <span className="tc-icon">🌙</span>
          <h2 className="tc-title">第一个夜晚结束了</h2>
        </div>

        <div className="tc-skills">
          <h3 className="tc-subtitle">你学会了：</h3>
          <div className="tc-skill-list">
            <div className="tc-skill">
              <span className="tc-skill-icon">💬</span>
              <span className="tc-skill-text">与顾客对话，建立信任</span>
            </div>
            <div className="tc-skill">
              <span className="tc-skill-icon">🎭</span>
              <span className="tc-skill-text">猜测表面背后的真实情绪</span>
            </div>
            <div className="tc-skill">
              <span className="tc-skill-icon">🍸</span>
              <span className="tc-skill-text">根据情绪调制鸡尾酒</span>
            </div>
          </div>
        </div>

        <div className="tc-divider" />

        <div className="tc-narrative">
          <p>那位深夜访客放下酒杯，起身离开。</p>
          <p>走到门口时，他回了一下头。</p>
          <p>没说什么，但你觉得他会再来的。</p>
        </div>

        <div className="tc-reward">
          <span className="tc-reward-icon">💰</span>
          <span className="tc-reward-text">收入：¥50</span>
        </div>

        <div className="tc-teaser">
          <p className="tc-teaser-title">你学会了基础。接下来……</p>
          <ul className="tc-teaser-list">
            <li>🌙 有些客人会再次光临——他们记得你</li>
            <li>🍸 每杯酒都有态度——它在替你说话</li>
            <li>📖 你的故事也会慢慢浮现</li>
          </ul>
          <p className="tc-teaser-footer">不用着急。慢慢来。</p>
        </div>

        <button className="tc-continue-btn" onClick={onContinue}>
          继续营业
        </button>
      </div>
    </div>
  );
};

export default TutorialCompleteModal;
