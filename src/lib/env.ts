import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Loads .env.local as the source of truth for this project, overriding any
 * stale values that may already exist in process.env (e.g. a leftover
 * DATABASE_URL from a previous project, which Next.js would otherwise prefer).
 * Must be imported before any module that reads these variables.
 */
export function loadEnvFile() {
  const path = join(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    process.env[key] = value;
  }
}

loadEnvFile();
