/**
 * ARIA Voice Queue — additive singleton wrapping /api/public/aria-tts.
 *
 * Responsibilities:
 *  - Buffer text into sentence chunks (ar/en boundaries) and speak them
 *    sequentially so ARIA starts speaking within the first sentence.
 *  - Support interrupt (150ms fade → pause) and resume from paused position.
 *  - Persist mute preference in localStorage (`aria_voice_enabled`).
 *  - Emit 0..1 amplitude samples via AnalyserNode for pulse animations.
 *  - Fall back to browser speechSynthesis when the TTS endpoint is
 *    unavailable (501/502/network). If neither works, silently degrade
 *    to text-only.
 *
 * Reused by AriaGlobalPanel and AriaCinematicIntro. No changes to the
 * /api/public/aria-ask contract or existing digital-humans/aria-voice.
 */
import { useSyncExternalStore } from "react";

const LS_KEY = "aria_voice_enabled";
const FADE_MS = 150;
const ARABIC_RANGE = /[\u0600-\u06FF]/;

type Chunk = { id: number; text: string; lang: "ar" | "en" };
type StateSnap = {
  enabled: boolean;
  speaking: boolean;
  paused: boolean;
  autoplayBlocked: boolean;
};

function splitSentences(text: string): string[] {
  // Split on . ! ? ؟ ، \n while keeping punctuation with the sentence.
  const raw = text.match(/[^.!?؟،\n]+[.!?؟،\n]?/g);
  const chunks = (raw ?? [text])
    .map((s) => s.trim())
    .filter(Boolean);
  // Merge tiny fragments (< 12 chars) with the previous chunk so we
  // don't ping the TTS for one-word sentences.
  const out: string[] = [];
  for (const c of chunks) {
    if (out.length && c.length < 12) out[out.length - 1] += " " + c;
    else out.push(c);
  }
  return out;
}

class AriaVoiceQueue {
  private queue: Chunk[] = [];
  private current: { chunk: Chunk; audio: HTMLAudioElement; url: string } | null =
    null;
  private nextId = 1;
  private paused = false;
  private enabled = true;
  private autoplayBlocked = false;
  private stateListeners = new Set<() => void>();
  private ampListeners = new Set<(a: number) => void>();
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private raf = 0;
  private snap: StateSnap = {
    enabled: true,
    speaking: false,
    paused: false,
    autoplayBlocked: false,
  };

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const v = localStorage.getItem(LS_KEY);
        if (v !== null) this.enabled = v === "1";
      } catch { /* ignore */ }
      this.recomputeSnap();
    }
  }

  subscribeState(fn: () => void): () => void {
    this.stateListeners.add(fn);
    return () => this.stateListeners.delete(fn);
  }
  subscribeAmp(fn: (a: number) => void): () => void {
    this.ampListeners.add(fn);
    return () => this.ampListeners.delete(fn);
  }
  getSnapshot(): StateSnap {
    return this.snap;
  }

  private recomputeSnap(): void {
    this.snap = {
      enabled: this.enabled,
      speaking: !!this.current && !this.paused,
      paused: this.paused,
      autoplayBlocked: this.autoplayBlocked,
    };
  }
  private emit(): void {
    this.recomputeSnap();
    this.stateListeners.forEach((f) => f());
  }
  private emitAmp(a: number): void {
    this.ampListeners.forEach((f) => f(a));
  }

  isEnabled(): boolean {
    return this.enabled;
  }
  isSpeaking(): boolean {
    return !!this.current && !this.paused;
  }
  isPaused(): boolean {
    return this.paused;
  }
  isAutoplayBlocked(): boolean {
    return this.autoplayBlocked;
  }

  setEnabled(v: boolean): void {
    this.enabled = v;
    try { localStorage.setItem(LS_KEY, v ? "1" : "0"); } catch { /* ignore */ }
    if (!v) this.clear();
    else this.emit();
  }
  toggle(): void {
    this.setEnabled(!this.enabled);
  }

  /** Feed a full answer; split into sentences and enqueue. `lang` overrides autodetect. */
  feedText(text: string, langHint?: "ar" | "en"): void {
    if (!this.enabled || !text) return;
    for (const s of splitSentences(text)) this.enqueue(s, langHint);
  }

  enqueue(text: string, langHint?: "ar" | "en"): void {
    const t = text.trim();
    if (!t || !this.enabled) return;
    const lang: "ar" | "en" = langHint ?? (ARABIC_RANGE.test(t) ? "ar" : "en");
    this.queue.push({ id: this.nextId++, text: t, lang });
    if (!this.current && !this.paused) void this.playNext();
  }

  private async playNext(): Promise<void> {
    if (!this.enabled) {
      this.queue = [];
      this.emit();
      return;
    }
    const next = this.queue.shift();
    if (!next) {
      this.emit();
      return;
    }
    try {
      const res = await fetch("/api/public/aria-tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: next.text, lang: next.lang }),
      });
      if (!res.ok) throw new Error(`tts_${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.preload = "auto";
      this.current = { chunk: next, audio, url };
      this.attachAnalyser(audio);
      audio.addEventListener("ended", () => this.finishCurrent(), { once: true });
      audio.addEventListener("error", () => this.finishCurrent(), { once: true });
      this.autoplayBlocked = false;
      try {
        await audio.play();
      } catch {
        // Autoplay blocked — keep queued, expose blocked state; a user
        // gesture (mic tap, toggle, chip) will call resume().
        this.autoplayBlocked = true;
        this.paused = true;
        this.emit();
        return;
      }
      this.emit();
    } catch {
      // TTS unavailable → speechSynthesis fallback for this chunk.
      await this.speakFallback(next);
      this.finishCurrentSilently();
      void this.playNext();
    }
  }

  private attachAnalyser(audio: HTMLAudioElement): void {
    try {
      if (!this.ctx) {
        const Ctor: typeof AudioContext =
          (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ??
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        this.ctx = new Ctor();
      }
      if (this.ctx.state === "suspended") void this.ctx.resume().catch(() => {});
      const src = this.ctx.createMediaElementSource(audio);
      const analyser = this.ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.6;
      src.connect(analyser);
      analyser.connect(this.ctx.destination);
      this.analyser = analyser;
      this.startAmpLoop();
    } catch {
      // MediaElementSource can only be attached once per element; if it
      // ever fails, playback still works — we just skip the amplitude
      // feed for that chunk.
    }
  }

  private startAmpLoop(): void {
    cancelAnimationFrame(this.raf);
    if (!this.analyser) return;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    const tick = (): void => {
      if (!this.current || this.paused || !this.analyser) {
        this.emitAmp(0);
        return;
      }
      this.analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const amp = Math.min(1, Math.sqrt(sum / data.length) * 2.4);
      this.emitAmp(amp);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  private async speakFallback(next: Chunk): Promise<void> {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    return new Promise((resolve) => {
      try {
        const u = new SpeechSynthesisUtterance(next.text);
        u.lang = next.lang === "ar" ? "ar-SA" : "en-US";
        u.rate = 0.95;
        u.pitch = 1.02;
        u.onend = () => resolve();
        u.onerror = () => resolve();
        window.speechSynthesis.speak(u);
      } catch {
        resolve();
      }
    });
  }

  private finishCurrentSilently(): void {
    if (this.current) {
      try { URL.revokeObjectURL(this.current.url); } catch { /* ignore */ }
    }
    this.current = null;
    cancelAnimationFrame(this.raf);
    this.emitAmp(0);
  }

  private finishCurrent(): void {
    this.finishCurrentSilently();
    if (this.paused) {
      this.emit();
      return;
    }
    void this.playNext();
  }

  /** Fade out & pause current chunk; keep queue for resume. */
  interrupt(): void {
    if (!this.current) {
      this.paused = true;
      this.emit();
      return;
    }
    const audio = this.current.audio;
    const startVol = audio.volume;
    const t0 = performance.now();
    const step = (): void => {
      const p = Math.min(1, (performance.now() - t0) / FADE_MS);
      audio.volume = startVol * (1 - p);
      if (p < 1) requestAnimationFrame(step);
      else {
        try { audio.pause(); } catch { /* ignore */ }
        audio.volume = startVol;
        this.paused = true;
        cancelAnimationFrame(this.raf);
        this.emitAmp(0);
        this.emit();
      }
    };
    step();
    try { window.speechSynthesis?.pause(); } catch { /* ignore */ }
  }

  resume(): void {
    this.paused = false;
    this.autoplayBlocked = false;
    if (this.current) {
      this.current.audio.play().then(() => {
        this.startAmpLoop();
        this.emit();
      }).catch(() => {
        this.autoplayBlocked = true;
        this.paused = true;
        this.emit();
      });
    } else {
      void this.playNext();
    }
    try { window.speechSynthesis?.resume(); } catch { /* ignore */ }
    this.emit();
  }

  /** Full stop — drop queue and any current playback. */
  clear(): void {
    this.queue = [];
    this.paused = false;
    if (this.current) {
      try { this.current.audio.pause(); } catch { /* ignore */ }
      try { URL.revokeObjectURL(this.current.url); } catch { /* ignore */ }
    }
    this.current = null;
    this.autoplayBlocked = false;
    cancelAnimationFrame(this.raf);
    this.emitAmp(0);
    try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
    this.emit();
  }
}

const noopQueue: AriaVoiceQueue = {
  subscribeState: () => () => {},
  subscribeAmp: () => () => {},
  getSnapshot: () => ({ enabled: false, speaking: false, paused: false, autoplayBlocked: false }),
  isEnabled: () => false,
  isSpeaking: () => false,
  isPaused: () => false,
  isAutoplayBlocked: () => false,
  setEnabled: () => {},
  toggle: () => {},
  feedText: () => {},
  enqueue: () => {},
  interrupt: () => {},
  resume: () => {},
  clear: () => {},
} as unknown as AriaVoiceQueue;

export const ariaVoice: AriaVoiceQueue =
  typeof window !== "undefined" ? new AriaVoiceQueue() : noopQueue;

const SERVER_SNAP: StateSnap = {
  enabled: false,
  speaking: false,
  paused: false,
  autoplayBlocked: false,
};

export function useAriaVoice(): StateSnap {
  return useSyncExternalStore(
    (cb) => ariaVoice.subscribeState(cb),
    () => ariaVoice.getSnapshot(),
    () => SERVER_SNAP,
  );
}

// Global safety net: Escape stops audio (matches panel-close semantics).
if (typeof window !== "undefined") {
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && ariaVoice.isSpeaking()) ariaVoice.clear();
  });
}
