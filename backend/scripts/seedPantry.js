
require("dotenv").config();
const pool = require("../db/pool");
const { migrate } = require("./migrate");
const { parseSeedArgs, describeTarget } = require("../lib/seedOptions");
const { buildPantryCatalog } = require("../lib/buildPantryCatalog");
const { RAW_CATALOG_ROWS, MANUAL_SYNONYMS } = require("./pantrySeedData");

const INSERTED = "(xmax = 0) AS inserted";

async function seedCategories(client, categoryOrder, { reset }) {
  const categoryIdByName = new Map();
  for (let i = 0; i < categoryOrder.length; i++) {
    const name = categoryOrder[i];
    const res = reset
      ? await client.query(
          "INSERT INTO pantry_categories (name, sort_order) VALUES ($1, $2) RETURNING id",
          [name, i],
        )
      : await client.query(
          `INSERT INTO pantry_categories (name, sort_order) VALUES ($1, $2)
           ON CONFLICT (name) DO UPDATE SET sort_order = EXCLUDED.sort_order
           RETURNING id`,
          [name, i],
        );
    categoryIdByName.set(name, res.rows[0].id);
  }
  return categoryIdByName;
}

async function seedItems(client, catalogByKey, categoryIdByName, { reset }) {
  const itemIdByKey = new Map();
  let inserted = 0;

  for (const entry of catalogByKey.values()) {
    const params = [
      categoryIdByName.get(entry.category),
      entry.name,
      entry.key,
      entry.priority,
      entry.purchase?.unit ?? null,
      entry.purchase?.amount ?? null,
    ];

    const res = reset
      ? await client.query(
          `INSERT INTO pantry_items
             (category_id, canonical_name, normalized_key, priority, purchase_unit, purchase_amount)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, ${INSERTED}`,
          params,
        )
      : await client.query(
          `INSERT INTO pantry_items
             (category_id, canonical_name, normalized_key, priority, purchase_unit, purchase_amount)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (normalized_key) DO UPDATE SET
             category_id     = EXCLUDED.category_id,
             canonical_name  = EXCLUDED.canonical_name,
             priority        = EXCLUDED.priority,
             purchase_unit   = EXCLUDED.purchase_unit,
             purchase_amount = EXCLUDED.purchase_amount
           RETURNING id, ${INSERTED}`,
          params,
        );

    itemIdByKey.set(entry.key, res.rows[0].id);
    if (res.rows[0].inserted) inserted++;
  }

  return { itemIdByKey, inserted };
}

async function seedAliases(client, aliasToEntry, itemIdByKey, { reset }) {
  let total = 0;
  let inserted = 0;

  for (const [aliasKey, entry] of aliasToEntry.entries()) {
    if (aliasKey === entry.key) continue;
    const itemId = itemIdByKey.get(entry.key);
    if (!itemId) continue;

    const res = reset
      ? await client.query(
          `INSERT INTO pantry_aliases (item_id, normalized_key) VALUES ($1, $2)
           RETURNING ${INSERTED}`,
          [itemId, aliasKey],
        )
      : await client.query(
          `INSERT INTO pantry_aliases (item_id, normalized_key) VALUES ($1, $2)
           ON CONFLICT (normalized_key) DO UPDATE SET item_id = EXCLUDED.item_id
           RETURNING ${INSERTED}`,
          [itemId, aliasKey],
        );

    total++;
    if (res.rows[0].inserted) inserted++;
  }

  return { total, inserted };
}

async function run() {
  const { reset } = parseSeedArgs(process.argv.slice(2));
  const { categoryOrder, catalogByKey, aliasToEntry } = buildPantryCatalog(
    RAW_CATALOG_ROWS,
    MANUAL_SYNONYMS,
  );

  console.log(
    `Seeding pantry catalog -> ${describeTarget()}  [${reset ? "RESET: truncate + reload" : "upsert: additive"}]`,
  );

  await migrate();

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (reset) {
      await client.query(
        "TRUNCATE pantry_aliases, pantry_items, pantry_categories RESTART IDENTITY CASCADE",
      );
    }

    const categoryIdByName = await seedCategories(client, categoryOrder, {
      reset,
    });
    const items = await seedItems(client, catalogByKey, categoryIdByName, {
      reset,
    });
    const aliases = await seedAliases(client, aliasToEntry, items.itemIdByKey, {
      reset,
    });

    await client.query("COMMIT");

    const withPurchase = Array.from(catalogByKey.values()).filter(
      (entry) => entry.purchase,
    ).length;
    const counts = reset
      ? `${catalogByKey.size} items, ${aliases.total} aliases`
      : `${catalogByKey.size} items (${items.inserted} new), ` +
        `${aliases.total} aliases (${aliases.inserted} new)`;
    console.log(
      `Seeded pantry catalog: ${categoryOrder.length} categories, ${counts}, ` +
        `${withPurchase} with package data.`,
    );
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  run()
    .then(() => pool.end())
    .catch((err) => {
      console.error("Seed failed:", err.message);
      pool.end();
      process.exit(1);
    });
}
