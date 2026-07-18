import {
  Ban,
  CheckCircle2,
  Clock3,
  Loader2,
  Mail,
  MessageSquareText,
  ShieldCheck,
  XCircle,
  Wrench,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  approveAriaOutboundMessage,
  cancelAriaOutboundMessage,
} from "@/lib/aria/outbound-messaging.functions";

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
  send_executive_email: {
    ar: "إرسال بريد تنفيذي",
    en: "Send Email",
    icon: "📧",
  },
  send_executive_sms: { ar: "إرسال رسالة نصية", en: "Send SMS", icon: "💬" },
  record_executive_decision: {
    ar: "تسجيل قرار",
    en: "Record Decision",
    icon: "🎯",
  },
  query_tasks: { ar: "قراءة المهام", en: "Query Tasks", icon: "✅" },
  update_task_status: { ar: "تحديث المهمة", en: "Update Task", icon: "🔄" },
  search_knowledge: {
    ar: "بحث في المعرفة",
    en: "Search Knowledge",
    icon: "🔎",
  },
  create_intelligence_alert: {
    ar: "إنشاء تنبيه",
    en: "Create Alert",
    icon: "🚨",
  },
  hcis_compliance_status: {
    ar: "حالة الامتثال",
    en: "HCIS Status",
    icon: "🛡️",
  },
  hcis_critical_findings: {
    ar: "فجوات الامتثال",
    en: "HCIS Findings",
    icon: "🔍",
  },
  ptw_active_permits: {
    ar: "التصاريح النشطة",
    en: "Active Permits",
    icon: "📋",
  },
  sec_create_incident: { ar: "تسجيل حادث", en: "Create Incident", icon: "🚨" },
  sec_update_incident: { ar: "تحديث حادث", en: "Update Incident", icon: "🛡️" },
  sec_list_incidents: { ar: "قراءة الحوادث", en: "List Incidents", icon: "📑" },
  sec_create_work_order: {
    ar: "إنشاء أمر عمل",
    en: "Create Work Order",
    icon: "🧰",
  },
  sec_close_work_order: {
    ar: "إغلاق أمر عمل",
    en: "Close Work Order",
    icon: "✅",
  },
  sec_list_work_orders: {
    ar: "قراءة أوامر العمل",
    en: "List Work Orders",
    icon: "🛠️",
  },
  sec_create_permit: { ar: "إنشاء تصريح", en: "Create Permit", icon: "📋" },
  sec_decide_permit: { ar: "قرار تصريح", en: "Permit Decision", icon: "⚖️" },
  sec_list_permits: { ar: "قراءة التصاريح", en: "List Permits", icon: "📄" },
  sec_schedule_patrol: { ar: "جدولة دورية", en: "Schedule Patrol", icon: "🚓" },
  sec_list_patrols: { ar: "قراءة الدوريات", en: "List Patrols", icon: "🧭" },
  sec_register_visitor: {
    ar: "تسجيل زائر",
    en: "Register Visitor",
    icon: "🪪",
  },
  sec_checkout_visitor: {
    ar: "خروج زائر",
    en: "Check Out Visitor",
    icon: "🚪",
  },
  sec_list_visitors: { ar: "قراءة الزوار", en: "List Visitors", icon: "👥" },
  sec_list_cctv_alerts: {
    ar: "تنبيهات الكاميرات",
    en: "CCTV Alerts",
    icon: "📹",
  },
  sec_triage_cctv_alert: {
    ar: "فرز تنبيه كاميرا",
    en: "Triage CCTV",
    icon: "🎥",
  },
  sec_navigate: { ar: "فتح الصفحة", en: "Navigate", icon: "↗️" },
  generate_image: { ar: "إنشاء صورة", en: "Generate Image", icon: "🎨" },
};

function summarizeOutput(toolName: string, output: unknown): string | null {
  if (!output || typeof output !== "object") return null;
  const o = output as Record<string, unknown> & {
    ok?: boolean;
    error?: string;
  };
  if (o.ok === false) return o.error ?? "Failed";
  if (o.requiresApproval === true) return "بانتظار اعتمادك · Awaiting approval";
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
      return o.ok === true ? `Email · ${String(o.status ?? "accepted")}` : "Email · غير مؤكّد";
    case "send_executive_sms":
      return o.ok === true ? `SMS · ${String(o.status ?? "accepted")}` : "SMS · غير مؤكّد";
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
    default: {
      if (typeof o.navigate_to === "string") return `فتح ${o.navigate_to}`;
      if (typeof o.ref === "string") return o.ref;
      if (typeof o.count === "number") return `${o.count} result(s)`;
      return o.ok === true ? "تم التنفيذ" : null;
    }
  }
}

function navigationTarget(output: unknown): string | null {
  if (!output || typeof output !== "object") return null;
  const result = output as { ok?: boolean; navigate_to?: unknown };
  return result.ok === true &&
    typeof result.navigate_to === "string" &&
    /^\/[\w/-]*$/.test(result.navigate_to)
    ? result.navigate_to
    : null;
}

type ApprovalPreview = {
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

function approvalPreview(output: unknown): ApprovalPreview | null {
  if (!output || typeof output !== "object") return null;
  const root = output as Record<string, unknown>;
  const raw = root.approval;
  if (root.ok !== true || root.requiresApproval !== true || !raw || typeof raw !== "object") {
    return null;
  }
  const a = raw as Record<string, unknown>;
  if (
    typeof a.ledgerId !== "string" ||
    typeof a.approvalToken !== "string" ||
    typeof a.expiresAt !== "string" ||
    (a.channel !== "email" && a.channel !== "sms") ||
    typeof a.recipient !== "string" ||
    typeof a.body !== "string"
  ) {
    return null;
  }
  return {
    ledgerId: a.ledgerId,
    approvalToken: a.approvalToken,
    expiresAt: a.expiresAt,
    channel: a.channel,
    recipient: a.recipient,
    ...(typeof a.cc === "string" ? { cc: a.cc } : {}),
    ...(typeof a.subject === "string" ? { subject: a.subject } : {}),
    body: a.body,
    mediaCount: typeof a.mediaCount === "number" ? a.mediaCount : 0,
  };
}

function OutboundApprovalCard({ approval }: { approval: ApprovalPreview }) {
  const approveFn = useServerFn(approveAriaOutboundMessage);
  const cancelFn = useServerFn(cancelAriaOutboundMessage);
  const [reviewed, setReviewed] = useState(false);
  const [phase, setPhase] = useState<
    "idle" | "approving" | "cancelling" | "sent" | "cancelled" | "error"
  >("idle");
  const [detail, setDetail] = useState<string | null>(null);
  const expired = new Date(approval.expiresAt).getTime() <= Date.now();
  const busy = phase === "approving" || phase === "cancelling";
  const ChannelIcon = approval.channel === "email" ? Mail : MessageSquareText;
  const expiryLabel = new Date(approval.expiresAt).toLocaleTimeString("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
  });

  async function approve() {
    if (!reviewed || busy || expired) return;
    setPhase("approving");
    setDetail(null);
    try {
      const result = await approveFn({
        data: {
          ledgerId: approval.ledgerId,
          approvalToken: approval.approvalToken,
        },
      });
      if (!result.ok) throw new Error(result.error || "تعذّر إرسال الرسالة.");
      setDetail(
        result.status === "delivered"
          ? "تم التسليم وتوثيق الحالة."
          : result.provider === "outlook"
            ? "قبل Outlook الرسالة. يعرض هذا الموصل حالة القبول فقط ولا يؤكد التسليم النهائي."
            : "قبل مزوّد الخدمة الرسالة، وسيُحدَّث سجل التسليم تلقائياً.",
      );
      setPhase("sent");
    } catch (error) {
      setDetail(error instanceof Error ? error.message : "تعذّر إكمال الاعتماد.");
      setPhase("error");
    }
  }

  async function cancel() {
    if (busy || phase === "sent" || phase === "cancelled") return;
    setPhase("cancelling");
    setDetail(null);
    try {
      const result = await cancelFn({
        data: {
          ledgerId: approval.ledgerId,
          approvalToken: approval.approvalToken,
        },
      });
      if (!result.ok) throw new Error("انتهى طلب الاعتماد أو تم استخدامه مسبقاً.");
      setPhase("cancelled");
      setDetail("أُلغيت المسودة ولم تُرسل.");
    } catch (error) {
      setDetail(error instanceof Error ? error.message : "تعذّر إلغاء المسودة.");
      setPhase("error");
    }
  }

  if (phase === "sent" || phase === "cancelled") {
    const sent = phase === "sent";
    return (
      <div
        role="status"
        className={cn(
          "my-2 rounded-2xl border p-3 text-xs",
          sent
            ? "border-emerald-400/35 bg-emerald-400/[0.08] text-emerald-100"
            : "border-white/15 bg-white/[0.035] text-white/75",
        )}
      >
        <div className="flex items-center gap-2 font-bold">
          {sent ? <CheckCircle2 className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
          {sent ? "تم الاعتماد والإرسال" : "أُلغيت المسودة"}
        </div>
        {detail && <p className="mt-1 leading-relaxed opacity-80">{detail}</p>}
      </div>
    );
  }

  return (
    <section
      aria-label="معاينة واعتماد رسالة آريا"
      className="nexus-card my-2 overflow-hidden rounded-2xl border border-amber-300/28 bg-[#061a2e]/88 text-right shadow-[0_18px_55px_-32px_rgba(245,197,96,.7)]"
      dir="rtl"
    >
      <header className="flex items-start gap-3 border-b border-white/8 bg-white/[0.025] p-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-amber-300/30 bg-amber-300/10 text-amber-200">
          <ChannelIcon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-white">معاينة قبل الإرسال</h3>
            <span className="rounded-full border border-amber-300/25 bg-amber-300/8 px-2 py-0.5 text-[9px] font-bold text-amber-200">
              اعتماد بشري إلزامي
            </span>
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-white/55">
            لم تُرسل الرسالة. راجع المستلم والمحتوى ثم اعتمدها مرة واحدة.
          </p>
        </div>
      </header>

      <div className="space-y-2.5 p-3">
        <dl className="grid gap-2 text-[11px]">
          <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-2">
            <dt className="text-white/45">المستلم</dt>
            <dd
              dir="ltr"
              className="truncate text-left font-mono text-white"
              title={approval.recipient}
            >
              {approval.recipient}
            </dd>
          </div>
          {approval.cc && (
            <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-2">
              <dt className="text-white/45">نسخة</dt>
              <dd dir="ltr" className="truncate text-left font-mono text-white" title={approval.cc}>
                {approval.cc}
              </dd>
            </div>
          )}
          {approval.subject && (
            <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-2">
              <dt className="text-white/45">الموضوع</dt>
              <dd className="font-semibold text-white/90">{approval.subject}</dd>
            </div>
          )}
        </dl>

        <div className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-xl border border-white/8 bg-black/20 p-3 text-[11px] leading-6 text-white/78">
          {approval.body}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-white/45">
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="h-3 w-3" /> ينتهي الاعتماد {expiryLabel}
          </span>
          {approval.mediaCount > 0 && <span>{approval.mediaCount} مرفق وسائط</span>}
        </div>

        <label className="flex min-h-11 cursor-pointer items-start gap-2 rounded-xl border border-white/10 bg-white/[0.025] p-2.5 text-[11px] leading-relaxed text-white/75">
          <input
            type="checkbox"
            checked={reviewed}
            onChange={(event) => setReviewed(event.target.checked)}
            className="mt-0.5 h-4 w-4 accent-cyan-400"
          />
          <span>راجعتُ المستلم والمحتوى، وأوافق صراحةً على الإرسال الآن.</span>
        </label>

        {(detail || expired) && (
          <p
            role="alert"
            className="rounded-lg border border-rose-400/25 bg-rose-400/8 px-2.5 py-2 text-[10px] text-rose-200"
          >
            {expired ? "انتهت صلاحية هذه المسودة. اطلب من آريا إنشاء معاينة جديدة." : detail}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => void cancel()}
            disabled={busy}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.035] px-3 text-[11px] font-bold text-white/70 transition hover:border-white/25 hover:text-white disabled:opacity-45"
          >
            {phase === "cancelling" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Ban className="h-3.5 w-3.5" />
            )}
            إلغاء
          </button>
          <button
            type="button"
            onClick={() => void approve()}
            disabled={!reviewed || busy || expired}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-300/40 bg-emerald-300 px-3 text-[11px] font-black text-[#03131f] shadow-[0_10px_30px_-16px_rgba(52,211,153,.9)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {phase === "approving" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5" />
            )}
            اعتماد وإرسال
          </button>
        </div>
      </div>
    </section>
  );
}

export function ToolInvocation({ part }: { part: ToolPart }) {
  const navigate = useNavigate();
  const navigatedRef = useRef<string | null>(null);
  const toolName =
    part.toolName ?? (part.type.startsWith("tool-") ? part.type.slice(5) : part.type);
  const label = TOOL_LABELS[toolName] ?? {
    ar: toolName,
    en: toolName,
    icon: "🛠",
  };
  const state = part.state ?? "input-available";
  const isRunning = state === "input-streaming" || state === "input-available";
  const isDone = state === "output-available";
  const isError = state === "output-error";
  const outputFailed =
    isDone &&
    !!part.output &&
    typeof part.output === "object" &&
    (part.output as { ok?: boolean }).ok === false;
  const displayError = isError || outputFailed;
  const displayDone = isDone && !outputFailed;
  const summary = isDone ? summarizeOutput(toolName, part.output) : null;
  const approval = isDone ? approvalPreview(part.output) : null;

  useEffect(() => {
    const target = isDone ? navigationTarget(part.output) : null;
    if (!target || navigatedRef.current === target) return;
    navigatedRef.current = target;
    void navigate({ to: target as never });
  }, [isDone, navigate, part.output]);

  if (approval) return <OutboundApprovalCard approval={approval} />;

  return (
    <div
      className={cn(
        "my-1 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs",
        displayError
          ? "border-destructive/40 bg-destructive/5 text-destructive"
          : displayDone
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
        {displayDone && <CheckCircle2 className="h-3.5 w-3.5" />}
        {displayError && <XCircle className="h-3.5 w-3.5" />}
        {!isRunning && !displayDone && !displayError && <Wrench className="h-3.5 w-3.5" />}
      </div>
    </div>
  );
}
