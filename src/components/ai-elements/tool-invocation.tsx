import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Ban,
  CheckCircle2,
  Clock3,
  Loader2,
  LockKeyhole,
  Mail,
  MessageSquareText,
  Send,
  ShieldCheck,
  Wrench,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  approveAriaOutboundMessage,
  cancelAriaOutboundMessage,
} from "@/lib/aria/outbound-messaging.functions";

/**
 * Renders an inline tool invocation from an AI SDK UIMessage part of type
 * `tool-<name>` or legacy `tool-invocation`. Outbound email/SMS receives a
 * dedicated human-approval surface: a tool result alone can never send.
 */

type ToolPart = {
  type: string;
  state?: "input-streaming" | "input-available" | "output-available" | "output-error";
  input?: unknown;
  output?: unknown;
  errorText?: string;
  toolName?: string;
};

type ApprovalOutput = {
  ok: true;
  requiresApproval: true;
  approval: {
    ledgerId: string;
    approvalToken: string;
    expiresAt: string;
    channel: "email" | "sms";
    recipient: string;
    cc?: string;
    subject?: string;
    body: string;
    mediaCount: number;
  };
};

const TOOL_LABELS: Record<string, { ar: string; en: string; icon: string }> = {
  create_task: { ar: "إنشاء مهمة", en: "Create Task", icon: "📝" },
  query_kpis: { ar: "قراءة المؤشرات", en: "Query KPIs", icon: "📊" },
  list_open_crises: { ar: "الأزمات المفتوحة", en: "Open Crises", icon: "⚠️" },
  send_executive_email: { ar: "اعتماد بريد تنفيذي", en: "Email Approval", icon: "📧" },
  send_executive_sms: { ar: "اعتماد رسالة نصية", en: "SMS Approval", icon: "💬" },
  record_executive_decision: { ar: "تسجيل قرار", en: "Record Decision", icon: "🎯" },
  query_tasks: { ar: "قراءة المهام", en: "Query Tasks", icon: "✅" },
  update_task_status: { ar: "تحديث المهمة", en: "Update Task", icon: "🔄" },
  search_knowledge: { ar: "بحث في المعرفة", en: "Search Knowledge", icon: "🔎" },
  create_intelligence_alert: { ar: "إنشاء تنبيه", en: "Create Alert", icon: "🚨" },
};

function asApprovalOutput(output: unknown): ApprovalOutput | null {
  if (!output || typeof output !== "object") return null;
  const value = output as Partial<ApprovalOutput>;
  if (
    value.ok !== true ||
    value.requiresApproval !== true ||
    !value.approval?.ledgerId ||
    !value.approval.approvalToken
  ) {
    return null;
  }
  return value as ApprovalOutput;
}

function summarizeOutput(toolName: string, output: unknown): string | null {
  if (!output || typeof output !== "object") return null;
  const o = output as Record<string, unknown> & { ok?: boolean; error?: string };
  if (o.ok === false) return o.error ?? "Failed";
  if (o.requiresApproval === true) return "بانتظار اعتمادك · AWAITING APPROVAL";
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
      return `Email ${String(o.status ?? "accepted")} ✓`;
    case "send_executive_sms":
      return `SMS ${String(o.status ?? "accepted")} ✓`;
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

type ApprovalUiState =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; provider?: string; status: string; warning?: string }
  | { kind: "uncertain"; message: string }
  | { kind: "cancelled" }
  | { kind: "error"; message: string };

function HumanApprovalCard({ output }: { output: ApprovalOutput }) {
  const approve = useServerFn(approveAriaOutboundMessage);
  const cancel = useServerFn(cancelAriaOutboundMessage);
  const [state, setState] = useState<ApprovalUiState>({ kind: "idle" });
  const approval = output.approval;
  const EmailOrSms = approval.channel === "email" ? Mail : MessageSquareText;
  const inactive = state.kind !== "idle" && state.kind !== "error";

  const confirm = async () => {
    if (inactive) return;
    setState({ kind: "sending" });
    try {
      const result = await approve({
        data: {
          ledgerId: approval.ledgerId,
          approvalToken: approval.approvalToken,
        },
      });
      if (result.status === "unknown") {
        setState({
          kind: "uncertain",
          message:
            result.error ??
            "تم استهلاك الاعتماد، لكن نتيجة المزوّد تحتاج مطابقة. لم يُنفذ إرسال مكرر.",
        });
        return;
      }
      if (!result.ok) {
        setState({ kind: "error", message: result.error ?? "تعذّر إرسال الرسالة" });
        return;
      }
      setState({
        kind: "sent",
        provider: result.provider,
        status: result.status,
        warning: result.error,
      });
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "تعذّر اعتماد الرسالة",
      });
    }
  };

  const reject = async () => {
    if (inactive) return;
    setState({ kind: "sending" });
    try {
      const result = await cancel({
        data: {
          ledgerId: approval.ledgerId,
          approvalToken: approval.approvalToken,
        },
      });
      setState(result.ok ? { kind: "cancelled" } : { kind: "error", message: "تعذّر الإلغاء" });
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "تعذّر إلغاء الرسالة",
      });
    }
  };

  return (
    <section
      dir="rtl"
      className="aria-approval-card relative my-2 min-w-0 overflow-hidden rounded-[22px] border border-cyan-300/25 bg-[linear-gradient(145deg,rgba(3,18,35,.96),rgba(4,29,48,.92)_55%,rgba(4,18,33,.97))] text-right shadow-[0_24px_70px_rgba(0,7,18,.52),0_0_34px_rgba(34,211,238,.12),inset_0_1px_0_rgba(255,255,255,.08)]"
      aria-label="معاينة رسالة تتطلب اعتماداً بشرياً"
    >
      <div className="pointer-events-none absolute -left-16 -top-20 h-44 w-44 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="aria-approval-scan pointer-events-none absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <header className="relative flex items-start gap-3 border-b border-white/[0.08] px-4 py-3.5">
        <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-cyan-300/35 bg-cyan-300/10 text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,.16)]">
          <EmailOrSms className="h-5 w-5" aria-hidden />
          <span className="absolute inset-0 animate-pulse rounded-2xl ring-1 ring-cyan-200/20" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[13px] font-black tracking-tight text-white">
              اعتماد بشري قبل الإرسال
            </h3>
            <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-2 py-0.5 text-[8px] font-black tracking-[0.16em] text-amber-200">
              HUMAN IN COMMAND
            </span>
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-cyan-50/55">
            آريا أعدّت الرسالة فقط. لن يحدث أي إرسال حتى تضغط «اعتماد وإرسال».
          </p>
        </div>
        <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
      </header>

      <div className="relative space-y-3 px-4 py-3.5">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.035] px-3 py-2">
            <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-cyan-100/40">
              المستلم · Recipient
            </div>
            <div dir="ltr" className="mt-1 truncate text-left font-mono text-[11px] text-white/90">
              {approval.recipient}
            </div>
          </div>
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.035] px-3 py-2">
            <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-cyan-100/40">
              القناة · Channel
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] font-bold text-white/85">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300 shadow-[0_0_8px_#22D3EE]" />
              {approval.channel === "email" ? "بريد إلكتروني" : "SMS / MMS"}
              {approval.mediaCount > 0 && ` · ${approval.mediaCount} وسائط`}
            </div>
          </div>
        </div>

        {approval.cc && (
          <div className="text-[10px] text-white/58">
            <span className="font-semibold text-white/78">نسخة إلى:</span>{" "}
            <span dir="ltr" className="font-mono">
              {approval.cc}
            </span>
          </div>
        )}
        {approval.subject && (
          <div className="rounded-xl border border-blue-300/10 bg-blue-300/[0.035] px-3 py-2.5">
            <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-blue-100/40">
              الموضوع · Subject
            </div>
            <div className="mt-1 text-[11px] font-bold leading-relaxed text-white/88">
              {approval.subject}
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-black/20">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
            <span className="text-[8px] font-bold uppercase tracking-[0.16em] text-white/42">
              المعاينة الكاملة · Full preview
            </span>
            <span className="flex items-center gap-1 text-[8px] text-emerald-200/70">
              <LockKeyhole className="h-2.5 w-2.5" /> محتوى مشفّر في السجل
            </span>
          </div>
          <pre className="max-h-52 overflow-auto whitespace-pre-wrap break-words px-3 py-3 font-sans text-[11px] leading-6 text-white/76 selection:bg-cyan-300/25">
            {approval.body}
          </pre>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-[9px] text-white/42">
            <Clock3 className="h-3 w-3 text-amber-200/70" />
            ينتهي الاعتماد{" "}
            {new Date(approval.expiresAt).toLocaleTimeString("ar-SA", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <span className="font-mono text-[8px] tracking-wider text-white/28">
            REF {approval.ledgerId.slice(0, 8).toUpperCase()}
          </span>
        </div>

        {state.kind === "error" && (
          <div
            role="alert"
            className="rounded-xl border border-rose-400/25 bg-rose-400/10 px-3 py-2 text-[10px] leading-relaxed text-rose-100"
          >
            {state.message}
          </div>
        )}
        {state.kind === "sent" && (
          <div className="space-y-1.5 rounded-xl border border-emerald-300/25 bg-emerald-300/10 px-3 py-2.5 text-[11px] font-bold text-emerald-100 shadow-[0_0_22px_rgba(52,211,153,.1)]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              تم الاعتماد والإرسال عبر {state.provider ?? "المزوّد"} · الحالة {state.status}
            </div>
            {state.warning && (
              <p className="text-[9px] font-medium text-amber-100/75">{state.warning}</p>
            )}
          </div>
        )}
        {state.kind === "uncertain" && (
          <div
            role="status"
            className="rounded-xl border border-amber-300/25 bg-amber-300/10 px-3 py-2.5 text-[10px] leading-relaxed text-amber-50 shadow-[0_0_22px_rgba(251,191,36,.08)]"
          >
            <div className="mb-1 flex items-center gap-2 font-black">
              <Clock3 className="h-4 w-4" /> قيد مطابقة سجل المزوّد
            </div>
            {state.message}
          </div>
        )}
        {state.kind === "cancelled" && (
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[11px] font-semibold text-white/62">
            <Ban className="h-4 w-4" /> أُلغي الطلب ولم تُرسل الرسالة.
          </div>
        )}

        {(state.kind === "idle" || state.kind === "error" || state.kind === "sending") && (
          <div className="grid grid-cols-[1fr_auto] gap-2 pt-0.5">
            <button
              type="button"
              onClick={confirm}
              disabled={state.kind === "sending"}
              className="group relative min-h-11 overflow-hidden rounded-xl border border-cyan-200/45 bg-[linear-gradient(100deg,rgba(8,145,178,.72),rgba(37,99,235,.72))] px-4 py-2.5 text-[11px] font-black text-white shadow-[0_0_28px_rgba(34,211,238,.16)] transition duration-300 hover:-translate-y-0.5 hover:border-cyan-100/75 hover:shadow-[0_0_38px_rgba(34,211,238,.26)] disabled:cursor-wait disabled:opacity-65"
            >
              <span className="relative flex items-center justify-center gap-2">
                {state.kind === "sending" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                )}
                اعتماد وإرسال الآن
              </span>
            </button>
            <button
              type="button"
              onClick={reject}
              disabled={state.kind === "sending"}
              className="min-h-11 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2.5 text-[10px] font-bold text-white/58 transition hover:border-rose-300/30 hover:bg-rose-300/8 hover:text-rose-100 disabled:opacity-50"
            >
              إلغاء
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export function ToolInvocation({ part }: { part: ToolPart }) {
  const toolName =
    part.toolName ?? (part.type.startsWith("tool-") ? part.type.slice(5) : part.type);
  const approval = asApprovalOutput(part.output);
  if (part.state === "output-available" && approval) {
    return <HumanApprovalCard output={approval} />;
  }

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
