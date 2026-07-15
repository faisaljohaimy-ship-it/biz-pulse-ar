/**
 * ExecutivePresentationPlayer — the guided executive presentation on the
 * demo page. ARIA's self-hosted executive film plays on
 * the LEFT in a dark #04111f frame, full face visible; on the RIGHT a
 * cinematic scene panel (kicker · title · body) switches automatically in
 * sync with the narration cues, ending on a closing CTA.
 *
 * Cues (seconds): 0 home · 8 command · 16 sec-regions · 24 agents ·
 * 32 twin-reports · 40 closing.
 *
 * Rules: audio starts ONLY after the first user interaction (the start
 * button); full RTL; responsive mobile + laptop; clean stop on exit
 * (pause + release on unmount). While playing it owns the AriaAudioBus
 * "hero-soundtrack" channel so any ARIA chat voice preempts it instantly.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bot,
  Boxes,
  Gauge,
  Home,
  Pause,
  Play,
  RotateCcw,
  Shield,
  SkipForward,
  Sparkles,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { AriaAudioBus } from "@/lib/aria/audio-bus";
import { useI18n } from "@/lib/i18n";
import { EXECUTIVE_PRESENTATION_MEDIA } from "@/lib/executive-presentation.media";

type Accent = "navy" | "emerald" | "gold";

interface Scene {
  id: string;
  at: number; // cue time in seconds
  icon: typeof Home;
  kicker_ar: string;
  kicker_en: string;
  title_ar: string;
  title_en: string;
  body_ar: string;
  body_en: string;
  accent: Accent;
  showSimRibbon?: boolean;
  render?: () => React.JSX.Element;
}

const ACCENT: Record<Accent, { text: string; border: string; glow: string; dot: string }> = {
  navy: {
    text: "text-cyan-200",
    border: "border-cyan-400/30",
    glow: "radial-gradient(80% 70% at 50% 0%, rgba(52,182,255,0.16), transparent 70%)",
    dot: "bg-cyan-400",
  },
  emerald: {
    text: "text-emerald-200",
    border: "border-emerald-400/30",
    glow: "radial-gradient(80% 70% at 50% 0%, rgba(30,233,182,0.16), transparent 70%)",
    dot: "bg-emerald-400",
  },
  gold: {
    text: "text-amber-200",
    border: "border-amber-400/35",
    glow: "radial-gradient(80% 70% at 50% 0%, rgba(242,199,110,0.18), transparent 70%)",
    dot: "bg-amber-300",
  },
};

function ClosingCTA() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        to="/request-demo"
        className="rounded-full bg-cyan-400/90 px-5 py-2.5 text-xs font-bold text-[#04111f] transition hover:bg-cyan-300"
      >
        اطلب عرضاً خاصاً
      </Link>
      <Link
        to="/demo"
        className="rounded-full border border-white/20 px-4 py-2.5 text-xs font-semibold text-white/85 transition hover:bg-white/10"
      >
        تصفّح العرض
      </Link>
    </div>
  );
}

const SCENES: readonly Scene[] = [
  {
    id: "home",
    at: EXECUTIVE_PRESENTATION_MEDIA.cueSeconds[0],
    icon: Home,
    kicker_ar: "الواجهة الرئيسية",
    kicker_en: "Home",
    title_ar: "لوحة القيادة السيادية · نبض المؤسسة",
    title_en: "Sovereign command deck · the pulse of the enterprise.",
    body_ar: "نظرة عامة موحّدة على الأمن، العمليات، والتوأم الرقمي — من الرؤية إلى التنفيذ.",
    body_en:
      "One unified view of security, operations, and the digital twin — vision to execution.",
    accent: "navy",
  },
  {
    id: "command",
    at: EXECUTIVE_PRESENTATION_MEDIA.cueSeconds[1],
    icon: Gauge,
    kicker_ar: "غرفة القيادة",
    kicker_en: "Command Center",
    title_ar: "قرار واحد يربط الأمن والسلامة والصيانة.",
    title_en: "A single decision surface across security, safety, and maintenance.",
    body_ar: "الحوادث، الدوريات، التصاريح، والزوّار — في تدفّق قرارات حيّ واحد.",
    body_en: "Incidents, patrols, permits, and visitors — one live decision stream.",
    accent: "emerald",
  },
  {
    id: "sec-regions",
    at: EXECUTIVE_PRESENTATION_MEDIA.cueSeconds[2],
    icon: Shield,
    kicker_ar: "القطاعات الأربعة",
    kicker_en: "Regions · Sec",
    title_ar: "المملكة على خارطة واحدة.",
    title_en: "The Kingdom on one operational map.",
    body_ar: "الوسطى، الغربية، الشرقية، الجنوبية — مؤشرات المواقع والحوادث والدوريات لحظياً.",
    body_en: "Central, Western, Eastern, Southern — live site, incident, and patrol telemetry.",
    accent: "emerald",
  },
  {
    id: "agents",
    at: EXECUTIVE_PRESENTATION_MEDIA.cueSeconds[3],
    icon: Bot,
    kicker_ar: "وكلاء آريا",
    kicker_en: "ARIA Agents",
    title_ar: "وكلاء تنفيذيون يعملون معك.",
    title_en: "Executive agents that work alongside you.",
    body_ar: "يفهمون، ويحلّلون، وينفّذون بموافقة بشرية — لا قرار دون إذن.",
    body_en: "They understand, analyze, and execute with human approval — never without consent.",
    accent: "navy",
  },
  {
    id: "twin-reports",
    at: EXECUTIVE_PRESENTATION_MEDIA.cueSeconds[4],
    icon: Boxes,
    kicker_ar: "التوأم والتقارير",
    kicker_en: "Twin · Reports",
    title_ar: "التوأم الرقمي الحيّ.",
    title_en: "The live digital twin.",
    body_ar: "محاكاة مرجعية للمواقع والأصول، وتقارير تنفيذية جاهزة للمجلس.",
    body_en: "A reference simulation of sites and assets, with board-ready executive reports.",
    accent: "emerald",
    showSimRibbon: true,
  },
  {
    id: "closing",
    at: EXECUTIVE_PRESENTATION_MEDIA.cueSeconds[5],
    icon: Sparkles,
    kicker_ar: "الختام",
    kicker_en: "Closing",
    title_ar: "ابدأ رحلة القيادة الذكية.",
    title_en: "Begin the intelligent-leadership journey.",
    body_ar: "برنامج تجريبي مركّز — نطاق واضح، جدولة ٩٠ يوماً، وفريق تفعيل مخصّص.",
    body_en: "A focused pilot — clear scope, a 90-day timeline, and a dedicated activation team.",
    accent: "gold",
    render: () => <ClosingCTA />,
  },
];

function sceneIndexAt(t: number): number {
  let idx = 0;
  for (let i = 0; i < SCENES.length; i++) if (t >= SCENES[i].at) idx = i;
  return idx;
}

/* ── Scene view (right panel) ──────────────────────────────────────────── */
function SceneView({ scene, ar }: { scene: Scene; ar: boolean }) {
  const a = ACCENT[scene.accent];
  return (
    <div
      className={cn(
        "flex h-full flex-col justify-center gap-3 rounded-2xl border bg-[#050d1a]/70 p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] backdrop-blur-xl sm:p-7",
        a.border,
      )}
      style={{ backgroundImage: a.glow }}
    >
      <div
        className={cn("flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em]", a.text)}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full", a.dot)} />
        <span className="uppercase">{ar ? scene.kicker_ar : scene.kicker_en}</span>
      </div>
      <h3 className="text-lg font-bold leading-snug text-white sm:text-2xl">
        {ar ? scene.title_ar : scene.title_en}
      </h3>
      <p className="max-w-prose text-sm leading-relaxed text-white/70 sm:text-[15px]">
        {ar ? scene.body_ar : scene.body_en}
      </p>

      {scene.showSimRibbon && (
        <span className="inline-flex w-fit items-center gap-1 rounded-full border border-[#3AE8FF]/35 bg-[#3AE8FF]/10 px-2.5 py-1 text-[10px] font-semibold text-[#3AE8FF]">
          {ar ? "محاكاة · لقطة عامة" : "SIM · PUBLIC SNAPSHOT"}
        </span>
      )}

      {scene.render && <div className="mt-1">{scene.render()}</div>}
    </div>
  );
}

/* ── Player ────────────────────────────────────────────────────────────── */
export function ExecutivePresentationPlayer() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [phase, setPhase] = useState<"idle" | "playing" | "paused" | "done">("idle");
  const [sceneIdx, setSceneIdx] = useState(0);
  const [progress, setProgress] = useState(0); // 0..1 of the whole narration
  const [duration, setDuration] = useState(0);
  const [videoFailed, setVideoFailed] = useState(false);
  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const stopPlayback = useCallback((nextPhase: "paused" | "done" | "idle") => {
    const v = videoRef.current;
    if (v) {
      try {
        v.pause();
      } catch {
        /* ignore */
      }
    }
    AriaAudioBus.release("hero-soundtrack");
    setPhase(nextPhase);
  }, []);

  // Start / resume — always inside a user gesture, so sound is allowed.
  const start = useCallback(
    (fromBeginning: boolean) => {
      const v = videoRef.current;
      if (!v || videoFailed) return;
      AriaAudioBus.unlock();
      const granted = AriaAudioBus.acquire("hero-soundtrack", () => {
        const el = videoRef.current;
        if (el) {
          try {
            el.pause();
          } catch {
            /* ignore */
          }
        }
        if (phaseRef.current === "playing") setPhase("paused");
      });
      if (!granted) return;
      if (fromBeginning) {
        try {
          v.currentTime = 0;
        } catch {
          /* ignore */
        }
        setSceneIdx(0);
      }
      v.muted = false;
      v.volume = 1;
      v.play()
        .then(() => setPhase("playing"))
        .catch(() => {
          AriaAudioBus.release("hero-soundtrack");
          setPhase("idle");
        });
    },
    [videoFailed],
  );

  const onTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const idx = sceneIndexAt(v.currentTime);
    setSceneIdx((prev) => (prev === idx ? prev : idx));
    if (v.duration) setProgress(Math.min(1, v.currentTime / v.duration));
  }, []);

  const onLoadedMetadata = useCallback(() => {
    const v = videoRef.current;
    if (v && Number.isFinite(v.duration)) setDuration(v.duration);
  }, []);

  const onEnded = useCallback(() => {
    setSceneIdx(SCENES.length - 1);
    setProgress(1);
    stopPlayback("done");
  }, [stopPlayback]);

  // Skip to a specific cue (scene). Works while playing or paused.
  const skipToScene = useCallback((idx: number) => {
    const v = videoRef.current;
    if (!v) return;
    const clamped = Math.max(0, Math.min(SCENES.length - 1, idx));
    try {
      v.currentTime = SCENES[clamped].at + 0.05;
    } catch {
      /* ignore */
    }
    setSceneIdx(clamped);
  }, []);

  // Seek by clicking the progress track.
  const seek = useCallback((fraction: number) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    try {
      v.currentTime = Math.max(0, Math.min(1, fraction)) * v.duration;
    } catch {
      /* ignore */
    }
  }, []);

  // Clean stop on exit: pause + release the audio channel on unmount.
  useEffect(() => {
    const v = videoRef.current;
    return () => {
      if (v) {
        try {
          v.pause();
        } catch {
          /* ignore */
        }
      }
      AriaAudioBus.release("hero-soundtrack");
    };
  }, []);

  const activeScene = SCENES[sceneIdx];

  return (
    <section
      dir="rtl"
      aria-label="العرض التنفيذي الموجّه"
      className="rounded-3xl border border-cyan-400/20 bg-[#04111f] p-3 shadow-[0_20px_60px_-20px_rgba(0,212,255,0.25)] md:p-4"
      style={{ fontFamily: "var(--font-arabic)" }}
    >
      {/* Cue timeline */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5 px-1">
        {SCENES.map((s, i) => {
          const Icon = s.icon;
          return (
            <span
              key={s.id}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] transition-all",
                i === sceneIdx && (phase === "playing" || phase === "paused" || phase === "done")
                  ? "border-cyan-300/70 bg-cyan-400/15 font-semibold text-cyan-100"
                  : "border-white/10 text-white/45",
              )}
            >
              <Icon className="h-3 w-3" aria-hidden />
              {ar ? s.kicker_ar : s.kicker_en}
            </span>
          );
        })}
      </div>

      {/* LTR grid so the video is physically LEFT and the scene panel RIGHT
          on every locale; inner content is RTL. Mobile stacks: video then panel. */}
      <div dir="ltr" className="grid gap-3 md:grid-cols-[minmax(220px,300px)_1fr]">
        {/* LEFT — ARIA narrator video, full face, dark #04111f frame */}
        <div className="relative mx-auto w-full max-w-[300px] overflow-hidden rounded-2xl bg-[#04111f] shadow-[0_24px_80px_-28px_rgba(34,182,255,0.8)] ring-1 ring-cyan-300/35 md:mx-0 md:max-w-none">
          <div className="aspect-[9/16] max-h-[62vh] w-full">
            <video
              ref={videoRef}
              src={EXECUTIVE_PRESENTATION_MEDIA.videoSrc}
              poster={EXECUTIVE_PRESENTATION_MEDIA.posterSrc}
              playsInline
              preload="metadata"
              onTimeUpdate={onTimeUpdate}
              onLoadedMetadata={onLoadedMetadata}
              onLoadedData={() => setVideoFailed(false)}
              onEnded={onEnded}
              onError={() => {
                AriaAudioBus.release("hero-soundtrack");
                setPhase("idle");
                setVideoFailed(true);
              }}
              aria-label={ar ? "فيلم آريا للعرض التنفيذي" : "ARIA executive presentation film"}
              disablePictureInPicture
              className="h-full w-full object-cover object-top"
            >
              <track
                kind="chapters"
                src={EXECUTIVE_PRESENTATION_MEDIA.chaptersSrc}
                srcLang="ar"
                label="فصول العرض التنفيذي"
                default
              />
            </video>
          </div>

          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#020812]/95 via-[#04111f]/45 to-transparent"
          />

          {phase === "playing" && !videoFailed && (
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 p-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200/30 bg-[#04111f]/65 px-2.5 py-1 text-[9px] font-bold tracking-[0.2em] text-cyan-100 backdrop-blur-xl">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300 shadow-[0_0_10px_#22d3ee]" />
                ARIA · FILM
              </span>
              <span className="rounded-full border border-white/15 bg-black/45 px-2 py-1 font-mono text-[9px] text-white/70 backdrop-blur-xl">
                {EXECUTIVE_PRESENTATION_MEDIA.durationLabel}
              </span>
            </div>
          )}

          {videoFailed && (
            <div
              role="alert"
              className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-[#04111f]/88 px-6 text-center backdrop-blur-md"
              style={{
                backgroundImage: `linear-gradient(rgba(4,17,31,.78), rgba(4,17,31,.96)), url(${EXECUTIVE_PRESENTATION_MEDIA.posterSrc})`,
                backgroundPosition: "center",
                backgroundSize: "cover",
              }}
            >
              <Sparkles className="h-8 w-8 text-cyan-200 drop-shadow-[0_0_14px_rgba(34,211,238,.9)]" />
              <p className="text-sm font-bold text-white">
                {ar ? "تعذّر تحميل الفيلم التنفيذي" : "The executive film could not be loaded"}
              </p>
              <button
                type="button"
                onClick={() => {
                  setVideoFailed(false);
                  videoRef.current?.load();
                }}
                className="rounded-full border border-cyan-300/40 bg-cyan-300/10 px-4 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
              >
                {ar ? "إعادة المحاولة" : "Try again"}
              </button>
            </div>
          )}

          {/* Start / resume overlay — sound begins only from this gesture. */}
          {!videoFailed && phase !== "playing" && (
            <button
              type="button"
              onClick={() => start(phase === "idle" || phase === "done")}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#04111f]/70 backdrop-blur-[2px] transition hover:bg-[#04111f]/60"
              aria-label={phase === "paused" ? "متابعة العرض" : "ابدأ العرض التنفيذي"}
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan-400/90 text-[#04111f] shadow-[0_0_40px_rgba(0,212,255,0.6)]">
                {phase === "done" ? (
                  <RotateCcw className="h-7 w-7" />
                ) : (
                  <Play className="h-7 w-7 translate-x-0.5" />
                )}
              </span>
              <span dir="rtl" className="text-sm font-bold text-white">
                {phase === "paused"
                  ? "متابعة العرض"
                  : phase === "done"
                    ? "إعادة العرض"
                    : "ابدأ العرض التنفيذي"}
              </span>
              <span dir="rtl" className="text-[10px] text-cyan-200/80">
                آريا ترافقك صوتياً خلال جولة المنصة
              </span>
            </button>
          )}

          {/* Pause control while playing */}
          {phase === "playing" && !videoFailed && (
            <button
              type="button"
              onClick={() => stopPlayback("paused")}
              aria-label="إيقاف مؤقت"
              className="absolute bottom-3 left-3 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white ring-1 ring-white/25 backdrop-blur transition hover:bg-black/70 sm:h-9 sm:w-9"
            >
              <Pause className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* RIGHT — auto-switching cinematic scene panel */}
        <div dir="rtl" className="min-h-[280px] md:min-h-[360px]">
          <div
            key={activeScene.id}
            className="h-full animate-in fade-in slide-in-from-bottom-2 duration-500"
          >
            <SceneView scene={activeScene} ar={ar} />
          </div>
        </div>
      </div>

      {/* Transport bar — progress + play/pause/skip. navy→emerald glassmorphism. */}
      <div className="mt-3 rounded-2xl border border-cyan-400/20 bg-white/[0.04] p-3 backdrop-blur-xl">
        {/* Progress track with cue ticks (seekable) */}
        <div
          role="slider"
          aria-label={ar ? "شريط تقدّم العرض" : "Presentation progress"}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          tabIndex={0}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            // RTL track: progress grows from the right edge.
            seek((r.right - e.clientX) / r.width);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") skipToScene(sceneIdx + 1);
            else if (e.key === "ArrowRight") skipToScene(sceneIdx - 1);
          }}
          className="group relative h-2.5 cursor-pointer rounded-full bg-white/10"
        >
          <div
            className="absolute inset-y-0 right-0 rounded-full"
            style={{
              width: `${progress * 100}%`,
              background: "linear-gradient(90deg, #34D399, #22B6FF)",
              boxShadow: "0 0 12px rgba(34,182,255,0.5)",
            }}
          />
          {/* Cue ticks */}
          {duration > 0 &&
            SCENES.map((s) => (
              <span
                key={s.id}
                aria-hidden
                className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-white/30"
                style={{ right: `${(s.at / duration) * 100}%` }}
              />
            ))}
        </div>

        {/* Controls row */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                phase === "playing" ? stopPlayback("paused") : start(phase === "done")
              }
              aria-label={
                phase === "playing" ? (ar ? "إيقاف مؤقت" : "Pause") : ar ? "تشغيل" : "Play"
              }
              className="grid h-11 w-11 place-items-center rounded-full bg-cyan-400/90 text-[#04111f] shadow-[0_0_24px_rgba(0,212,255,0.5)] transition hover:bg-cyan-300"
            >
              {phase === "playing" ? (
                <Pause className="h-5 w-5" />
              ) : phase === "done" ? (
                <RotateCcw className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 translate-x-0.5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => skipToScene(sceneIdx + 1)}
              disabled={sceneIdx >= SCENES.length - 1}
              aria-label={ar ? "تخطّي إلى المشهد التالي" : "Skip to next scene"}
              className="grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-white/[0.06] text-white transition hover:border-emerald-400/50 hover:bg-white/10 disabled:opacity-40"
            >
              <SkipForward className="h-5 w-5" data-flip-rtl />
            </button>
          </div>
          <div className="text-[11px] font-semibold tracking-wide text-white/60">
            {ar ? activeScene.kicker_ar : activeScene.kicker_en}
            <span className="mx-1.5 text-white/25">·</span>
            <span className="font-mono tabular-nums">
              {String(sceneIdx + 1).padStart(2, "0")}/{String(SCENES.length).padStart(2, "0")}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ExecutivePresentationPlayer;
