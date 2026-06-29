import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ShieldCheck, AlertTriangle, Activity, ClipboardList, Map as MapIcon,
  MessageSquare, FileBarChart2, Wrench, Sparkles, ArrowRight, Radar,
  CheckCircle2, Brain, ShieldAlert, Gauge, TrendingUp,
} from "lucide-react";
import { getSecOverview } from "@/lib/sec.functions";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/mission-control")({
  head: () => ({
    meta: [
      { title: "Mission Control — Nexus AI OS" },
      { name: "description", content: "Executive operations center for senior Industrial Security leadership — live status, critical alerts, incidents, and ARIA executive briefing." },
    ],
  }),
  component: MissionControl,
});

/* ──────────────────────────────────────────────────────────────────
   AGENT CHOREOGRAPHY
   ARIA conducts five specialist agents. Each reports a single
   live finding derived from getSecOverview() — never fabricated.
   ────────────────────────────────────────────────────────────── */

type AgentReport = {
  id: string;
  name_ar: string;
  name_en: string;
  icon: typeof ShieldAlert;
  status_ar: string;
  status_en: string;
  finding_ar: string;
  finding_en: string;
  tone: "cyan" | "amber" | "rose" | "emerald" | "violet";
};

function buildAgentScript(ov: Awaited<ReturnType<typeof getSecOverview>> | undefined, hasData: boolean): AgentReport[] {
  if (!ov || !hasData) {
    const empty = {
      ar: "لا توجد سجلات تشغيلية حية متاحة.",
      en: "No live operational records available.",
    };
    return ["security", "operations", "risk", "kpi", "reporting"].map((id, i) => ({
      id, name_ar: "—", name_en: "—",
      icon: ShieldAlert,
      status_ar: empty.ar, status_en: empty.en,
      finding_ar: empty.ar, finding_en: empty.en,
      tone: "cyan" as const,
    }));
  }
  const c = ov.counts;
  const criticalIncident = ov.incidents.find(i => i.severity === "critical" && i.status !== "closed" && i.status !== "resolved");
  return [
    {
      id: "security",
      name_ar: "وكيل العمليات الأمنية", name_en: "Security Operations Agent",
      icon: ShieldAlert, tone: "rose",
      status_ar: "مراجعة الحوادث الحية…", status_en: "Reviewing live incidents…",
      finding_ar: c.incidents_critical > 0
        ? `${c.incidents_critical} حادث حرج يتطلب اهتمامًا فوريًا${criticalIncident ? ` — ${criticalIncident.title_ar ?? criticalIncident.title ?? ""}` : ""}.`
        : `${c.incidents_open} حادث مفتوح، لا حالات حرجة.`,
      finding_en: c.incidents_critical > 0
        ? `${c.incidents_critical} critical incident${c.incidents_critical > 1 ? "s" : ""} requires immediate attention${criticalIncident ? ` — ${criticalIncident.title_en ?? criticalIncident.title ?? ""}` : ""}.`
        : `${c.incidents_open} open incidents, no critical cases.`,
    },
    {
      id: "operations",
      name_ar: "وكيل العمليات الميدانية", name_en: "Field Operations Agent",
      icon: Activity, tone: "cyan",
      status_ar: "فحص العمليات الميدانية…", status_en: "Checking field operations…",
      finding_ar: `${c.patrols_active} دورية نشطة عبر ${c.sites} موقع صناعي، ${c.permits_active} تصريح ساري.`,
      finding_en: `${c.patrols_active} active patrols across ${c.sites} industrial sites, ${c.permits_active} active permits.`,
    },
    {
      id: "risk",
      name_ar: "وكيل ذكاء المخاطر", name_en: "Risk Intelligence Agent",
      icon: Radar, tone: "amber",
      status_ar: "حساب المخاطر التشغيلية…", status_en: "Calculating operational risk…",
      finding_ar: c.assets_offline > 0
        ? `${c.assets_offline} أصل خارج الخدمة، و ${c.cctv_new} تنبيه كاميرا جديد قيد المراجعة.`
        : `جميع الأصول الحرجة قيد التشغيل. ${c.cctv_new} تنبيه كاميرا قيد المراجعة.`,
      finding_en: c.assets_offline > 0
        ? `${c.assets_offline} assets offline/degraded, ${c.cctv_new} new CCTV alerts under review.`
        : `All critical assets operational. ${c.cctv_new} CCTV alerts under review.`,
    },
    {
      id: "kpi",
      name_ar: "وكيل ذكاء المؤشرات", name_en: "KPI Intelligence Agent",
      icon: Gauge, tone: "violet",
      status_ar: "مراجعة أداء اليوم…", status_en: "Reviewing today's performance…",
      finding_ar: `${c.visitors_inside} زائر داخل المواقع، ${c.contractors_active} مقاول معتمد نشط.`,
      finding_en: `${c.visitors_inside} visitors on-site, ${c.contractors_active} approved contractors active.`,
    },
    {
      id: "reporting",
      name_ar: "وكيل التقارير التنفيذية", name_en: "Executive Reporting Agent",
      icon: FileBarChart2, tone: "emerald",
      status_ar: "إعداد الإحاطة التنفيذية…", status_en: "Preparing executive briefing…",
      finding_ar: c.incidents_critical === 0 && c.assets_offline === 0
        ? "الوضع التشغيلي مستقر. الإحاطة جاهزة للعرض."
        : "تم تحديد بنود تتطلب قرارًا تنفيذيًا. الإحاطة جاهزة.",
      finding_en: c.incidents_critical === 0 && c.assets_offline === 0
        ? "Operational posture is stable. Briefing ready for review."
        : "Items requiring executive decision identified. Briefing ready.",
    },
  ];
}

/* ──────────────────────────────────────────────────────────────────
   WELCOME OVERLAY
   ────────────────────────────────────────────────────────────── */

function WelcomeOverlay({ onDone, ar }: { onDone: () => void; ar: boolean }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1200);
    const t2 = setTimeout(() => setPhase(2), 2600);
    const t3 = setTimeout(onDone, 4200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center bg-[#061A2E] transition-opacity duration-700",
      phase === 2 ? "opacity-0 pointer-events-none" : "opacity-100"
    )}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,212,255,0.18),transparent_60%)]" />
      <div className="relative text-center px-6">
        <div className="mx-auto mb-8 h-20 w-20 rounded-full border border-cyan-400/40 grid place-items-center animate-pulse">
          <Sparkles className="h-9 w-9 text-cyan-300" />
        </div>
        <div className={cn("text-3xl md:text-5xl font-light tracking-wide text-white transition-all duration-700",
          phase >= 0 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3")}>
          {ar ? "أهلًا بكم." : "Welcome."}
        </div>
        <div className={cn("mt-4 text-base md:text-lg text-cyan-200/80 transition-all duration-700 delay-300",
          phase >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3")}>
          {ar ? "يبدأ التقييم التشغيلي التنفيذي…" : "Executive Operational Assessment is starting…"}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   AI COLLABORATION PANEL
   ────────────────────────────────────────────────────────────── */

const TONE: Record<AgentReport["tone"], string> = {
  cyan: "border-cyan-400/30 bg-cyan-400/5 text-cyan-200",
  amber: "border-amber-400/30 bg-amber-400/5 text-amber-200",
  rose: "border-rose-400/30 bg-rose-400/5 text-rose-200",
  emerald: "border-emerald-400/30 bg-emerald-400/5 text-emerald-200",
  violet: "border-violet-400/30 bg-violet-400/5 text-violet-200",
};

function CollaborationPanel({ agents, ar }: { agents: AgentReport[]; ar: boolean }) {
  const [visible, setVisible] = useState(0);
  useEffect(() => {
    setVisible(0);
    const timers = agents.map((_, i) => setTimeout(() => setVisible(v => Math.max(v, i + 1)), 600 * (i + 1)));
    const final = setTimeout(() => setVisible(agents.length + 1), 600 * (agents.length + 1));
    return () => { timers.forEach(clearTimeout); clearTimeout(final); };
  }, [agents]);

  return (
    <div className="rounded-2xl border border-cyan-400/15 bg-white/[0.02] backdrop-blur-xl p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-full bg-cyan-400/15 border border-cyan-400/40 grid place-items-center">
          <Brain className="h-5 w-5 text-cyan-300" />
        </div>
        <div>
          <div className="text-white font-medium">
            {ar ? "آريا التنفيذية" : "ARIA Executive"}
          </div>
          <div className="text-xs text-cyan-200/70">
            {ar ? "بدء التقييم التشغيلي…" : "Starting operational assessment…"}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {agents.map((a, i) => {
          const Icon = a.icon;
          const shown = visible > i;
          return (
            <div
              key={a.id}
              className={cn(
                "flex gap-4 rounded-xl border p-4 transition-all duration-500",
                TONE[a.tone],
                shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
              )}
            >
              <Icon className="h-5 w-5 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-white/90">{ar ? a.name_ar : a.name_en}</div>
                <div className="text-xs opacity-70 mt-0.5">{ar ? a.status_ar : a.status_en}</div>
                <div className="text-sm text-white/85 mt-2">{ar ? a.finding_ar : a.finding_en}</div>
              </div>
            </div>
          );
        })}

        {visible > agents.length && (
          <div className="flex items-center gap-3 rounded-xl border border-cyan-400/40 bg-cyan-400/10 p-4">
            <CheckCircle2 className="h-5 w-5 text-cyan-300" />
            <div className="text-sm text-white">
              {ar ? "اكتمل التقييم التشغيلي." : "Operational assessment completed."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   EXECUTIVE CARDS
   ────────────────────────────────────────────────────────────── */

function StatCard({
  label, value, hint, icon: Icon, tone = "cyan",
}: { label: string; value: string | number; hint?: string; icon: typeof Activity; tone?: AgentReport["tone"] }) {
  return (
    <div className="group rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6 hover:border-cyan-400/30 hover:bg-white/[0.05] transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className="text-sm text-white/60">{label}</div>
        <div className={cn("h-9 w-9 rounded-lg grid place-items-center border", TONE[tone])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-4 text-4xl font-light text-white tracking-tight tabular-nums">{value}</div>
      {hint && <div className="mt-2 text-xs text-white/50">{hint}</div>}
    </div>
  );
}

function OverallStatusBanner({
  status, ar,
}: { status: "stable" | "attention" | "critical"; ar: boolean }) {
  const map = {
    stable: { tone: "emerald", ar: "الوضع التشغيلي مستقر", en: "Operational Posture: Stable" },
    attention: { tone: "amber", ar: "الوضع التشغيلي يتطلب متابعة", en: "Operational Posture: Attention" },
    critical: { tone: "rose", ar: "الوضع التشغيلي حرج", en: "Operational Posture: Critical" },
  } as const;
  const m = map[status];
  return (
    <div className={cn(
      "rounded-2xl border p-6 md:p-7 backdrop-blur-xl flex items-center gap-4",
      TONE[m.tone as AgentReport["tone"]]
    )}>
      <ShieldCheck className="h-7 w-7" />
      <div>
        <div className="text-xs uppercase tracking-widest opacity-70">
          {ar ? "آخر تحديث الآن" : "Updated just now"}
        </div>
        <div className="text-xl md:text-2xl text-white font-light mt-1">
          {ar ? m.ar : m.en}
        </div>
      </div>
    </div>
  );
}

const ACTIONS = [
  { to: "/sec", icon: Activity, ar: "العمليات", en: "Operations" },
  { to: "/sec", icon: AlertTriangle, ar: "الحوادث", en: "Incidents" },
  { to: "/sec/maintenance", icon: Wrench, ar: "أوامر العمل", en: "Work Orders" },
  { to: "/executive-reports", icon: FileBarChart2, ar: "التقارير", en: "Reports" },
  { to: "/aria", icon: MessageSquare, ar: "اسأل آريا", en: "Ask ARIA" },
] as const;

/* ──────────────────────────────────────────────────────────────────
   PAGE
   ────────────────────────────────────────────────────────────── */

function MissionControl() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [welcomeDone, setWelcomeDone] = useState(false);

  const fetchOverview = useServerFn(getSecOverview);
  const q = useQuery({
    queryKey: ["mission-control-overview"],
    queryFn: () => fetchOverview(),
    refetchInterval: 30_000,
  });

  const ov = q.data;
  const hasData = !!ov && ov.counts.sites > 0;
  const agents = useMemo(() => buildAgentScript(ov, hasData), [ov, hasData]);

  const status: "stable" | "attention" | "critical" = useMemo(() => {
    if (!ov || !hasData) return "stable";
    if (ov.counts.incidents_critical > 0) return "critical";
    if (ov.counts.incidents_open > 3 || ov.counts.assets_offline > 0) return "attention";
    return "stable";
  }, [ov, hasData]);

  const recommendations = useMemo<string[]>(() => {
    if (!ov || !hasData) {
      return [ar ? "لا توجد سجلات تشغيلية حية متاحة." : "No live operational records available."];
    }
    const r: string[] = [];
    const c = ov.counts;
    if (c.incidents_critical > 0) r.push(ar
      ? `تصعيد ${c.incidents_critical} حادث حرج إلى قائد الموقع.`
      : `Escalate ${c.incidents_critical} critical incident${c.incidents_critical > 1 ? "s" : ""} to the site commander.`);
    if (c.assets_offline > 0) r.push(ar
      ? `فتح أمر عمل عاجل لإعادة ${c.assets_offline} أصل إلى الخدمة.`
      : `Open priority work order to restore ${c.assets_offline} offline asset${c.assets_offline > 1 ? "s" : ""}.`);
    if (c.cctv_new > 5) r.push(ar
      ? `مراجعة ${c.cctv_new} تنبيه كاميرا جديد قبل تسليم الوردية.`
      : `Review ${c.cctv_new} new CCTV alerts before shift handover.`);
    if (r.length === 0) r.push(ar
      ? "لا توجد إجراءات تنفيذية مطلوبة. الوضع التشغيلي ضمن الحدود."
      : "No executive action required. Operational posture within thresholds.");
    return r;
  }, [ov, hasData, ar]);

  return (
    <div dir={ar ? "rtl" : "ltr"} className="min-h-screen bg-[#061A2E] text-white relative overflow-hidden">
      {!welcomeDone && <WelcomeOverlay ar={ar} onDone={() => setWelcomeDone(true)} />}

      {/* ambient backdrop */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[520px] w-[900px] rounded-full bg-cyan-400/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[420px] w-[700px] rounded-full bg-[#3AE8FF]/5 blur-[120px]" />
      </div>

      <div className={cn(
        "relative max-w-7xl mx-auto px-6 md:px-10 py-10 md:py-14 transition-opacity duration-700",
        welcomeDone ? "opacity-100" : "opacity-0"
      )}>
        {/* Header */}
        <div className="mb-10">
          <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-300/70">
            {ar ? "إدارة الأمن الصناعي — المنطقة الغربية" : "Industrial Security — Western Region"}
          </div>
          <h1 className="mt-3 text-4xl md:text-5xl font-light tracking-tight">
            {ar ? "مركز القيادة التنفيذي" : "Executive Mission Control"}
          </h1>
          <p className="mt-2 text-white/60 max-w-2xl">
            {ar
              ? "نظرة لحظية على الوضع التشغيلي، تقدّمها آريا بدعم من وكلاء التحليل المتخصصين."
              : "Live operational posture, conducted by ARIA with specialist analysis agents."}
          </p>
        </div>

        {/* Overall status */}
        <OverallStatusBanner status={status} ar={ar} />

        {/* Key cards */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label={ar ? "تنبيهات حرجة" : "Critical Alerts"}
            value={ov?.counts.incidents_critical ?? 0}
            icon={AlertTriangle} tone="rose"
            hint={ar ? "تتطلب قرارًا فوريًا" : "Require immediate action"}
          />
          <StatCard
            label={ar ? "حوادث نشطة" : "Active Incidents"}
            value={ov?.counts.incidents_open ?? 0}
            icon={ShieldAlert} tone="amber"
            hint={ar ? "مفتوحة قيد المعالجة" : "Open and in-progress"}
          />
          <StatCard
            label={ar ? "أوامر عمل" : "Work Orders"}
            value={ov?.counts.permits_active ?? 0}
            icon={Wrench} tone="cyan"
            hint={ar ? "تصاريح وعمليات ميدانية" : "Permits & field operations"}
          />
          <StatCard
            label={ar ? "دوريات نشطة" : "Active Patrols"}
            value={ov?.counts.patrols_active ?? 0}
            icon={Activity} tone="emerald"
            hint={ar ? `${ov?.counts.sites ?? 0} موقع صناعي` : `${ov?.counts.sites ?? 0} industrial sites`}
          />
        </div>

        {/* Collaboration + ARIA Summary */}
        <div className="mt-8 grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <CollaborationPanel agents={agents} ar={ar} />
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6 md:p-7 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-9 w-9 rounded-lg bg-cyan-400/15 border border-cyan-400/30 grid place-items-center">
                <Sparkles className="h-4 w-4 text-cyan-300" />
              </div>
              <div>
                <div className="text-sm font-medium text-white">{ar ? "ملخص آريا" : "ARIA Summary"}</div>
                <div className="text-xs text-white/50">{ar ? "توصيات تنفيذية" : "Executive recommendations"}</div>
              </div>
            </div>

            <ul className="space-y-3 text-sm text-white/85 flex-1">
              {recommendations.map((r, i) => (
                <li key={i} className="flex gap-3">
                  <ArrowRight className="h-4 w-4 mt-1 shrink-0 text-cyan-300" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>

            <Link
              to="/aria"
              className="mt-6 inline-flex items-center justify-between gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100 hover:bg-cyan-400/20 transition"
            >
              <span>{ar ? "متابعة مع آريا" : "Continue with ARIA"}</span>
              <ArrowRight className={cn("h-4 w-4", ar && "rotate-180")} />
            </Link>
          </div>
        </div>

        {/* Sites strip */}
        {hasData && ov && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <MapIcon className="h-4 w-4 text-cyan-300" />
              <div className="text-sm text-white/80">
                {ar ? "المواقع الصناعية — المنطقة الغربية" : "Industrial Sites — Western Region"}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ov.sites.slice(0, 6).map(s => (
                <div key={s.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <div className="text-sm text-white">{ar ? (s.name_ar ?? s.name_en) : (s.name_en ?? s.name_ar)}</div>
                  <div className="text-xs text-white/50 mt-1">{s.city_en ?? s.city_ar ?? "—"} · {s.code}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Executive Actions */}
        <div className="mt-10">
          <div className="text-xs uppercase tracking-[0.25em] text-white/50 mb-4">
            {ar ? "الإجراءات التنفيذية" : "Executive Actions"}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {ACTIONS.map(a => {
              const Icon = a.icon;
              return (
                <Link
                  key={a.to + a.en}
                  to={a.to}
                  className="group rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-5 hover:border-cyan-400/40 hover:bg-cyan-400/5 transition-all duration-300 flex items-center gap-3"
                >
                  <div className="h-10 w-10 rounded-lg bg-cyan-400/10 border border-cyan-400/20 grid place-items-center group-hover:bg-cyan-400/20 transition">
                    <Icon className="h-4 w-4 text-cyan-300" />
                  </div>
                  <div className="text-sm text-white/90">{ar ? a.ar : a.en}</div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-10 text-center text-[11px] uppercase tracking-[0.3em] text-white/30">
          {ar ? "نظام نِكسس للذكاء التشغيلي" : "Nexus AI Operating System"}
        </div>
      </div>
    </div>
  );
}
