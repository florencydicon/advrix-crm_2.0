// Advrix CRM 2.0 — Schema apply + demo seed.
// Run: node scripts/seed.mjs
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL not set. Copy .env.local values into your shell.");
  process.exit(1);
}

const sql = neon(connectionString);

async function main() {
  console.log("Applying schema...");
  const schema = readFileSync(join(__dirname, "../database/migrations/001_initial_schema.sql"), "utf8");
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
    { key: "video_shoot", label: "Video Shoot", content_role: "WRITER", visual_role: "EDITOR", default_qty: 1, sort: 40 },
    { key: "video_edit", label: "Video Edit", content_role: "WRITER", visual_role: "EDITOR", default_qty: 1, sort: 50 },
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

  const hash = bcrypt.hashSync("password123", 10);
  console.log("Seeding demo users...");
  const users = [
    ["Admin User", "admin@advrix.agency", "SUPER_ADMIN"],
    ["Priya Mehta", "pm@advrix.agency", "PROJECT_MANAGER"],
    ["Rohan Kapoor", "sales@advrix.agency", "SALES"],
    ["Aisha Verma", "writer@advrix.agency", "WRITER"],
    ["Kabir Singh", "designer@advrix.agency", "DESIGNER"],
    ["Maya Iyer", "editor@advrix.agency", "EDITOR"],
    ["Dev Malhotra", "smm@advrix.agency", "SMM"],
  ];
  for (const [name, email, roleKey] of users) {
    await sql`INSERT INTO users (full_name, email, password_hash, role_id)
              SELECT ${name}, ${email}, ${hash}, r.id FROM roles r WHERE r.key = ${roleKey}
              ON CONFLICT (email) DO NOTHING`;
  }

  console.log("Seeding demo client + project...");
  const clientRes = await sql`SELECT id FROM clients LIMIT 1`;
  let clientId;
  if (clientRes.length === 0) {
    const inserted = await sql`INSERT INTO clients (name, company, email, phone) VALUES ('Lumina Cosmetics', 'Lumina Pvt Ltd', 'hello@lumina.in', '+91 98765 00000') RETURNING id`;
    clientId = inserted[0].id;
  } else {
    clientId = clientRes[0].id;
  }

  const pmRes = await sql`SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE r.key = 'PROJECT_MANAGER' LIMIT 1`;
  const salesRes = await sql`SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE r.key = 'SALES' LIMIT 1`;
  const projRes = await sql`SELECT id FROM projects WHERE client_id = ${clientId} LIMIT 1`;
  let projectId;
  if (projRes.length === 0 && pmRes.length > 0) {
    const inserted = await sql`INSERT INTO projects (client_id, name, status, brief, deliverables, deadline, created_by)
              VALUES (${clientId}, 'Summer Glow Campaign 2026', 'pending_approval',
              'Launch campaign for the new vitamin-C skincare range. Create a 60s brand film and a set of social thumbnails.',
              '8 x Static Posts, 2 x Reels',
              '2026-09-30', ${salesRes[0]?.id}) RETURNING id`;
    projectId = inserted[0].id;

    await sql`INSERT INTO project_deliverables (project_id, category_key, category_label, quantity, is_custom, custom_label)
              VALUES (${projectId}, 'static_post', 'Static Post', 8, false, NULL)`;
    await sql`INSERT INTO project_deliverables (project_id, category_key, category_label, quantity, is_custom, custom_label)
              VALUES (${projectId}, 'reel', 'Reel', 2, false, NULL)`;
  } else {
    projectId = projRes[0]?.id;
  }

  console.log("Done. Demo logins (password123):");
  console.log("  admin@advrix.agency, pm@advrix.agency, sales@advrix.agency");
  console.log("  writer@advrix.agency, designer@advrix.agency, editor@advrix.agency, smm@advrix.agency");
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});