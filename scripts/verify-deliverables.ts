// End-to-end verification of the deliverables workflow engine.
// Run: npx tsx scripts/verify-deliverables.ts
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local so tsx picks up the live DATABASE_URL (bypasses stale user env).
const envFile = readFileSync(join(__dirname, "../.env.local"), "utf8");
const dbUrl = envFile
  .split("\n")
  .map((l) => l.trim())
  .find((l) => l.startsWith("DATABASE_URL="))
  ?.replace(/^DATABASE_URL=["']?/, "")
  .replace(/["']$/, "");
if (!dbUrl) {
  console.error("DATABASE_URL missing from .env.local");
  process.exit(1);
}

const sql = neon(dbUrl);

const checks: { name: string; pass: boolean; detail?: string }[] = [];
function check(name: string, cond: boolean, detail?: string) {
  checks.push({ name, pass: cond, detail });
  console.log(`${cond ? "PASS" : "FAIL"} — ${name}${detail ? ` (${detail})` : ""}`);
}

async function main() {
  // 1. Create client + project with deliverables (15 Static Posts + 5 Reels)
  const client = (
    await sql`INSERT INTO clients (name, company, email, phone) VALUES ('Aryush Heights', 'Aryush Realty', 'marketing@aryushheights.com', '+91 98111 22333') RETURNING id`
  )[0];

  const proj = (
    await sql`INSERT INTO projects (client_id, name, status, brief, deliverables, deadline, created_by)
      VALUES (${client.id}, 'Aryush Height — Q3 Content Campaign', 'pending_approval',
      'Q3 social media campaign promoting the new Aryush Heights residential tower. Highlight premium amenities, skyline views and the launch offer.',
      '15 x Static Posts, 5 x Reels', '2026-10-15', NULL) RETURNING id`
  )[0];

  await sql`INSERT INTO project_deliverables (project_id, category_key, category_label, quantity) VALUES (${proj.id}, 'static_post', 'Static Post', 15)`;
  await sql`INSERT INTO project_deliverables (project_id, category_key, category_label, quantity) VALUES (${proj.id}, 'reel', 'Reel', 5)`;

  // 2. Approve (simulate approveProjectAction flow)
  await sql`UPDATE projects SET status = 'in_progress' WHERE id = ${proj.id}`;

  // 3. Run engine: generateDeliverableTasks
  const { generateDeliverableTasks } = await import("@/lib/workflow");
  await generateDeliverableTasks(proj.id);

  const contentTasks = await sql`SELECT * FROM tasks WHERE project_id = ${proj.id} AND sequence = 1 ORDER BY title`;
  check(
    "Generated exactly 20 content tasks (15 posts + 5 reels)",
    contentTasks.length === 20,
    `${contentTasks.length} content tasks`
  );
  const postTasks = contentTasks.filter((t) => t.title.includes("Static Post"));
  const reelTasks = contentTasks.filter((t) => t.title.includes("Reel"));
  check("15 static post tasks", postTasks.length === 15, `${postTasks.length} posts`);
  check("5 reel tasks", reelTasks.length === 5, `${reelTasks.length} reels`);
  check(
    "Titles formatted 'Static Post 01'..'Static Post 15'",
    postTasks[0].title === "Static Post 01 — Content & Copy" && postTasks[14].title === "Static Post 15 — Content & Copy",
    `${postTasks[0].title} … ${postTasks[14].title}`
  );
  check("Titles formatted 'Reel 01'..'Reel 05'", reelTasks[0].title === "Reel 01 — Content & Copy" && reelTasks[4].title === "Reel 05 — Content & Copy");

  const writerRole = contentTasks.every((t) => t.role_key === "WRITER");
  check("All content tasks assigned to WRITER role", writerRole);
  const noVisualsYet = (await sql`SELECT COUNT(*)::int AS c FROM tasks WHERE project_id = ${proj.id} AND sequence = 2`)[0].c === 0;
  check("No visual tasks spawned before copy is approved", noVisualsYet);

  // 4. Team allocation (multi-role: one member may hold several roles)
  const users = await sql`SELECT u.id, r.key AS role_key FROM users u JOIN roles r ON r.id = u.role_id`;
  const { allocateProjectTeam } = await import("@/lib/workflow");
  await allocateProjectTeam(
    proj.id,
    users.filter((u) => ["WRITER", "DESIGNER", "EDITOR"].includes(u.role_key)).map((u) => ({ role_key: u.role_key, user_id: u.id }))
  );

  const allocRows = await sql`SELECT COUNT(*)::int AS c FROM assignments WHERE project_id = ${proj.id}`;
  check("3 role allocations stored", allocRows[0].c === 3, `${allocRows[0].c} allocations`);

  const assigned = await sql`SELECT COUNT(*)::int AS c FROM tasks WHERE project_id = ${proj.id} AND assigned_to IS NOT NULL`;
  check("All 20 content tasks auto-assigned to team members", assigned[0].c === 20, `${assigned[0].c} assigned`);

  // 5. Writer completes one Static Post task -> visual task must spawn
  const post1 = contentTasks.find((t) => t.title === "Static Post 01 — Content & Copy");
  if (!post1) {
    console.error("Static Post 01 task missing");
    process.exit(1);
  }
  await sql`UPDATE tasks SET status = 'completed', completed_at = now(), content = 'Final copy for Static Post 01 approved.' WHERE id = ${post1.id}`;
  const { handleDeliverableTaskCompleted } = await import("@/lib/workflow");
  await handleDeliverableTaskCompleted(proj.id, post1.id);

  const visuals = await sql`SELECT * FROM tasks WHERE project_id = ${proj.id} AND sequence = 2 ORDER BY title`;
  check("1 visual task spawned after content completion", visuals.length === 1, `${visuals.length} visual tasks`);

  const visual1 = visuals[0];
  const isDesigner = visual1.role_key === "DESIGNER";
  const visualTitle = visual1.title.includes("Static Post 01") && visual1.title.includes("Visual");
  check("Visual task assigned to DESIGNER with correct title", isDesigner && visualTitle, `${visual1.role_key}: ${visual1.title}`);
  check("Visual task auto-assigned to allocated designer", visual1.assigned_to != null);

  // 6. Writer completes all 15 posts + 5 reels content -> 20 visuals spawned
  const remaining = contentTasks.filter((t) => t.id !== post1.id);
  for (const t of remaining) {
    await sql`UPDATE tasks SET status = 'completed', completed_at = now(), content = 'Approved copy.' WHERE id = ${t.id}`;
    await handleDeliverableTaskCompleted(proj.id, t.id);
  }
  const allVisuals = await sql`SELECT COUNT(*)::int AS c FROM tasks WHERE project_id = ${proj.id} AND sequence = 2`;
  check("Total 20 visual tasks spawned (15 designer + 5 editor)", allVisuals[0].c === 20, `${allVisuals[0].c} visual tasks`);

  const designerVisuals = await sql`SELECT COUNT(*)::int AS c FROM tasks WHERE project_id = ${proj.id} AND sequence = 2 AND role_key = 'DESIGNER'`;
  const editorVisuals = await sql`SELECT COUNT(*)::int AS c FROM tasks WHERE project_id = ${proj.id} AND sequence = 2 AND role_key = 'EDITOR'`;
  check("15 DESIGNER visual tasks", designerVisuals[0].c === 15);
  check("5 EDITOR visual tasks", editorVisuals[0].c === 5);

  // 7. Complete all visual tasks -> project auto-completes
  for (const v of allVisuals.length ? await sql`SELECT id FROM tasks WHERE project_id = ${proj.id} AND sequence = 2` : []) {
    await sql`UPDATE tasks SET status = 'completed', completed_at = now() WHERE id = ${v.id}`;
    await handleDeliverableTaskCompleted(proj.id, v.id);
  }
  const projStatus = (await sql`SELECT status FROM projects WHERE id = ${proj.id}`)[0].status;
  check("Project auto-completed when all 40 tasks done", projStatus === "completed", `status=${projStatus}`);

  // Cleanup test data
  await sql`DELETE FROM projects WHERE id = ${proj.id}`;
  await sql`DELETE FROM clients WHERE id = ${client.id}`;
  console.log("\nCleaned up test project & client.");

  const failed = checks.filter((c) => !c.pass);
  console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
  if (failed.length > 0) process.exit(1);
}

main().catch((e) => {
  console.error("Verification failed:", e);
  process.exit(1);
});
