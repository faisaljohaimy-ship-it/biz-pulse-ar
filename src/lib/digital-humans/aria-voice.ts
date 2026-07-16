/**
 * ARIA Voice — bilingual client-side speech for the Executive Digital
 * Human. ARIA uses her authenticated ElevenLabs MP3 route; specialist agents
 * use free browser/OS voices through the governed audio bus. Both paths emit
 * 0..1 amplitude samples so the avatar can drive lip-sync.
 *
 * Voice routing is fully automatic. ARIA always uses her locked ElevenLabs
 * endpoint; specialists use curated device-voice preferences with automatic
 * same-language fallbacks. Callers can never inject a provider voice id.
 *
 * Designed to be replaceable: when an external avatar provider (Azure
 * AI Avatar, HeyGen, D-ID) is wired in, that provider can either consume
 * the same amplitude callback to drive its own lip-sync or take over
 * audio synthesis entirely — only this file changes.
 */
import type { VoiceLang } from "./voice-profiles";
import type { DigitalHumanSpec } from "./registry";
import { speakFreeAgent } from "./free-agent-speech";
import { authenticatedFetch } from "@/lib/auth-fetch";
import { AriaAudioBus } from "@/lib/aria/audio-bus";
import { getPrimedAudioContext } from "@/lib/user-interaction";

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
  /** Registry identity. Omitted means the canonical ARIA identity. */
  speakerId?: string;
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
  const primed = getPrimedAudioContext();
  if (primed && primed.state !== "closed") {
    sharedCtx = primed;
    return primed;
  }
  try {
    if (sharedCtx && sharedCtx.state !== "closed") return sharedCtx;
  } catch {
    sharedCtx = null;
  }
  const Ctor: typeof AudioContext =
    (
      window as unknown as {
        AudioContext?: typeof AudioContext;
        webkitAudioContext?: typeof AudioContext;
      }
    ).AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  sharedCtx = new Ctor();
  return sharedCtx;
}

/** Pending and active Digital Human speech handles. Audible ownership itself
 * stays with AriaAudioBus so a lower-priority specialist can never cancel ARIA.
 */
const activeHandles = new Set<SpeakHandle>();

function trackHandle<T extends SpeakHandle>(handle: T): T {
  activeHandles.add(handle);
  void handle.promise.then(
    () => activeHandles.delete(handle),
    () => activeHandles.delete(handle),
  );
  return handle;
}

export function stopActiveAriaVoice(): void {
  for (const handle of activeHandles) {
    try {
      handle.stop();
    } catch {
      /* ignore */
    }
  }
  activeHandles.clear();
}

/**
 * Speak `text` using the ARIA voice. Returns a handle whose `promise`
 * resolves after playback completes or is stopped. Pure client runtime
 * (no localStorage / no cookies).
 */
export function speakAria(opts: SpeakOptions): SpeakHandle {
  const lang = opts.lang ?? detectLang(opts.text);
  const speakerId = opts.speakerId ?? "aria";

  if (speakerId !== "aria") {
    return trackHandle(
      speakFreeAgent({
        text: opts.text,
        lang,
        voiceProfileId: opts.voiceProfileId,
        onAmplitude: opts.onAmplitude,
        onStart: opts.onStart,
        signal: opts.signal,
      }),
    );
  }

  let stopped = false;
  let source: AudioBufferSourceNode | null = null;
  let raf = 0;
  let ownsBus = false;

  const stop = () => {
    stopped = true;
    try {
      source?.stop();
    } catch {
      /* already stopped */
    }
    cancelAnimationFrame(raf);
    opts.onAmplitude?.(0);
    if (ownsBus) {
      ownsBus = false;
      AriaAudioBus.release("chat-tts");
    }
  };

  if (opts.signal) {
    if (opts.signal.aborted) stop();
    else opts.signal.addEventListener("abort", stop, { once: true });
  }

  const promise = (async () => {
    try {
      // Do not spend ARIA provider quota before the first real gesture.
      // The global interaction tracker unlocks this synchronously on pointer,
      // keyboard, or touch input across desktop and mobile.
      if (!AriaAudioBus.isUnlocked()) return;
      const res = await authenticatedFetch("/api/aria/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: opts.text }),
      });
      if (!res.ok) throw new Error(`TTS failed: ${res.status}`);
      if (stopped) return;
      const ctx = getAudioContext();
      if (ctx.state === "suspended") await ctx.resume().catch(() => {});
      const buf = await res.arrayBuffer();
      const audio = await ctx.decodeAudioData(buf);
      if (stopped) return;

      ownsBus = AriaAudioBus.acquire("chat-tts", stop);
      if (!ownsBus) return;

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
      AriaAudioBus.notifyPlaying("chat-tts");
      sampleAmp();
      await done;
    } catch (err) {
      cancelAnimationFrame(raf);
      opts.onAmplitude?.(0);
      // ARIA never falls back to a specialist/system voice: identity over
      // substitution. Her failed segment remains silent.
      console.warn("[aria-voice] ARIA TTS failed — segment skipped", err);
      if (!stopped) throw err;
    } finally {
      if (ownsBus) {
        AriaAudioBus.notifyStopped("chat-tts");
        ownsBus = false;
        AriaAudioBus.release("chat-tts");
      }
    }
  })();

  const handle: SpeakHandle = { promise, stop };
  return trackHandle(handle);
}

/**
 * Speak `text` in the voice of a specific Digital Human persona.
 * Thin convenience over `speakAria` — picks the persona's voice and
 * tone instructions. The lip-sync amplitude contract is identical.
 */
export function speakAs(
  spec: Pick<DigitalHumanSpec, "id" | "voiceProfileId">,
  opts: Omit<SpeakOptions, "voiceProfileId">,
): SpeakHandle {
  return speakAria({ ...opts, speakerId: spec.id, voiceProfileId: spec.voiceProfileId });
}
