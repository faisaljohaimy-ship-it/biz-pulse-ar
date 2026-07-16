/**
 * Governed, zero-API-cost specialist speech.
 *
 * Uses only voices exposed by the user's browser/operating system. Direct
 * calls to speechSynthesis.speak are blocked globally; this module reaches the
 * captured native engine only after agent-tts owns AriaAudioBus.
 */
import { AriaAudioBus } from "@/lib/aria/audio-bus";
import { selectSystemVoice, type SelectedSystemVoice, type VoiceLang } from "./voice-profiles";

export interface FreeAgentSpeechOptions {
  text: string;
  lang: VoiceLang;
  voiceProfileId?: string;
  onAmplitude?: (amplitude: number) => void;
  onStart?: () => void;
  signal?: AbortSignal;
}

export interface FreeAgentSpeechHandle {
  promise: Promise<void>;
  stop: () => void;
}

export function splitSpeechText(text: string, maxChars = 220): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const sentences = clean.split(/(?<=[.!?؟؛])\s+/u);
  const chunks: string[] = [];

  for (const sentence of sentences) {
    let rest = sentence.trim();
    while (rest.length > maxChars) {
      const window = rest.slice(0, maxChars + 1);
      const splitAt = Math.max(
        window.lastIndexOf("،"),
        window.lastIndexOf(","),
        window.lastIndexOf(" "),
      );
      const end = splitAt > Math.floor(maxChars * 0.55) ? splitAt : maxChars;
      chunks.push(rest.slice(0, end).trim());
      rest = rest.slice(end).trim();
    }
    if (rest) chunks.push(rest);
  }

  return chunks;
}

async function loadSystemVoices(timeoutMs = 900): Promise<SpeechSynthesisVoice[]> {
  const initial = AriaAudioBus.systemVoices();
  if (initial.length > 0 || typeof window === "undefined" || !window.speechSynthesis) {
    return initial;
  }

  return new Promise((resolve) => {
    let settled = false;
    const synth = window.speechSynthesis;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      synth.removeEventListener("voiceschanged", onVoicesChanged);
      resolve(AriaAudioBus.systemVoices());
    };
    const onVoicesChanged = () => {
      if (AriaAudioBus.systemVoices().length > 0) finish();
    };
    const timer = window.setTimeout(finish, timeoutMs);
    synth.addEventListener("voiceschanged", onVoicesChanged);
  });
}

function createUtterance(text: string, selected: SelectedSystemVoice) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = selected.voice?.lang || selected.languageTag;
  utterance.voice = selected.voice;
  utterance.rate = selected.rate;
  utterance.pitch = selected.pitch;
  utterance.volume = 1;
  return utterance;
}

export function speakFreeAgent(options: FreeAgentSpeechOptions): FreeAgentSpeechHandle {
  let stopped = false;
  let ownsBus = false;
  let raf = 0;
  let currentUtterance: SpeechSynthesisUtterance | null = null;
  let settleCurrent: (() => void) | null = null;

  const stop = () => {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(raf);
    options.onAmplitude?.(0);
    if (currentUtterance) {
      currentUtterance.onstart = null;
      currentUtterance.onend = null;
      currentUtterance.onerror = null;
    }
    if (ownsBus) {
      AriaAudioBus.cancelAgentUtterance();
      AriaAudioBus.notifyStopped("agent-tts");
      ownsBus = false;
      AriaAudioBus.release("agent-tts");
    }
    settleCurrent?.();
    settleCurrent = null;
    currentUtterance = null;
  };

  if (options.signal) {
    if (options.signal.aborted) stop();
    else options.signal.addEventListener("abort", stop, { once: true });
  }

  const promise = (async () => {
    try {
      if (stopped || !AriaAudioBus.isUnlocked()) return;
      if (AriaAudioBus.currentSource() === "chat-tts") return;
      if (
        typeof window === "undefined" ||
        !window.speechSynthesis ||
        typeof SpeechSynthesisUtterance === "undefined"
      ) {
        throw new Error("free_agent_voice_unsupported");
      }

      const voices = await loadSystemVoices();
      if (stopped || AriaAudioBus.currentSource() === "chat-tts") return;
      const selected = selectSystemVoice(options.voiceProfileId, options.lang, voices);
      const chunks = splitSpeechText(options.text);
      if (chunks.length === 0) return;

      ownsBus = AriaAudioBus.acquire("agent-tts", stop);
      if (!ownsBus) return;

      let announcedStart = false;
      for (const chunk of chunks) {
        if (stopped || !ownsBus) break;
        const utterance = createUtterance(chunk, selected);
        currentUtterance = utterance;

        await new Promise<void>((resolve, reject) => {
          let settled = false;
          let timeout = 0;
          const finish = (error?: Error) => {
            if (settled) return;
            settled = true;
            window.clearTimeout(timeout);
            settleCurrent = null;
            currentUtterance = null;
            if (error) reject(error);
            else resolve();
          };
          settleCurrent = () => finish();

          utterance.onstart = () => {
            if (!announcedStart) {
              announcedStart = true;
              options.onStart?.();
              AriaAudioBus.notifyPlaying("agent-tts");
            }
            const startedAt = performance.now();
            const animateMouth = () => {
              if (stopped || !ownsBus) return;
              const phase = (performance.now() - startedAt) / 115;
              const cadence = 0.18 + Math.abs(Math.sin(phase)) * 0.52;
              options.onAmplitude?.(document.visibilityState === "hidden" ? 0 : cadence);
              raf = requestAnimationFrame(animateMouth);
            };
            animateMouth();
          };
          utterance.onend = () => finish();
          utterance.onerror = (event) => {
            if (stopped || event.error === "canceled" || event.error === "interrupted") finish();
            else finish(new Error(`free_agent_voice_${event.error || "failed"}`));
          };

          const maxChunkMs = Math.max(12_000, Math.min(45_000, chunk.length * 190));
          timeout = window.setTimeout(() => {
            AriaAudioBus.cancelAgentUtterance();
            finish(new Error("free_agent_voice_timeout"));
          }, maxChunkMs);

          if (!AriaAudioBus.speakAgentUtterance(utterance)) {
            finish(new Error("free_agent_voice_not_authorized"));
          }
        });
      }
    } finally {
      cancelAnimationFrame(raf);
      options.onAmplitude?.(0);
      currentUtterance = null;
      settleCurrent = null;
      if (ownsBus) {
        AriaAudioBus.notifyStopped("agent-tts");
        ownsBus = false;
        AriaAudioBus.release("agent-tts");
      }
    }
  })();

  return { promise, stop };
}
