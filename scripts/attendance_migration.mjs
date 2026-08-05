import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local
import { config } from "dotenv";
config({ path: join(__dirname, "..", ".env.local") });

const { sql } = await import(join(__dirname, "..", "src", "lib", "db.ts"));

async function run() {
  const migrationSql = readFileSync(join(__dirname, "attendance_migration.sql"), "utf8");

  const statements = migrationSql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  for (const stmt of statements) {
    try {
      await sql(stmt);
      console.log("OK:", stmt.slice(0, 60) + "...");
    } catch (err) {
      if (err.message && err.message.includes("already exists")) {
        console.log("SKIP (exists):", stmt.slice(0, 60) + "...");
      } else {
        throw err;
      }
    }
  }

  console.log("\nMigration complete!");
}

run().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
