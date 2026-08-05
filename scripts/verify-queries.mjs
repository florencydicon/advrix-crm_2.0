import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);

const step = (label) => console.log(`\n== ${label}`);
const q = async (text, params) => {
  try {
    const r = await sql(text, params);
    console.log("OK", r.length, "rows");
    return r;
  } catch (e) {
    console.error("FAIL", e.message);
    process.exitCode = 1;
    return [];
  }
};

// Replicate the engine's core queries against seeded data.
const P = async () => {
  step("getProjects (join clients)");
  await q(`SELECT p.*, c.name AS client_name FROM projects p JOIN clients c ON c.id = p.client_id ORDER BY p.created_at DESC`);

  step("getBoard group fetch (workflow_steps distinct)");
  await q(`SELECT DISTINCT group_key, name, sequence FROM workflow_steps ORDER BY sequence`);

  step("my tasks (staff)");
  await q(`SELECT t.*, p.name AS project_name, c.name AS client_name, u.full_name AS assignee_name
           FROM tasks t JOIN projects p ON p.id = t.project_id JOIN clients c ON c.id = p.client_id
           LEFT JOIN users u ON u.id = t.assigned_to WHERE t.assigned_to = $1 ORDER BY t.created_at ASC`, ["00000000-0000-0000-0000-000000000000"]);

  step("bottlenecks");
  await q(`SELECT p.id AS project_id, p.name AS project_name, t.id AS task_id, t.title, u.full_name AS assignee_name,
                  r.label AS role_label, EXTRACT(DAY FROM now() - t.created_at)::int AS days_open
           FROM tasks t JOIN projects p ON p.id = t.project_id LEFT JOIN users u ON u.id = t.assigned_to
           LEFT JOIN roles r ON r.id = u.role_id WHERE t.status <> 'completed' AND p.status = 'in_progress' ORDER BY days_open DESC LIMIT 12`);

  step("analytics aggregate");
  await q(`SELECT (SELECT COUNT(*) FROM projects)::text AS total_projects,
                  (SELECT COUNT(*) FROM projects WHERE status='in_progress')::text AS in_progress,
                  (SELECT COUNT(*) FROM projects WHERE status='completed')::text AS completed_projects,
                  (SELECT COUNT(*) FROM projects WHERE status='pending_approval')::text AS pending_approval,
                  (SELECT COUNT(*) FROM tasks)::text AS total_tasks,
                  (SELECT COUNT(*) FROM tasks WHERE status='completed')::text AS completed_tasks`);

  step("analytics by role");
  await q(`SELECT r.label AS role_label, COUNT(t.id)::text AS total,
                  COUNT(t.id) FILTER (WHERE t.status='completed')::text AS completed
           FROM workflow_steps ws JOIN roles r ON r.key = ws.target_role
           LEFT JOIN tasks t ON t.group_key = ws.group_key GROUP BY r.label ORDER BY r.label`);

  step("users join roles (team)");
  await q(`SELECT u.id, u.full_name, u.email, u.is_active, u.created_at, r.key AS role_key, r.label AS role_label
           FROM users u JOIN roles r ON r.id = u.role_id ORDER BY u.created_at ASC`);

  step("auto-assign target role lookup");
  await q(`SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE r.key = 'WRITER' AND u.is_active = true ORDER BY u.created_at ASC LIMIT 1`);

  step("login auth query");
  await q(`SELECT u.id, u.email, u.full_name, u.password_hash, u.is_active, r.key AS role_key, r.label AS role_label, r.dashboard
           FROM users u JOIN roles r ON r.id = u.role_id WHERE lower(u.email) = lower($1)`, ["pm@advrix.agency"]);
};

P().then(() => console.log(process.exitCode ? "\nSOME CHECKS FAILED" : "\nALL CHECKS PASSED"));
