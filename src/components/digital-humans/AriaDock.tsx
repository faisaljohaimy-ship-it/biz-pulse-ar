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
import { getAvatarProvider, type AvatarProvider } from "@/lib/digital-humans/avatar-provider";
// Side-effect imports — register both providers so getAvatarProvider can resolve them.
import "@/components/digital-humans/DigitalHumanAvatar";
import "@/components/digital-humans/r3f/R3FAvatarProvider";
import { useEventStream } from "@/lib/events/useEventStream";
import { narrateEvent } from "@/lib/narrator/event-narrator";
import { speakAs, detectLang, type SpeakHandle } from "@/lib/digital-humans/aria-voice";
import { narratorAgentToHumanId } from "@/lib/digital-humans/voice-profiles";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Volume2, VolumeX, Sparkles, X, Pause, Play, RotateCcw, SkipForward, Square } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const lastLineRef = useRef<QueuedLine | null>(null);
  const queueRef = useRef<QueuedLine[]>([]);
  const playingRef = useRef(false);
  const handleRef = useRef<SpeakHandle | null>(null);
  const seenRef = useRef<Set<string>>(new Set());
  const hydratedRef = useRef(false);

  // Choose the 3D R3F provider when WebGL is available and reduced-motion is off;
  // otherwise fall back to the SVG portrait. Resolved once per session.
  const provider = useMemo<AvatarProvider>(() => {
    if (typeof window === "undefined") return getAvatarProvider("svg");
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let webgl = false;
    try {
      const c = document.createElement("canvas");
      webgl = !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch { webgl = false; }
    return reduced || !webgl ? getAvatarProvider("svg") : getAvatarProvider("readyplayerme");
  }, []);
  const { events } = useEventStream({ limit: 25 });

  const playNext = useCallback(() => {
    if (paused) { playingRef.current = false; return; }
    const next = queueRef.current.shift();
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
  }, [ar, voiceOn, paused]);

  const enqueue = useCallback((line: QueuedLine) => {
    queueRef.current.push(line);
    if (!playingRef.current && !paused) playNext();
  }, [playNext, paused]);

  // SILENCE BY DEFAULT (Phase 8 Rule 1+2):
  // Do not narrate background events automatically. Only escalate to ARIA
  // when an event reaches CRITICAL severity. All other speech must be
  // explicitly invoked by the user (briefing button, mic, agent selection)
  // through the imperative window.aria API exposed below.
  useEffect(() => {
    if (!events.length) return;
    // First mount: mark every existing event as "seen" so we never narrate
    // history on page load.
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
        setCurrent(null);
        setState("idle");
        setAmp(0);
      },
    };
    (window as unknown as { aria?: typeof api }).aria = api;
    return () => { delete (window as unknown as { aria?: typeof api }).aria; };
  }, [enqueue]);

  const toggleVoice = () => {
    setVoiceOn(v => {
      const nv = !v;
      if (!nv) {
        handleRef.current?.stop();
        handleRef.current = null;
      }
      return nv;
    });
  };

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
        className="fixed bottom-4 end-4 z-[60] h-12 w-12 rounded-full border border-cyan-400/40 bg-[#061A2E]/95 backdrop-blur-xl shadow-[0_0_24px_rgba(0,212,255,0.35)] flex items-center justify-center hover:scale-105 transition-transform"
        aria-label={ar ? "إظهار آريا" : "Show ARIA"}
      >
        <Sparkles className="h-5 w-5 text-cyan-300" />
      </button>
    );
  }

  const Render = provider.Render;

  return (
    <div
      className={cn(
        "fixed bottom-4 end-4 z-[60] w-[360px] max-w-[calc(100vw-1.5rem)]",
        "rounded-2xl border border-cyan-400/25 bg-[#061A2E]/90 backdrop-blur-2xl",
        "shadow-[0_20px_60px_-20px_rgba(0,212,255,0.45)]",
        "transition-all duration-300",
        minimized ? "p-2.5" : "p-3.5",
      )}
      dir={ar ? "rtl" : "ltr"}
      role="complementary"
      aria-label={ar ? "آريا — المساعد التنفيذي" : "ARIA — Executive AI"}
    >
      <div className="flex items-start gap-3">
        <Render
          spec={current?.speaker ?? ARIA}
          state={state}
          size={minimized ? 44 : 72}
          mouthAmplitude={amp}
          ambient
          ar={ar}
        />
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
              <div className="flex items-center gap-1 shrink-0">
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

            <div className="mt-2 text-[13px] leading-relaxed text-white/85 min-h-[2.6em]">
              {current
                ? (ar ? current.text_ar : current.text_en)
                : (ar ? "في وضع الصمت. لن أتحدث إلا عند الطلب أو عند حدث حرج." : "Silent by default. I speak only on request or on a critical incident.")}
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
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10 self-center ms-auto"
            onClick={() => setMinimized(false)}
            aria-label={ar ? "توسيع" : "Expand"}
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
