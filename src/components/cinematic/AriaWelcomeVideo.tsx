/**
 * AriaWelcomeVideo — cinematic pre-system opening. Composited layers:
 *   A) deep-space HUD backdrop (grid + radial glow)
 *   B) ARIA video, hero-framed (cover + face-priority object-position)
 *   C) HUD identity overlay (top bar + "ARIA · Online" glass card)
 *   D) live audio waveform synced via WebAudio AnalyserNode
 *
 * Preserves original logic:
 *   - sessionStorage guard is owned by WelcomeThenGenesis
 *   - setIntroActive(true/false)
 *   - installInteractionTracker / markInteracted / hasPriorInteraction
 *   - autoplay-with-sound → fallback muted → unmute on first pointer/key
 *   - reduced-motion explicit entry
 *   - skip always visible
 *   - crossfade → onDone
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import welcomeAsset from "@/assets/aria-welcome.mp4.asset.json";
import posterAsset from "@/assets/aria-holo-v2.png.asset.json";
import { setIntroActive } from "@/lib/intro-store";
import {
  hasPriorInteraction,
  installInteractionTracker,
  markInteracted,
  getPrimedAudioContext,
} from "@/lib/user-interaction";
import { AriaAudioBus } from "@/lib/aria/audio-bus";

interface Props {
  onDone: () => void;
}

/**
 * Engineering constitution — see docs/ARIA_INTRO_CONSTITUTION.md
 *   INVARIANT-1 single intro gate  INVARIANT-2 visual ≤200ms
 *   INVARIANT-3 no finish before MIN_DISPLAY_MS  INVARIANT-4 finishOnce
 *   INVARIANT-5 setIntroActive paired  INVARIANT-6 SSR-safe
 */
const FADE_MS = 600;
const MIN_DISPLAY_MS = 3_500; // never disappear before this
const MAX_MS = 12_000; // hard cap safety
const BAR_COUNT = 14;

export function AriaWelcomeVideo({ onDone }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const bgVideoRef = useRef<HTMLVideoElement | null>(null);
  const [visible, setVisible] = useState(true);
  const [needsGesture, setNeedsGesture] = useState(false);
  const [muted, setMuted] = useState(false);
  const [showSoundChip, setShowSoundChip] = useState(false);
  const [statusOnline, setStatusOnline] = useState(false);
  const [bars, setBars] = useState<number[]>(() => Array(BAR_COUNT).fill(0.15));
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [fitMode, setFitMode] = useState<"cover" | "contain">("contain");
  const finishedRef = useRef(false);
  const mountedAtRef = useRef<number>(typeof performance !== "undefined" ? performance.now() : 0);
  const pendingFinishRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  const reduced = useMemo(() => {
    if (typeof window === "undefined") return false;
    try { return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false; }
    catch { return false; }
  }, []);

  // INVARIANT-3 + INVARIANT-4: single-source finalizer. Only explicit Skip
  // may bypass MIN_DISPLAY_MS; video/error/timeout paths may not.
  const finish = (options?: { bypassMinDisplay?: boolean }) => {
    if (finishedRef.current) return;
    const elapsed = performance.now() - mountedAtRef.current;
    if (!options?.bypassMinDisplay && elapsed < MIN_DISPLAY_MS) {
      if (pendingFinishRef.current != null) return;
      pendingFinishRef.current = window.setTimeout(() => {
        pendingFinishRef.current = null;
        finish();
      }, MIN_DISPLAY_MS - elapsed);
      return;
    }
    finishedRef.current = true;
    const v = videoRef.current;
    const bg = bgVideoRef.current;
    try { v?.pause(); } catch { /* ignore */ }
    try { bg?.pause(); } catch { /* ignore */ }
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    try { audioCtxRef.current?.close(); } catch { /* ignore */ }
    if (v) { try { v.removeAttribute("src"); v.load(); } catch { /* ignore */ } }
    if (bg) { try { bg.removeAttribute("src"); bg.load(); } catch { /* ignore */ } }
    setVisible(false);
    window.setTimeout(() => {
      setIntroActive(false);
      onDone();
    }, FADE_MS);
  };

  // Cross-device rendering constitution: portrait mobile fills the frame;
  // laptop/tablet/landscape preserves the full body with the blurred backdrop.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px) and (orientation: portrait)");
    const apply = () => setFitMode(mq.matches ? "cover" : "contain");
    apply();
    mq.addEventListener?.("change", apply);
    window.addEventListener("resize", apply);
    return () => {
      mq.removeEventListener?.("change", apply);
      window.removeEventListener("resize", apply);
    };
  }, []);

  // Soft handler: on error, keep HUD/poster visible until MIN_DISPLAY_MS.
  const onVideoError = () => {
    setVideoFailed(true);
    finish();
  };

  // Attach WebAudio analyser once video is playing with sound.
  // FR-20 mobile guarantee: on touch devices we NEVER route audio through
  // WebAudio (createMediaElementSource + a fresh AudioContext strands the
  // audio output on iOS/Android because the new ctx starts suspended and
  // resume() outside the gesture is refused). Instead we reuse the shared
  // primed AudioContext with a time-based fallback so the video element
  // keeps outputting to the device speakers unchanged.
  const attachAnalyser = () => {
    const v = videoRef.current;
    if (!v || analyserRef.current) return;
    const isTouch = typeof window !== "undefined"
      && (("ontouchstart" in window) || (navigator.maxTouchPoints ?? 0) > 0);
    const startFallbackBars = () => {
      const start = performance.now();
      const tick = () => {
        const t = (performance.now() - start) / 1000;
        setBars(Array.from({ length: BAR_COUNT }, (_, i) =>
          0.25 + 0.35 * Math.abs(Math.sin(t * 2 + i * 0.4))
        ));
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    };
    if (isTouch) { startFallbackBars(); return; }
    try {
      const primed = getPrimedAudioContext();
      const Ctx = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
      const ctx = primed ?? new Ctx();
      // Resume synchronously — if the caller is still inside a gesture,
      // this is what actually turns audio output back on.
      void ctx.resume().catch(() => {});
      const src = ctx.createMediaElementSource(v);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      src.connect(analyser);
      analyser.connect(ctx.destination);
      // Only track ctx for teardown if we created it ourselves — never
      // close() the shared primed context, other components rely on it.
      audioCtxRef.current = primed ? null : ctx;
      analyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(data);
        const next: number[] = [];
        const step = Math.max(1, Math.floor(data.length / BAR_COUNT));
        for (let i = 0; i < BAR_COUNT; i++) {
          const v = data[i * step] ?? 0;
          next.push(Math.max(0.12, v / 255));
        }
        setBars(next);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      startFallbackBars();
    }
  };

  useEffect(() => {
    setIntroActive(true);
    installInteractionTracker();

    const v = videoRef.current;
    const bg = bgVideoRef.current;
    if (!v) return () => { setIntroActive(false); };

    // "Online" status glow after 2.4s
    const onlineT = window.setTimeout(() => setStatusOnline(true), 2400);
    // Hard cap safety
    const capT = window.setTimeout(() => finish(), MAX_MS);

    if (reduced) {
      setNeedsGesture(true);
      return () => {
        window.clearTimeout(onlineT);
        window.clearTimeout(capT);
        try { v.pause(); } catch { /* ignore */ }
        try { bg?.pause(); } catch { /* ignore */ }
        setIntroActive(false);
      };
    }

    const startBg = () => { if (bg) { bg.muted = true; bg.play().catch(() => {}); } };

    const tryWithSound = async () => {
      // Mobile-safe path: iOS/Android block createMediaElementSource before a
      // user gesture and route audio through a suspended AudioContext even
      // after unmute. Never touch WebAudio until we truly have unmuted audio.
      v.muted = false;
      v.volume = 1;
      try {
        await v.play();
        startBg();
        setMuted(false);
        setShowSoundChip(false);
        attachAnalyser();
      } catch {
        v.muted = true;
        (v as HTMLVideoElement).setAttribute("muted", "");
        setMuted(true);
        setShowSoundChip(true);
        try { await v.play(); } catch { /* ignore */ }
        startBg();
        // DO NOT attachAnalyser here — waits for the unmute gesture.
      }
    };

    // FR-20 continuity: if the session already has a prior gesture, the
    // bus is unlocked and iOS/Android will honour unmuted autoplay. We
    // still call tryWithSound() which does the unmuted-first attempt —
    // the presence of a prior gesture means the fallback branch will
    // rarely fire on repeat navigations within the same tab session.
    if (hasPriorInteraction()) {
      // Belt-and-suspenders: ensure the bus is unlocked even if the
      // root-level tracker somehow missed this render (SSR hydration edge).
      void import("@/lib/aria/audio-bus").then((m) => {
        try { m.AriaAudioBus.unlock(); } catch { /* ignore */ }
      });
    }
    void tryWithSound();


    return () => {
      window.clearTimeout(onlineT);
      window.clearTimeout(capT);
      if (pendingFinishRef.current != null) {
        window.clearTimeout(pendingFinishRef.current);
        pendingFinishRef.current = null;
      }
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      try { audioCtxRef.current?.close(); } catch { /* ignore */ }
      try { v.pause(); } catch { /* ignore */ }
      try { bg?.pause(); } catch { /* ignore */ }
      setIntroActive(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unmute = () => {
    const v = videoRef.current;
    if (!v) return;
    markInteracted();
    // Resume AudioContext first (must happen inside the user gesture on iOS),
    // then unmute the element, then attach the analyser lazily so the WebAudio
    // graph is never built in a suspended state on mobile.
    try { audioCtxRef.current?.resume(); } catch { /* ignore */ }
    v.muted = false;
    (v as HTMLVideoElement).removeAttribute("muted");
    v.volume = 1;
    const p = v.play();
    if (p && typeof p.then === "function") {
      p.then(() => { attachAnalyser(); }).catch(() => { /* ignore */ });
    } else {
      attachAnalyser();
    }
    setMuted(false);
    setShowSoundChip(false);
  };

  const startReduced = async () => {
    const v = videoRef.current;
    if (!v) return;
    markInteracted();
    try {
      v.muted = false;
      v.volume = 1;
      await v.play();
      const bg = bgVideoRef.current;
      if (bg) { bg.muted = true; bg.play().catch(() => {}); }
      setMuted(false);
      setNeedsGesture(false);
      setShowSoundChip(false);
      attachAnalyser();
    } catch {
      setNeedsGesture(true);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    const next = !muted;
    if (!next) {
      // unmuting — resume audio context inside the gesture
      try { audioCtxRef.current?.resume(); } catch { /* ignore */ }
      v.muted = false;
      (v as HTMLVideoElement).removeAttribute("muted");
      v.volume = 1;
      const p = v.play();
      if (p && typeof p.then === "function") {
        p.then(() => attachAnalyser()).catch(() => {});
      } else {
        attachAnalyser();
      }
      setShowSoundChip(false);
    } else {
      v.muted = true;
    }
    setMuted(next);
  };

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[120] flex items-center justify-center overflow-hidden"
      style={{
        background:
          "radial-gradient(120% 90% at 50% 40%, #06213b 0%, #04111f 55%, #010814 100%)",
        colorScheme: "dark",
        opacity: visible ? 1 : 0,
        transition: `opacity ${FADE_MS}ms ease`,
        pointerEvents: visible ? "auto" : "none",
        maxHeight: "100dvh",
      }}
      aria-label="مقدّمة سينمائية · Cinematic intro"
      onPointerDown={() => { if (muted) unmute(); }}
    >
      {/* Layer A — HUD grid + ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,212,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.08) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(120% 90% at 50% 45%, black 40%, transparent 85%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(0,212,255,0.22), transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Poster fallback — guarantees INVARIANT-2 (visual ≤200ms) and stays
          on-screen if the video source fails to load. */}
      <img
        src={posterAsset.url}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full"
        style={{
          objectFit: fitMode,
          objectPosition: fitMode === "cover" ? "center 30%" : "center",
          opacity: videoReady && !videoFailed ? 0.58 : 1,
          transition: "opacity 400ms ease",
          filter: "brightness(1.03) contrast(1.04) saturate(1.08)",
        }}
      />

      {/* Blurred cover backdrop for cinematic depth */}
      {!videoFailed && (
        <video
          ref={bgVideoRef}
          src={welcomeAsset.url}
          playsInline
          muted
          preload="auto"
          aria-hidden
          onError={() => { /* backdrop is decorative; ignore */ }}
          className="absolute inset-0 h-full w-full opacity-70"
          style={{
            objectFit: "cover",
            filter: "blur(28px) brightness(0.5) saturate(1.1)",
            transform: "scale(1.15)",
          }}
        />
      )}

      {/* Layer B — Hero video (face-priority framing) */}
      <div
        className="relative h-full w-full"
        style={{
          animation: reduced ? undefined : "ariaHeroEnter 700ms cubic-bezier(.22,1,.36,1) both",
          maxHeight: "100dvh",
        }}
      >
        {!videoFailed && (
          <video
            ref={videoRef}
            src={welcomeAsset.url}
            playsInline
            preload="auto"
            onLoadedData={() => setVideoReady(true)}
            onPlaying={() => setVideoReady(true)}
            onEnded={() => finish()}
            onError={onVideoError}
            className="h-full w-full"
            style={{
              objectFit: fitMode,
              objectPosition: fitMode === "cover" ? "center 30%" : "center",
              background: "transparent",
              maxHeight: "100dvh",
              filter: "contrast(1.05) saturate(1.05)",
              opacity: videoReady ? 1 : 0,
              transition: "opacity 420ms ease",
            }}
          />
        )}
        {/* Cinematic edge fade */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(130% 100% at 50% 50%, transparent 55%, rgba(4,17,31,0.85) 100%)",
          }}
        />
      </div>

      {/* Layer C — Top HUD identity bar */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col items-center gap-1 pt-5"
        style={{
          animation: reduced ? undefined : "ariaHudDown 700ms 300ms ease-out both",
          opacity: 0,
        }}
      >
        <div className="text-[10px] font-semibold uppercase tracking-[0.4em] text-[#3AE8FF]/85">
          NEXUS AI OS · EXECUTIVE INTELLIGENCE
        </div>
        <div className="h-px w-24 bg-gradient-to-r from-transparent via-[#3AE8FF]/60 to-transparent" />
      </div>

      {/* Layer C+D — ARIA identity glass card with waveform */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-24 z-10 flex justify-center px-4"
        style={{
          animation: reduced ? undefined : "ariaCardUp 700ms 800ms cubic-bezier(.22,1,.36,1) both",
          opacity: 0,
        }}
      >
        <div
          className="flex items-center gap-4 rounded-2xl border border-[#00D4FF]/30 bg-[#04111f]/55 px-5 py-3 shadow-[0_0_40px_rgba(0,212,255,0.25)]"
          style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
        >
          {/* Live pip */}
          <div className="relative flex h-2.5 w-2.5 shrink-0 items-center justify-center">
            <span
              className={`absolute inline-flex h-full w-full rounded-full ${statusOnline ? "bg-emerald-400/60" : "bg-amber-300/60"}`}
              style={{ animation: "ariaPulseRing 1.8s ease-out infinite" }}
            />
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${statusOnline ? "bg-emerald-400" : "bg-amber-300"}`}
            />
          </div>
          {/* Identity */}
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-white">آريا · ARIA</span>
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/60">
              {statusOnline ? "Online · متصلة" : "Initializing…"}
            </span>
          </div>
          {/* Waveform bars */}
          <div className="flex h-6 items-end gap-[3px]">
            {bars.map((amp, i) => (
              <span
                key={i}
                style={{
                  height: `${Math.max(10, amp * 100)}%`,
                  width: 3,
                  borderRadius: 2,
                  background:
                    "linear-gradient(180deg, #3AE8FF 0%, #00D4FF 60%, #0891b2 100%)",
                  boxShadow: "0 0 6px rgba(58,232,255,0.55)",
                  transition: "height 90ms linear",
                  opacity: muted ? 0.5 : 1,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Sound chip — bold call to action when autoplay blocked */}
      {showSoundChip && (
        <button
          type="button"
          onClick={unmute}
          className="absolute end-5 z-20 inline-flex items-center gap-2 rounded-full border border-[#3AE8FF]/50 bg-[#04111f]/70 px-4 py-2 text-xs font-semibold text-[#3AE8FF] shadow-[0_0_28px_rgba(58,232,255,0.45)] backdrop-blur transition hover:bg-[#04111f]/90 sm:text-sm"
          style={{ top: "calc(env(safe-area-inset-top, 0px) + 16px)", animation: "ariaChipPulse 1.6s ease-in-out infinite" }}
        >
          <Volume2 className="size-4" />
          <span>اضغط لتفعيل الصوت · Tap for sound</span>
        </button>
      )}

      {/* Mute toggle */}
      {!showSoundChip && !needsGesture && (
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? "تشغيل الصوت" : "كتم الصوت"}
          aria-pressed={!muted}
          className="absolute end-5 z-20 inline-flex items-center gap-2 rounded-full border border-[#00D4FF]/30 bg-[#04111f]/55 px-3 py-2 text-xs font-medium text-[#3AE8FF] backdrop-blur transition hover:bg-[#04111f]/80"
          style={{ top: "calc(env(safe-area-inset-top, 0px) + 16px)" }}
        >
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>
      )}

      {/* Reduced-motion explicit entry */}
      {needsGesture && (
        <button
          type="button"
          onClick={startReduced}
          className="absolute inset-0 z-10 flex items-center justify-center bg-[#04111f]/60 text-white backdrop-blur-sm"
        >
          <span className="rounded-full border border-[#3AE8FF]/60 bg-[#3AE8FF]/15 px-8 py-4 text-lg font-semibold shadow-[0_0_32px_rgba(58,232,255,0.4)] transition hover:bg-[#3AE8FF]/25">
            دخول · Enter
          </span>
        </button>
      )}

      {/* Skip — always visible */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); finish({ bypassMinDisplay: true }); }}
        className="absolute start-6 z-30 rounded-full border border-white/25 bg-black/40 px-4 py-2 text-xs font-medium text-white/85 backdrop-blur transition hover:bg-black/60 sm:text-sm"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }}
      >
        تخطّي · Skip
      </button>

      {/* Local keyframes (scoped, no global CSS bleed) */}
      <style>{`
        @keyframes ariaHeroEnter {
          0%   { opacity: 0; transform: scale(1.08); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes ariaHudDown {
          0%   { opacity: 0; transform: translateY(-12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes ariaCardUp {
          0%   { opacity: 0; transform: translateY(18px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes ariaPulseRing {
          0%   { transform: scale(1); opacity: 0.7; }
          80%  { transform: scale(2.4); opacity: 0; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes ariaChipPulse {
          0%,100% { box-shadow: 0 0 24px rgba(58,232,255,0.4); }
          50%     { box-shadow: 0 0 40px rgba(58,232,255,0.75); }
        }
      `}</style>
    </div>
  );
}

export default AriaWelcomeVideo;
