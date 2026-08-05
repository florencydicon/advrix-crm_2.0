import { query } from "@/lib/db";
import type {
  Assignment,
  Client,
  DeliverableType,
  Project,
  ProjectDeliverable,
  ProjectDetail,
  Task,
  UserRow,
  WorkflowGroup,
} from "@/lib/types";

export async function getClients(): Promise<Client[]> {
  return query<Client>(`SELECT * FROM clients ORDER BY created_at DESC`);
}

export async function getProjects(): Promise<Project[]> {
  return query<Project>(
    `SELECT p.*, c.name AS client_name
     FROM projects p JOIN clients c ON c.id = p.client_id
     ORDER BY p.created_at DESC`
  );
}

const TASK_SELECT = `
  SELECT t.*, p.name AS project_name, c.name AS client_name,
         u.full_name AS assignee_name, r.label AS role_label
  FROM tasks t
  JOIN projects p ON p.id = t.project_id
  JOIN clients c ON c.id = p.client_id
  LEFT JOIN users u ON u.id = t.assigned_to
  LEFT JOIN roles r ON r.key = t.role_key
`;

export async function getDeliverableTypes(): Promise<DeliverableType[]> {
  return query<DeliverableType>(
    `SELECT key, label, content_role, visual_role, default_qty, sort
     FROM deliverable_types ORDER BY sort, label`
  );
}

export async function getProjectDeliverables(projectId: string): Promise<ProjectDeliverable[]> {
  return query<ProjectDeliverable>(
    `SELECT * FROM project_deliverables WHERE project_id = $1 ORDER BY created_at`,
    [projectId]
  );
}

export async function getProjectAssignments(projectId: string): Promise<Assignment[]> {
  return query<Assignment>(
    `SELECT a.id, a.user_id, a.project_id, a.role_key, u.full_name AS user_name, r.label AS role_label
     FROM assignments a
     JOIN users u ON u.id = a.user_id
     JOIN roles r ON r.key = a.role_key
     WHERE a.project_id = $1
     ORDER BY r.key`,
    [projectId]
  );
}

export async function getProjectDetail(projectId: string): Promise<ProjectDetail | null> {
  const projects = await query<Project>(
    `SELECT p.*, c.name AS client_name
     FROM projects p JOIN clients c ON c.id = p.client_id
     WHERE p.id = $1`,
    [projectId]
  );
  const project = projects[0];
  if (!project) return null;

  const tasks = await query<Task>(
    `${TASK_SELECT} WHERE t.project_id = $1 ORDER BY t.created_at ASC`,
    [projectId]
  );

  const groups: WorkflowGroup[] = [];
  for (const g of [...new Set(tasks.map((t) => t.group_key))]) {
    const groupTasks = tasks.filter((t) => t.group_key === g);
    groups.push({
      group_key: g,
      name: g === "manual" ? "Manual Tasks" : g,
      tasks: groupTasks,
      completed: groupTasks.length > 0 && groupTasks.every((t) => t.status === "completed"),
    });
  }

  const [deliverables, assignments] = await Promise.all([
    getProjectDeliverables(projectId),
    getProjectAssignments(projectId),
  ]);

  return { ...project, groups, deliverables_list: deliverables, assignments };
}

export async function getMyTasks(userId: string): Promise<Task[]> {
  return query<Task>(
    `${TASK_SELECT}
     WHERE t.assigned_to = $1 AND p.status = 'in_progress'
     ORDER BY t.created_at ASC`,
    [userId]
  );
}

export async function getBoard(): Promise<ProjectDetail[]> {
  const projects = await getProjects();
  const details: ProjectDetail[] = [];
  for (const p of projects) {
    const detail = await getProjectDetail(p.id);
    if (detail) details.push(detail);
  }
  return details;
}

export async function getTeam(): Promise<UserRow[]> {
  return query<UserRow>(
    `SELECT u.id, u.full_name, u.email, u.is_active, u.created_at,
            r.key AS role_key, r.label AS role_label
     FROM users u JOIN roles r ON r.id = u.role_id
     ORDER BY u.created_at ASC`
  );
}

export async function getRoles() {
  return query<{ key: string; label: string; permissions: string[] }>(
    `SELECT key, label, permissions FROM roles ORDER BY created_at`
  );
}

export interface Bottleneck {
  project_id: string;
  project_name: string;
  task_id: string;
  title: string;
  assignee_name: string | null;
  role_label: string;
  days_open: number;
}

export async function getBottlenecks(): Promise<Bottleneck[]> {
  return query<Bottleneck>(
    `SELECT p.id AS project_id, p.name AS project_name, t.id AS task_id, t.title,
            u.full_name AS assignee_name, r.label AS role_label,
            EXTRACT(DAY FROM now() - t.created_at)::int AS days_open
     FROM tasks t
     JOIN projects p ON p.id = t.project_id
     LEFT JOIN users u ON u.id = t.assigned_to
     LEFT JOIN roles r ON r.key = t.role_key
     WHERE t.status <> 'completed' AND p.status = 'in_progress'
     ORDER BY days_open DESC
     LIMIT 12`
  );
}

export interface Analytics {
  totalProjects: number;
  inProgress: number;
  completedProjects: number;
  pendingApproval: number;
  totalTasks: number;
  completedTasks: number;
  tasksByRole: { role_label: string; total: number; completed: number }[];
  projectsByStatus: { status: string; count: number }[];
  recentProjects: { id: string; name: string; client_name: string; status: string; created_at: string }[];
}

export async function getAnalytics(): Promise<Analytics> {
  const stats = await query<{
    total_projects: string;
    in_progress: string;
    completed_projects: string;
    pending_approval: string;
    total_tasks: string;
    completed_tasks: string;
  }>(
    `SELECT
       (SELECT COUNT(*) FROM projects)::text AS total_projects,
       (SELECT COUNT(*) FROM projects WHERE status='in_progress')::text AS in_progress,
       (SELECT COUNT(*) FROM projects WHERE status='completed')::text AS completed_projects,
       (SELECT COUNT(*) FROM projects WHERE status='pending_approval')::text AS pending_approval,
       (SELECT COUNT(*) FROM tasks)::text AS total_tasks,
       (SELECT COUNT(*) FROM tasks WHERE status='completed')::text AS completed_tasks`
  );

  const byRole = await query<{ role_label: string; total: string; completed: string }>(
    `SELECT r.label AS role_label,
            COUNT(t.id)::text AS total,
            COUNT(t.id) FILTER (WHERE t.status='completed')::text AS completed
     FROM tasks t
     JOIN roles r ON r.key = t.role_key
     GROUP BY r.label ORDER BY r.label`
  );

  const byStatus = await query<{ status: string; count: string }>(
    `SELECT status, COUNT(*)::text AS count FROM projects GROUP BY status`
  );

  const recent = await query<{ id: string; name: string; client_name: string; status: string; created_at: string }>(
    `SELECT p.id, p.name, c.name AS client_name, p.status, p.created_at
     FROM projects p JOIN clients c ON c.id = p.client_id
     ORDER BY p.created_at DESC LIMIT 8`
  );

  return {
    totalProjects: Number(stats[0]?.total_projects || 0),
    inProgress: Number(stats[0]?.in_progress || 0),
    completedProjects: Number(stats[0]?.completed_projects || 0),
    pendingApproval: Number(stats[0]?.pending_approval || 0),
    totalTasks: Number(stats[0]?.total_tasks || 0),
    completedTasks: Number(stats[0]?.completed_tasks || 0),
    tasksByRole: byRole.map((r) => ({ role_label: r.role_label, total: Number(r.total), completed: Number(r.completed) })),
    projectsByStatus: byStatus.map((s) => ({ status: s.status, count: Number(s.count) })),
    recentProjects: recent.map((r) => ({
      id: r.id,
      name: r.name,
      client_name: r.client_name,
      status: r.status,
      created_at: r.created_at,
    })),
  };
}
