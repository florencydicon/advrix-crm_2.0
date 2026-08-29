// Advrix CRM 2.0 — End-to-end smoke test for the unified sequential task
// workflow (Steps 1–5) against the LIVE database.
//
// It drives a throwaway project through the exact SQL the server actions run:
//   1. Project approval  -> unified _d_ task created (pending_approval)
//   2. Brief approval    -> team auto-allotted from project order (WRITER->DESIGNER->SMM)
//   3. Start / Submit    -> work snapshot into task_contributions
//   4. Gate approval     -> auto handoff to next member (advanceTaskStep)
//   5. Final approval    -> task auto-completed, project auto-completed
//   6. Cleanup           -> test client deleted, cascade verified
//
// Run: node scripts/smoke_unified_flow.mjs
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

const sql = neon(connectionString);

let failed = 0;
const ok = (name) => console.log(`  ✓ ${name}`);
const fail = (name, extra) => {
  failed++;
  console.log(`  ✗ ${name}${extra ? "\n      " + JSON.stringify(extra) : ""}`);
};
function assert(name, rows, cond) {
  if (cond) ok(name);
  else fail(name, rows);
}

const firstUserByRole = async (roleKey) => {
  const r = await sql`
    SELECT u.id, u.full_name FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE r.key = ${roleKey} AND u.is_active = true
    ORDER BY u.created_at ASC LIMIT 1`;
  return r[0];
};

async function main() {
  console.log("── Setup ─────────────────────────────────────");
  const writer = await firstUserByRole("WRITER");
  const designer = await firstUserByRole("DESIGNER");
  const smm = await firstUserByRole("SMM");
  if (!writer || !designer || !smm) {
    console.error("Need at least one active WRITER, DESIGNER and SMM user to run the smoke test.");
    process.exit(1);
  }
  console.log(`  writer=${writer.full_name} designer=${designer.full_name} smm=${smm.full_name}`);

  const client = (await sql`
    INSERT INTO clients (name, company, created_by) VALUES ('SMOKE TEST UNIFIED', NULL, ${writer.id})
    RETURNING id`)[0];
  const project = (await sql`
    INSERT INTO projects (client_id, name, status, brief, created_by)
    VALUES (${client.id}, 'Smoke Project', 'pending_approval', 'smoke brief', ${writer.id})
    RETURNING id`)[0];
  const deliv = (await sql`
    INSERT INTO project_deliverables (project_id, category_key, category_label, quantity, is_custom, custom_label)
    VALUES (${project.id}, 'static_post', 'Static Post', 1, false, NULL)
    RETURNING id`)[0];
  await sql`INSERT INTO assignments (user_id, project_id, role_key, position) VALUES (${writer.id}, ${project.id}, 'WRITER', 0)`;
  await sql`INSERT INTO assignments (user_id, project_id, role_key, position) VALUES (${designer.id}, ${project.id}, 'DESIGNER', 1)`;
  await sql`INSERT INTO assignments (user_id, project_id, role_key, position) VALUES (${smm.id}, ${project.id}, 'SMM', 2)`;
  console.log("  client/project/deliverable/assignments created.");

  // ── 1. Project approval (approveProjectAction) ─────────
  console.log("\n── Step 1: project approval ────────────────");
  await sql`UPDATE projects SET status = 'in_progress', approved_by = ${writer.id}, approved_at = now() WHERE id = ${project.id}`;
  // generateDeliverableTasks
  await sql`
    INSERT INTO tasks (project_id, step_key, group_key, role_key, deliverable_id, sequence, title, description, content, status, priority, assigned_to, created_by)
    VALUES (${project.id}, 'static_post_d_1', 'static_post', NULL, ${deliv.id}, 1, 'Static Post 01',
            'Unified deliverable "Static Post 01". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.',
            NULL, 'pending_approval', 'medium', NULL, NULL)`;
  const created_ = await sql`
    SELECT id, step_key FROM tasks WHERE project_id = ${project.id} AND step_key = 'static_post_d_1'`;
  assert("unified task created", created_, created_.length === 1);
  const id = created_[0].id;
  // computeSequentialDeadlines (set a due date on tasks missing one)
  await sql`UPDATE tasks SET due_date = (CURRENT_DATE + 2)::date WHERE project_id = ${project.id} AND due_date IS NULL`;

  let t = (await sql`SELECT * FROM tasks WHERE id = ${id}`)[0];
  assert(
    "task pending_approval, role_key NULL, current_step 0",
    t,
    t.status === "pending_approval" && t.role_key === null && t.current_step === 0
  );

  // ── 2. Brief approval + auto team (approveTaskBriefAction) ──
  console.log("\n── Step 2: brief approval + team allotment ──");
  await sql`
    UPDATE tasks SET status = 'approved', brief_approved_by = ${writer.id}, brief_approved_at = now(),
      reviewed_by = ${writer.id}, reviewed_at = now() WHERE id = ${id}`;
  // autoAllotTaskTeam -> getProjectTeamOrder -> setTaskTeam
  const members = await sql`
    SELECT user_id FROM assignments WHERE project_id = ${project.id} ORDER BY position ASC, created_at ASC`;
  await sql`DELETE FROM task_assignees WHERE task_id = ${id}`;
  for (let i = 0; i < members.length; i++) {
    await sql`
      INSERT INTO task_assignees (task_id, user_id, position) VALUES (${id}, ${members[i].user_id}, ${i})`;
  }
  const firstRole = (await sql`
    SELECT r.key FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ${members[0].user_id}`)[0].key;
  await sql`
    UPDATE tasks SET assigned_to = ${members[0].user_id}, role_key = ${firstRole}, current_step = 0 WHERE id = ${id}`;

  t = (await sql`SELECT * FROM tasks WHERE id = ${id}`)[0];
  assert(
    "brief approved + auto-allotted to WRITER",
    t,
    t.status === "approved" && !!t.brief_approved_at && t.assigned_to === writer.id && t.role_key === "WRITER"
  );
  const seqCount = await sql`SELECT COUNT(*)::text AS c FROM task_assignees WHERE task_id = ${id}`;
  assert("sequence has 3 members", seqCount, Number(seqCount[0].c) === 3);
  const posRows = await sql`SELECT user_id, position FROM task_assignees WHERE task_id = ${id} ORDER BY position ASC`;
  const posOk =
    posRows.length === 3 && posRows[0].user_id === writer.id && posRows[1].user_id === designer.id && posRows[2].user_id === smm.id;
  assert("sequence order WRITER → DESIGNER → SMM", posRows, posOk);

  // ── 3. WRITER starts ──
  console.log("\n── Step 3: member work ─────────────────────");
  await sql`UPDATE tasks SET status = 'in_progress' WHERE id = ${id}`;
  t = (await sql`SELECT * FROM tasks WHERE id = ${id}`)[0];
  assert("WRITER starts (in_progress)", t, t.status === "in_progress");

  // ── 4. WRITER submits + contribution snapshot ──
  const copyText = "Smoke copy line one\nmore detail";
  await sql`
    UPDATE tasks SET content = ${copyText}, status = 'submitted', reviewed_at = now() WHERE id = ${id}`;
  await sql`
    INSERT INTO task_contributions (task_id, step, user_id, user_name, role_label, content, status, submitted_at)
    VALUES (${id}, 0, ${writer.id}, ${writer.full_name}, 'WRITER', ${copyText}, 'submitted', now())`;
  t = (await sql`SELECT * FROM tasks WHERE id = ${id}`)[0];
  assert("WRITER submits (submitted + content saved)", t, t.status === "submitted" && !!t.content);

  // ── 5. Gate approval -> advance to DESIGNER ──
  const advance = async (expectRole, stepIndex) => {
    await sql`
      UPDATE task_contributions SET status = 'approved', reviewed_by = ${writer.id}, reviewed_at = now()
      WHERE task_id = ${id} AND step = ${stepIndex} AND status = 'submitted'`;
    const seq = await sql`
      SELECT ta.user_id, r.key AS role_key FROM task_assignees ta
      LEFT JOIN users u ON u.id = ta.user_id
      LEFT JOIN roles r ON r.id = u.role_id
      WHERE ta.task_id = ${id} ORDER BY ta.position ASC, ta.added_at ASC`;
    const next = seq[stepIndex + 1];
    if (next && next.user_id) {
      await sql`
        UPDATE tasks SET current_step = ${stepIndex + 1}, assigned_to = ${next.user_id}, role_key = ${next.role_key},
          status = 'approved' WHERE id = ${id}`;
    }
  };
  const stepMember = async (content, contributionStep) => {
    await sql`UPDATE tasks SET status = 'in_progress' WHERE id = ${id}`;
    await sql`UPDATE tasks SET content = ${content}, status = 'submitted', reviewed_at = now() WHERE id = ${id}`;
    const who = (await sql`SELECT assigned_to, role_key FROM tasks WHERE id = ${id}`)[0];
    const user = (await sql`SELECT full_name FROM users WHERE id = ${who.assigned_to}`)[0];
    await sql`
      INSERT INTO task_contributions (task_id, step, user_id, user_name, role_label, content, status, submitted_at)
      VALUES (${id}, ${contributionStep}, ${who.assigned_to}, ${user.full_name}, ${who.role_key}, ${content}, 'submitted', now())`;
    return who;
  };

  await advance("DESIGNER", 0);
  t = (await sql`SELECT * FROM tasks WHERE id = ${id}`)[0];
  assert(
    "gate approval → handoff to DESIGNER (approved, step 1)",
    t,
    t.status === "approved" && t.assigned_to === designer.id && t.role_key === "DESIGNER" && t.current_step === 1
  );

  // ── 6. DESIGNER work ──
  await stepMember("asset link: http://cdn/x.png", 1);
  await advance("SMM", 1);
  t = (await sql`SELECT * FROM tasks WHERE id = ${id}`)[0];
  assert(
    "gate approval → handoff to SMM (approved, step 2)",
    t,
    t.status === "approved" && t.assigned_to === smm.id && t.role_key === "SMM" && t.current_step === 2
  );

  // ── 7. SMM work + final approval -> auto-complete ──
  await stepMember("posted to platforms", 2);
  await sql`
    UPDATE task_contributions SET status = 'approved', reviewed_by = ${writer.id}, reviewed_at = now()
    WHERE task_id = ${id} AND step = 2 AND status = 'submitted'`;
  // advanceTaskStep: no member after SMM -> complete
  await sql`UPDATE tasks SET status = 'completed', completed_at = now() WHERE id = ${id}`;
  t = (await sql`SELECT * FROM tasks WHERE id = ${id}`)[0];
  assert("auto-complete after final approval", t, t.status === "completed" && !!t.completed_at);

  // maybeCompleteProject
  const openT = await sql`
    SELECT COUNT(*)::text AS c FROM tasks WHERE project_id = ${project.id} AND status <> 'completed'`;
  if (Number(openT[0].c) === 0) {
    await sql`UPDATE projects SET status = 'completed' WHERE id = ${project.id}`;
  }
  const p = (await sql`SELECT status FROM projects WHERE id = ${project.id}`)[0];
  assert("project auto-completed", p, p.status === "completed");

  const contribs = await sql`
    SELECT step, status FROM task_contributions WHERE task_id = ${id} ORDER BY step ASC`;
  assert(
    "3 contributions all approved",
    contribs,
    contribs.length === 3 && contribs.every((c) => c.status === "approved")
  );

  // ── 8. Deliverable-level sequences + bulk approve ──
  console.log("\n── Step 8: deliverable sequences + bulk approve ──");
  const p2 = (await sql`
    INSERT INTO projects (client_id, name, status, brief, created_by)
    VALUES (${client.id}, 'Smoke Project DelivSeq', 'pending_approval', 'divseq brief', ${writer.id})
    RETURNING id`)[0];
  const d2 = (await sql`
    INSERT INTO project_deliverables (project_id, category_key, category_label, quantity, is_custom, custom_label)
    VALUES (${p2.id}, 'story_post', 'Story Post', 3, false, NULL)
    RETURNING id`)[0];
  // Project-order fallback EXISTS, but the deliverable sequence must WIN.
  await sql`INSERT INTO assignments (user_id, project_id, role_key, position) VALUES (${writer.id}, ${p2.id}, 'WRITER', 0)`;
  await sql`INSERT INTO assignments (user_id, project_id, role_key, position) VALUES (${designer.id}, ${p2.id}, 'DESIGNER', 1)`;
  await sql`INSERT INTO assignments (user_id, project_id, role_key, position) VALUES (${smm.id}, ${p2.id}, 'SMM', 2)`;

  const mkTask = async (stepKey, seq) =>
    (
      await sql`
        INSERT INTO tasks (project_id, step_key, group_key, role_key, deliverable_id, sequence, title, description, content, status, priority, assigned_to, created_by)
        VALUES (${p2.id}, ${stepKey}, 'story_post', NULL, ${d2.id}, ${seq}, ${"Story Post " + seq}, 'Unified deliverable "Story Post".',
                NULL, 'pending_approval', 'medium', NULL, NULL)
        RETURNING id`
    )[0].id;

  const id2 = await mkTask("story_post_d_1", 1);
  const id3 = await mkTask("story_post_d_2", 2);
  const id4 = await mkTask("story_post_d_3", 3);

  // Save a deliverable sequence (setDeliverableSequenceAction -> setDeliverableTeam).
  // SMALL order differs from the project order on purpose: smm first proves precedence.
  await sql`DELETE FROM deliverable_assignees WHERE deliverable_id = ${d2.id}`;
  await sql`INSERT INTO deliverable_assignees (deliverable_id, user_id, position) VALUES (${d2.id}, ${smm.id}, 0)`;
  await sql`INSERT INTO deliverable_assignees (deliverable_id, user_id, position) VALUES (${d2.id}, ${writer.id}, 1)`;
  await sql`INSERT INTO deliverable_assignees (deliverable_id, user_id, position) VALUES (${d2.id}, ${designer.id}, 2)`;

  // Bulk approve (approveAllBriefsAction): approve + autoAllotTaskTeam (deliverable-first).
  const approveAndAllot = async (tid) => {
    await sql`
      UPDATE tasks SET status = 'approved', brief_approved_by = ${writer.id}, brief_approved_at = now(),
        reviewed_by = ${writer.id}, reviewed_at = now() WHERE id = ${tid}`;
    const members = await sql`
      SELECT user_id FROM deliverable_assignees WHERE deliverable_id = ${d2.id} ORDER BY position ASC, added_at ASC`;
    await sql`DELETE FROM task_assignees WHERE task_id = ${tid}`;
    for (let i = 0; i < members.length; i++) {
      await sql`INSERT INTO task_assignees (task_id, user_id, position) VALUES (${tid}, ${members[i].user_id}, ${i})`;
    }
    const firstRole = (
      await sql`SELECT r.key FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ${members[0].user_id}`
    )[0].key;
    await sql`UPDATE tasks SET assigned_to = ${members[0].user_id}, role_key = ${firstRole}, current_step = 0 WHERE id = ${tid}`;
  };
  await approveAndAllot(id2);
  await approveAndAllot(id3);

  const d2first = (await sql`SELECT assigned_to, current_step FROM tasks WHERE id = ${id2}`)[0];
  assert(
    "deliverable sequence wins over project order (SMM first)",
    d2first,
    d2first.assigned_to === smm.id && d2first.current_step === 0
  );
  const d2rows = await sql`
    SELECT ta.user_id FROM task_assignees ta WHERE ta.task_id = ${id2} ORDER BY ta.position ASC`;
  assert(
    "inherited order SMM → WRITER → DESIGNER",
    d2rows,
    d2rows.length === 3 && d2rows[0].user_id === smm.id && d2rows[1].user_id === writer.id && d2rows[2].user_id === designer.id
  );
  const d3rows = await sql`SELECT COUNT(*)::text AS c FROM task_assignees WHERE task_id = ${id3}`;
  assert("bulk approve covers story_post_d_2", d3rows, Number(d3rows[0].c) === 3);

  // Edit the deliverable sequence — must re-apply to every approved-not-started item.
  await approveAndAllot(id4);
  await sql`DELETE FROM deliverable_assignees WHERE deliverable_id = ${d2.id}`;
  await sql`INSERT INTO deliverable_assignees (deliverable_id, user_id, position) VALUES (${d2.id}, ${designer.id}, 0)`;
  await sql`INSERT INTO deliverable_assignees (deliverable_id, user_id, position) VALUES (${d2.id}, ${smm.id}, 1)`;
  await sql`INSERT INTO deliverable_assignees (deliverable_id, user_id, position) VALUES (${d2.id}, ${writer.id}, 2)`;
  const approvedTasks = await sql`
    SELECT id FROM tasks WHERE deliverable_id = ${d2.id} AND status = 'approved'`;
  for (const row of approvedTasks) {
    await sql`DELETE FROM task_assignees WHERE task_id = ${row.id}`;
    await sql`INSERT INTO task_assignees (task_id, user_id, position) VALUES (${row.id}, ${designer.id}, 0)`;
    await sql`INSERT INTO task_assignees (task_id, user_id, position) VALUES (${row.id}, ${smm.id}, 1)`;
    await sql`INSERT INTO task_assignees (task_id, user_id, position) VALUES (${row.id}, ${writer.id}, 2)`;
    await sql`UPDATE tasks SET assigned_to = ${designer.id}, role_key = 'DESIGNER', current_step = 0 WHERE id = ${row.id}`;
  }
  const reRow = await sql`
    SELECT ta.user_id FROM task_assignees ta WHERE ta.task_id = ${id2} ORDER BY ta.position ASC`;
  assert(
    "editing deliverable sequence re-applies to approved-not-started items",
    reRow,
    reRow.length === 3 && reRow[0].user_id === designer.id && reRow[1].user_id === smm.id && reRow[2].user_id === writer.id
  );

  // ── Cleanup ──
  console.log("\n── Cleanup ─────────────────────────────────");
  await sql`DELETE FROM clients WHERE id = ${client.id}`;
  const orphanTasks = await sql`
    SELECT COUNT(*)::text AS c FROM tasks WHERE project_id = ${project.id}`;
  const orphanAssignees = await sql`
    SELECT COUNT(*)::text AS c FROM task_assignees WHERE task_id = ${id}`;
  const orphanContribs = await sql`
    SELECT COUNT(*)::text AS c FROM task_contributions WHERE task_id = ${id}`;
  assert("cascade cleaned tasks", orphanTasks, Number(orphanTasks[0].c) === 0);
  assert("cascade cleaned task_assignees", orphanAssignees, Number(orphanAssignees[0].c) === 0);
  assert("cascade cleaned task_contributions", orphanContribs, Number(orphanContribs[0].c) === 0);
  const orphanDelivSeq = await sql`
    SELECT COUNT(*)::text AS c FROM deliverable_assignees WHERE deliverable_id = ${d2.id}`;
  assert("cascade cleaned deliverable_assignees", orphanDelivSeq, Number(orphanDelivSeq[0].c) === 0);
  const p2Tasks = await sql`
    SELECT COUNT(*)::text AS c FROM tasks WHERE project_id = ${p2.id}`;
  assert("cascade cleaned second project's tasks", p2Tasks, Number(p2Tasks[0].c) === 0);

  console.log(failed === 0 ? "\nALL CHECKS PASSED ✅" : `\n${failed} CHECK(S) FAILED ❌`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("Smoke test crashed:", e);
  process.exit(1);
});