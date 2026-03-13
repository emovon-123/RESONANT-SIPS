// 记忆上下文注入模块
// 从记忆库提取与当前上下文相关的信息，压缩注入到 AI Prompt

import { getPlayerProfile } from './storage.js';
import { getWorldState } from './storage.js';

const CATEGORY_LABELS = {
  workplace: '职场', artistic: '文艺', student: '学生', midlife: '中年'
};

const BAR_LEVEL_NAMES = {
  unknown: '默默无闻', new_bar: '新开的小酒馆',
  neighborhood_gem: '街坊宝藏', city_famous: '城中名店', legendary: '传奇酒吧'
};

/**
 * 从记忆库中提取与当前上下文相关的信息
 * @param {Object} currentCustomer - 当前顾客的 aiConfig
 * @returns {string} 注入 Prompt 的上下文文本（约200-500 token）
 */
export const getRelevantMemoryContext = (currentCustomer) => {
  const playerProfile = getPlayerProfile();
  const worldState = getWorldState();
  const lines = [];

  // 1. 玩家风格
  if (playerProfile.playStyle.dialogueStyle !== 'unknown') {
    lines.push(`调酒师风格：${playerProfile.playStyle.dialogueStyle}，等级${playerProfile.playStyle.overallSkillLevel}`);
  }

  // 2. 同类型顾客历史
  const category = currentCustomer?.categoryId || '';
  const catLabel = CATEGORY_LABELS[category] || '';
  if (catLabel && worldState.customerRegistry) {
    const relatedRecords = Object.values(worldState.customerRegistry)
      .filter(r => r.name && category && r.keyMemory)
      .slice(-3);
    if (relatedRecords.length > 0) {
      lines.push(`之前接待过的客人：${relatedRecords.map(r => `${r.name}(${r.keyMemory})`).join('、')}`);
    }
  }

  // 3. 近期世界事件
  const events = (worldState.worldEvents || []).filter(e => !e.resolved).slice(-3);
  if (events.length > 0) {
    lines.push(`近期事件：${events.map(e => e.event).join('、')}`);
  }

  // 4. 酒吧声誉
  const levelName = BAR_LEVEL_NAMES[worldState.barLevel] || '小酒馆';
  lines.push(`酒吧声誉：${levelName}（${worldState.barReputation || 50}分）`);

  return lines.length > 0 ? lines.join('\n') : '';
};

export default getRelevantMemoryContext;
