const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const getLiquidColor = (mixture = {}) => {
  const thickness = Number.isFinite(mixture.thickness) ? mixture.thickness : 0;
  const sweetness = Number.isFinite(mixture.sweetness) ? mixture.sweetness : 0;
  const strength = Number.isFinite(mixture.strength) ? mixture.strength : 0;

  const red = clamp(92 + sweetness * 18 + thickness * 10, 70, 255);
  const green = clamp(88 + sweetness * 12 + thickness * 8, 64, 230);
  const blue = clamp(168 - strength * 18 + sweetness * 4, 48, 220);

  return `rgb(${Math.round(red)}, ${Math.round(green)}, ${Math.round(blue)})`;
};

export const createGameViewModel = ({
  aiConfig,
  atmosphere,
  currentDay,
  currentCustomerIndex,
  guessedCorrectly,
  mixture,
  recipePreview,
  showCocktailResult,
  totalCustomers,
  trustLevel
}) => {
  const safeRecipe = recipePreview?.recipe || {
    glass: null,
    ice: null,
    ingredients: [],
    garnish: null,
    decoration: null
  };

  const safeMixture = mixture || { thickness: 0, sweetness: 0, strength: 0 };
  const safeTotalCustomers = Math.max(totalCustomers || 0, 0);
  const safeCustomerIndex = Math.max(currentCustomerIndex || 0, 0);
  const hasRecipe = Boolean(
    safeRecipe.glass
    || safeRecipe.ice
    || safeRecipe.garnish
    || safeRecipe.decoration
    || safeRecipe.ingredients?.length
  );

  const result = showCocktailResult
    ? {
        isSuccess: Boolean(showCocktailResult.isSuccess),
        title: showCocktailResult.isSuccess ? '共鸣成立' : '差一点火候'
      }
    : null;

  let statusText = '先听，再猜，再调，这一杯才会有灵魂。';

  if (result) {
    statusText = result.isSuccess
      ? '这杯酒已经准确击中了对方此刻的情绪。'
      : '还没调到点上，但舞台已经开始说话了。';
  } else if (guessedCorrectly) {
    statusText = hasRecipe
      ? '调酒模式已开启，吧台会把你的选择放大成演出。'
      : '开始选杯、加冰、配比，舞台会实时回应每一步。';
  }

  return {
    atmosphere: {
      lighting: atmosphere?.lighting || 'warm',
      weather: atmosphere?.weather || 'clear'
    },
    customer: {
      archetype: aiConfig?.categoryId || aiConfig?.type || 'guest',
      avatar: aiConfig?.avatar || '👤',
      isReturnCustomer: Boolean(aiConfig?.isReturnCustomer),
      name: aiConfig?.name || '匿名来客'
    },
    day: currentDay || 1,
    focusLabel: guessedCorrectly ? 'Mixing Mode' : 'Observation Mode',
    guessedCorrectly: Boolean(guessedCorrectly),
    liquidColor: getLiquidColor(safeMixture),
    mixture: safeMixture,
    portions: {
      current: recipePreview?.totalPortions || 0,
      max: recipePreview?.maxPortions || 3
    },
    progress: safeTotalCustomers > 0 ? (safeCustomerIndex + 1) / safeTotalCustomers : 0,
    recipe: safeRecipe,
    result,
    statusText,
    trustLevel: Number.isFinite(trustLevel) ? trustLevel : 0
  };
};

export default createGameViewModel;
