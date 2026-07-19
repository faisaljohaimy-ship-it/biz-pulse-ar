/**
 * Governed specialist speech — server-generated ElevenLabs audio only.
 *
 * Owner voice policy: every audible voice in NEXIOS is ElevenLabs "Layan",
 * synthesized server-side by /api/aria/tts (the key never reaches the
 * client). Browser TTS is banned in all paths. Specialist narration flows
 * through the SAME governed channel model as before: it must own the
 * "agent-tts" source on AriaAudioBus before any audio starts, so ARIA
 * (chat-tts) can always preempt it and no two voices ever overlap.
 */
import { AriaAudioBus } from "@/lib/aria/audio-bus";
import { authenticatedFetch } from "@/lib/auth-fetch";
import { getPrimedAudioContext } from "@/lib/user-interaction";
import type { VoiceLang } from "./voice-profiles";

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

/**
 * Speak `text` as a specialist Digital Human. Audio is Layan MP3 from the
 * server; playback happens only while this handle owns the bus "agent-tts"
 * channel. Segments play sequentially; stop() halts immediately.
 */
export function speakFreeAgent(opts: FreeAgentSpeechOptions): FreeAgentSpeechHandle {
  let stopped = false;
  let ownsBus = false;
  let source: AudioBufferSourceNode | null = null;
  let raf = 0;

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
      AriaAudioBus.release("agent-tts");
    }
  };

  if (opts.signal) {
    if (opts.signal.aborted) stop();
    else opts.signal.addEventListener("abort", stop, { once: true });
  }

  const promise = (async () => {
    const segments = splitSpeechText(opts.text);
    if (segments.length === 0) return;
    // iOS/gesture policy: never start (or spend provider quota) before the
    // bus has been unlocked by a real user gesture.
    if (!AriaAudioBus.isUnlocked()) return;

    ownsBus = AriaAudioBus.acquire("agent-tts", stop);
    if (!ownsBus) return;

    let started = false;
    try {
      // Distinct ElevenLabs premade voice per specialist persona (server
      // whitelists the id; ARIA herself never goes through this path).
      const { AGENT_ELEVEN_VOICES } = await import("@/lib/aria/voice-config");
      const voiceId = opts.voiceProfileId ? AGENT_ELEVEN_VOICES[opts.voiceProfileId] : undefined;
      for (const segment of segments) {
        if (stopped) return;
        const payload = JSON.stringify({ text: segment, ...(voiceId ? { voiceId } : {}) });
        let res = await authenticatedFetch("/api/aria/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          signal: opts.signal,
        });
        // Saved repair method (CLAUDE.md): auth-first → public fallback
        // on 401/403 so guest sessions hear the agents too.
        if (!res.ok && (res.status === 401 || res.status === 403)) {
          res = await fetch("/api/public/aria-tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
            signal: opts.signal,
            cache: "no-store",
          });
        }
        if (!res.ok) throw new Error(`agent TTS failed: ${res.status}`);
        if (stopped) return;

        const ctx = getAudioContext();
        if (ctx.state === "suspended") await ctx.resume().catch(() => {});
        const audio = await ctx.decodeAudioData(await res.arrayBuffer());
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
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            const v = (data[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / data.length);
          opts.onAmplitude?.(Math.max(0, Math.min(1, rms * 2.4)));
          raf = requestAnimationFrame(sampleAmp);
        };

        const done = new Promise<void>((resolve) => {
          source!.onended = () => {
            cancelAnimationFrame(raf);
            opts.onAmplitude?.(0);
            resolve();
          };
        });

        if (!started) {
          started = true;
          opts.onStart?.();
        }
        source.start();
        AriaAudioBus.notifyPlaying("agent-tts");
        sampleAmp();
        await done;
      }
    } catch (err) {
      cancelAnimationFrame(raf);
      opts.onAmplitude?.(0);
      // No fallback voice: a failed specialist segment stays silent.
      console.warn("[free-agent-speech] specialist TTS failed — segment skipped", err);
      if (!stopped) throw err;
    } finally {
      if (ownsBus) {
        AriaAudioBus.notifyStopped("agent-tts");
        ownsBus = false;
        AriaAudioBus.release("agent-tts");
      }
    }
  })();

  return { promise, stop };
}
