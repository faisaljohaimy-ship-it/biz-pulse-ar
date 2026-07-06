import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import * as React from "react";
import { z } from "zod";
import { AriaAudioBus } from "@/lib/aria/audio-bus";
import ariaMotionAsset from "@/assets/bridge-aria-motion.mp4.asset.json";
import narrationAsset from "@/assets/bridge-narration.mp3.asset.json";

export const Route = createFileRoute("/executive-bridge")({
  validateSearch: (s) => z.object({ p: z.coerce.number().int().min(0).max(6).optional() }).parse(s),
  head: () => ({
    meta: [
      { title: "جسر القيادة التنفيذي — نيكسيوس | Executive Command Bridge" },
      { name: "description", content: "تجربة سينمائية للقيادة التنفيذية بذكاء نيكسيوس فوق أفق الرياض." },
      { property: "og:title", content: "جسر القيادة التنفيذي — نيكسيوس" },
      { property: "og:description", content: "ذكاء تنفيذي موحّد فوق أفق الرياض." },
    ],
  }),
  component: ExecutiveBridgePage,
});

const NARRATION_SECONDS = 99;

/* ─────────── Content ─────────── */

interface Part {
  kicker: string;
  title: string;
  body: string;
  accent: "navy" | "emerald" | "gold";
  render?: () => React.ReactNode;
}

const PARTS: Part[] = [
  {
    kicker: "الجزء الأول",
    title: "افتتاح — الذكاء، تحت القيادة",
    body: "منصّة تنفيذية واحدة تضع الذكاء الاصطناعي في يد القيادة، وتوحّد القرار من الرؤية إلى التنفيذ.",
    accent: "navy",
  },
  {
    kicker: "الجزء الثاني",
    title: "ما هو نيكسيوس — التوحيد",
    body: "نظام تشغيل مؤسسي يوحّد البيانات والفِرق والقرارات في لوحة واحدة، ويربط كل جهة بمعيار واحد للحقيقة.",
    accent: "emerald",
  },
  {
    kicker: "الجزء الثالث",
    title: "الفوائد بالأرقام",
    body: "مؤشرات أثر تنفيذية — سرعة قرار أعلى، كلفة أقل، وإنتاجية مضاعفة.",
    accent: "gold",
    render: () => <CountersPanel />,
  },
  {
    kicker: "الجزء الرابع",
    title: "المميزات التقنية",
    body: "بنية سحابية آمنة، تكامل مفتوح، ذكاء عربي أصيل، حَوكمة كاملة للبيانات، وقابلية توسّع فورية.",
    accent: "navy",
    render: () => <FeatureGrid />,
  },
  {
    kicker: "الجزء الخامس",
    title: "آريا — العقل التنفيذي",
    body: "مساعد تنفيذي عربي يفهم السياق، ويقرأ المؤشرات، ويقترح القرار — بصوت واحد وذاكرة مؤسسية.",
    accent: "emerald",
    render: () => <AriaOrb />,
  },
  {
    kicker: "الجزء السادس",
    title: "رؤية ٢٠٣٠ — مشهد ذهبي",
    body: "شريك تقني وطني يخدم مستهدفات التحول الرقمي، ويرفع كفاءة القطاع الحكومي والخاص.",
    accent: "gold",
    render: () => <VisionGoldPanel />,
  },
  {
    kicker: "الجزء السابع",
    title: "الختام والدعوة",
    body: "اليوم يبدأ عصر القرار الذكي. انضمّ إلى القيادات التي تختار نيكسيوس.",
    accent: "navy",
    render: () => <ClosingCTA />,
  },
];



/* ─────────── Page ─────────── */

function ExecutiveBridgePage() {
  const search = useSearch({ from: "/executive-bridge" });
  const navigate = useNavigate({ from: "/executive-bridge" });
  const initial = Math.min(Math.max(search.p ?? 0, 0), PARTS.length - 1);
  const [idx, setIdx] = React.useState(initial);
  const [playing, setPlaying] = React.useState(false);
  const [started, setStarted] = React.useState(false);
  const [speaking, setSpeaking] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const reduced = usePrefersReducedMotion();
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const partSeconds = NARRATION_SECONDS / PARTS.length;

  // Deep link sync
  React.useEffect(() => {
    if (search.p !== idx) {
      navigate({ search: { p: idx }, replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  // Drive part index from narration currentTime while playing
  React.useEffect(() => {
    const a = audioRef.current;
    if (!a || !playing) return;
    const onTime = () => {
      const t = a.currentTime;
      const next = Math.min(PARTS.length - 1, Math.floor(t / partSeconds));
      setIdx((cur) => (cur === next ? cur : next));
      const withinPart = (t % partSeconds) / partSeconds;
      setProgress(withinPart);
    };
    const onEnd = () => {
      setPlaying(false);
      setSpeaking(false);
      setProgress(1);
    };
    const onPlay = () => setSpeaking(true);
    const onPause = () => setSpeaking(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnd);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
    };
  }, [playing, partSeconds]);

  const start = React.useCallback(async () => {
    if (started) return;
    // Ensure exclusive voice channel
    try { AriaAudioBus.unlock(); AriaAudioBus.stopAll(); } catch { /* noop */ }
    setStarted(true);
    const a = audioRef.current;
    const v = videoRef.current;
    if (v) { try { await v.play(); } catch { /* muted autoplay should work */ } }
    if (reduced) return;
    if (a) {
      try {
        a.currentTime = 0;
        await a.play();
        setPlaying(true);
      } catch { /* gesture required — user can tap play */ }
    }
  }, [started, reduced]);

  const pauseNarration = React.useCallback(() => {
    const a = audioRef.current;
    if (a && !a.paused) a.pause();
    setPlaying(false);
  }, []);

  const resumeNarration = React.useCallback(async () => {
    const a = audioRef.current;
    if (!a) return;
    try { await a.play(); setPlaying(true); } catch { /* noop */ }
  }, []);

  const goTo = React.useCallback((next: number) => {
    setIdx(((next % PARTS.length) + PARTS.length) % PARTS.length);
    pauseNarration();
  }, [pauseNarration]);

  // Keyboard
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goTo(idx + 1);
      else if (e.key === "ArrowLeft") goTo(idx - 1);
      else if (e.key === " ") {
        e.preventDefault();
        playing ? pauseNarration() : (started ? resumeNarration() : start());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idx, playing, started, start, goTo, pauseNarration, resumeNarration]);

  // Parallax pointer
  const [px, setPx] = React.useState(0.5);
  React.useEffect(() => {
    if (reduced) return;
    const onMove = (e: PointerEvent) => setPx(e.clientX / window.innerWidth);
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduced]);

  // Hard-stop everything on unmount / page hide
  React.useEffect(() => {
    const stopAll = () => {
      const a = audioRef.current; const v = videoRef.current;
      if (a) { try { a.pause(); a.currentTime = 0; } catch { /* noop */ } }
      if (v) { try { v.pause(); } catch { /* noop */ } }
      try { AriaAudioBus.stopAll(); } catch { /* noop */ }
    };
    window.addEventListener("pagehide", stopAll);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") stopAll(); });
    return () => {
      window.removeEventListener("pagehide", stopAll);
      stopAll();
    };
  }, []);

  const overallProgress = ((idx + progress) / PARTS.length) * 100;

  return (
    <div dir="rtl" lang="ar" className="fixed inset-0 z-[100] overflow-hidden bg-[#03111f] text-white select-none">
      {/* ARIA muted motion backdrop */}
      <video
        ref={videoRef}
        src={ariaMotionAsset.url}
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        autoPlay={!reduced}
        className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover transition-opacity duration-700"
        style={{ opacity: speaking ? 0.7 : 0.5, filter: "saturate(1.05) contrast(1.05)" }}
      />
      {/* Narration audio (hidden) */}
      <audio ref={audioRef} src={narrationAsset.url} preload="auto" playsInline />

      <SkylineBackground px={px} reduced={reduced} accent={PARTS[idx].accent} />
      <Scrim />

      {/* Start gate — needed for autoplay-with-sound */}
      {!started && !reduced && (
        <button
          type="button"
          onClick={start}
          className="absolute inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-[#03111f]/70 backdrop-blur-sm"
        >
          <span className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#F5C560]">اضغط لبدء العرض</span>
          <span className="flex h-20 w-20 items-center justify-center rounded-full border border-[#F5C560]/60 bg-black/50 text-3xl text-white shadow-[0_0_40px_rgba(245,197,96,0.45)]">▶</span>
          <span className="max-w-md px-6 text-center text-[15px] font-semibold text-white/85">
            ابدأ العرض — تروي «آريا» جسر القيادة التنفيذي فوق أفق الرياض
          </span>
        </button>
      )}

      {/* Top bar: progress + brand */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between px-5 pt-4 sm:px-8 sm:pt-6">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.28em] text-white/70">
          <span className="h-2 w-2 rounded-full bg-[#F5C560] shadow-[0_0_12px_#F5C560]" />
          نيكسيوس · جسر القيادة
        </div>
        <div className="text-[11px] font-mono text-white/60">
          {String(idx + 1).padStart(2, "0")} / {String(PARTS.length).padStart(2, "0")}
        </div>
      </div>

      {/* Progress bar */}
      <div className="pointer-events-none absolute inset-x-0 top-[52px] z-30 h-[2px] bg-white/10 sm:top-[64px]">
        <div
          className="h-full bg-gradient-to-l from-[#F5C560] via-[#3AE8FF] to-[#00D4FF] transition-[width]"
          style={{ width: `${overallProgress}%`, transitionDuration: reduced ? "0ms" : "180ms" }}
        />
      </div>

      {/* Parts — crossfade */}
      <div className="relative z-20 flex h-full w-full items-center justify-center px-5 sm:px-10">
        {PARTS.map((p, i) => (
          <PartLayer key={i} active={i === idx} reduced={reduced} part={p} />
        ))}
      </div>

      {/* Bottom controls */}
      <div className="absolute inset-x-0 bottom-0 z-40 flex flex-col items-center gap-3 pb-6 sm:pb-8">
        <div className="flex items-center gap-2">
          {PARTS.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`الجزء ${i + 1}`}
              onClick={() => goTo(i)}
              className={`h-2 rounded-full transition-all ${i === idx ? "w-8 bg-[#F5C560] shadow-[0_0_10px_#F5C560]" : "w-2 bg-white/30 hover:bg-white/60"}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-3">
          <ControlBtn onClick={() => goTo(idx - 1)} label="السابق">‹</ControlBtn>
          <ControlBtn
            onClick={() => (playing ? pauseNarration() : (started ? resumeNarration() : start()))}
            label={playing ? "إيقاف" : "تشغيل"}
          >
            {playing ? "❚❚" : "▶"}
          </ControlBtn>
          <ControlBtn onClick={() => goTo(idx + 1)} label="التالي">›</ControlBtn>
          <a
            href="/"
            className="ml-2 rounded-full border border-white/20 bg-black/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80 backdrop-blur transition hover:border-[#F5C560]/70 hover:text-white"
          >
            خروج
          </a>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Part layer with crossfade ─────────── */

function PartLayer({ active, reduced, part }: { active: boolean; reduced: boolean; part: Part }) {
  const accentColor =
    part.accent === "gold" ? "#F5C560" : part.accent === "emerald" ? "#2FBF8F" : "#3AE8FF";
  return (
    <div
      aria-hidden={!active}
      className="absolute inset-0 flex items-center justify-center px-5 sm:px-10"
      style={{
        opacity: active ? 1 : 0,
        transform: reduced ? "none" : active ? "translateY(0) scale(1)" : "translateY(12px) scale(0.995)",
        transition: reduced ? "opacity 200ms linear" : "opacity 800ms ease, transform 800ms ease",
        pointerEvents: active ? "auto" : "none",
      }}
    >
      <div className="mx-auto w-full max-w-3xl text-center">
        <div
          className="mb-3 inline-block rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.32em]"
          style={{ borderColor: `${accentColor}66`, color: accentColor, background: `${accentColor}14` }}
        >
          {part.kicker}
        </div>
        <h1 className="mx-auto max-w-2xl text-[28px] font-black leading-[1.2] tracking-tight text-white sm:text-[44px] sm:leading-[1.15]"
            style={{ textShadow: "0 4px 24px rgba(0,0,0,0.6)" }}>
          {part.title}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-[1.85] text-white/85 sm:text-[17px]"
           style={{ textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}>
          {part.body}
        </p>
        {part.render ? <div className="mt-7">{part.render()}</div> : null}
      </div>
    </div>
  );
}

/* ─────────── Counters (Part 3) ─────────── */

function CountersPanel() {
  const items = [
    { label: "زمن القرار", value: 40, prefix: "−", suffix: "٪" },
    { label: "الكلفة التشغيلية", value: 60, prefix: "−", suffix: "٪" },
    { label: "إنتاجية الفريق", value: 3, prefix: "×", suffix: "" },
    { label: "زمن التقارير", value: 50, prefix: "−", suffix: "٪" },
  ];
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {items.map((it) => (
          <div
            key={it.label}
            className="rounded-2xl border border-[#F5C560]/25 bg-black/40 p-4 backdrop-blur-md"
          >
            <div className="text-[28px] font-black tracking-tight text-[#F5C560] sm:text-[36px]">
              <CountUp target={it.value} />
              <span className="text-[20px] sm:text-[24px]">{it.suffix}</span>
              <span className="mr-1 text-[20px] sm:text-[24px] opacity-80">{it.prefix}</span>
            </div>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
              {it.label}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[11px] text-white/55">النسب مستهدفات قطاعية استرشادية</p>
    </>
  );
}

function CountUp({ target }: { target: number }) {
  const [v, setV] = React.useState(0);
  const reduced = usePrefersReducedMotion();
  React.useEffect(() => {
    if (reduced) { setV(target); return; }
    const start = performance.now();
    const dur = 1400;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setV(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, reduced]);
  const display = target < 10 ? v.toFixed(1).replace(/\.0$/, "") : Math.round(v).toString();
  return <span>{toArabicDigits(display)}</span>;
}

function toArabicDigits(s: string) {
  return s.replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
}

/* ─────────── Features (Part 4) ─────────── */

function FeatureGrid() {
  const feats = [
    "بنية سحابية آمنة",
    "تكامل مفتوح API",
    "ذكاء عربي أصيل",
    "حَوكمة بيانات كاملة",
    "قابلية توسّع فورية",
    "مراقبة تنفيذية حية",
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
      {feats.map((f) => (
        <div
          key={f}
          className="rounded-xl border border-[#3AE8FF]/25 bg-[#3AE8FF]/[0.05] px-3 py-3 text-[12px] font-semibold text-white/90 backdrop-blur sm:text-[13px]"
        >
          {f}
        </div>
      ))}
    </div>
  );
}

/* ─────────── ARIA orb (Part 5) ─────────── */

function AriaOrb() {
  return (
    <div className="relative mx-auto h-40 w-40 sm:h-52 sm:w-52">
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_30%,#3AE8FF_0%,#0B2F55_45%,#03111f_75%)] shadow-[0_0_60px_rgba(58,232,255,0.45)]" />
      <div className="absolute inset-0 animate-[spin_18s_linear_infinite] rounded-full border border-[#3AE8FF]/40" />
      <div className="absolute -inset-3 animate-[spin_28s_linear_infinite_reverse] rounded-full border border-[#F5C560]/25" />
      <div className="absolute inset-0 flex items-center justify-center text-[22px] font-black text-white/95">آريا</div>
    </div>
  );
}

/* ─────────── Vision 2030 (Part 6) ─────────── */

function VisionGoldPanel() {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-[#F5C560]/40 bg-[linear-gradient(135deg,rgba(245,197,96,0.14),rgba(245,197,96,0.03))] p-5 backdrop-blur-md">
      <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#F5C560]">Vision 2030</div>
      <div className="mt-2 text-[16px] font-semibold text-white/95 sm:text-[18px]">
        شريك تقني وطني — قرار أسرع، خدمات أذكى، أثر قابل للقياس.
      </div>
    </div>
  );
}

/* ─────────── CTA (Part 7) ─────────── */

function ClosingCTA() {
  return (
    <div className="flex flex-col items-center gap-3">
      <a
        href="/book"
        className="rounded-full bg-[#F5C560] px-8 py-4 text-[13px] font-black uppercase tracking-[0.24em] text-[#03111f] shadow-[0_10px_40px_rgba(245,197,96,0.45)] transition hover:scale-[1.03]"
      >
        احجز عرضًا تنفيذيًا
      </a>
      <a href="/" className="text-[12px] font-semibold text-white/70 underline-offset-4 hover:text-white hover:underline">
        العودة إلى الصفحة الرئيسية
      </a>
    </div>
  );
}

/* ─────────── Skyline background (SVG, transform-only parallax) ─────────── */

function SkylineBackground({ px, reduced, accent }: { px: number; reduced: boolean; accent: Part["accent"] }) {
  const shift = (mult: number) => (reduced ? 0 : (px - 0.5) * mult);
  const skyTop =
    accent === "gold" ? "#1a1305" : accent === "emerald" ? "#031a17" : "#03111f";
  const skyMid =
    accent === "gold" ? "#3a2609" : accent === "emerald" ? "#0a3a2f" : "#0a2648";

  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      {/* Sky gradient */}
      <div
        className="absolute inset-0 transition-colors duration-[1200ms]"
        style={{ background: `linear-gradient(180deg, ${skyTop} 0%, ${skyMid} 60%, #010812 100%)` }}
      />
      {/* Stars / glow */}
      <div className="absolute inset-0 opacity-60"
           style={{
             backgroundImage:
               "radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.7), transparent 60%), radial-gradient(1px 1px at 60% 15%, rgba(255,255,255,0.5), transparent 60%), radial-gradient(1.5px 1.5px at 80% 40%, rgba(255,255,255,0.7), transparent 60%), radial-gradient(1px 1px at 35% 55%, rgba(255,255,255,0.4), transparent 60%)",
           }}
      />
      {/* Vision gold glow */}
      <div
        className="absolute -top-[10%] left-1/2 h-[60vh] w-[80vw] -translate-x-1/2 rounded-full opacity-40 blur-3xl transition-opacity duration-1000"
        style={{
          background:
            accent === "gold"
              ? "radial-gradient(closest-side, rgba(245,197,96,0.55), transparent 70%)"
              : accent === "emerald"
              ? "radial-gradient(closest-side, rgba(47,191,143,0.45), transparent 70%)"
              : "radial-gradient(closest-side, rgba(58,232,255,0.4), transparent 70%)",
        }}
      />

      {/* Far layer */}
      <SkylineLayer y={62} scale={0.85} opacity={0.55} shift={shift(-12)} accent={accent} variant="far" />
      {/* Mid layer */}
      <SkylineLayer y={70} scale={1} opacity={0.85} shift={shift(-28)} accent={accent} variant="mid" />
      {/* Near layer */}
      <SkylineLayer y={80} scale={1.15} opacity={1} shift={shift(-48)} accent={accent} variant="near" />
    </div>
  );
}

function SkylineLayer({
  y, scale, opacity, shift, accent, variant,
}: {
  y: number; scale: number; opacity: number; shift: number; accent: Part["accent"];
  variant: "far" | "mid" | "near";
}) {
  const fill = variant === "near" ? "#020a14" : variant === "mid" ? "#04162a" : "#072240";
  const stroke =
    accent === "gold" ? "#F5C560" : accent === "emerald" ? "#2FBF8F" : "#3AE8FF";
  return (
    <svg
      viewBox="0 0 1440 400"
      preserveAspectRatio="xMidYMax slice"
      className="absolute inset-x-0 bottom-0 h-[65vh] w-[130%] will-change-transform"
      style={{
        left: "-15%",
        transform: `translate3d(${shift}px, ${100 - y}%, 0) scale(${scale})`,
        transformOrigin: "50% 100%",
        opacity,
        transition: "opacity 800ms ease",
      }}
      aria-hidden
    >
      {/* generic silhouette buildings */}
      <g fill={fill}>
        <rect x="0" y="220" width="120" height="180" />
        <rect x="130" y="180" width="90" height="220" />
        <rect x="230" y="240" width="70" height="160" />
        <rect x="960" y="200" width="90" height="200" />
        <rect x="1060" y="240" width="60" height="160" />
        <rect x="1140" y="180" width="80" height="220" />
        <rect x="1240" y="220" width="120" height="180" />
      </g>

      {/* KAFD cluster (left-mid) */}
      <g fill={fill}>
        <polygon points="320,400 340,120 380,140 400,400" />
        <rect x="410" y="150" width="46" height="250" />
        <polygon points="470,400 490,180 520,200 540,400" />
      </g>

      {/* Faisaliah — pyramid + sphere (center-left) */}
      <g>
        <polygon points="600,400 660,80 720,400" fill={fill} />
        <circle cx="660" cy="160" r="26" fill={fill} stroke={stroke} strokeWidth="1.5" opacity="0.9" />
        <line x1="660" y1="80" x2="660" y2="400" stroke={stroke} strokeWidth="0.6" opacity="0.35" />
      </g>

      {/* Kingdom Centre — arch (center) */}
      <g fill={fill}>
        <rect x="770" y="60" width="140" height="340" />
        <path d="M770,180 Q840,110 910,180 L910,60 L770,60 Z" fill="#010812" />
        <path d="M770,180 Q840,110 910,180" fill="none" stroke={stroke} strokeWidth="1.2" opacity="0.7" />
      </g>

      {/* window lights */}
      <g fill={stroke} opacity={variant === "near" ? 0.55 : variant === "mid" ? 0.35 : 0.2}>
        {Array.from({ length: 40 }).map((_, i) => {
          const x = (i * 37) % 1440;
          const yy = 220 + ((i * 53) % 160);
          return <rect key={i} x={x} y={yy} width="2" height="2" />;
        })}
      </g>
    </svg>
  );
}

function Scrim() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-10"
      style={{
        background:
          "linear-gradient(180deg, rgba(3,17,31,0.35) 0%, rgba(3,17,31,0.15) 40%, rgba(3,17,31,0.75) 100%)",
      }}
    />
  );
}

/* ─────────── Controls ─────────── */

function ControlBtn({
  children, onClick, label,
}: { children: React.ReactNode; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/50 text-lg text-white backdrop-blur transition hover:border-[#F5C560]/70 hover:bg-black/70"
    >
      {children}
    </button>
  );
}

/* ─────────── Reduced motion hook ─────────── */

function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduced;
}
