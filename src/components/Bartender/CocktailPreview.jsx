import React, { useState, useEffect, useRef } from 'react';
import { GLASS_TYPES } from '../../data/emotions.js';
import { ICE_TYPES, GARNISH_TYPES, DECORATION_TYPES } from '../../data/addons.js';
import { INGREDIENTS } from '../../data/ingredients.js';
import './CocktailPreview.css';

/**
 * 酒杯预览组件
 * 显示当前调制中的鸡尾酒视觉效果
 */
const CocktailPreview = ({ 
  recipe = { glass: null, ice: null, ingredients: [], garnish: null, decoration: null },
  totalPortions = 0,
  maxPortions = 3,
  isSuccess = false  // 调酒成功状态
}) => {
  // 倒酒动画状态
  const [isPouring, setIsPouring] = useState(false);
  const [portionBump, setPortionBump] = useState(false);
  const prevPortionsRef = useRef(totalPortions);
  const pourTimerRef = useRef(null);
  const bumpTimerRef = useRef(null);
  
  // 监听份数变化，触发倒酒动画
  useEffect(() => {
    // 清理之前的定时器
    if (pourTimerRef.current) clearTimeout(pourTimerRef.current);
    if (bumpTimerRef.current) clearTimeout(bumpTimerRef.current);
    
    if (totalPortions > prevPortionsRef.current && totalPortions > 0) {
      // 份数增加，触发倒酒动画
      setIsPouring(true);
      setPortionBump(true);
      
      // 动画持续时间与 CSS 匹配
      pourTimerRef.current = setTimeout(() => setIsPouring(false), 600);
      bumpTimerRef.current = setTimeout(() => setPortionBump(false), 350);
    }
    
    prevPortionsRef.current = totalPortions;
    
    return () => {
      if (pourTimerRef.current) clearTimeout(pourTimerRef.current);
      if (bumpTimerRef.current) clearTimeout(bumpTimerRef.current);
    };
  }, [totalPortions]);
  const glass = GLASS_TYPES[recipe.glass];
  
  // 计算液体填充百分比（每份占比）
  const fillPercent = maxPortions > 0 
    ? Math.min((totalPortions / maxPortions) * 100, 100) 
    : 0;
  
  // 每种原浆的独特颜色
  const INGREDIENT_COLORS = {
    // 基酒类 - 根据实际酒的颜色
    vodka:    { r: 200, g: 220, b: 255, a: 0.5 },   // 透明微蓝
    rum:      { r: 180, g: 130, b: 70, a: 0.75 },   // 琥珀色
    gin:      { r: 180, g: 220, b: 200, a: 0.45 },  // 透明微绿
    whiskey:  { r: 180, g: 120, b: 50, a: 0.8 },    // 深琥珀
    tequila:  { r: 230, g: 210, b: 130, a: 0.55 },  // 淡金色
    brandy:   { r: 160, g: 90, b: 50, a: 0.8 },     // 红棕色
    sake:     { r: 255, g: 250, b: 230, a: 0.35 },  // 透明微黄
    absinthe: { r: 100, g: 180, b: 100, a: 0.65 },  // 绿色
    mezcal:   { r: 160, g: 140, b: 100, a: 0.65 },  // 烟熏棕
    cognac:   { r: 170, g: 100, b: 50, a: 0.8 },    // 深琥珀红

    // 果汁类 - 根据水果颜色
    juice_orange:     { r: 255, g: 165, b: 0, a: 0.75 },    // 橙色
    juice_lemon:      { r: 255, g: 245, b: 130, a: 0.6 },   // 淡黄
    juice_lime:       { r: 180, g: 230, b: 100, a: 0.6 },   // 青绿
    juice_pineapple:  { r: 255, g: 215, b: 100, a: 0.7 },   // 金黄
    juice_cranberry:  { r: 180, g: 40, b: 60, a: 0.75 },    // 深红
    juice_grapefruit: { r: 255, g: 180, b: 140, a: 0.65 },  // 粉橙
    juice_apple:      { r: 200, g: 230, b: 150, a: 0.6 },   // 淡绿
    juice_mango:      { r: 255, g: 200, b: 80, a: 0.8 },    // 芒果黄
    juice_watermelon: { r: 255, g: 100, b: 120, a: 0.65 },  // 西瓜红
    juice_passion:    { r: 255, g: 180, b: 50, a: 0.7 },    // 百香黄橙
    juice_peach:      { r: 255, g: 200, b: 180, a: 0.65 },  // 桃粉

    // 调味剂类
    soda:         { r: 220, g: 240, b: 255, a: 0.25 },  // 透明气泡
    tonic:        { r: 240, g: 250, b: 220, a: 0.3 },   // 透明微黄
    cream:        { r: 255, g: 253, b: 245, a: 0.9 },   // 奶白
    coconut_milk: { r: 255, g: 250, b: 240, a: 0.85 },  // 椰白
    syrup:        { r: 255, g: 200, b: 100, a: 0.75 },  // 金黄糖浆
    grenadine:    { r: 220, g: 50, b: 80, a: 0.8 },     // 石榴红
    coffee:       { r: 80, g: 50, b: 30, a: 0.9 },      // 咖啡棕
    ginger_beer:  { r: 230, g: 200, b: 130, a: 0.5 },   // 姜黄
    egg_white:    { r: 255, g: 255, b: 250, a: 0.75 },  // 蛋白白
    honey:        { r: 255, g: 190, b: 80, a: 0.8 },    // 蜂蜜金
    mint:         { r: 150, g: 230, b: 180, a: 0.55 },  // 薄荷绿
    rose:         { r: 255, g: 150, b: 180, a: 0.6 },   // 玫瑰粉
    matcha:       { r: 120, g: 170, b: 100, a: 0.75 },  // 抹茶绿

    // 利口酒类
    triple_sec:  { r: 255, g: 180, b: 100, a: 0.6 },   // 橙皮橙
    kahlua:      { r: 60, g: 40, b: 25, a: 0.9 },      // 咖啡深棕
    baileys:     { r: 180, g: 150, b: 120, a: 0.85 },  // 奶油棕
    amaretto:    { r: 170, g: 130, b: 80, a: 0.7 },    // 杏仁棕
    blue_curacao:{ r: 50, g: 150, b: 255, a: 0.7 },    // 蓝色
    chambord:    { r: 140, g: 40, b: 80, a: 0.8 },     // 覆盆子紫红
    midori:      { r: 100, g: 200, b: 80, a: 0.65 },   // 蜜瓜绿
    sambuca:     { r: 240, g: 240, b: 250, a: 0.45 },  // 茴香透明
    frangelico:  { r: 150, g: 110, b: 70, a: 0.75 },   // 榛果棕
    limoncello:  { r: 255, g: 240, b: 100, a: 0.6 },   // 柠檬黄
    chartreuse:  { r: 130, g: 190, b: 80, a: 0.7 }     // 草药绿
  };

  // 计算液体颜色（基于原浆混合）
  const getLiquidColor = () => {
    if (!recipe.ingredients || recipe.ingredients.length === 0) {
      return 'rgba(100, 150, 255, 0.3)';
    }
    
    let totalWeight = 0;
    let avgColor = { r: 0, g: 0, b: 0, a: 0 };
    
    recipe.ingredients.forEach(p => {
      // 优先使用原浆专属颜色，其次使用默认颜色
      const color = INGREDIENT_COLORS[p.id] || { r: 150, g: 180, b: 255, a: 0.5 };
      const weight = p.count || 1;
      totalWeight += weight;
      avgColor.r += color.r * weight;
      avgColor.g += color.g * weight;
      avgColor.b += color.b * weight;
      avgColor.a += color.a * weight;
    });
    
    if (totalWeight === 0) return 'rgba(100, 150, 255, 0.3)';
    
    avgColor.r = Math.round(avgColor.r / totalWeight);
    avgColor.g = Math.round(avgColor.g / totalWeight);
    avgColor.b = Math.round(avgColor.b / totalWeight);
    avgColor.a = avgColor.a / totalWeight;
    
    return `rgba(${avgColor.r}, ${avgColor.g}, ${avgColor.b}, ${avgColor.a})`;
  };

  const liquidColor = getLiquidColor();
  const glassType = recipe.glass || 'default';

  return (
    <div className="cocktail-preview-container">
      <div className="preview-title">🍹 调制预览</div>
      
      <div className={`cocktail-glass-wrapper glass-${glassType} ${isSuccess ? 'success' : ''}`}>
        {/* 玻璃杯体 */}
        <div className={`glass-body ${isPouring ? 'pouring' : ''}`}>
          {/* 冰块层 */}
          {recipe.ice && recipe.ice !== 'no_ice' && (
            <div className="ice-layer">
              {ICE_TYPES[recipe.ice]?.icon}
            </div>
          )}
          
          {/* 液体层 */}
          <div 
            className={`liquid-layer ${isPouring ? 'pouring' : ''}`}
            style={{ 
              height: `${fillPercent}%`,
              background: fillPercent > 0 
                ? `linear-gradient(180deg, ${liquidColor} 0%, ${liquidColor.replace(/[\d.]+\)$/, '0.95)')} 100%)`
                : 'transparent'
            }}
          >
            {fillPercent > 0 && (
              <>
                <div className="liquid-surface" />
                <div className="liquid-shine" />
              </>
            )}
          </div>
          
          {/* 配料装饰 */}
          {recipe.garnish && (
            <div className="garnish-layer">
              {GARNISH_TYPES[recipe.garnish]?.icon}
            </div>
          )}
          
          {/* 装饰物 */}
          {recipe.decoration && (
            <div className="decoration-layer">
              {DECORATION_TYPES[recipe.decoration]?.icon}
            </div>
          )}
        </div>
        
        {/* 杯型图标 */}
        <div className="glass-type-label">
          {glass?.icon || '🍸'} {glass?.name?.replace(/（.*）/, '') || '选择杯型'}
        </div>
      </div>
      
      {/* 份数指示 */}
      <div className={`portions-indicator ${totalPortions === maxPortions ? 'full' : ''}`}>
        <span className={`portions-current ${portionBump ? 'bump' : ''}`}>{totalPortions}</span>
        <span className="portions-divider">/</span>
        <span className="portions-max">{maxPortions}</span>
        <span className="portions-label">份</span>
      </div>
    </div>
  );
};

export default CocktailPreview;
