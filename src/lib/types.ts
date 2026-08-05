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

export type TaskStatus = "pending" | "in_progress" | "review" | "completed";

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
