const { htmlToText, fieldToText, MAX_TEXT_CHARS } = require("./htmlText");

const MAX_JSON_LD_BYTES = 512 * 1024;
const MAX_DEPTH = 12;

function isRecipeNode(node) {
  if (!node || typeof node !== "object") return false;
  const type = node["@type"];
  if (typeof type === "string") return type.toLowerCase() === "recipe";
  if (Array.isArray(type)) {
    return type.some((t) => typeof t === "string" && t.toLowerCase() === "recipe");
  }
  return false;
}

function findRecipeNode(value, depth = 0) {
  if (depth > MAX_DEPTH || !value || typeof value !== "object") return null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findRecipeNode(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  if (isRecipeNode(value)) return value;

  for (const child of Object.values(value)) {
    if (child && typeof child === "object") {
      const found = findRecipeNode(child, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function parseIsoDuration(value) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value !== "string") return null;

  const match = /^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?)?/i.exec(
    value.trim(),
  );
  if (!match) return null;

  const [, days, hours, minutes] = match;
  const total =
    Number(days || 0) * 24 * 60 + Number(hours || 0) * 60 + Number(minutes || 0);
  return total > 0 ? Math.round(total) : null;
}

function parseYield(value) {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? Math.round(value) : null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const parsed = parseYield(item);
      if (parsed) return parsed;
    }
    return null;
  }
  if (typeof value === "object") return parseYield(value.value ?? value.name);
  if (typeof value !== "string") return null;

  const number = /(\d+(?:[.,]\d+)?)/.exec(value);
  if (!number) return null;
  const parsed = Math.round(Number(number[1].replace(",", ".")));
  return parsed > 0 ? parsed : null;
}

function toTextList(value, depth = 0) {
  if (depth > MAX_DEPTH || value == null) return [];

  if (Array.isArray(value)) {
    return value.flatMap((item) => toTextList(item, depth + 1));
  }

  if (typeof value === "object") {
    if (value.itemListElement) return toTextList(value.itemListElement, depth + 1);
    return toTextList(value.text ?? value.name ?? value.description, depth + 1);
  }

  if (typeof value !== "string") return [];

  return htmlToText(value)
    .split(/\n+/)
    .map((line) => fieldToText(line))
    .filter(Boolean);
}

function cleanName(value) {
  const name = fieldToText(value).split("|")[0].trim();
  return name || null;
}

function totalMinutes(node) {
  const total = parseIsoDuration(node.totalTime);
  if (total) return total;

  const sum =
    (parseIsoDuration(node.prepTime) || 0) + (parseIsoDuration(node.cookTime) || 0);
  return sum > 0 ? sum : null;
}

function extractRecipe(html) {
  const node = findRecipeNode(parseJsonLdBlocks(html));
  if (!node) return null;

  const name = cleanName(node.name);
  const ingredients = toTextList(node.recipeIngredient ?? node.ingredients);
  const steps = toTextList(node.recipeInstructions);

  if (!ingredients.length) return null;

  return {
    name,
    servings: parseYield(node.recipeYield),
    timeMinutes: totalMinutes(node),
    ingredients,
    steps,
  };
}

function parseJsonLdBlocks(html) {
  const blocks = [];
  const pattern =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  let match;
  let budget = MAX_JSON_LD_BYTES;
  while ((match = pattern.exec(html)) !== null) {
    const raw = match[1].trim().replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "");
    budget -= raw.length;
    if (budget < 0) break;
    try {
      blocks.push(JSON.parse(raw));
    } catch {
    }
  }
  return blocks;
}

function recipeToText(recipe) {
  const lines = [];
  if (recipe.name) lines.push(`Étel neve: ${recipe.name}`);
  if (recipe.servings) lines.push(`Adagok száma: ${recipe.servings}`);
  if (recipe.timeMinutes) lines.push(`Elkészítési idő: ${recipe.timeMinutes} perc`);

  lines.push("", "Hozzávalók:");
  for (const ingredient of recipe.ingredients) lines.push(`- ${ingredient}`);

  if (recipe.steps.length) {
    lines.push("", "Elkészítés:");
    recipe.steps.forEach((step, index) => lines.push(`${index + 1}. ${step}`));
  }

  return lines.join("\n").slice(0, MAX_TEXT_CHARS);
}

module.exports = {
  extractRecipe,
  recipeToText,
  parseIsoDuration,
  parseYield,
  parseJsonLdBlocks,
};
