import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bot,
  Building2,
  Cpu,
  Database,
  GitBranch,
  Heart,
  Radar,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Workflow,
  X,
  Zap,
} from "lucide-react";


export const Route = createFileRoute("/_authenticated/dashboard")({
  component: CommandCenter,
});

type NodeStatus = "healthy" | "warning" | "critical";

type Kpi3D = { label_ar: string; label_en: string; value: string; delta: string; trend: "up" | "down" | "flat" };

type OrbitNode = {
  id: string;
  label_ar: string;
  label_en: string;
  meta_ar: string;
  meta_en: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Click target — real route in the app */
  route: string;
  /** Current operational status */
  status: NodeStatus;
  /** position on the stage, in percentages */
  x: number;
  y: number;
  /** accent hue for the node glow */
  hue: number;
  kpis: Kpi3D[];
  agents: string[];
  integrations: string[];
  related: { label_ar: string; label_en: string; to: string }[];
};

const NODES: OrbitNode[] = [
  {
    id: "dept",
    label_ar: "الأقسام",
    label_en: "DEPARTMENTS",
    meta_ar: "24 نشط",
    meta_en: "24 Active",
    icon: Building2,
    route: "/departments",
    status: "healthy",
    x: 24, y: 24, hue: 210,
    kpis: [
      { label_ar: "الكفاءة", label_en: "Efficiency", value: "92%", delta: "+3.4%", trend: "up" },
      { label_ar: "الإشغال", label_en: "Utilization", value: "87%", delta: "+1.1%", trend: "up" },
      { label_ar: "تنفيذ الأهداف", label_en: "OKR Attainment", value: "78%", delta: "-2.0%", trend: "down" },
    ],
    agents: ["HR Pulse", "Ops Conductor", "Finance Sentinel"],
    integrations: ["Workday", "SAP", "Slack"],
    related: [
      { label_ar: "المحفظة", label_en: "Portfolio", to: "/portfolio" },
      { label_ar: "النتائج", label_en: "Outcomes", to: "/outcomes" },
    ],
  },
  {
    id: "data",
    label_ar: "بحيرة البيانات",
    label_en: "DATA LAKE",
    meta_ar: "1.4 تيرابايت",
    meta_en: "1.4 TB Active",
    icon: Database,
    route: "/analytics",
    status: "healthy",
    x: 76, y: 24, hue: 195,
    kpis: [
      { label_ar: "الإنتاجية", label_en: "Throughput", value: "12.4k/s", delta: "+8.7%", trend: "up" },
      { label_ar: "جودة البيانات", label_en: "Data Quality", value: "98.2%", delta: "+0.3%", trend: "up" },
      { label_ar: "زمن الاستجابة", label_en: "Latency", value: "42ms", delta: "-6ms", trend: "up" },
    ],
    agents: ["Insight Miner", "Anomaly Hunter", "Forecast Oracle"],
    integrations: ["Snowflake", "BigQuery", "Kafka"],
    related: [
      { label_ar: "المعرفة", label_en: "Knowledge", to: "/knowledge" },
      { label_ar: "محلل AI", label_en: "AI Analyst", to: "/analyst" },
    ],
  },
  {
    id: "int",
    label_ar: "التكاملات",
    label_en: "INTEGRATIONS",
    meta_ar: "18 متصل",
    meta_en: "18 Connected",
    icon: GitBranch,
    route: "/integrations",
    status: "warning",
    x: 16, y: 50, hue: 220,
    kpis: [
      { label_ar: "اتصالات نشطة", label_en: "Active Links", value: "18/20", delta: "+2", trend: "up" },
      { label_ar: "معدل الفشل", label_en: "Failure Rate", value: "1.3%", delta: "+0.4%", trend: "down" },
      { label_ar: "حجم المزامنة", label_en: "Sync Volume", value: "842k/d", delta: "+11%", trend: "up" },
    ],
    agents: ["Sync Guardian", "Webhook Relay"],
    integrations: ["Salesforce", "HubSpot", "Stripe", "Zapier"],
    related: [
      { label_ar: "التنسيق", label_en: "Orchestration", to: "/orchestration" },
      { label_ar: "التوأم الرقمي", label_en: "Digital Twin", to: "/digital-twin" },
    ],
  },
  {
    id: "agents",
    label_ar: "وكلاء الذكاء",
    label_en: "AI AGENTS",
    meta_ar: "48 نشط",
    meta_en: "48 Active",
    icon: Bot,
    route: "/agents",
    status: "healthy",
    x: 84, y: 50, hue: 175,
    kpis: [
      { label_ar: "المهام/اليوم", label_en: "Tasks / day", value: "8,932", delta: "+23.8%", trend: "up" },
      { label_ar: "الدقة", label_en: "Accuracy", value: "96.4%", delta: "+1.2%", trend: "up" },
      { label_ar: "متوسط الزمن", label_en: "Avg Latency", value: "1.8s", delta: "-0.4s", trend: "up" },
    ],
    agents: ["ARIA Executive", "Code Co-Pilot", "Email Triage", "Meeting Scribe"],
    integrations: ["OpenAI", "Anthropic", "Gemini"],
    related: [
      { label_ar: "مركز AI Ops", label_en: "AI Ops", to: "/ai-ops" },
      { label_ar: "مسارات العمل", label_en: "Workflows", to: "/workflows" },
    ],
  },
  {
    id: "auto",
    label_ar: "الأتمتة",
    label_en: "AUTOMATIONS",
    meta_ar: "342 تشغيل",
    meta_en: "342 Running",
    icon: Workflow,
    route: "/workflows",
    status: "healthy",
    x: 50, y: 70, hue: 200,
    kpis: [
      { label_ar: "تشغيلات/الساعة", label_en: "Runs / hr", value: "1,247", delta: "+15.3%", trend: "up" },
      { label_ar: "نسبة النجاح", label_en: "Success Rate", value: "99.4%", delta: "+0.1%", trend: "up" },
      { label_ar: "توفير الوقت", label_en: "Time Saved", value: "412h/d", delta: "+38h", trend: "up" },
    ],
    agents: ["Flow Maestro", "Retry Sentinel"],
    integrations: ["n8n", "Zapier", "GitHub Actions"],
    related: [
      { label_ar: "التنسيق", label_en: "Orchestration", to: "/orchestration" },
      { label_ar: "المهام", label_en: "Tasks", to: "/tasks" },
    ],
  },
];



function CommandCenter() {
  const { locale } = useI18n();
  const isAr = locale === "ar";
  const [query, setQuery] = useState("");

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] overflow-hidden bg-[#04060f]">
      {/* ── background field ────────────────────────────────────────── */}
      <CityscapeBackdrop />

      <div className="relative z-10 flex h-full flex-col p-4 md:p-6">
        {/* ── top bar ──────────────────────────────────────────────── */}
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 opacity-80 blur-md" />
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/40 bg-[#081428]">
                <Sparkles className="h-5 w-5 text-cyan-300" />
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold tracking-[0.3em] text-cyan-300/80">NEXUS</div>
              <div className="text-[10px] tracking-[0.25em] text-slate-400">
                {isAr ? "مركز القيادة الذكي" : "AI COMMAND CENTER"}
              </div>
            </div>
          </div>

          {/* global command bar */}
          <div className="relative mx-auto hidden w-full max-w-2xl md:block">
            <div className="absolute -inset-px rounded-full bg-gradient-to-r from-cyan-400/40 via-blue-500/20 to-cyan-400/40 opacity-60 blur" />
            <div className="relative flex items-center gap-3 rounded-full border border-cyan-400/20 bg-[#06101f]/80 px-4 py-2.5 backdrop-blur-xl">
              <span className="rounded-md bg-cyan-400/10 px-2 py-0.5 text-[10px] font-semibold tracking-widest text-cyan-300">
                {isAr ? "أوامر AI" : "AI COMMAND"}
              </span>
              <Search className="h-3.5 w-3.5 text-slate-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={isAr ? "اسأل المساعد عن أي شيء..." : "Ask AI anything..."}
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
              />
              <kbd className="rounded border border-slate-700/60 bg-slate-900/60 px-1.5 py-0.5 text-[10px] text-slate-400">⌘K</kbd>
            </div>
          </div>

          {/* status pill */}
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 backdrop-blur-xl">
            <div className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </div>
            <div className="text-end">
              <div className="text-[10px] font-semibold tracking-wider text-emerald-300/90">{isAr ? "حالة النظام" : "SYSTEM STATUS"}</div>
              <div className="text-[10px] text-slate-400">{isAr ? "جميع الأنظمة تعمل" : "All Systems Operational"}</div>
            </div>
          </div>
        </header>

        {/* ── 3D stage ─────────────────────────────────────────────── */}
        <main className="relative mt-6">
          <Stage isAr={isAr} />
        </main>

        {/* ── Live intelligence ticker ─────────────────────────────── */}
        <IntelligenceTicker isAr={isAr} />

        {/* ── Executive intelligence grid ──────────────────────────── */}
        <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <EnterpriseHealth isAr={isAr} />
          <RiskRadar isAr={isAr} />
          <StrategicObjectives isAr={isAr} />
          <IntegrationTopology isAr={isAr} />
          <OrchestrationFlow isAr={isAr} />
        </section>

        {/* ── KPI strip ────────────────────────────────────────────── */}
        <footer className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <Kpi icon={Workflow} label={isAr ? "إجمالي سير العمل" : "TOTAL WORKFLOWS"} value="1,247" delta="+15.3%" />
          <Kpi icon={Bot} label={isAr ? "وكلاء الذكاء" : "AI AGENTS ACTIVE"} value="48" delta="+12.7%" />
          <Kpi icon={Zap} label={isAr ? "المهام المكتملة" : "TASKS COMPLETED"} value="8,932" delta="+23.8%" />
          <Kpi icon={Activity} label={isAr ? "تشغيل النظام" : "SYSTEM UPTIME"} value="99.98%" delta="+0.02%" />
          <Kpi icon={Database} label={isAr ? "البيانات المعالجة" : "DATA PROCESSED"} value="2.4 TB" delta="+0.02%" />
          <Kpi icon={TrendingUp} label={isAr ? "العائد الشهري" : "ROI THIS MONTH"} value="$1.42M" delta="+31.4%" highlight />
        </footer>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

function Stage({ isAr }: { isAr: boolean }) {
  const [active, setActive] = useState<OrbitNode | null>(null);
  const [ctx, setCtx] = useState<{ node: OrbitNode; x: number; y: number } | null>(null);
  const navigate = useNavigate();

  const openDrill = useCallback((n: OrbitNode) => {
    setCtx(null);
    setActive(n);
  }, []);

  const openContext = useCallback((n: OrbitNode, x: number, y: number) => {
    setActive(null);
    setCtx({ node: n, x, y });
  }, []);

  // Dismiss context menu on outside click / Escape
  useEffect(() => {
    if (!ctx && !active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCtx(null);
        setActive(null);
      }
    };
    const onScroll = () => setCtx(null);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [ctx, active]);

  return (
    <div className="relative h-[460px] w-full overflow-hidden rounded-3xl border border-cyan-400/10 bg-gradient-to-b from-[#060d1e]/80 to-[#020512]/80 shadow-[0_40px_120px_-40px_rgba(34,211,238,0.35)] backdrop-blur-xl sm:h-[520px] md:h-[560px] xl:h-[620px] [@media(orientation:landscape)_and_(max-height:540px)]:h-[300px]">
      {/* radial floor grid */}
      <FloorGrid />
      {/* connection beams */}
      <BeamsLayer />
      {/* orbit rings */}
      <OrbitRings />
      {/* central orb */}
      <CoreOrb isAr={isAr} />
      {/* nodes */}
      {NODES.map((n, i) => (
        <NodeChip
          key={n.id}
          node={n}
          delay={i * 120}
          isAr={isAr}
          onActivate={() => openDrill(n)}
          onContext={(x, y) => openContext(n, x, y)}
        />
      ))}
      {/* corner badges */}
      <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
        <span className="rounded-full border border-cyan-400/20 bg-[#06101f]/70 px-3 py-1 text-[10px] font-semibold tracking-[0.3em] text-cyan-300/80 backdrop-blur">
          {isAr ? "الواجهة الرئيسية ثلاثية الأبعاد" : "3D ENTERPRISE COMMAND VIEW"}
        </span>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
        <span className="rounded-full border border-white/5 bg-[#06101f]/60 px-3 py-1 text-[10px] text-slate-400 backdrop-blur">
          {isAr ? "انقر لفتح · انقر بزر آخر للقائمة السياقية" : "Click to drill · Right-click for context"}
        </span>
      </div>

      {ctx && (
        <NodeContextMenu
          node={ctx.node}
          x={ctx.x}
          y={ctx.y}
          isAr={isAr}
          onClose={() => setCtx(null)}
          onOpen={() => {
            setCtx(null);
            navigate({ to: ctx.node.route });
          }}
          onDrill={() => openDrill(ctx.node)}
          onRelated={(to) => {
            setCtx(null);
            navigate({ to });
          }}
        />
      )}

      {active && (
        <NodeDrillPanel
          node={active}
          isAr={isAr}
          onClose={() => setActive(null)}
          onOpen={() => {
            const r = active.route;
            setActive(null);
            navigate({ to: r });
          }}
          onRelated={(to) => {
            setActive(null);
            navigate({ to });
          }}
        />
      )}
    </div>
  );
}



function FloorGrid() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div
        className="absolute inset-x-0 bottom-0 h-[55%]"
        style={{
          background:
            "linear-gradient(to top, rgba(34,211,238,0.10), transparent 80%)",
          maskImage:
            "linear-gradient(to top, black 30%, transparent 100%)",
        }}
      />
      <svg
        className="absolute inset-x-0 bottom-0 h-[60%] w-full opacity-50"
        viewBox="0 0 1000 600"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="gridFade" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="rgba(56,189,248,0.45)" />
            <stop offset="100%" stopColor="rgba(56,189,248,0)" />
          </linearGradient>
        </defs>
        {/* horizontal lines, perspective */}
        {Array.from({ length: 10 }).map((_, i) => {
          const t = i / 9;
          const y = 600 - Math.pow(t, 1.8) * 600;
          return (
            <line
              key={"h" + i}
              x1={0}
              x2={1000}
              y1={y}
              y2={y}
              stroke="url(#gridFade)"
              strokeWidth={0.6}
            />
          );
        })}
        {/* radial verticals */}
        {Array.from({ length: 21 }).map((_, i) => {
          const x = (i / 20) * 1000;
          return (
            <line
              key={"v" + i}
              x1={500}
              y1={250}
              x2={x}
              y2={600}
              stroke="url(#gridFade)"
              strokeWidth={0.5}
            />
          );
        })}
      </svg>
    </div>
  );
}

function OrbitRings() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
      {[260, 360, 480].map((size, i) => (
        <div
          key={size}
          className="absolute rounded-full border border-cyan-400/15"
          style={{
            width: size,
            height: size * 0.35,
            left: -size / 2,
            top: -(size * 0.35) / 2,
            animation: `spin ${30 + i * 12}s linear infinite ${i % 2 ? "reverse" : ""}`,
            boxShadow: "inset 0 0 30px rgba(34,211,238,0.05)",
          }}
        />
      ))}
    </div>
  );
}

function CoreOrb({ isAr }: { isAr: boolean }) {
  
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
      <div
        className="relative aspect-square"
        style={{ width: "clamp(180px, 42vw, 320px)" }}
      >
        {/* ambient volumetric halos */}
        <div className="absolute inset-[-45%] rounded-full bg-cyan-400/20 blur-[60px]" />
        <div className="absolute inset-[-25%] rounded-full bg-[#00B8D9]/30 blur-3xl animate-pulse" />
        <div
          className="absolute inset-[-15%] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(110,231,255,0.35) 0%, rgba(34,211,238,0.12) 40%, transparent 70%)",
            animation: "pulse 4s ease-in-out infinite",
          }}
        />

        {/* outer rotating dashed ring */}
        <svg
          className="absolute inset-[-8%] h-[116%] w-[116%]"
          viewBox="0 0 200 200"
          style={{ animation: "spin 40s linear infinite" }}
        >
          <circle cx="100" cy="100" r="96" fill="none" stroke="rgba(110,231,255,0.35)" strokeWidth="0.5" strokeDasharray="1 4" />
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i / 12) * Math.PI * 2;
            const x = 100 + Math.cos(a) * 96;
            const y = 100 + Math.sin(a) * 96;
            return <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.6 : 0.8} fill="rgba(110,231,255,0.7)" />;
          })}
        </svg>
        {/* counter-rotating inner ring */}
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 200 200"
          style={{ animation: "spin 28s linear infinite reverse" }}
        >
          <circle cx="100" cy="100" r="92" fill="none" stroke="rgba(34,211,238,0.45)" strokeWidth="0.8" />
          <circle cx="100" cy="100" r="92" fill="none" stroke="rgba(110,231,255,0.6)" strokeWidth="0.8" strokeDasharray="6 90" />
        </svg>

        {/* holographic ARIA core — no image, pure energy */}
        <div className="absolute inset-[8%] overflow-hidden rounded-full">
          {/* plasma sphere */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 35% 30%, rgba(110,231,255,0.9) 0%, rgba(34,211,238,0.6) 35%, rgba(6,182,212,0.4) 60%, rgba(8,145,178,0.25) 90%)",
              boxShadow:
                "0 0 60px rgba(34,211,238,0.5), inset 0 0 40px rgba(255,255,255,0.15), inset 0 -20px 40px rgba(6,16,31,0.6)",
              animation: "pulse 4s ease-in-out infinite",
            }}
          />
          {/* core glyph rings */}
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full opacity-60">
            <circle cx="50" cy="50" r="8" fill="white" />
            <circle cx="50" cy="50" r="22" fill="none" stroke="white" strokeOpacity="0.5" strokeWidth="0.8" strokeDasharray="2 3" />
            <circle cx="50" cy="50" r="32" fill="none" stroke="white" strokeOpacity="0.3" strokeWidth="0.6" />
          </svg>
          {/* scanlines */}
          <div
            className="absolute inset-0 opacity-40"
            style={{
              background:
                "repeating-linear-gradient(0deg, transparent 0 2px, rgba(110,231,255,0.08) 2px 3px)",
              mixBlendMode: "overlay",
            }}
          />
          {/* travelling holographic scanner */}
          <div
            className="absolute inset-x-0 h-12"
            style={{
              background:
                "linear-gradient(180deg, transparent, rgba(110,231,255,0.45), transparent)",
              animation: "core-scan 4.2s ease-in-out infinite",
              mixBlendMode: "screen",
            }}
          />
        </div>

        {/* edge glow ring to fuse image with UI */}
        <div
          className="pointer-events-none absolute inset-[6%] rounded-full"
          style={{
            boxShadow:
              "0 0 60px 6px rgba(34,211,238,0.35), inset 0 0 40px rgba(110,231,255,0.25)",
          }}
        />

        {/* orbiting micro-nodes */}
        <div className="absolute inset-0" style={{ animation: "spin 22s linear infinite" }}>
          {Array.from({ length: 4 }).map((_, i) => {
            const a = (i / 4) * Math.PI * 2;
            const r = 48; // %
            const x = 50 + Math.cos(a) * r;
            const y = 50 + Math.sin(a) * r;
            return (
              <span
                key={i}
                className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-200"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  boxShadow: "0 0 12px rgba(110,231,255,0.95), 0 0 30px rgba(34,211,238,0.6)",
                }}
              />
            );
          })}
        </div>

        {/* particles */}
        <svg className="absolute inset-[-10%] h-[120%] w-[120%]" viewBox="0 0 100 100">
          {Array.from({ length: 18 }).map((_, i) => {
            const x = (i * 37) % 100;
            const y = (i * 53) % 100;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={((i % 3) + 1) * 0.25}
                fill="rgba(110,231,255,0.7)"
                style={{ animation: `pulse ${2 + (i % 4)}s ease-in-out ${i * 0.15}s infinite` }}
              />
            );
          })}
        </svg>

        {/* ARIA label band */}
        <div className="absolute inset-x-0 -bottom-1 flex flex-col items-center text-center">
          <div className="rounded-full border border-cyan-300/30 bg-[#06101f]/80 px-3 py-0.5 text-[9px] font-bold tracking-[0.5em] text-cyan-200 backdrop-blur">
            ARIA · NEXUS
          </div>
          <div className="mt-1 text-[8px] tracking-[0.4em] text-cyan-300/70">
            {isAr ? "النواة التنفيذية" : "EXECUTIVE CORE"}
          </div>
        </div>
      </div>
    </div>
  );
}

function BeamsLayer() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="beam" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(34,211,238,0)" />
          <stop offset="50%" stopColor="rgba(34,211,238,0.7)" />
          <stop offset="100%" stopColor="rgba(34,211,238,0)" />
        </linearGradient>
      </defs>
      {NODES.map((n) => (
        <line
          key={n.id}
          x1={50}
          y1={42}
          x2={n.x}
          y2={n.y + 4}
          stroke="url(#beam)"
          strokeWidth={0.25}
          strokeDasharray="0.6 0.8"
          style={{ animation: "dash 6s linear infinite" }}
        />
      ))}
    </svg>
  );
}

function NodeChip({
  node,
  delay,
  isAr,
  onActivate,
  onContext,
}: {
  node: OrbitNode;
  delay: number;
  isAr: boolean;
  onActivate: () => void;
  onContext: (x: number, y: number) => void;
}) {
  const Icon = node.icon;
  const seed = node.id.charCodeAt(0) + node.id.charCodeAt(node.id.length - 1);
  void seed;
  const longPress = useRef<number | null>(null);
  const statusColor =
    node.status === "healthy"
      ? "rgb(52,211,153)"
      : node.status === "warning"
      ? "rgb(251,191,36)"
      : "rgb(248,113,113)";
  const ariaLabel = `${isAr ? node.label_ar : node.label_en} — ${isAr ? node.meta_ar : node.meta_en}`;
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onActivate}
      onContextMenu={(e) => {
        e.preventDefault();
        onContext(e.clientX, e.clientY);
      }}
      onTouchStart={(e) => {
        const t = e.touches[0];
        const x = t.clientX;
        const y = t.clientY;
        longPress.current = window.setTimeout(() => {
          onContext(x, y);
          longPress.current = null;
        }, 500);
      }}
      onTouchEnd={() => {
        if (longPress.current) {
          window.clearTimeout(longPress.current);
          longPress.current = null;
        }
      }}
      onTouchMove={() => {
        if (longPress.current) {
          window.clearTimeout(longPress.current);
          longPress.current = null;
        }
      }}
      className="nexus-node group absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-3xl outline-none transition-transform duration-300 will-change-transform [--chip-half:88px] hover:-translate-y-[6px] hover:scale-[1.03] focus-visible:scale-[1.03] focus-visible:ring-2 focus-visible:ring-cyan-300/70 sm:[--chip-half:100px] md:[--chip-half:108px]"
      style={{
        left: `clamp(var(--chip-half), ${node.x}%, calc(100% - var(--chip-half)))`,
        top: `clamp(56px, ${node.y}%, calc(100% - 56px))`,
        animation: `float-y 6s ease-in-out ${delay}ms infinite`,
      }}
    >
      <div className="relative">
        {/* hover halo — cheap radial bg, no filters that hurt FPS */}
        <div
          className="pointer-events-none absolute -inset-6 rounded-[36px] opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
          style={{
            background: `radial-gradient(ellipse at center, hsla(${node.hue},95%,65%,0.35), transparent 65%)`,
          }}
        />
        {/* energy beam shooting up */}
        <div
          className="absolute left-1/2 top-[-130px] h-[130px] w-[3px] -translate-x-1/2 rounded-full"
          style={{
            background: `linear-gradient(to top, hsla(${node.hue},95%,72%,0.95), hsla(${node.hue},95%,80%,0.2) 60%, transparent)`,
            boxShadow: `0 0 24px hsla(${node.hue},95%,70%,0.9), 0 0 60px hsla(${node.hue},95%,70%,0.5)`,
          }}
        />
        <div
          className="absolute left-1/2 top-[-140px] h-6 w-6 -translate-x-1/2 rounded-full blur-md"
          style={{ background: `hsla(${node.hue},95%,75%,0.9)` }}
        />

        {/* holographic platform — clean glass disc, no building clutter */}
        <div className="relative h-[56px] w-[150px] sm:h-[64px] sm:w-[172px] md:h-[72px] md:w-[190px]">
          <div
            className="absolute left-1/2 top-[44px] h-6 w-[170px] -translate-x-1/2 rounded-[50%] blur-xl"
            style={{ background: `hsla(${node.hue},95%,60%,0.55)` }}
          />
          <svg viewBox="0 0 210 96" className="absolute inset-0 h-full w-full">
            <defs>
              <radialGradient id={`pad-${node.id}`} cx="50%" cy="55%" r="55%">
                <stop offset="0%" stopColor={`hsla(${node.hue},95%,68%,0.5)`} />
                <stop offset="60%" stopColor={`hsla(${node.hue},85%,42%,0.22)`} />
                <stop offset="100%" stopColor="rgba(2,8,23,0)" />
              </radialGradient>
            </defs>
            <ellipse cx="105" cy="60" rx="98" ry="20" fill={`url(#pad-${node.id})`} />
            <ellipse cx="105" cy="60" rx="98" ry="20" fill="none" stroke={`hsla(${node.hue},95%,75%,0.7)`} strokeWidth="1" />
            <ellipse cx="105" cy="60" rx="76" ry="14" fill="none" stroke={`hsla(${node.hue},95%,75%,0.35)`} strokeWidth="0.6" strokeDasharray="2 3" />
          </svg>
          {/* floating glyph */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ animation: "float-y 5s ease-in-out infinite" }}
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl border backdrop-blur"
              style={{
                background: `hsla(${node.hue},90%,55%,0.18)`,
                borderColor: `hsla(${node.hue},90%,70%,0.5)`,
                boxShadow: `0 0 24px hsla(${node.hue},95%,60%,0.55), inset 0 0 12px hsla(${node.hue},95%,70%,0.25)`,
                color: `hsl(${node.hue},95%,82%)`,
              }}
            >
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* holographic label chip */}
        <div
          className="relative mt-2 flex min-w-[150px] items-center gap-2.5 rounded-2xl border border-cyan-300/30 bg-[#06101f]/85 px-3 py-2 text-start backdrop-blur-xl transition-transform group-hover:-translate-y-1"
          style={{
            boxShadow: `0 0 30px hsla(${node.hue},90%,60%,0.35), inset 0 0 0 1px hsla(${node.hue},90%,70%,0.18)`,
          }}
        >
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: `hsla(${node.hue},90%,55%,0.18)`, color: `hsl(${node.hue},90%,75%)` }}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[10px] font-semibold tracking-[0.2em] text-slate-200">
              {isAr ? node.label_ar : node.label_en}
            </div>
            <div className="truncate text-[10px] text-slate-400">{isAr ? node.meta_ar : node.meta_en}</div>
          </div>
          {/* status pulse */}
          <span className="relative ms-auto flex h-2.5 w-2.5 shrink-0">
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70"
              style={{ background: statusColor }}
            />
            <span
              className="relative inline-flex h-2.5 w-2.5 rounded-full"
              style={{ background: statusColor, boxShadow: `0 0 8px ${statusColor}` }}
            />
          </span>
        </div>
      </div>
    </button>
  );
}

/* ─────────────────────────── Context Menu ─────────────────────────── */

function NodeContextMenu({
  node,
  x,
  y,
  isAr,
  onClose,
  onOpen,
  onDrill,
  onRelated,
}: {
  node: OrbitNode;
  x: number;
  y: number;
  isAr: boolean;
  onClose: () => void;
  onOpen: () => void;
  onDrill: () => void;
  onRelated: (to: string) => void;
}) {
  // Clamp so the menu stays in viewport
  const W = 240, H = 280;
  const left = Math.min(x, (typeof window !== "undefined" ? window.innerWidth : 1024) - W - 12);
  const top = Math.min(y, (typeof window !== "undefined" ? window.innerHeight : 768) - H - 12);
  return (
    <div className="fixed inset-0 z-40" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute w-60 overflow-hidden rounded-xl border border-cyan-300/30 bg-[#040816]/95 text-sm text-slate-200 shadow-[0_30px_80px_-10px_rgba(34,211,238,0.45)] backdrop-blur-xl"
        style={{ left, top, animation: "scale-in 0.12s ease-out" }}
      >
        <div className="border-b border-white/5 px-3 py-2">
          <div className="text-[10px] font-bold tracking-[0.2em] text-cyan-300/80">
            {isAr ? node.label_ar : node.label_en}
          </div>
          <div className="text-[10px] text-slate-500">{isAr ? "إجراءات سياقية" : "Context actions"}</div>
        </div>
        <ul className="py-1">
          <CtxItem label={isAr ? "فتح الوحدة" : "Open module"} onClick={onOpen} hint="↵" />
          <CtxItem label={isAr ? "تفاصيل تنفيذية" : "Executive drill-down"} onClick={onDrill} hint="Space" />
        </ul>
        {node.related.length > 0 && (
          <>
            <div className="border-t border-white/5 px-3 py-1 text-[9px] font-bold tracking-[0.2em] text-slate-500">
              {isAr ? "روابط ذات صلة" : "RELATED"}
            </div>
            <ul className="pb-1">
              {node.related.map((r) => (
                <CtxItem
                  key={r.to}
                  label={isAr ? r.label_ar : r.label_en}
                  onClick={() => onRelated(r.to)}
                />
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function CtxItem({ label, onClick, hint }: { label: string; onClick: () => void; hint?: string }) {
  return (
    <li>
      <button
        onClick={onClick}
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-start text-[12px] text-slate-200 hover:bg-cyan-400/10 hover:text-cyan-200"
      >
        <span>{label}</span>
        {hint && <kbd className="rounded border border-slate-700/60 bg-slate-900/60 px-1.5 py-0.5 text-[9px] text-slate-400">{hint}</kbd>}
      </button>
    </li>
  );
}

/* ─────────────────────────── Drill-down Panel ─────────────────────────── */

function NodeDrillPanel({
  node,
  isAr,
  onClose,
  onOpen,
  onRelated,
}: {
  node: OrbitNode;
  isAr: boolean;
  onClose: () => void;
  onOpen: () => void;
  onRelated: (to: string) => void;
}) {
  const Icon = node.icon;
  const statusLabel =
    node.status === "healthy"
      ? isAr ? "صحي" : "Healthy"
      : node.status === "warning"
      ? isAr ? "تحذير" : "Warning"
      : isAr ? "حرج" : "Critical";
  const statusColor =
    node.status === "healthy" ? "emerald" : node.status === "warning" ? "amber" : "rose";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center" onClick={onClose}>
      <div className="absolute inset-0 bg-[#020514]/75 backdrop-blur-md" />
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-2xl overflow-hidden rounded-3xl border border-cyan-300/25 bg-[#040816]/95 shadow-[0_40px_120px_-20px_rgba(34,211,238,0.6)]"
        style={{ animation: "scale-in 0.2s ease-out" }}
      >
        {/* header */}
        <div
          className="relative flex items-center gap-4 border-b border-white/5 px-5 py-4"
          style={{ background: `linear-gradient(135deg, hsla(${node.hue},90%,55%,0.15), transparent 70%)` }}
        >
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
            style={{
              background: `hsla(${node.hue},90%,55%,0.18)`,
              color: `hsl(${node.hue},90%,75%)`,
              boxShadow: `0 0 24px hsla(${node.hue},90%,60%,0.45)`,
            }}
          >
            <Icon className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold tracking-[0.3em] text-cyan-300/80">
              {isAr ? "كيان مؤسسي" : "ENTERPRISE ENTITY"}
            </div>
            <h2 className="truncate text-lg font-bold text-white sm:text-xl">
              {isAr ? node.label_ar : node.label_en}
            </h2>
            <div className="mt-0.5 text-[11px] text-slate-400">{isAr ? node.meta_ar : node.meta_en}</div>
          </div>
          <span
            className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border-${statusColor}-400/40 bg-${statusColor}-400/10 text-${statusColor}-300`}
          >
            {statusLabel}
          </span>
          <button
            onClick={onClose}
            aria-label={isAr ? "إغلاق" : "Close"}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto p-5">
          {/* KPIs */}
          <section>
            <div className="mb-2 text-[10px] font-bold tracking-[0.25em] text-cyan-300/80">
              {isAr ? "مؤشرات الأداء الحية" : "LIVE KPIs"}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {node.kpis.map((k) => (
                <div key={k.label_en} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                  <div className="text-[10px] uppercase tracking-widest text-slate-500">
                    {isAr ? k.label_ar : k.label_en}
                  </div>
                  <div className="mt-1 text-xl font-bold text-cyan-200">{k.value}</div>
                  <div
                    className={`mt-0.5 text-[11px] font-semibold ${
                      k.trend === "up" ? "text-emerald-300" : k.trend === "down" ? "text-rose-300" : "text-slate-400"
                    }`}
                  >
                    {k.delta}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Agents + Integrations */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DrillList
              title={isAr ? "وكلاء الذكاء المرتبطون" : "RELATED AI AGENTS"}
              icon={Bot}
              items={node.agents}
            />
            <DrillList
              title={isAr ? "التكاملات النشطة" : "ACTIVE INTEGRATIONS"}
              icon={GitBranch}
              items={node.integrations}
            />
          </div>

          {/* Related navigation */}
          {node.related.length > 0 && (
            <section>
              <div className="mb-2 text-[10px] font-bold tracking-[0.25em] text-cyan-300/80">
                {isAr ? "مسارات العمل ذات الصلة" : "RELATED WORKFLOWS"}
              </div>
              <div className="flex flex-wrap gap-2">
                {node.related.map((r) => (
                  <button
                    key={r.to}
                    onClick={() => onRelated(r.to)}
                    className="group inline-flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-1.5 text-[11px] font-semibold text-cyan-200 transition hover:border-cyan-300/50 hover:bg-cyan-400/15"
                  >
                    {isAr ? r.label_ar : r.label_en}
                    <ArrowUpRight className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-white/5 bg-[#02050f]/60 p-3">
          <span className="text-[10px] tracking-[0.25em] text-slate-500">
            {isAr ? "تم التوليد بواسطة ARIA" : "Generated by ARIA"}
          </span>
          <button
            onClick={onOpen}
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-gradient-to-r from-cyan-500/20 to-blue-600/20 px-4 py-2 text-xs font-bold text-cyan-100 hover:from-cyan-500/30 hover:to-blue-600/30"
          >
            {isAr ? "فتح الوحدة الكاملة" : "Open Full Module"}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function DrillList({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: string[];
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-3">
      <div className="mb-2 flex items-center gap-2 text-[10px] font-bold tracking-[0.25em] text-cyan-300/70">
        <Icon className="h-3.5 w-3.5" /> {title}
      </div>
      <ul className="space-y-1.5">
        {items.map((it) => (
          <li
            key={it}
            className="flex items-center gap-2 rounded-lg border border-white/5 bg-[#06101f]/60 px-2.5 py-1.5 text-[12px] text-slate-200"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400/80" />
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}



function CityscapeBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0">
      {/* nebula glows */}
      <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-cyan-500/15 blur-[120px]" />
      <div className="absolute -top-24 right-1/4 h-96 w-96 rounded-full bg-blue-600/20 blur-[120px]" />
      <div className="absolute bottom-0 left-1/2 h-80 w-[80%] -translate-x-1/2 rounded-full bg-cyan-400/10 blur-[120px]" />
      {/* starfield */}
      <svg className="absolute inset-0 h-full w-full opacity-60">
        {Array.from({ length: 80 }).map((_, i) => {
          const cx = (Math.sin(i * 12.9898) * 43758.5453) % 1;
          const cy = (Math.cos(i * 78.233) * 43758.5453) % 1;
          const x = Math.abs(cx) * 100;
          const y = Math.abs(cy) * 100;
          const r = (i % 4 === 0 ? 1.2 : 0.6);
          return (
            <circle
              key={i}
              cx={`${x}%`}
              cy={`${y}%`}
              r={r}
              fill="white"
              opacity={0.25 + ((i % 5) * 0.1)}
            />
          );
        })}
      </svg>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  delta,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  delta: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-cyan-400/15 bg-[#06101f]/80 p-4 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-cyan-300/40"
      style={{
        boxShadow: highlight
          ? "0 0 40px rgba(34,211,238,0.25), inset 0 0 0 1px rgba(34,211,238,0.15)"
          : undefined,
      }}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-cyan-400/10 text-cyan-300">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="text-[10px] font-semibold tracking-[0.2em] text-slate-400">{label}</div>
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight text-slate-50">{value}</div>
      <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
        {delta}
        <span className="text-slate-500"> vs last month</span>
      </div>
    </div>
  );
}

/* ═════════════════════ Executive Intelligence ═════════════════════ */

function IntelligenceTicker({ isAr }: { isAr: boolean }) {
  const items = isAr
    ? [
        { tone: "emerald", txt: "وكيل المبيعات أغلق صفقة بقيمة 2.4M ريال — منطقة الرياض" },
        { tone: "cyan", txt: "تحسين تلقائي لخط أنابيب البيانات — وفر 14% من زمن المعالجة" },
        { tone: "amber", txt: "تنبيه: ارتفاع غير معتاد في مكالمات API لـ SAP — قيد المراقبة" },
        { tone: "violet", txt: "تم نشر نموذج التنبؤ الجديد (v4.2) عبر 12 قسم" },
        { tone: "emerald", txt: "مؤشر سلامة المؤسسة ارتفع إلى 94 — أعلى مستوى هذا الربع" },
        { tone: "cyan", txt: "اكتمل تكامل Oracle Cloud — تدفق البيانات يعمل في الوقت الفعلي" },
      ]
    : [
        { tone: "emerald", txt: "Sales Agent closed $2.4M deal — Riyadh region" },
        { tone: "cyan", txt: "Auto-tuned data pipeline — 14% processing time saved" },
        { tone: "amber", txt: "Anomaly: unusual spike in SAP API calls — monitoring" },
        { tone: "violet", txt: "Forecast model v4.2 deployed across 12 departments" },
        { tone: "emerald", txt: "Enterprise health index rose to 94 — quarterly high" },
        { tone: "cyan", txt: "Oracle Cloud integration completed — realtime data flow active" },
      ];
  const loop = [...items, ...items];
  const toneClr: Record<string, string> = {
    emerald: "text-emerald-300 bg-emerald-400/10 border-emerald-400/30",
    cyan: "text-cyan-300 bg-cyan-400/10 border-cyan-400/30",
    amber: "text-amber-300 bg-amber-400/10 border-amber-400/30",
    violet: "text-violet-300 bg-violet-400/10 border-violet-400/30",
  };
  return (
    <div className="relative mt-4 overflow-hidden rounded-2xl border border-cyan-400/15 bg-[#06101f]/80 backdrop-blur-xl">
      <div className="absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-[#04060f] to-transparent" />
      <div className="absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-[#04060f] to-transparent" />
      <div className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-md border border-cyan-400/30 bg-[#04060f]/90 px-2 py-1 text-[10px] font-bold tracking-[0.25em] text-cyan-300">
        {isAr ? "البث المباشر" : "LIVE FEED"}
      </div>
      <div className="flex animate-ticker-x gap-3 whitespace-nowrap py-2.5 pl-32 pr-6">
        {loop.map((it, i) => (
          <span
            key={i}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium ${toneClr[it.tone]}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current animate-glow-pulse" />
            {it.txt}
          </span>
        ))}
      </div>
    </div>
  );
}

function SectionHead({
  icon: Icon,
  eyebrow,
  title,
  tone = "cyan",
}: {
  icon: React.ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  tone?: "cyan" | "emerald" | "amber" | "rose" | "violet";
}) {
  const tones: Record<string, string> = {
    cyan: "text-cyan-300 bg-cyan-400/10 border-cyan-400/30",
    emerald: "text-emerald-300 bg-emerald-400/10 border-emerald-400/30",
    amber: "text-amber-300 bg-amber-400/10 border-amber-400/30",
    rose: "text-rose-300 bg-rose-400/10 border-rose-400/30",
    violet: "text-violet-300 bg-violet-400/10 border-violet-400/30",
  };
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${tones[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="leading-tight">
        <div className="text-[9px] font-bold tracking-[0.3em] text-slate-400">{eyebrow}</div>
        <div className="text-sm font-semibold text-slate-100">{title}</div>
      </div>
    </div>
  );
}

function ExecCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`holo-edge group relative overflow-hidden rounded-2xl border border-cyan-400/15 bg-[#06101f]/80 p-4 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-cyan-300/35 shadow-exec ${className ?? ""}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
      <div className="relative">{children}</div>
    </div>
  );
}

/* — Enterprise Health Score (animated SVG ring) — */
function EnterpriseHealth({ isAr }: { isAr: boolean }) {
  const score = 94;
  const r = 70;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const segments = [
    { label_ar: "العمليات", label_en: "Operations", v: 96, tone: "emerald" },
    { label_ar: "البيانات", label_en: "Data", v: 92, tone: "cyan" },
    { label_ar: "الأمن", label_en: "Security", v: 98, tone: "emerald" },
    { label_ar: "الذكاء", label_en: "AI", v: 89, tone: "violet" },
    { label_ar: "التكاملات", label_en: "Integrations", v: 91, tone: "cyan" },
  ];
  const toneClr: Record<string, string> = {
    emerald: "bg-emerald-400", cyan: "bg-cyan-400", violet: "bg-violet-400",
  };
  return (
    <ExecCard className="lg:col-span-4">
      <SectionHead
        icon={Heart}
        eyebrow={isAr ? "صحة المؤسسة" : "ENTERPRISE HEALTH"}
        title={isAr ? "مؤشر الصحة العام" : "Composite Health Index"}
        tone="emerald"
      />
      <div className="flex items-center gap-5">
        <div className="relative h-44 w-44 shrink-0">
          <div className="absolute inset-0 rounded-full bg-emerald-400/10 blur-2xl" />
          <svg viewBox="0 0 180 180" className="relative h-full w-full -rotate-90">
            <defs>
              <linearGradient id="healthGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
            <circle cx="90" cy="90" r={r} fill="none" stroke="rgba(34,211,238,0.1)" strokeWidth="10" />
            <circle
              cx="90" cy="90" r={r} fill="none"
              stroke="url(#healthGrad)" strokeWidth="10" strokeLinecap="round"
              strokeDasharray={c} strokeDashoffset={offset}
              style={{ filter: "drop-shadow(0 0 8px rgba(52,211,153,0.6))" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-4xl font-bold text-white">{score}</div>
            <div className="text-[10px] font-semibold tracking-[0.3em] text-emerald-300">
              {isAr ? "ممتاز" : "EXCELLENT"}
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-2.5">
          {segments.map((s) => (
            <div key={s.label_en}>
              <div className="mb-1 flex justify-between text-[11px]">
                <span className="text-slate-300">{isAr ? s.label_ar : s.label_en}</span>
                <span className="font-semibold text-slate-100">{s.v}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-800/60">
                <div
                  className={`h-full rounded-full ${toneClr[s.tone]}`}
                  style={{ width: `${s.v}%`, boxShadow: "0 0 8px currentColor" }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </ExecCard>
  );
}

/* — Executive Risk Radar (polar SVG) — */
function RiskRadar({ isAr }: { isAr: boolean }) {
  const axes = isAr
    ? ["مالي", "تشغيلي", "سيبراني", "امتثال", "سمعة", "سلسلة الإمداد"]
    : ["Financial", "Operational", "Cyber", "Compliance", "Reputation", "Supply"];
  const values = [0.35, 0.62, 0.48, 0.28, 0.4, 0.55];
  const cx = 110, cy = 110, R = 88;
  const pt = (i: number, v: number) => {
    const a = (Math.PI * 2 * i) / axes.length - Math.PI / 2;
    return [cx + Math.cos(a) * R * v, cy + Math.sin(a) * R * v] as const;
  };
  const poly = values.map((v, i) => pt(i, v).join(",")).join(" ");
  return (
    <ExecCard className="lg:col-span-4">
      <SectionHead
        icon={Radar}
        eyebrow={isAr ? "رادار المخاطر التنفيذي" : "EXECUTIVE RISK RADAR"}
        title={isAr ? "تقييم متعدد الأبعاد" : "Multi-Vector Assessment"}
        tone="amber"
      />
      <div className="relative mx-auto h-56 w-56">
        <div className="absolute inset-0 rounded-full bg-amber-400/5 blur-2xl" />
        <svg viewBox="0 0 220 220" className="relative h-full w-full">
          {[0.25, 0.5, 0.75, 1].map((s) => (
            <circle key={s} cx={cx} cy={cy} r={R * s} fill="none" stroke="rgba(34,211,238,0.12)" />
          ))}
          {axes.map((_, i) => {
            const [x, y] = pt(i, 1);
            return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(34,211,238,0.1)" />;
          })}
          <polygon
            points={poly}
            fill="rgba(251,191,36,0.25)"
            stroke="rgba(251,191,36,0.9)"
            strokeWidth="1.5"
            style={{ filter: "drop-shadow(0 0 8px rgba(251,191,36,0.6))" }}
          />
          {values.map((v, i) => {
            const [x, y] = pt(i, v);
            return <circle key={i} cx={x} cy={y} r="3" fill="#fbbf24" />;
          })}
          {/* sweep */}
          <g className="animate-radar-sweep" style={{ transformOrigin: "110px 110px" }}>
            <defs>
              <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgba(34,211,238,0)" />
                <stop offset="100%" stopColor="rgba(34,211,238,0.5)" />
              </linearGradient>
            </defs>
            <path d={`M ${cx} ${cy} L ${cx + R} ${cy} A ${R} ${R} 0 0 0 ${cx + R * Math.cos(-Math.PI / 6)} ${cy + R * Math.sin(-Math.PI / 6)} Z`} fill="url(#sweep)" />
          </g>
          {axes.map((lbl, i) => {
            const [x, y] = pt(i, 1.18);
            return (
              <text
                key={lbl}
                x={x}
                y={y}
                fill="rgba(203,213,225,0.9)"
                fontSize="9"
                fontWeight="600"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {lbl}
              </text>
            );
          })}
        </svg>
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px]">
        <span className="text-slate-400">{isAr ? "متوسط المخاطر" : "Avg risk"}</span>
        <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 font-semibold text-amber-300">
          {isAr ? "متوسط — تحت السيطرة" : "Moderate — under control"}
        </span>
      </div>
    </ExecCard>
  );
}

/* — Strategic Objectives — */
function StrategicObjectives({ isAr }: { isAr: boolean }) {
  const items = isAr
    ? [
        { name: "التحول الرقمي 2030", v: 78, owner: "CTO", tone: "cyan" },
        { name: "السعودة في القيادة", v: 92, owner: "CHRO", tone: "emerald" },
        { name: "خفض الانبعاثات 40%", v: 54, owner: "COO", tone: "violet" },
        { name: "توسع الخليج", v: 67, owner: "CEO", tone: "cyan" },
        { name: "تبني الذكاء الاصطناعي", v: 88, owner: "CDO", tone: "emerald" },
      ]
    : [
        { name: "Digital Transformation 2030", v: 78, owner: "CTO", tone: "cyan" },
        { name: "Leadership Saudization", v: 92, owner: "CHRO", tone: "emerald" },
        { name: "Cut Emissions 40%", v: 54, owner: "COO", tone: "violet" },
        { name: "Gulf Expansion", v: 67, owner: "CEO", tone: "cyan" },
        { name: "AI Adoption", v: 88, owner: "CDO", tone: "emerald" },
      ];
  const toneText: Record<string, string> = {
    cyan: "text-cyan-300", emerald: "text-emerald-300", violet: "text-violet-300",
  };
  const toneBg: Record<string, string> = {
    cyan: "bg-gradient-to-r from-cyan-500 to-blue-500",
    emerald: "bg-gradient-to-r from-emerald-500 to-teal-500",
    violet: "bg-gradient-to-r from-violet-500 to-fuchsia-500",
  };
  return (
    <ExecCard className="lg:col-span-4">
      <SectionHead
        icon={Target}
        eyebrow={isAr ? "الأهداف الاستراتيجية" : "STRATEGIC OBJECTIVES"}
        title={isAr ? "تتبع الأولويات التنفيذية" : "Executive Priority Tracking"}
        tone="violet"
      />
      <div className="space-y-3">
        {items.map((o) => (
          <div key={o.name} className="group/obj rounded-xl border border-slate-700/40 bg-slate-900/40 p-3 transition-colors hover:border-cyan-400/30">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-[12px] font-semibold text-slate-100">{o.name}</div>
                <div className="text-[10px] text-slate-500">{isAr ? "المسؤول" : "Owner"} · {o.owner}</div>
              </div>
              <div className={`text-lg font-bold tabular-nums ${toneText[o.tone]}`}>{o.v}%</div>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full ${toneBg[o.tone]} transition-all duration-1000`}
                style={{ width: `${o.v}%`, boxShadow: "0 0 10px rgba(34,211,238,0.5)" }}
              />
            </div>
          </div>
        ))}
      </div>
    </ExecCard>
  );
}

/* — Live Integration Topology — */
function IntegrationTopology({ isAr }: { isAr: boolean }) {
  const nodes = [
    { id: "sap", name: "SAP S/4", x: 18, y: 28, status: "ok" },
    { id: "ora", name: "Oracle Cloud", x: 82, y: 28, status: "ok" },
    { id: "m365", name: "Microsoft 365", x: 14, y: 72, status: "warn" },
    { id: "shp", name: "SharePoint", x: 86, y: 72, status: "ok" },
    { id: "azr", name: "Azure AD", x: 50, y: 12, status: "ok" },
    { id: "tms", name: "Teams", x: 50, y: 88, status: "ok" },
  ];
  const statusClr: Record<string, string> = {
    ok: "border-emerald-400/50 bg-emerald-400/10 text-emerald-300 shadow-[0_0_18px_rgba(52,211,153,0.45)]",
    warn: "border-amber-400/50 bg-amber-400/10 text-amber-300 shadow-[0_0_18px_rgba(251,191,36,0.45)]",
  };
  return (
    <ExecCard className="lg:col-span-7">
      <SectionHead
        icon={GitBranch}
        eyebrow={isAr ? "طوبولوجيا التكامل المباشرة" : "LIVE INTEGRATION TOPOLOGY"}
        title={isAr ? "تدفق البيانات بين الأنظمة" : "Cross-System Data Flow"}
        tone="cyan"
      />
      <div className="relative h-64 overflow-hidden rounded-xl border border-cyan-400/10 bg-gradient-to-b from-[#04060f] to-[#020512]">
        <div className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(rgba(34,211,238,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.25) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        {/* center hub */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="absolute -inset-6 rounded-full bg-cyan-400/20 blur-2xl animate-glow-pulse" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-cyan-300/60 bg-[#06101f]" style={{ boxShadow: "0 0 30px rgba(34,211,238,0.6), inset 0 0 20px rgba(34,211,238,0.3)" }}>
            <Cpu className="h-6 w-6 text-cyan-300" />
          </div>
          <div className="mt-1 text-center text-[9px] font-bold tracking-[0.3em] text-cyan-300">NEXUS HUB</div>
        </div>
        {/* beams */}
        <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
          <defs>
            <linearGradient id="topBeam" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(34,211,238,0)" />
              <stop offset="50%" stopColor="rgba(34,211,238,0.7)" />
              <stop offset="100%" stopColor="rgba(34,211,238,0)" />
            </linearGradient>
          </defs>
          {nodes.map((n) => (
            <line
              key={n.id}
              x1={50} y1={50} x2={n.x} y2={n.y}
              stroke="url(#topBeam)" strokeWidth="0.3"
              strokeDasharray="0.8 1.2"
              style={{ animation: "dash 4s linear infinite" }}
            />
          ))}
        </svg>
        {nodes.map((n) => (
          <div
            key={n.id}
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold backdrop-blur ${statusClr[n.status]}`}
            style={{ left: `${n.x}%`, top: `${n.y}%` }}
          >
            <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current animate-glow-pulse" />
            {n.name}
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px]">
        <div className="rounded-md border border-emerald-400/20 bg-emerald-400/5 py-1.5">
          <div className="font-bold text-emerald-300">18</div>
          <div className="text-slate-400">{isAr ? "متصل" : "Connected"}</div>
        </div>
        <div className="rounded-md border border-amber-400/20 bg-amber-400/5 py-1.5">
          <div className="font-bold text-amber-300">1</div>
          <div className="text-slate-400">{isAr ? "تحذير" : "Warning"}</div>
        </div>
        <div className="rounded-md border border-cyan-400/20 bg-cyan-400/5 py-1.5">
          <div className="font-bold text-cyan-300">42 ms</div>
          <div className="text-slate-400">{isAr ? "متوسط الكمون" : "Avg latency"}</div>
        </div>
      </div>
    </ExecCard>
  );
}

/* — AI Orchestration Flow — */
function OrchestrationFlow({ isAr }: { isAr: boolean }) {
  const stages = isAr
    ? [
        { name: "الاستيعاب", count: "1.2M", icon: Database },
        { name: "التحليل", count: "842K", icon: Activity },
        { name: "الاستدلال", count: "318K", icon: Bot },
        { name: "القرار", count: "94K", icon: ShieldCheck },
        { name: "التنفيذ", count: "12.4K", icon: Zap },
      ]
    : [
        { name: "Ingest", count: "1.2M", icon: Database },
        { name: "Analyze", count: "842K", icon: Activity },
        { name: "Reason", count: "318K", icon: Bot },
        { name: "Decide", count: "94K", icon: ShieldCheck },
        { name: "Execute", count: "12.4K", icon: Zap },
      ];
  return (
    <ExecCard className="lg:col-span-5">
      <SectionHead
        icon={Workflow}
        eyebrow={isAr ? "تنسيق الذكاء الاصطناعي" : "AI ORCHESTRATION"}
        title={isAr ? "خط أنابيب القرار الحي" : "Live Decision Pipeline"}
        tone="violet"
      />
      <div className="relative flex items-stretch gap-1.5">
        {stages.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={s.name} className="relative flex-1">
              <div className="group/st relative overflow-hidden rounded-lg border border-cyan-400/20 bg-[#04060f]/80 p-2.5 text-center transition-all hover:border-cyan-300/50 hover:shadow-[0_0_20px_rgba(34,211,238,0.35)]">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent" />
                <div className="mx-auto mb-1.5 flex h-7 w-7 items-center justify-center rounded-md bg-cyan-400/10 text-cyan-300">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="text-[9px] font-bold tracking-wider text-slate-400">{s.name}</div>
                <div className="mt-1 text-sm font-bold text-cyan-200">{s.count}</div>
              </div>
              {i < stages.length - 1 && (
                <div className="pointer-events-none absolute top-1/2 -right-1 z-10 h-px w-2 bg-gradient-to-r from-cyan-400 to-transparent" />
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-4 space-y-2">
        {[
          { l_ar: "وكلاء نشطون", l_en: "Active Agents", v: "48", t: "emerald" },
          { l_ar: "قرارات/الدقيقة", l_en: "Decisions / min", v: "1,284", t: "cyan" },
          { l_ar: "دقة النموذج", l_en: "Model accuracy", v: "97.4%", t: "violet" },
        ].map((r) => (
          <div key={r.l_en} className="flex items-center justify-between rounded-lg border border-slate-700/40 bg-slate-900/40 px-3 py-2">
            <span className="text-[11px] text-slate-300">{isAr ? r.l_ar : r.l_en}</span>
            <span className={`text-sm font-bold tabular-nums ${
              r.t === "emerald" ? "text-emerald-300" : r.t === "cyan" ? "text-cyan-300" : "text-violet-300"
            }`}>{r.v}</span>
          </div>
        ))}
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />
          <span className="text-[11px] text-amber-200">
            {isAr ? "تنبيه: نموذج التنبؤ يحتاج إعادة تدريب خلال 6 أيام" : "Alert: forecast model needs retraining in 6 days"}
          </span>
        </div>
      </div>
    </ExecCard>
  );
}
