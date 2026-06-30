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
import { ChevronDown, ChevronUp, Volume2, VolumeX, Sparkles, X, Pause, Play, RotateCcw, SkipForward, Square, Mic, MicOff, Loader2, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGatewayListener as useAgentListener } from "@/lib/digital-humans/gateway-listener";
import { HologramFace } from "@/components/digital-humans/HologramFace";
import { AriaStatusStrip } from "@/components/digital-humans/AriaStatusStrip";
import ariaHologram from "@/assets/aria-hologram.png.asset.json";



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
  const lastLineRef = useRef<QueuedLine | null>(null);
  const queueRef = useRef<QueuedLine[]>([]);
  const playingRef = useRef(false);
  const handleRef = useRef<SpeakHandle | null>(null);
  const seenRef = useRef<Set<string>>(new Set());
  const hydratedRef = useRef(false);
  const listener = useAgentListener();

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

  // Probe HeyGen availability once. When configured + voice is on, HeyGen
  // owns audio + lip-sync. Otherwise we keep the existing R3F/SVG + TTS path.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/heygen/status")
      .then((r) => r.json() as Promise<{ configured?: boolean }>)
      .then((j) => { if (!cancelled) setHeygenAvailable(!!j.configured); })
      .catch(() => { if (!cancelled) setHeygenAvailable(false); });
    return () => { cancelled = true; };
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

    // First-gesture unlock — browsers block both TTS audio playback and
    // getUserMedia() before a user interaction. We attach a one-shot
    // pointer/keyboard listener so the *first* tap anywhere triggers the
    // greeting AND opens the mic. From that moment ARIA listens continuously.
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
      api.speak({
        id: `welcome-${Date.now()}`,
        text_ar: `${greet_ar}. أنا آريا، مساعدتك التنفيذية في نكسيوس. تفضّل بسؤالك.`,
        text_en: `${greet_en}. I'm ARIA, your executive AI for NEXIOS. Go ahead — ask me anything.`,
        speaker: ARIA,
      });
      // Open mic ~1.2s after greeting starts so playback isn't cut by the
      // listener's `aria.stop()`. The listener pauses recording during TTS
      // because echo/feedback would otherwise re-trigger STT.
      setTimeout(() => { try { listener.start(ARIA); } catch { /* mic unavailable */ } }, 1200);
    };
    window.addEventListener("pointerdown", unlock, true);
    window.addEventListener("keydown", unlock, true);
    window.addEventListener("touchstart", unlock, true);

    // Auto-greet on mount: try immediately so ARIA welcomes the user the
    // moment they enter the system. If the browser blocks autoplay (no prior
    // user gesture), the pointer/key/touch listeners above will fire `unlock`
    // on the very first interaction as a safety net.
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

  useEffect(() => () => handleRef.current?.stop(), []);

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
            spec={current?.speaker ?? ARIA}
            state={state}
            size={minimized ? 72 : 288}
            mouthAmplitude={amp}
            ambient
            ar={ar}
            speakTurn={speakTurn}
            onSpeechEnd={handleHeygenEnd}
            onSpeechError={handleHeygenErr}
          />
        ) : (
          <HologramFace state={state} amp={amp} size={minimized ? 72 : 288} ar={ar} />
        )}
        {!minimized && (
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-300/80 truncate">
                  {ar ? (current?.speaker.title_ar ?? ARIA.title_ar) : (current?.speaker.title_en ?? ARIA.title_en)}
                </div>
                <div className="text-sm text-white font-medium leading-tight truncate">
                  {ar ? (current?.speaker.name_ar ?? ARIA.name_ar) : (current?.speaker.name_en ?? ARIA.name_en)}
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
                    listener.toggle(current?.speaker ?? ARIA);
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
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-cyan-200 hover:text-white hover:bg-white/10"
                  onClick={toggleVoice}
                  aria-label={voiceOn ? (ar ? "كتم الصوت" : "Mute") : (ar ? "تفعيل الصوت" : "Enable voice")}
                  title={voiceOn ? (ar ? "كتم" : "Mute") : (ar ? "تشغيل الصوت" : "Voice on")}
                >
                  {voiceOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-amber-200 hover:text-white hover:bg-white/10"
                  onClick={playWelcome}
                  aria-label={ar ? "إعادة الترحيب" : "Replay welcome"}
                  title={ar ? "تشغيل الترحيب" : "Play welcome"}
                >
                  <Megaphone className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10"
                  onClick={() => setMinimized(true)}
                  aria-label={ar ? "تصغير" : "Minimize"}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-white/60 hover:text-white hover:bg-white/10"
                  onClick={() => setHidden(true)}
                  aria-label={ar ? "إخفاء" : "Hide"}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
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
                  : listener.error
                    ? <span className="text-rose-300/90">{listener.error}</span>
                    : (ar ? "اضغط الميكروفون لتسألني أو أي وكيل. أصمت حتى تطلب." : "Tap the mic to ask me or any agent. Silent until asked.")}
            </div>

            <div className="mt-2 flex items-center gap-1 text-white/70">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 hover:bg-white/10"
                onClick={togglePause}
                aria-label={paused ? (ar ? "استئناف" : "Resume") : (ar ? "إيقاف مؤقت" : "Pause")}
                title={paused ? (ar ? "استئناف" : "Resume") : (ar ? "إيقاف مؤقت" : "Pause")}
              >
                {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 hover:bg-white/10 disabled:opacity-40"
                onClick={replay}
                disabled={!lastLineRef.current}
                aria-label={ar ? "إعادة التشغيل" : "Replay"}
                title={ar ? "إعادة التشغيل" : "Replay"}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 hover:bg-white/10 disabled:opacity-40"
                onClick={skip}
                disabled={!current}
                aria-label={ar ? "تخطي المتحدث" : "Skip speaker"}
                title={ar ? "تخطي" : "Skip"}
              >
                <SkipForward className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 hover:bg-white/10 disabled:opacity-40"
                onClick={stopAll}
                disabled={!current && queueRef.current.length === 0}
                aria-label={ar ? "إيقاف" : "Stop"}
                title={ar ? "إيقاف" : "Stop"}
              >
                <Square className="h-3.5 w-3.5" />
              </Button>
              {current && (
                <span className="ms-auto truncate text-[10px] text-white/55">
                  {ar ? current.speaker.name_ar : current.speaker.name_en}
                </span>
              )}
            </div>
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
