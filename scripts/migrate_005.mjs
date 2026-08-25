import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

function loadEnvLocal() {
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
  `CREATE TABLE IF NOT EXISTS task_assignees (
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (task_id, user_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_task_assignees_user ON task_assignees(user_id)`,
  `INSERT INTO task_assignees (task_id, user_id)
   SELECT id, assigned_to FROM tasks WHERE assigned_to IS NOT NULL
   ON CONFLICT (task_id, user_id) DO NOTHING`,
];

let failed = false;
for (const stmt of statements) {
  try {
    await sql(stmt);
    console.log("OK:", stmt.split("\n")[0]);
  } catch (err) {
    if (err.message && /already exists/i.test(err.message)) {
      console.log("SKIP (exists):", stmt.split("\n")[0]);
    } else {
      console.error("FAIL:", stmt.split("\n")[0], "->", err.message);
      failed = true;
    }
  }
}

console.log(failed ? "\nMigration 005 finished WITH ERRORS" : "\nMigration 005 complete!");
process.exit(failed ? 1 : 0);
