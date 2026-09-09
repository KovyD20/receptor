import { normalizeCatalogText } from "../constants/catalogText";

const STATE_WORDS = [
  "langyos",
  "friss",
  "olvasztott",
  "őrölt",
  "morzsolt",
  "reszelt",
  "darált",
  "aprított",
  "felkockázott",
  "hámozott",
  "szobahőmérsékletű",
  "főtt",
  "nyers",
  "szárított",
  "száraz",
  "fagyasztott",
  "konyhakész",
  "nagy",
  "kicsi",
  "filé",
];

const STATE_WORD_KEYS = new Set(STATE_WORDS.map(normalizeCatalogText));

const PURPOSE_SUFFIX = /\s+az?\s+(?:\S+\s+){0,3}\S+(hoz|hez|höz|ra|re)\s*$/i;

export const IGNORED_INGREDIENTS = new Set(
  ["víz", "csapvíz", "jég"].map(normalizeCatalogText),
);

export function isIgnoredIngredient(name) {
  return IGNORED_INGREDIENTS.has(normalizeCatalogText(name));
}

const words = (value) => (value || "").toString().trim().split(/\s+/).filter(Boolean);

function withoutPurposeSuffix(value) {
  const raw = (value || "").toString().trim();
  const stripped = raw.replace(PURPOSE_SUFFIX, "").trim();
  return stripped || raw;
}

function withoutStateWords(value) {
  const kept = words(value).filter(
    (word) => !STATE_WORD_KEYS.has(normalizeCatalogText(word)),
  );
  return kept.length ? kept.join(" ") : (value || "").toString().trim();
}

export function strippedModifiers(name) {
  return words(withoutPurposeSuffix(name)).filter((word) =>
    STATE_WORD_KEYS.has(normalizeCatalogText(word)),
  );
}

export function ingredientNameCandidates(name) {
  const raw = (name || "").toString().trim();
  if (!raw) return [];

  const noPurpose = withoutPurposeSuffix(raw);
  const candidates = [
    raw,
    noPurpose,
    withoutStateWords(raw),
    withoutStateWords(noPurpose),
  ];

  const seen = new Set();
  return candidates.filter((candidate) => {
    if (!candidate || seen.has(candidate)) return false;
    seen.add(candidate);
    return true;
  });
}
