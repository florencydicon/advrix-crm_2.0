import fs from "fs";
import path from "path";
import { neon } from "@neondatabase/serverless";

const envPath = path.resolve(".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    let val = t.slice(eq + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    process.env[t.slice(0, eq).trim()] = val;
  }
}

const sql = neon(process.env.DATABASE_URL);
const migrateSql = fs.readFileSync(
  path.resolve("database/migrations/043_staff_pipeline_access.sql"),
  "utf8"
);

const statements = migrateSql
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

async function run() {
  const before = await sql(
    `SELECT key, permissions FROM roles WHERE key IN ('WRITER','CONTENT_WRITER','DESIGNER','EDITOR','SMM','VIDEOGRAPHER') ORDER BY key`
  );
  console.log("BEFORE:");
  for (const r of before) console.log("  ", r.key, JSON.stringify(r.permissions));

  for (const statement of statements) {
    await sql(statement);
  }

  const after = await sql(
    `SELECT key, permissions FROM roles WHERE key IN ('WRITER','CONTENT_WRITER','DESIGNER','EDITOR','SMM','VIDEOGRAPHER') ORDER BY key`
  );
  console.log("AFTER:");
  for (const r of after) console.log("  ", r.key, JSON.stringify(r.permissions));

  console.log("043_staff_pipeline_access applied.");
}
run().catch((e) => { console.error(e); process.exit(1); });