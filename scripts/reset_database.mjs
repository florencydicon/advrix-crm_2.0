// Advrix CRM 2.0 — Reset database: flush ALL data, keep only Super Admin.
// Run: node scripts/reset_database.mjs
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

// Load .env.local (Node 20.12+). NOTE: process.loadEnvFile does NOT override
// existing env vars, so the stale user-scope DATABASE_URL would shadow the
// project one. Delete it first to guarantee we target the live database.
delete process.env.DATABASE_URL;
try {
  process.loadEnvFile(join(rootDir, ".env.local"));
} catch (e) {
  console.error("Failed to load .env.local:", e.message);
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL not set in .env.local.");
  process.exit(1);
}

console.log("Target database host:", connectionString.split("@")[1]?.split("/")[0] || "unknown");

const sql = neon(connectionString);

async function main() {
  console.log("Applying fresh schema (flushes all data)...");
  const schema = readFileSync(join(rootDir, "database/migrations/001_initial_schema.sql"), "utf8");
  const noComments = schema
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n");
  const statements = noComments
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  for (const stmt of statements) {
    await sql(stmt);
  }

  console.log("Seeding roles...");
  const roles = [
    ["SUPER_ADMIN", "Super Admin", ["*"], "admin"],
    ["PROJECT_MANAGER", "Project Manager", ["projects:read", "projects:write", "projects:approve", "users:read"], "pm"],
    ["SALES", "Sales Executive", ["clients:write", "projects:create"], "sales"],
    ["WRITER", "Content Writer", ["tasks:execute"], "staff"],
    ["DESIGNER", "Graphic Designer", ["tasks:execute"], "staff"],
    ["EDITOR", "Video Editor", ["tasks:execute"], "staff"],
    ["SMM", "Social Media Manager", ["tasks:execute"], "staff"],
    ["VIDEOGRAPHER", "Videographer", ["tasks:execute"], "staff"],
  ];
  for (const [key, label, perms, dash] of roles) {
    await sql`INSERT INTO roles (key, label, permissions, dashboard)
              VALUES (${key}, ${label}, ${perms}, ${dash})
              ON CONFLICT (key) DO NOTHING`;
  }

  console.log("Seeding deliverable types...");
  const deliverableTypes = [
    { key: "static_post", label: "Static Post", content_role: "WRITER", visual_role: "DESIGNER", default_qty: 1, sort: 10 },
    { key: "reel", label: "Reel", content_role: "WRITER", visual_role: "EDITOR", default_qty: 1, sort: 20 },
    { key: "story", label: "Story", content_role: "WRITER", visual_role: "DESIGNER", default_qty: 1, sort: 30 },
    { key: "video_shoot", label: "Video Shoot", content_role: null, visual_role: "VIDEOGRAPHER", default_qty: 1, sort: 40 },
    { key: "video_edit", label: "Video Edit", content_role: null, visual_role: "EDITOR", default_qty: 1, sort: 50 },
    { key: "banner", label: "Banner", content_role: "WRITER", visual_role: "DESIGNER", default_qty: 1, sort: 60 },
    { key: "content_writing", label: "Content Piece", content_role: "WRITER", visual_role: null, default_qty: 1, sort: 70 },
  ];
  for (const d of deliverableTypes) {
    await sql`INSERT INTO deliverable_types (key, label, content_role, visual_role, default_qty, sort)
              VALUES (${d.key}, ${d.label}, ${d.content_role}, ${d.visual_role}, ${d.default_qty}, ${d.sort})
              ON CONFLICT (key) DO NOTHING`;
  }

  console.log("Seeding workflow steps...");
  const steps = [
    { step_key: "ideation", group_key: "ideation", name: "Script & Captions", target_role: "WRITER",
      title: "Write Script & Captions", description: "Develop the core script, captions and brand manifesto based on the project brief.",
      await: "", sequence: 10 },
    { step_key: "prod_edit", group_key: "production", name: "Video Edit", target_role: "EDITOR",
      title: "Cut & Grade Final Video", description: "Edit footage, apply color grading, cinematic cuts and final high-res render.",
      await: "ideation", sequence: 20 },
    { step_key: "prod_design", group_key: "production", name: "Design Assets", target_role: "DESIGNER",
      title: "Create Layout & Thumbnails", description: "Design thumbnails, vector layouts and brand-aligned visuals for the campaign.",
      await: "ideation", sequence: 20 },
    { step_key: "distribution", group_key: "distribution", name: "Publish & Optimize", target_role: "SMM",
      title: "Publish & Optimize Content", description: "Format for platform aspect ratios, apply SEO, schedule publishing and track engagement.",
      await: "production", sequence: 30 },
  ];
  for (const s of steps) {
    await sql`INSERT INTO workflow_steps (step_key, group_key, name, target_role, title_template, description_template, await, sequence)
              VALUES (${s.step_key}, ${s.group_key}, ${s.name}, ${s.target_role}, ${s.title}, ${s.description}, ${s.await}, ${s.sequence})
              ON CONFLICT DO NOTHING`;
  }

  const hash = bcrypt.hashSync("Advrix@123", 10);
  await sql`INSERT INTO users (full_name, email, password_hash, role_id)
            SELECT 'Advrix Admin', 'admin@advrix.com', ${hash}, r.id FROM roles r WHERE r.key = 'SUPER_ADMIN'`;

  console.log("Database flushed. Only super admin remains:");
  console.log("  Email:    admin@advrix.com");
  console.log("  Password: Advrix@123");
}

main().catch((e) => {
  console.error("Reset failed:", e);
  process.exit(1);
});
