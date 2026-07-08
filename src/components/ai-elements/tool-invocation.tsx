import { CheckCircle2, Loader2, XCircle, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Renders an inline tool invocation from an AI SDK UIMessage part of type
 * `tool-<name>` or legacy `tool-invocation`. Shows tool name, state, and a
 * compact summary of the result for executive transparency.
 */

type ToolPart = {
  type: string;
  state?: "input-streaming" | "input-available" | "output-available" | "output-error";
  input?: unknown;
  output?: unknown;
  errorText?: string;
  toolName?: string;
};

const TOOL_LABELS: Record<string, { ar: string; en: string; icon: string }> = {
  create_task: { ar: "إنشاء مهمة", en: "Create Task", icon: "📝" },
  query_kpis: { ar: "قراءة المؤشرات", en: "Query KPIs", icon: "📊" },
  list_open_crises: { ar: "الأزمات المفتوحة", en: "Open Crises", icon: "⚠️" },
  send_executive_email: { ar: "إرسال بريد تنفيذي", en: "Send Email", icon: "📧" },
  record_executive_decision: { ar: "تسجيل قرار", en: "Record Decision", icon: "🎯" },
  query_tasks: { ar: "قراءة المهام", en: "Query Tasks", icon: "✅" },
  update_task_status: { ar: "تحديث المهمة", en: "Update Task", icon: "🔄" },
  search_knowledge: { ar: "بحث في المعرفة", en: "Search Knowledge", icon: "🔎" },
  create_intelligence_alert: { ar: "إنشاء تنبيه", en: "Create Alert", icon: "🚨" },
};

function summarizeOutput(toolName: string, output: unknown): string | null {
  if (!output || typeof output !== "object") return null;
  const o = output as Record<string, unknown> & { ok?: boolean; error?: string };
  if (o.ok === false) return o.error ?? "Failed";
  switch (toolName) {
    case "create_task": {
      const t = o.task as { title?: string; priority?: string } | undefined;
      return t ? `${t.title} · ${t.priority}` : null;
    }
    case "query_kpis": {
      const kpis = o.kpis as unknown[] | undefined;
      return kpis ? `${kpis.length} KPIs` : null;
    }
    case "list_open_crises": {
      const c = o.crises as unknown[] | undefined;
      return c ? `${c.length} open` : null;
    }
    case "send_executive_email":
      return "Sent ✓";
    case "record_executive_decision": {
      const m = o.memory as { title?: string; kind?: string } | undefined;
      return m ? `${m.kind}: ${m.title}` : null;
    }
    case "query_tasks": {
      const count = o.count as number | undefined;
      return typeof count === "number" ? `${count} tasks` : null;
    }
    case "update_task_status": {
      const t = o.task as { title?: string; status?: string } | undefined;
      return t ? `${t.title} → ${t.status}` : null;
    }
    case "search_knowledge": {
      const count = o.count as number | undefined;
      return typeof count === "number" ? `${count} docs found` : null;
    }
    case "create_intelligence_alert": {
      const a = o.alert as { title?: string; severity?: string } | undefined;
      return a ? `[${a.severity}] ${a.title}` : null;
    }
    default:
      return null;
  }
}

export function ToolInvocation({ part }: { part: ToolPart }) {
  const toolName =
    part.toolName ?? (part.type.startsWith("tool-") ? part.type.slice(5) : part.type);
  const label = TOOL_LABELS[toolName] ?? { ar: toolName, en: toolName, icon: "🛠" };
  const state = part.state ?? "input-available";
  const isRunning = state === "input-streaming" || state === "input-available";
  const isDone = state === "output-available";
  const isError = state === "output-error";
  const summary = isDone ? summarizeOutput(toolName, part.output) : null;

  return (
    <div
      className={cn(
        "my-1 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs",
        isError
          ? "border-destructive/40 bg-destructive/5 text-destructive"
          : isDone
            ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
            : "border-primary/30 bg-primary/5 text-primary",
      )}
    >
      <span className="text-sm leading-none">{label.icon}</span>
      <span className="font-medium">{label.en}</span>
      <span className="text-muted-foreground">·</span>
      <span className="text-muted-foreground">{label.ar}</span>
      <div className="ms-auto flex items-center gap-1.5">
        {summary && <span className="font-mono text-[11px] opacity-80">{summary}</span>}
        {isRunning && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {isDone && <CheckCircle2 className="h-3.5 w-3.5" />}
        {isError && <XCircle className="h-3.5 w-3.5" />}
        {!isRunning && !isDone && !isError && <Wrench className="h-3.5 w-3.5" />}
      </div>
    </div>
  );
}
