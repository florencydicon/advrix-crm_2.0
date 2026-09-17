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

// Split on top-level semicolons only, respecting $$ dollar-quoting and
// single-quoted string literals (migrations can contain trigger bodies).
function splitStatements(sql) {
  const out = [];
  let cur = "";
  let inStr = false;
  let inDollar = false;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const next = sql[i + 1];
    if (inDollar) {
      cur += ch;
      if (ch === "$" && next === "$") {
        cur += next;
        i++;
        inDollar = false;
      }
      continue;
    }
    if (inStr) {
      cur += ch;
      if (ch === "'") inStr = false;
      continue;
    }
    if (ch === "'") {
      inStr = true;
      cur += ch;
      continue;
    }
    if (ch === "$" && next === "$") {
      inDollar = true;
      cur += "$$";
      i++;
      continue;
    }
    if (ch === ";") {
      const s = cur.trim();
      if (s) out.push(s);
      cur = "";
      continue;
    }
    cur += ch;
  }
  const s = cur.trim();
  if (s) out.push(s);
  return out;
}

const sql = neon(process.env.DATABASE_URL);
const migrateSql = fs.readFileSync(
  path.resolve("database/migrations/042_task_updated_at.sql"),
  "utf8"
);

async function run() {
  for (const statement of splitStatements(migrateSql)) {
    await sql(statement);
  }
  console.log("042_task_updated_at applied.");
}
run().catch((e) => { console.error(e); process.exit(1); });