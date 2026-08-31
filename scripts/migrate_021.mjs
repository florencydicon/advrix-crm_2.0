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
  path.resolve("database/migrations/021_chat.sql"),
  "utf8"
);

const statements = migrateSql
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

async function run() {
  for (const statement of statements) {
    await sql(statement);
  }
  console.log("021_chat applied.");
}
run().catch((e) => { console.error(e); process.exit(1); });