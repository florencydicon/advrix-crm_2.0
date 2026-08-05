// Advrix CRM — list EVERY table in the live DB + row counts.
// Run: node scripts/list_all_tables.mjs
import { neon } from "@neondatabase/serverless";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
delete process.env.DATABASE_URL;
try {
  process.loadEnvFile(join(__dirname, "../.env.local"));
} catch (e) {
  console.error("Failed to load .env.local:", e.message);
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

console.log("All tables in the LIVE database (", process.env.DATABASE_URL.split("@")[1].split("/")[0], "):\n");

const tables = await sql(`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  ORDER BY table_name
`);

for (const t of tables) {
  const name = t.table_name;
  try {
    const res = await sql(`SELECT COUNT(*)::int AS c FROM ${name}`);
    const col = await sql(`
      SELECT COUNT(*)::int AS c FROM information_schema.columns WHERE table_schema='public' AND table_name='${name}'
    `);
    console.log(`${name.padEnd(28)} rows=${String(res[0].c).padEnd(6)} cols=${col[0].c}`);
  } catch (e) {
    console.log(`${name.padEnd(28)} ERROR: ${e.message}`);
  }
}
