import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

function loadEnvLocal() {
  // File value wins over any inherited shell env (stale overrides break runs).
  let fileUrl = "";
  try {
    const raw = readFileSync(".env.local", "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!m) continue;
      const val = m[2].replace(/^["']|["']$/g, "");
      if (m[1].toUpperCase() === "DATABASE_URL") fileUrl = val;
      else if (!process.env[m[1]]) process.env[m[1]] = val;
    }
  } catch {}
  if (fileUrl) process.env.DATABASE_URL = fileUrl;
}
loadEnvLocal();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not configured");
  process.exit(1);
}

const sql = neon(connectionString);

const statements = [
  `CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON tasks(project_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_assignments_project ON assignments(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_leads_owner ON leads(owner_id)`,
  `CREATE INDEX IF NOT EXISTS idx_leaves_user_dates ON leaves(user_id, start_date)`,
  `CREATE INDEX IF NOT EXISTS idx_projects_client_created ON projects(client_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id) WHERE read = false`,
];

let failed = false;
for (const stmt of statements) {
  try {
    await sql(stmt);
    console.log("OK:", stmt.replace(/\s+/g, " ").slice(0, 70));
  } catch (err) {
    if (err.message && /already exists/i.test(err.message)) {
      console.log("SKIP (exists):", stmt.replace(/\s+/g, " ").slice(0, 70));
    } else {
      console.error("FAIL:", stmt.replace(/\s+/g, " ").slice(0, 70), "->", err.message);
      failed = true;
    }
  }
}

console.log(failed ? "\nMigration 003 finished WITH ERRORS" : "\nMigration 003 complete!");
process.exit(failed ? 1 : 0);
