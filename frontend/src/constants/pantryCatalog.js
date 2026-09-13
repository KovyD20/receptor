import { normalizeCatalogText } from "./catalogText";
import { ingredientNameCandidates } from "../lib/ingredientText";
import {
  buildSuggestionIndex,
  searchSuggestions,
} from "../lib/catalogSearch";

const UNKNOWN_CATEGORY = "Egyéb";



function normalizePurchase(purchase) {
  const unit = (purchase?.unit || "").toString().trim();
  const amount = Number(purchase?.amount);
  if (!unit || !Number.isFinite(amount) || amount <= 0) return null;
  return { unit, amount };
}


export function createCatalog(catalogData) {
  const categories = Array.isArray(catalogData?.categories)
    ? catalogData.categories
    : [];

  const categoryIndex = new Map();
  const catalogByKey = new Map();
  const aliasToEntry = new Map();

  categories
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .forEach((category, index) => {
      categoryIndex.set(category.name, index);

      for (const item of category.items || []) {
        const entry = {
          key: item.normalizedKey,
          name: item.canonicalName,
          category: category.name,
          priority: item.priority || null,
          imageUrl: item.imageUrl || null,
          purchase: normalizePurchase(item.purchase),
        };
        catalogByKey.set(entry.key, entry);
        for (const aliasKey of item.aliases || []) {
          aliasToEntry.set(aliasKey, entry);
        }
      }
    });

  function compareEntries(a, b) {
    const categoryDiff =
      (categoryIndex.get(a.category) ?? Number.MAX_SAFE_INTEGER) -
      (categoryIndex.get(b.category) ?? Number.MAX_SAFE_INTEGER);
    if (categoryDiff !== 0) return categoryDiff;
    return a.name.localeCompare(b.name, "hu-HU", { sensitivity: "base" });
  }

  const CATALOG_ITEMS = Array.from(catalogByKey.values()).sort(compareEntries);

  const SUGGESTION_INDEX = buildSuggestionIndex(CATALOG_ITEMS, aliasToEntry);

  function searchCatalog(query, limit) {
    return searchSuggestions(SUGGESTION_INDEX, query, limit);
  }

  const TOKENIZED_KEYS = [
    ...Array.from(catalogByKey.values(), (entry) => [entry.key, entry]),
    ...Array.from(aliasToEntry, ([key, entry]) => [key, entry]),
  ].map(([key, entry]) => ({ tokens: key.split(" ").filter(Boolean), entry }));

  function bySubsetOfTokens(tokens) {
    const wanted = new Set(tokens);
    let best = null;
    let bestExtra = Infinity;
    let ambiguous = false;

    for (const { tokens: candidate, entry } of TOKENIZED_KEYS) {
      if (candidate.length <= tokens.length) continue;
      if (!tokens.every((token) => candidate.includes(token))) continue;

      const extra = candidate.filter((token) => !wanted.has(token)).length;
      if (extra < bestExtra) {
        best = entry;
        bestExtra = extra;
        ambiguous = false;
      } else if (extra === bestExtra && entry.key !== best?.key) {
        ambiguous = true;
      }
    }

    return ambiguous ? null : best;
  }

  function byTokenPrefix(tokens) {
    let best = null;
    for (const { tokens: candidate, entry } of TOKENIZED_KEYS) {
      if (!candidate.length || candidate.length >= tokens.length) continue;
      if (best && candidate.length <= best.tokens.length) continue;
      if (candidate.every((token, i) => token === tokens[i])) {
        best = { tokens: candidate, entry };
      }
    }
    return best?.entry || null;
  }

  const resolved = new Map();

  function resolveEntry(name) {
    if (resolved.has(name)) return resolved.get(name);
    const hit = resolveEntryUncached(name);
    resolved.set(name, hit);
    return hit;
  }

  function resolveEntryUncached(name) {
    const candidates = ingredientNameCandidates(name);

    for (const candidate of candidates) {
      const key = normalizeCatalogText(candidate);
      if (!key) continue;
      const hit = aliasToEntry.get(key) || catalogByKey.get(key);
      if (hit) return hit;
    }

    for (const candidate of candidates) {
      const tokens = normalizeCatalogText(candidate).split(" ").filter(Boolean);
      if (!tokens.length) continue;
      const hit = bySubsetOfTokens(tokens) || byTokenPrefix(tokens);
      if (hit) return hit;
    }

    return null;
  }

  function resolveCatalogKey(name) {
    const key = normalizeCatalogText(name);
    if (!key) return "";
    return resolveEntry(name)?.key || key;
  }

  function resolveCanonicalCatalogName(name) {
    if (!normalizeCatalogText(name)) return "";
    return resolveEntry(name)?.name || (name || "").toString().trim();
  }

  function getCatalogItemByName(name) {
    if (!normalizeCatalogText(name)) return null;
    return resolveEntry(name);
  }

  function groupItemsByCatalog(items) {
    if (!Array.isArray(items) || items.length === 0) return [];

    const grouped = new Map();
    for (const item of items) {
      const meta = getCatalogItemByName(item?.name);
      const category = meta?.category || UNKNOWN_CATEGORY;
      const displayName = meta?.name || (item?.name || "").toString().trim();
      const enrichedItem = {
        ...item,
        displayName,
        nameKey: resolveCatalogKey(displayName),
        category,
        priority: meta?.priority || null,
        imageUrl: meta?.imageUrl || null,
        purchase: meta?.purchase || null,
      };

      const list = grouped.get(category) || [];
      list.push(enrichedItem);
      grouped.set(category, list);
    }

    return Array.from(grouped.entries())
      .sort((a, b) => {
        const aIndex = categoryIndex.get(a[0]) ?? Number.MAX_SAFE_INTEGER;
        const bIndex = categoryIndex.get(b[0]) ?? Number.MAX_SAFE_INTEGER;
        if (aIndex !== bIndex) return aIndex - bIndex;
        return a[0].localeCompare(b[0], "hu-HU", { sensitivity: "base" });
      })
      .map(([category, groupItems]) => ({
        category,
        items: groupItems.sort((a, b) =>
          (a.displayName || "").localeCompare(b.displayName || "", "hu-HU", {
            sensitivity: "base",
          }),
        ),
      }));
  }

  function getMissingCatalogRecommendations(fridgeItems, shoppingItems) {
    const present = new Set(
      [...(fridgeItems || []), ...(shoppingItems || [])]
        .map((item) => resolveCatalogKey(item?.name))
        .filter(Boolean),
    );

    const essential = [];
    const goodToHave = [];
    const extra = [];

    for (const item of CATALOG_ITEMS) {
      if (present.has(item.key)) continue;

      if (item.priority === "essential") {
        essential.push(item);
        continue;
      }
      if (item.priority === "good_to_have") {
        goodToHave.push(item);
        continue;
      }
      extra.push(item);
    }

    return { essential, goodToHave, extra };
  }

  return {
    CATALOG_ITEMS,
    searchCatalog,
    resolveCatalogKey,
    resolveCanonicalCatalogName,
    getCatalogItemByName,
    groupItemsByCatalog,
    getMissingCatalogRecommendations,
  };
}
