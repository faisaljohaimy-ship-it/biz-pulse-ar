import { z } from "zod";
import { requireFnnOwner } from "./owner.server";
import { resolveCommandOrg, type CommandContext } from "./command.server";
import type { FnnPlan } from "@/lib/sadeed/orchestrator/fnn-plan";

const timestamp = z.string().datetime({ offset: true });
const count = z.number().int().min(0).max(1000);
export const FnnAutomationStatusSchema = z.object({
  enabled: z.boolean(),
  schedule: z.string().nullable(),
  state: z.enum(["disabled", "initializing", "healthy", "stale", "error"]),
  last_attempt_at: timestamp.nullable(),
  last_completed_at: timestamp.nullable(),
  last_success_at: timestamp.nullable(),
  last_error_code: z.string().nullable(),
  completed_cycles: z.number().int().nonnegative(),
  report: z
    .object({
      observed_at: timestamp,
      watchdog_state: z.enum(["disabled", "initializing", "healthy", "stale", "error"]),
      pending_events: count,
      pending_events_capped: z.boolean(),
      running_workflows: count,
      running_workflows_capped: z.boolean(),
      sample_limit: z.literal(1000),
    })
    .nullable(),
});
export type FnnAutomationStatus = z.infer<typeof FnnAutomationStatusSchema>;
const labels = {
  healthy: "تعمل",
  disabled: "متوقفة",
  initializing: "تنتظر أول دورة",
  stale: "نتيجتها متأخرة",
  error: "تعذّرت دورتها الأخيرة",
} as const;

/** A report request only reads the saved evidence. It never starts a scheduled cycle. */
export async function readFnnAutomation(context: CommandContext): Promise<FnnAutomationStatus> {
  await requireFnnOwner(context);
  await resolveCommandOrg(context, "00000000-0000-0000-0000-000000000001");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const client = supabaseAdmin as unknown as {
    rpc(name: string): {
      abortSignal(signal: AbortSignal): Promise<{ data: unknown; error: unknown }>;
    };
  };
  const { data, error } = await client
    .rpc("sadeed_fnn_automation_status")
    .abortSignal(AbortSignal.timeout(3500));
  const parsed = FnnAutomationStatusSchema.safeParse(data);
  if (error || !parsed.success) throw new Error("تعذّرت قراءة تقرير FNN. أعد المحاولة.");
  const status = parsed.data;
  if (status.state === "healthy") {
    const now = Date.now();
    const success = status.last_success_at ? Date.parse(status.last_success_at) : NaN;
    const observed = status.report ? Date.parse(status.report.observed_at) : NaN;
    if (
      !Number.isFinite(success) ||
      !Number.isFinite(observed) ||
      success > now + 60_000 ||
      observed > now + 60_000
    )
      throw new Error("لم يصل إثبات تشغيل صالح لـ FNN. أعد المحاولة.");
    if (now - Math.min(success, observed) > 15 * 60_000) status.state = "stale";
  }
  return {
    ...status,
    last_error_code: status.last_error_code ? "تعذّرت دورة التقرير الأخيرة." : null,
  };
}

export function automationReportPlan(status: FnnAutomationStatus): FnnPlan {
  const report = status.report;
  const sampled = (n: number, capped: boolean) => `${n}${capped ? " أو أكثر" : ""}`;
  return {
    workflow: "scheduled_operational_report",
    title: `أتمتة FNN: ${labels[status.state]}`,
    status: "prepared",
    peers: [],
    tools: ["قراءة التقرير الدوري المحفوظ"],
    steps: [
      `الجدولة: ${status.schedule ?? "لا توجد جدولة"} (UTC). الدورات المكتملة: ${status.completed_cycles}.`,
      ...(report
        ? [
            `وقت الرصد: ${report.observed_at}. مراقب التشغيل: ${labels[report.watchdog_state]}.`,
            `أحداث معلقة: ${sampled(report.pending_events, report.pending_events_capped)}. مهام قيد التشغيل: ${sampled(report.running_workflows, report.running_workflows_capped)}. حد القراءة: ${report.sample_limit}.`,
          ]
        : ["لم تُحفظ نتيجة تقرير بعد؛ التفعيل وحده لا يثبت التشغيل."]),
      "التقرير يقرأ مؤشرات التشغيل فقط؛ لا ينفّذ الأحداث المعلقة أو يغيّر بيانات العمل أو ينشر الكود.",
    ],
  };
}
