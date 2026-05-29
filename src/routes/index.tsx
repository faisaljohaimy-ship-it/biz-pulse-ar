import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { ensureDemoUser, DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo.functions";
import { toast } from "sonner";
import {
  Activity,
  Brain,
  Cpu,
  Globe2,
  Lock,
  Network,
  Rocket,
  ShieldCheck,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: LaunchExperience,
});

function LaunchExperience() {
  const { user, loading } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard", replace: true });
  }, [user, loading, navigate]);

  // Global ⌘K / Ctrl+K / "/" opens the command auth window
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (loading || user) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const isAr = locale === "ar";

  return (
    <div className="relative min-h-[100svh] w-full overflow-hidden bg-[#04060d] text-foreground">
      <DigitalTwin3D />

      {/* === Top bar === */}
      <header className="relative z-20 flex items-center justify-between px-4 py-3 md:px-10 md:py-5">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <Sparkles className="h-4.5 w-4.5 text-primary-foreground" />
            <span className="absolute inset-0 animate-ping rounded-xl bg-primary/30" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold tracking-wide text-foreground">NEXUS</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">AI Operating System</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 sm:flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="text-[10px] font-medium uppercase tracking-widest text-emerald-300">
              {isAr ? "النظام مباشر" : "Systems Live"}
            </span>
          </div>
          <button
            onClick={() => setLocale(isAr ? "en" : "ar")}
            className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur hover:text-foreground"
          >
            {t("lang.toggle")}
          </button>
        </div>
      </header>

      {/* === Hero === */}
      <main className="nexus-launch-main relative z-10 mx-auto flex max-w-7xl flex-col items-center px-4 pt-2 pb-16 md:px-10 md:pt-10 md:pb-24">
        <div className="mb-4 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 backdrop-blur">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            {isAr ? "منصة تنفيذية معتمدة" : "Fortune 500 Executive Platform"}
          </span>
        </div>

        <h1 className="max-w-4xl text-center text-3xl font-bold leading-[1.05] tracking-tight sm:text-4xl md:text-6xl lg:text-7xl">
          <span className="text-gradient">
            {isAr ? "نظام التشغيل التنفيذي" : "The Executive Operating"}
          </span>
          <br />
          <span className="text-foreground">
            {isAr ? "للذكاء المؤسسي" : "System for the Enterprise"}
          </span>
        </h1>

        <p className="mt-4 max-w-2xl text-center text-xs leading-relaxed text-muted-foreground sm:text-sm md:text-base">
          {isAr
            ? "ذاكرة المؤسسة، محرك التنفيذ، وذكاء القرار — في توأم رقمي حي يعمل على مدار الساعة."
            : "Organizational memory, execution engine, and decision intelligence — unified in a live digital twin that never sleeps."}
        </p>

        {/* CTA */}
        <div className="mt-6 flex flex-col items-center gap-2.5 md:mt-9">
          <button
            onClick={() => setOpen(true)}
            className="group relative overflow-hidden rounded-2xl border border-primary/50 bg-gradient-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:scale-[1.02] md:px-8 md:py-4"
          >
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            <span className="relative flex items-center gap-2.5">
              <Terminal className="h-4 w-4" />
              {isAr ? "افتح نافذة الأوامر" : "Open Command Console"}
              <kbd className="hidden rounded border border-white/30 bg-white/10 px-1.5 py-0.5 text-[10px] font-mono sm:inline">⌘K</kbd>
            </span>
          </button>
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
            <Lock className="h-3 w-3" />
            {isAr ? "تشفير من الطرف إلى الطرف · تحقق متعدد العوامل" : "End-to-end encrypted · Multi-factor verified"}
          </div>
        </div>

        <EnterpriseStatusPanel
          isAr={isAr}
          onAction={() => navigate({ to: "/transformation" })}
          onEnter={() => setOpen(true)}
        />
        <AIDetectionPanel isAr={isAr} navigate={navigate} />
        <LiveMetricsStrip isAr={isAr} />
        <PillarsGrid isAr={isAr} />
      </main>

      <CommandAuthConsole open={open} onOpenChange={setOpen} />
    </div>
  );
}

/* ============================================================
   3D Digital Twin Scene
   - Real CSS 3D perspective (rotating globe wireframe)
   - Mouse parallax on desktop, gyro-free passive rotation on mobile
   - Works in portrait AND landscape on phones
   ============================================================ */
function DigitalTwin3D() {
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({ x: -18, y: 22 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const nx = (e.clientX / w - 0.5) * 2; // -1..1
      const ny = (e.clientY / h - 0.5) * 2;
      setTilt({ x: -18 + ny * 8, y: 22 + nx * 14 });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // Latitude rings (horizontal slices of the globe)
  const latitudes = useMemo(() => [-60, -40, -20, 0, 20, 40, 60], []);
  // Longitude rings (vertical slices)
  const longitudes = useMemo(() => [0, 30, 60, 90, 120, 150], []);

  return (
    <div ref={sceneRef} className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Radial atmospheric base */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(var(--primary)/0.22),_transparent_55%),radial-gradient(ellipse_at_bottom,_hsl(220_70%_40%/0.18),_transparent_60%)]" />

      {/* Animated panning grid floor */}
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--primary)/0.5) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)/0.5) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          animation: "nexus-grid-pan 24s linear infinite",
        }}
      />

      {/* === True 3D wireframe globe === */}
      <div
        className="absolute left-1/2 top-1/2 h-[78vmin] w-[78vmin] -translate-x-1/2 -translate-y-1/2"
        style={{ perspective: "1400px", perspectiveOrigin: "50% 50%" }}
      >
        <div
          className="relative h-full w-full nexus-globe-spin"
          style={{
            transformStyle: "preserve-3d",
            transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            transition: "transform 600ms cubic-bezier(.22,.61,.36,1)",
          }}
        >
          {/* Inner spinning shell */}
          <div
            className="absolute inset-0 nexus-globe-inner"
            style={{ transformStyle: "preserve-3d" }}
          >
            {/* Core glow */}
            <div
              className="absolute left-1/2 top-1/2 h-[34%] w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                background:
                  "radial-gradient(circle, hsl(var(--primary)/0.65) 0%, hsl(var(--primary)/0.25) 35%, transparent 70%)",
                filter: "blur(8px)",
                transform: "translate(-50%, -50%) translateZ(0)",
              }}
            />

            {/* Latitudes */}
            {latitudes.map((lat) => {
              const scale = Math.cos((lat * Math.PI) / 180);
              const ty = Math.sin((lat * Math.PI) / 180) * 50;
              return (
                <div
                  key={`lat${lat}`}
                  className="absolute left-1/2 top-1/2 rounded-full border"
                  style={{
                    width: `${scale * 100}%`,
                    height: `${scale * 100}%`,
                    transform: `translate(-50%, -50%) translateY(${ty}%) rotateX(90deg)`,
                    borderColor: "hsl(var(--primary) / 0.35)",
                    boxShadow: lat === 0 ? "0 0 24px hsl(var(--primary)/0.45)" : undefined,
                  }}
                />
              );
            })}

            {/* Longitudes */}
            {longitudes.map((lng) => (
              <div
                key={`lng${lng}`}
                className="absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 rounded-full border"
                style={{
                  transform: `translate(-50%, -50%) rotateY(${lng}deg)`,
                  borderColor: "hsl(var(--chart-5) / 0.28)",
                }}
              />
            ))}

            {/* Data nodes on the surface */}
            {Array.from({ length: 22 }).map((_, i) => {
              const theta = (i * 137.5) * (Math.PI / 180);
              const phi = Math.acos(1 - (2 * (i + 0.5)) / 22);
              const r = 50;
              const x = r * Math.sin(phi) * Math.cos(theta);
              const y = r * Math.sin(phi) * Math.sin(theta);
              const z = r * Math.cos(phi);
              return (
                <div
                  key={i}
                  className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    transform: `translate3d(${x}%, ${y}%, ${z}px)`,
                    background:
                      i % 3 === 0
                        ? "hsl(var(--accent))"
                        : i % 3 === 1
                        ? "hsl(var(--primary))"
                        : "hsl(var(--chart-5))",
                    boxShadow: "0 0 12px currentColor",
                    color:
                      i % 3 === 0
                        ? "hsl(var(--accent))"
                        : i % 3 === 1
                        ? "hsl(var(--primary))"
                        : "hsl(var(--chart-5))",
                    opacity: 0.9,
                  }}
                />
              );
            })}
          </div>

          {/* Outer orbital ring (counter-rotating) */}
          <div
            className="absolute -inset-[12%] rounded-full border nexus-orbit-ring"
            style={{
              borderColor: "hsl(var(--primary)/0.35)",
              transform: "rotateX(75deg)",
              boxShadow: "0 0 40px hsl(var(--primary)/0.25) inset",
            }}
          />
          <div
            className="absolute -inset-[22%] rounded-full border nexus-orbit-ring-rev"
            style={{
              borderColor: "hsl(var(--chart-5)/0.25)",
              transform: "rotateX(60deg) rotateZ(20deg)",
            }}
          />
        </div>
      </div>

      {/* Scanline + vignette */}
      <div className="absolute inset-0 scanlines opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#04060d]" />
    </div>
  );
}

/* ============================================================
   Live metrics strip
   ============================================================ */
function LiveMetricsStrip({ isAr }: { isAr: boolean }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 2400);
    return () => clearInterval(id);
  }, []);

  const metrics = [
    { label: isAr ? "صحة المؤسسة" : "Enterprise Health", value: `${(96 + Math.sin(tick / 3) * 1.4).toFixed(1)}%`, icon: Activity, tone: "text-emerald-400" },
    { label: isAr ? "وكلاء نشطون" : "Active Agents", value: `${248 + (tick % 7)}`, icon: Brain, tone: "text-primary" },
    { label: isAr ? "قرارات/ساعة" : "Decisions/hr", value: `${(12.4 + Math.cos(tick / 4) * 0.6).toFixed(1)}K`, icon: Zap, tone: "text-amber-400" },
    { label: isAr ? "تكامل مباشر" : "Live Integrations", value: `${84 + (tick % 3)}`, icon: Network, tone: "text-chart-5" },
  ];

  return (
    <div className="mt-8 grid w-full max-w-4xl grid-cols-2 gap-2.5 sm:gap-3 md:mt-12 md:grid-cols-4">
      {metrics.map((m) => (
        <div key={m.label} className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-xl transition hover:border-primary/40 hover:bg-white/[0.06] md:p-4">
          <div className="flex items-center justify-between">
            <m.icon className={`h-4 w-4 ${m.tone}`} />
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground">{isAr ? "مباشر" : "Live"}</span>
          </div>
          <div className="mt-1.5 text-xl font-bold tabular-nums text-foreground md:text-2xl">{m.value}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{m.label}</div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent opacity-0 transition group-hover:opacity-100" />
        </div>
      ))}
    </div>
  );
}

function PillarsGrid({ isAr }: { isAr: boolean }) {
  const pillars = [
    { icon: Brain, title: isAr ? "ذاكرة المؤسسة" : "Organizational Memory", desc: isAr ? "لا يُنسى قرار. لا يضيع التزام." : "No decision forgotten. No commitment lost." },
    { icon: Cpu, title: isAr ? "محرك التنفيذ" : "Execution Engine", desc: isAr ? "من قرار تنفيذي إلى مهمة مكتملة." : "From boardroom decision to completed task." },
    { icon: Globe2, title: isAr ? "ذكاء القرار" : "Decision Intelligence", desc: isAr ? "اعرف لماذا، وماذا بعد، وما المخاطر." : "Know the why, the next, and the risk." },
  ];
  return (
    <div className="mt-6 grid w-full max-w-4xl gap-2.5 sm:gap-3 md:mt-10 md:grid-cols-3">
      {pillars.map((p) => (
        <div key={p.title} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl transition hover:border-primary/40 md:p-5">
          <p.icon className="h-5 w-5 text-primary" />
          <div className="mt-2.5 text-sm font-semibold text-foreground">{p.title}</div>
          <div className="mt-1 text-xs text-muted-foreground">{p.desc}</div>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   Enterprise Status Panel — live executive snapshot
   ============================================================ */
function EnterpriseStatusPanel({
  isAr,
  onAction,
  onEnter,
}: {
  isAr: boolean;
  onAction: () => void;
  onEnter: () => void;
}) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 3000);
    return () => clearInterval(id);
  }, []);

  const health = Math.max(94, Math.min(98, 96 + Math.sin(tick / 4) * 1.2));
  const risks = 2;
  const opps = 7;
  const decisions = 14 + (tick % 3);

  const stats = [
    {
      key: "health",
      label: isAr ? "صحة المؤسسة" : "Enterprise Health",
      value: `${health.toFixed(0)}%`,
      tone: "emerald" as const,
      icon: Activity,
    },
    {
      key: "risk",
      label: isAr ? "مخاطر حرجة" : "Critical Risks",
      value: String(risks),
      tone: "rose" as const,
      icon: ShieldCheck,
    },
    {
      key: "opps",
      label: isAr ? "فرص استراتيجية" : "Strategic Opportunities",
      value: String(opps),
      tone: "violet" as const,
      icon: Sparkles,
    },
    {
      key: "dec",
      label: isAr ? "قرارات بانتظار الاعتماد" : "Decisions Waiting",
      value: String(decisions),
      tone: "amber" as const,
      icon: Zap,
    },
  ];

  const toneRing: Record<string, string> = {
    emerald: "border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-300",
    rose: "border-rose-500/30 bg-rose-500/[0.06] text-rose-300",
    violet: "border-violet-500/30 bg-violet-500/[0.06] text-violet-300",
    amber: "border-amber-500/30 bg-amber-500/[0.06] text-amber-300",
  };

  return (
    <section
      aria-label={isAr ? "حالة المؤسسة" : "Enterprise Status"}
      className="mt-7 w-full max-w-4xl rounded-2xl border border-white/10 bg-white/[0.035] p-3 backdrop-blur-xl md:mt-10 md:p-5"
    >
      <header className="flex items-center justify-between gap-2 px-1 pb-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {isAr ? "حالة المؤسسة · مباشر" : "Enterprise Status · Live"}
          </span>
        </div>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {isAr ? "محدّث الآن" : "updated now"}
        </span>
      </header>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        {stats.map((s) => (
          <div
            key={s.key}
            className={`rounded-xl border p-3 transition hover:scale-[1.01] md:p-4 ${toneRing[s.tone]}`}
          >
            <div className="flex items-center justify-between">
              <s.icon className="h-3.5 w-3.5 opacity-90" />
              <span className="text-[9px] uppercase tracking-widest opacity-70">
                {isAr ? "مباشر" : "Live"}
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums text-foreground md:text-3xl">
              {s.value}
            </div>
            <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-col items-stretch gap-2.5 rounded-xl border border-primary/25 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-3 md:flex-row md:items-center md:justify-between md:p-4">
        <div className="flex items-start gap-2.5">
          <Rocket className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="leading-tight">
            <div className="text-[9px] font-semibold uppercase tracking-[0.22em] text-primary/80">
              {isAr ? "إجراء تنفيذي موصى به" : "Recommended Executive Action"}
            </div>
            <div className="mt-1 text-sm font-semibold text-foreground md:text-base">
              {isAr ? "مراجعة برنامج التحول" : "Review Transformation Program"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onEnter}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-muted-foreground transition hover:text-foreground"
          >
            {isAr ? "تسجيل الدخول" : "Sign in"}
          </button>
          <button
            onClick={onAction}
            className="group inline-flex items-center gap-1.5 rounded-lg bg-gradient-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-glow transition hover:scale-[1.02]"
          >
            {isAr ? "افتح البرنامج" : "Open Program"}
            <Rocket className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   AI Detection Panel — proactive signals from ARIA
   ============================================================ */
function AIDetectionPanel({
  isAr,
  navigate,
}: {
  isAr: boolean;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPulse((n) => (n + 1) % 4), 1800);
    return () => clearInterval(id);
  }, []);

  const signals = [
    {
      key: "delayed",
      count: 3,
      label_ar: "مبادرات متأخرة",
      label_en: "Delayed initiatives",
      tone: "amber",
      icon: Activity,
      route: "/execution" as const,
    },
    {
      key: "decisions",
      count: 2,
      label_ar: "قرارات مجلس معلّقة",
      label_en: "Unresolved board decisions",
      tone: "violet",
      icon: Brain,
      route: "/decisions" as const,
    },
    {
      key: "risk",
      count: 1,
      label_ar: "خطر تشغيلي يتصاعد",
      label_en: "Operational risk rising",
      tone: "rose",
      icon: ShieldCheck,
      route: "/risk" as const,
    },
    {
      key: "opps",
      count: 4,
      label_ar: "فرص استراتيجية مكتشفة",
      label_en: "Strategic opportunities identified",
      tone: "emerald",
      icon: Sparkles,
      route: "/intelligence" as const,
    },
  ] as const;

  const toneMap: Record<string, { ring: string; chip: string; dot: string }> = {
    amber: { ring: "border-amber-500/30 hover:border-amber-400/60", chip: "text-amber-300 bg-amber-500/10", dot: "bg-amber-400" },
    violet: { ring: "border-violet-500/30 hover:border-violet-400/60", chip: "text-violet-300 bg-violet-500/10", dot: "bg-violet-400" },
    rose: { ring: "border-rose-500/30 hover:border-rose-400/60", chip: "text-rose-300 bg-rose-500/10", dot: "bg-rose-400" },
    emerald: { ring: "border-emerald-500/30 hover:border-emerald-400/60", chip: "text-emerald-300 bg-emerald-500/10", dot: "bg-emerald-400" },
  };

  return (
    <section
      aria-label={isAr ? "اكتشافات الذكاء الاصطناعي" : "AI Detections"}
      className="mt-4 w-full max-w-4xl rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.08] via-white/[0.02] to-transparent p-3 backdrop-blur-xl md:p-5"
    >
      <header className="flex items-center justify-between gap-2 px-1 pb-3">
        <div className="flex items-center gap-2">
          <div className="relative flex h-5 w-5 items-center justify-center rounded-md bg-primary/20">
            <Brain className="h-3 w-3 text-primary" />
            <span className="absolute inset-0 animate-ping rounded-md bg-primary/30" />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/90">
            {isAr ? "ARIA · رصد استباقي" : "ARIA · Proactive Detection"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`h-1 w-1 rounded-full transition ${pulse === i ? "bg-primary" : "bg-primary/20"}`}
            />
          ))}
        </div>
      </header>

      <ul className="grid gap-2 md:grid-cols-2">
        {signals.map((s) => {
          const tone = toneMap[s.tone];
          return (
            <li key={s.key}>
              <button
                onClick={() => navigate({ to: s.route })}
                className={`group flex w-full items-center gap-3 rounded-xl border bg-white/[0.03] p-3 text-left transition hover:bg-white/[0.06] ${tone.ring}`}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone.chip}`}>
                  <s.icon className="h-4 w-4" />
                </span>
                <span className="flex-1 leading-tight">
                  <span className="flex items-baseline gap-2">
                    <span className="text-xl font-bold tabular-nums text-foreground">{s.count}</span>
                    <span className="text-xs text-foreground/90">
                      {isAr ? s.label_ar : s.label_en}
                    </span>
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                    <span className={`h-1.5 w-1.5 rounded-full ${tone.dot} animate-pulse`} />
                    {isAr ? "اكتشف بواسطة AI" : "AI detected"}
                  </span>
                </span>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground opacity-0 transition group-hover:opacity-100">
                  {isAr ? "افتح ←" : "Open →"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}


/* ============================================================
   Command Auth Console — terminal-style login
   ============================================================ */
type Line = { kind: "in" | "out" | "err" | "sys"; text: string };

function CommandAuthConsole({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { locale } = useI18n();
  const isAr = locale === "ar";
  const navigate = useNavigate();
  const ensure = useServerFn(ensureDemoUser);

  const initial = useMemo<Line[]>(
    () => [
      { kind: "sys", text: "NEXUS Command Console v4.2.1 — secure shell established" },
      { kind: "sys", text: isAr ? "اكتب  help  لعرض الأوامر المتاحة." : "Type  help  to list available commands." },
    ],
    [isAr],
  );

  const [lines, setLines] = useState<Line[]>(initial);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<null | { kind: "signin" | "signup"; step: "email" | "password" | "name"; data: { email?: string; password?: string; name?: string } }>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      setLines(initial);
      setMode(null);
      setInput("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, initial]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [lines]);

  const push = (l: Line | Line[]) => setLines((prev) => [...prev, ...(Array.isArray(l) ? l : [l])]);

  const help = () => [
    { kind: "out" as const, text: "  login            → " + (isAr ? "تسجيل الدخول التفاعلي" : "interactive sign-in") },
    { kind: "out" as const, text: "  signup           → " + (isAr ? "إنشاء حساب تنفيذي" : "create executive account") },
    { kind: "out" as const, text: "  auth --demo      → " + (isAr ? "دخول فوري كحساب تجريبي" : "instant demo executive access") },
    { kind: "out" as const, text: "  lang ar | en     → " + (isAr ? "تبديل اللغة" : "toggle language") },
    { kind: "out" as const, text: "  status           → " + (isAr ? "حالة النظام" : "system status") },
    { kind: "out" as const, text: "  clear            → " + (isAr ? "مسح الشاشة" : "clear screen") },
    { kind: "out" as const, text: "  exit             → " + (isAr ? "إغلاق وحدة التحكم" : "close console") },
  ];

  const runDemo = async () => {
    setBusy(true);
    push({ kind: "sys", text: isAr ? "→ تجهيز جلسة تنفيذية..." : "→ provisioning executive session..." });
    try {
      await ensure();
      const { error } = await supabase.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
      if (error) throw error;
      push({ kind: "out", text: "✓ " + (isAr ? "تم منح الوصول. تحويل إلى مركز القيادة..." : "access granted. redirecting to command center...") });
      toast.success(isAr ? "مرحباً في مركز القيادة" : "Welcome to the Command Center");
      setTimeout(() => navigate({ to: "/dashboard", replace: true }), 600);
    } catch (e) {
      push({ kind: "err", text: "✗ " + (e instanceof Error ? e.message : "auth failure") });
    } finally {
      setBusy(false);
    }
  };

  const runSignIn = async (email: string, password: string) => {
    setBusy(true);
    push({ kind: "sys", text: isAr ? "→ مصادقة الهوية..." : "→ verifying identity..." });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      push({ kind: "err", text: "✗ " + error.message });
      setMode(null);
    } else {
      push({ kind: "out", text: "✓ " + (isAr ? "تم الدخول. تحويل..." : "authenticated. redirecting...") });
      setTimeout(() => navigate({ to: "/dashboard", replace: true }), 500);
    }
  };

  const runSignUp = async (name: string, email: string, password: string) => {
    setBusy(true);
    push({ kind: "sys", text: isAr ? "→ إنشاء حساب تنفيذي..." : "→ creating executive account..." });
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });
    setBusy(false);
    if (error) push({ kind: "err", text: "✗ " + error.message });
    else push({ kind: "out", text: "✓ " + (isAr ? "تم إنشاء الحساب. تحقق من بريدك." : "account created. check your inbox.") });
    setMode(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = input.trim();
    if (!raw || busy) return;

    // If we're inside an interactive flow
    if (mode) {
      const masked = mode.step === "password" ? "•".repeat(raw.length) : raw;
      push({ kind: "in", text: masked });
      setInput("");

      if (mode.kind === "signin") {
        if (mode.step === "email") {
          setMode({ kind: "signin", step: "password", data: { email: raw } });
          push({ kind: "sys", text: isAr ? "كلمة المرور:" : "password:" });
        } else if (mode.step === "password") {
          await runSignIn(mode.data.email!, raw);
        }
      } else {
        if (mode.step === "name") {
          setMode({ kind: "signup", step: "email", data: { name: raw } });
          push({ kind: "sys", text: isAr ? "البريد الإلكتروني:" : "email:" });
        } else if (mode.step === "email") {
          setMode({ kind: "signup", step: "password", data: { ...mode.data, email: raw } });
          push({ kind: "sys", text: isAr ? "كلمة المرور (6+):" : "password (6+):" });
        } else if (mode.step === "password") {
          await runSignUp(mode.data.name!, mode.data.email!, raw);
        }
      }
      return;
    }

    push({ kind: "in", text: raw });
    setInput("");
    const [cmd, ...args] = raw.toLowerCase().split(/\s+/);

    switch (cmd) {
      case "help":
      case "?":
        push(help());
        break;
      case "clear":
      case "cls":
        setLines(initial);
        break;
      case "exit":
      case "quit":
        onOpenChange(false);
        break;
      case "status":
        push([
          { kind: "out", text: "  systems       : ONLINE" },
          { kind: "out", text: "  agents        : 248 active" },
          { kind: "out", text: "  uptime        : 99.98%" },
          { kind: "out", text: "  region        : me-central-1" },
        ]);
        break;
      case "lang":
        push({ kind: "out", text: "→ use the top-bar toggle to switch language" });
        break;
      case "auth":
        if (args.includes("--demo")) await runDemo();
        else push({ kind: "err", text: isAr ? "استخدم: auth --demo" : "usage: auth --demo" });
        break;
      case "demo":
        await runDemo();
        break;
      case "login":
      case "signin":
        setMode({ kind: "signin", step: "email", data: {} });
        push({ kind: "sys", text: isAr ? "البريد الإلكتروني:" : "email:" });
        break;
      case "signup":
      case "register":
        setMode({ kind: "signup", step: "name", data: {} });
        push({ kind: "sys", text: isAr ? "الاسم الكامل:" : "full name:" });
        break;
      default:
        push({ kind: "err", text: `command not found: ${cmd}  —  type 'help'` });
    }
  };

  const prompt = mode
    ? mode.step === "password"
      ? "password ›"
      : mode.step === "email"
      ? "email ›"
      : "name ›"
    : "nexus ›";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-primary/30 bg-[#05070f]/95 p-0 backdrop-blur-2xl shadow-glow" dir="ltr">
        <div className="absolute inset-0 -z-10 rounded-lg bg-gradient-to-br from-primary/15 via-transparent to-chart-5/15" />

        {/* Title bar */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
          <DialogTitle className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-primary">
            <Terminal className="h-3.5 w-3.5" />
            nexus@command-console:~
          </DialogTitle>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
          </div>
        </div>
        <DialogDescription className="sr-only">Executive command console authentication</DialogDescription>

        {/* Output */}
        <div
          ref={scrollRef}
          className="scanlines max-h-[55vh] min-h-[280px] overflow-y-auto px-4 py-3 font-mono text-[12px] leading-relaxed sm:text-[13px]"
        >
          {lines.map((l, i) => (
            <div
              key={i}
              className={
                l.kind === "in"
                  ? "text-foreground"
                  : l.kind === "err"
                  ? "text-rose-400"
                  : l.kind === "sys"
                  ? "text-primary/90"
                  : "text-emerald-300"
              }
            >
              {l.kind === "in" ? <span className="text-primary">{prompt} </span> : null}
              <span className="whitespace-pre-wrap">{l.text}</span>
            </div>
          ))}
          {busy && (
            <div className="mt-1 flex items-center gap-2 text-muted-foreground">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border border-primary border-t-transparent" />
              <span>processing…</span>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-white/10 px-4 py-3">
          <span className="font-mono text-xs text-primary">{prompt}</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
            type={mode?.step === "password" ? "password" : "text"}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            inputMode={mode?.step === "email" ? "email" : "text"}
            className="flex-1 bg-transparent font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
            placeholder={mode ? "" : isAr ? "اكتب أمر... (help)" : "type a command... (help)"}
          />
          <span className="inline-block h-4 w-1.5 animate-pulse bg-primary" />
        </form>

        {/* Quick chips */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-white/10 px-4 py-2.5">
          {["auth --demo", "login", "signup", "status", "help"].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setInput(c);
                setTimeout(() => inputRef.current?.focus(), 0);
              }}
              className="rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              {c}
            </button>
          ))}
          <span className="ml-auto flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">
            <Rocket className="h-3 w-3" />
            secured · TLS 1.3
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
