import achievementsData from './achievements.json';

export const ACHIEVEMENT_CATEGORIES = achievementsData.achievementCategories;
export const ACHIEVEMENT_RARITY = achievementsData.achievementRarity;
export const ACHIEVEMENTS = achievementsData.achievements;

export const getAchievementsByCategory = (categoryId) =>
  Object.values(ACHIEVEMENTS).filter((achievement) => achievement.category === categoryId);

export const getTotalAchievementCount = () => Object.keys(ACHIEVEMENTS).length;

export const getVisibleAchievementCount = () =>
  Object.values(ACHIEVEMENTS).filter((achievement) => !achievement.hidden).length;
