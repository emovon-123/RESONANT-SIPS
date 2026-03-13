// 鸡尾酒价格计算工具函数
import { calculateAddonBonus, calculateAddonPenalty, calculateComboBonus, checkComboBonus } from '../data/addons.js';

/**
 * 计算鸡尾酒价格（基于配方和顾客喜好）
 * @param {Object} recipe - 调酒配方
 * @param {Object} customerPreferences - 顾客偏好
 * @param {boolean} isSuccess - 是否成功
 * @returns {number} 价格
 */
export const calculateCocktailPrice = (recipe, customerPreferences, isSuccess) => {
  if (!isSuccess) return 0;
  
  let price = 50; // 基础价格
  
  // 情绪适配加成 (+30 适配 / -20 冲突)
  if (recipe.compatibility === 'compatible') price += 30;
  else if (recipe.compatibility === 'conflict') price -= 20;
  else price += 10; // 中性 +10
  
  // 配料/装饰/冰块情绪匹配加成（支持完美匹配）
  // 使用空数组作为默认值，因为新系统不使用 emotions 字段
  const addonBonus = calculateAddonBonus(recipe, recipe.emotions || []);
  price += addonBonus;
  
  // 配料/装饰不匹配惩罚
  const addonPenalty = calculateAddonPenalty(recipe, recipe.emotions || []);
  price -= addonPenalty;
  
  // 黄金组合加成
  const comboBonus = calculateComboBonus(recipe);
  price += comboBonus;
  
  // 顾客喜好匹配加成
  if (customerPreferences) {
    // 冰块喜好匹配 +20
    if (recipe.ice === customerPreferences.iceType) {
      price += 20;
    }
    
    // 配料喜好匹配 +25
    if (recipe.garnish && customerPreferences.garnishes?.includes(recipe.garnish)) {
      price += 25;
    }
    
    // 装饰喜好匹配 +15
    if (recipe.decoration && customerPreferences.decorations?.includes(recipe.decoration)) {
      price += 15;
    }
  }
  
  // 杯型加成 +15
  if (recipe.hasGlassBonus) {
    price += 15;
  }
  
  // 随机浮动 ±10
  price += Math.floor(Math.random() * 21) - 10;
  
  return Math.max(10, price); // 最低10元
};

/**
 * 获取价格计算详情（用于UI展示）
 * @param {Object} recipe - 调酒配方
 * @param {Object} customerPreferences - 顾客偏好
 * @returns {Object} 价格详情
 */
export const getCocktailPriceDetails = (recipe, customerPreferences) => {
  const details = {
    basePrice: 50,
    emotionBonus: 0,
    addonBonus: 0,
    comboBonus: 0,
    combos: [],
    customerBonus: 0,
    glassBonus: 0,
    penalty: 0
  };
  
  // 情绪适配
  if (recipe.compatibility === 'compatible') details.emotionBonus = 30;
  else if (recipe.compatibility === 'conflict') details.emotionBonus = -20;
  else details.emotionBonus = 10;
  
  // 道具加成
  details.addonBonus = calculateAddonBonus(recipe, recipe.emotions || []);
  
  // 惩罚
  details.penalty = calculateAddonPenalty(recipe, recipe.emotions || []);
  
  // 黄金组合
  details.combos = checkComboBonus(recipe);
  details.comboBonus = details.combos.reduce((sum, c) => sum + c.bonus, 0);
  
  // 顾客喜好
  if (customerPreferences) {
    if (recipe.ice === customerPreferences.iceType) details.customerBonus += 20;
    if (recipe.garnish && customerPreferences.garnishes?.includes(recipe.garnish)) details.customerBonus += 25;
    if (recipe.decoration && customerPreferences.decorations?.includes(recipe.decoration)) details.customerBonus += 15;
  }
  
  // 杯型
  if (recipe.hasGlassBonus) details.glassBonus = 15;
  
  details.total = details.basePrice + details.emotionBonus + details.addonBonus + 
                  details.comboBonus + details.customerBonus + details.glassBonus - details.penalty;
  
  return details;
};

/**
 * 旧版价格函数（保留兼容性）
 * @param {boolean} isSuccess - 是否成功
 * @param {string} compatibility - 适配性
 * @returns {number} 价格
 */
export const generateCocktailPrice = (isSuccess, compatibility) => {
  if (!isSuccess) return 0;
  const basePrice = 50 + Math.floor(Math.random() * 50);
  const compatBonus = compatibility === 'compatible' ? 30 : (compatibility === 'neutral' ? 10 : 0);
  const randomBonus = Math.floor(Math.random() * 30);
  return basePrice + compatBonus + randomBonus;
};
