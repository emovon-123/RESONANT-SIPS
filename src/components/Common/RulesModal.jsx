import React from 'react';
import './RulesModal.css';

/**
 * 游戏规则弹窗
 */
const RulesModal = ({ onClose }) => {
  return (
    <div className="rules-modal-overlay" onClick={onClose}>
      <div className="rules-modal" onClick={(e) => e.stopPropagation()}>
        <button className="rules-close" onClick={onClose}>×</button>
        
        <h2 className="rules-title">🍸 杯中逸事 - 游戏规则</h2>
        
        <div className="rules-content">
          <section className="rule-section endless-mode">
            <h3>🌟 无尽模式</h3>
            <ul>
              <li>每位顾客需要<strong>成功调制 3 杯</strong>鸡尾酒才会满意离开</li>
              <li>顾客初始<strong>0% 信任度</strong>，对话与调酒表现会持续影响后续交流</li>
              <li>成功调酒获得<strong>💰 金币收入</strong>（金额根据配方满意度）</li>
              <li>服务完当前顾客后进入<strong>日结算</strong>，可前往商店购买道具</li>
              <li>下一天会迎来新的顾客，不断挑战！</li>
            </ul>
          </section>

          <section className="rule-section">
            <h3>🎯 游戏目标</h3>
            <p>经营你的赛博酒吧！通过与 AI 顾客对话，洞察他们<strong>表面情绪背后的真实感受</strong>，猜测真实情绪后调制出符合目标条件的专属鸡尾酒，赚取金币并解锁更多内容。</p>
          </section>

          <section className="rule-section">
            <h3>💬 对话系统</h3>
            <ul>
              <li><strong>快捷选项</strong>：点击 3-4 个预设问题快速推进对话</li>
              <li><strong>自定义输入</strong>：在输入框中输入个性化回应，更深入交流</li>
              <li><strong>信任度机制</strong>：对话越深入真诚，信任度越高，顾客越愿意敞开心扉</li>
              <li>良好的对话能提升信任度（+3%~+8%），敷衍回应会降低信任度（-3%~-8%）</li>
            </ul>
          </section>

          <section className="rule-section">
            <h3>🎭 情绪识别与猜测</h3>
            <ul>
              <li><strong>表面情绪</strong>：AI 顾客伪装或表现出的情绪（对话开始时显示）</li>
              <li><strong>真实情绪</strong>：AI 内心的真实感受（需要通过猜测解锁）</li>
              <li><strong>猜测情绪</strong>：点击"🎯 猜测真实情绪"按钮，选择你认为的真实情绪</li>
              <li><strong>猜对</strong>：解锁调酒功能 + 信任度 +10%</li>
              <li><strong>猜错</strong>：信任度 <span className="danger">-5%~-7%</span>（连续猜错惩罚递增）</li>
            </ul>
          </section>

          <section className="rule-section">
            <h3>🍹 调酒规则（核心玩法）</h3>
            <p style={{ fontSize: '0.95em', marginBottom: '12px', opacity: 0.9 }}>
              <strong>❗必须先猜对真实情绪才能解锁调酒台！</strong>
            </p>
            <h4 style={{ fontSize: '1em', marginTop: '15px', marginBottom: '8px' }}>📋 调酒流程（6步）</h4>
            <ul>
              <li><strong>步骤1：选择杯型</strong> - 不同杯型决定原浆容量（2-4份）</li>
              <li><strong>步骤2：加入冰块</strong> - 影响浓稠度、甜度、烈度</li>
              <li><strong>步骤3：混合原浆</strong>（核心）- 添加基酒、果汁、利口酒、其他</li>
              <li><strong>步骤4：添加配料</strong>（可选）- 糖浆、薰衣草、柠檬片等</li>
              <li><strong>步骤5：点缀装饰</strong>（可选）- 薄荷叶、樱桃、金箔等</li>
              <li><strong>步骤6：确认递酒</strong> - 查看配方是否达标</li>
            </ul>

            <h4 style={{ fontSize: '1em', marginTop: '15px', marginBottom: '8px' }}>🎯 目标三维条件</h4>
            <p style={{ fontSize: '0.9em', marginBottom: '8px', opacity: 0.85 }}>
              猜对情绪后，系统会生成基于真实情绪的<strong>三维目标条件</strong>：
            </p>
            <ul>
              <li><strong>🫗 浓稠度</strong>（Thickness）：口感的厚重程度（-10 到 +10）</li>
              <li><strong>🍬 甜度</strong>（Sweetness）：甜味程度，负值为酸/苦（-10 到 +10）</li>
              <li><strong>🔥 烈度</strong>（Strength）：酒精度（0 到 15）</li>
            </ul>
            <p style={{ fontSize: '0.9em', marginTop: '8px', opacity: 0.85 }}>
              每个维度会显示目标范围（如：浓稠度 3-5），你需要通过选择合适的<strong>原浆、冰块、配料、装饰</strong>来达到目标！
            </p>

            <h4 style={{ fontSize: '1em', marginTop: '15px', marginBottom: '8px' }}>🧪 原浆系统（核心）</h4>
            <ul>
              <li><strong>原浆分类</strong>：基酒（高烈度）、果汁（调甜度）、利口酒（调味）、其他（特殊）</li>
              <li><strong>份数限制</strong>：根据杯型不同，可添加 2-4 份原浆</li>
              <li><strong>每种最多</strong>：同一种原浆最多添加 2 份</li>
              <li><strong>三维贡献</strong>：每种原浆都有不同的浓稠度、甜度、烈度贡献值</li>
              <li>例：伏特加（浓稠0，甜-1，烈+2）、橙汁（浓稠+1，甜+2，烈0）</li>
            </ul>
          </section>

          <section className="rule-section bonus-guide">
            <h3>🎯 调酒成功条件</h3>
            <ul>
              <li><strong>核心条件</strong>：所有三维数值都在目标范围内</li>
              <li><strong>满意度</strong>：数值越接近目标中心，满意度越高（0-100%）</li>
              <li><strong>收入计算</strong>：基础价格 × 满意度倍率（0.8-1.2倍）</li>
              <li><strong>失败惩罚</strong>：未达标调酒会降低信任度 -10%</li>
            </ul>
          </section>

          <section className="rule-section combo-special">
            <h3>✨ 道具效果说明</h3>
            <h4 style={{ fontSize: '1em', marginTop: '10px', marginBottom: '8px' }}>🧊 冰块效果</h4>
            <ul>
              <li><strong>无冰</strong>：烈度 +1</li>
              <li><strong>少冰</strong>：无额外效果</li>
              <li><strong>圆球冰</strong>：浓稠度 +1</li>
              <li><strong>多冰</strong>：烈度 -1</li>
              <li><strong>大量冰</strong>：浓稠度 -1，烈度 -2</li>
              <li><strong>干冰</strong>：浓稠度 -2（视觉特效）</li>
            </ul>
            
            <h4 style={{ fontSize: '1em', marginTop: '15px', marginBottom: '8px' }}>🍋 配料效果（常见）</h4>
            <ul>
              <li><strong>糖浆</strong>：甜度 +2</li>
              <li><strong>蜂蜜</strong>：浓稠度 +1，甜度 +1</li>
              <li><strong>薰衣草</strong>：浓稠度 -1，甜度 +1（治愈风味）</li>
              <li><strong>薄荷叶</strong>：甜度 -1（清爽）</li>
              <li><strong>苦精</strong>：甜度 -2（苦味）</li>
            </ul>
            
            <h4 style={{ fontSize: '1em', marginTop: '15px', marginBottom: '8px' }}>🍒 装饰效果</h4>
            <ul>
              <li>大部分装饰为<strong>纯视觉效果</strong>，不影响三维数值</li>
              <li><strong>金箔</strong>：烈度 +1（奢华感）</li>
              <li><strong>辣椒</strong>：烈度 +2（刺激感）</li>
            </ul>
          </section>

          <section className="rule-section">
            <h3>🎉 黄金组合（发现系统）</h3>
            <p style={{ fontSize: '0.9em', marginBottom: '10px', opacity: 0.85 }}>
              特定的道具组合会触发黄金组合，记录到图鉴中。以下是部分示例：
            </p>
            <ul>
              <li>💚 <strong>治愈套餐</strong>：薰衣草 + 薄荷叶 + 少冰</li>
              <li>🕰️ <strong>时光倒流</strong>：糖浆 + 铜制驴子杯 + 圆球冰</li>
              <li>🦁 <strong>勇者之酒</strong>：金箔 + 多冰 + 浅碟香槟杯</li>
              <li>🌫️ <strong>迷雾深渊</strong>：干冰 + 烟雾泡泡 + 骷髅杯</li>
              <li>💡 探索更多组合，解锁完整图鉴！</li>
            </ul>
          </section>

          <section className="rule-section">
            <h3>🏆 解锁系统</h3>
            <ul>
              <li><strong>商店购买</strong>：使用金币购买新杯型、冰块、原浆、配料、装饰</li>
              <li><strong>5 次成功</strong> → 自动解锁新杯型</li>
              <li><strong>优先购买原浆</strong>：原浆种类越多，调配越灵活</li>
              <li><strong>配料和装饰</strong>：可以微调三维数值，达到精确目标</li>
            </ul>
          </section>

          <section className="rule-section guess-guide">
            <h3>💡 游戏技巧</h3>
            <ul>
              <li><strong>耐心对话</strong>：多轮对话提升信任度，更容易进入真实交流</li>
              <li><strong>理解语气</strong>：结合顾客的措辞和状态，判断最贴近的 3 个情绪</li>
              <li><strong>大胆确认</strong>：猜测本身不会扣分，关键在于后续是否把酒调对</li>
              <li><strong>理解目标</strong>：猜对后看清三维目标范围，再选择原浆</li>
              <li><strong>平衡三维</strong>：原浆是核心，冰块/配料/装饰用于微调</li>
              <li><strong>记录配方</strong>：每次成功的配方可以作为参考模板</li>
              <li><strong>灵活调整</strong>：如果一次未达标，调整配方重试（注意信任度）</li>
            </ul>
          </section>

          <section className="rule-section recipe-guide">
            <h3>⚠️ 注意事项</h3>
            <ul>
              <li><strong>必须先猜对情绪</strong>才能解锁调酒台</li>
              <li><strong>回应太短或重复</strong>会降低信任度（-3%~-8%）</li>
              <li><strong>调酒失败</strong>会降低信任度（-10%）</li>
              <li><strong>低信任度</strong>会让顾客更难敞开心扉，也会影响调酒反馈</li>
              <li>建议先充分交流建立信任，再根据整体对话判断情绪</li>
            </ul>
          </section>

          <section className="rule-section combo-guide">
            <h3>🍸 调酒示例</h3>
            <p style={{ fontSize: '0.9em', marginBottom: '10px', opacity: 0.8 }}>假设目标：浓稠度 2-4，甜度 1-3，烈度 4-6</p>
            <ul>
              <li><strong>方案1</strong>：威士忌×2（浓+4，甜0，烈+6）+ 多冰（烈-1）→ 浓4，甜0，烈5 ❌甜度不足</li>
              <li><strong>方案2</strong>：威士忌×1 + 橙汁×1（浓+3，甜+2，烈+3）+ 糖浆（甜+2）→ 浓3，甜4，烈3 ❌烈度不足</li>
              <li><strong>方案3</strong>：威士忌×1 + 朗姆酒×1（浓+3，甜+1，烈+5）+ 糖浆（甜+2）→ 浓3，甜3，烈5 ✓全部达标！</li>
              <li>💡 <strong>提示</strong>：先用原浆调主体，再用配料/冰块微调</li>
            </ul>
          </section>

          <section className="rule-section" style={{ borderTop: '2px solid rgba(138, 101, 255, 0.3)', paddingTop: '20px' }}>
            <h3>🎮 快捷键</h3>
            <ul>
              <li><strong>ESC</strong>：关闭当前弹窗</li>
              <li><strong>Enter</strong>：发送对话（输入框聚焦时）</li>
              <li><strong>?</strong>：打开规则说明（主界面）</li>
            </ul>
          </section>
        </div>

        <button className="rules-start-button" onClick={onClose}>
          开始游戏
        </button>
      </div>
    </div>
  );
};

export default RulesModal;
