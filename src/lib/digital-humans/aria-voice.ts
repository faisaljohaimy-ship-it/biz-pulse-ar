/**
 * ARIA Voice — bilingual client-side speech for the Executive Digital
 * Human. Wraps the server-side `ariaSpeak` server function (Lovable AI
 * Gateway → OpenAI gpt-4o-mini-tts), plays the returned MP3 through a
 * Web Audio graph, and emits 0..1 amplitude samples so the SVG avatar
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
import { ariaSpeak } from "@/lib/narrator/tts.functions";
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
  if (sharedCtx && sharedCtx.state !== "closed") return sharedCtx;
  const Ctor: typeof AudioContext =
    (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
      .AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  sharedCtx = new Ctor();
  return sharedCtx;
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
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
      const res = await ariaSpeak({ data: { text: opts.text, voice, instructions } });
      if (stopped) return;
      const ctx = getAudioContext();
      if (ctx.state === "suspended") await ctx.resume().catch(() => {});
      const bytes = base64ToBytes(res.audio_base64);
      // decodeAudioData requires a plain ArrayBuffer, not a SharedArrayBuffer view.
      const buf = bytes.slice().buffer;
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
      if (!stopped) throw err;
    }
  })();

  return { promise, stop };
}
