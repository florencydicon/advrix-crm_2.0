// Advrix CRM — verify admin credentials against the live DB.
// Run: node scripts/verify_admin.mjs
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
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

const sql = neon(process.env.DATABASE_URL);
const rows = await sql`
  SELECT u.id, u.email, u.full_name, u.is_active, u.password_hash,
         r.key AS role_key, r.label AS role_label
  FROM users u JOIN roles r ON r.id = u.role_id
`;
if (rows.length === 0) {
  console.log("NO USERS in database.");
} else {
  for (const u of rows) {
    const ok = await bcrypt.compare("Advrix@123", u.password_hash);
    console.log(`- ${u.email} | ${u.full_name} | role=${u.role_key} | active=${u.is_active} | password Advrix@123 matches: ${ok}`);
  }
}
