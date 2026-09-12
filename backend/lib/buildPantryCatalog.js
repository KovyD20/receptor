const { normalizeCatalogText } = require("./normalize");

const PRIORITY_RANK = {
  extra: 1,
  good_to_have: 2,
  essential: 3,
};

function normalizeCategory(value) {
  return (value || "")
    .toString()
    .trim()
    .replace(/^\d+\.\s*/, "")
    .trim();
}

function collectAliases(row) {
  const source = (row?.name || "").toString().trim();
  if (!source) return [];

  const aliases = new Set([source]);
  const withoutParentheses = source.replace(/\([^)]*\)/g, "").trim();
  if (withoutParentheses) {
    aliases.add(withoutParentheses);
  }

  source
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => aliases.add(part));

  const groupMatches = source.match(/\(([^)]+)\)/);
  if (groupMatches && groupMatches[1]) {
    groupMatches[1]
      .split("/")
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach((part) => aliases.add(part));
  }

  for (const alias of row?.aliases || []) {
    const trimmed = (alias || "").toString().trim();
    if (trimmed) aliases.add(trimmed);
  }

  return Array.from(aliases);
}

function readPurchase(row) {
  const unit = (row.purchaseUnit || "").toString().trim();
  const amount = Number(row.purchaseAmount);
  if (!unit || !Number.isFinite(amount) || amount <= 0) return null;
  return { unit, amount };
}

function orderCategories(seen, declared, warn) {
  if (!declared) return seen;

  const rank = new Map(declared.map((name, index) => [normalizeCategory(name), index]));
  const LAST = Number.MAX_SAFE_INTEGER;

  const unlisted = seen.filter((name) => !rank.has(name));
  if (unlisted.length) {
    warn(
      `buildPantryCatalog: ${unlisted
        .map((name) => `"${name}"`)
        .join(", ")} missing from CATEGORY_ORDER — put at the end.`,
    );
  }

  const unused = [...rank.keys()].filter((name) => !seen.includes(name));
  if (unused.length) {
    warn(
      `buildPantryCatalog: CATEGORY_ORDER lists ${unused
        .map((name) => `"${name}"`)
        .join(", ")}, which no row uses.`,
    );
  }

  return [...seen].sort(
    (a, b) =>
      (rank.get(a) ?? LAST) - (rank.get(b) ?? LAST) ||
      seen.indexOf(a) - seen.indexOf(b),
  );
}

function buildPantryCatalog(
  rows,
  manualSynonyms = {},
  { warn = console.warn, categoryOrder = null } = {},
) {
  const seenOrder = [];
  const categoryIndex = new Map();
  const catalogByKey = new Map();
  const aliasToEntry = new Map();

  function ensureCategory(category) {
    if (categoryIndex.has(category)) return;
    categoryIndex.set(category, seenOrder.length);
    seenOrder.push(category);
  }

  for (const row of rows) {
    const category = normalizeCategory(row.category);
    ensureCategory(category);

    const key = normalizeCatalogText(row.name);
    if (!key) continue;

    const priority = row.priority || "extra";
    const purchase = readPurchase(row);
    const existing = catalogByKey.get(key);
    if (!existing) {
      catalogByKey.set(key, {
        key,
        name: row.name,
        category,
        priority,
        purchase,
      });
      continue;
    }

    const incomingRank = PRIORITY_RANK[priority] || 0;
    const existingRank = PRIORITY_RANK[existing.priority] || 0;
    if (incomingRank > existingRank) {
      existing.priority = priority;
    }
    if (!existing.purchase && purchase) {
      existing.purchase = purchase;
    }
  }

  function registerAlias(alias, entry) {
    const aliasKey = normalizeCatalogText(alias);
    if (!aliasKey || !entry) return;

    const existing = aliasToEntry.get(aliasKey);
    if (!existing) {
      aliasToEntry.set(aliasKey, entry);
      return;
    }

    const existingRank = PRIORITY_RANK[existing.priority] || 0;
    const incomingRank = PRIORITY_RANK[entry.priority] || 0;
    if (incomingRank > existingRank) {
      aliasToEntry.set(aliasKey, entry);
    }
  }

  for (const row of rows) {
    const entry = catalogByKey.get(normalizeCatalogText(row.name));
    if (!entry) continue;
    collectAliases(row).forEach((alias) => registerAlias(alias, entry));
  }

  for (const [alias, canonical] of Object.entries(manualSynonyms)) {
    const targetKey = normalizeCatalogText(canonical);
    const targetEntry =
      aliasToEntry.get(targetKey) || catalogByKey.get(targetKey) || null;
    if (!targetEntry) {
      warn(
        `buildPantryCatalog: the synonym "${alias}" points at "${canonical}", which is not in the catalog — skipping it.`,
      );
      continue;
    }
    registerAlias(alias, targetEntry);
  }

  return {
    categoryOrder: orderCategories(seenOrder, categoryOrder, warn),
    catalogByKey,
    aliasToEntry,
  };
}

module.exports = {
  PRIORITY_RANK,
  buildPantryCatalog,
  orderCategories,
  collectAliases,
  normalizeCategory,
  readPurchase,
};
