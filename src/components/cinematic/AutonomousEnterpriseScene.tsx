import { useEffect, useState } from "react";
import {
  Bot,
  TrendingUp,
  Cog,
  Wallet,
  ShieldAlert,
  ScrollText,
  Crown,
  Activity,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Workflow,
  Cpu,
  Radio,
} from "lucide-react";

type Agent = {
  id: string;
  en: string;
  ar: string;
  role_en: string;
  role_ar: string;
  icon: any;
  tone: string;
  ring: string;
  glow: string;
  load: number;
  tasks: { en: string; ar: string }[];
};

const AGENTS: Agent[] = [
  {
    id: "sales",
    en: "Sales Agent",
    ar: "وكيل المبيعات",
    role_en: "Pipeline · Outreach · Closing",
    role_ar: "خط الأنابيب · التواصل · الإغلاق",
    icon: TrendingUp,
    tone: "from-emerald-300 to-emerald-600",
    ring: "ring-emerald-300/40",
    glow: "shadow-[0_0_60px_-15px_rgba(52,211,153,0.6)]",
    load: 78,
    tasks: [
      { en: "Qualified 142 enterprise leads", ar: "تأهيل ١٤٢ عميلاً مؤسسياً" },
      { en: "Drafted 38 executive proposals", ar: "صياغة ٣٨ عرضاً تنفيذياً" },
      { en: "Closed $4.2M · Riyadh region", ar: "إغلاق ٤٫٢م · إقليم الرياض" },
    ],
  },
  {
    id: "ops",
    en: "Operations Agent",
    ar: "وكيل العمليات",
    role_en: "Workflows · SLA · Throughput",
    role_ar: "سير العمل · اتفاقيات الخدمة · الإنتاجية",
    icon: Cog,
    tone: "from-cyan-300 to-blue-600",
    ring: "ring-cyan-300/40",
    glow: "shadow-[0_0_60px_-15px_rgba(56,189,248,0.6)]",
    load: 64,
    tasks: [
      { en: "Optimized 9 supply chain routes", ar: "تحسين ٩ مسارات في سلسلة الإمداد" },
      { en: "Auto-resolved 612 tickets", ar: "حل ٦١٢ تذكرة تلقائياً" },
      { en: "Rebalanced 4 production lines", ar: "إعادة موازنة ٤ خطوط إنتاج" },
    ],
  },
  {
    id: "finance",
    en: "Finance Agent",
    ar: "وكيل المالية",
    role_en: "Treasury · Forecast · Spend",
    role_ar: "الخزينة · التنبؤ · الإنفاق",
    icon: Wallet,
    tone: "from-amber-300 to-amber-600",
    ring: "ring-amber-300/40",
    glow: "shadow-[0_0_60px_-15px_rgba(245,180,84,0.6)]",
    load: 71,
    tasks: [
      { en: "Reconciled 18,420 transactions", ar: "تسوية ١٨٬٤٢٠ معاملة" },
      { en: "FX hedge executed · EUR/USD", ar: "تنفيذ تحوّط عملة · يورو/دولار" },
      { en: "Forecast Q4 revenue · $48.2M", ar: "توقع إيرادات الربع الرابع · ٤٨٫٢م" },
    ],
  },
  {
    id: "risk",
    en: "Risk Agent",
    ar: "وكيل المخاطر",
    role_en: "Threats · Exposure · Resilience",
    role_ar: "التهديدات · التعرّض · المرونة",
    icon: ShieldAlert,
    tone: "from-rose-300 to-rose-600",
    ring: "ring-rose-300/40",
    glow: "shadow-[0_0_60px_-15px_rgba(251,113,133,0.6)]",
    load: 52,
    tasks: [
      { en: "Blocked 3 fraud patterns · live", ar: "حجب ٣ أنماط احتيال · مباشر" },
      { en: "Stress-tested 12 scenarios", ar: "اختبار إجهاد لـ ١٢ سيناريو" },
      { en: "Vendor risk re-scored · 84 firms", ar: "إعادة تقييم مخاطر ٨٤ مورّداً" },
    ],
  },
  {
    id: "compliance",
    en: "Compliance Agent",
    ar: "وكيل الامتثال",
    role_en: "Policy · Audit · Regulation",
    role_ar: "السياسات · التدقيق · التنظيم",
    icon: ScrollText,
    tone: "from-violet-300 to-violet-600",
    ring: "ring-violet-300/40",
    glow: "shadow-[0_0_60px_-15px_rgba(167,139,250,0.6)]",
    load: 46,
    tasks: [
      { en: "Audited 1,204 access events", ar: "تدقيق ١٬٢٠٤ أحداث وصول" },
      { en: "KSA Data Law · 100% conformant", ar: "نظام البيانات السعودي · ١٠٠٪" },
      { en: "Generated 7 regulator filings", ar: "إعداد ٧ إفصاحات تنظيمية" },
    ],
  },
  {
    id: "exec",
    en: "Executive Agent",
    ar: "الوكيل التنفيذي",
    role_en: "Orchestrator · Decisions · Strategy",
    role_ar: "المنسّق · القرارات · الاستراتيجية",
    icon: Crown,
    tone: "from-fuchsia-300 to-fuchsia-600",
    ring: "ring-fuchsia-300/40",
    glow: "shadow-[0_0_60px_-15px_rgba(232,121,249,0.6)]",
    load: 88,
    tasks: [
      { en: "Approved 14 capital allocations", ar: "اعتماد ١٤ تخصيصاً رأسمالياً" },
      { en: "Aligned 6 agents · Q4 goals", ar: "مواءمة ٦ وكلاء · أهداف الربع ٤" },
      { en: "Briefed board · 3 scenarios", ar: "إحاطة المجلس · ٣ سيناريوهات" },
    ],
  },
];

const WORKFLOWS = [
  {
    en: "Lead → Qualify → Proposal → Close",
    ar: "عميل ← تأهيل ← عرض ← إغلاق",
    agents: ["sales", "exec"],
  },
  {
    en: "Invoice → Approve → Pay → Reconcile",
    ar: "فاتورة ← اعتماد ← دفع ← تسوية",
    agents: ["finance", "compliance"],
  },
  {
    en: "Signal → Assess → Mitigate → Report",
    ar: "إشارة ← تقييم ← تخفيف ← تقرير",
    agents: ["risk", "compliance", "exec"],
  },
  {
    en: "Demand → Plan → Produce → Deliver",
    ar: "طلب ← تخطيط ← إنتاج ← تسليم",
    agents: ["ops", "finance"],
  },
];

export default function AutonomousEnterpriseScene({ isAr }: { isAr: boolean }) {
  const [active, setActive] = useState<string>("exec");
  const [tick, setTick] = useState(0);
  const [feed, setFeed] = useState<
    { id: number; agent: Agent; task: { en: string; ar: string } }[]
  >([]);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1800);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const agent = AGENTS[Math.floor(Math.random() * AGENTS.length)];
    const task = agent.tasks[Math.floor(Math.random() * agent.tasks.length)];
    setFeed((f) => [{ id: Date.now(), agent, task }, ...f].slice(0, 8));
    setActive(agent.id);
  }, [tick]);

  const activeAgent = AGENTS.find((a) => a.id === active) ?? AGENTS[0];

  return (
    <section
      data-scene="autonomous"
      dir={isAr ? "rtl" : "ltr"}
      className="relative min-h-[100svh] overflow-hidden bg-[#03050c] py-24"
    >
      {/* circuitry backdrop */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.07) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.07) 1px,transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse at 50% 50%, black 35%, transparent 80%)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(167,139,250,0.18),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(56,189,248,0.12),transparent_60%)]" />

      <div className="relative mx-auto max-w-7xl px-5">
        {/* header */}
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/30 bg-fuchsia-400/10 px-3 py-1 text-[10px] uppercase tracking-[0.32em] text-fuchsia-200 backdrop-blur-md ring-1 ring-fuchsia-300/30">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fuchsia-400 opacity-70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
              </span>
              {isAr ? "المؤسسة الذاتية التشغيل · حيّة" : "Autonomous Enterprise · ALIVE"}
            </div>
            <h2 className="mt-4 text-4xl font-bold leading-[0.95] tracking-tight text-white sm:text-5xl lg:text-6xl">
              {isAr ? (
                <>
                  المؤسسة{" "}
                  <span className="bg-gradient-to-br from-white via-white to-white/40 bg-clip-text text-transparent">
                    الذاتية
                  </span>{" "}
                  التشغيل
                </>
              ) : (
                <>
                  The{" "}
                  <span className="bg-gradient-to-br from-white via-white to-white/40 bg-clip-text text-transparent">
                    Self-Driving
                  </span>{" "}
                  Enterprise
                </>
              )}
            </h2>
            <p className="mt-3 max-w-xl text-sm text-white/60 sm:text-base">
              {isAr
                ? "ستة وكلاء ذكاء اصطناعي يديرون مؤسستك على مدار الساعة — بيع، عمليات، مالية، مخاطر، امتثال، وقيادة تنفيذية."
                : "Six AI agents run the enterprise 24/7 — selling, operating, financing, hedging risk, ensuring compliance, and orchestrating strategy."}
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/55">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />{" "}
              {isAr ? "٦ وكلاء نشطون" : "6 Agents Active"}
            </span>
            <span className="hidden md:inline">·</span>
            <span className="hidden md:inline">
              {isAr ? "٤٨٬٢١٠ مهمة/يوم" : "48,210 tasks/day"}
            </span>
          </div>
        </div>

        {/* agent constellation */}
        <div className="mt-10 grid gap-5 lg:grid-cols-12">
          {/* LEFT — agents grid */}
          <div className="lg:col-span-7">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {AGENTS.map((agent) => {
                const Icon = agent.icon;
                const isActive = agent.id === active;
                return (
                  <button
                    key={agent.id}
                    onClick={() => setActive(agent.id)}
                    className={`group relative overflow-hidden rounded-2xl border bg-white/[0.03] p-4 text-start transition ${
                      isActive
                        ? `border-white/30 bg-white/[0.06] ${agent.glow}`
                        : "border-white/10 hover:bg-white/[0.06]"
                    }`}
                  >
                    {/* pulse line */}
                    <div
                      className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent transition-opacity ${isActive ? "opacity-100" : "opacity-0"}`}
                      style={{ animation: isActive ? "ae-scan 2.2s linear infinite" : undefined }}
                    />
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${agent.tone} text-black shadow-lg`}
                      >
                        <Icon className="h-4 w-4" />
                        {isActive && (
                          <span
                            className="absolute inset-0 rounded-xl ring-2 ring-white/50"
                            style={{ animation: "ae-ring 1.6s ease-out infinite" }}
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[12px] font-semibold text-white">
                          {isAr ? agent.ar : agent.en}
                        </div>
                        <div className="truncate text-[9px] uppercase tracking-[0.18em] text-white/45">
                          {isAr ? agent.role_ar : agent.role_en}
                        </div>
                      </div>
                    </div>

                    {/* load */}
                    <div className="mt-3 flex items-center justify-between text-[9px] uppercase tracking-[0.22em] text-white/45">
                      <span>{isAr ? "الحمل" : "Load"}</span>
                      <span className="text-white/70">{agent.load}%</span>
                    </div>
                    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/5">
                      <div
                        className={`h-full bg-gradient-to-r ${agent.tone}`}
                        style={{ width: `${agent.load}%` }}
                      />
                    </div>

                    {/* status */}
                    <div className="mt-3 flex items-center gap-1.5 text-[10px] text-emerald-300">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>{isAr ? "يعمل الآن" : "Running"}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* workflows */}
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center gap-2">
                <Workflow className="h-4 w-4 text-cyan-300" />
                <span className="text-[10px] uppercase tracking-[0.3em] text-white/55">
                  {isAr ? "سير الأعمال التلقائي" : "Autonomous Workflows"}
                </span>
                <div className="ms-2 h-px flex-1 bg-gradient-to-r from-white/20 to-transparent" />
              </div>
              <div className="mt-4 space-y-3">
                {WORKFLOWS.map((w, i) => (
                  <div key={i} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                    <div className="flex flex-wrap items-center gap-2 text-[12px] text-white/85">
                      <span className="flex-1">{isAr ? w.ar : w.en}</span>
                      <div className="flex -space-x-1.5">
                        {w.agents.map((id) => {
                          const ag = AGENTS.find((a) => a.id === id)!;
                          const Icon = ag.icon;
                          return (
                            <div
                              key={id}
                              className={`flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br ${ag.tone} ring-2 ring-[#03050c] text-black`}
                            >
                              <Icon className="h-2.5 w-2.5" />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {/* flow bar */}
                    <div className="relative mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                      <div
                        className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent"
                        style={{ animation: `ae-flow ${3 + i * 0.4}s linear infinite` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT — active agent + live feed */}
          <div className="lg:col-span-5 space-y-5">
            {/* active agent card */}
            <div
              className={`relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 backdrop-blur-xl ${activeAgent.glow}`}
            >
              <div
                className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent"
                style={{ animation: "ae-scan 2.5s linear infinite" }}
              />
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${activeAgent.tone} text-black shadow-xl`}
                  >
                    <activeAgent.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.28em] text-white/45">
                      {isAr ? "وكيل نشط" : "Active Agent"}
                    </div>
                    <div className="text-lg font-bold text-white">
                      {isAr ? activeAgent.ar : activeAgent.en}
                    </div>
                    <div className="text-[11px] text-white/55">
                      {isAr ? activeAgent.role_ar : activeAgent.role_en}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] text-emerald-300 ring-1 ring-emerald-300/30">
                  <Cpu className="h-3 w-3" />
                  {isAr ? "ذاتي" : "Autonomous"}
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {activeAgent.tasks.map((t, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded-lg bg-white/[0.04] px-3 py-2 text-[12px] text-white/85"
                  >
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
                    <span>{isAr ? t.ar : t.en}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                  { v: `${activeAgent.load}%`, l: isAr ? "الحمل" : "Load" },
                  { v: "99.98%", l: isAr ? "موثوقية" : "Uptime" },
                  { v: "12ms", l: isAr ? "زمن القرار" : "Decide" },
                ].map((x, i) => (
                  <div key={i} className="rounded-lg bg-white/[0.04] p-2">
                    <div className="text-[13px] font-bold text-white">{x.v}</div>
                    <div className="text-[9px] uppercase tracking-[0.2em] text-white/45">{x.l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* live feed */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-emerald-300" />
                <span className="text-[10px] uppercase tracking-[0.3em] text-white/55">
                  {isAr ? "بثّ المهام المباشر" : "Live Task Stream"}
                </span>
                <div className="ms-2 h-px flex-1 bg-gradient-to-r from-white/20 to-transparent" />
                <span className="text-[9px] text-white/40">{isAr ? "مباشر" : "LIVE"}</span>
              </div>
              <div className="mt-3 space-y-1.5">
                {feed.length === 0 && (
                  <div className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-2 text-[11px] text-white/45">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {isAr ? "تشغيل الوكلاء..." : "Booting agents..."}
                  </div>
                )}
                {feed.map((f, i) => {
                  const Icon = f.agent.icon;
                  return (
                    <div
                      key={f.id}
                      className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-[11px]"
                      style={{
                        animation: i === 0 ? "ae-in 0.4s ease-out" : undefined,
                        opacity: 1 - i * 0.08,
                      }}
                    >
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br ${f.agent.tone} text-black`}
                      >
                        <Icon className="h-3 w-3" />
                      </div>
                      <span className="font-medium text-white/85">
                        {isAr ? f.agent.ar : f.agent.en}
                      </span>
                      <span className="text-white/40">·</span>
                      <span className="flex-1 truncate text-white/65">
                        {isAr ? f.task.ar : f.task.en}
                      </span>
                      <ArrowRight className={`h-3 w-3 text-white/30 ${isAr ? "rotate-180" : ""}`} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* monitoring strip */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { v: "0", l: isAr ? "تنبيهات حرجة" : "Critical Alerts", c: "text-emerald-300" },
                { v: "100%", l: isAr ? "الامتثال" : "Compliance", c: "text-cyan-300" },
                { v: "24/7", l: isAr ? "مراقبة المخاطر" : "Risk Watch", c: "text-amber-300" },
              ].map((x, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center"
                >
                  <div className={`text-base font-bold ${x.c}`}>{x.v}</div>
                  <div className="mt-1 text-[9px] uppercase tracking-[0.2em] text-white/45">
                    {x.l}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* bottom signature */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4">
          <div className="flex items-center gap-2 text-[11px] text-white/60">
            <Bot className="h-4 w-4 text-fuchsia-300" />
            <span>
              {isAr
                ? "تعمل المؤسسة الآن دون تدخل بشري"
                : "Your enterprise is running without human intervention"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.28em] text-emerald-300">
            <Activity className="h-3.5 w-3.5" />
            {isAr ? "متصلة · مستقرة · ذاتية" : "Online · Stable · Autonomous"}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes ae-scan { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
        @keyframes ae-flow { from { transform: translateX(-100%); } to { transform: translateX(300%); } }
        @keyframes ae-ring { 0% { transform: scale(1); opacity: 0.8; } 100% { transform: scale(1.6); opacity: 0; } }
        @keyframes ae-in   { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </section>
  );
}
