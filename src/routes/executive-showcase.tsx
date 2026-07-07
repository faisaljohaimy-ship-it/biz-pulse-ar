// Executive Showcase — full-screen cinematic auto-play tour of the NEXIOS
// platform components, narrated end-to-end by ARIA (voice + captions).
// RTL-first, bilingual, sim-tagged, respects prefers-reduced-motion.
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import {
  Shield,
  Bot,
  Radar,
  BarChart3,
  Moon,
  Sparkles,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  X,
  ArrowLeft,
  Volume2,
  VolumeX,
} from "lucide-react";
import { SimulationRibbon } from "@/components/SimulationRibbon";
import { AriaAudioBus } from "@/lib/aria/audio-bus";
import ariaHologram from "@/assets/aria-hologram.png.asset.json";

export const Route = createFileRoute("/executive-showcase")({
  head: () => ({
    meta: [
      { title: "العرض التنفيذي — نيكسيوس | Executive Showcase" },
      {
        name: "description",
        content:
          "عرض سينمائي كامل الشاشة يستعرض مكوّنات منصة نيكسيوس — الأمن الصناعي، الوكلاء، التوأم الرقمي، التقارير، الحج، وARIA.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ExecutiveShowcasePage,
});

type Scene = {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title_ar: string;
  title_en: string;
  value_ar: string;
  value_en: string;
  /** ARIA narration text (Arabic, fully diacritized for TTS). */
  narration_ar: string;
  /** ARIA narration text (English fallback / captions). */
  narration_en: string;
  accent: string; // hex
  durationMs: number; // fallback when narration audio is unavailable
  visual: () => React.ReactNode;
};


const ACCENT_NAVY = "#3AE8FF";
const ACCENT_EMERALD = "#34D399";

const SCENES: Scene[] = [
  {
    id: "security",
    icon: Shield,
    title_ar: "الأمن الصناعي",
    title_en: "Industrial Security",
    value_ar: "حوادث، دوريات، تصاريح، زوّار ومركبات في منصة موحّدة.",
    value_en: "Incidents, patrols, permits, visitors and vehicles — one unified surface.",
    narration_ar:
      "نَبْدَأُ بِالْأَمْنِ الصِّنَاعِيِّ. مِنَصَّةٌ مُوَحَّدَةٌ لِلْحَوَادِثِ وَالدَّوْرِيَّاتِ وَالتَّصَارِيحِ وَالزُّوَّارِ وَالْمَرْكَبَاتِ، مَعَ اسْتِجَابَةٍ لَحْظِيَّةٍ عَبْرَ كُلِّ الْمَوَاقِعِ.",
    narration_en:
      "We begin with Industrial Security — one unified surface for incidents, patrols, permits, visitors and vehicles with real-time response across every site.",
    accent: ACCENT_NAVY,
    durationMs: 8500,
    visual: () => <SecurityHUD />,
  },
  {
    id: "agents",
    icon: Bot,
    title_ar: "الوكلاء التنفيذيون",
    title_en: "Executive Agents",
    value_ar: "14+ وكيل ذكاء مع تنسيق أدوات وسجل شرعي للأحداث.",
    value_en: "14+ AI agents with tool orchestration and an immutable event ledger.",
    narration_ar:
      "الْوُكَلَاءُ التَّنْفِيذِيُّونَ: أَكْثَرُ مِنْ أَرْبَعَةَ عَشَرَ وَكِيلَ ذَكَاءٍ يَعْمَلُونَ بِتَنْسِيقِ أَدَوَاتٍ دَقِيقٍ وَسِجِلٍّ شَرْعِيٍّ لِكُلِّ حَدَثٍ يَجْرِي فِي الْمُؤَسَّسَةِ.",
    narration_en:
      "Executive Agents: more than fourteen AI agents working with precise tool orchestration and an immutable event ledger for every action in the enterprise.",
    accent: ACCENT_NAVY,
    durationMs: 8500,
    visual: () => <AgentsHUD />,
  },
  {
    id: "twin",
    icon: Radar,
    title_ar: "التوأم الرقمي",
    title_en: "Digital Twin",
    value_ar: "نبض حي للأصول والمواقع والعمليات عبر المؤسسة.",
    value_en: "Live pulse of assets, sites and operations across the enterprise.",
    narration_ar:
      "التَّوْأَمُ الرَّقْمِيُّ: نَبْضٌ حَيٌّ لِأُصُولِكَ وَمَوَاقِعِكَ وَعَمَلِيَّاتِكَ، يَكْشِفُ الْمُخَاطَرَ قَبْلَ وُقُوعِهَا وَيُوَجِّهُ الْقَرَارَ التَّنْفِيذِيَّ لَحْظَةً بِلَحْظَةٍ.",
    narration_en:
      "The Digital Twin: a live pulse of your assets, sites and operations — surfacing risks before they land and guiding executive decisions moment by moment.",
    accent: ACCENT_EMERALD,
    durationMs: 8500,
    visual: () => <TwinHUD />,
  },
  {
    id: "reports",
    icon: BarChart3,
    title_ar: "التقارير التنفيذية",
    title_en: "Executive Reports",
    value_ar: "مؤشرات أداء لحظية، ذاكرة إنتاجية، وتسليم عبر Outlook.",
    value_en: "Real-time KPIs, production memory, and Outlook delivery.",
    narration_ar:
      "التَّقَارِيرُ التَّنْفِيذِيَّةُ: مُؤَشِّرَاتُ أَدَاءٍ لَحْظِيَّةٌ، وَذَاكِرَةٌ إِنْتَاجِيَّةٌ، وَتَسْلِيمٌ مُبَاشِرٌ إِلَى بَرِيدِكَ التَّنْفِيذِيِّ عَبْرَ آوتْلُوك.",
    narration_en:
      "Executive Reports: real-time KPIs, production memory, and direct delivery into your executive inbox via Outlook.",
    accent: ACCENT_EMERALD,
    durationMs: 8000,
    visual: () => <ReportsHUD />,
  },
  {
    id: "hajj",
    icon: Moon,
    title_ar: "منصة الحج",
    title_en: "Hajj Operations",
    value_ar: "وحدة مشاعر 1447 لإدارة العمليات الميدانية في الموسم.",
    value_en: "Mashaer 1447 module for field operations during the season.",
    narration_ar:
      "مِنَصَّةُ الْحَجِّ: وَحْدَةُ مَشَاعِرَ أَلْفٍ وَأَرْبَعِ مِئَةٍ وَسَبْعٍ وَأَرْبَعِينَ لِإِدَارَةِ الْعَمَلِيَّاتِ الْمَيْدَانِيَّةِ فِي الْمَوْسِمِ بِأَعْلَى مُعَدَّلَاتِ الْجَاهِزِيَّةِ.",
    narration_en:
      "Hajj Operations: the Mashaer fourteen forty-seven module for managing field operations at the highest readiness through the season.",
    accent: ACCENT_NAVY,
    durationMs: 8500,
    visual: () => <HajjHUD />,
  },
  {
    id: "aria",
    icon: Sparkles,
    title_ar: "ARIA — الذكاء التنفيذي",
    title_en: "ARIA — Executive Intelligence",
    value_ar: "محرك تنفيذي ثنائي اللغة بصوت طبيعي وذاكرة حيّة.",
    value_en: "Bilingual executive engine with natural voice and live memory.",
    narration_ar:
      "وَأَخِيرًا، أَنَا آرْيَا: الذَّكَاءُ التَّنْفِيذِيُّ لِنِكْسِيُوس. صَوْتٌ طَبِيعِيٌّ، وَذَاكِرَةٌ حَيَّةٌ، وَتَحْلِيلٌ ثُنَائِيُّ اللُّغَةِ فِي خِدْمَةِ الْقَرَارِ.",
    narration_en:
      "And finally, I am ARIA — the executive intelligence of NEXIOS. A natural voice, live memory, and bilingual analysis in service of the decision.",
    accent: ACCENT_EMERALD,
    durationMs: 9000,
    visual: () => <AriaHUD />,
  },
];

const INTRO_NARRATION_AR =
  "أَهْلًا بِكَ فِي نِكْسِيُوس، نِظَامُ التَّشْغِيلِ التَّنْفِيذِيِّ لِلذَّكَاءِ الِاصْطِنَاعِيِّ. سَأَصْطَحِبُكَ الْآنَ خِلَالَ مُكَوِّنَاتِ النِّظَامِ وَاحِدًا تِلْوَ الْآخَرِ.";
const INTRO_NARRATION_EN =
  "Welcome to NEXIOS — the AI executive operating system. I will now take you through the platform, component by component.";


function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

/** ARIA narrator for the showcase — public TTS + audio playback. */
function useNarrator(muted: boolean) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const [speaking, setSpeaking] = React.useState(false);
  const stop = React.useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    const a = audioRef.current;
    if (a) {
      try { a.pause(); } catch { /* ignore */ }
      const src = a.src;
      try { a.src = ""; } catch { /* ignore */ }
      if (src && src.startsWith("blob:")) {
        try { URL.revokeObjectURL(src); } catch { /* ignore */ }
      }
      audioRef.current = null;
    }
    AriaAudioBus.release("tour-tts");
    setSpeaking(false);
  }, []);
  const pause = React.useCallback(() => {
    const a = audioRef.current;
    if (a && !a.paused) try { a.pause(); } catch { /* ignore */ }
  }, []);
  const resume = React.useCallback(async (): Promise<boolean> => {
    const a = audioRef.current;
    if (!a || !a.paused) return true;
    try { await a.play(); return true; } catch { return false; }
  }, []);
  /**
   * Speak a line. Resolves with `true` when audio played to end (or ended
   * cleanly), `false` when playback was blocked / cancelled / TTS failed.
   */
  const speak = React.useCallback(async (text: string): Promise<boolean> => {
    stop();
    if (muted) return false;
    AriaAudioBus.unlock();
    const granted = AriaAudioBus.acquire("tour-tts", () => stop());
    if (!granted) return false;
    setSpeaking(true);
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const r = await fetch("/api/public/aria-tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: ac.signal,
      });
      if (!r.ok) throw new Error(`tts_${r.status}`);
      const blob = await r.blob();
      if (ac.signal.aborted) throw new Error("aborted");
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      const ended = new Promise<boolean>((resolve) => {
        const done = (ok: boolean) => {
          if (audioRef.current === audio) audioRef.current = null;
          try { URL.revokeObjectURL(url); } catch { /* ignore */ }
          AriaAudioBus.release("tour-tts");
          setSpeaking(false);
          resolve(ok);
        };
        audio.onended = () => done(true);
        audio.onerror = () => done(false);
        ac.signal.addEventListener("abort", () => {
          try { audio.pause(); } catch { /* ignore */ }
          done(false);
        }, { once: true });
      });
      try {
        await audio.play();
      } catch {
        // Autoplay blocked — leave the audio primed; caller shows Start button.
        AriaAudioBus.release("tour-tts");
        setSpeaking(false);
        return false;
      }
      return await ended;
    } catch {
      AriaAudioBus.release("tour-tts");
      setSpeaking(false);
      return false;
    }
  }, [muted, stop]);
  React.useEffect(() => () => { stop(); }, [stop]);
  return { speak, pause, resume, stop, speaking };
}

function ExecutiveShowcasePage() {
  const navigate = useNavigate();
  const reduced = usePrefersReducedMotion();
  const [idx, setIdx] = React.useState(0);
  const [playing, setPlaying] = React.useState(!reduced);
  const [progress, setProgress] = React.useState(0);
  const [ended, setEnded] = React.useState(false);
  const [muted, setMuted] = React.useState(false);
  const [intro, setIntro] = React.useState(true);
  const [needsStart, setNeedsStart] = React.useState(false);
  const [caption, setCaption] = React.useState<string>(INTRO_NARRATION_AR);
  const isFinale = idx >= SCENES.length;
  const narrator = useNarrator(muted);

  // Refs to freshest values inside async narration loop (no re-run per idx).
  const idxRef = React.useRef(idx);
  const playingRef = React.useRef(playing);
  const endedRef = React.useRef(ended);
  const runIdRef = React.useRef(0);
  React.useEffect(() => { idxRef.current = idx; }, [idx]);
  React.useEffect(() => { playingRef.current = playing; }, [playing]);
  React.useEffect(() => { endedRef.current = ended; }, [ended]);

  React.useEffect(() => {
    if (reduced) setPlaying(false);
  }, [reduced]);

  // Cinematic intro fade: 2s then reveal scenes.
  React.useEffect(() => {
    if (reduced) { setIntro(false); return; }
    const t = window.setTimeout(() => setIntro(false), 2000);
    return () => window.clearTimeout(t);
  }, [reduced]);

  // Freshest scene text (for progress-based visual only). Advance is
  // controlled by the narration loop below, not this ticker.
  React.useEffect(() => {
    if (intro || !playing || ended || isFinale || reduced) { setProgress(0); return; }
    const scene = SCENES[idx];
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / scene.durationMs);
      setProgress(p);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [intro, playing, idx, ended, isFinale, reduced]);

  // Narration loop: after intro, ARIA speaks each scene and advances on end.
  React.useEffect(() => {
    if (intro || isFinale || endedRef.current) return;
    if (reduced || muted) { setCaption(SCENES[idx].narration_ar); return; }
    const runId = ++runIdRef.current;
    let cancelled = false;
    (async () => {
      // Intro narration on first scene of a run.
      if (idx === 0 && !isFinale) {
        setCaption(INTRO_NARRATION_AR);
        const ok = await narrator.speak(INTRO_NARRATION_AR);
        if (cancelled || runId !== runIdRef.current) return;
        if (!ok) { setNeedsStart(true); return; }
      }
      // Per-scene loop — read from refs so we don't re-enter on idx change.
      while (!cancelled && runId === runIdRef.current) {
        const cur = idxRef.current;
        if (cur >= SCENES.length) break;
        if (!playingRef.current || endedRef.current) return;
        const s = SCENES[cur];
        setCaption(s.narration_ar);
        const ok = await narrator.speak(s.narration_ar);
        if (cancelled || runId !== runIdRef.current) return;
        if (!ok) {
          // TTS failed — fall through to timer-based advance for this scene.
          await new Promise((res) => setTimeout(res, s.durationMs));
          if (cancelled || runId !== runIdRef.current) return;
        }
        if (idxRef.current !== cur) continue; // user navigated during the wait
        if (cur >= SCENES.length - 1) {
          setEnded(true);
          setIdx(SCENES.length);
          setPlaying(false);
          return;
        }
        setIdx((n) => n + 1);
        setProgress(0);
        // give React a tick to apply the new idx before next iteration
        await new Promise((res) => setTimeout(res, 30));
      }
    })();
    return () => { cancelled = true; };
    // Only re-run when the show restarts, not on every idx change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intro, playing, ended, isFinale, reduced, muted]);

  // Keyboard controls
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { narrator.stop(); navigate({ to: "/" }); }
      else if (e.key === "ArrowLeft") setIdx((i) => Math.min(SCENES.length - 1, i + 1));
      else if (e.key === "ArrowRight") setIdx((i) => Math.max(0, i - 1));
      else if (e.key === " ") { e.preventDefault(); setPlaying((p) => !p); }
    };
    window.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [navigate, narrator]);

  // Clean up narrator on unmount / route leave.
  React.useEffect(() => () => { narrator.stop(); }, [narrator]);

  // Pause narrator when user pauses.
  React.useEffect(() => {
    if (!playing) narrator.pause();
    else void narrator.resume();
  }, [playing, narrator]);

  const startShow = () => {
    setNeedsStart(false);
    setIntro(false);
    setPlaying(true);
    // bump run id so the effect re-enters
    runIdRef.current++;
    // Speak intro then run — effect deps includes `playing`, so toggling
    // triggers the async loop.
    setIdx(0);
  };

  const goPrev = () => {
    narrator.stop();
    setEnded(false);
    setProgress(0);
    setIdx((i) => Math.max(0, (isFinale ? SCENES.length - 1 : i - 1)));
  };
  const goNext = () => {
    narrator.stop();
    if (idx >= SCENES.length - 1) {
      setEnded(true);
      setIdx(SCENES.length);
      setPlaying(false);
      return;
    }
    setProgress(0);
    setIdx((i) => i + 1);
  };
  const restart = () => {
    narrator.stop();
    setEnded(false);
    setIdx(0);
    setProgress(0);
    setPlaying(!reduced);
    runIdRef.current++;
  };
  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      if (next) narrator.stop();
      return next;
    });
  };

  const shownIdx = isFinale ? SCENES.length - 1 : idx;
  const scene = SCENES[shownIdx];
  const overallProgress = isFinale
    ? 100
    : ((idx + progress) / SCENES.length) * 100;

  return (
    <div
      dir="rtl"
      lang="ar"
      className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-[#03111f] text-white select-none"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="العرض التنفيذي · Executive Showcase"
    >
      <SimulationRibbon />

      {/* Background accents */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 opacity-70"
          style={{
            background: `radial-gradient(60% 45% at 50% 25%, ${scene.accent}22, transparent 70%), radial-gradient(80% 60% at 50% 100%, #061A2E 0%, #03111f 60%, #010810 100%)`,
            transition: "background 800ms ease",
          }}
        />
      </div>

      {/* Cinematic intro overlay */}
      {intro && !reduced && (
        <div
          className="absolute inset-0 z-[110] flex flex-col items-center justify-center bg-black"
          style={{ animation: "intro-fade 2000ms ease forwards" }}
          aria-hidden
        >
          <div
            className="relative h-32 w-32 rounded-full"
            style={{
              backgroundImage: `url(${ariaHologram.url})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              boxShadow: "0 0 90px rgba(58,232,255,0.7), inset 0 0 60px rgba(0,212,255,0.4)",
              animation: "aria-pop 1800ms cubic-bezier(0.22,1,0.36,1) both",
            }}
          />
          <div
            className="mt-6 text-[10px] font-bold uppercase tracking-[0.4em] text-[#3AE8FF]"
            style={{ animation: "intro-word 1800ms ease-out 300ms both" }}
          >
            NEXIOS · AI OPERATING SYSTEM
          </div>
        </div>
      )}

      {/* Top bar */}
      <header className="relative z-30 flex items-center justify-between gap-3 px-4 pt-3 sm:px-8 sm:pt-4">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.28em] text-white/80">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: scene.accent, boxShadow: `0 0 12px ${scene.accent}` }}
          />
          نيكسيوس · NEXIOS
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? "تشغيل الصوت · Unmute" : "كتم الصوت · Mute"}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-black/40 text-white/80 backdrop-blur transition hover:border-[#3AE8FF]/60 hover:text-white"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <span className="hidden font-mono text-[11px] text-white/60 sm:inline">
            {String(Math.min(idx + 1, SCENES.length)).padStart(2, "0")} / {String(SCENES.length).padStart(2, "0")}
          </span>
          <Link
            to="/"
            aria-label="خروج · Exit"
            onClick={() => narrator.stop()}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-black/40 text-white/80 backdrop-blur transition hover:border-[#3AE8FF]/60 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* Progress bar */}
      <div className="relative z-30 mt-3 h-[3px] w-full bg-white/10">
        <div
          className="h-full"
          style={{
            width: `${overallProgress}%`,
            background: `linear-gradient(90deg, ${ACCENT_NAVY}, ${ACCENT_EMERALD})`,
            transition: reduced ? "none" : "width 180ms linear",
            boxShadow: `0 0 12px ${scene.accent}`,
          }}
        />
      </div>

      {/* Body */}
      <main className="relative z-20 flex flex-1 items-center justify-center px-4 sm:px-10">
        {isFinale ? (
          <Finale onRestart={restart} />
        ) : (
          <SceneView scene={scene} reduced={reduced} />
        )}
      </main>

      {/* ARIA caption bar (bilingual) */}
      {!isFinale && !intro && (
        <div className="relative z-30 mx-auto mb-2 max-w-4xl px-4 sm:px-8">
          <div
            className="rounded-2xl border border-[#3AE8FF]/25 bg-black/50 px-4 py-3 backdrop-blur-md"
            style={{ boxShadow: `0 0 24px ${scene.accent}22` }}
          >
            <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.32em] text-[#3AE8FF]/90">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  background: narrator.speaking ? "#3AE8FF" : "#94A3B8",
                  boxShadow: narrator.speaking ? "0 0 10px #3AE8FF" : undefined,
                  animation: narrator.speaking ? "pulse-dot 1.2s ease-in-out infinite" : undefined,
                }}
              />
              ARIA · آريا {narrator.speaking && "· تتحدّث"}
            </div>
            <p dir="rtl" className="mt-1.5 text-sm leading-relaxed text-white sm:text-base">
              {caption}
            </p>
          </div>
        </div>
      )}

      {/* Start-audio fallback (autoplay blocked) */}
      {needsStart && !intro && !isFinale && (
        <button
          type="button"
          onClick={startShow}
          className="absolute inset-x-0 top-1/3 z-[105] mx-auto flex w-fit items-center gap-3 rounded-full border border-[#3AE8FF]/60 bg-black/70 px-6 py-3 text-sm font-bold uppercase tracking-[0.24em] text-[#3AE8FF] backdrop-blur transition hover:-translate-y-0.5 hover:bg-black/85"
          style={{ boxShadow: "0 0 30px rgba(58,232,255,0.35)" }}
        >
          <Play className="h-4 w-4" /> ابدأ العرض · Start Show
        </button>
      )}

      {/* Bottom controls */}
      <footer className="relative z-30 flex flex-col items-center gap-3 pb-4 sm:pb-6">
        <div className="flex items-center gap-2" aria-hidden={isFinale}>
          {SCENES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                narrator.stop();
                setEnded(false);
                setProgress(0);
                setIdx(i);
              }}
              aria-label={`${i + 1}. ${s.title_ar}`}
              className={`h-2 rounded-full transition-all ${
                !isFinale && i === idx
                  ? "w-8"
                  : "w-2 bg-white/30 hover:bg-white/60"
              }`}
              style={
                !isFinale && i === idx
                  ? { background: scene.accent, boxShadow: `0 0 10px ${scene.accent}` }
                  : undefined
              }
            />
          ))}
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <CtrlBtn onClick={goPrev} label="السابق · Previous">
            <SkipBack className="h-4 w-4" />
          </CtrlBtn>
          {isFinale ? (
            <CtrlBtn onClick={restart} label="إعادة · Restart">
              <Play className="h-4 w-4" />
            </CtrlBtn>
          ) : (
            <CtrlBtn
              onClick={() => setPlaying((p) => !p)}
              label={playing ? "إيقاف مؤقت · Pause" : "تشغيل · Play"}
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </CtrlBtn>
          )}
          <CtrlBtn onClick={goNext} label="التالي · Next">
            <SkipForward className="h-4 w-4" />
          </CtrlBtn>
          <Link
            to="/"
            onClick={() => narrator.stop()}
            className="mr-1 rounded-full border border-white/20 bg-black/40 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80 backdrop-blur transition hover:border-[#3AE8FF]/60 hover:text-white sm:px-4 sm:text-[11px]"
          >
            خروج · Exit
          </Link>
        </div>
      </footer>

      <style>{`
        @keyframes intro-fade { 0% { opacity: 1; } 70% { opacity: 1; } 100% { opacity: 0; pointer-events: none; } }
        @keyframes aria-pop { 0% { transform: scale(0.6); opacity: 0; filter: blur(8px); } 100% { transform: scale(1); opacity: 1; filter: blur(0); } }
        @keyframes intro-word { 0% { opacity: 0; letter-spacing: 0.2em; } 100% { opacity: 1; letter-spacing: 0.4em; } }
        @keyframes pulse-dot { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.5); opacity: 0.6; } }
      `}</style>
    </div>
  );
}


function CtrlBtn({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-black/40 text-white/85 backdrop-blur transition hover:-translate-y-0.5 hover:border-[#3AE8FF]/60 hover:text-white"
    >
      {children}
    </button>
  );
}

function SceneView({ scene, reduced }: { scene: Scene; reduced: boolean }) {
  const Icon = scene.icon;
  return (
    <div
      key={scene.id}
      className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-6 md:grid-cols-2 md:gap-10"
      style={{
        animation: reduced ? undefined : "showcase-in 700ms cubic-bezier(0.22,1,0.36,1) both",
      }}
    >
      <div className="order-2 md:order-1">
        <div
          className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.32em]"
          style={{
            borderColor: `${scene.accent}66`,
            color: scene.accent,
            background: `${scene.accent}14`,
          }}
        >
          <Icon className="h-3.5 w-3.5" />
          <span>{scene.title_en}</span>
        </div>
        <h1
          className="mt-4 text-[28px] font-black leading-[1.15] tracking-tight text-white sm:text-[44px]"
          style={{ textShadow: "0 2px 24px rgba(0,0,0,0.5)" }}
        >
          {scene.title_ar}
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
          {scene.value_ar}
        </p>
        <p dir="ltr" className="mt-2 max-w-xl text-sm leading-relaxed text-white/50">
          {scene.value_en}
        </p>
        <span
          className="mt-5 inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-300/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.28em] text-amber-200"
        >
          عرض توضيحي · Demo
        </span>
      </div>
      <div className="order-1 md:order-2">
        <div
          className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] shadow-[0_30px_80px_rgba(0,0,0,0.5)]"
          style={{
            boxShadow: `0 30px 80px ${scene.accent}22, 0 0 0 1px ${scene.accent}22 inset`,
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background: `radial-gradient(60% 50% at 50% 40%, ${scene.accent}22, transparent 70%)`,
            }}
          />
          <div className="relative flex h-full w-full items-center justify-center p-6">
            {scene.visual()}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes showcase-in {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function Finale({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
      <div
        className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#3AE8FF]"
        style={{ textShadow: "0 0 18px rgba(58,232,255,0.6)" }}
      >
        NEXIOS · AI OPERATING SYSTEM
      </div>
      <h1
        className="mt-4 text-4xl font-black tracking-tight text-white sm:text-6xl"
        style={{ textShadow: "0 0 40px rgba(58,232,255,0.35)" }}
      >
        الذكاء، تحت <span style={{ color: "#4ADE80" }}>القيادة</span>.
      </h1>
      <p dir="ltr" className="mt-3 text-sm uppercase tracking-[0.3em] text-white/60">
        Intelligence, under command.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <Link
          to="/os"
          className="inline-flex items-center justify-center gap-2 rounded-sm bg-[#3AE8FF] px-6 py-4 text-sm font-bold uppercase tracking-[0.18em] text-[#061A2E] shadow-[0_6px_28px_rgba(58,232,255,0.35)] transition hover:bg-[#5CEEFF]"
        >
          بدء العملية · Start Operation
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <button
          type="button"
          onClick={onRestart}
          className="inline-flex items-center justify-center gap-2 rounded-sm border border-[#3AE8FF]/45 bg-[#3AE8FF]/[0.06] px-6 py-4 text-sm font-bold uppercase tracking-[0.18em] text-[#3AE8FF] transition hover:border-[#3AE8FF]/80 hover:bg-[#3AE8FF]/[0.12]"
        >
          <Play className="h-4 w-4" /> إعادة العرض · Replay
        </button>
      </div>
    </div>
  );
}

/* ─────────── HUD visuals (lightweight, brand-consistent) ─────────── */

function HudFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid h-full w-full grid-cols-6 grid-rows-6 gap-2 font-mono text-[10px] text-white/70">
      {children}
    </div>
  );
}

function SecurityHUD() {
  return (
    <HudFrame>
      <div className="col-span-4 row-span-4 rounded-lg border border-[#3AE8FF]/25 bg-[#3AE8FF]/[0.04] p-3">
        <div className="text-[9px] uppercase tracking-[0.3em] text-[#3AE8FF]/80">Incidents · حوادث</div>
        <div className="mt-2 space-y-1.5">
          {[
            { t: "P1 · تسرّب حراري — موقع A", c: "#F87171" },
            { t: "P2 · إنذار محيط — بوابة 3", c: "#F59E0B" },
            { t: "P3 · صيانة وقائية", c: "#3AE8FF" },
            { t: "P4 · دورية منتظمة", c: "#94A3B8" },
          ].map((r) => (
            <div key={r.t} className="flex items-center gap-2">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: r.c, boxShadow: `0 0 8px ${r.c}` }}
              />
              <span className="truncate text-white/80">{r.t}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="col-span-2 row-span-2 rounded-lg border border-white/10 bg-white/[0.03] p-2 text-center">
        <div className="text-[8px] uppercase tracking-[0.25em] text-white/50">Open</div>
        <div className="mt-1 text-2xl font-black text-[#3AE8FF]">14</div>
      </div>
      <div className="col-span-2 row-span-2 rounded-lg border border-white/10 bg-white/[0.03] p-2 text-center">
        <div className="text-[8px] uppercase tracking-[0.25em] text-white/50">SLA</div>
        <div className="mt-1 text-2xl font-black text-emerald-300">98%</div>
      </div>
      <div className="col-span-6 row-span-2 rounded-lg border border-white/10 bg-white/[0.03] p-2">
        <div className="text-[9px] uppercase tracking-[0.25em] text-white/50">Patrol Coverage</div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-[82%] bg-gradient-to-r from-[#3AE8FF] to-emerald-400" />
        </div>
      </div>
    </HudFrame>
  );
}

function AgentsHUD() {
  const agents = ["Ops", "Sec", "HR", "Finance", "Risk", "Legal", "CX", "IT"];
  return (
    <div className="grid h-full w-full grid-cols-4 grid-rows-2 gap-2">
      {agents.map((a, i) => (
        <div
          key={a}
          className="flex flex-col items-center justify-center rounded-lg border border-[#3AE8FF]/20 bg-[#3AE8FF]/[0.05] p-2"
          style={{ animation: `pulse 2.4s ease-in-out ${i * 0.15}s infinite` }}
        >
          <Bot className="h-4 w-4 text-[#3AE8FF]" />
          <div className="mt-1 text-[10px] font-semibold text-white/80">{a}</div>
          <div className="text-[8px] text-white/40">agent</div>
        </div>
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}`}</style>
    </div>
  );
}

function TwinHUD() {
  return (
    <svg viewBox="0 0 300 240" className="h-full w-full">
      <defs>
        <radialGradient id="tw" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#34D399" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#34D399" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="150" cy="120" r="90" fill="url(#tw)" />
      {[
        [80, 70],
        [220, 90],
        [200, 180],
        [90, 170],
        [150, 60],
        [150, 190],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="4" fill="#3AE8FF">
            <animate attributeName="r" values="3;6;3" dur="2s" begin={`${i * 0.2}s`} repeatCount="indefinite" />
          </circle>
          <line x1="150" y1="120" x2={x} y2={y} stroke="#3AE8FF" strokeOpacity="0.35" strokeWidth="1" />
        </g>
      ))}
      <circle cx="150" cy="120" r="6" fill="#34D399" />
      <text x="150" y="230" textAnchor="middle" fill="#94A3B8" fontSize="10" fontFamily="monospace">
        LIVE · digital twin · sim
      </text>
    </svg>
  );
}

function ReportsHUD() {
  const bars = [40, 62, 55, 78, 66, 82, 70, 90];
  return (
    <div className="flex h-full w-full flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <div className="text-[9px] uppercase tracking-[0.3em] text-white/60">KPIs · Q3</div>
        <div className="font-mono text-emerald-300">+12.4%</div>
      </div>
      <div className="flex flex-1 items-end gap-1.5">
        {bars.map((b, i) => (
          <div
            key={i}
            className="flex-1 rounded-t bg-gradient-to-t from-[#3AE8FF] to-emerald-300"
            style={{ height: `${b}%`, opacity: 0.85 }}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 text-center font-mono text-[10px]">
        {[
          ["Revenue", "$4.2M"],
          ["OpEx", "-6.1%"],
          ["NPS", "72"],
        ].map(([k, v]) => (
          <div key={k} className="rounded border border-white/10 bg-white/[0.03] p-1.5">
            <div className="text-[8px] uppercase tracking-[0.25em] text-white/40">{k}</div>
            <div className="text-white">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HajjHUD() {
  return (
    <div className="grid h-full w-full grid-cols-2 gap-2 font-mono text-[10px]">
      {[
        ["مِنى · Mina", "Zone A", "#3AE8FF"],
        ["عرفة · Arafat", "Zone B", "#F5C560"],
        ["مزدلفة · Muzdalifah", "Zone C", "#34D399"],
        ["مكة · Makkah", "Central", "#A78BFA"],
      ].map(([ar, en, c]) => (
        <div
          key={ar}
          className="flex flex-col justify-between rounded-lg border p-2"
          style={{ borderColor: `${c}55`, background: `${c}0d` }}
        >
          <div className="text-[9px] uppercase tracking-[0.25em]" style={{ color: c }}>
            {en}
          </div>
          <div className="text-sm font-bold text-white" dir="rtl">
            {ar}
          </div>
          <div className="flex items-center gap-1 text-white/60">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: c, boxShadow: `0 0 6px ${c}` }}
            />
            live
          </div>
        </div>
      ))}
    </div>
  );
}

function AriaHUD() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3">
      <div className="relative">
        <div
          className="h-32 w-32 rounded-full"
          style={{
            background: "radial-gradient(circle at 40% 40%, #3AE8FF, #0B3B5C 60%, transparent 70%)",
            boxShadow: "0 0 60px rgba(58,232,255,0.55), inset 0 0 40px rgba(0,212,255,0.3)",
            animation: "orb 3s ease-in-out infinite",
          }}
        />
        <style>{`@keyframes orb{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}`}</style>
      </div>
      <div className="text-center">
        <div className="text-[10px] uppercase tracking-[0.4em] text-[#3AE8FF]">ARIA · آريا</div>
        <div className="mt-1 font-mono text-[10px] text-white/60">bilingual · voice · memory</div>
      </div>
    </div>
  );
}
