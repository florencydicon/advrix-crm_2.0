// Advrix CRM — check row counts in all tables.
// Run: node scripts/check_data.mjs
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

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL not set.");
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
  const res = await sql(`SELECT COUNT(*)::int AS c FROM ${t}`);
  console.log(`${t.padEnd(24)}: ${res[0].c}`);
}

const users = await sql(`SELECT email, full_name FROM users`);
console.log("\nUsers:");
for (const u of users) {
  console.log(`  ${u.email} (${u.full_name})`);
}
