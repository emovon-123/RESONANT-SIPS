import ingredientsData from './ingredients.json';

export const BASE_SPIRITS = ingredientsData.baseSpirits;
export const JUICES = ingredientsData.juices;
export const MIXERS = ingredientsData.mixers;
export const LIQUEURS = ingredientsData.liqueurs;

export const INGREDIENTS = {
  ...BASE_SPIRITS,
  ...JUICES,
  ...MIXERS,
  ...LIQUEURS
};

export const getIngredientsByCategory = (category) => {
  return Object.values(INGREDIENTS).filter((ingredient) => ingredient.category === category);
};

export const INGREDIENT_CATEGORIES = ingredientsData.ingredientCategories;
export const INITIAL_UNLOCKED_INGREDIENTS = ingredientsData.initialUnlockedIngredients;
export const MAX_PORTIONS_PER_INGREDIENT = ingredientsData.maxPortionsPerIngredient;
export const MAX_TOTAL_PORTIONS = ingredientsData.maxTotalPortions;
