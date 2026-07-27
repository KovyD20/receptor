require("dotenv").config();
const fs = require("fs");
const path = require("path");
const pool = require("../db/pool");

const SCHEMA_PATH = path.join(__dirname, "..", "db", "schema.sql");

async function migrate() {
  const sql = fs.readFileSync(SCHEMA_PATH, "utf8");
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
    console.log(`Schema applied from ${path.relative(process.cwd(), SCHEMA_PATH)}`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { migrate };

if (require.main === module) {
  migrate()
    .then(() => pool.end())
    .catch((err) => {
      console.error("Migration failed:", err.message);
      pool.end();
      process.exit(1);
    });
}
