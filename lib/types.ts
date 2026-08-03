export type UserRole = "owner" | "admin" | "worker";
export type TaskStatus =
  | "pending"
  | "in_progress"
  | "on_hold"
  | "completed"
  | "verified"
  | "cancelled";
// Statuses a worker can set themselves — "verified" is boss-only, set from
// the dashboard after reviewing a completed job's proof.
export const WORKER_SETTABLE_STATUSES: TaskStatus[] = [
  "pending",
  "in_progress",
  "on_hold",
  "completed",
];
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type MediaType = "photo" | "video";

export interface Organization {
  id: string;
  name: string;
  plan: string;
  industry: string | null;
  team_size: string | null;
  owner_id: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  org_id: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface Client {
  id: string;
  org_id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
}

export interface JobType {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  color: string | null;
  kpi_points: number;
  created_at: string;
}

export interface Task {
  id: string;
  org_id: string;
  title: string;
  description: string | null;
  job_type_id: string | null;
  client_id: string | null;
  assigned_to: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  expected_start: string | null;
  expected_end: string | null;
  location_address: string | null;
  location_lat: number | null;
  location_lng: number | null;
  upload_radius_m: number;
  self_created: boolean;
  has_stops: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// One stop within a multi-stop ("delivery run") task — its own pin, its own
// geofence radius, its own done/not-done state. See supabase/task-stops.sql.
export interface TaskStop {
  id: string;
  org_id: string;
  task_id: string;
  label: string;
  address: string | null;
  lat: number;
  lng: number;
  radius_m: number;
  notes: string | null;
  is_done: boolean;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
}

// Task joined with related rows (as returned by dashboard queries)
export interface TaskWithRelations extends Task {
  job_type: Pick<JobType, "id" | "name" | "color"> | null;
  client: Pick<Client, "id" | "name"> | null;
  assignee: Pick<Profile, "id" | "full_name"> | null;
}

export interface TaskUpdate {
  id: string;
  org_id: string;
  task_id: string;
  worker_id: string | null;
  remark: string | null;
  status: TaskStatus | null;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  checkin_id: string | null;
  stop_id: string | null;
  amount_collected: number | null;
  created_at: string;
}

export interface TaskCheckin {
  id: string;
  org_id: string;
  task_id: string;
  worker_id: string;
  checked_in_at: string;
  checked_out_at: string | null;
  created_at: string;
}

export interface TaskUpdateMedia {
  id: string;
  org_id: string;
  update_id: string;
  task_id: string;
  storage_path: string;
  type: MediaType;
  size_bytes: number;
  created_at: string;
}

export interface Report {
  id: string;
  org_id: string;
  task_id: string;
  title: string;
  summary: string | null;
  share_token: string;
  is_public: boolean;
  created_by: string | null;
  created_at: string;
  client_rating: number | null;
  client_feedback: string | null;
  rated_at: string | null;
}

// KPI tracking — see supabase/kpi.sql. "task" metric = points earned from
// completed jobs (job_types.kpi_points, default 1 = pure quantity). "money"
// metric = cash/e-wallet amounts workers log on job completion.
export type KpiMetric = "task" | "money";
export type KpiPeriod = "daily" | "weekly" | "monthly";

export interface KpiSettings {
  org_id: string;
  kpi_enabled: boolean;
  task_kpi_enabled: boolean;
  task_kpi_period: KpiPeriod;
  task_kpi_target: number | null;
  money_kpi_enabled: boolean;
  money_kpi_period: KpiPeriod;
  money_kpi_target: number | null;
  updated_at: string;
}

export interface WorkerKpiTarget {
  id: string;
  org_id: string;
  worker_id: string;
  metric: KpiMetric;
  target: number;
  updated_at: string;
}

export interface KpiBonusTier {
  id: string;
  org_id: string;
  metric: KpiMetric;
  threshold_pct: number;
  bonus_amount: number;
  created_at: string;
}

// One row per worker, as returned by the kpi_progress() RPC.
export interface KpiProgressRow {
  worker_id: string;
  full_name: string | null;
  task_enabled: boolean;
  task_period: KpiPeriod;
  task_target: number | null;
  task_achieved: number;
  task_bonus: number;
  money_enabled: boolean;
  money_period: KpiPeriod;
  money_target: number | null;
  money_achieved: number;
  money_bonus: number;
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  on_hold: "On Hold",
  completed: "Completed",
  verified: "Verified",
  cancelled: "Cancelled",
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};
