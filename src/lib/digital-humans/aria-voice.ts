/**
 * ARIA Voice — bilingual client-side speech for the Executive Digital
 * Human. Calls the public ARIA TTS route (Lovable AI Gateway fallback),
 * plays the returned MP3 through a Web Audio graph, and emits 0..1 amplitude samples so the SVG avatar
 * (or any future provider) can drive natural lip-sync.
 *
 * Voice profile selection is fully automatic: the engine inspects the
 * text for Arabic script and chooses an appropriate voice/instruction
 * pair. Callers do not pick voices.
 *
 * Designed to be replaceable: when an external avatar provider (Azure
 * AI Avatar, HeyGen, D-ID) is wired in, that provider can either consume
 * the same amplitude callback to drive its own lip-sync or take over
 * audio synthesis entirely — only this file changes.
 */
import { resolveVoice, type VoiceLang } from "./voice-profiles";
import type { DigitalHumanSpec } from "./registry";

export type { VoiceLang } from "./voice-profiles";

export interface SpeakHandle {
  promise: Promise<void>;
  stop: () => void;
}

export interface SpeakOptions {
  text: string;
  lang?: VoiceLang;
  /** Optional persona — picks voice + instructions for that Digital Human. */
  voiceProfileId?: string;
  /** Called continuously with 0..1 mouth amplitude. */
  onAmplitude?: (a: number) => void;
  /** Called once when audio actually begins. */
  onStart?: () => void;
  /** Abort signal — stop()s playback. */
  signal?: AbortSignal;
}

const ARABIC_RANGE = /[\u0600-\u06FF]/;
export function detectLang(text: string): VoiceLang {
  return ARABIC_RANGE.test(text) ? "ar" : "en";
}

let sharedCtx: AudioContext | null = null;
function getAudioContext(): AudioContext {
  try {
    if (sharedCtx && sharedCtx.state !== "closed") return sharedCtx;
  } catch {
    sharedCtx = null;
  }
  const Ctor: typeof AudioContext =
    (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
      .AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  sharedCtx = new Ctor();
  return sharedCtx;
}

/**
 * Speak `text` using the ARIA voice. Returns a handle whose `promise`
 * resolves after playback completes or is stopped. Pure client runtime
 * (no localStorage / no cookies).
 */
export function speakAria(opts: SpeakOptions): SpeakHandle {
  const lang = opts.lang ?? detectLang(opts.text);
  const { voice, instructions } = resolveVoice(opts.voiceProfileId ?? "aria", lang);
  let stopped = false;
  let source: AudioBufferSourceNode | null = null;
  let raf = 0;

  const stop = () => {
    stopped = true;
    try { source?.stop(); } catch { /* already stopped */ }
    cancelAnimationFrame(raf);
    opts.onAmplitude?.(0);
  };

  if (opts.signal) {
    if (opts.signal.aborted) stop();
    else opts.signal.addEventListener("abort", stop, { once: true });
  }

  const promise = (async () => {
    try {
      const res = await fetch("/api/public/aria-tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: opts.text, voiceId: voice, instructions }),
      });
      if (!res.ok) throw new Error(`TTS failed: ${res.status}`);
      if (stopped) return;
      const ctx = getAudioContext();
      if (ctx.state === "suspended") await ctx.resume().catch(() => {});
      const buf = await res.arrayBuffer();
      const audio = await ctx.decodeAudioData(buf);
      if (stopped) return;

      source = ctx.createBufferSource();
      source.buffer = audio;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.6;
      const data = new Uint8Array(analyser.frequencyBinCount);

      source.connect(analyser);
      analyser.connect(ctx.destination);

      const sampleAmp = () => {
        if (stopped) return;
        if (document.visibilityState === "hidden") {
          opts.onAmplitude?.(0);
          return;
        }
        analyser.getByteTimeDomainData(data);
        // RMS around 128 baseline → 0..1 amplitude
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        const amp = Math.max(0, Math.min(1, rms * 2.4));
        opts.onAmplitude?.(amp);
        raf = requestAnimationFrame(sampleAmp);
      };

      const done = new Promise<void>((resolve) => {
        source!.onended = () => {
          cancelAnimationFrame(raf);
          opts.onAmplitude?.(0);
          resolve();
        };
      });

      opts.onStart?.();
      source.start();
      sampleAmp();
      await done;
    } catch (err) {
      cancelAnimationFrame(raf);
      opts.onAmplitude?.(0);
      // Browser SpeechSynthesis fallback REMOVED — outside Greeting Mode the
      // policy is silence over a robotic voice. Segment is skipped.
      console.warn("[aria-voice] speakAria TTS failed — segment skipped (no browser fallback)", err);
      if (!stopped) throw err;
    }
  })();

  return { promise, stop };
}

/**
 * Speak `text` in the voice of a specific Digital Human persona.
 * Thin convenience over `speakAria` — picks the persona's voice and
 * tone instructions. The lip-sync amplitude contract is identical.
 */
export function speakAs(
  spec: Pick<DigitalHumanSpec, "voiceProfileId">,
  opts: Omit<SpeakOptions, "voiceProfileId">,
): SpeakHandle {
  return speakAria({ ...opts, voiceProfileId: spec.voiceProfileId });
}
