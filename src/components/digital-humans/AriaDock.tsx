/**
 * AriaDock — the permanent Executive Digital Human surface.
 *
 * Visible on every authenticated route. Subscribes to the real
 * `enterprise_events` stream, narrates new events in plain executive
 * language (bilingual AR/EN, follows global locale), and — when voice
 * is enabled — streams TTS audio through `speakAria` while feeding
 * amplitude into the avatar for natural lip-sync.
 *
 * Avatar rendering is delegated to the registered `AvatarProvider`
 * (default = built-in SVG). Swapping in Azure AI Avatar / HeyGen / D-ID
 * later is a provider-registry change, not a redesign.
 *
 * Pure additive: existing pages and the Mission Control narrator panel
 * are untouched.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ARIA, findHuman, type DigitalHumanSpec } from "@/lib/digital-humans/registry";
import type { DigitalHumanState } from "@/lib/digital-humans/registry";
import { getAvatarProvider, type AvatarProvider, type AvatarSpeakTurn } from "@/lib/digital-humans/avatar-provider";
// Side-effect imports — register SSR-safe providers eagerly.
// The HeyGen provider is loaded lazily on the client only (see useEffect below)
// because its SDK touches WebRTC / mediaDevices and must never run during SSR
// or in environments that lack `navigator.mediaDevices` (mobile preview iframes).
import "@/components/digital-humans/DigitalHumanAvatar";
import "@/components/digital-humans/r3f/R3FAvatarProvider";
import { useEventStream } from "@/lib/events/useEventStream";
import { narrateEvent } from "@/lib/narrator/event-narrator";
import { speakAs, detectLang, type SpeakHandle } from "@/lib/digital-humans/aria-voice";
import { narratorAgentToHumanId } from "@/lib/digital-humans/voice-profiles";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Volume2, VolumeX, Sparkles, X, Pause, Play, RotateCcw, SkipForward, Square, Mic, MicOff, Loader2, Megaphone, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGatewayListener as useAgentListener } from "@/lib/digital-humans/gateway-listener";
import { HologramFace } from "@/components/digital-humans/HologramFace";
import { AriaStatusStrip } from "@/components/digital-humans/AriaStatusStrip";
import ariaHologram from "@/assets/aria-hologram.png.asset.json";
import { useAriaSpeech } from "@/hooks/useAriaSpeech";

/** Strip markdown / emoji so TTS reads clean prose. */
function stripForSpeech(input: string): string {
  return input
    // fenced + inline code
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    // images and links → keep label
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    // emphasis, headings, blockquotes, list bullets
    .replace(/[*_~#>]+/g, " ")
    .replace(/^\s*[-•·]\s+/gm, "")
    // emoji + pictographic symbols
    .replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}




interface QueuedLine {
  id: string;
  text_ar: string;
  text_en: string;
  /** Resolved Digital Human spec for the speaker (always non-null). */
  speaker: DigitalHumanSpec;
}

export function AriaDock() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [minimized, setMinimized] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const [paused, setPaused] = useState(false);
  const [state, setState] = useState<DigitalHumanState>("idle");
  const [amp, setAmp] = useState(0);
  const [current, setCurrent] = useState<QueuedLine | null>(null);
  const [speakTurn, setSpeakTurn] = useState<AvatarSpeakTurn | null>(null);
  const [ariaLiveText, setAriaLiveText] = useState("");
  const [queueDepth, setQueueDepth] = useState(0);
  const [heygenAvailable, setHeygenAvailable] = useState<boolean | null>(null);
  const [typedQuestion, setTypedQuestion] = useState("");
  const [typedLoading, setTypedLoading] = useState(false);
  const [typedError, setTypedError] = useState<string | null>(null);
  const lastLineRef = useRef<QueuedLine | null>(null);
  const queueRef = useRef<QueuedLine[]>([]);
  const playingRef = useRef(false);
  const handleRef = useRef<SpeakHandle | null>(null);
  const seenRef = useRef<Set<string>>(new Set());
  const hydratedRef = useRef(false);
  const listener = useAgentListener();
  const ariaSpeech = useAriaSpeech();

  // The opening greeting is audio-only: ARIA speaks the welcome line before
  // the dock UI (avatar, transcript, controls) becomes visible. We reveal
  // the dock when the welcome turn finishes (or after a safety timeout).
  const [revealed, setRevealed] = useState(true);
  const welcomeStartedRef = useRef(false);

  // Advertise this dock to the global copilot so it can step aside while the
  // authenticated Digital Human surface owns the screen.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as unknown as { __aria_dock?: boolean };
    w.__aria_dock = true;
    return () => { w.__aria_dock = false; };
  }, []);

  // Lazy-register the HeyGen provider only on the client and only when
  // WebRTC media APIs are available. Any import / boot failure is swallowed
  // so the dock (and the rest of the app) continues to render via the
  // built-in SVG / R3F providers. The `/api/heygen/status` effect below
  // independently controls whether HeyGen is actually selected.
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    const nav = typeof navigator !== "undefined" ? navigator : undefined;
    if (!nav?.mediaDevices) return;
    let cancelled = false;
    void (async () => {
      try {
        await import("@/components/digital-humans/heygen/HeygenAvatarProvider");
      } catch (err) {
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.warn("[AriaDock] HeyGen provider unavailable", err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Stability-first voice mode: ARIA must always answer through the proven
  // gateway TTS path. Streaming-video providers are kept registered for future
  // use, but are not allowed to own speech because provider/session failures
  // can make ARIA appear to listen and think without replying.
  useEffect(() => {
    setHeygenAvailable(false);
  }, []);

  // Provider selection:
  //  • HeyGen when configured AND voice is enabled (streaming-video provider owns audio).
  //  • R3F when WebGL is available and reduced-motion is off.
  //  • SVG otherwise.
  const provider = useMemo<AvatarProvider>(() => {
    if (typeof window === "undefined") return getAvatarProvider("svg");
    if (voiceOn && heygenAvailable) return getAvatarProvider("heygen");
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let webgl = false;
    try {
      const c = document.createElement("canvas");
      webgl = !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch { webgl = false; }
    return reduced || !webgl ? getAvatarProvider("svg") : getAvatarProvider("readyplayerme");
  }, [voiceOn, heygenAvailable]);
  const usingHeygen = provider.id === "heygen";
  const { events } = useEventStream({ limit: 25 });

  const playNext = useCallback(() => {
    if (paused) { playingRef.current = false; return; }
    const next = queueRef.current.shift();
    setQueueDepth(queueRef.current.length);
    if (!next) {
      playingRef.current = false;
      setCurrent(null);
      setState("idle");
      return;
    }
    playingRef.current = true;
    setCurrent(next);
    lastLineRef.current = next;
    const text = ar ? next.text_ar : next.text_en;

    if (!voiceOn) {
      // Silent narration mode: still show ARIA speaking with timed amplitude.
      setState("speaking");
      const dur = Math.max(2200, Math.min(7500, text.length * 70));
      const start = performance.now();
      let raf = 0;
      const tick = (t: number) => {
        const elapsed = t - start;
        if (elapsed >= dur) {
          setAmp(0);
          playNext();
          return;
        }
        // synthetic mouth movement
        setAmp(0.25 + 0.3 * Math.abs(Math.sin(elapsed / 110)));
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      handleRef.current = {
        promise: Promise.resolve(),
        stop: () => { cancelAnimationFrame(raf); setAmp(0); },
      };
      return;
    }

    if (usingHeygen) {
      // HeyGen owns audio + lip-sync end-to-end. Hand off the turn and
      // wait for `onSpeechEnd` from the provider before draining the queue.
      setState("speaking");
      setSpeakTurn({ id: next.id, text, lang: detectLang(text) });
      handleRef.current = {
        promise: Promise.resolve(),
        stop: () => setSpeakTurn(null),
      };
      return;
    }

    setState("thinking");
    const handle = speakAs(next.speaker, {
      text,
      lang: detectLang(text),
      onStart: () => setState("speaking"),
      onAmplitude: setAmp,
    });
    handleRef.current = handle;
    handle.promise
      .catch(() => { /* swallow — fall through to next */ })
      .finally(() => { playNext(); });
  }, [ar, voiceOn, paused, usingHeygen]);

  // HeyGen drain — when the streaming-video provider finishes a turn, advance.
  const handleHeygenEnd = useCallback((id: string) => {
    setSpeakTurn((cur) => (cur?.id === id ? null : cur));
    playNext();
  }, [playNext]);
  const handleHeygenErr = useCallback((id: string, _msg: string) => {
    setSpeakTurn((cur) => (cur?.id === id ? null : cur));
    playNext();
  }, [playNext]);

  const enqueue = useCallback((line: QueuedLine) => {
    queueRef.current.push(line);
    setQueueDepth(queueRef.current.length);
    if (!playingRef.current && !paused) playNext();
  }, [playNext, paused]);

  // SILENCE BY DEFAULT: agents never speak unprompted. They speak ONLY
  // when the executive taps an agent avatar, presses the Briefing button,
  // or invokes the imperative `window.aria.speak(...)` API. Critical
  // incidents still escalate to ARIA herself so safety alerts are never
  // missed.
  useEffect(() => {
    if (!events.length) return;
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      for (const row of events) seenRef.current.add(row.id);
      return;
    }
    for (const row of [...events].reverse()) {
      if (seenRef.current.has(row.id)) continue;
      seenRef.current.add(row.id);
      if (row.topic.startsWith("system.heartbeat") || row.topic.startsWith("runtime.tick")) continue;
      const line = narrateEvent(row);
      if (line.tone !== "critical") continue; // only critical incidents speak unprompted


      const compose = (lang: "ar" | "en") => {
        const action = lang === "ar" ? line.action_ar : line.action_en;
        const body = lang === "ar" ? line.text_ar : line.text_en;
        const result = lang === "ar" ? line.result_ar : line.result_en;
        return [action, body, result].filter(Boolean).join(" — ");
      };
      const humanId = narratorAgentToHumanId(line.agent);
      const speaker = findHuman(humanId) ?? ARIA;
      enqueue({
        id: row.id,
        text_ar: compose("ar"),
        text_en: compose("en"),
        speaker,
      });
    }
  }, [events, enqueue]);

  // Imperative API for user-initiated speech (Executive Briefing button,
  // agent selection, mic answer, presentation mode). No auto-greeting.
  useEffect(() => {
    const api = {
      speak: (turn: { id?: string; text_ar: string; text_en: string; speaker?: DigitalHumanSpec }) => {
        enqueue({
          id: turn.id ?? `manual-${Date.now()}`,
          text_ar: turn.text_ar,
          text_en: turn.text_en,
          speaker: turn.speaker ?? ARIA,
        });
      },
      stop: () => {
        handleRef.current?.stop();
        handleRef.current = null;
        queueRef.current = [];
        setQueueDepth(0);
        setCurrent(null);
        setState("idle");
        setAmp(0);
      },
      /** Open the mic for a Q&A directed at this Digital Human (defaults to ARIA). */
      ask: (speaker?: DigitalHumanSpec) => {
        // Enable voice playback so the spoken answer is audible.
        setVoiceOn(true);
        listener.start(speaker ?? ARIA);
      },
      stopListening: () => listener.stop(),
    };
    (window as unknown as { aria?: typeof api }).aria = api;

    // First-gesture unlock — browsers block audio playback before a user
    // interaction. Keep the dock visible immediately; first tap only unlocks voice.
    const hour = new Date().getHours();
    const greet_ar = hour < 12 ? "صباح الخير" : "مساء الخير";
    const greet_en = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    let unlocked = false;
    const unlock = () => {
      if (unlocked) return;
      unlocked = true;
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
      window.removeEventListener("touchstart", unlock, true);
      setVoiceOn(true);
      welcomeStartedRef.current = true;
      api.speak({
        id: `welcome-${Date.now()}`,
        text_ar: `${greet_ar}. أنا آريا، مساعدتك التنفيذية في نكسيوس. تفضّل بسؤالك.`,
        text_en: `${greet_en}. I'm ARIA, your executive AI for NEXIOS. Go ahead — ask me anything.`,
        speaker: ARIA,
      });
      setRevealed(true);
      // NOTE: we do NOT auto-open the microphone here. Many runtimes (Lovable
      // preview iframe, embedded contexts without `allow="microphone"`,
      // mobile Safari before a tap on a mic affordance) reject getUserMedia
      // with NotAllowedError, which would surface a scary red error on the
      // very first frame of the dock. The user opens the mic explicitly by
      // tapping the mic button — `ask`/`speak` work without it.
    };
    window.addEventListener("pointerdown", unlock, true);
    window.addEventListener("keydown", unlock, true);
    window.addEventListener("touchstart", unlock, true);

    // Auto-greet on mount: try immediately; if blocked, first gesture retries.
    try { sessionStorage.removeItem("nexus.audio-gesture"); } catch { /* noop */ }
    const autoTimer: number | undefined = window.setTimeout(() => unlock(), 250);

    return () => {
      if (autoTimer) window.clearTimeout(autoTimer);
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
      window.removeEventListener("touchstart", unlock, true);
      delete (window as unknown as { aria?: typeof api }).aria;
    };
  }, [enqueue, listener]);

  const toggleVoice = () => {
    setVoiceOn(v => {
      const nv = !v;
      if (!nv) {
        handleRef.current?.stop();
        handleRef.current = null;
      }
      setAriaLiveText(nv ? (ar ? "الصوت مفعل" : "Voice on") : (ar ? "الصوت مكتوم" : "Voice muted"));
      return nv;
    });
  };

  const playWelcome = useCallback(() => {
    const api = (window as unknown as { aria?: { speak: (t: { id?: string; text_ar: string; text_en: string; speaker?: DigitalHumanSpec }) => void } }).aria;
    if (!api) return;
    // Stop any current line so the welcome plays cleanly.
    handleRef.current?.stop();
    handleRef.current = null;
    setVoiceOn(true);
    setAriaLiveText(ar ? "جارٍ تشغيل الترحيب" : "Playing welcome");
    const hour = new Date().getHours();
    const greet_ar = hour < 12 ? "صباح الخير" : "مساء الخير";
    const greet_en = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    api.speak({
      id: `welcome-${Date.now()}`,
      text_ar: `${greet_ar}. أنا آريا، مساعدتك التنفيذية في نكسيوس. تفضّل بسؤالك.`,
      text_en: `${greet_en}. I'm ARIA, your executive AI for NEXIOS. Go ahead — ask me anything.`,
      speaker: ARIA,
    });
  }, [ar]);

  const skip = () => {
    handleRef.current?.stop();
    handleRef.current = null;
  };

  const togglePause = () => {
    setPaused(p => {
      const np = !p;
      if (np) {
        // pause: stop current playback but keep queue + current line
        handleRef.current?.stop();
        handleRef.current = null;
        setState("idle");
      } else {
        // resume: re-enqueue current line at the head if it exists
        if (current) queueRef.current.unshift(current);
        setTimeout(() => playNext(), 0);
      }
      return np;
    });
  };

  const replay = () => {
    const last = lastLineRef.current;
    if (!last) return;
    handleRef.current?.stop();
    handleRef.current = null;
    queueRef.current.unshift(last);
    if (!playingRef.current && !paused) playNext();
  };

  const stopAll = () => {
    handleRef.current?.stop();
    handleRef.current = null;
    queueRef.current = [];
    setQueueDepth(0);
    setCurrent(null);
    setState("idle");
    setAmp(0);
  };

  const askTyped = async (question: string) => {
    const q = question.trim();
    if (!q || typedLoading) return;
    setTypedQuestion("");
    setTypedLoading(true);
    setTypedError(null);
    // Barge-in: cut any prior ARIA voice the moment the user sends again.
    ariaSpeech.stop();
    // Route reply audio exclusively through useAriaSpeech (ElevenLabs → browser fallback).
    // Silencing the internal queue speaker prevents double-voicing while keeping the
    // visual pulse animation via the silent-narration path in playNext().
    setVoiceOn(false);
    handleRef.current?.stop();
    handleRef.current = null;
    queueRef.current = [];
    setQueueDepth(0);
    setState("thinking");
    try {
      const lang = /[\u0600-\u06FF]/.test(q) ? "ar" : "en";
      const w = window as unknown as {
        __aria_context?: {
          get: () => {
            page: { path: string; title?: string; section?: string; filters?: Record<string, unknown>; selected?: Record<string, unknown> | null };
            widgets: { id: string; kind: string; label: string; value?: unknown; hint?: string }[];
            history: { role: "user" | "assistant"; text: string; ts: string; anchors?: { kind: string; id: string; label?: string }[] }[];
            locale: "ar" | "en" | "mixed";
          };
          pushTurn: (t: { role: "user" | "assistant"; text: string; page?: string; anchors?: { kind: string; id: string; label?: string }[] }) => void;
        };
      };
      const snap = w.__aria_context?.get?.();
      const context = snap
        ? {
            page: snap.page,
            widgets: snap.widgets,
            anchors: snap.history.flatMap((t) => t.anchors ?? []).slice(-12),
            locale: snap.locale,
          }
        : undefined;
      const history = snap?.history?.slice(-8);
      w.__aria_context?.pushTurn({ role: "user", text: q, page: snap?.page?.path });
      const r = await fetch("/api/public/aria-ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, lang, context, history }),
      });
      const j = (await r.json().catch(() => ({}))) as { text_ar?: string; text_en?: string; error?: string };
      if (!r.ok) throw new Error(j.error || `ask_${r.status}`);
      const text_ar = j.text_ar || j.text_en || "تم استلام سؤالك، لكن لم يصل نص الرد. أعد المحاولة.";
      const text_en = j.text_en || j.text_ar || "I received your question, but the reply text was empty. Please retry.";
      w.__aria_context?.pushTurn({ role: "assistant", text: lang === "ar" ? text_ar : text_en, page: snap?.page?.path });
      enqueue({
        id: `typed-${Date.now()}`,
        text_ar,
        text_en,
        speaker: ARIA,
      });
      // Speak the reply aloud (barge-in-safe, mute-aware, fallback-safe).
      void ariaSpeech.speak(stripForSpeech(lang === "ar" ? text_ar : text_en));
    } catch {
      setState("idle");
      setTypedError(ar ? "تعذّر اتصال آريا الآن — أعد المحاولة." : "ARIA could not connect — please retry.");
    } finally {
      setTypedLoading(false);
    }
  };

  useEffect(() => () => { handleRef.current?.stop(); ariaSpeech.stop(); }, [ariaSpeech]);


  // Reveal the dock UI once the opening welcome line has finished playing.
  // Until then ARIA's voice is heard but no avatar / transcript is shown,
  // keeping the hero visually pristine on first load.
  useEffect(() => {
    if (revealed) return;
    if (welcomeStartedRef.current && state === "idle" && current === null) {
      // Tiny delay so the speaking → idle transition doesn't flash.
      const t = window.setTimeout(() => setRevealed(true), 250);
      return () => window.clearTimeout(t);
    }
  }, [state, current, revealed]);

  if (!revealed) {
    // Audio-only intro: render the live region for screen readers but no UI.
    return (
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {ariaLiveText}
      </div>
    );
  }

  if (hidden) {
  return (
    <button
        type="button"
        onClick={() => setHidden(false)}
        className="fixed bottom-4 right-4 z-[60] h-14 w-14 rounded-full border border-cyan-400/40 bg-[#061A2E]/95 backdrop-blur-xl shadow-[0_0_24px_rgba(0,212,255,0.45)] overflow-hidden hover:scale-105 transition-transform"
        aria-label={ar ? "إظهار آريا" : "Show ARIA"}
      >
        <img src={ariaHologram.url} alt="ARIA" className="absolute inset-0 h-full w-full object-cover object-top" draggable={false} />
      </button>
  );
}

  const Render = provider.Render;
  const displayLine = current ?? lastLineRef.current;

  return (
    <div
      className={cn(
        "fixed z-[60] transition-all duration-300",
        // Mobile: expanded → centered horizontally near bottom. Tablet+: same centered layout.
        "bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 w-[min(560px,calc(100vw-1.5rem))]",
        "rounded-2xl border border-cyan-400/25 bg-[#061A2E]/90 backdrop-blur-2xl",
        "shadow-[0_20px_60px_-20px_rgba(0,212,255,0.45)]",
        minimized ? "p-2.5" : "p-3.5",
      )}
      dir={ar ? "rtl" : "ltr"}
      role="complementary"
      aria-label={ar ? "آريا — المساعد التنفيذي" : "ARIA — Executive AI"}
    >
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {ariaLiveText}
      </div>
      <div className="flex items-center gap-4">
        {usingHeygen ? (
          <Render
            spec={displayLine?.speaker ?? ARIA}
            state={state}
            size={minimized ? 36 : 144}
            mouthAmplitude={amp}
            ambient
            ar={ar}
            speakTurn={speakTurn}
            onSpeechEnd={handleHeygenEnd}
            onSpeechError={handleHeygenErr}
          />
        ) : (
          <div className="relative">
            {ariaSpeech.speaking && !ariaSpeech.muted && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-full animate-pulse"
                style={{
                  boxShadow:
                    "0 0 32px 6px rgba(58,232,255,0.55), inset 0 0 22px rgba(0,212,255,0.35)",
                }}
              />
            )}
            <HologramFace state={state} amp={amp} size={minimized ? 36 : 144} ar={ar} />
          </div>
        )}

        {!minimized && (
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-300/80 truncate">
                  {ar ? (displayLine?.speaker.title_ar ?? ARIA.title_ar) : (displayLine?.speaker.title_en ?? ARIA.title_en)}
                </div>
                <div className="text-sm text-white font-medium leading-tight truncate">
                  {ar ? (displayLine?.speaker.name_ar ?? ARIA.name_ar) : (displayLine?.speaker.name_en ?? ARIA.name_en)}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  className={cn(
                    "h-7 w-7 hover:bg-white/10",
                    listener.listening ? "text-rose-300 hover:text-rose-200" : "text-cyan-200 hover:text-white",
                  )}
                  onClick={() => {
                    if (!listener.listening) setVoiceOn(true);
                    listener.toggle(displayLine?.speaker ?? ARIA);
                  }}
                  aria-label={listener.listening ? (ar ? "إيقاف الاستماع" : "Stop listening") : (ar ? "اسأل الوكيل" : "Ask agent")}
                  title={listener.listening ? (ar ? "إيقاف الاستماع" : "Stop listening") : (ar ? "اسأل" : "Ask")}
                >
                  {listener.thinking
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : listener.listening
                      ? <MicOff className="h-3.5 w-3.5" />
                      : <Mic className="h-3.5 w-3.5" />}
                </Button>
                {/* Audio controls intentionally removed for executive minimalism.
                    Voice playback is auto-managed by the listener pipeline. */}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10"
                  onClick={() => setMinimized(true)}
                  aria-label={ar ? "تصغير" : "Minimize"}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
                <button
                  type="button"
                  onClick={() => setHidden(true)}
                  aria-label={ar ? "إخفاء آريا" : "Dismiss ARIA"}
                  title={ar ? "إخفاء" : "Dismiss"}
                  className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#3AE8FF]/70 bg-gradient-to-br from-[#3AE8FF]/40 via-[#00D4FF]/25 to-[#061A2E] shadow-[0_0_18px_rgba(58,232,255,0.7),inset_0_0_10px_rgba(58,232,255,0.4)] transition hover:scale-110 hover:shadow-[0_0_28px_rgba(58,232,255,0.95)]"
                >
                  <span aria-hidden className="absolute inset-1 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.85),rgba(58,232,255,0.05)_60%,transparent_72%)]" />
                  <X className="relative h-3.5 w-3.5 text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.9)]" />
                </button>
              </div>
            </div>

            <AriaStatusStrip
              className="mt-2"
              state={state}
              voiceOn={voiceOn}
              queueDepth={queueDepth}
              listening={listener.listening}
              thinking={listener.thinking}
              ar={ar}
            />



            <div className="mt-2 text-[13px] leading-relaxed text-white/85 min-h-[2.6em]">
              {listener.listening || listener.thinking
                ? (
                  <span className="text-cyan-200/90">
                    {listener.thinking
                      ? (ar ? "أحلّل سؤالك…" : "Analyzing your question…")
                      : listener.partial
                        ? listener.partial
                        : (ar ? "أستمع إليك…" : "Listening…")}
                  </span>
                )
                : current
                  ? (ar ? current.text_ar : current.text_en)
                  : displayLine
                    ? (ar ? displayLine.text_ar : displayLine.text_en)
                  : listener.error
                    ? <span className="text-rose-300/90">{listener.error}</span>
                    : (ar ? "اضغط الميكروفون لتسألني أو أي وكيل. أصمت حتى تطلب." : "Tap the mic to ask me or any agent. Silent until asked.")}
            </div>

            <form
              className="mt-2 flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void askTyped(typedQuestion);
              }}
            >
              <textarea
                value={typedQuestion}
                onChange={(e) => setTypedQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void askTyped(typedQuestion);
                  }
                }}
                rows={1}
                dir="auto"
                disabled={typedLoading}
                aria-label={ar ? "اكتب سؤالاً لآريا" : "Type a question for ARIA"}
                placeholder={ar ? "اكتب سؤالك لآريا…" : "Type your question to ARIA…"}
                className="min-h-9 max-h-24 flex-1 resize-none rounded-lg border border-cyan-300/25 bg-[#04111F]/80 px-3 py-2 text-[12px] text-white outline-none transition placeholder:text-white/35 focus:border-cyan-300/70 focus:shadow-[0_0_16px_rgba(58,232,255,0.35)]"
              />
              <Button
                type="submit"
                size="icon"
                variant="ghost"
                disabled={typedLoading || !typedQuestion.trim()}
                className="h-9 w-9 shrink-0 border border-cyan-300/35 text-cyan-200 hover:bg-cyan-300/10 hover:text-white disabled:opacity-40"
                aria-label={ar ? "إرسال السؤال" : "Send question"}
              >
                {typedLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowUp className="h-3.5 w-3.5" />}
              </Button>
            </form>

            {typedError && (
              <div className="mt-1.5 text-[11px] text-rose-300/90" role="status">
                {typedError}
              </div>
            )}

            {displayLine && (
              <div className="mt-2 truncate text-[10px] text-white/55">
                {ar ? displayLine.speaker.name_ar : displayLine.speaker.name_en}
              </div>
            )}
          </div>
        )}

        {minimized && (
          <>
            <AriaStatusStrip
              className="flex-1 min-w-0 self-center"
              state={state}
              voiceOn={voiceOn}
              queueDepth={queueDepth}
              listening={listener.listening}
              thinking={listener.thinking}
              ar={ar}
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10 self-center"
              onClick={() => setMinimized(false)}
              aria-label={ar ? "توسيع" : "Expand"}
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
