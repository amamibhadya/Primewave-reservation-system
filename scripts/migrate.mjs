// Minimal migration runner: applies db/migrations/*.sql in order, once each.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "db", "migrations");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  if (process.argv.includes("--reset")) {
    console.log("Resetting schema...");
    await client.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  }
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
  const done = new Set((await client.query("SELECT name FROM schema_migrations")).rows.map((r) => r.name));
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    if (done.has(file)) continue;
    console.log(`Applying ${file}`);
    await client.query("BEGIN");
    try {
      await client.query(fs.readFileSync(path.join(dir, file), "utf8"));
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    }
  }
  console.log("Migrations up to date.");
} finally {
  await client.end();
}
