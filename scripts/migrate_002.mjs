import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { neon } from "@neondatabase/serverless";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  try {
    const raw = readFileSync(join(__dirname, "..", ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // ignore
  }
}
loadEnvLocal();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not configured");
  process.exit(1);
}

const sql = neon(connectionString);

async function run() {
  const migrationSql = readFileSync(
    join(__dirname, "..", "database", "migrations", "002_leads_and_leave_logic.sql"),
    "utf8"
  );

  const statements = migrationSql
    .split(";")
    .map((s) => s.replace(/--.*$/gm, "").trim())
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    try {
      await sql(stmt);
      console.log("OK:", stmt.slice(0, 70).replace(/\s+/g, " ") + "...");
    } catch (err) {
      if (err.message && /already exists/i.test(err.message)) {
        console.log("SKIP (exists):", stmt.slice(0, 70).replace(/\s+/g, " ") + "...");
      } else {
        throw err;
      }
    }
  }

  console.log("\nMigration 002 complete!");
}

run().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
