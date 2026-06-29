/**
 * Executive Narrator panel — the Living AI layer for Mission Control.
 *
 * Subscribes to the real `enterprise_events` stream, maps each row to a
 * bilingual human explanation with agent attribution, and renders an
 * AI-conducted timeline.
 *
 * Phase 3 — Executive Theater additions:
 *  • Story cards expand to reveal Action / Explanation / Result /
 *    Duration / Related workflow — every value comes from the row, never
 *    fabricated.
 *  • Replay button re-plays the most-recent story in sequence with voice.
 *  • Presentation Mode auto-narrates each new event without user input,
 *    one after the other, like a live operations briefing.
 *
 * Strictly real data: if no events exist, the panel says so plainly.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Mic, MicOff, Radio, AlertTriangle, CheckCircle2, Activity,
  ChevronDown, ChevronRight, Clock, GitBranch, PlayCircle, RotateCw, Presentation, Sparkles,
} from "lucide-react";
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

function formatDuration(ms: number | null, ar: boolean): string | null {
  if (ms == null) return null;
  if (ms < 1000) return ar ? `${ms} م.ث` : `${ms} ms`;
  const s = (ms / 1000).toFixed(2);
  return ar ? `${s} ث` : `${s} s`;
}

export function ExecutiveNarrator({ ar }: { ar: boolean }) {
  const { events, loading, error } = useEventStream({ limit: 25 });
  const lines = useMemo<NarratorLine[]>(() => narrateEvents(events), [events]);

  const [voiceOn, setVoiceOn] = useState(false);
  const [presentationOn, setPresentationOn] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const spokenIds = useRef<Set<string>>(new Set());
  const speak = useServerFn(ariaSpeak);

  /** Play one line through TTS; resolves when audio ends or fails. */
  const playLine = useCallback(async (line: NarratorLine): Promise<void> => {
    try {
      setSpeakingId(line.id);
      const text = ar ? line.text_ar : line.text_en;
      const result = await speak({ data: { text, voice: "alloy" } });
      const url = `data:${result.mime};base64,${result.audio_base64}`;
      const audio = new Audio(url);
      audioRef.current = audio;
      await audio.play().catch(() => undefined);
      await new Promise<void>((resolve) => {
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
      });
    } catch {
      // swallow — narration must never break the UI
    } finally {
      setSpeakingId((cur) => (cur === line.id ? null : cur));
    }
  }, [ar, speak]);

  // Pre-seed: don't read out historical hydration; only narrate new arrivals.
  useEffect(() => {
    if (!lines.length) return;
    if (spokenIds.current.size === 0) {
      lines.forEach((l) => spokenIds.current.add(l.id));
    }
  }, [lines]);

  // Speak the newest unspoken line when voice (or presentation) is enabled.
  useEffect(() => {
    if ((!voiceOn && !presentationOn) || !lines.length) return;
    const newest = lines[0];
    if (spokenIds.current.has(newest.id)) return;
    spokenIds.current.add(newest.id);

    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await playLine(newest);
    })();
    return () => { cancelled = true; };
  }, [voiceOn, presentationOn, lines, playLine]);

  // Presentation mode: when first toggled on, replay the most recent story
  // sequence (5 newest lines, oldest-first) like a live briefing.
  const presentationRunId = useRef(0);
  useEffect(() => {
    if (!presentationOn || !lines.length) return;
    const runId = ++presentationRunId.current;
    const sequence = [...lines.slice(0, 5)].reverse(); // oldest → newest
    (async () => {
      for (const line of sequence) {
        if (presentationRunId.current !== runId) return;
        spokenIds.current.add(line.id);
        await playLine(line);
        await new Promise((r) => setTimeout(r, 350));
      }
    })();
    return () => { presentationRunId.current++; };
    // Only restart the briefing when the user re-toggles presentation mode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presentationOn]);

  function stopAudio() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setSpeakingId(null);
  }

  function toggleVoice() {
    if (voiceOn) stopAudio();
    setVoiceOn((v) => !v);
  }

  function togglePresentation() {
    if (presentationOn) { stopAudio(); presentationRunId.current++; }
    setPresentationOn((v) => !v);
  }

  async function replayStory() {
    presentationRunId.current++;
    stopAudio();
    const sequence = [...lines.slice(0, 5)].reverse();
    for (const line of sequence) {
      spokenIds.current.add(line.id);
      await playLine(line);
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  return (
    <div className="relative rounded-2xl border border-cyan-400/15 bg-white/[0.02] backdrop-blur-xl p-5 md:p-7 overflow-hidden">
      {/* Ambient glow when presenting */}
      {presentationOn && (
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,212,255,0.10),transparent_60%)] animate-pulse" />
      )}

      <div className="relative flex items-center justify-between gap-3 mb-5 flex-wrap">
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

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={replayStory}
            disabled={!lines.length}
            className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] px-3 py-2 rounded-full border border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06] transition disabled:opacity-40"
            aria-label={ar ? "إعادة تشغيل القصة" : "Replay story"}
          >
            <RotateCw className="h-3.5 w-3.5" />
            {ar ? "إعادة العرض" : "Replay"}
          </button>
          <button
            type="button"
            onClick={togglePresentation}
            className={cn(
              "inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] px-3 py-2 rounded-full border transition",
              presentationOn
                ? "border-cyan-400/60 bg-cyan-400/15 text-cyan-100 shadow-[0_0_24px_-6px_rgba(0,212,255,0.6)]"
                : "border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06]"
            )}
            aria-pressed={presentationOn}
            aria-label={ar ? "وضع العرض التنفيذي" : "Presentation mode"}
          >
            <Presentation className="h-3.5 w-3.5" />
            {presentationOn ? (ar ? "العرض جارٍ" : "Presenting") : (ar ? "وضع العرض" : "Presentation")}
          </button>
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
        <ol className="relative space-y-2.5 max-h-[560px] overflow-y-auto pr-1" aria-live="polite">
          {lines.map((line, i) => {
            const s = TONE_STYLE[line.tone];
            const isSpeaking = speakingId === line.id;
            const isNewest = i === 0;
            const isOpen = expandedId === line.id;
            const dur = formatDuration(line.duration_ms, ar);
            return (
              <li key={line.id}>
                <FadeIn delay={Math.min(i, 6) * 0.04}>
                  <div
                    className={cn(
                      "rounded-xl border p-3.5 transition-all",
                      s.ring, s.bg,
                      isNewest && "ring-1 ring-cyan-400/30",
                      isSpeaking && "shadow-[0_0_30px_-8px_rgba(0,212,255,0.6)]"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedId(isOpen ? null : line.id)}
                      className="flex items-start gap-3 w-full text-start"
                      aria-expanded={isOpen}
                    >
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
                          {dur && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-white/40 tabular-nums">
                              <Clock className="h-3 w-3" /> {dur}
                            </span>
                          )}
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
                        <div className="mt-0.5 text-[12px] text-cyan-100/80">
                          {ar ? line.action_ar : line.action_en}
                        </div>
                      </div>
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 text-white/40 mt-1 shrink-0 transition-transform",
                          isOpen && "rotate-90",
                          ar && !isOpen && "rotate-180",
                          ar && isOpen && "-rotate-90"
                        )}
                        aria-hidden
                      />
                    </button>

                    {isOpen && (
                      <div className="mt-3 ms-10 grid gap-2 border-s border-cyan-400/15 ps-3 text-[12px]">
                        {(ar ? line.reason_ar : line.reason_en) && (
                          <div className="flex items-start gap-2 text-white/70">
                            <Sparkles className="h-3.5 w-3.5 mt-0.5 text-cyan-300/80 shrink-0" />
                            <span>{ar ? line.reason_ar : line.reason_en}</span>
                          </div>
                        )}
                        {(ar ? line.result_ar : line.result_en) && (
                          <div className="flex items-start gap-2 text-white/80">
                            <CheckCircle2 className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", s.text)} />
                            <span>{ar ? line.result_ar : line.result_en}</span>
                          </div>
                        )}
                        {line.workflow_id && (
                          <div className="flex items-start gap-2 text-white/60">
                            <GitBranch className="h-3.5 w-3.5 mt-0.5 text-cyan-300/80 shrink-0" />
                            <span className="font-mono tabular-nums">
                              {ar ? "سير عمل مرتبط: " : "Related workflow: "}
                              {line.workflow_id.slice(0, 12)}
                            </span>
                          </div>
                        )}
                        {line.correlation_id && (
                          <div className="text-[10px] text-white/35 font-mono">
                            corr_id: {line.correlation_id.slice(0, 12)}
                          </div>
                        )}
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); playLine(line); }}
                            className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] px-2.5 py-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/5 text-cyan-100 hover:bg-cyan-400/10 transition"
                          >
                            <PlayCircle className="h-3.5 w-3.5" />
                            {ar ? "اسمع السرد" : "Hear narration"}
                          </button>
                        </div>
                      </div>
                    )}
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
