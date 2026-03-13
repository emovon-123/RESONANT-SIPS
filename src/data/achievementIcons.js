import achievementIconsData from './achievementIcons.json';

const CATEGORY_ICONS = achievementIconsData.categoryIcons;
const ACHIEVEMENT_ICONS = achievementIconsData.achievementIcons;

export const ICONS = {
  ...CATEGORY_ICONS,
  ...ACHIEVEMENT_ICONS
};

export const ACHIEVEMENT_ICON_MAP = achievementIconsData.achievementIconMap;
export const CATEGORY_ICON_MAP = achievementIconsData.categoryIconMap;

export default ICONS;
