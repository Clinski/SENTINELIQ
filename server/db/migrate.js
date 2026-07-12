// Applies db/schema.sql to the database in DATABASE_URL. Idempotent.
//   npm run migrate
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("✗ DATABASE_URL is not set. Add it to server/.env, then re-run.");
    process.exit(1);
  }

  const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  // Hosted Postgres (Neon/Supabase) requires SSL; local usually doesn't.
  const isLocal = /@(localhost|127\.0\.0\.1)/.test(url);
  const client = new Client({
    connectionString: url,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    await client.query(sql);
    const { rows } = await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' ORDER BY table_name`,
    );
    console.log("✓ Migration applied. Tables now present:");
    for (const r of rows) console.log("  •", r.table_name);
  } catch (err) {
    console.error("✗ Migration failed:", err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
