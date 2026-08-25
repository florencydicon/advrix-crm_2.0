import fs from "fs";
import path from "path";
import { neon } from "@neondatabase/serverless";

// Inline .env.local loader (mirrors src/lib/env.ts)
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
  path.resolve("database/migrations/007_attendance_location.sql"),
  "utf8"
);

async function run() {
  await sql(migrateSql);
  console.log("007_attendance_location applied.");
}
run().catch((e) => { console.error(e); process.exit(1); });
