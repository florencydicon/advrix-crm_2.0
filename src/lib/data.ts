import { query } from "@/lib/db";
import type {
  Assignment,
  Attendance,
  AttendanceStats,
  AttendanceWithUser,
  Client,
  DeliverableType,
  Lead,
  LeadStats,
  Leave,
  LeaveWithUser,
  PaginatedResult,
  Project,
  ProjectDeliverable,
  ProjectDetail,
  ProjectRow,
  Task,
  UserRow,
  WorkflowGroup,
} from "@/lib/types";

export interface PaginatedParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  roleKey?: string;
}

function paginate<T>(items: T[], total: number, page: number, pageSize: number): PaginatedResult<T> {
  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getClients(): Promise<Client[]> {
  return query<Client>(`SELECT * FROM clients ORDER BY created_at DESC`);
}

export async function getClientsPaginated(params: PaginatedParams = {}): Promise<PaginatedResult<Client>> {
  const { page = 1, pageSize = 20, search = "" } = params;
  const offset = (page - 1) * pageSize;
  const where = search ? `WHERE c.name ILIKE $1 OR c.company ILIKE $1 OR c.email ILIKE $1` : "";
  const args = search ? [`%${search}%`] : [];

  const [countRes, items] = await Promise.all([
    query<{ total: string }>(`SELECT COUNT(*)::text AS total FROM clients c ${where}`, args),
    query<Client>(`SELECT c.* FROM clients c ${where} ORDER BY c.created_at DESC LIMIT $${args.length + 1} OFFSET $${args.length + 2}`, [...args, pageSize, offset]),
  ]);

  return paginate(items, Number(countRes[0]?.total || 0), page, pageSize);
}

export interface ClientCard extends Client {
  total_projects: number;
  active_projects: number;
}

export async function getClientCards(params: PaginatedParams = {}): Promise<PaginatedResult<ClientCard>> {
  const { page = 1, pageSize = 24, search = "" } = params;
  const offset = (page - 1) * pageSize;
  const where = search ? `WHERE c.name ILIKE $1 OR c.company ILIKE $1 OR c.email ILIKE $1` : "";
  const args = search ? [`%${search}%`] : [];

  const [countRes, items] = await Promise.all([
    query<{ total: string }>(`SELECT COUNT(*)::text AS total FROM clients c ${where}`, args),
    query<ClientCard>(
      `SELECT c.*,
              (SELECT COUNT(*)::int FROM projects p WHERE p.client_id = c.id) AS total_projects,
              (SELECT COUNT(*)::int FROM projects p WHERE p.client_id = c.id AND p.status = 'in_progress') AS active_projects
       FROM clients c ${where}
       ORDER BY c.created_at DESC
       LIMIT $${args.length + 1} OFFSET $${args.length + 2}`,
      [...args, pageSize, offset]
    ),
  ]);

  return paginate(items, Number(countRes[0]?.total || 0), page, pageSize);
}

export async function getProjects(): Promise<Project[]> {
  return query<Project>(
    `SELECT p.*, c.name AS client_name
     FROM projects p JOIN clients c ON c.id = p.client_id
     ORDER BY p.created_at DESC`
  );
}

export async function getProjectsPaginated(params: PaginatedParams = {}): Promise<PaginatedResult<ProjectRow>> {
  const { page = 1, pageSize = 20, search = "", status = "" } = params;
  const offset = (page - 1) * pageSize;
  const conditions: string[] = [];
  const args: unknown[] = [];

  if (search) {
    args.push(`%${search}%`);
    conditions.push(`(p.name ILIKE $${args.length} OR c.name ILIKE $${args.length})`);
  }
  if (status) {
    args.push(status);
    conditions.push(`p.status = $${args.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countRes = await query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM projects p JOIN clients c ON c.id = p.client_id ${where}`,
    args
  );

  const items = await query<ProjectRow>(
    `SELECT p.*, c.name AS client_name,
            (SELECT COUNT(*)::int FROM tasks t WHERE t.project_id = p.id) AS total_tasks,
            (SELECT COUNT(*)::int FROM tasks t WHERE t.project_id = p.id AND t.status = 'completed') AS completed_tasks
     FROM projects p JOIN clients c ON c.id = p.client_id
     ${where}
     ORDER BY p.created_at DESC
     LIMIT $${args.length + 1} OFFSET $${args.length + 2}`,
    [...args, pageSize, offset]
  );

  return paginate(items, Number(countRes[0]?.total || 0), page, pageSize);
}

export async function getProjectsForBoard(): Promise<ProjectRow[]> {
  return query<ProjectRow>(
    `SELECT p.*, c.name AS client_name,
            (SELECT COUNT(*)::int FROM tasks t WHERE t.project_id = p.id) AS total_tasks,
            (SELECT COUNT(*)::int FROM tasks t WHERE t.project_id = p.id AND t.status = 'completed') AS completed_tasks
     FROM projects p JOIN clients c ON c.id = p.client_id
     ORDER BY p.created_at DESC`
  );
}

export interface PipelineClient {
  client_id: string;
  client_name: string;
  projects: PipelineProject[];
}

export interface PipelineProject extends Project {
  tasks: Task[];
  assignments: Assignment[];
  total_tasks: number;
  completed_tasks: number;
}

/**
 * Grouped pipeline: every client -> their projects -> their tasks + assignments.
 * Used for the accordion drill-down on the projects page.
 */
export async function getPipelineByClient(): Promise<PipelineClient[]> {
  const projects = await query<Project>(
    `SELECT p.*, c.name AS client_name,
            p.deadline::text AS deadline
     FROM projects p JOIN clients c ON c.id = p.client_id
     ORDER BY c.name ASC, p.created_at DESC`
  );
  if (projects.length === 0) return [];

  const projectIds = projects.map((p) => p.id);

  const [tasks, assignments] = await Promise.all([
    query<Task>(
      `${TASK_SELECT} WHERE t.project_id = ANY($1) ORDER BY t.created_at ASC`,
      [projectIds]
    ),
    query<Assignment>(
      `SELECT a.id, a.user_id, a.project_id, a.role_key, u.full_name AS user_name, r.label AS role_label
       FROM assignments a
       JOIN users u ON u.id = a.user_id
       JOIN roles r ON r.key = a.role_key
       WHERE a.project_id = ANY($1)
       ORDER BY r.key`,
      [projectIds]
    ),
  ]);

  const tasksByProject = new Map<string, Task[]>();
  for (const t of tasks) {
    if (!tasksByProject.has(t.project_id)) tasksByProject.set(t.project_id, []);
    tasksByProject.get(t.project_id)!.push(t);
  }
  const assignmentsByProject = new Map<string, Assignment[]>();
  for (const a of assignments) {
    if (!assignmentsByProject.has(a.project_id)) assignmentsByProject.set(a.project_id, []);
    assignmentsByProject.get(a.project_id)!.push(a);
  }

  const clients: PipelineClient[] = [];
  const byClient = new Map<string, PipelineProject[]>();
  for (const p of projects) {
    const projectTasks = tasksByProject.get(p.id) || [];
    const pipe: PipelineProject = {
      ...p,
      tasks: projectTasks,
      assignments: assignmentsByProject.get(p.id) || [],
      total_tasks: projectTasks.length,
      completed_tasks: projectTasks.filter((t) => t.status === "completed").length,
    };
    if (!byClient.has(p.client_id)) {
      byClient.set(p.client_id, []);
      clients.push({ client_id: p.client_id, client_name: p.client_name, projects: byClient.get(p.client_id)! });
    }
    byClient.get(p.client_id)!.push(pipe);
  }

  return clients;
}

const TASK_SELECT = `
  SELECT t.*, p.name AS project_name, c.name AS client_name,
         u.full_name AS assignee_name, r.label AS role_label,
         t.due_date::text AS due_date
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
     WHERE t.assigned_to = $1
     ORDER BY t.created_at ASC`,
    [userId]
  );
}

/** Tasks awaiting admin/PM review (submitted by producers). */
export async function getSubmittedTasks(): Promise<Task[]> {
  return query<Task>(
    `${TASK_SELECT}
     WHERE t.status = 'submitted'
     ORDER BY t.reviewed_at DESC NULLS LAST, t.created_at ASC`
  );
}

export async function getBoard(): Promise<ProjectDetail[]> {
  const projects = await query<Project>(
    `SELECT p.*, c.name AS client_name
     FROM projects p JOIN clients c ON c.id = p.client_id
     ORDER BY p.created_at DESC`
  );
  if (projects.length === 0) return [];

  const projectIds = projects.map((p) => p.id);

  const [allTasks, allDeliverables, allAssignments] = await Promise.all([
    query<Task>(
      `${TASK_SELECT} WHERE t.project_id = ANY($1) ORDER BY t.created_at ASC`,
      [projectIds]
    ),
    query<ProjectDeliverable>(
      `SELECT * FROM project_deliverables WHERE project_id = ANY($1) ORDER BY created_at`,
      [projectIds]
    ),
    query<Assignment>(
      `SELECT a.id, a.user_id, a.project_id, a.role_key, u.full_name AS user_name, r.label AS role_label
       FROM assignments a
       JOIN users u ON u.id = a.user_id
       JOIN roles r ON r.key = a.role_key
       WHERE a.project_id = ANY($1)
       ORDER BY r.key`,
      [projectIds]
    ),
  ]);

  const tasksByProject = new Map<string, Task[]>();
  for (const t of allTasks) {
    if (!tasksByProject.has(t.project_id)) tasksByProject.set(t.project_id, []);
    tasksByProject.get(t.project_id)!.push(t);
  }

  const deliverablesByProject = new Map<string, ProjectDeliverable[]>();
  for (const d of allDeliverables) {
    if (!deliverablesByProject.has(d.project_id)) deliverablesByProject.set(d.project_id, []);
    deliverablesByProject.get(d.project_id)!.push(d);
  }

  const assignmentsByProject = new Map<string, Assignment[]>();
  for (const a of allAssignments) {
    if (!assignmentsByProject.has(a.project_id)) assignmentsByProject.set(a.project_id, []);
    assignmentsByProject.get(a.project_id)!.push(a);
  }

  return projects.map((p) => {
    const tasks = tasksByProject.get(p.id) || [];
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

    return {
      ...p,
      groups,
      deliverables_list: deliverablesByProject.get(p.id) || [],
      assignments: assignmentsByProject.get(p.id) || [],
    };
  });
}

export async function getTeam(): Promise<UserRow[]> {
  return query<UserRow>(
    `SELECT u.id, u.full_name, u.email, u.is_active, u.created_at,
            r.key AS role_key, r.label AS role_label
     FROM users u JOIN roles r ON r.id = u.role_id
     ORDER BY u.created_at ASC`
  );
}

export async function getTeamPaginated(params: PaginatedParams = {}): Promise<PaginatedResult<UserRow>> {
  const { page = 1, pageSize = 20, search = "", roleKey = "" } = params;
  const offset = (page - 1) * pageSize;
  const conditions: string[] = [];
  const args: unknown[] = [];

  if (search) {
    args.push(`%${search}%`);
    conditions.push(`(u.full_name ILIKE $${args.length} OR u.email ILIKE $${args.length})`);
  }
  if (roleKey) {
    args.push(roleKey);
    conditions.push(`r.key = $${args.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countRes = await query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM users u JOIN roles r ON r.id = u.role_id ${where}`,
    args
  );

  const items = await query<UserRow>(
    `SELECT u.id, u.full_name, u.email, u.is_active, u.created_at,
            r.key AS role_key, r.label AS role_label
     FROM users u JOIN roles r ON r.id = u.role_id
     ${where}
     ORDER BY u.created_at ASC
     LIMIT $${args.length + 1} OFFSET $${args.length + 2}`,
    [...args, pageSize, offset]
  );

  return paginate(items, Number(countRes[0]?.total || 0), page, pageSize);
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

// ---------- Attendance ----------

export async function getTodayAttendance(userId: string): Promise<Attendance | null> {
  const rows = await query<Attendance>(
    `SELECT * FROM attendance WHERE user_id = $1 AND date = CURRENT_DATE`,
    [userId]
  );
  return rows[0] || null;
}

export async function getAttendanceHistory(userId: string, limit = 30): Promise<Attendance[]> {
  return query<Attendance>(
    `SELECT * FROM attendance WHERE user_id = $1 ORDER BY date DESC LIMIT $2`,
    [userId, limit]
  );
}

export async function getTeamAttendance(date: string = new Date().toISOString().slice(0, 10)): Promise<AttendanceWithUser[]> {
  return query<AttendanceWithUser>(
    `SELECT a.*, u.full_name, r.label AS role_label
     FROM attendance a
     JOIN users u ON u.id = a.user_id
     JOIN roles r ON r.id = u.role_id
     WHERE a.date = $1
     ORDER BY a.punch_in ASC`,
    [date]
  );
}

export async function getAttendanceStats(date: string = new Date().toISOString().slice(0, 10)): Promise<AttendanceStats> {
  const [stats, avgHours] = await Promise.all([
    query<{ status: string; count: string }>(
      `SELECT status, COUNT(*)::text AS count FROM attendance WHERE date = $1 GROUP BY status`,
      [date]
    ),
    query<{ avg: string | null }>(
      `SELECT AVG(hours_worked)::text AS avg FROM attendance WHERE date = $1 AND hours_worked > 0`,
      [date]
    ),
  ]);

  const statusMap = Object.fromEntries(stats.map((s) => [s.status, Number(s.count)]));

  return {
    presentToday: statusMap["present"] || 0,
    absentToday: statusMap["absent"] || 0,
    lateToday: statusMap["late"] || 0,
    onLeaveToday: statusMap["on_leave"] || 0,
    totalTeam: Object.values(statusMap).reduce((a, b) => a + b, 0),
    avgHoursToday: Math.round((Number(avgHours[0]?.avg) || 0) * 100) / 100,
  };
}

// ---------- Leaves ----------

export async function getMyLeaves(userId: string): Promise<LeaveWithUser[]> {
  return query<LeaveWithUser>(
    `SELECT l.*, u.full_name, r.label AS role_label, au.full_name AS approver_name
     FROM leaves l
     JOIN users u ON u.id = l.user_id
     JOIN roles r ON r.id = u.role_id
     LEFT JOIN users au ON au.id = l.approved_by
     WHERE l.user_id = $1
     ORDER BY l.created_at DESC`,
    [userId]
  );
}

export async function getAllLeaves(params?: {
  status?: string;
  search?: string;
  roleKey?: string;
}): Promise<LeaveWithUser[]> {
  const conditions: string[] = [];
  const args: unknown[] = [];

  if (params?.status) {
    args.push(params.status);
    conditions.push(`l.status = $${args.length}`);
  }
  if (params?.search) {
    args.push(`%${params.search}%`);
    conditions.push(`(u.full_name ILIKE $${args.length} OR l.leave_type ILIKE $${args.length} OR l.reason ILIKE $${args.length})`);
  }
  if (params?.roleKey) {
    args.push(params.roleKey);
    conditions.push(`r.key = $${args.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  return query<LeaveWithUser>(
    `SELECT l.*, u.full_name, r.label AS role_label, au.full_name AS approver_name
     FROM leaves l
     JOIN users u ON u.id = l.user_id
     JOIN roles r ON r.id = u.role_id
     LEFT JOIN users au ON au.id = l.approved_by
     ${where}
     ORDER BY l.created_at DESC`,
    args
  );
}

export async function getPendingLeavesCount(): Promise<number> {
  const rows = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM leaves WHERE status = 'pending'`
  );
  return Number(rows[0]?.count || 0);
}

export async function getLeaveBalance(userId: string): Promise<Record<string, { used: number; total: number }>> {
  const year = new Date().getFullYear();
  const rows = await query<{ leave_type: string; total_days: string }>(
    `SELECT leave_type, COALESCE(SUM(days), 0)::text AS total_days
     FROM leaves
     WHERE user_id = $1 AND status = 'approved' AND EXTRACT(YEAR FROM start_date) = $2
     GROUP BY leave_type`,
    [userId, year]
  );

  const allTypes = ["sick", "casual", "earned", "unpaid", "emergency"];
  const limits: Record<string, number> = { sick: 12, casual: 12, earned: 15, unpaid: 365, emergency: 5 };

  const result: Record<string, { used: number; total: number }> = {};
  for (const t of allTypes) {
    const used = Number(rows.find((r) => r.leave_type === t)?.total_days || 0);
    result[t] = { used, total: limits[t] };
  }
  return result;
}

export async function getLeavesForDateRange(startDate: string, endDate: string): Promise<LeaveWithUser[]> {
  return query<LeaveWithUser>(
    `SELECT l.*, u.full_name, r.label AS role_label, au.full_name AS approver_name
     FROM leaves l
     JOIN users u ON u.id = l.user_id
     JOIN roles r ON r.id = u.role_id
     LEFT JOIN users au ON au.id = l.approved_by
     WHERE l.status = 'approved' AND l.start_date <= $2 AND l.end_date >= $1
     ORDER BY l.start_date ASC`,
    [startDate, endDate]
  );
}

// ---------- Sales Leads ----------

export async function getLeads(ownerId: string | null): Promise<Lead[]> {
  const where = ownerId ? `WHERE l.owner_id = $1` : "";
  const args = ownerId ? [ownerId] : [];
  return query<Lead>(
    `SELECT l.*, u.full_name AS owner_name,
            l.next_follow_up::text AS next_follow_up
     FROM leads l JOIN users u ON u.id = l.owner_id
     ${where}
     ORDER BY l.updated_at DESC`,
    args
  );
}

export async function getLeadStats(ownerId: string | null): Promise<LeadStats> {
  const where = ownerId ? `WHERE owner_id = $1` : "";
  const args = ownerId ? [ownerId] : [];
  const rows = await query<{
    total: string;
    new_count: string;
    contacted: string;
    follow_up: string;
    proposal: string;
    followups_due: string;
    won: string;
    lost: string;
    pipeline_value: string | null;
    won_value: string | null;
  }>(
    `SELECT
       COUNT(*)::text AS total,
       COUNT(*) FILTER (WHERE status = 'new')::text AS new_count,
       COUNT(*) FILTER (WHERE status = 'contacted')::text AS contacted,
       COUNT(*) FILTER (WHERE status = 'follow_up')::text AS follow_up,
       COUNT(*) FILTER (WHERE status = 'proposal')::text AS proposal,
       COUNT(*) FILTER (WHERE status = 'follow_up' AND next_follow_up <= CURRENT_DATE)::text AS followups_due,
       COUNT(*) FILTER (WHERE status = 'won')::text AS won,
       COUNT(*) FILTER (WHERE status = 'lost')::text AS lost,
       COALESCE(SUM(deal_value) FILTER (WHERE status NOT IN ('won','lost')), 0)::text AS pipeline_value,
       COALESCE(SUM(deal_value) FILTER (WHERE status = 'won'), 0)::text AS won_value
     FROM leads ${where}`,
    args
  );
  const r = rows[0];
  return {
    total: Number(r?.total || 0),
    newCount: Number(r?.new_count || 0),
    contacted: Number((r as any)?.contacted || 0),
    followUp: Number((r as any)?.follow_up || 0),
    proposal: Number((r as any)?.proposal || 0),
    followUpsDue: Number(r?.followups_due || 0),
    won: Number(r?.won || 0),
    lost: Number(r?.lost || 0),
    pipelineValue: Number(r?.pipeline_value || 0),
    wonValue: Number(r?.won_value || 0),
  };
}

export async function getTaskStatusCounts(): Promise<Record<string, number>> {
  const rows = await query<{ status: string; count: string }>(
    `SELECT status, COUNT(*)::text AS count FROM tasks GROUP BY status`
  );
  const map: Record<string, number> = {};
  for (const r of rows) map[r.status] = Number(r.count);
  return map;
}

// ---------- Attendance reports ----------

export interface AttendanceReportRow {
  user_id: string;
  full_name: string;
  role_label: string;
  present: number;
  half_days: number;
  late: number;
  on_leave: number;
  absent: number;
  total_hours: number;
}

export async function getAttendanceReport(start: string, end: string): Promise<AttendanceReportRow[]> {
  return query<AttendanceReportRow>(
    `SELECT u.id AS user_id, u.full_name, r.label AS role_label,
            COUNT(a.id) FILTER (WHERE a.status = 'present')::int AS present,
            COUNT(a.id) FILTER (WHERE a.status = 'half_day')::int AS half_days,
            COUNT(a.id) FILTER (WHERE a.status = 'late')::int AS late,
            COUNT(a.id) FILTER (WHERE a.status = 'on_leave')::int AS on_leave,
            COUNT(a.id) FILTER (WHERE a.status = 'absent')::int AS absent,
            COALESCE(SUM(a.hours_worked), 0)::float8 AS total_hours
     FROM users u
     JOIN roles r ON r.id = u.role_id
     LEFT JOIN attendance a ON a.user_id = u.id AND a.date BETWEEN $1 AND $2
     WHERE u.is_active = true
     GROUP BY u.id, u.full_name, r.label
     ORDER BY u.full_name ASC`,
    [start, end]
  );
}

export interface LeaveReportRow {
  id: string;
  full_name: string;
  role_label: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: string;
  approved_by_name: string | null;
  created_at: string;
}

export async function getLeaveReport(start: string, end: string): Promise<LeaveReportRow[]> {
  return query<LeaveReportRow>(
    `SELECT l.id, u.full_name, r.label AS role_label, l.leave_type,
            l.start_date::text AS start_date, l.end_date::text AS end_date,
            l.days, l.reason, l.status,
            au.full_name AS approved_by_name, l.created_at
     FROM leaves l
     JOIN users u ON u.id = l.user_id
     JOIN roles r ON r.id = u.role_id
     LEFT JOIN users au ON au.id = l.approved_by
     WHERE l.start_date <= $2 AND l.end_date >= $1
     ORDER BY l.start_date DESC`,
    [start, end]
  );
}
