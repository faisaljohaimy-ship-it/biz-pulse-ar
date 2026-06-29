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
import { getAvatarProvider } from "@/lib/digital-humans/avatar-provider";
import { useEventStream } from "@/lib/events/useEventStream";
import { narrateEvent } from "@/lib/narrator/event-narrator";
import { speakAs, detectLang, type SpeakHandle } from "@/lib/digital-humans/aria-voice";
import { narratorAgentToHumanId } from "@/lib/digital-humans/voice-profiles";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Volume2, VolumeX, Sparkles, X } from "lucide-react";
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
  const [state, setState] = useState<DigitalHumanState>("idle");
  const [amp, setAmp] = useState(0);
  const [current, setCurrent] = useState<QueuedLine | null>(null);
  const queueRef = useRef<QueuedLine[]>([]);
  const playingRef = useRef(false);
  const handleRef = useRef<SpeakHandle | null>(null);
  const seenRef = useRef<Set<string>>(new Set());

  const provider = useMemo(() => getAvatarProvider("svg"), []);
  const { events } = useEventStream({ limit: 25 });

  const playNext = useCallback(() => {
    const next = queueRef.current.shift();
    if (!next) {
      playingRef.current = false;
      setCurrent(null);
      setState("idle");
      return;
    }
    playingRef.current = true;
    setCurrent(next);
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
  }, [ar, voiceOn]);

  const enqueue = useCallback((line: QueuedLine) => {
    queueRef.current.push(line);
    if (!playingRef.current) playNext();
  }, [playNext]);

  // Narrate new events as they arrive. Skip rows already narrated this
  // session and skip noisy housekeeping topics.
  useEffect(() => {
    if (!events.length) return;
    // events is newest-first; replay in chronological order.
    for (const row of [...events].reverse()) {
      if (seenRef.current.has(row.id)) continue;
      seenRef.current.add(row.id);
      if (row.topic.startsWith("system.heartbeat") || row.topic.startsWith("runtime.tick")) continue;
      const line = narrateEvent(row);
      // Compose action + result in plain language; never expose raw topic.
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

  // Welcome on first mount (only when voice is enabled mid-session).
  const greeted = useRef(false);
  useEffect(() => {
    if (greeted.current) return;
    greeted.current = true;
    enqueue({
      id: "aria-welcome",
      text_ar: "مرحبًا. أنا آريا، المساعد التنفيذي. أراقب العمليات الحية الآن.",
      text_en: "Welcome. I am ARIA, your Executive AI. Monitoring live operations now.",
      speaker: ARIA,
    });
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
                : (ar ? "جاهزة. أستمع لأحداث العمليات الحية." : "Standing by. Listening to live operations.")}
            </div>

            {current && (
              <div className="mt-1.5 flex items-center justify-between text-[10px] text-white/55">
                <span className="truncate">
                  {ar ? "بصوت" : "Voiced by"}: {ar ? current.speaker.name_ar : current.speaker.name_en}
                </span>
                <button
                  type="button"
                  onClick={skip}
                  className="text-cyan-300/80 hover:text-cyan-200 underline-offset-2 hover:underline"
                >
                  {ar ? "تخطي" : "Skip"}
                </button>
              </div>
            )}
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
