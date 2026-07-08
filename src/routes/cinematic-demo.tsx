import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import {
  Activity,
  Brain,
  Cpu,
  Globe2,
  Network,
  ShieldCheck,
  Sparkles,
  Mic,
  Radio,
  TrendingUp,
  AlertTriangle,
  Play,
  Pause,
  SkipForward,
  Volume2,
  VolumeX,
  Rocket,
  Eye,
  Layers,
} from "lucide-react";

export const Route = createFileRoute("/cinematic-demo")({
  component: CinematicDemo,
  head: () => ({
    meta: [
      { title: "NEXUS AI OS — Cinematic Showcase" },
      {
        name: "description",
        content:
          "A Hollywood-grade cinematic walkthrough of NEXUS AI OS — 3D digital twin, ARIA voice, predictive intelligence, boardroom command.",
      },
      { property: "og:title", content: "NEXUS AI OS — Cinematic Showcase" },
      {
        property: "og:description",
        content:
          "Investor-ready cinematic experience: digital twin, live telemetry, ARIA voice, global network.",
      },
    ],
  }),
});

/* ---------------- Scenes ---------------- */
type Scene = {
  id: string;
  duration: number; // seconds
  titleAr: string;
  titleEn: string;
  subtitleAr: string;
  subtitleEn: string;
  kicker: string;
  Icon: typeof Activity;
  bg: string; // tailwind/CSS gradient
};

const SCENES: Scene[] = [
  {
    id: "ignition",
    duration: 14,
    titleAr: "نظام نكسس للذكاء التنفيذي",
    titleEn: "NEXUS AI Operating System",
    subtitleAr: "حيث تتحول البيانات إلى قرار، والقرار إلى مستقبل",
    subtitleEn: "Where data becomes decision, and decision becomes destiny.",
    kicker: "I. IGNITION",
    Icon: Rocket,
    bg: "radial-gradient(120% 80% at 50% 50%, oklch(0.32 0.12 265) 0%, oklch(0.08 0.04 260) 60%, #000 100%)",
  },
  {
    id: "twin",
    duration: 22,
    titleAr: "التوأم الرقمي للمؤسسة",
    titleEn: "The Enterprise Digital Twin",
    subtitleAr: "كل وحدة، كل تدفق، كل نبضة — في عالم ثلاثي الأبعاد حي",
    subtitleEn: "Every unit, every flow, every pulse — alive in a 3D world.",
    kicker: "II. DIGITAL TWIN",
    Icon: Layers,
    bg: "radial-gradient(120% 90% at 70% 30%, oklch(0.30 0.14 230) 0%, oklch(0.06 0.04 260) 70%, #000 100%)",
  },
  {
    id: "streams",
    duration: 22,
    titleAr: "تدفقات بيانات حية على مدار الساعة",
    titleEn: "Live Telemetry, 24/7",
    subtitleAr: "ملايين الإشارات تتقاطع في الوقت الفعلي",
    subtitleEn: "Millions of signals converging in real time.",
    kicker: "III. LIVE STREAMS",
    Icon: Activity,
    bg: "radial-gradient(120% 90% at 30% 70%, oklch(0.30 0.16 145) 0%, oklch(0.06 0.04 240) 70%, #000 100%)",
  },
  {
    id: "command",
    duration: 22,
    titleAr: "مركز القيادة التنفيذي",
    titleEn: "Executive Command Center",
    subtitleAr: "رؤية كاملة. قرار فوري. سيطرة مطلقة",
    subtitleEn: "Total visibility. Instant decision. Absolute control.",
    kicker: "IV. COMMAND",
    Icon: ShieldCheck,
    bg: "radial-gradient(120% 90% at 50% 50%, oklch(0.28 0.14 30) 0%, oklch(0.06 0.04 30) 70%, #000 100%)",
  },
  {
    id: "boardroom",
    duration: 20,
    titleAr: "ذكاء قاعة الاجتماعات",
    titleEn: "Boardroom Intelligence",
    subtitleAr: "ملخصات تنفيذية مولدة بالذكاء الاصطناعي خلال ثوانٍ",
    subtitleEn: "AI-generated executive briefings in seconds.",
    kicker: "V. BOARDROOM",
    Icon: Brain,
    bg: "radial-gradient(120% 90% at 30% 30%, oklch(0.28 0.12 305) 0%, oklch(0.06 0.04 280) 70%, #000 100%)",
  },
  {
    id: "predict",
    duration: 22,
    titleAr: "محرك التنبؤ الذكي",
    titleEn: "The Predictive Engine",
    subtitleAr: "نرى الأزمة قبل أن تولد، والفرصة قبل أن تنطق",
    subtitleEn: "We see the crisis before it's born, the opportunity before it speaks.",
    kicker: "VI. PREDICTION",
    Icon: TrendingUp,
    bg: "radial-gradient(120% 90% at 70% 70%, oklch(0.30 0.15 60) 0%, oklch(0.06 0.04 30) 70%, #000 100%)",
  },
  {
    id: "aria",
    duration: 20,
    titleAr: "آريا — مساعدتك الصوتية التنفيذية",
    titleEn: "ARIA — Your Executive Voice",
    subtitleAr: "تتحدث. تستمع. تنفذ",
    subtitleEn: "She speaks. She listens. She executes.",
    kicker: "VII. ARIA",
    Icon: Mic,
    bg: "radial-gradient(120% 90% at 50% 30%, oklch(0.30 0.16 195) 0%, oklch(0.06 0.04 240) 70%, #000 100%)",
  },
  {
    id: "global",
    duration: 22,
    titleAr: "شبكة عالمية. وعي موحد",
    titleEn: "One Global Network. One Consciousness.",
    subtitleAr: "من الرياض إلى نيويورك إلى طوكيو — في نبضة واحدة",
    subtitleEn: "From Riyadh to New York to Tokyo — in a single heartbeat.",
    kicker: "VIII. GLOBAL",
    Icon: Globe2,
    bg: "radial-gradient(120% 90% at 50% 50%, oklch(0.28 0.13 250) 0%, oklch(0.05 0.03 250) 70%, #000 100%)",
  },
  {
    id: "finale",
    duration: 16,
    titleAr: "نكسس. نظام تشغيل المؤسسة الذكية",
    titleEn: "NEXUS. The Operating System for the Intelligent Enterprise.",
    subtitleAr: "المستقبل لا يأتي إليك. أنت من يبنيه",
    subtitleEn: "The future doesn't come to you. You build it.",
    kicker: "FINALE",
    Icon: Sparkles,
    bg: "radial-gradient(140% 100% at 50% 50%, oklch(0.35 0.18 280) 0%, oklch(0.10 0.06 260) 50%, #000 100%)",
  },
];

const TOTAL = SCENES.reduce((a, s) => a + s.duration, 0);

function CinematicDemo() {
  const { locale, setLocale } = useI18n();
  const isAr = locale === "ar";
  const [t, setT] = useState(0); // seconds elapsed
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);
  // Audio/AudioContext removed site-wide. ARIA chat is the only voice.

  // RAF clock
  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastRef.current = null;
      return;
    }
    const tick = (now: number) => {
      if (lastRef.current == null) lastRef.current = now;
      const dt = (now - lastRef.current) / 1000;
      lastRef.current = now;
      setT((prev) => {
        const next = prev + dt;
        return next >= TOTAL ? 0 : next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing]);

  // current scene
  const { scene, sceneT, sceneIndex } = useMemo(() => {
    let acc = 0;
    for (let i = 0; i < SCENES.length; i++) {
      const s = SCENES[i];
      if (t < acc + s.duration) return { scene: s, sceneT: t - acc, sceneIndex: i };
      acc += s.duration;
    }
    const last = SCENES[SCENES.length - 1];
    return { scene: last, sceneT: last.duration, sceneIndex: SCENES.length - 1 };
  }, [t]);

  const skip = useCallback(() => {
    let acc = 0;
    for (let i = 0; i < SCENES.length; i++) {
      acc += SCENES[i].duration;
      if (t < acc) {
        setT(acc);
        return;
      }
    }
    setT(0);
  }, [t]);

  const pct = (t / TOTAL) * 100;
  const sceneProgress = Math.min(1, sceneT / scene.duration);

  // fade in/out per scene
  const fadeIn = Math.min(1, sceneT / 1.5);
  const fadeOut = Math.min(1, (scene.duration - sceneT) / 1.2);
  const opacity = Math.min(fadeIn, fadeOut);

  return (
    <div
      dir={isAr ? "rtl" : "ltr"}
      className="fixed inset-0 overflow-hidden bg-black text-white select-none"
      style={{
        fontFamily: isAr
          ? "var(--font-arabic, 'Tajawal', system-ui)"
          : "var(--font-display, 'Inter', system-ui)",
      }}
    >
      {/* Animated background */}
      <div
        className="absolute inset-0 transition-[background] duration-[1500ms] ease-in-out"
        style={{ background: scene.bg }}
      />

      {/* Cinematic ambient layers */}
      <StarField />
      <GridFloor t={t} />
      <ParticleSwarm t={t} sceneId={scene.id} />

      {/* Scene-specific stage */}
      <SceneStage scene={scene} sceneT={sceneT} isAr={isAr} />

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 50%, transparent 50%, rgba(0,0,0,0.85) 100%)",
        }}
      />

      {/* Cinematic letterbox */}
      <div className="absolute top-0 inset-x-0 h-[8vh] bg-black z-30" />
      <div className="absolute bottom-0 inset-x-0 h-[8vh] bg-black z-30" />

      {/* Titles */}
      <div
        className="absolute inset-0 z-20 flex flex-col items-center justify-center px-8 pointer-events-none"
        style={{ opacity }}
      >
        <div
          className="text-center max-w-5xl"
          style={{ transform: `translateY(${(1 - fadeIn) * 30}px) scale(${0.96 + fadeIn * 0.04})` }}
        >
          <div className="mb-4 text-[0.65rem] md:text-xs tracking-[0.6em] text-white/60 uppercase">
            {scene.kicker}
          </div>
          <h1
            className="text-3xl md:text-6xl lg:text-7xl font-light leading-[1.1] tracking-tight"
            style={{
              textShadow: "0 0 60px rgba(255,255,255,0.15)",
              background: "linear-gradient(180deg, #fff 0%, rgba(255,255,255,0.7) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {isAr ? scene.titleAr : scene.titleEn}
          </h1>
          <p className="mt-6 text-base md:text-2xl text-white/70 font-light max-w-3xl mx-auto leading-relaxed">
            {isAr ? scene.subtitleAr : scene.subtitleEn}
          </p>
        </div>
      </div>

      {/* Top HUD */}
      <div className="absolute top-[8vh] inset-x-0 z-40 flex items-center justify-between px-6 py-4 text-[10px] md:text-xs tracking-[0.3em] text-white/60 uppercase">
        <div className="flex items-center gap-3">
          <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span>REC · NEXUS AI OS · 4K</span>
        </div>
        <div className="hidden md:flex items-center gap-6">
          <span>{scene.kicker}</span>
          <span>
            {String(sceneIndex + 1).padStart(2, "0")} / {String(SCENES.length).padStart(2, "0")}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLocale(isAr ? "en" : "ar")}
            className="px-3 py-1 border border-white/20 hover:bg-white/10 transition"
          >
            {isAr ? "EN" : "ع"}
          </button>
          <Link to="/" className="px-3 py-1 border border-white/20 hover:bg-white/10 transition">
            {isAr ? "خروج" : "EXIT"}
          </Link>
        </div>
      </div>

      {/* Bottom controls + progress */}
      <div className="absolute bottom-[8vh] inset-x-0 z-40 px-6 py-4">
        <div className="flex items-center justify-between gap-4 mb-3 text-[10px] tracking-[0.3em] text-white/60 uppercase">
          <span>{fmt(t)}</span>
          <span className="hidden md:block">{isAr ? scene.titleAr : scene.titleEn}</span>
          <span>{fmt(TOTAL)}</span>
        </div>
        <div className="h-[2px] bg-white/15 relative overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-white/80 to-white"
            style={{ width: `${pct}%` }}
          />
          {/* scene segments */}
          <div className="absolute inset-0 flex">
            {SCENES.map((s) => (
              <div
                key={s.id}
                className="border-l border-black/60 first:border-l-0"
                style={{ width: `${(s.duration / TOTAL) * 100}%` }}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center justify-center gap-4 mt-4">
          <IconBtn onClick={() => setPlaying((p) => !p)} label={playing ? "Pause" : "Play"}>
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </IconBtn>
          <IconBtn onClick={skip} label="Next Scene">
            <SkipForward className="w-4 h-4" />
          </IconBtn>
          <IconBtn onClick={() => setMuted((m) => !m)} label={muted ? "Unmute" : "Mute"}>
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </IconBtn>
        </div>
      </div>

      {/* Scene transition flash */}
      <div
        className="absolute inset-0 z-50 pointer-events-none bg-white"
        style={{
          opacity: sceneProgress < 0.06 ? (0.06 - sceneProgress) * 8 : 0,
          transition: "opacity 80ms linear",
        }}
      />
    </div>
  );
}

/* ---------------- HUD bits ---------------- */
function IconBtn({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="w-10 h-10 rounded-full border border-white/20 hover:border-white/60 hover:bg-white/10 transition flex items-center justify-center text-white/80"
    >
      {children}
    </button>
  );
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

/* ---------------- Background layers ---------------- */
function StarField() {
  const stars = useMemo(
    () =>
      Array.from({ length: 140 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        s: Math.random() * 1.6 + 0.3,
        d: Math.random() * 4 + 2,
        delay: Math.random() * 4,
      })),
    [],
  );
  return (
    <div className="absolute inset-0 pointer-events-none">
      {stars.map((s) => (
        <span
          key={s.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.s,
            height: s.s,
            opacity: 0.4,
            animation: `twinkle ${s.d}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
      <style>{`@keyframes twinkle { 0%,100%{opacity:.2;transform:scale(1)} 50%{opacity:.9;transform:scale(1.4)} }`}</style>
    </div>
  );
}

function GridFloor({ t }: { t: number }) {
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ perspective: "800px" }}
    >
      <div
        className="absolute left-1/2 bottom-0 w-[200%] h-[60%] -translate-x-1/2"
        style={{
          transform: `rotateX(70deg) translateY(${(t * 30) % 80}px)`,
          transformOrigin: "center bottom",
          backgroundImage:
            "linear-gradient(rgba(120,180,255,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(120,180,255,0.25) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          maskImage:
            "linear-gradient(180deg, transparent 0%, black 30%, black 70%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(180deg, transparent 0%, black 30%, black 70%, transparent 100%)",
        }}
      />
    </div>
  );
}

function ParticleSwarm({ t, sceneId }: { t: number; sceneId: string }) {
  const count = 60;
  const dots = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        a: (i / count) * Math.PI * 2,
        r: 120 + (i % 7) * 30,
        s: 1 + (i % 4),
      })),
    [],
  );
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      <div className="relative" style={{ width: 1, height: 1, transform: `rotate(${t * 10}deg)` }}>
        {dots.map((d) => {
          const x = Math.cos(d.a + t * 0.3) * d.r;
          const y = Math.sin(d.a + t * 0.3) * d.r * 0.55;
          return (
            <span
              key={d.id}
              className="absolute rounded-full bg-white"
              style={{
                left: x,
                top: y,
                width: d.s,
                height: d.s,
                opacity: 0.5,
                boxShadow: "0 0 8px rgba(160,200,255,0.8)",
                filter: sceneId === "global" ? "hue-rotate(40deg)" : undefined,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Scene-specific stages ---------------- */
function SceneStage({ scene, sceneT, isAr }: { scene: Scene; sceneT: number; isAr: boolean }) {
  switch (scene.id) {
    case "ignition":
      return <IgnitionStage t={sceneT} />;
    case "twin":
      return <TwinStage t={sceneT} />;
    case "streams":
      return <StreamsStage t={sceneT} isAr={isAr} />;
    case "command":
      return <CommandStage t={sceneT} isAr={isAr} />;
    case "boardroom":
      return <BoardroomStage t={sceneT} isAr={isAr} />;
    case "predict":
      return <PredictStage t={sceneT} isAr={isAr} />;
    case "aria":
      return <AriaStage t={sceneT} />;
    case "global":
      return <GlobalStage t={sceneT} />;
    case "finale":
      return <FinaleStage t={sceneT} />;
    default:
      return null;
  }
}

function IgnitionStage({ t }: { t: number }) {
  const pulse = 0.4 + Math.sin(t * 2) * 0.15;
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="relative">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            width: 360,
            height: 360,
            left: -180,
            top: -180,
            background: "radial-gradient(circle, rgba(120,180,255,0.6), transparent 70%)",
            transform: `scale(${1 + pulse})`,
            filter: "blur(20px)",
          }}
        />
        <div
          className="w-[220px] h-[220px] -ml-[110px] -mt-[110px] rounded-full border border-white/40 absolute"
          style={{ transform: `rotate(${t * 30}deg)` }}
        />
        <div
          className="w-[160px] h-[160px] -ml-[80px] -mt-[80px] rounded-full border border-white/60 absolute"
          style={{ transform: `rotate(${-t * 45}deg)` }}
        />
        <div
          className="w-[90px] h-[90px] -ml-[45px] -mt-[45px] rounded-full bg-white/90 absolute"
          style={{ boxShadow: "0 0 80px 20px rgba(180,210,255,0.6)" }}
        />
      </div>
    </div>
  );
}

function TwinStage({ t }: { t: number }) {
  // wireframe rotating "building/sphere" twin
  const rot = t * 25;
  const layers = 6;
  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      style={{ perspective: "1000px" }}
    >
      <div
        style={{ transformStyle: "preserve-3d", transform: `rotateX(20deg) rotateY(${rot}deg)` }}
      >
        {Array.from({ length: layers }).map((_, i) => {
          const size = 80 + i * 40;
          return (
            <div
              key={i}
              className="absolute border border-cyan-300/40 rounded-md"
              style={{
                width: size,
                height: size,
                left: -size / 2,
                top: -size / 2,
                transform: `translateZ(${(i - layers / 2) * 30}px)`,
                boxShadow: "0 0 20px rgba(120,200,255,0.2)",
                background: "linear-gradient(135deg, rgba(120,200,255,0.06), transparent)",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function StreamsStage({ t, isAr }: { t: number; isAr: boolean }) {
  const bars = 28;
  return (
    <div
      className="absolute inset-0 pointer-events-none flex items-end justify-center gap-1 pb-[18vh]"
      style={{ opacity: 0.55 }}
    >
      {Array.from({ length: bars }).map((_, i) => {
        const h = 30 + Math.abs(Math.sin(t * 2 + i * 0.5)) * 200;
        return (
          <div
            key={i}
            className="w-2 rounded-t bg-gradient-to-t from-emerald-400/80 to-cyan-300/80"
            style={{ height: h, boxShadow: "0 0 10px rgba(120,255,200,0.4)" }}
          />
        );
      })}
      <div
        className={`absolute ${isAr ? "right-8" : "left-8"} top-1/3 text-[10px] tracking-[0.3em] text-emerald-300/70 uppercase`}
      >
        <Radio className="inline w-3 h-3 mr-2" /> 12,847,302 events/sec
      </div>
    </div>
  );
}

function CommandStage({ t, isAr }: { t: number; isAr: boolean }) {
  const kpis = [
    { label: isAr ? "الإيرادات" : "Revenue", v: "$487.2M", d: "+12.4%" },
    { label: isAr ? "العمليات" : "Operations", v: "99.97%", d: "OPTIMAL" },
    { label: isAr ? "المخاطر" : "Risk", v: "LOW", d: "-3.1%" },
    { label: isAr ? "الموظفون" : "Workforce", v: "48,219", d: "ACTIVE" },
  ];
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      <div
        className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl px-8"
        style={{ transform: `translateY(${Math.sin(t * 0.5) * 6}px)`, opacity: 0.85 }}
      >
        {kpis.map((k, i) => (
          <div
            key={k.label}
            className="border border-white/15 bg-white/[0.03] backdrop-blur-sm p-4 min-w-[150px]"
            style={{ animation: `riseIn 1.2s ease-out ${i * 0.2}s both` }}
          >
            <div className="text-[9px] tracking-[0.3em] uppercase text-white/50">{k.label}</div>
            <div className="text-2xl md:text-3xl mt-2 font-light">{k.v}</div>
            <div className="text-[10px] mt-1 text-emerald-300/80">{k.d}</div>
          </div>
        ))}
      </div>
      <style>{`@keyframes riseIn { from {opacity:0;transform:translateY(20px)} to {opacity:1;transform:translateY(0)} }`}</style>
    </div>
  );
}

function BoardroomStage({ t, isAr }: { t: number; isAr: boolean }) {
  const lines = isAr
    ? [
        "تحليل: الربع الثالث يفوق التوقعات بنسبة 14.2%",
        "توصية: تسريع التوسع في منطقة آسيا والمحيط الهادئ",
        "تنبيه: انخفاض كفاءة سلسلة التوريد في خط #7",
        "فرصة: استحواذ محتمل — قيمة تقديرية $1.2B",
      ]
    : [
        "Insight: Q3 outperforms forecast by 14.2%",
        "Recommendation: Accelerate APAC expansion",
        "Alert: Supply chain efficiency drop on Line #7",
        "Opportunity: M&A target identified — ~$1.2B value",
      ];
  const visible = Math.min(lines.length, Math.floor(t / 2));
  return (
    <div className="absolute inset-0 pointer-events-none flex items-end justify-center pb-[20vh]">
      <div className="max-w-2xl w-full px-8 space-y-2">
        {lines.slice(0, visible + 1).map((l, i) => (
          <div
            key={i}
            className="text-sm md:text-base text-white/80 border-l-2 border-purple-300 pl-3"
            style={{ animation: `slideIn 0.8s ease-out both` }}
          >
            <Brain className="inline w-3 h-3 mr-2 text-purple-300" />
            {l}
          </div>
        ))}
      </div>
      <style>{`@keyframes slideIn { from {opacity:0;transform:translateX(-20px)} to {opacity:1;transform:translateX(0)} }`}</style>
    </div>
  );
}

function PredictStage({ t, isAr }: { t: number; isAr: boolean }) {
  // animated forecast line
  const pts = Array.from({ length: 40 }, (_, i) => {
    const x = (i / 39) * 100;
    const y = 50 - Math.sin(i * 0.4 + t) * 18 - (i > 25 ? (i - 25) * 1.4 : 0);
    return `${x},${y}`;
  }).join(" ");
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      <svg viewBox="0 0 100 80" className="w-[80%] max-w-3xl opacity-70">
        <defs>
          <linearGradient id="pg" x1="0" x2="1">
            <stop offset="0" stopColor="#fbbf24" />
            <stop offset="1" stopColor="#f97316" />
          </linearGradient>
        </defs>
        <polyline points={pts} fill="none" stroke="url(#pg)" strokeWidth="0.6" />
        {Array.from({ length: 40 }).map((_, i) => {
          const [x, y] = pts.split(" ")[i].split(",");
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={i > 25 ? 0.6 : 0.3}
              fill="#fbbf24"
              opacity={i > 25 ? 0.9 : 0.4}
            />
          );
        })}
      </svg>
      <div className="absolute bottom-[22vh] left-1/2 -translate-x-1/2 text-[10px] tracking-[0.3em] uppercase text-amber-300/80 flex items-center gap-2">
        <AlertTriangle className="w-3 h-3" />{" "}
        {isAr ? "توقع: نمو +18.4% خلال 90 يوماً" : "Forecast: +18.4% growth in 90 days"}
      </div>
    </div>
  );
}

function AriaStage({ t }: { t: number }) {
  const rings = 5;
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      <div className="relative">
        {Array.from({ length: rings }).map((_, i) => {
          const phase = (t + i * 0.4) % 2;
          const scale = 1 + phase * 0.8;
          const opacity = Math.max(0, 1 - phase / 2);
          return (
            <div
              key={i}
              className="absolute rounded-full border border-cyan-300"
              style={{
                width: 200,
                height: 200,
                left: -100,
                top: -100,
                transform: `scale(${scale})`,
                opacity,
              }}
            />
          );
        })}
        <div
          className="w-[90px] h-[90px] -ml-[45px] -mt-[45px] rounded-full bg-gradient-to-br from-cyan-300 to-blue-500 flex items-center justify-center absolute"
          style={{ boxShadow: "0 0 60px rgba(100,200,255,0.7)" }}
        >
          <Mic className="w-8 h-8 text-white" />
        </div>
      </div>
      <div className="absolute bottom-[22vh] left-1/2 -translate-x-1/2 text-[10px] tracking-[0.4em] uppercase text-cyan-200/80 flex items-center gap-2">
        <Eye className="w-3 h-3" /> ARIA · LISTENING
      </div>
    </div>
  );
}

function GlobalStage({ t }: { t: number }) {
  const nodes = useMemo(
    () => [
      { x: 22, y: 38, label: "RUH" },
      { x: 30, y: 30, label: "LON" },
      { x: 14, y: 35, label: "NYC" },
      { x: 50, y: 28, label: "DXB" },
      { x: 72, y: 38, label: "TYO" },
      { x: 78, y: 55, label: "SYD" },
      { x: 35, y: 60, label: "SAO" },
      { x: 58, y: 45, label: "SIN" },
    ],
    [],
  );
  return (
    <div className="absolute inset-0 pointer-events-none">
      <svg viewBox="0 0 100 80" className="w-full h-full opacity-80">
        <defs>
          <radialGradient id="globe" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="rgba(80,160,255,0.15)" />
            <stop offset="1" stopColor="transparent" />
          </radialGradient>
        </defs>
        <ellipse cx="50" cy="40" rx="38" ry="22" fill="url(#globe)" />
        <ellipse
          cx="50"
          cy="40"
          rx="38"
          ry="22"
          fill="none"
          stroke="rgba(120,180,255,0.3)"
          strokeWidth="0.2"
        />
        {[10, 20, 30].map((r) => (
          <ellipse
            key={r}
            cx="50"
            cy="40"
            rx="38"
            ry={r * 0.7}
            fill="none"
            stroke="rgba(120,180,255,0.15)"
            strokeWidth="0.15"
          />
        ))}
        {nodes.map((n, i) =>
          nodes.slice(i + 1).map((m, j) => {
            const active = (Math.floor(t * 2) + i + j) % 3 === 0;
            return (
              <line
                key={`${i}-${j}`}
                x1={n.x}
                y1={n.y}
                x2={m.x}
                y2={m.y}
                stroke={active ? "rgba(150,220,255,0.7)" : "rgba(120,180,255,0.1)"}
                strokeWidth={active ? 0.25 : 0.1}
              />
            );
          }),
        )}
        {nodes.map((n, i) => (
          <g key={n.label}>
            <circle cx={n.x} cy={n.y} r={0.8 + Math.sin(t * 2 + i) * 0.3} fill="#7dd3fc">
              <animate
                attributeName="opacity"
                values="0.5;1;0.5"
                dur="2s"
                repeatCount="indefinite"
              />
            </circle>
            <text x={n.x + 1.5} y={n.y + 0.5} fontSize="1.6" fill="rgba(200,230,255,0.7)">
              {n.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function FinaleStage({ t }: { t: number }) {
  const explode = Math.min(1, t / 4);
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      {Array.from({ length: 30 }).map((_, i) => {
        const a = (i / 30) * Math.PI * 2;
        const r = explode * 400;
        return (
          <span
            key={i}
            className="absolute w-1 h-1 rounded-full bg-white"
            style={{
              left: "50%",
              top: "50%",
              transform: `translate(${Math.cos(a) * r}px, ${Math.sin(a) * r}px)`,
              boxShadow: "0 0 8px rgba(255,255,255,0.9)",
              opacity: 1 - explode,
            }}
          />
        );
      })}
      <div
        className="absolute"
        style={{
          width: 200,
          height: 200,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(180,160,255,0.8), transparent 70%)",
          filter: "blur(20px)",
          transform: `scale(${0.5 + explode * 1.5})`,
        }}
      />
    </div>
  );
}
