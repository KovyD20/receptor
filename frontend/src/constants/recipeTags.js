export const MAIN_TAGS = [
  { name: "Reggeli", color: "var(--tag-breakfast)" },
  { name: "Leves", color: "var(--tag-soup)" },
  { name: "Főétel", color: "var(--tag-main)" },
  { name: "Desszert", color: "var(--tag-dessert)" },
  { name: "Egyéb", color: "var(--tag-misc)" },
];

export const USER_TAG_COLOR = "var(--tag-user)";

export const MAIN_TAG_NAMES = MAIN_TAGS.map((tag) => tag.name);

const normalize = (tag) => (tag || "").toString().trim().toLocaleLowerCase("hu-HU");

const byName = new Map(MAIN_TAGS.map((tag) => [normalize(tag.name), tag]));

export function isMainTag(tag) {
  return byName.has(normalize(tag));
}

export function mainTagColor(tag) {
  return byName.get(normalize(tag))?.color || USER_TAG_COLOR;
}

export function mainTagOf(recipe) {
  return (recipe?.tags || []).find(isMainTag) || null;
}

export function sortTags(tags) {
  const rank = (tag) => {
    const index = MAIN_TAG_NAMES.findIndex((name) => normalize(name) === normalize(tag));
    return index === -1 ? MAIN_TAG_NAMES.length : index;
  };

  return [...(tags || [])].sort((a, b) => {
    const diff = rank(a) - rank(b);
    if (diff !== 0) return diff;
    return (a || "").localeCompare(b || "", "hu-HU", { sensitivity: "base" });
  });
}
