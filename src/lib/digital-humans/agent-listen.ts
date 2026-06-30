/**
 * useAgentListener — opens the executive's microphone via ElevenLabs
 * realtime Scribe, VAD-commits each utterance, sends it to `askAgent`
 * (the chosen Digital Human's persona-aware brain), and enqueues the
 * spoken reply through the existing AriaDock voice pipeline so the
 * same persona answers in its own voice with full lip-sync.
 *
 * Pure client. No localStorage, no cookies. Mic token comes from
 * `/api/voice-token`. Designed so multiple surfaces (AriaDock mic,
 * AgentNode tap-to-ask, briefing panels) share one listener via the
 * `window.aria.ask(speaker)` bridge that AriaDock installs.
 */
import { useCallback, useRef, useState } from "react";
import { useScribe, CommitStrategy } from "@elevenlabs/react";
import { askAgent } from "@/lib/narrator/ask-agent.functions";
import { ARIA, type DigitalHumanSpec } from "./registry";

type WindowAria = {
  speak?: (t: { id?: string; text_ar: string; text_en: string; speaker?: DigitalHumanSpec }) => void;
};

const isArabic = (s: string) => /[\u0600-\u06FF]/.test(s);

export function useAgentListener() {
  const [listening, setListening] = useState(false);
  const [partial, setPartial] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const speakerRef = useRef<DigitalHumanSpec>(ARIA);
  const busyRef = useRef(false);

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    commitStrategy: CommitStrategy.VAD,
    onPartialTranscript: (d: { text: string }) => {
      // Barge-in: the moment the user speaks, silence ARIA / the agent.
      if (d.text && d.text.trim().length > 0) {
        const w = window as unknown as { aria?: { stop?: () => void } };
        w.aria?.stop?.();
      }
      setPartial(d.text);
    },
    onCommittedTranscript: async (d: { text: string }) => {
      const q = d.text.trim();
      setPartial("");
      if (!q || busyRef.current) return;
      busyRef.current = true;
      setThinking(true);
      try {
        const sp = speakerRef.current;
        const res = await askAgent({
          data: {
            question: q,
            persona: {
              id: sp.id,
              name_ar: sp.name_ar,
              name_en: sp.name_en,
              title_ar: sp.title_ar,
              title_en: sp.title_en,
            },
            lang: isArabic(q) ? "ar" : "en",
          },
        });
        const w = window as unknown as { aria?: WindowAria };
        w.aria?.speak?.({
          id: `ask-${sp.id}-${Date.now()}`,
          text_ar: res.text_ar,
          text_en: res.text_en,
          speaker: sp,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "ask failed");
      } finally {
        busyRef.current = false;
        setThinking(false);
      }
    },
  });

  const start = useCallback(async (speaker?: DigitalHumanSpec) => {
    setError(null);
    speakerRef.current = speaker ?? ARIA;
    // Silence any in-flight narration the moment the mic opens.
    const w = window as unknown as { aria?: { stop?: () => void } };
    w.aria?.stop?.();
    try {
      const r = await fetch("/api/voice-token", { method: "POST" });
      if (!r.ok) throw new Error(`token ${r.status}`);
      const j = (await r.json()) as { token?: string; kind?: string; error?: string };
      if (!j.token) throw new Error(j.error ?? "no token");
      if (j.kind !== "scribe") throw new Error("expected scribe token");
      await scribe.connect({
        token: j.token,
        microphone: { echoCancellation: true, noiseSuppression: true },
      } as Parameters<typeof scribe.connect>[0]);
      setListening(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "mic failed");
      setListening(false);
    }
  }, [scribe]);

  const stop = useCallback(() => {
    try { scribe.disconnect(); } catch { /* noop */ }
    setListening(false);
    setPartial("");
  }, [scribe]);

  const toggle = useCallback((speaker?: DigitalHumanSpec) => {
    if (listening) stop();
    else void start(speaker);
  }, [listening, start, stop]);

  return { listening, partial, thinking, error, start, stop, toggle, activeSpeaker: speakerRef.current };
}
