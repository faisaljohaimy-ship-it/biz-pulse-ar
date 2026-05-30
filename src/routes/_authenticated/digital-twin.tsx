import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useI18n } from "@/lib/i18n";
import { useEnterprisePulse } from "@/lib/enterprise-pulse";
import { PredictionsPanel } from "@/components/predictions-panel";
import { getTwinSignals, type TwinSignals } from "@/lib/intelligence.functions";
import { useAriaVoice } from "@/lib/aria-voice";
import { supabase } from "@/integrations/supabase/client";
import {
  Boxes, Building2, Database, Bot, Plug, Workflow, BookOpen,
  ShieldAlert, Crown, Sparkles, Activity, Gauge, Brain, Zap,
  TrendingUp, Mic, MicOff, Send, ArrowRight, X, Maximize2, Minimize2,
  Volume2, VolumeX,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/digital-twin")({
  component: DigitalTwinPage,
});

/* ────────── Node graph (orbital model) ────────── */

type TwinNode = {
  id: string;
  label_ar: string;
  label_en: string;
  ring: 0 | 1 | 2;            // 0 = inner, 2 = outer
  angle: number;              // degrees on its ring
  icon: typeof Building2;
  tone: string;               // hex tint
  route: string;
  kpi_ar: string;
  kpi_en: string;
  value: string;
};

const NODES: TwinNode[] = [
  { id: "depts",    label_ar: "الإدارات",        label_en: "Departments",  ring: 0, angle:   0, icon: Building2,  tone: "#22d3ee", route: "/departments",  kpi_ar: "إدارة نشطة", kpi_en: "active depts", value: "12" },
  { id: "data",     label_ar: "بحيرة البيانات",  label_en: "Data Lake",    ring: 0, angle: 120, icon: Database,   tone: "#7dd3fc", route: "/knowledge",    kpi_ar: "تدفق/ثانية",  kpi_en: "events/s",     value: "184k" },
  { id: "agents",   label_ar: "وكلاء AI",        label_en: "AI Agents",    ring: 0, angle: 240, icon: Bot,        tone: "#a78bfa", route: "/agents",       kpi_ar: "وكيل نشط",   kpi_en: "online",       value: "47" },

  { id: "integ",    label_ar: "التكاملات",       label_en: "Integrations", ring: 1, angle:  30, icon: Plug,       tone: "#34d399", route: "/integrations", kpi_ar: "نظام مربوط", kpi_en: "systems",      value: "63" },
  { id: "flows",    label_ar: "الأتمتة",         label_en: "Automations",  ring: 1, angle: 100, icon: Workflow,   tone: "#f59e0b", route: "/orchestration",kpi_ar: "تنفيذ/يوم",  kpi_en: "runs/day",     value: "9.2k" },
  { id: "know",     label_ar: "مركز المعرفة",   label_en: "Knowledge Hub",ring: 1, angle: 170, icon: BookOpen,   tone: "#67e8f9", route: "/knowledge",    kpi_ar: "وثيقة",       kpi_en: "documents",    value: "21,408" },
  { id: "risk",     label_ar: "محرك المخاطر",   label_en: "Risk Engine",  ring: 1, angle: 240, icon: ShieldAlert,tone: "#f43f5e", route: "/risk",         kpi_ar: "إشارة حرجة", kpi_en: "critical",     value: "2" },
  { id: "board",    label_ar: "قاعة الإدارة",   label_en: "Boardroom",    ring: 1, angle: 310, icon: Crown,      tone: "#fbbf24", route: "/boardroom",    kpi_ar: "قرار معلق",  kpi_en: "pending",      value: "5" },

  { id: "intel",    label_ar: "الذكاء التنفيذي",label_en: "Intelligence", ring: 2, angle:  60, icon: Brain,      tone: "#c4b5fd", route: "/intelligence", kpi_ar: "إشارة", kpi_en: "signals",      value: "318" },
  { id: "exec",     label_ar: "التنفيذ",         label_en: "Execution",    ring: 2, angle: 200, icon: Activity,   tone: "#5eead4", route: "/execution",    kpi_ar: "سرعة",        kpi_en: "velocity",     value: "87%" },
];

const EDGES: Array<[string, string]> = [
  ["depts", "data"], ["depts", "agents"], ["data", "agents"],
  ["depts", "integ"], ["data", "know"], ["agents", "flows"],
  ["integ", "flows"], ["flows", "risk"], ["risk", "board"],
  ["know", "intel"], ["agents", "intel"], ["board", "exec"],
  ["flows", "exec"], ["risk", "intel"],
];

/* ────────── Page ────────── */

function DigitalTwinPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const navigate = useNavigate();
  const pulse = useEnterprisePulse();
  const signalsQuery = useQuery({
    queryKey: ["twin-signals"],
    queryFn: () => getTwinSignals(),
    refetchInterval: 30_000,
  });
  const signals: TwinSignals | undefined = signalsQuery.data;

  const liveNodes = useMemo(() => {
    if (!signals) return NODES;
    const map: Record<string, string> = {
      depts: String(signals.departments || NODES.find((n) => n.id === "depts")!.value),
      data: String(signals.events),
      agents: String(signals.agents || NODES.find((n) => n.id === "agents")!.value),
      integ: String(signals.integrations || NODES.find((n) => n.id === "integ")!.value),
      flows: String(signals.automations),
      know: String(signals.documents),
      risk: String(signals.criticalRisks),
      board: String(signals.boardActions),
      intel: String(signals.intelligenceSignals),
      exec: `${signals.executionVelocity}%`,
    };
    return NODES.map((n) => ({ ...n, value: map[n.id] ?? n.value }));
  }, [signals]);

  const [t, setT] = useState(0);             // animation clock (frames)
  const [active, setActive] = useState<string | null>("data");
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const [ariaOpen, setAriaOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const sceneRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = async () => {
    const el = sceneRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen({ navigationUI: "hide" } as FullscreenOptions);
        if ("orientation" in screen && "lock" in (screen.orientation as unknown as { lock?: (o: string) => Promise<void> })) {
          await (screen.orientation as unknown as { lock: (o: string) => Promise<void> })
            .lock("landscape").catch(() => {});
        }
      } else {
        await document.exitFullscreen();
      }
    } catch { /* user-cancelled */ }
  };

  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // Animation tick — slow, executive (≈30fps via rAF throttle)
  useEffect(() => {
    let raf = 0;
    let last = 0;
    const loop = (now: number) => {
      if (now - last > 33) { setT((v) => v + 1); last = now; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Mouse parallax — subtle camera drift
  const onMouseMove = (e: React.MouseEvent) => {
    const r = sceneRef.current?.getBoundingClientRect();
    if (!r) return;
    const nx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    const ny = ((e.clientY - r.top) / r.height - 0.5) * 2;
    setParallax({ x: nx, y: ny });
  };

  /* Positions: project each node onto an elliptical orbit */
  const positions = useMemo(() => {
    const rings = [
      { rx: 18, ry: 11, speed: 0.10 }, // inner
      { rx: 32, ry: 19, speed: 0.06 }, // mid
      { rx: 44, ry: 26, speed: 0.04 }, // outer
    ];
    return NODES.map((n) => {
      const r = rings[n.ring];
      const a = ((n.angle + t * r.speed) * Math.PI) / 180;
      const x = 50 + Math.cos(a) * r.rx;
      const y = 50 + Math.sin(a) * r.ry;
      // depth from y component for parallax shading
      const depth = (Math.sin(a) + 1) / 2; // 0..1 (front→back)
      return { id: n.id, x, y, depth };
    });
  }, [t]);

  const posOf = (id: string) => positions.find((p) => p.id === id)!;
  const activeNode = active ? liveNodes.find((n) => n.id === active) : null;
  const activeEdges = active ? EDGES.filter(([a, b]) => a === active || b === active).map(([a, b]) => (a === active ? b : a)) : [];

  /* Executive status indicators */
  const statusBar = [
    { label_ar: "صحة المؤسسة",      label_en: "Enterprise Health",  value: `${pulse.health}%`,   tone: "#22d3ee", icon: Gauge },
    { label_ar: "المخاطر التشغيلية", label_en: "Operational Risk",   value: pulse.status === "critical" ? "HIGH" : pulse.status === "warning" ? "MED" : "LOW", tone: "#f43f5e", icon: ShieldAlert },
    { label_ar: "نشاط الذكاء",       label_en: "AI Activity",         value: `${pulse.counts.conversations}`, tone: "#a78bfa", icon: Brain },
    { label_ar: "إنتاجية الأتمتة",   label_en: "Automation Throughput",value: signals ? `${signals.automations}/wk` : "—", tone: "#f59e0b", icon: Zap },
    { label_ar: "سرعة التنفيذ",       label_en: "Execution Velocity",  value: signals ? `${signals.executionVelocity}%` : "—",   tone: "#34d399", icon: TrendingUp },
    { label_ar: "إشارات حية",         label_en: "Live Signals",        value: signals ? String(signals.intelligenceSignals) : "—",    tone: "#67e8f9", icon: Activity },
  ];

  return (
    <div
      ref={sceneRef}
      onMouseMove={onMouseMove}
      className="relative h-[calc(100dvh-3.5rem)] min-h-[640px] w-full overflow-hidden rounded-2xl border border-white/5 bg-[#02030a] text-slate-100"
      style={{
        background:
          "radial-gradient(ellipse at 50% 35%, #0b2046 0%, #050816 55%, #02030a 100%)",
      }}
    >
      {/* Starfield */}
      <Starfield />
      {/* Grid floor */}
      <GridFloor t={t} />
      {/* Vignette */}
      <div className="pointer-events-none absolute inset-0" style={{
        background: "radial-gradient(ellipse at center, transparent 40%, rgba(2,4,10,0.92) 100%)",
      }} />

      {/* Top executive status bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-wrap items-center justify-center gap-2 p-3 sm:gap-3 sm:p-4">
        <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 backdrop-blur-xl">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-400/15 text-cyan-300">
            <Boxes className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <div className="text-[9px] font-bold tracking-[0.3em] text-cyan-300/80">NEXUS · DIGITAL TWIN</div>
            <div className="text-[11px] font-semibold text-white">
              {ar ? "كون المؤسسة المباشر" : "Live Enterprise Universe"}
            </div>
          </div>
        </div>
        {statusBar.map((s) => (
          <div key={s.label_en}
            className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 backdrop-blur-xl"
            style={{ boxShadow: `0 0 24px -12px ${s.tone}55` }}
          >
            <s.icon className="h-3.5 w-3.5" style={{ color: s.tone }} />
            <div className="leading-tight">
              <div className="text-[8.5px] font-bold uppercase tracking-[0.22em] text-slate-400">
                {ar ? s.label_ar : s.label_en}
              </div>
              <div className="text-[12px] font-bold" style={{ color: s.tone }}>{s.value}</div>
            </div>
          </div>
        ))}
        <button
          onClick={toggleFullscreen}
          className="pointer-events-auto flex items-center gap-1.5 rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-3 py-2 text-[11px] font-bold text-cyan-200 backdrop-blur-xl hover:bg-cyan-400/20"
          aria-label="fullscreen"
        >
          {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{ar ? (isFullscreen ? "خروج" : "ملء الشاشة") : (isFullscreen ? "Exit" : "Cinema")}</span>
        </button>
      </div>

      {/* The orbital scene — parallax wrapper */}
      <div
        className="absolute inset-0 transition-transform duration-300 ease-out will-change-transform"
        style={{
          transform: `perspective(1400px) rotateX(${parallax.y * -3}deg) rotateY(${parallax.x * 4}deg) translateZ(0)`,
        }}
      >
        {/* SVG edges + orbits */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <defs>
            <radialGradient id="coreGlow" cx="50%" cy="50%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.7" />
              <stop offset="40%" stopColor="#7c3aed" stopOpacity="0.25" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            <linearGradient id="streamGrad" x1="0" x2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
              <stop offset="50%" stopColor="#7dd3fc" stopOpacity="1" />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Orbit ellipses */}
          {[{ rx: 18, ry: 11 }, { rx: 32, ry: 19 }, { rx: 44, ry: 26 }].map((r, i) => (
            <ellipse
              key={i}
              cx={50} cy={50} rx={r.rx} ry={r.ry}
              fill="none"
              stroke="#22d3ee"
              strokeOpacity={0.18 - i * 0.04}
              strokeWidth={0.12}
              strokeDasharray="0.6 0.5"
            />
          ))}

          {/* Core glow */}
          <circle cx={50} cy={50} r={14} fill="url(#coreGlow)" />

          {/* Intelligence streams */}
          {EDGES.map(([a, b], i) => {
            const pa = posOf(a), pb = posOf(b);
            const isActive = active === a || active === b;
            const op = isActive ? 0.9 : 0.18;
            return (
              <line
                key={i}
                x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
                stroke={isActive ? "url(#streamGrad)" : "#22d3ee"}
                strokeOpacity={op}
                strokeWidth={isActive ? 0.22 : 0.1}
                strokeDasharray="0.5 0.5"
                style={{
                  strokeDashoffset: -((t + i * 7) % 100) / 10,
                  transition: "stroke-opacity 220ms",
                }}
              />
            );
          })}
        </svg>

        {/* Holographic Core */}
        <HolographicCore t={t} />

        {/* Nodes */}
        {liveNodes.map((n) => {
          const p = posOf(n.id);
          const Icon = n.icon;
          const isActive = active === n.id;
          const isLinked = activeEdges.includes(n.id);
          const scale = 0.85 + p.depth * 0.4 + (isActive ? 0.25 : 0);
          const opacity = 0.55 + p.depth * 0.45;
          return (
            <button
              key={n.id}
              onClick={() => { setActive(n.id); }}
              onDoubleClick={() => navigate({ to: n.route })}
              onMouseEnter={() => setActive(n.id)}
              className="group absolute -translate-x-1/2 -translate-y-1/2 outline-none"
              style={{
                left: `${p.x}%`, top: `${p.y}%`,
                zIndex: 10 + Math.round(p.depth * 10) + (isActive ? 30 : 0),
                transform: `translate(-50%, -50%) scale(${scale})`,
                opacity,
                transition: "transform 300ms ease-out, opacity 300ms",
              }}
            >
              {/* Pulse ring */}
              <span
                className="absolute inset-0 -m-3 rounded-full"
                style={{
                  boxShadow: `0 0 ${isActive ? 48 : 24}px ${isActive ? n.tone : n.tone + "88"}`,
                  background: `radial-gradient(circle, ${n.tone}33 0%, transparent 70%)`,
                  animation: `twin-pulse ${4 + (n.angle % 3)}s ease-in-out infinite`,
                }}
              />
              <div
                className="relative flex items-center gap-2 rounded-2xl border bg-white/[0.06] px-2.5 py-1.5 backdrop-blur-xl"
                style={{
                  borderColor: isActive || isLinked ? n.tone : `${n.tone}55`,
                  boxShadow: `0 8px 32px -8px ${n.tone}99, inset 0 0 0 1px rgba(255,255,255,0.04)`,
                }}
              >
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-lg"
                  style={{ background: `${n.tone}22`, color: n.tone }}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="leading-tight">
                  <div className="text-[10px] font-bold tracking-wide text-white">
                    {ar ? n.label_ar : n.label_en}
                  </div>
                  <div className="text-[9px] font-semibold" style={{ color: n.tone }}>
                    {n.value} <span className="text-slate-400">{ar ? n.kpi_ar : n.kpi_en}</span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active node executive card */}
      {activeNode && (
        <div
          className="pointer-events-auto absolute bottom-4 start-4 z-30 w-[min(360px,calc(100%-2rem))] rounded-2xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur-2xl"
          style={{ boxShadow: `0 24px 64px -24px ${activeNode.tone}cc` }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{ background: `${activeNode.tone}22`, color: activeNode.tone }}
              >
                <activeNode.icon className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-400">
                  {ar ? "وحدة مؤسسية" : "Enterprise Module"}
                </div>
                <div className="text-sm font-bold text-white">
                  {ar ? activeNode.label_ar : activeNode.label_en}
                </div>
              </div>
            </div>
            <button onClick={() => setActive(null)} className="rounded-md p-1 text-slate-400 hover:bg-white/5 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Mini label={ar ? "الحالة" : "Status"} value={ar ? "صحي" : "Healthy"} tone="#34d399" />
            <Mini label={ar ? "الاتصالات" : "Links"} value={String(activeEdges.length)} tone="#22d3ee" />
            <Mini label={ar ? "القيمة" : "Metric"} value={activeNode.value} tone={activeNode.tone} />
          </div>
          <button
            onClick={() => navigate({ to: activeNode.route })}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-gradient-to-r from-cyan-500/20 to-violet-500/20 px-3 py-2 text-xs font-bold text-white transition hover:from-cyan-500/30 hover:to-violet-500/30"
          >
            {ar ? "افتح الوحدة" : "Open module"}
            <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
          </button>
        </div>
      )}

      {/* Predictions overlay */}
      {showPredictions && (
        <div className="pointer-events-auto absolute inset-x-3 bottom-24 z-30 mx-auto max-w-3xl">
          <div className="rounded-2xl border border-violet-400/20 bg-[#02030a]/90 backdrop-blur-xl">
            <PredictionsPanel compact />
          </div>
        </div>
      )}

      {/* Predictions toggle */}
      <button
        onClick={() => setShowPredictions((v) => !v)}
        className="absolute bottom-4 start-4 z-30 flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/15 px-3 py-2 text-[11px] font-semibold text-violet-200 backdrop-blur-xl hover:bg-violet-500/25"
        aria-label="Toggle predictions"
      >
        <Sparkles className="h-3.5 w-3.5" />
        {ar ? (showPredictions ? "إخفاء التنبؤات" : "التنبؤات") : (showPredictions ? "Hide predictions" : "Predictions")}
      </button>

      {/* ARIA dock */}
      <AriaDock open={ariaOpen} onToggle={() => setAriaOpen((v) => !v)} ar={ar} signals={signals} pulseHealth={pulse.health} pulseStatus={pulse.status} />

      {/* Keyframes */}
      <style>{`
        @keyframes twin-pulse {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.15); opacity: 1; }
        }
        @keyframes core-rotate {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to   { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes core-rotate-rev {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to   { transform: translate(-50%, -50%) rotate(-360deg); }
        }
        @keyframes core-breath {
          0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.08); }
        }
        @keyframes star-twinkle {
          0%, 100% { opacity: 0.2; } 50% { opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}

/* ────────── Sub-components ────────── */

function Mini({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] px-2 py-2">
      <div className="text-[8.5px] font-bold uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm font-bold" style={{ color: tone }}>{value}</div>
    </div>
  );
}

function HolographicCore({ t }: { t: number }) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2">
      {/* Outer breath */}
      <div
        className="absolute left-1/2 top-1/2 h-full w-full rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(34,211,238,0.35) 0%, rgba(124,58,237,0.18) 35%, transparent 70%)",
          animation: "core-breath 4s ease-in-out infinite",
        }}
      />
      {/* Rotating rings */}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute left-1/2 top-1/2 rounded-full border"
          style={{
            width: `${60 + i * 40}%`,
            height: `${60 + i * 40}%`,
            borderColor: i === 0 ? "rgba(34,211,238,0.6)" : i === 1 ? "rgba(167,139,250,0.45)" : "rgba(125,211,252,0.3)",
            borderStyle: "dashed",
            borderWidth: 1,
            animation: `${i % 2 === 0 ? "core-rotate" : "core-rotate-rev"} ${24 + i * 8}s linear infinite`,
          }}
        />
      ))}
      {/* Inner core */}
      <div
        className="absolute left-1/2 top-1/2 flex h-[110px] w-[110px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(125,211,252,0.95) 0%, rgba(34,211,238,0.55) 40%, rgba(124,58,237,0.25) 70%, transparent 100%)",
          boxShadow: "0 0 80px rgba(34,211,238,0.8), inset 0 0 40px rgba(255,255,255,0.3)",
          transform: `translate(-50%, -50%) scale(${1 + Math.sin(t / 20) * 0.04})`,
        }}
      >
        <div className="text-center leading-tight">
          <div className="text-[9px] font-bold tracking-[0.3em] text-cyan-50/90">NEXUS</div>
          <div className="text-[8px] font-semibold tracking-[0.25em] text-cyan-100/70">CORE</div>
        </div>
      </div>
    </div>
  );
}

function GridFloor({ t }: { t: number }) {
  const offset = (t * 0.4) % 40;
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 opacity-40"
      style={{
        background: `
          linear-gradient(to bottom, transparent 0%, rgba(34,211,238,0.04) 60%, rgba(34,211,238,0.12) 100%),
          repeating-linear-gradient(to right, rgba(34,211,238,0.18) 0 1px, transparent 1px 80px),
          repeating-linear-gradient(to bottom, rgba(34,211,238,0.18) 0 1px, transparent 1px 80px)
        `,
        backgroundPositionY: `0px, 0px, ${offset}px`,
        transform: "perspective(700px) rotateX(62deg) translateY(20%)",
        transformOrigin: "center top",
        maskImage: "linear-gradient(to bottom, transparent 0%, black 30%, black 80%, transparent 100%)",
      }}
    />
  );
}

function Starfield() {
  const stars = useMemo(
    () => Array.from({ length: 80 }).map((_, i) => ({
      x: Math.abs((Math.sin(i * 92.13) * 43758.5453) % 1) * 100,
      y: Math.abs((Math.cos(i * 17.7) * 43758.5453) % 1) * 100,
      r: i % 7 === 0 ? 1.4 : 0.6,
      d: (i % 7) * 0.6,
    })),
    [],
  );
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full">
      {stars.map((s, i) => (
        <circle
          key={i} cx={`${s.x}%`} cy={`${s.y}%`} r={s.r} fill="white"
          style={{ animation: `star-twinkle ${3 + (i % 5)}s ease-in-out ${s.d}s infinite` }}
        />
      ))}
    </svg>
  );
}

/* ────────── ARIA Copilot Dock ────────── */

function AriaDock({
  open,
  onToggle,
  ar,
  signals,
  pulseHealth,
  pulseStatus,
}: {
  open: boolean;
  onToggle: () => void;
  ar: boolean;
  signals: TwinSignals | undefined;
  pulseHealth: number;
  pulseStatus: string;
}) {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [voiceMode, setVoiceMode] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const spokenRef = useRef<Set<string>>(new Set());
  const sendRef = useRef<(t: string) => void>(() => {});

  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        fetch: async (url, init) => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          const headers = new Headers(init?.headers);
          if (token) headers.set("Authorization", `Bearer ${token}`);
          return fetch(url, { ...init, headers });
        },
      }),
  );
  const { messages, sendMessage, status } = useChat({ id: "aria-digital-twin", transport });
  const isLoading = status === "submitted" || status === "streaming";

  // Voice command routing — intercept navigation intents before sending to LLM
  const VOICE_ROUTES: Array<{ patterns: RegExp[]; to: string; speak_ar: string; speak_en: string }> = [
    { patterns: [/digital\s*twin|توأم|الكون/i], to: "/digital-twin", speak_ar: "جاري فتح التوأم الرقمي", speak_en: "Opening Digital Twin" },
    { patterns: [/risk|مخاطر/i], to: "/risk", speak_ar: "أعرض سجل المخاطر", speak_en: "Showing risk register" },
    { patterns: [/board\s*room|مجلس|قاعة الإدارة|board summary|ملخص.*مجلس/i], to: "/boardroom", speak_ar: "أفتح قاعة الإدارة", speak_en: "Opening boardroom" },
    { patterns: [/decision|قرار/i], to: "/decisions", speak_ar: "أعرض القرارات", speak_en: "Opening decisions" },
    { patterns: [/intelligence|ذكاء|signals|إشارات/i], to: "/intelligence", speak_ar: "أعرض الذكاء", speak_en: "Opening intelligence" },
    { patterns: [/forgotten|منس/i], to: "/forgotten", speak_ar: "البنود المنسية", speak_en: "Opening forgotten items" },
    { patterns: [/cockpit|قمرة/i], to: "/cockpit", speak_ar: "قمرة القيادة", speak_en: "Opening cockpit" },
    { patterns: [/fabric|نسيج/i], to: "/fabric", speak_ar: "نسيج الذكاء", speak_en: "Opening intelligence fabric" },
    { patterns: [/memory|ذاكرة/i], to: "/memory", speak_ar: "ذاكرة المؤسسة", speak_en: "Opening memory" },
  ];

  const send = (text: string) => {
    const t = text.trim();
    if (!t || isLoading) return;
    // voice navigation intent
    const lower = t.toLowerCase();
    const hit = VOICE_ROUTES.find((r) => r.patterns.some((p) => p.test(lower)));
    if (hit && /^(open|show|go to|navigate|افتح|اعرض|انتقل|اذهب)/i.test(t)) {
      voice.speak(ar ? hit.speak_ar : hit.speak_en);
      navigate({ to: hit.to });
      setInput("");
      return;
    }
    const ctx = ar
      ? `سياق Nexus Digital Twin (مباشر): الصحة ${pulseHealth}%، الحالة ${pulseStatus}، الإدارات ${signals?.departments ?? "?"}، أحداث الذكاء ${signals?.events ?? "?"}، الوكلاء النشطون ${signals?.agents ?? "?"}، التكاملات ${signals?.integrations ?? "?"}، المهام ${signals?.automations ?? "?"}، الوثائق ${signals?.documents ?? "?"}، مخاطر حرجة ${signals?.criticalRisks ?? "?"}، قرارات مجلس معلَّقة ${signals?.boardActions ?? "?"}، إشارات مفتوحة ${signals?.intelligenceSignals ?? "?"}، سرعة التنفيذ ${signals?.executionVelocity ?? "?"}%. أجب باختصار تنفيذي.`
      : `Nexus Digital Twin context (live): health ${pulseHealth}%, status ${pulseStatus}, departments ${signals?.departments ?? "?"}, intelligence events ${signals?.events ?? "?"}, active agents ${signals?.agents ?? "?"}, integrations ${signals?.integrations ?? "?"}, tasks ${signals?.automations ?? "?"}, documents ${signals?.documents ?? "?"}, critical risks ${signals?.criticalRisks ?? "?"}, pending board actions ${signals?.boardActions ?? "?"}, open signals ${signals?.intelligenceSignals ?? "?"}, execution velocity ${signals?.executionVelocity ?? "?"}%. Answer with an executive-grade brief.`;
    sendMessage({ text: `${ctx}\n\n${t}` });
    setInput("");
  };
  sendRef.current = send;

  const voice = useAriaVoice({
    onFinal: (txt) => sendRef.current(txt),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  // auto-speak assistant final replies
  useEffect(() => {
    if (!autoSpeak || isLoading) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    if (spokenRef.current.has(last.id)) return;
    const text = last.parts
      .filter((p) => p.type === "text")
      .map((p) => (p as { text: string }).text)
      .join("")
      .trim();
    if (text.length < 4) return;
    spokenRef.current.add(last.id);
    voice.speak(text);
  }, [messages, isLoading, autoSpeak, voice]);

  const suggestions = ar
    ? ["لخص حالة المؤسسة الآن", "ما أكبر المخاطر الحرجة؟", "افتح التوأم الرقمي", "جهز ملخص قاعة الإدارة"]
    : ["Summarize enterprise state now", "Top critical risks?", "Open Digital Twin", "Prep board briefing"];

  return (
    <div className="absolute bottom-4 end-4 z-40">
      {open && (
        <div className="mb-3 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-2xl"
          style={{ boxShadow: "0 24px 64px -16px rgba(34,211,238,0.4)" }}>
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 text-white">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <div>
                <div className="text-[10px] font-bold tracking-[0.25em] text-cyan-300">ARIA</div>
                <div className="text-[10px] text-slate-400">
                  {voice.listening ? (ar ? "أستمع…" : "Listening…") : voice.speaking ? (ar ? "أتحدث…" : "Speaking…") : (ar ? "كوبايلوت تنفيذي" : "Executive Copilot")}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setAutoSpeak((v) => !v)}
                className={`rounded p-1 ${autoSpeak ? "text-cyan-300" : "text-slate-500"} hover:bg-white/5`}
                title={autoSpeak ? (ar ? "الصوت مفعَّل" : "Voice on") : (ar ? "الصوت مغلق" : "Voice off")}
              >
                {autoSpeak ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
              <button onClick={onToggle} className="rounded p-1 text-slate-400 hover:bg-white/5 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div ref={scrollRef} className="max-h-72 overflow-y-auto px-3 py-3 space-y-2">
            {messages.length === 0 && (
              <div className="rounded-xl border border-cyan-300/20 bg-cyan-400/5 px-3 py-2 text-xs text-slate-200">
                {ar
                  ? "أنا ARIA. تكلم أو اكتب — جرّب: «افتح التوأم الرقمي» أو «ما المخاطر الحرجة؟»"
                  : "I'm ARIA. Talk or type — try: 'Open Digital Twin' or 'What are critical risks?'"}
              </div>
            )}
            {messages.map((m) => {
              const text = m.parts
                .filter((p) => p.type === "text")
                .map((p) => (p as { text: string }).text)
                .join("");
              const isUser = m.role === "user";
              const display = isUser ? text.split("\n\n").slice(-1)[0] : text;
              return (
                <div key={m.id} className={isUser ? "text-end" : ""}>
                  <div className={`inline-block max-w-[90%] whitespace-pre-wrap rounded-xl px-3 py-2 text-xs leading-relaxed ${
                    isUser
                      ? "bg-gradient-to-br from-cyan-500 to-violet-500 text-white"
                      : "border border-cyan-300/20 bg-cyan-400/5 text-slate-100"
                  }`}>
                    {display || (isLoading ? "…" : "")}
                  </div>
                </div>
              );
            })}
            {voice.partial && (
              <div className="text-end">
                <div className="inline-block max-w-[90%] rounded-xl bg-cyan-500/30 px-3 py-2 text-xs italic text-white">
                  {voice.partial}
                </div>
              </div>
            )}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="inline-block rounded-xl border border-cyan-300/20 bg-cyan-400/5 px-3 py-2 text-xs text-cyan-200">…</div>
            )}
            {voice.error && (
              <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[10px] text-rose-200">
                {ar ? "خطأ صوتي: " : "Voice error: "}{voice.error}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 border-t border-white/10 px-3 py-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                disabled={isLoading}
                className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] text-slate-300 hover:border-cyan-300/30 hover:bg-cyan-400/10 hover:text-cyan-200 disabled:opacity-40"
              >
                {s}
              </button>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex items-center gap-2 border-t border-white/10 p-2">
            <button
              type="button"
              onPointerDown={() => { setVoiceMode(true); voice.startListening(); }}
              onPointerUp={() => { if (voiceMode) { voice.stopListening(); setVoiceMode(false); } }}
              onClick={() => { if (!voiceMode) voice.toggleListening(); }}
              className={`rounded-lg p-2 ${voice.listening ? "bg-rose-500/20 text-rose-300" : "text-slate-400 hover:bg-white/5 hover:text-cyan-300"}`}
              aria-label="mic"
              title={ar ? "اضغط للتحدث (ضغطة طويلة) أو اضغط لتشغيل/إيقاف" : "Hold to talk, click to toggle"}
            >
              {voice.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={ar ? "اسأل ARIA أو تكلم…" : "Ask ARIA or speak…"}
              className="flex-1 bg-transparent text-xs text-white placeholder:text-slate-500 outline-none"
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading || !input.trim()} className="rounded-lg bg-gradient-to-br from-cyan-500 to-violet-500 p-2 text-white disabled:opacity-40">
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}
      <button
        onClick={onToggle}
        className="group relative flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-gradient-to-br from-cyan-500/30 to-violet-500/30 backdrop-blur-xl transition hover:scale-105"
        style={{ boxShadow: "0 0 40px rgba(34,211,238,0.5), inset 0 0 20px rgba(255,255,255,0.1)" }}
        aria-label="ARIA"
      >
        <span className="absolute inset-0 rounded-full" style={{ animation: "twin-pulse 3s ease-in-out infinite", background: "radial-gradient(circle, rgba(34,211,238,0.3) 0%, transparent 70%)" }} />
        <Sparkles className="relative h-6 w-6 text-white" />
      </button>
    </div>
  );
}
