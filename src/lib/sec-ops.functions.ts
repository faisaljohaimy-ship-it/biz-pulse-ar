/**
 * Server functions for Support & Urgent operations.
 * Reads from public.support_requests and public.urgent_tasks with tenant RLS.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SupportRequest = {
  id: string;
  requester: string;
  topic_ar: string;
  channel: "داخلي" | "ميداني" | "تنفيذي" | string;
  status: string;
  assigned_to: string | null;
  is_simulation: boolean;
  created_at: string;
  updated_at: string;
};

export type UrgentTask = {
  id: string;
  title_ar: string;
  department: string;
  priority: "عاجل جدًا" | "عاجل" | "متابعة" | string;
  status: "جديد" | "قيد المعالجة" | "بانتظار اعتماد" | "مغلق" | string;
  owner_name: string | null;
  due_at: string | null;
  sla_hours: number | null;
  is_simulation: boolean;
  created_at: string;
  updated_at: string;
};

export const listSupportRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SupportRequest[]> => {
    const { data } = await context.supabase
      .from("support_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    return (data ?? []) as SupportRequest[];
  });

export const listUrgentTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UrgentTask[]> => {
    const { data } = await context.supabase
      .from("urgent_tasks")
      .select("*")
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(200);
    return (data ?? []) as UrgentTask[];
  });
