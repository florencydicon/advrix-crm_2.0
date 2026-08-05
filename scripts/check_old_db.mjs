// Advrix CRM — check the OLD database (ep-calm-bread) referenced by the stale
// user-scope DATABASE_URL env var. Run: node scripts/check_old_db.mjs
import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL (user-scope env var) not set.");
  process.exit(1);
}

const sql = neon(connectionString);

const tables = [
  "roles",
  "users",
  "clients",
  "projects",
  "project_deliverables",
  "tasks",
  "assignments",
  "workflow_steps",
  "deliverable_types",
  "attendance",
  "leaves",
  "notifications",
];

for (const t of tables) {
  try {
    const res = await sql(`SELECT COUNT(*)::int AS c FROM ${t}`);
    console.log(`${t.padEnd(24)}: ${res[0].c}`);
  } catch (e) {
    console.log(`${t.padEnd(24)}: ERROR (${e.message})`);
  }
}

try {
  const users = await sql(`SELECT email FROM users ORDER BY created_at LIMIT 10`);
  console.log("\nFirst 10 users:");
  for (const u of users) {
    console.log(`  ${u.email}`);
  }
} catch (e) {
  console.log("Users query failed:", e.message);
}
