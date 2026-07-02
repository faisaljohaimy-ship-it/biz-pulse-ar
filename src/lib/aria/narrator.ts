/**
 * ARIA Narrator — additive tap-to-talk / tap-to-silence orchestrator with
 * a directed documentary walkthrough and a soft synthesized underscore.
 *
 * Layered on top of the existing `ariaVoice` queue (TTS + amplitude) and
 * the highlight system. No changes to free chat.
 *
 * Public surface:
 *  - narrator.toggle()          — tap ARIA anywhere: start / silence.
 *  - narrator.silence()         — graceful stop (200ms fade + rest chip).
 *  - narrator.resume()          — continues from the last beat.
 *  - narrator.startFromBeat(n)  — jumps into the flow.
 *  - narrator.autoStartOnce()   — plays automatically ONCE per session.
 *  - useNarrator()              — React snapshot subscription.
 */
import { useSyncExternalStore } from "react";
import { ariaVoice } from "./voice-queue";

/* ------------------------------------------------------------------ */
/* Ambient documentary score — WebAudio synth pad, ducks under voice  */
/* ------------------------------------------------------------------ */

class AmbientScore {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private nodes: OscillatorNode[] = [];
  private lfo: OscillatorNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private running = false;
  private baseLevel = 0.12;
  private duckLevel = 0.06;

  start(): void {
    if (this.running || typeof window === "undefined") return;
    try {
      const Ctor: typeof AudioContext =
        (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctor();
      if (ctx.state === "suspended") void ctx.resume().catch(() => {});
      const master = ctx.createGain();
      master.gain.value = 0;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 900;
      filter.Q.value = 0.4;
      filter.connect(master);
      master.connect(ctx.destination);

      // Slow LFO on filter frequency for breathing pad texture.
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = "sine";
      lfo.frequency.value = 0.08;
      lfoGain.gain.value = 240;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start();

      // Two detuned pads (warm minor drone).
      const freqs = [110, 164.81]; // A2 + E3
      const detunes = [-6, +6];
      for (let i = 0; i < freqs.length; i++) {
        const o1 = ctx.createOscillator();
        o1.type = "sine";
        o1.frequency.value = freqs[i];
        o1.detune.value = detunes[i];
        const o2 = ctx.createOscillator();
        o2.type = "triangle";
        o2.frequency.value = freqs[i] * 2;
        o2.detune.value = -detunes[i];
        const g = ctx.createGain();
        g.gain.value = i === 0 ? 0.55 : 0.35;
        o1.connect(g);
        o2.connect(g);
        g.connect(filter);
        o1.start();
        o2.start();
        this.nodes.push(o1, o2);
      }

      this.ctx = ctx;
      this.master = master;
      this.filter = filter;
      this.lfo = lfo;
      this.running = true;
      // Fade in 400ms.
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(0, now);
      master.gain.linearRampToValueAtTime(this.baseLevel, now + 0.4);
    } catch {
      /* audio unavailable — silent no-op */
    }
  }

  duck(): void {
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(this.duckLevel, now, 0.15);
  }
  swell(): void {
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(this.baseLevel, now, 0.15);
  }

  stop(): void {
    if (!this.ctx || !this.master) {
      this.running = false;
      return;
    }
    const ctx = this.ctx;
    const master = this.master;
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0, now + 2.0);
    window.setTimeout(() => {
      try { this.nodes.forEach((n) => n.stop()); } catch { /* ignore */ }
      try { this.lfo?.stop(); } catch { /* ignore */ }
      try { void ctx.close(); } catch { /* ignore */ }
      this.nodes = [];
      this.lfo = null;
      this.filter = null;
      this.master = null;
      this.ctx = null;
      this.running = false;
    }, 2100);
  }
}

const score = new AmbientScore();

/* ------------------------------------------------------------------ */
/* Highlight helper — glows + smooth scroll to a data-narrator target */
/* ------------------------------------------------------------------ */

const HIGHLIGHT_CLASS = "nx-narrator-glow";
const HIGHLIGHT_STYLE_ID = "nx-narrator-style";

function ensureHighlightStyles(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(HIGHLIGHT_STYLE_ID)) return;
  const s = document.createElement("style");
  s.id = HIGHLIGHT_STYLE_ID;
  s.textContent = `
    .${HIGHLIGHT_CLASS} {
      position: relative;
      transition: box-shadow 400ms ease, transform 400ms ease;
      box-shadow: 0 0 0 2px rgba(58,232,255,0.45), 0 0 44px rgba(0,212,255,0.55), inset 0 0 24px rgba(58,232,255,0.18);
      border-radius: 18px;
    }
    .${HIGHLIGHT_CLASS}::after {
      content: "";
      position: absolute; inset: -6px;
      border-radius: 22px;
      pointer-events: none;
      background: radial-gradient(120% 120% at 50% 50%, rgba(58,232,255,0.10), transparent 65%);
      animation: nx-narrator-pulse 2.2s ease-in-out infinite;
    }
    @keyframes nx-narrator-pulse {
      0%,100% { opacity: .45; }
      50%     { opacity: 1; }
    }
    @media (prefers-reduced-motion: reduce) {
      .${HIGHLIGHT_CLASS}::after { animation: none; }
    }

    .nx-narrator-hint {
      position: absolute; inset: -8px;
      border-radius: 9999px;
      border: 2px solid rgba(58,232,255,0.5);
      pointer-events: none;
      animation: nx-narrator-hint-pulse 2.4s ease-in-out infinite;
    }
    @keyframes nx-narrator-hint-pulse {
      0%,100% { opacity: .35; transform: scale(1); }
      50%     { opacity: .9;  transform: scale(1.08); }
    }
    @media (prefers-reduced-motion: reduce) {
      .nx-narrator-hint { animation: none; opacity: .55; }
    }
  `;
  document.head.appendChild(s);
}

function highlight(selector: string, holdMs: number): () => void {
  if (typeof document === "undefined") return () => {};
  ensureHighlightStyles();
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) return () => {};
  el.classList.add(HIGHLIGHT_CLASS);
  try {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch { /* ignore */ }
  const t = window.setTimeout(() => el.classList.remove(HIGHLIGHT_CLASS), holdMs);
  return () => {
    window.clearTimeout(t);
    el.classList.remove(HIGHLIGHT_CLASS);
  };
}

/* ------------------------------------------------------------------ */
/* Narrator flow                                                       */
/* ------------------------------------------------------------------ */

type Locale = "ar" | "en";

type Beat = {
  id: string;
  /** Highlight target (data-narrator="…"). */
  target?: string;
  text_ar: string;
  text_en: string;
  /** Silent breath before speaking. */
  preSilenceMs?: number;
  /** Gap AFTER speech ends before the next beat starts. */
  postGapMs?: number;
  /** Extra time to hold the highlight (defaults to speech time + gap). */
  holdMs?: number;
};

const BEATS: Beat[] = [
  {
    id: "welcome",
    text_ar: "أهلاً بك في نِكسيوس — منظومة القيادة التنفيذية الذكية.",
    text_en: "Welcome to NEXIOS — the intelligent executive command platform.",
    postGapMs: 2500, // BEAT 2: the deliberate breath.
    holdMs: 6000,
  },
  {
    id: "kpi",
    target: '[data-narrator="kpi-row"]',
    text_ar: "تبدأ رحلتك من نبض العمليات — حيث تتنفس مؤشراتك في الزمن الحقيقي.",
    text_en: "Your journey begins at the operational pulse — where your indicators breathe in real time.",
    postGapMs: 800,
  },
  {
    id: "cta",
    target: '[data-narrator="cta"]',
    text_ar: "ثم غرفة القيادة التنفيذية — قراراتك، ببيانات لحظية.",
    text_en: "Then the Executive Command Room — your decisions, on live data.",
    postGapMs: 800,
  },
  {
    id: "agents",
    target: '[data-narrator="agents"]',
    text_ar: "منظومة الوكلاء الأذكياء تعمل نيابة عنك على مدار الساعة.",
    text_en: "A constellation of intelligent agents works on your behalf, around the clock.",
    postGapMs: 800,
  },
  {
    id: "mic",
    target: '[data-narrator="mic"]',
    text_ar: "وأنا آريا — اسألني بصوتك أو بنصك، في أي صفحة، في أي وقت.",
    text_en: "And I am ARIA — ask me by voice or by text, on any page, at any time.",
    postGapMs: 800,
  },
  {
    id: "closer",
    text_ar: "لنبدأ.",
    text_en: "Let us begin.",
    postGapMs: 400,
  },
];

export type NarratorSnap = {
  active: boolean;
  paused: boolean;
  beatIndex: number;
  totalBeats: number;
  hint: "silenced" | null;
};

const EMPTY_SNAP: NarratorSnap = {
  active: false,
  paused: false,
  beatIndex: -1,
  totalBeats: BEATS.length,
  hint: null,
};

const SESSION_KEY = "aria_narrator_played";

class Narrator {
  private listeners = new Set<() => void>();
  private snap: NarratorSnap = EMPTY_SNAP;
  private beatIndex = -1;
  private timers: number[] = [];
  private clearHighlight: (() => void) | null = null;
  private unsubVoice: (() => void) | null = null;
  private waitingForSpeechEnd = false;
  private lastSpeaking = false;
  private hintTimer = 0;
  private detectLocale: () => Locale = () => {
    if (typeof document === "undefined") return "ar";
    const lang = document.documentElement.getAttribute("lang") ?? "ar";
    return lang.startsWith("ar") ? "ar" : "en";
  };

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  getSnapshot(): NarratorSnap {
    return this.snap;
  }

  private emit(next: Partial<NarratorSnap>): void {
    this.snap = { ...this.snap, ...next };
    this.listeners.forEach((f) => f());
  }
  private clearTimers(): void {
    for (const t of this.timers) window.clearTimeout(t);
    this.timers = [];
  }
  private schedule(fn: () => void, ms: number): void {
    const id = window.setTimeout(() => {
      this.timers = this.timers.filter((x) => x !== id);
      fn();
    }, ms);
    this.timers.push(id);
  }

  isActive(): boolean {
    return this.snap.active;
  }
  isPaused(): boolean {
    return this.snap.paused;
  }

  /** Universal tap. */
  toggle(): void {
    // Any speech currently playing → silence.
    if (ariaVoice.isSpeaking() || this.snap.active) {
      this.silence();
      return;
    }
    if (this.beatIndex >= 0 && this.beatIndex < BEATS.length) {
      this.resume();
    } else {
      this.startFromBeat(0);
    }
  }

  silence(): void {
    this.clearTimers();
    if (this.clearHighlight) { this.clearHighlight(); this.clearHighlight = null; }
    if (this.unsubVoice) { this.unsubVoice(); this.unsubVoice = null; }
    this.waitingForSpeechEnd = false;
    // Fade voice quickly (voice-queue does its own 150ms fade).
    try { ariaVoice.interrupt(); } catch { /* ignore */ }
    // Full stop the queue (drop any pending narrator chunks).
    try { ariaVoice.clear(); } catch { /* ignore */ }
    score.stop();
    this.emit({ active: false, paused: true, hint: "silenced" });
    window.clearTimeout(this.hintTimer);
    this.hintTimer = window.setTimeout(() => {
      this.emit({ hint: null });
    }, 3000);
  }

  resume(): void {
    if (this.snap.active) return;
    const nextIdx = Math.max(0, this.beatIndex);
    this.startFromBeat(nextIdx);
  }

  startFromBeat(idx: number): void {
    if (idx < 0 || idx >= BEATS.length) return;
    this.clearTimers();
    if (this.clearHighlight) { this.clearHighlight(); this.clearHighlight = null; }
    if (this.unsubVoice) { this.unsubVoice(); this.unsubVoice = null; }
    this.emit({ active: true, paused: false, beatIndex: idx, hint: null });
    this.beatIndex = idx;

    // Mark session so autoStartOnce doesn't fire again.
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* ignore */ }

    // Cancel any competing speech (briefing, prior narration).
    try { ariaVoice.clear(); } catch { /* ignore */ }
    // Ensure voice is enabled (respect explicit user mute).
    if (!ariaVoice.isEnabled()) {
      // User muted — run silent (highlights only).
    }

    // Start the score with the first beat only.
    if (idx === 0) score.start();

    // Sidechain: duck when speaking, swell in pauses.
    this.lastSpeaking = false;
    this.unsubVoice = ariaVoice.subscribeState(() => {
      const s = ariaVoice.getSnapshot();
      if (s.speaking && !this.lastSpeaking) score.duck();
      if (!s.speaking && this.lastSpeaking) score.swell();
      this.lastSpeaking = s.speaking;
      // Advance beat when the enqueued chunk finishes.
      if (this.waitingForSpeechEnd && this.lastSpeaking === false && !s.paused) {
        this.waitingForSpeechEnd = false;
        this.afterBeatSpeech();
      }
    });

    this.playBeat(idx);
  }

  private playBeat(idx: number): void {
    const beat = BEATS[idx];
    if (!beat) return this.finishNaturally();
    const locale = this.detectLocale();
    const text = locale === "ar" ? beat.text_ar : beat.text_en;

    // Highlight & scroll (if any) synchronously with sentence start.
    if (this.clearHighlight) { this.clearHighlight(); this.clearHighlight = null; }
    if (beat.target) {
      const holdMs = beat.holdMs ?? Math.max(3000, text.length * 60);
      this.clearHighlight = highlight(beat.target, holdMs);
    }

    if (ariaVoice.isEnabled()) {
      this.waitingForSpeechEnd = true;
      ariaVoice.enqueue(text, locale);
    } else {
      // Silent mode: estimate speaking duration.
      const ms = Math.min(7000, Math.max(1800, text.split(/\s+/).length * 340));
      this.schedule(() => this.afterBeatSpeech(), ms);
    }
  }

  private afterBeatSpeech(): void {
    const beat = BEATS[this.beatIndex];
    if (!beat) return this.finishNaturally();
    const gap = beat.postGapMs ?? 800;
    this.schedule(() => {
      const next = this.beatIndex + 1;
      if (next >= BEATS.length) return this.finishNaturally();
      this.beatIndex = next;
      this.emit({ beatIndex: next });
      this.playBeat(next);
    }, gap);
  }

  private finishNaturally(): void {
    this.clearTimers();
    if (this.clearHighlight) { this.clearHighlight(); this.clearHighlight = null; }
    if (this.unsubVoice) { this.unsubVoice(); this.unsubVoice = null; }
    this.waitingForSpeechEnd = false;
    score.stop();
    // Keep beatIndex at last so tap-again restarts from beginning next time
    // (a completed run is not "resumable").
    this.beatIndex = -1;
    this.emit({ active: false, paused: false, beatIndex: -1, hint: null });
  }

  /** Auto-play once per session. Call after the intro greeting is done. */
  autoStartOnce(delayMs = 3200): void {
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
    } catch { /* ignore */ }
    // Delay so the intro's own greeting/breath completes first.
    window.setTimeout(() => {
      // Skip if user already interacted (page hidden, panel open, etc.).
      if (document.visibilityState !== "visible") return;
      if (this.snap.active) return;
      this.startFromBeat(0);
    }, delayMs);
  }
}

const noop: Narrator = {
  subscribe: () => () => {},
  getSnapshot: () => EMPTY_SNAP,
  isActive: () => false,
  isPaused: () => false,
  toggle: () => {},
  silence: () => {},
  resume: () => {},
  startFromBeat: () => {},
  autoStartOnce: () => {},
} as unknown as Narrator;

export const narrator: Narrator =
  typeof window !== "undefined" ? new Narrator() : noop;

const SERVER_SNAP = EMPTY_SNAP;
export function useNarrator(): NarratorSnap {
  return useSyncExternalStore(
    (cb) => narrator.subscribe(cb),
    () => narrator.getSnapshot(),
    () => SERVER_SNAP,
  );
}

// Stop cleanly on nav.
if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    if (narrator.isActive()) narrator.silence();
  });
}
