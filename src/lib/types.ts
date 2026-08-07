export type RoleKey =
  | "SUPER_ADMIN"
  | "PROJECT_MANAGER"
  | "SALES"
  | "WRITER"
  | "DESIGNER"
  | "EDITOR"
  | "SMM";

export type DashboardKey = "admin" | "pm" | "sales" | "staff";

export interface Role {
  id: string;
  key: RoleKey;
  label: string;
  permissions: string[];
  dashboard: DashboardKey;
}

export interface User {
  id: string;
  full_name: string;
  email: string;
  role_id: string;
  role_key: RoleKey;
  role_label: string;
  dashboard: DashboardKey;
  is_active: boolean;
}

export interface Client {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
}

export type ProjectStatus =
  | "pending_approval"
  | "in_progress"
  | "completed"
  | "rejected";

export interface Project {
  id: string;
  client_id: string;
  client_name: string;
  name: string;
  status: ProjectStatus;
  brief: string | null;
  deliverables: string | null;
  deadline: string | null;
  created_by: string | null;
  created_at: string;
  approved_at: string | null;
}

export interface DeliverableType {
  key: string;
  label: string;
  content_role: RoleKey | null;
  visual_role: RoleKey | null;
  default_qty: number;
  sort: number;
}

export interface ProjectDeliverable {
  id: string;
  project_id: string;
  category_key: string;
  category_label: string;
  quantity: number;
  is_custom: boolean;
  custom_label: string | null;
}

export interface Assignment {
  id: string;
  user_id: string;
  project_id: string;
  role_key: RoleKey;
  user_name: string | null;
  role_label: string;
}

export type TaskStatus =
  | "pending"
  | "in_progress"
  | "submitted"
  | "needs_improvement"
  | "client_review"
  | "client_feedback"
  | "client_approved"
  | "uploading"
  | "completed";

export const TASK_STATUS_FLOW: TaskStatus[] = [
  "pending",
  "in_progress",
  "submitted",
  "needs_improvement",
  "client_review",
  "client_feedback",
  "client_approved",
  "uploading",
  "completed",
];

export interface Task {
  id: string;
  project_id: string;
  project_name: string;
  client_name: string;
  step_key: string;
  group_key: string;
  role_key: RoleKey;
  role_label: string;
  deliverable_id: string | null;
  sequence: number;
  title: string;
  description: string | null;
  content: string | null;
  status: TaskStatus;
  priority: string;
  assigned_to: string | null;
  assignee_name: string | null;
  review_comment: string | null;
  client_feedback: string | null;
  platforms: string[];
  reviewed_by: string | null;
  reviewed_at: string | null;
  due_date: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface WorkflowGroup {
  group_key: string;
  name: string;
  tasks: Task[];
  completed: boolean;
}

export interface ProjectDetail extends Project {
  groups: WorkflowGroup[];
  deliverables_list: ProjectDeliverable[];
  assignments: Assignment[];
}

export interface UserRow {
  id: string;
  full_name: string;
  email: string;
  role_key: RoleKey;
  role_label: string;
  is_active: boolean;
  created_at: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ProjectRow {
  id: string;
  client_id: string;
  client_name: string;
  name: string;
  status: ProjectStatus;
  brief: string | null;
  deliverables: string | null;
  deadline: string | null;
  created_by: string | null;
  created_at: string;
  approved_at: string | null;
  total_tasks: number;
  completed_tasks: number;
}

export type AttendanceStatus = "present" | "absent" | "half_day" | "late" | "on_leave";

export interface Attendance {
  id: string;
  user_id: string;
  date: string;
  punch_in: string | null;
  punch_out: string | null;
  status: AttendanceStatus;
  hours_worked: number;
  note: string | null;
  created_at: string;
}

export interface AttendanceWithUser extends Attendance {
  full_name: string;
  role_label: string;
}

export interface AttendanceStats {
  presentToday: number;
  absentToday: number;
  lateToday: number;
  onLeaveToday: number;
  totalTeam: number;
  avgHoursToday: number;
}

export type LeaveType = "sick" | "casual" | "earned" | "unpaid" | "emergency";
export type LeaveStatus = "pending" | "approved" | "rejected";

export interface Leave {
  id: string;
  user_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface LeaveWithUser extends Leave {
  full_name: string;
  role_label: string;
  approver_name: string | null;
}

export interface LeaveBalance {
  sick: number;
  casual: number;
  earned: number;
  unpaid: number;
  emergency: number;
}

export type NotificationType = "task" | "project" | "leave" | "attendance" | "system";

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  created_at: string;
}
