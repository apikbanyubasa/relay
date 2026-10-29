export type Role =
  | "SUPER_ADMIN"
  | "PRODUCT_MANAGER"
  | "INTERNAL_TEAM"
  | "CLIENT_GUEST";

export type Department =
  | "MANAGEMENT"
  | "PRODUCT"
  | "UI_UX"
  | "FRONTEND"
  | "BACKEND"
  | "EXTERNAL";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  department: Department;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
  _count?: {
    assigned_tasks?: number;
    member_projects?: number;
    client_projects?: number;
  };
}

export interface UpdateProfilePayload {
  name: string;
  avatar_url?: string | null;
}

export interface ChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
}

export interface CreateUserPayload {
  email: string;
  name: string;
  password: string;
  role: Role;
  department: Department;
  avatar_url?: string | null;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  role?: Role;
  department?: Department;
  avatar_url?: string | null;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  _count?: {
    tasks: number;
  };
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
  client_id?: string | null;
}

export interface ProjectCollaborators {
  members: User[];
  clients: User[];
}

export interface TaskDependency {
  id: string;
  task_id: string;
  prerequisite_id: string;
  prerequisite: {
    id: string;
    title: string;
    status: TaskStatus;
    department: Department;
  };
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  file_url: string;
  file_name: string;
  file_size: number;
  uploaded_by: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  task_id: string;
  user_id: string;
  changed_column: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  user?: {
    id: string;
    name: string;
    role: Role;
    department?: Department;
  };
}

export interface Task {
  id: string;
  project_id: string;
  assignee_id?: string | null;
  title: string;
  description?: string | null;
  status: TaskStatus;
  department: Department;
  client_visible: boolean;
  version: number;
  due_date?: string | null;
  created_at: string;
  updated_at: string;
  isBlocked?: boolean;
  pendingDependencies?: Array<{
    id: string;
    title: string;
    status: TaskStatus;
    department: Department;
  }>;
  assignee?: {
    id: string;
    name: string;
    email?: string;
    department?: Department;
    avatar_url?: string | null;
  } | null;
  project?: {
    id: string;
    name: string;
  };
  dependencies?: TaskDependency[];
  attachments?: TaskAttachment[];
  audit_logs?: AuditLog[];
}

export interface ClientProjectView {
  project: {
    id: string;
    name: string;
    description?: string | null;
  };
  metrics: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    progressPercentage: number;
  };
  tasks: Array<{
    id: string;
    title: string;
    description?: string | null;
    status: TaskStatus;
    due_date?: string | null;
    isBlocked: boolean;
    assignee?: {
      name: string;
      avatar_url: string | null;
    } | null;
  }>;
}

export interface StandupSummary {
  date: string;
  project_id: string;
  summary: Record<
    string,
    {
      completed_yesterday: Array<{
        taskId: string;
        title: string;
        completedBy: string;
        completedAt: string;
      }>;
      blocked_today: Array<{
        taskId: string;
        title: string;
        assignee: string | null;
        blockedBy: string[];
      }>;
    }
  >;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  status?: TaskStatus;
  assignee_id?: string | null;
  client_visible?: boolean;
  due_date?: string | null;
  version: number;
}

export interface CreateTaskPayload {
  project_id: string;
  title: string;
  description?: string;
  department: Department;
  assignee_id?: string | null;
  client_visible: boolean;
  due_date?: string | null;
}

export interface CreateAttachmentPayload {
  file_name: string;
  file_url: string;
  file_size: number;
}

export interface PaginationMeta {
  page: number;
  rows: number;
  total?: number;
  totalRows: number;
  totalPages: number;
  hasNext?: boolean;
  hasPrev?: boolean;
  totalRecords?: number;
  [key: string]: unknown;
}

export type ComparisonOperator =
  | "eq"
  | "ne"
  | "in"
  | "notIn"
  | "contains"
  | "startsWith"
  | "endsWith"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "isNull"
  | "isNotNull";

export interface FilterConditionInput {
  field: string;
  op: ComparisonOperator;
  value?: unknown;
}

export interface FilterGroupInput {
  operator: "AND" | "OR";
  conditions: Array<FilterConditionInput | FilterGroupInput>;
}

export interface RangedFilterEntry {
  key: string;
  start?: string | number;
  end?: string | number;
  exclusive?: { start?: boolean; end?: boolean };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
  error?: {
    code: string;
    message: string;
    details?: unknown[];
  };
}
