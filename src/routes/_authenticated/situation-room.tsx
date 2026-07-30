/**
 * Operations Room — `/situation-room`
 *
 * Phase 5 — calmer, more cinematic redesign over the existing War Room
 * runtime. Reuses `getBridgeState`, `getMissionTimeline`,
 * `getPredictedRisks`, `generateExecutiveBriefing`, `AgentRing`,
 * `MissionTimeline` and `BriefingStage`. Adds an
 * Executive Decision Engine column (Risks / Opportunities / Actions).
 *
 * No DB schema, no workflow, no agent logic changes.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck,
  Activity,
  AlertTriangle,
  Loader2,
  PlayCircle,
  TrendingUp,
  Users,
  FileCheck2,
  Wrench,
  Brain,
  GaugeCircle,
  Radio,
  Sparkles,
  Map as MapIcon,
  Presentation,
  Eye,
  ClipboardList,
  FileBarChart,
  ShieldAlert,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  getBridgeState,
  getMissionTimeline,
  type BridgeAgent,
  type BridgeHealth,
} from "@/lib/exec/bridge.functions";
import {
  generateExecutiveBriefing,
  type BriefingSegment,
  type ExecutiveBriefing,
} from "@/lib/exec/briefing.functions";
import { getPredictedRisks } from "@/lib/exec/predictive.functions";
import { BriefingStage } from "@/components/bridge/BriefingStage";
import { MissionTimeline } from "@/components/bridge/MissionTimeline";
import { DecisionEngine } from "@/components/situation-room/DecisionEngine";
import { AgentConversation } from "@/components/situation-room/AgentConversation";

export const Route = createFileRoute("/_authenticated/situation-room")({
  head: () => ({
    meta: [
      { title: "غرفة العمليات — إدارة الأمن الصناعي" },
      {
        name: "description",
        content: "غرفة عمليات حية لمتابعة الحوادث والتنبيهات والتصعيد وأدوار وكلاء الأمن الصناعي.",
      },
    ],
  }),
  component: SituationRoomPage,
  errorComponent: ({ error, reset }) => (
    <div className="grid min-h-[60vh] place-items-center p-8 text-center">
      <div className="space-y-3">
        <AlertTriangle className="mx-auto h-8 w-8 text-rose-400" />
        <div className="text-lg font-semibold text-white">Situation Room unavailable</div>
        <div className="max-w-md text-sm text-white/60">{error.message}</div>
        <button
          onClick={reset}
          className="rounded-xl border border-cyan-400/40 px-4 py-2 text-sm text-cyan-200 hover:bg-cyan-400/10"
        >
          Retry
        </button>
      </div>
    </div>
  ),
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

function threatLevel(score: number): {
  key: "secure" | "normal" | "elevated" | "critical";
  ar: string;
  en: string;
  tone: string;
} {
  if (score >= 90)
    return {
      key: "secure",
      ar: "آمن",
      en: "Secure",
      tone: "bg-emerald-400/15 text-emerald-200 ring-emerald-400/30",
    };
  if (score >= 70)
    return {
      key: "normal",
      ar: "عادي",
      en: "Normal",
      tone: "bg-cyan-400/15 text-cyan-200 ring-cyan-400/30",
    };
  if (score >= 50)
    return {
      key: "elevated",
      ar: "مرتفع",
      en: "Elevated",
      tone: "bg-amber-400/15 text-amber-200 ring-amber-400/30",
    };
  return {
    key: "critical",
    ar: "حرج",
    en: "Critical",
    tone: "bg-rose-400/15 text-rose-200 ring-rose-400/30",
  };
}

function SituationRoomPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";

  const getState = useServerFn(getBridgeState);
  const getRisks = useServerFn(getPredictedRisks);
  const getTimeline = useServerFn(getMissionTimeline);
  const genBriefing = useServerFn(generateExecutiveBriefing);

  const state = useQuery({
    queryKey: ["situation-state"],
    queryFn: () => getState(),
    refetchInterval: 45_000,
    refetchOnWindowFocus: false,
    refetchIntervalInBackground: false,
  });

  const risks = useQuery({
    queryKey: ["situation-risks"],
    queryFn: () => getRisks(),
    refetchInterval: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchIntervalInBackground: false,
  });

  const [paused, setPaused] = useState(false);
  const timeline = useQuery({
    queryKey: ["situation-timeline"],
    queryFn: () => getTimeline(),
    refetchInterval: paused ? false : 10_000,
    refetchOnWindowFocus: false,
    refetchIntervalInBackground: false,
  });

  const [briefing, setBriefing] = useState<ExecutiveBriefing | null>(null);
  const [spotlightSegment, setSpotlightSegment] = useState<BriefingSegment | null>(null);

  const startBriefing = useMutation({
    mutationFn: () => genBriefing(),
    onSuccess: (data) => setBriefing(data),
  });

  const agents = useMemo(() => state.data?.agents ?? [], [state.data?.agents]);
  const health = state.data?.health;
  const threat = threatLevel(health?.score ?? 0);

  return (
    <main
      className="relative -mt-2 min-h-[calc(100vh-2rem)] overflow-hidden rounded-3xl bg-gradient-to-br from-[#04111F] via-[#061A2E] to-[#03101D] text-[15px]"
      dir={ar ? "rtl" : "ltr"}
    >
      {/* Ambient backdrop — calm, no looping animations */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/3 h-[720px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/10 blur-[160px]" />
        <div className="absolute right-0 top-0 h-[360px] w-[360px] rounded-full bg-emerald-400/[0.05] blur-[140px]" />
        <div className="absolute -bottom-20 left-0 h-[280px] w-[280px] rounded-full bg-amber-400/[0.04] blur-[120px]" />
      </div>

      <TopStatusBar ar={ar} health={health} loading={state.isLoading} threat={threat} />

      <div className="relative grid grid-cols-1 gap-5 px-5 pb-5 lg:grid-cols-[280px_minmax(0,1fr)_380px]">
        <OperationalHealthColumn ar={ar} health={health} loading={state.isLoading} />

        {/* CENTER — role dashboard. No electronic characters or avatars. */}
        <div className="relative flex min-h-[660px] flex-col justify-center gap-6">
          <AgentRoleDashboard agents={agents} ar={ar} spotlight={spotlightSegment} />

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => startBriefing.mutate(undefined)}
              disabled={startBriefing.isPending || state.isLoading}
              className={cn(
                "group relative inline-flex min-h-11 items-center gap-3 rounded-2xl px-7 py-4",
                "bg-gradient-to-br from-cyan-400 to-cyan-500 text-[#04111F] shadow-[0_0_56px_rgba(0,212,255,0.5)]",
                "text-sm font-semibold uppercase tracking-[0.2em]",
                "hover:from-cyan-300 hover:to-cyan-400 disabled:opacity-60 disabled:cursor-not-allowed",
                "transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200",
              )}
              aria-label={ar ? "ابدأ الموجز التنفيذي" : "Begin Executive Briefing"}
            >
              {startBriefing.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <PlayCircle className="h-5 w-5" />
              )}
              {ar ? "ابدأ الموجز التنفيذي · 60 ثانية" : "Begin Executive Briefing · 60s"}
            </button>

            <Link
              to="/sec/twin"
              className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-cyan-400/30 bg-white/[0.03] px-5 py-3 text-sm uppercase tracking-[0.18em] text-cyan-100 hover:bg-cyan-400/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
              aria-label={ar ? "افتح التوأم الرقمي" : "Open Digital Twin"}
            >
              <MapIcon className="h-4 w-4" />
              {ar ? "التوأم الرقمي" : "Digital Twin"}
            </Link>

            <Link
              to="/boardroom"
              className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.02] px-5 py-3 text-sm uppercase tracking-[0.18em] text-white/80 hover:bg-white/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              aria-label={ar ? "وضع العرض التنفيذي" : "Presentation Mode"}
            >
              <Presentation className="h-4 w-4" />
              {ar ? "وضع العرض" : "Presentation"}
            </Link>
          </div>

          {startBriefing.error && (
            <div className="text-sm text-rose-300">
              {String((startBriefing.error as Error).message)}
            </div>
          )}
        </div>

        {/* RIGHT — Executive Decision Engine + Predicted Risks */}
        <div className="flex flex-col gap-4">
          <DecisionEngine ar={ar} />
          <PredictedRiskRail ar={ar} risks={risks.data ?? []} loading={risks.isLoading} />
        </div>
      </div>

      {/* BOTTOM — Living Executive Conversation + Mission Timeline */}
      <div className="relative grid grid-cols-1 gap-5 px-5 pb-8 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <AgentConversation ar={ar} />
        <MissionTimeline
          entries={timeline.data ?? []}
          ar={ar}
          loading={timeline.isFetching}
          paused={paused}
          onTogglePause={() => setPaused((p) => !p)}
          onRefresh={() => timeline.refetch()}
        />
      </div>

      {briefing && (
        <BriefingStage
          briefing={briefing}
          ar={ar}
          onClose={() => {
            setBriefing(null);
            setSpotlightSegment(null);
          }}
          onSegmentChange={setSpotlightSegment}
        />
      )}
    </main>
  );
}

// ----------------------------------------------------------------------
// TOP — Mission Status / Threat Level
// ----------------------------------------------------------------------

function TopStatusBar({
  ar,
  health,
  loading,
  threat,
}: {
  ar: boolean;
  health?: BridgeHealth;
  loading: boolean;
  threat: ReturnType<typeof threatLevel>;
}) {
  return (
    <header className="relative z-10 flex flex-wrap items-center justify-between gap-4 px-6 pt-6 pb-4">
      <div className="flex min-w-0 items-center gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl nx-holo-icon [--nx-holo-rgb:34_211_238]">
          <ShieldCheck className="h-6 w-6 text-cyan-300" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-xs uppercase tracking-[0.22em] text-cyan-300/80">
            {ar ? "إدارة الأمن الصناعي · متابعة لحظية" : "Industrial Security · Live Operations"}
          </div>
          <div className="truncate text-2xl font-light text-white sm:text-3xl">
            {ar ? "غرفة العمليات" : "Operations Room"}
          </div>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-white/55">
            {ar
              ? "متابعة الحوادث والتنبيهات فور حدوثها، وتصنيفها حسب الخطورة، وتصعيد الحالات الحرجة وربطها بقنوات المراقبة."
              : "Track incidents and alerts as they occur, classify severity, escalate critical cases, and connect monitoring channels."}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] ring-1",
            threat.tone,
          )}
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-50" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
          </span>
          {ar ? "مستوى التهديد:" : "Threat:"} {loading ? "—" : ar ? threat.ar : threat.en}
        </div>
        <LiveClock ar={ar} />
      </div>
    </header>
  );
}

function LiveClock({ ar }: { ar: boolean }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="rounded-2xl border border-cyan-400/15 bg-white/[0.02] px-4 py-2 backdrop-blur">
      <div className="text-[10px] uppercase tracking-[0.16em] text-white/50">
        {ar ? "البث المباشر" : "Live"}
      </div>
      <div className="text-2xl font-light tabular-nums text-white">
        {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// LEFT — Operational Health column
// ----------------------------------------------------------------------

function OperationalHealthColumn({
  ar,
  health,
  loading,
}: {
  ar: boolean;
  health?: BridgeHealth;
  loading: boolean;
}) {
  const score = health?.score ?? 0;
  const tone =
    score >= 90
      ? "text-emerald-300"
      : score >= 70
        ? "text-cyan-300"
        : score >= 50
          ? "text-amber-300"
          : "text-rose-300";

  return (
    <aside
      aria-label={ar ? "الصحة التشغيلية" : "Operational Health"}
      className="flex flex-col gap-3 rounded-3xl border border-cyan-400/15 bg-[#0A1E33]/70 p-4 backdrop-blur-xl"
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-200/80">
        <Radio className="h-4 w-4" />
        {ar ? "الصحة التشغيلية" : "Operational Health"}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-center">
        <div className="text-[10px] uppercase tracking-[0.16em] text-white/50">
          {ar ? "المؤشر العام" : "Composite Score"}
        </div>
        <div className={cn("mt-1 text-5xl font-light tabular-nums", tone)}>
          {loading ? "—" : Math.round(score)}
          <span className="text-2xl text-white/30">/100</span>
        </div>
      </div>

      <HealthRow
        ar={ar}
        loading={loading}
        Icon={AlertTriangle}
        tone="text-amber-200"
        label_ar="بلاغات مفتوحة"
        label_en="Open Incidents"
        value={health?.open_incidents ?? 0}
      />
      <HealthRow
        ar={ar}
        loading={loading}
        Icon={AlertTriangle}
        tone="text-rose-300"
        label_ar="حرجة"
        label_en="Critical Alerts"
        value={health?.critical_incidents ?? 0}
      />
      <HealthRow
        ar={ar}
        loading={loading}
        Icon={ShieldCheck}
        tone="text-cyan-200"
        label_ar="دوريات نشطة"
        label_en="Active Patrols"
        value={health?.active_patrols ?? 0}
      />
      <HealthRow
        ar={ar}
        loading={loading}
        Icon={Users}
        tone="text-cyan-200"
        label_ar="زوار داخل الموقع"
        label_en="Visitors Onsite"
        value={health?.visitors_onsite ?? 0}
      />
      <HealthRow
        ar={ar}
        loading={loading}
        Icon={FileCheck2}
        tone="text-emerald-200"
        label_ar="تصاريح فعّالة"
        label_en="Active Permits"
        value={health?.active_permits ?? 0}
      />
      <HealthRow
        ar={ar}
        loading={loading}
        Icon={Wrench}
        tone="text-cyan-200"
        label_ar="أوامر عمل مفتوحة"
        label_en="Open Work Orders"
        value={health?.open_work_orders ?? 0}
      />
      <HealthRow
        ar={ar}
        loading={loading}
        Icon={GaugeCircle}
        tone="text-emerald-200"
        label_ar="مؤشر الامتثال"
        label_en="Compliance Score"
        value={`${health?.compliance_score ?? 0}%`}
      />
      <HealthRow
        ar={ar}
        loading={loading}
        Icon={Brain}
        tone="text-cyan-200"
        label_ar="ثقة الذكاء الاصطناعي"
        label_en="AI Confidence"
        value={`${health?.ai_confidence ?? 0}%`}
      />
      <HealthRow
        ar={ar}
        loading={loading}
        Icon={Sparkles}
        tone="text-emerald-200"
        label_ar="وكلاء نشطون"
        label_en="Agents Online"
        value={`${health?.agents_online ?? 0}/${health?.agents_total ?? 0}`}
      />
    </aside>
  );
}

function HealthRow({
  ar,
  label_ar,
  label_en,
  value,
  Icon,
  tone,
  loading,
}: {
  ar: boolean;
  label_ar: string;
  label_en: string;
  value: number | string;
  Icon: typeof Activity;
  tone: string;
  loading: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.015] px-3 py-2">
      <div className="flex items-center gap-2 text-[13px] text-white/75">
        <Icon className={cn("h-3.5 w-3.5", tone)} />
        <span>{ar ? label_ar : label_en}</span>
      </div>
      <div className={cn("text-sm font-semibold tabular-nums", tone)}>{loading ? "—" : value}</div>
    </div>
  );
}

// ----------------------------------------------------------------------
// CENTER — industrial-security agent roles
// ----------------------------------------------------------------------

const ROLE_META: Array<{
  match: RegExp;
  ar: string;
  en: string;
  descriptionAr: string;
  descriptionEn: string;
  Icon: typeof Activity;
}> = [
  {
    match: /monitor|watch|cctv|camera|رصد|مراقب/i,
    ar: "المراقبة الميدانية",
    en: "Field monitoring",
    descriptionAr: "رصد الكاميرات والحساسات والتنبيهات الحية.",
    descriptionEn: "Monitors cameras, sensors, and live alerts.",
    Icon: Eye,
  },
  {
    match: /analy|intel|risk|تحلي|ذكاء|مخاطر/i,
    ar: "تحليل المخاطر",
    en: "Risk analysis",
    descriptionAr: "تحليل الأنماط وتقدير درجة الخطورة والأثر.",
    descriptionEn: "Analyzes patterns, severity, and impact.",
    Icon: Brain,
  },
  {
    match: /incident|response|escalat|بلاغ|حادث|تصعيد/i,
    ar: "الحوادث والتصعيد",
    en: "Incident escalation",
    descriptionAr: "تنسيق الاستجابة وتصعيد الحالات الحرجة فوراً.",
    descriptionEn: "Coordinates response and critical escalation.",
    Icon: ShieldAlert,
  },
  {
    match: /maintenance|work.?order|صيانة|أمر عمل/i,
    ar: "الصيانة",
    en: "Maintenance",
    descriptionAr: "متابعة الأعطال وأوامر العمل الوقائية والتصحيحية.",
    descriptionEn: "Tracks faults and preventive/corrective work.",
    Icon: Wrench,
  },
  {
    match: /compliance|audit|hcis|امتثال|تدقيق/i,
    ar: "الامتثال والتدقيق",
    en: "Compliance and audit",
    descriptionAr: "مراجعة متطلبات HCIS والأدلة والإجراءات التصحيحية.",
    descriptionEn: "Reviews HCIS controls, evidence, and actions.",
    Icon: FileCheck2,
  },
  {
    match: /report|brief|تقرير|موجز/i,
    ar: "التقارير الأمنية",
    en: "Security reporting",
    descriptionAr: "إعداد الملخصات التنفيذية وتقارير العمليات.",
    descriptionEn: "Prepares executive summaries and operations reports.",
    Icon: FileBarChart,
  },
  {
    match: /permit|access|identity|تصريح|دخول|هوية/i,
    ar: "التصاريح والدخول",
    en: "Permits and access",
    descriptionAr: "مراجعة التصاريح وحركة الدخول والوصول للأصول.",
    descriptionEn: "Reviews permits, access events, and asset entry.",
    Icon: ClipboardList,
  },
];

function roleFor(agent: BridgeAgent) {
  const haystack = `${agent.id} ${agent.name} ${agent.goal ?? ""}`;
  return (
    ROLE_META.find((role) => role.match.test(haystack)) ?? {
      match: /.*/,
      ar: "دعم العمليات",
      en: "Operations support",
      descriptionAr: "تنسيق المهام ودعم فرق غرفة العمليات.",
      descriptionEn: "Coordinates tasks and supports operations teams.",
      Icon: Activity,
    }
  );
}

function statusText(status: BridgeAgent["status"], ar: boolean) {
  const labels: Record<BridgeAgent["status"], [string, string]> = {
    offline: ["غير متصل", "Offline"],
    idle: ["جاهز", "Ready"],
    monitoring: ["مراقبة", "Monitoring"],
    waiting: ["بانتظار إجراء", "Waiting"],
    thinking: ["تحليل", "Analyzing"],
    searching: ["بحث", "Searching"],
    analyzing: ["تحليل", "Analyzing"],
    consulting: ["تنسيق", "Coordinating"],
    executing: ["قيد التنفيذ", "Executing"],
    speaking: ["تحديث مباشر", "Live update"],
    completed: ["مكتمل", "Completed"],
    escalated: ["مصعّد", "Escalated"],
    warning: ["تحذير", "Warning"],
    error: ["خطأ", "Error"],
    recovery: ["استعادة", "Recovery"],
  };
  return labels[status][ar ? 0 : 1];
}

function AgentRoleDashboard({
  agents,
  ar,
  spotlight,
}: {
  agents: BridgeAgent[];
  ar: boolean;
  spotlight: BriefingSegment | null;
}) {
  return (
    <section
      aria-label={ar ? "لوحة أدوار وكلاء غرفة العمليات" : "Operations agent role dashboard"}
      className="rounded-3xl border border-cyan-400/20 bg-[#071A2E]/75 p-4 backdrop-blur-xl"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-white">
            {ar ? "أدوار فريق غرفة العمليات" : "Operations Room roles"}
          </h2>
          <p className="mt-1 text-xs text-white/50">
            {ar
              ? "كل بطاقة توضّح مسؤولية الوكيل وحالته والمهمة الجارية."
              : "Each card identifies the agent responsibility, state, and current task."}
          </p>
        </div>
        <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-[11px] text-emerald-200">
          {agents.filter((agent) => agent.enabled).length}/{agents.length} {ar ? "نشط" : "active"}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {agents.slice(0, 8).map((agent) => {
          const role = roleFor(agent);
          const Icon = role.Icon;
          const active =
            spotlight?.speaker_id === agent.id || spotlight?.speaker_name === agent.name;
          const warning = ["error", "warning", "escalated", "offline"].includes(agent.status);
          return (
            <article
              key={agent.id}
              className={cn(
                "rounded-2xl border p-3 transition",
                active
                  ? "border-cyan-300/65 bg-cyan-400/10 shadow-[0_0_30px_rgba(34,211,238,.18)]"
                  : warning
                    ? "border-amber-400/25 bg-amber-400/[0.05]"
                    : "border-white/10 bg-white/[0.025]",
              )}
            >
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-200">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{ar ? role.ar : role.en}</h3>
                      <p className="mt-0.5 text-[11px] leading-4 text-white/50">
                        {ar ? role.descriptionAr : role.descriptionEn}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full border px-2 py-0.5 text-[9px]",
                        warning
                          ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
                          : "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
                      )}
                    >
                      {statusText(agent.status, ar)}
                    </span>
                  </div>
                  <div className="mt-2 truncate text-[10px] text-white/45">
                    {agent.current_task ?? (ar ? "مراقبة مستمرة" : "Continuous monitoring")}
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                      style={{ width: `${Math.round(agent.confidence * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </article>
          );
        })}
        {agents.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-white/15 px-4 py-10 text-center text-sm text-white/45">
            {ar ? "جاري تحميل أدوار فريق العمليات…" : "Loading operations roles…"}
          </div>
        )}
      </div>
    </section>
  );
}

// ----------------------------------------------------------------------
// RIGHT — Predicted risks
// ----------------------------------------------------------------------

function PredictedRiskRail({
  ar,
  risks,
  loading,
}: {
  ar: boolean;
  risks: Awaited<ReturnType<typeof getPredictedRisks>>;
  loading: boolean;
}) {
  return (
    <div className="rounded-3xl border border-cyan-400/15 bg-[#0A1E33]/70 p-4 backdrop-blur-xl">
      <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-200/80">
        <TrendingUp className="h-4 w-4" />
        {ar ? "مخاطر متوقعة" : "Predicted Risks"}
        {!loading && <span className="ml-auto text-white/40">{risks.length}</span>}
      </div>
      {loading && (
        <div className="text-sm text-white/40">{ar ? "جاري التحليل…" : "Analyzing…"}</div>
      )}
      {!loading && risks.length === 0 && (
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3 text-[13px] text-emerald-200">
          {ar
            ? "لا تنبيهات متوقعة. الوضع ضمن المعدّل التشغيلي."
            : "No predicted anomalies. Operations are within baseline."}
        </div>
      )}
      <ul className="space-y-2">
        {risks.slice(0, 3).map((r) => {
          const tone =
            r.severity === "high"
              ? "border-rose-400/40 bg-rose-400/5"
              : r.severity === "medium"
                ? "border-amber-400/40 bg-amber-400/5"
                : "border-cyan-400/30 bg-cyan-400/5";
          const dot =
            r.severity === "high"
              ? "bg-rose-400"
              : r.severity === "medium"
                ? "bg-amber-400"
                : "bg-cyan-300";
          return (
            <li key={r.id} className={cn("rounded-2xl border p-3", tone)}>
              <div className="flex items-start gap-2">
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", dot)} />
                <div className="min-w-0 flex-1">
                  <div
                    className={cn(
                      "truncate text-[14px] font-semibold text-white",
                      ar && "text-right",
                    )}
                  >
                    {ar ? r.title_ar : r.title_en}
                  </div>
                  <div
                    className={cn(
                      "mt-1 line-clamp-2 text-[12.5px] text-white/65",
                      ar && "text-right",
                    )}
                  >
                    {ar ? r.recommendation_ar : r.recommendation_en}
                  </div>
                  <div className="mt-1 text-[11px] text-white/45 tabular-nums">
                    {ar ? "ثقة" : "Conf."} {Math.round(r.confidence * 100)}%{" · "}
                    {r.horizon_hours}h
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
