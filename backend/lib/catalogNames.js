const TTL_MS = 10 * 60 * 1000;

const EMPTY = { names: [], preferred: [] };

function buildCatalogNamePrompt(names) {
  if (!Array.isArray(names) || names.length === 0) return "";
  return [
    "",
    "Ha az alábbi listában van megfelelő hozzávaló, pontosan azt a nevet használd.",
    "Ha nincs közte, írd a hozzávaló szokásos magyar nevét — ne erőltesd rá a listára.",
    names.join(", "),
  ].join("\n");
}

function createCatalogNameCache({ query, ttlMs = TTL_MS, now = Date.now } = {}) {
  let cached = null;
  let inFlight = null;

  async function read() {
    const { rows } = await query(
      "SELECT canonical_name, priority FROM pantry_items ORDER BY canonical_name",
    );

    const names = [];
    const preferred = [];
    for (const row of rows || []) {
      const name = (row?.canonical_name || "").toString().trim();
      if (!name) continue;
      names.push(name);
      if (row.priority !== "extra") preferred.push(name);
    }
    return { names, preferred, at: now() };
  }

  async function get() {
    if (cached && now() - cached.at < ttlMs) return cached;

    if (!inFlight) {
      inFlight = read()
        .then((value) => {
          cached = value;
          return value;
        })
        .catch((err) => {
          console.error("Catalog names unavailable for the AI prompt:", err.message);
          return cached || EMPTY;
        })
        .finally(() => {
          inFlight = null;
        });
    }
    return inFlight;
  }

  return {
    get,
    prompt: async ({ preferredOnly = false } = {}) => {
      const value = await get();
      return buildCatalogNamePrompt(preferredOnly ? value.preferred : value.names);
    },
    reset: () => {
      cached = null;
      inFlight = null;
    },
  };
}

const shared = createCatalogNameCache({
  query: (sql) => require("../db/pool").query(sql),
});

module.exports = {
  buildCatalogNamePrompt,
  createCatalogNameCache,
  getCatalogNames: shared.get,
  catalogNamePrompt: shared.prompt,
  resetCatalogNamesCache: shared.reset,
  TTL_MS,
};
