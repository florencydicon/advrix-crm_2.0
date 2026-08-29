// Advrix CRM 2.0 — Backfill legacy projects onto the unified sequential workflow.
//
// For every project that still has legacy _c_ / _v_ sub-tasks (the old
// "content + visual" role-lane model), this creates the matching unified _d_
// deliverable tasks and deletes the superseded legacy ones so there is no
// duplicated deliverable in any UI.
//
//   - Unified _d_ tasks are created exactly like generateDeliverableTasks():
//     status 'pending_approval', role_key NULL (team null until brief approval).
//   - A deliverable whose legacy content (+visual, if any) tasks were ALL
//     completed is created directly as 'completed' with the content recorded.
//   - Any legacy copy/content found is carried into the new _d_ task so
//     in-flight work is never lost.
//   - Projects that already have _d_ tasks get a clean-up only pass: legacy
//     content is copied into the matching _d_ task and legacy tasks deleted.
//
// Runs in DRY-RUN mode by default and prints a full plan.
// Pass --apply to execute against the database.
//
// Run: node scripts/backfill_unified_tasks.mjs [--apply]
import { neon } from "@neondatabase/serverless";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

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
const APPLY = process.argv.includes("--apply");

const pad = (n) => String(n).padStart(2, "0");

async function main() {
  const projects = await sql`
    SELECT DISTINCT p.id, p.name, c.name AS client_name
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    JOIN clients c ON c.id = p.client_id
    WHERE t.step_key ~ '_[cv]_[0-9]+$'
    ORDER BY p.name`;

  console.log(`\nFound ${projects.length} project(s) with legacy _c_/_v_ tasks.\n`);

  let created = 0;
  let copied = 0;
  let deleted = 0;
  let completedUpgraded = 0;

  for (const proj of projects) {
    const pid = proj.id;
    const deliverables = await sql`
      SELECT * FROM project_deliverables WHERE project_id = ${pid} ORDER BY created_at`;
    const legacy = await sql`
      SELECT id, step_key, content, title, status, role_key, assigned_to, deliverable_id, due_date::text AS due_date
      FROM tasks WHERE project_id = ${pid} AND step_key ~ '_[cv]_[0-9]+$'`;
    const existingD = await sql`
      SELECT id, step_key, content FROM tasks WHERE project_id = ${pid} AND step_key ~ '_d_[0-9]+$'`;

    const hasUnified = existingD.length > 0;
    console.log(
      `${proj.name} (${proj.client_name})${hasUnified ? "  [clean-up only — _d_ tasks exist]" : ""}`
    );
    console.log(`  legacy _c_/_v_: ${legacy.length} | _d_ tasks: ${existingD.length} | deliverables: ${deliverables.length}`);

    const byKey = new Map();
    for (const t of legacy) {
      const m = t.step_key.match(/^(.*)_[cv]_(\d+)$/);
      if (!m) continue;
      const key = `${m[1]}_d_${m[2]}`;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(t);
    }

    for (const d of deliverables) {
      for (let i = 1; i <= d.quantity; i++) {
        const stepKey = `${d.category_key}_d_${i}`;
        const related = byKey.get(stepKey) || [];
        const contentTask = related.find((t) => t.step_key.endsWith(`_c_${i}`));
        const visualTask = related.find((t) => t.step_key.endsWith(`_v_${i}`));
        const existing = existingD.find((t) => t.step_key === stepKey);
        const srcContent = contentTask?.content || visualTask?.content || null;
        const label = d.is_custom && d.custom_label ? d.custom_label : d.category_label;
        const title = `${label} ${pad(i)}`;
        const legacyAllDone =
          !!contentTask &&
          contentTask.status === "completed" &&
          (!visualTask || visualTask.status === "completed");
        const due = contentTask?.due_date || visualTask?.due_date || null;

        if (!existing) {
          if (APPLY) {
            const insertStatus = legacyAllDone ? "completed" : "pending_approval";
            await sql`
              INSERT INTO tasks (project_id, step_key, group_key, role_key, deliverable_id, sequence, title, description, brief_copy, content, status, priority, assigned_to, created_by, due_date, completed_at)
              VALUES (${pid}, ${stepKey}, ${d.category_key}, NULL, ${d.id}, 1, ${title},
                      ${`Unified deliverable "${title}". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.`},
                      ${srcContent ? srcContent.split("\n")[0].slice(0, 200) : null},
                      ${srcContent}, ${insertStatus}, 'medium', NULL, NULL,
                      ${due ?? null}, ${legacyAllDone ? new Date() : null})`;
          }
          created++;
          if (srcContent) copied++;
          if (legacyAllDone) completedUpgraded++;
        } else if (APPLY && !existing.content && srcContent) {
          await sql`
            UPDATE tasks SET content = ${srcContent},
              brief_copy = COALESCE(brief_copy, LEFT(${srcContent.split("\n")[0]}, 200))
            WHERE id = ${existing.id}`;
          copied++;
        }
      }
    }

    if (APPLY) {
      const del = await sql`
        DELETE FROM tasks WHERE project_id = ${pid} AND step_key ~ '_[cv]_[0-9]+$' RETURNING id`;
      deleted += del.length;
      // Recheck project completion after legacy tasks are removed.
      const open = await sql`
        SELECT COUNT(*)::text AS c FROM tasks WHERE project_id = ${pid} AND status <> 'completed'`;
      const has = await sql`
        SELECT COUNT(*)::text AS c FROM tasks WHERE project_id = ${pid}`;
      if (Number(has[0].c) > 0 && Number(open[0].c) === 0) {
        await sql`UPDATE projects SET status = 'completed' WHERE id = ${pid}`;
      }
    } else {
      deleted += legacy.length;
    }
  }

  console.log(`\n========== SUMMARY ==========`);
  console.log(`projects processed:        ${projects.length}`);
  console.log(`_d_ tasks created:         ${created}`);
  console.log(`content carry-overs:       ${copied}`);
  console.log(`legacy _c_/_v_ deleted:    ${deleted}`);
  console.log(`deliverables marked done:  ${completedUpgraded}`);
  console.log(APPLY ? "STATUS: APPLIED.\n" : "STATUS: DRY-RUN (pass --apply to execute).\n");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Backfill failed:", e);
    process.exit(1);
  });