import { normalizeCatalogText } from "../constants/pantryCatalog";

const asNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

function recipeTime(recipe) {
  return asNumber(recipe?.time ?? recipe?.time_minutes);
}

export function recipeTimeLabel(recipe) {
  const minutes = recipeTime(recipe);
  return minutes ? `${minutes} perc` : null;
}

export function recipeServings(recipe) {
  return asNumber(recipe?.servings) || 1;
}

export function recipeMeta(recipe) {
  const parts = [`${recipe?.ingredients?.length || 0} hozzávaló`];
  const minutes = recipeTime(recipe);
  if (minutes) parts.push(`${minutes} perc`);
  return parts.join(" · ");
}

export function formatAmount(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return value;
  return Number(parsed.toFixed(2)).toString();
}

export function scaleIngredients(ingredients, servings, baseServings) {
  return (ingredients || []).map((ingredient) => {
    const amount = Number(ingredient?.amount);
    if (!Number.isFinite(amount)) return ingredient;
    return {
      ...ingredient,
      amount: formatAmount((amount * servings) / (baseServings || 1)),
    };
  });
}

export function splitByFridge(ingredients, fridge, keyOf) {
  const fridgeKeys = new Set(
    (fridge || []).map((item) => keyOf(item?.name)).filter(Boolean),
  );

  const have = [];
  const missing = [];

  for (const ingredient of ingredients || []) {
    const key = keyOf(ingredient?.name);
    (key && fridgeKeys.has(key) ? have : missing).push(ingredient);
  }

  return { have, missing };
}

export function recipeAvailability(recipe, fridge, keyOf) {
  const total = recipe?.ingredients?.length || 0;
  if (total === 0) return { have: 0, total: 0, ratio: 0 };
  const { have } = splitByFridge(recipe.ingredients, fridge, keyOf);
  return { have: have.length, total, ratio: have.length / total };
}

export function availabilityLevel(availability) {
  const { have = 0, total = 0 } = availability || {};
  if (total > 0 && have >= total) return "full";
  if (have > 0) return "partial";
  return "empty";
}

export function sortByAvailability(recipes, fridge, keyOf) {
  return (recipes || [])
    .map((recipe) => ({
      recipe,
      availability: recipeAvailability(recipe, fridge, keyOf),
    }))
    .sort((a, b) => {
      if (b.availability.ratio !== a.availability.ratio) {
        return b.availability.ratio - a.availability.ratio;
      }
      const missingA = a.availability.total - a.availability.have;
      const missingB = b.availability.total - b.availability.have;
      if (missingA !== missingB) return missingA - missingB;
      return (a.recipe?.name || "").localeCompare(
        b.recipe?.name || "",
        "hu-HU",
      );
    })
    .map((entry) => entry.recipe);
}

export function recipeMatchesSearch(recipe, term) {
  const needle = normalizeCatalogText(term);
  if (!needle) return true;

  if (normalizeCatalogText(recipe?.name).includes(needle)) return true;
  if (
    (recipe?.tags || []).some((tag) =>
      normalizeCatalogText(tag).includes(needle),
    )
  )
    return true;
  return (recipe?.ingredients || []).some((ing) =>
    normalizeCatalogText(ing?.name).includes(needle),
  );
}

export function itemMatchesSearch(item, term) {
  const needle = normalizeCatalogText(term);
  if (!needle) return true;
  return normalizeCatalogText(item?.displayName || item?.name).includes(needle);
}
