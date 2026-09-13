import { normalizeCatalogText } from "../constants/catalogText";

export const SUGGESTION_LIMIT = 8;

const PRIORITY_ORDER = { essential: 0, good_to_have: 1, extra: 2 };
const priorityRank = (entry) => PRIORITY_ORDER[entry?.priority] ?? 3;

function matchPosition(key, query) {
  if (key.startsWith(query)) return 0;
  return key.includes(` ${query}`) ? 1 : -1;
}

export function buildSuggestionIndex(entries, aliasPairs) {
  const index = [];

  for (const entry of entries || []) {
    index.push({ key: entry.key, entry, alias: null });
  }
  for (const [aliasKey, entry] of aliasPairs || []) {
    index.push({ key: aliasKey, entry, alias: aliasKey });
  }

  return index;
}

function compareSuggestions(a, b) {
  if (a.rank !== b.rank) return a.rank - b.rank;

  const priority = priorityRank(a.entry) - priorityRank(b.entry);
  if (priority !== 0) return priority;

  if (a.entry.name.length !== b.entry.name.length) {
    return a.entry.name.length - b.entry.name.length;
  }
  return a.entry.name.localeCompare(b.entry.name, "hu-HU", {
    sensitivity: "base",
  });
}

export function searchSuggestions(index, rawQuery, limit = SUGGESTION_LIMIT) {
  const query = normalizeCatalogText(rawQuery);
  if (!query) return [];

  const best = new Map();

  for (const row of index || []) {
    const position = matchPosition(row.key, query);
    if (position < 0) continue;

    const rank = position + (row.alias ? 2 : 0);

    const previous = best.get(row.entry.key);
    if (previous && previous.rank <= rank) continue;
    best.set(row.entry.key, { entry: row.entry, alias: row.alias, rank });
  }

  return Array.from(best.values()).sort(compareSuggestions).slice(0, limit);
}
