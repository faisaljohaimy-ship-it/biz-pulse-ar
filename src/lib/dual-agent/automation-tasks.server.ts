import { z } from "zod";
import { requireFnnOwner } from "./owner.server";
import { resolveCommandOrg, type CommandContext } from "./command.server";
import type { FnnPlan } from "@/lib/sadeed/orchestrator/fnn-plan";

const timestamp = z.string().datetime({ offset: true });
const state = z.enum(["disabled", "initializing", "healthy", "stale", "error"]);
const TaskSchema = z.object({
  code: z.enum(["watchdog_unhealthy", "new_event_backlog"]),
  status: z.enum(["open", "resolved"]),
  first_seen_at: timestamp,
  last_seen_at: timestamp,
  last_evaluated_at: timestamp,
  resolved_at: timestamp.nullable(),
  reopen_count: z.number().int().nonnegative(),
  resolution_count: z.number().int().nonnegative(),
  evidence: z.object({
    watchdog_state: state,
    pending_events_aged: z.number().int().min(0).max(1000),
    pending_events_aged_capped: z.boolean(),
    sample_limit: z.literal(1000),
  }),
});
export const FnnTasksSchema = z
  .object({
    activation_at: timestamp,
    observed_at: timestamp.nullable(),
    state,
    tasks: z.array(TaskSchema).max(2),
  })
  .superRefine((value, ctx) => {
    if (new Set(value.tasks.map((task) => task.code)).size !== value.tasks.length)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Duplicate task codes" });
    for (const task of value.tasks) {
      if (
        (task.status === "resolved" && (!task.resolved_at || task.resolution_count < 1)) ||
        (task.status === "open" && task.resolved_at !== null)
      )
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Inconsistent transition evidence" });
      if (task.evidence.pending_events_aged_capped && task.evidence.pending_events_aged !== 1000)
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Inconsistent capped sample" });
    }
  });
export type FnnTasks = z.infer<typeof FnnTasksSchema>;
const titles = {
  watchdog_unhealthy: "متابعة سلامة مراقب التشغيل",
  new_event_backlog: "متابعة أحداث جديدة معلقة لأكثر من ١٥ دقيقة",
};

/** Server-only read; no task transition or tick is started by asking the chat. */
export async function readFnnTasks(context: CommandContext): Promise<FnnTasks> {
  await requireFnnOwner(context);
  await resolveCommandOrg(context, "00000000-0000-0000-0000-000000000001");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const client = supabaseAdmin as unknown as {
    rpc(name: string): {
      abortSignal(signal: AbortSignal): Promise<{ data: unknown; error: unknown }>;
    };
  };
  const { data, error } = await client
    .rpc("sadeed_fnn_automation_tasks")
    .abortSignal(AbortSignal.timeout(3500));
  const parsed = FnnTasksSchema.safeParse(data);
  if (error || !parsed.success) throw new Error("لم تصل حالة متابعة FNN. أعد المحاولة.");
  const result = parsed.data;
  const now = Date.now();
  const activation = Date.parse(result.activation_at);
  const observed = result.observed_at ? Date.parse(result.observed_at) : NaN;
  const times = result.tasks.flatMap((task) => [
    task.first_seen_at,
    task.last_seen_at,
    task.last_evaluated_at,
    ...(task.resolved_at ? [task.resolved_at] : []),
  ]);
  if (
    activation > now + 60_000 ||
    times.some((time) => Date.parse(time) > now + 60_000 || Date.parse(time) < activation) ||
    (Number.isFinite(observed) && (observed > now + 60_000 || observed < activation)) ||
    (result.state === "healthy" && !Number.isFinite(observed))
  )
    throw new Error("لم يصل إثبات متابعة صالح. أعد المحاولة.");
  if (result.state === "healthy" && now - observed > 15 * 60_000) result.state = "stale";
  return result;
}

export function automationTasksPlan(result: FnnTasks): FnnPlan {
  const fresh = result.state === "healthy" && Boolean(result.observed_at);
  return {
    workflow: "operational_follow_up_tasks",
    title: "مهام متابعة FNN التلقائية",
    status: "prepared",
    peers: [],
    tools: ["قراءة حالات المتابعة المحفوظة"],
    steps: [
      `بدء نطاق الأحداث الجديدة: ${result.activation_at}. آخر تحقق محفوظ: ${result.observed_at ?? "لم يُرصد بعد"}.`,
      ...(fresh
        ? result.tasks.some((task) => task.status === "open")
          ? []
          : ["لم يرصد آخر تحقق متابعة مفتوحة ضمن الحالتين المراقبتين."]
        : ["حالة المتابعة الحالية غير مؤكدة؛ الحالات أدناه آخر ما حُفظ، ولا تثبت التعافي الآن."]),
      ...result.tasks.map(
        (task) =>
          `${titles[task.code]}: ${task.status === "open" ? "مفتوحة" : "زال شرط تنبيه المتابعة"}. آخر تقييم: ${task.last_evaluated_at}. مرات زوال الشرط: ${task.resolution_count}؛ إعادة الفتح: ${task.reopen_count}.`,
      ),
      "هذه متابعات داخلية خاصة؛ زوال التنبيه لا يعني تنفيذ الأحداث أو اعتماد قرارات العمل. لا يُعاد تشغيل الأحداث التاريخية.",
    ],
  };
}
