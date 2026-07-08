/**
 * Executive Conductor — client-only turn scheduler that powers the
 * Executive Theater. It NEVER fabricates content: every spoken turn
 * originates from a real `enterprise_events` row (live narration) or
 * from a real `executive_briefings` segment (briefing mode).
 *
 * Responsibilities:
 *  - Subscribe to the live event stream and convert actionable rows into
 *    sequential speaking turns (one specialist agent at a time).
 *  - Run cinematic briefings: ARIA → specialists → ARIA synthesis, each
 *    turn voiced through `speakAs` with lip-sync amplitude exposed to
 *    the 3D rig.
 *  - Surface a single source of truth (currentSpeaker / state / amp) so
 *    the stage, ring, and story feed stay perfectly in sync.
 *
 * No new tables, no mock data, no random talking.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEventStream } from "@/lib/events/useEventStream";
import { narrateEvent, type NarratorLine } from "@/lib/narrator/event-narrator";
import { speakAs, type SpeakHandle } from "@/lib/digital-humans/aria-voice";
import { ARIA, findHuman, type DigitalHumanSpec } from "@/lib/digital-humans/registry";
import { narratorAgentToHumanId } from "@/lib/digital-humans/voice-profiles";
import type { BriefingSegment, ExecutiveBriefing } from "@/lib/exec/briefing.functions";

export type ConductorSpeaker = {
  spec: DigitalHumanSpec;
  agentKey: string;
};

export type ConductorState = "idle" | "listening" | "thinking" | "speaking" | "presenting";

export type ConductorLine = {
  id: string;
  agentKey: string;
  speaker: DigitalHumanSpec;
  text_ar: string;
  text_en: string;
  source: "event" | "briefing";
  narrator?: NarratorLine;
  briefing?: BriefingSegment;
};

/** Only severities worth ARIA's voice. Avoids "random talking" on info events. */
const ACTIONABLE = new Set(["high", "critical", "warn", "warning"]);

function resolveSpeaker(agentKey: string): DigitalHumanSpec {
  if (agentKey === "aria") return ARIA;
  const humanId = narratorAgentToHumanId(agentKey);
  return findHuman(humanId) ?? findHuman("risk_intelligence") ?? ARIA;
}

export interface UseConductorOptions {
  ar: boolean;
  /** Master switch — when false, no audio is produced (the rig still animates). */
  voiceEnabled: boolean;
}

export interface ConductorRuntime {
  state: ConductorState;
  currentSpeaker: DigitalHumanSpec;
  currentLine: ConductorLine | null;
  mouthAmplitude: number;
  /** Live event-driven narrations (newest first). */
  feed: ConductorLine[];
  /** True while a briefing is running. */
  presenting: boolean;
  /** Queue length pending speech. */
  pending: number;
  beginBriefing: (briefing: ExecutiveBriefing) => void;
  interrupt: () => void;
}

export function useConductor(opts: UseConductorOptions): ConductorRuntime {
  const { ar, voiceEnabled } = opts;

  // Pull the live event stream — the canonical source of "what happened".
  const { events } = useEventStream({ limit: 30 });

  const [feed, setFeed] = useState<ConductorLine[]>([]);
  const [state, setState] = useState<ConductorState>("idle");
  const [currentSpeaker, setCurrentSpeaker] = useState<DigitalHumanSpec>(ARIA);
  const [currentLine, setCurrentLine] = useState<ConductorLine | null>(null);
  const [mouthAmplitude, setMouthAmplitude] = useState(0);
  const [presenting, setPresenting] = useState(false);
  const [pending, setPending] = useState(0);

  const queueRef = useRef<ConductorLine[]>([]);
  const speakingRef = useRef(false);
  const handleRef = useRef<SpeakHandle | null>(null);
  const seenRef = useRef<Set<string>>(new Set());

  // Push event rows into the feed + queue. Deduped by event id.
  useEffect(() => {
    if (events.length === 0) return;
    const fresh: ConductorLine[] = [];
    // Process chronologically so the oldest unseen speaks first.
    for (let i = events.length - 1; i >= 0; i--) {
      const row = events[i];
      if (seenRef.current.has(row.id)) continue;
      seenRef.current.add(row.id);
      const n = narrateEvent(row);
      const speaker = resolveSpeaker(n.agent);
      const line: ConductorLine = {
        id: n.id,
        agentKey: n.agent,
        speaker,
        text_ar: n.reason_ar ? `${n.text_ar} ${n.reason_ar}` : n.text_ar,
        text_en: n.reason_en ? `${n.text_en} ${n.reason_en}` : n.text_en,
        source: "event",
        narrator: n,
      };
      fresh.push(line);
    }
    if (fresh.length === 0) return;
    setFeed((prev) => [...fresh.slice().reverse(), ...prev].slice(0, 50));

    // Only enqueue actionable lines for voice; calm info events still
    // appear in the story feed but ARIA stays quiet.
    if (!presenting) {
      const actionable = fresh.filter((l) =>
        l.narrator ? ACTIONABLE.has(l.narrator.severity.toLowerCase()) : false,
      );
      if (actionable.length) {
        queueRef.current.push(...actionable);
        setPending(queueRef.current.length);
        void drain();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, presenting]);

  const drain = useCallback(async () => {
    if (speakingRef.current) return;
    const next = queueRef.current.shift();
    if (!next) {
      setPending(0);
      setState("idle");
      setCurrentSpeaker(ARIA);
      setCurrentLine(null);
      return;
    }
    speakingRef.current = true;
    setPending(queueRef.current.length);
    setCurrentSpeaker(next.speaker);
    setCurrentLine(next);
    setState("speaking");

    const text = ar ? next.text_ar : next.text_en;
    if (!voiceEnabled || !text.trim()) {
      // Silent mode — still hold the spotlight for a moment so the
      // story registers visually.
      await new Promise((r) => setTimeout(r, Math.max(1500, Math.min(5000, text.length * 55))));
      speakingRef.current = false;
      void drain();
      return;
    }

    try {
      const handle = speakAs(next.speaker, {
        text,
        lang: ar ? "ar" : "en",
        onAmplitude: setMouthAmplitude,
      });
      handleRef.current = handle;
      await handle.promise;
    } catch (err) {
      console.warn("[conductor] speech failed:", err);
    } finally {
      handleRef.current = null;
      setMouthAmplitude(0);
      speakingRef.current = false;
      void drain();
    }
  }, [ar, voiceEnabled]);

  const interrupt = useCallback(() => {
    handleRef.current?.stop();
    handleRef.current = null;
    queueRef.current = [];
    speakingRef.current = false;
    setMouthAmplitude(0);
    setPending(0);
    setPresenting(false);
    setState("idle");
    setCurrentSpeaker(ARIA);
    setCurrentLine(null);
  }, []);

  const beginBriefing = useCallback(
    (briefing: ExecutiveBriefing) => {
      if (presenting) return;
      // Clear ambient queue so the briefing owns the stage.
      queueRef.current = [];
      handleRef.current?.stop();
      handleRef.current = null;
      speakingRef.current = false;
      setMouthAmplitude(0);
      setPresenting(true);

      const turns: ConductorLine[] = briefing.segments.map((seg, i) => {
        const agentKey =
          seg.speaker_id === "aria"
            ? "aria"
            : seg.speaker_name.toLowerCase().includes("incident")
              ? "incident_commander"
              : seg.speaker_name.toLowerCase().includes("risk")
                ? "risk_analyst"
                : seg.speaker_name.toLowerCase().includes("compliance")
                  ? "compliance_auditor"
                  : seg.speaker_name.toLowerCase().includes("patrol")
                    ? "patrol_intelligence"
                    : seg.speaker_name.toLowerCase().includes("visitor")
                      ? "visitor_intelligence"
                      : seg.speaker_name.toLowerCase().includes("permit")
                        ? "permit_authority"
                        : seg.speaker_name.toLowerCase().includes("emerg")
                          ? "emergency_coordinator"
                          : seg.speaker_name.toLowerCase().includes("report") ||
                              seg.speaker_name.toLowerCase().includes("brief")
                            ? "executive_reporter"
                            : "knowledge_ai";
        return {
          id: `brief-${briefing.generated_at}-${i}`,
          agentKey,
          speaker: resolveSpeaker(agentKey),
          text_ar: seg.text_ar,
          text_en: seg.text_en,
          source: "briefing",
          briefing: seg,
        };
      });

      // Append the recommendation as ARIA's closing turn (already covered
      // by the last briefing segment, but echo title for emphasis).
      queueRef.current.push(...turns);
      setPending(queueRef.current.length);
      setState("presenting");
      // Use a presenting-aware drain so we exit presenting at end.
      void drainPresentation();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ar, voiceEnabled],
  );

  const drainPresentation = useCallback(async () => {
    while (queueRef.current.length > 0) {
      const next = queueRef.current.shift()!;
      setCurrentSpeaker(next.speaker);
      setCurrentLine(next);
      setPending(queueRef.current.length);
      setState(next.agentKey === "aria" ? "presenting" : "speaking");
      const text = ar ? next.text_ar : next.text_en;
      if (!voiceEnabled || !text.trim()) {
        await new Promise((r) => setTimeout(r, Math.max(2200, Math.min(6500, text.length * 55))));
        continue;
      }
      try {
        const handle = speakAs(next.speaker, {
          text,
          lang: ar ? "ar" : "en",
          onAmplitude: setMouthAmplitude,
        });
        handleRef.current = handle;
        await handle.promise;
      } catch (err) {
        console.warn("[conductor:briefing] speech failed:", err);
      } finally {
        handleRef.current = null;
        setMouthAmplitude(0);
      }
    }
    setPresenting(false);
    setState("idle");
    setCurrentSpeaker(ARIA);
    setCurrentLine(null);
  }, [ar, voiceEnabled]);

  // Cleanup on unmount.
  useEffect(
    () => () => {
      handleRef.current?.stop();
      handleRef.current = null;
    },
    [],
  );

  return useMemo<ConductorRuntime>(
    () => ({
      state,
      currentSpeaker,
      currentLine,
      mouthAmplitude,
      feed,
      presenting,
      pending,
      beginBriefing,
      interrupt,
    }),
    [
      state,
      currentSpeaker,
      currentLine,
      mouthAmplitude,
      feed,
      presenting,
      pending,
      beginBriefing,
      interrupt,
    ],
  );
}
