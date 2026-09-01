import { neon } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";
const sql = neon(process.env.DATABASE_URL);

const ok = [];
const fail = [];
const check = (label, cond) => {
  if (cond) { ok.push(label); console.log("PASS", label); }
  else { fail.push(label); console.log("FAIL", label); }
};

// Faithful copy of the engine's cascade (see src/lib/workflow.ts).
async function runWorkflow(projectId) {
  const steps = await sql("SELECT * FROM workflow_steps WHERE active = true ORDER BY sequence, id");
  for (let pass = 0; pass < steps.length + 2; pass++) {
    const tasks = await sql("SELECT id, step_key, status FROM tasks WHERE project_id = $1", [projectId]);
    const byStep = {};
    for (const t of tasks) (byStep[t.step_key] ||= []).push(t);

    const groupStatus = {};
    for (const s of steps) {
      const inGroup = steps.filter((x) => x.group_key === s.group_key).flatMap((x) => byStep[x.step_key] || []);
      const created = inGroup.length > 0;
      groupStatus[s.group_key] = { created, completed: created && inGroup.every((t) => t.status === "completed") };
    }

    let changed = false;
    for (const s of steps) {
      if ((byStep[s.step_key] || []).length > 0) continue;
      const prereqs = String(s.await || "").split(",").map((x) => x.trim()).filter(Boolean);
      const ready = prereqs.every((g) => groupStatus[g]?.completed === true);
      if (!ready) continue;
      const assignee = (await sql("SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE r.key = $1 AND u.is_active = true ORDER BY u.created_at ASC LIMIT 1", [s.target_role]))[0]?.id ?? null;
      await sql("INSERT INTO tasks (project_id, step_key, group_key, role_key, title, description, status, priority, assigned_to, created_by, due_date) VALUES ($1,$2,$3,$4,$5,$6,'approved','medium',$7,NULL,NULL)",
        [projectId, s.step_key, s.group_key, s.target_role, s.title_template, s.description_template, assignee]);
      changed = true;
    }
    if (!changed) break;
  }
  const open = await sql("SELECT COUNT(*)::text AS c FROM tasks t WHERE t.project_id = $1 AND t.group_key = 'distribution' AND t.status <> 'completed'", [projectId]);
  if (Number(open[0].c) === 0) await sql("UPDATE projects SET status = 'completed' WHERE id = $1", [projectId]);
}

const t = async (label, text, params) => {
  try { return await sql(text, params); } catch (e) { console.error("SQL ERROR:", label, e.message); throw e; }
};

(async () => {
  const projId = randomUUID();
  const clientId = randomUUID();
  const salesId = (await t("sales", "SELECT u.id FROM users u JOIN roles r ON r.id=u.role_id WHERE r.key='SALES' LIMIT 1"))[0].id;

  await t("client", "INSERT INTO clients (id, name, company) VALUES ($1,'WF Test Client','T')", [clientId]);
  await t("project", "INSERT INTO projects (id, client_id, name, status, created_by) VALUES ($1,$2,'WF Test Project','in_progress',$3)", [projId, clientId, salesId]);

  await runWorkflow(projId);
  let tasks = await t("t1", "SELECT id, step_key, group_key, status, assigned_to FROM tasks WHERE project_id=$1", [projId]);
  check("approval -> writer ideation task created", tasks.length === 1 && tasks[0].step_key === "ideation" && tasks[0].group_key === "ideation");
  check("ideation auto-assigned to writer", tasks[0].assigned_to !== null);

  const writerId = (await t("writer", "SELECT u.id FROM users u JOIN roles r ON r.id=u.role_id WHERE r.key='WRITER' LIMIT 1"))[0].id;
  const ideaTask = tasks[0];
  await t("complete-idea", "UPDATE tasks SET status='completed', completed_at=now() WHERE id=$1", [ideaTask.id]);
  await runWorkflow(projId);

  tasks = await t("t2", "SELECT id, step_key, group_key, status FROM tasks WHERE project_id=$1 ORDER BY created_at", [projId]);
  const prodTasks = tasks.filter((x) => x.group_key === "production");
  check("writer complete -> editor + designer auto-created", prodTasks.length === 2);
  check("no distribution yet (gate not met)", !tasks.some((x) => x.group_key === "distribution"));

  for (const pt of prodTasks) await t("complete-prod", "UPDATE tasks SET status='completed', completed_at=now() WHERE id=$1", [pt.id]);
  await runWorkflow(projId);
  tasks = await t("t3", "SELECT step_key, group_key FROM tasks WHERE project_id=$1", [projId]);
  check("both production complete -> SMM distribution auto-created", tasks.some((x) => x.group_key === "distribution"));

  const distTask = (await t("t4", "SELECT id FROM tasks WHERE project_id=$1 AND group_key='distribution'", [projId]))[0];
  await t("complete-dist", "UPDATE tasks SET status='completed', completed_at=now() WHERE id=$1", [distTask.id]);
  await runWorkflow(projId);
  const proj = (await t("proj", "SELECT status FROM projects WHERE id=$1", [projId]))[0];
  check("distribution complete -> project marked completed", proj.status === "completed");

  await t("cleanup-tasks", "DELETE FROM tasks WHERE project_id=$1", [projId]);
  await t("cleanup-proj", "DELETE FROM projects WHERE id=$1", [projId]);
  await t("cleanup-client", "DELETE FROM clients WHERE id=$1", [clientId]);

  console.log("\n" + (fail.length ? `FAILED: ${fail.length}` : `ALL ${ok.length} WORKFLOW CHECKS PASSED`));
  if (fail.length) process.exit(1);
})();
