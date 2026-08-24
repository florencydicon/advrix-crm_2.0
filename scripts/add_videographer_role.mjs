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

sql`INSERT INTO roles (key, label) VALUES ('VIDEOGRAPHER', 'Videographer')`.then(() => {
  console.log("Videographer role inserted");
  process.exit(0);
}).catch(err => {
  // Check if already exists
  if (err.message && /already exists/i.test(err.message)) {
    console.log("Videographer role already exists");
  } else {
    console.error("Error:", err.message);
  }
  process.exit(1);
});