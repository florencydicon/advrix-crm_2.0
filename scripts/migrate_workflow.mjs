// Advrix CRM 2.0 — Add approval workflow columns to tasks.
// Run: node scripts/migrate_workflow.mjs
import { neon } from "@neondatabase/serverless";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

delete process.env.DATABASE_URL;
try {
  process.loadEnvFile(join(rootDir, ".env.local"));
} catch (e) {
  console.error("Failed to load .env.local:", e.message);
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL not set in .env.local.");
  process.exit(1);
}

console.log("Target database host:", connectionString.split("@")[1]?.split("/")[0] || "unknown");

const sql = neon(connectionString);

const statements = [
  `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS review_comment TEXT`,
  `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS client_feedback TEXT`,
  `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS platforms TEXT[] NOT NULL DEFAULT '{}'`,
  `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL`,
  `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to)`,
];

async function main() {
  for (const stmt of statements) {
    try {
      await sql(stmt);
      console.log("OK:", stmt);
    } catch (e) {
      console.error("FAILED:", stmt);
      console.error(e.message);
      process.exit(1);
    }
  }

  const cols = await sql`SELECT column_name, data_type
                         FROM information_schema.columns
                         WHERE table_name = 'tasks'
                         ORDER BY ordinal_position`;
  console.log("\ntasks columns now:");
  for (const c of cols) console.log("  -", c.column_name, `(${c.data_type})`);

  console.log("\nMigration complete.");
}

main().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
