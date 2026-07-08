import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Crown,
  Sparkles,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  ShieldAlert,
  ShieldCheck,
  Briefcase,
  Users,
  HardHat,
  DollarSign,
  Rocket,
  Gauge,
  Brain,
  ArrowRight,
  FileText,
  Mic,
  Boxes,
  MapPin,
  Radar,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { NexusPage, NexusCard, NexusPill, NexusStat } from "@/components/nexus-frame";
import { useEnterprisePulse } from "@/lib/enterprise-pulse";
import { useFabricSnapshot, usePredictions } from "@/lib/use-fabric";

export const Route = createFileRoute("/_authenticated/executive")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: ExecutiveCommandCenter,
});

/* ───────────────── Domain → KPI mapping ───────────────── */

type DomainKey = "financial" | "operations" | "projects" | "workforce" | "safety" | "security";

const DOMAIN_META: Record<
  DomainKey,
  {
    ar: string;
    en: string;
    icon: typeof DollarSign;
    tone: "emerald" | "cyan" | "amber" | "rose" | "violet";
    match: RegExp;
  }
> = {
  financial: {
    ar: "الحالة المالية",
    en: "Financial",
    icon: DollarSign,
    tone: "emerald",
    match: /revenue|margin|cash|fx|cost|إيراد|هامش|مال|نقد/i,
  },
  operations: {
    ar: "العمليات",
    en: "Operations",
    icon: Activity,
    tone: "cyan",
    match: /uptime|ops|incident|sla|توفر|تشغيل|عمليات/i,
  },
  projects: {
    ar: "المشاريع",
    en: "Projects",
    icon: Rocket,
    tone: "violet",
    match: /project|initiative|fabric|launch|مشروع|مبادرة|إطلاق/i,
  },
  workforce: {
    ar: "القوى العاملة",
    en: "Workforce",
    icon: Users,
    tone: "amber",
    match: /adoption|hr|employee|talent|تبني|موظف|كفاءة/i,
  },
  safety: {
    ar: "السلامة",
    en: "Safety",
    icon: HardHat,
    tone: "amber",
    match: /safety|permit|hazard|سلامة|تصريح|حادث/i,
  },
  security: {
    ar: "الأمن",
    en: "Security",
    icon: ShieldAlert,
    tone: "rose",
    match: /security|cyber|intrusion|أمن|اختراق|دخيل/i,
  },
};

/* ───────────────── Page ───────────────── */

function ExecutiveCommandCenter() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const navigate = useNavigate();
  const pulse = useEnterprisePulse();
  const { data: fabric } = useFabricSnapshot();
  const { data: predictions } = usePredictions();

  // Live counts from security ops (Western Region) + outcomes
  const outcomesQ = useQuery({
    queryKey: ["exec-cc-outcomes"],
    queryFn: async () =>
      (
        await supabase
          .from("business_outcomes")
          .select("*")
          .order("updated_at", { ascending: false })
          .limit(8)
      ).data ?? [],
    refetchInterval: 60_000,
  });
  const incidentsQ = useQuery({
    queryKey: ["exec-cc-incidents"],
    queryFn: async () =>
      (await supabase.from("sec_incidents").select("severity,status").limit(200)).data ?? [],
    refetchInterval: 30_000,
  });
  const permitsQ = useQuery({
    queryKey: ["exec-cc-permits"],
    queryFn: async () =>
      (await supabase.from("sec_permits").select("status,risk_level").limit(200)).data ?? [],
    refetchInterval: 60_000,
  });

  const healthMetric = fabric.metrics.find((m) => m.id === "enterpriseHealth");
  const health = healthMetric?.value ?? pulse.health;
  const status = pulse.status;
  const topCrises = pulse.crises.slice(0, 5);
  const topAlerts = fabric.topAlerts.slice(0, 6);
  const decisions = pulse.memory
    .filter((m) => ["decision", "commitment"].includes(m.kind))
    .slice(0, 6);
  const recommendations = (predictions?.predictions ?? []).slice(0, 5);
  const outcomes = outcomesQ.data ?? [];

  // Domain scores derived from KPIs (tone-based health proxy)
  const domainScores = useMemo(() => {
    const toneScore: Record<string, number> = {
      emerald: 92,
      cyan: 78,
      violet: 70,
      amber: 55,
      rose: 32,
    };
    const rows: Array<{ key: DomainKey; score: number; sample: string }> = [];
    (Object.keys(DOMAIN_META) as DomainKey[]).forEach((dk) => {
      const meta = DOMAIN_META[dk];
      const matched = pulse.kpis.filter((k) => meta.match.test(k.label_en + " " + k.label_ar));
      let score: number;
      let sample = "";
      if (dk === "security") {
        const openIncidents = (incidentsQ.data ?? []).filter((i) =>
          ["open", "investigating", "contained"].includes(i.status),
        ).length;
        const critIncidents = (incidentsQ.data ?? []).filter(
          (i) => i.severity === "critical" && i.status !== "resolved" && i.status !== "closed",
        ).length;
        score = Math.max(20, 100 - openIncidents * 5 - critIncidents * 15);
        sample = ar ? `${openIncidents} حادث مفتوح` : `${openIncidents} open incidents`;
      } else if (dk === "safety") {
        const activePermits = (permitsQ.data ?? []).filter((p) => p.status === "active").length;
        const highRiskPermits = (permitsQ.data ?? []).filter((p) =>
          ["high", "critical"].includes(p.risk_level),
        ).length;
        score = Math.max(40, 100 - highRiskPermits * 8);
        sample = ar ? `${activePermits} تصريح نشط` : `${activePermits} active permits`;
      } else if (matched.length === 0) {
        score = 70;
        sample = ar ? "لا توجد بيانات بعد" : "No data yet";
      } else {
        score = Math.round(
          matched.reduce((s, k) => s + (toneScore[k.tone] ?? 60), 0) / matched.length,
        );
        sample = matched[0] ? (ar ? matched[0].label_ar : matched[0].label_en) : "";
      }
      rows.push({ key: dk, score, sample });
    });
    return rows;
  }, [pulse.kpis, incidentsQ.data, permitsQ.data, ar]);

  const criticalCount = topCrises.filter((c) => c.riskScore >= 80).length;
  const openAlerts = fabric.counts.openAlerts;
  const overdue = fabric.counts.overdue;

  return (
    <NexusPage
      eyebrow={ar ? "غرفة القيادة التنفيذية" : "EXECUTIVE COMMAND CENTER"}
      title={ar ? "مركز قيادة المؤسسة" : "Enterprise Command Center"}
      subtitle={
        ar
          ? "مشهد واحد لحالة المؤسسة الحية: المؤشرات، الأزمات، التنبيهات، القرارات، والتوصيات الذكية."
          : "One live view of the entire enterprise: KPIs, crises, alerts, decisions, and AI recommendations."
      }
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <NexusPill
            tone={status === "critical" ? "rose" : status === "warning" ? "amber" : "emerald"}
          >
            <Crown className="h-3 w-3" /> BOARD VIEW
          </NexusPill>
          <button
            onClick={() => navigate({ to: "/assistant" })}
            className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-cyan-200 hover:bg-cyan-400/20"
          >
            <Sparkles className="h-3 w-3" /> {ar ? "اسأل ARIA" : "Ask ARIA"}
          </button>
        </div>
      }
      status={status}
      lastRefreshed={pulse.lastRefreshed}
      owner={ar ? "مكتب الرئيس التنفيذي" : "Office of the CEO"}
      why={
        ar
          ? `صحة المؤسسة ${health}٪ · ${criticalCount} أزمة حرجة · ${openAlerts} تنبيه مفتوح · ${overdue} بند متأخر.`
          : `Enterprise health ${health}% · ${criticalCount} critical crises · ${openAlerts} open alerts · ${overdue} overdue items.`
      }
      whatNext={
        topCrises[0]
          ? ar
            ? `أولوية الآن: ${topCrises[0].title_ar} — ${topCrises[0].action_ar}`
            : `Top priority now: ${topCrises[0].title_en} — ${topCrises[0].action_en}`
          : ar
            ? "لا توجد أزمات حرجة. ركّز على التنفيذ الاستراتيجي."
            : "No critical crises. Focus on strategic execution."
      }
    >
      {/* ───── Hero: Health Score ───── */}
      <div className="grid gap-4 lg:grid-cols-[1.4fr_2fr]">
        <NexusCard glow className="relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-300/80">
                {ar ? "صحة المؤسسة" : "Enterprise Health Score"}
              </div>
              <div className="mt-3 flex items-end gap-2">
                <div
                  className={`text-6xl font-black tabular-nums ${
                    health >= 80
                      ? "text-emerald-300"
                      : health >= 60
                        ? "text-cyan-300"
                        : health >= 40
                          ? "text-amber-300"
                          : "text-rose-300"
                  }`}
                >
                  {health}
                </div>
                <div className="mb-2 text-2xl font-semibold text-slate-400">/100</div>
              </div>
              <p className="mt-2 max-w-sm text-xs text-slate-400">
                {ar ? healthMetric?.why_ar : healthMetric?.why_en}
              </p>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10">
              <Gauge className="h-8 w-8 text-cyan-300" />
            </div>
          </div>
          {/* Composite breakdown bar */}
          <div className="mt-4 space-y-2">
            {fabric.metrics
              .filter((m) => m.id !== "enterpriseHealth")
              .map((m) => (
                <div key={m.id}>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{ar ? m.label_ar : m.label_en}</span>
                    <span className="tabular-nums text-slate-200">{m.value}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full ${
                        m.tone === "emerald"
                          ? "bg-emerald-400"
                          : m.tone === "cyan"
                            ? "bg-cyan-400"
                            : m.tone === "violet"
                              ? "bg-violet-400"
                              : m.tone === "amber"
                                ? "bg-amber-400"
                                : "bg-rose-400"
                      }`}
                      style={{ width: `${m.value}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </NexusCard>

        {/* ───── 6 Domain status tiles ───── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {domainScores.map(({ key, score, sample }) => {
            const meta = DOMAIN_META[key];
            const Icon = meta.icon;
            const tone =
              score >= 80 ? "emerald" : score >= 60 ? "cyan" : score >= 40 ? "amber" : "rose";
            return (
              <NexusCard key={key} className="p-4">
                <div className="flex items-start justify-between">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl border bg-opacity-10 ${
                      tone === "emerald"
                        ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                        : tone === "cyan"
                          ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
                          : tone === "amber"
                            ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                            : "border-rose-400/30 bg-rose-400/10 text-rose-300"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <NexusPill tone={tone}>{score}</NexusPill>
                </div>
                <div className="mt-3 text-sm font-semibold text-slate-100">
                  {ar ? meta.ar : meta.en}
                </div>
                <div className="mt-1 text-[11px] text-slate-500 truncate">{sample}</div>
              </NexusCard>
            );
          })}
        </div>
      </div>

      {/* ───── Quick stats ───── */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <NexusStat
          label={ar ? "أزمات حرجة" : "Critical Crises"}
          value={String(criticalCount)}
          hint={ar ? `من أصل ${topCrises.length}` : `of ${topCrises.length} tracked`}
          tone={criticalCount > 0 ? "rose" : "emerald"}
        />
        <NexusStat
          label={ar ? "تنبيهات مفتوحة" : "Open Alerts"}
          value={String(openAlerts)}
          hint={ar ? "في النسيج الذكي" : "across intelligence fabric"}
          tone={openAlerts > 5 ? "amber" : "cyan"}
        />
        <NexusStat
          label={ar ? "بنود متأخرة" : "Overdue Items"}
          value={String(overdue)}
          hint={ar ? "تتطلب قراراً" : "need decision"}
          tone={overdue > 0 ? "amber" : "emerald"}
        />
        <NexusStat
          label={ar ? "توصيات AI" : "AI Recommendations"}
          value={String(recommendations.length)}
          hint={ar ? "جاهزة للمراجعة" : "ready for review"}
          tone="violet"
        />
      </div>

      {/* ───── Two-column: KPIs + Crises ───── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <NexusCard>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-300" />
              <h3 className="text-sm font-semibold text-slate-100">
                {ar ? "المؤشرات التنفيذية الحية" : "Live Executive KPIs"}
              </h3>
            </div>
            <NexusPill tone="cyan">{pulse.kpis.length} KPI</NexusPill>
          </div>
          <div className="space-y-2">
            {pulse.kpis.slice(0, 6).map((k) => (
              <div
                key={k.id}
                className="rounded-lg border border-slate-700/40 bg-slate-900/40 p-3 hover:border-cyan-500/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-100">
                      {ar ? k.label_ar : k.label_en}
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-500 truncate">
                      {ar ? k.why_ar : k.why_en}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div
                      className={`text-lg font-bold tabular-nums ${
                        k.tone === "emerald"
                          ? "text-emerald-300"
                          : k.tone === "cyan"
                            ? "text-cyan-300"
                            : k.tone === "violet"
                              ? "text-violet-300"
                              : k.tone === "amber"
                                ? "text-amber-300"
                                : "text-rose-300"
                      }`}
                    >
                      {k.value}
                    </div>
                    <div
                      className={`text-[10px] font-semibold ${k.trend === "up" ? "text-emerald-300" : k.trend === "down" ? "text-rose-300" : "text-slate-400"}`}
                    >
                      {k.trend === "up" ? (
                        <TrendingUp className="inline h-3 w-3" />
                      ) : k.trend === "down" ? (
                        <TrendingDown className="inline h-3 w-3" />
                      ) : (
                        "—"
                      )}{" "}
                      {k.delta}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </NexusCard>

        <NexusCard>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-300" />
              <h3 className="text-sm font-semibold text-slate-100">
                {ar ? "الأزمات والمخاطر الحرجة" : "Critical Crises & Risks"}
              </h3>
            </div>
            <Link to="/crisis" className="text-[10px] text-cyan-300 hover:underline">
              {ar ? "عرض الكل" : "View all"}
            </Link>
          </div>
          <div className="space-y-2">
            {topCrises.length === 0 && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 text-center text-xs text-emerald-300">
                {ar ? "لا توجد أزمات حرجة الآن." : "No critical crises right now."}
              </div>
            )}
            {topCrises.map((c) => {
              const tone = c.riskScore >= 80 ? "rose" : c.riskScore >= 65 ? "amber" : "violet";
              return (
                <Link
                  key={c.id}
                  to={c.route}
                  className="block rounded-lg border border-slate-700/40 bg-slate-900/40 p-3 transition hover:border-cyan-500/40 hover:bg-slate-900/70"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <NexusPill tone={tone}>{c.riskScore}</NexusPill>
                        <span className="text-[10px] text-slate-500 capitalize">{c.category}</span>
                      </div>
                      <div className="mt-1 text-xs font-semibold text-slate-100">
                        {ar ? c.title_ar : c.title_en}
                      </div>
                      <div className="mt-1 text-[10px] text-slate-400">👤 {c.owner}</div>
                    </div>
                    <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-500" />
                  </div>
                </Link>
              );
            })}
          </div>
        </NexusCard>
      </div>

      {/* ───── AI Recommendations + Top Alerts ───── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <NexusCard>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-violet-300" />
              <h3 className="text-sm font-semibold text-slate-100">
                {ar ? "توصيات ARIA الذكية" : "ARIA Recommendations"}
              </h3>
            </div>
            <NexusPill tone="violet">AI</NexusPill>
          </div>
          <div className="space-y-2">
            {recommendations.length === 0 && (
              <div className="text-xs text-slate-400 p-3">
                {ar ? "جارٍ تحليل البيانات..." : "Analyzing data..."}
              </div>
            )}
            {recommendations.map((p) => (
              <div
                key={p.id}
                className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <NexusPill tone={p.tone}>{p.kind}</NexusPill>
                  <span className="text-[10px] text-slate-400">
                    {ar ? `ثقة ${p.confidence}٪` : `${p.confidence}% conf`}
                  </span>
                </div>
                <div className="mt-1.5 text-xs font-semibold text-slate-100">
                  {ar ? p.title_ar : p.title_en}
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  {ar ? p.detail_ar : p.detail_en}
                </div>
                {p.route && (
                  <Link
                    to={p.route}
                    className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-300 hover:underline"
                  >
                    {ar ? "افتح" : "Open"} <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </NexusCard>

        <NexusCard>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-300" />
              <h3 className="text-sm font-semibold text-slate-100">
                {ar ? "أهم التنبيهات الحية" : "Top Live Alerts"}
              </h3>
            </div>
            <Link to="/fabric" className="text-[10px] text-cyan-300 hover:underline">
              {ar ? "النسيج" : "Fabric"}
            </Link>
          </div>
          <div className="space-y-2">
            {topAlerts.length === 0 && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 text-center text-xs text-emerald-300">
                {ar ? "لا توجد تنبيهات مفتوحة." : "No open alerts."}
              </div>
            )}
            {topAlerts.map((a) => {
              const tone =
                a.severity === "critical"
                  ? "rose"
                  : a.severity === "high"
                    ? "amber"
                    : a.severity === "medium"
                      ? "violet"
                      : "cyan";
              return (
                <div
                  key={a.id}
                  className="rounded-lg border border-slate-700/40 bg-slate-900/40 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <NexusPill tone={tone}>{a.severity}</NexusPill>
                    <span className="text-[10px] text-slate-500">
                      {ar ? `أثر ${a.business_impact_score}` : `impact ${a.business_impact_score}`}
                    </span>
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-100">
                    {ar ? a.title : (a.title_en ?? a.title)}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                    <span>{a.owner ?? "—"}</span>
                    {a.route && (
                      <Link to={a.route} className="text-cyan-300 hover:underline">
                        {ar ? "فتح" : "Open"}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </NexusCard>
      </div>

      {/* ───── Decisions + Outcomes ───── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <NexusCard>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-cyan-300" />
              <h3 className="text-sm font-semibold text-slate-100">
                {ar ? "القرارات والالتزامات التنفيذية" : "Executive Decisions & Commitments"}
              </h3>
            </div>
            <Link to="/decisions" className="text-[10px] text-cyan-300 hover:underline">
              {ar ? "السجل" : "Ledger"}
            </Link>
          </div>
          <div className="space-y-2">
            {decisions.map((d) => {
              const tone =
                d.impact === "critical" ? "rose" : d.impact === "high" ? "amber" : "cyan";
              return (
                <div
                  key={d.id}
                  className="rounded-lg border border-slate-700/40 bg-slate-900/40 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <NexusPill tone={tone}>{d.kind}</NexusPill>
                    <span className="text-[10px] text-slate-500">{d.progress}%</span>
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-100">
                    {ar ? d.title_ar : d.title_en}
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full ${
                        d.status === "done"
                          ? "bg-emerald-400"
                          : d.status === "blocked"
                            ? "bg-rose-400"
                            : d.status === "in_progress"
                              ? "bg-cyan-400"
                              : "bg-slate-500"
                      }`}
                      style={{ width: `${d.progress}%` }}
                    />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                    <span>
                      👤 {d.owner} · {d.department}
                    </span>
                    <span className={d.status === "blocked" ? "text-rose-300" : ""}>
                      {d.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </NexusCard>

        <NexusCard>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-300" />
              <h3 className="text-sm font-semibold text-slate-100">
                {ar ? "النتائج الاستراتيجية" : "Strategic Outcomes"}
              </h3>
            </div>
            <Link to="/outcomes" className="text-[10px] text-cyan-300 hover:underline">
              {ar ? "كل النتائج" : "All outcomes"}
            </Link>
          </div>
          <div className="space-y-2">
            {outcomes.length === 0 && (
              <div className="text-xs text-slate-400 p-3">
                {ar ? "لم تُسجَّل نتائج بعد." : "No outcomes recorded yet."}
              </div>
            )}
            {outcomes.map((o) => (
              <div key={o.id} className="rounded-lg border border-slate-700/40 bg-slate-900/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[10px] uppercase tracking-wider text-emerald-300/80">
                    {o.category}
                  </div>
                  {o.delta && <NexusPill tone="emerald">{o.delta}</NexusPill>}
                </div>
                <div className="mt-1 text-xs font-semibold text-slate-100">
                  {ar ? o.label : (o.label_en ?? o.label)}
                </div>
                <div className="mt-0.5 text-lg font-bold text-emerald-300 tabular-nums">
                  {o.value}
                </div>
                {o.period_from && o.period_to && (
                  <div className="mt-0.5 text-[10px] text-slate-500">
                    {o.period_from} → {o.period_to}
                  </div>
                )}
              </div>
            ))}
          </div>
        </NexusCard>
      </div>

      {/* ───── Action bar ───── */}
      <NexusCard className="bg-gradient-to-br from-cyan-500/5 via-violet-500/5 to-transparent">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10">
              <Crown className="h-5 w-5 text-cyan-300" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-100">
                {ar ? "إجراءات تنفيذية سريعة" : "Quick Executive Actions"}
              </div>
              <div className="text-[11px] text-slate-400">
                {ar
                  ? "الجلسة التنفيذية الكاملة بنقرة واحدة."
                  : "Full executive session, one click away."}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/briefing"
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-400/20"
            >
              <FileText className="h-3.5 w-3.5" /> {ar ? "الإحاطة التنفيذية" : "Executive Briefing"}
            </Link>
            <Link
              to="/assistant"
              className="inline-flex items-center gap-1.5 rounded-lg border border-violet-400/30 bg-violet-400/10 px-3 py-2 text-xs font-semibold text-violet-200 hover:bg-violet-400/20"
            >
              <Sparkles className="h-3.5 w-3.5" /> {ar ? "اسأل ARIA" : "Ask ARIA"}
            </Link>
            <Link
              to="/voice"
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-400/20"
            >
              <Mic className="h-3.5 w-3.5" /> {ar ? "الوضع الصوتي" : "Voice Mode"}
            </Link>
            <Link
              to="/digital-twin"
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-400/20"
            >
              <Boxes className="h-3.5 w-3.5" /> {ar ? "التوأم الرقمي" : "Digital Twin"}
            </Link>
            <Link
              to="/command-center"
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-400/20"
            >
              <Radar className="h-3.5 w-3.5" /> {ar ? "العمليات الأمنية" : "Security Ops"}
            </Link>
          </div>
        </div>
      </NexusCard>
    </NexusPage>
  );
}
