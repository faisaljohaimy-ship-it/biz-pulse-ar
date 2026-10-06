/**
 * أنواع أوامر عمل الصيانة كما يعيدها العرض `maint_orders_v` والدالّتان
 * `maint_kpis`/`maint_analytics` (ترحيل `20261006120000`). مشتركة بين الخادم
 * والواجهة — لا منطق هنا.
 */
import type { HoldReason, OrderStatus, Stage, SystemCode } from "@/lib/maintenance/cm-log-rules";

export interface MaintOrder {
  id: string;
  ref: string;
  source: "cm_log" | "app";
  city: string | null;
  site: string | null;
  system: SystemCode | null;
  component: string | null;
  description: string | null;
  priority: "low" | "medium" | "high" | "critical";
  status: OrderStatus;
  stage: Stage;
  stage_basis: "import_evidence" | "workflow";
  hold_reason: HoldReason | null;
  progress_pct: number | null;
  requested_at: string | null;
  due_at: string | null;
  completed_at: string | null;
  delay_days: number | null;
  overdue_days: number | null;
  age_days: number | null;
  sap_wo: string | null;
  po: string | null;
  boq_item: string | null;
  qty: number | null;
  service_cost: number | null;
  maintenance_cost: number | null;
  spares_cost: number | null;
  delay_penalty: number | null;
  notes: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_by_staff: string | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  assigned_to_staff: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaintEvent {
  id: number;
  event: "created" | "assigned" | "stage" | "status" | "note";
  from_stage: Stage | null;
  to_stage: Stage | null;
  from_status: OrderStatus | null;
  to_status: OrderStatus | null;
  hold_reason: HoldReason | null;
  note: string | null;
  actor_id: string | null;
  created_at: string;
}

/** مخرَج `maint_kpis()` — كل نسبةٍ `null` حين لا مقام لها (المادة ٢٧). */
export interface MaintKpis {
  total: number;
  open: number;
  on_hold: number;
  completed: number;
  cancelled: number;
  overdue: number;
  completion_rate: number | null;
  on_time_rate: number | null;
  on_time_basis: number;
  avg_delay_late: number | null;
  avg_progress_active: number | null;
  maintenance_cost: number | null;
  spares_cost: number | null;
  penalties: number | null;
  sap_pending: number;
  unassigned_active: number;
  first_request: string | null;
  last_request: string | null;
}

export interface KeyCount {
  key: string | null;
  n: number;
}

export interface MaintAnalytics {
  by_system: Array<KeyCount & { done: number; active: number }>;
  by_city: Array<KeyCount & { active: number; on_time: number | null }>;
  by_hold_reason: KeyCount[];
  monthly: Array<{ month: string; requested: number; completed: number }>;
  top_components: Array<KeyCount & { system: SystemCode | null }>;
  top_sites: Array<KeyCount & { active: number }>;
  repeat_failures: Array<{ site: string; component: string; n: number }>;
}

/** مصدر ما يُعرض: القاعدة الحية، أو المحاكاة المرجعية الموسومة (زائر/عطل). */
export type MaintSource = "database" | "reference";

export interface MaintSummary {
  source: MaintSource;
  kpis: MaintKpis;
  analytics: MaintAnalytics;
}

export interface MaintPage {
  source: MaintSource;
  rows: MaintOrder[];
  total: number;
}

export interface StaffMember {
  user_id: string;
  display_name: string | null;
  staff_number: string | null;
  org_role: string;
}

export type MaintTab = "active" | "history";
