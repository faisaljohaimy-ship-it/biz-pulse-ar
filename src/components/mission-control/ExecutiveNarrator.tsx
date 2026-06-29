/**
 * Executive Narrator panel — the Living AI layer for Mission Control.
 *
 * Subscribes to the real `enterprise_events` stream, maps each row to a
 * bilingual human explanation with agent attribution, and renders an
 * AI-conducted timeline. Optional ARIA voice speaks new lines via the
 * server `ariaSpeak` function (Lovable AI Gateway TTS).
 *
 * Strictly real data: if no events exist, the panel says so plainly. No
 * fabricated incidents, no mocked narration.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Mic, MicOff, Radio, AlertTriangle, CheckCircle2, Activity, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEventStream } from "@/lib/events/useEventStream";
import { narrateEvents, type NarratorLine, type NarratorTone } from "@/lib/narrator/event-narrator";
import { ariaSpeak } from "@/lib/narrator/tts.functions";
import { FadeIn } from "./motion";

const TONE_STYLE: Record<NarratorTone, { ring: string; text: string; dot: string; bg: string }> = {
  info:     { ring: "border-cyan-400/30",    text: "text-cyan-200",    dot: "bg-cyan-300",    bg: "bg-cyan-400/5"    },
  success:  { ring: "border-emerald-400/30", text: "text-emerald-200", dot: "bg-emerald-300", bg: "bg-emerald-400/5" },
  warn:     { ring: "border-amber-400/30",   text: "text-amber-200",   dot: "bg-amber-300",   bg: "bg-amber-400/5"   },
  critical: { ring: "border-rose-400/40",    text: "text-rose-200",    dot: "bg-rose-400",    bg: "bg-rose-400/5"    },
};

function ToneIcon({ tone }: { tone: NarratorTone }) {
  if (tone === "critical") return <AlertTriangle className="h-3.5 w-3.5" />;
  if (tone === "success") return <CheckCircle2 className="h-3.5 w-3.5" />;
  if (tone === "warn") return <AlertTriangle className="h-3.5 w-3.5" />;
  return <Activity className="h-3.5 w-3.5" />;
}

function formatTime(ts: number, ar: boolean): string {
  const d = new Date(ts);
  return d.toLocaleTimeString(ar ? "ar-SA" : "en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function ExecutiveNarrator({ ar }: { ar: boolean }) {
  const { events, loading, error } = useEventStream({ limit: 25 });
  const lines = useMemo<NarratorLine[]>(() => narrateEvents(events), [events]);

  const [voiceOn, setVoiceOn] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const spokenIds = useRef<Set<string>>(new Set());
  const speak = useServerFn(ariaSpeak);

  // Pre-seed: don't read out historical hydration; only narrate new arrivals.
  useEffect(() => {
    if (!lines.length) return;
    if (spokenIds.current.size === 0) {
      lines.forEach((l) => spokenIds.current.add(l.id));
    }
  }, [lines]);

  // Speak the newest unspoken line when voice is enabled.
  useEffect(() => {
    if (!voiceOn || !lines.length) return;
    const newest = lines[0];
    if (spokenIds.current.has(newest.id)) return;
    spokenIds.current.add(newest.id);

    let cancelled = false;
    (async () => {
      try {
        setSpeakingId(newest.id);
        const text = ar ? newest.text_ar : newest.text_en;
        const result = await speak({ data: { text, voice: "alloy" } });
        if (cancelled) return;
        const url = `data:${result.mime};base64,${result.audio_base64}`;
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => setSpeakingId(null);
        audio.onerror = () => setSpeakingId(null);
        await audio.play().catch(() => setSpeakingId(null));
      } catch {
        setSpeakingId(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [voiceOn, lines, ar, speak]);

  function toggleVoice() {
    if (voiceOn && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setSpeakingId(null);
    }
    setVoiceOn((v) => !v);
  }

  return (
    <div className="rounded-2xl border border-cyan-400/15 bg-white/[0.02] backdrop-blur-xl p-5 md:p-7">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative h-9 w-9 rounded-lg bg-cyan-400/15 border border-cyan-400/40 grid place-items-center shrink-0">
            <Radio className="h-4 w-4 text-cyan-300" />
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="text-sm text-white font-medium truncate">
              {ar ? "السرد التنفيذي المباشر" : "Live Executive Narrator"}
            </div>
            <div className="text-[11px] text-cyan-200/70 truncate">
              {ar ? "تشرح آريا كل عملية حقيقية لحظة وقوعها" : "ARIA explains every real operation as it happens"}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={toggleVoice}
          className={cn(
            "inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] px-3 py-2 rounded-full border transition",
            voiceOn
              ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-100"
              : "border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06]"
          )}
          aria-pressed={voiceOn}
          aria-label={ar ? "تفعيل صوت آريا" : "Toggle ARIA voice"}
        >
          {voiceOn ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
          {voiceOn ? (ar ? "الصوت مفعّل" : "Voice On") : (ar ? "تشغيل الصوت" : "Enable Voice")}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-400/30 bg-rose-400/5 p-4 text-sm text-rose-200">
          {ar ? "تعذّر الاتصال ببث الأحداث." : "Could not connect to the event stream."}
          <div className="text-xs text-rose-200/70 mt-1">{error}</div>
        </div>
      )}

      {!error && loading && (
        <div className="text-sm text-white/60 py-6 text-center">
          {ar ? "آريا تنصت إلى البث التشغيلي…" : "ARIA is listening to the operational stream…"}
        </div>
      )}

      {!error && !loading && lines.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 text-sm text-white/70">
          {ar
            ? "لا توجد أحداث تشغيلية مسجّلة الآن. سأبدأ السرد فور وصول أول حدث حقيقي."
            : "No operational events recorded right now. I will begin narration the moment the first real event arrives."}
        </div>
      )}

      {!error && lines.length > 0 && (
        <ol className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1" aria-live="polite">
          {lines.map((line, i) => {
            const s = TONE_STYLE[line.tone];
            const isSpeaking = speakingId === line.id;
            const isNewest = i === 0;
            return (
              <li key={line.id}>
                <FadeIn delay={Math.min(i, 6) * 0.04}>
                  <div
                    className={cn(
                      "rounded-xl border p-3.5 transition-all",
                      s.ring,
                      s.bg,
                      isNewest && "ring-1 ring-cyan-400/30"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn("mt-0.5 h-7 w-7 rounded-lg grid place-items-center border", s.ring, s.text)}>
                        <ToneIcon tone={line.tone} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] uppercase tracking-[0.18em] text-white/60">
                            {ar ? line.agent_name_ar : line.agent_name_en}
                          </span>
                          <span className="text-[10px] text-white/40 tabular-nums">
                            {formatTime(line.ts, ar)}
                          </span>
                          {isSpeaking && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-cyan-200">
                              <Mic className="h-3 w-3 animate-pulse" />
                              {ar ? "تتحدث الآن" : "speaking"}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-sm text-white/90 leading-relaxed">
                          {ar ? line.text_ar : line.text_en}
                        </div>
                        {(ar ? line.reason_ar : line.reason_en) && (
                          <div className="mt-1 text-[12px] text-white/55">
                            {ar ? line.reason_ar : line.reason_en}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </FadeIn>
                {i < lines.length - 1 && (
                  <div className="flex justify-start ps-3 my-1">
                    <ChevronDown className="h-3 w-3 text-white/15" aria-hidden />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
