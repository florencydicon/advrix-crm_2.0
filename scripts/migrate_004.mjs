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

const statements = [`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_enc TEXT`];

let failed = false;
for (const stmt of statements) {
  try {
    await sql(stmt);
    console.log("OK:", stmt);
  } catch (err) {
    if (err.message && /already exists/i.test(err.message)) {
      console.log("SKIP (exists):", stmt);
    } else {
      console.error("FAIL:", stmt, "->", err.message);
      failed = true;
    }
  }
}

console.log(failed ? "\nMigration 004 finished WITH ERRORS" : "\nMigration 004 complete!");
process.exit(failed ? 1 : 0);
