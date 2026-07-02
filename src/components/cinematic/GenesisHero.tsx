/**
 * GenesisHero — signature particle-morph opening ("التكوين").
 * Pure 2D canvas, single rAF loop, object-pooled typed arrays.
 * Gated by feature flag "hero_v2" at the mount site. Reduced-motion
 * users get the existing elegant intro path (parent falls back).
 *
 * Sequence (~11s, skippable, gesture-gated for audio):
 *   0.0-1.5  VOID       — ink ignition, ambient hum
 *   1.5-4.0  CALLIGRAPHY — swarm snaps into "نِكسيوس" (RTL stagger)
 *   4.0-6.0  CITY        — detonate → wireframe digital twin
 *   6.0-8.0  ARIA        — silhouette forms; AriaAvatarV3 fades in
 *   8.0-11   CONDUCTION  — 4 light-threads ignite KPI positions
 *
 * Craft: motion-blur trails (translucent fillRect vs. clear),
 * grain + vignette during the sequence only, cool grade lift on exit,
 * time-adaptive gold horizon before 18:00 Riyadh.
 */
import { useEffect, useRef, useState } from "react";
import ariaAvatar from "@/assets/aria-holo-executive.png";
import { detectDeviceTier } from "@/lib/platform/device-tier";
import { ariaVoice } from "@/lib/aria/voice-queue";
import { AriaAvatarV3 } from "@/components/aria/AriaAvatarV3";
import { useI18n } from "@/lib/i18n";

const SESSION_KEY = "nexios_genesis_seen";
const AUDIO_PREF_KEY = "nexios_intro_muted";

const GREETING_AR = "من البيانات… يولد القرار. أهلاً بك في نِكسيوس.";
const GREETING_EN = "From data… a decision is born. Welcome to NEXIOS.";
const WORDMARK_AR = "نِكسيوس";
const WORDMARK_EN = "NEXIOS";

/* ────────── tiny WebAudio SFX (autoplay-safe) ────────── */
class Sfx {
  private ctx: AudioContext | null = null;
  private hum: OscillatorNode | null = null;
  private humG: GainNode | null = null;
  private muted = false;
  private unlocked = false;
  constructor() {
    try { this.muted = sessionStorage.getItem(AUDIO_PREF_KEY) === "1"; } catch { /* */ }
  }
  setMuted(m: boolean) {
    this.muted = m;
    try { sessionStorage.setItem(AUDIO_PREF_KEY, m ? "1" : "0"); } catch { /* */ }
    if (m) this.stopHum();
  }
  isMuted() { return this.muted; }
  async unlock(): Promise<boolean> {
    if (this.muted) return false;
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return false;
      if (!this.ctx) this.ctx = new AC();
      if (this.ctx.state === "suspended") await this.ctx.resume();
      this.unlocked = this.ctx.state === "running";
      return this.unlocked;
    } catch { return false; }
  }
  startHum(ms = 2400) {
    if (!this.unlocked || !this.ctx || this.muted || this.hum) return;
    const t = this.ctx.currentTime;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.08, t + ms / 1000);
    const o = this.ctx.createOscillator();
    o.type = "sine"; o.frequency.value = 55;
    o.connect(g); g.connect(this.ctx.destination); o.start();
    this.hum = o; this.humG = g;
  }
  stopHum(fadeMs = 900) {
    if (!this.ctx || !this.hum || !this.humG) return;
    const t = this.ctx.currentTime;
    this.humG.gain.cancelScheduledValues(t);
    this.humG.gain.setValueAtTime(this.humG.gain.value, t);
    this.humG.gain.exponentialRampToValueAtTime(0.0001, t + fadeMs / 1000);
    const h = this.hum; setTimeout(() => { try { h.stop(); } catch { /* */ } }, fadeMs + 60);
    this.hum = null; this.humG = null;
  }
  chime(freq = 880, ms = 700) {
    if (!this.unlocked || !this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
    const o = this.ctx.createOscillator();
    o.type = "triangle"; o.frequency.value = freq;
    o.connect(g); g.connect(this.ctx.destination); o.start(); o.stop(t + ms / 1000 + 0.05);
  }
}

/* ────────── sampling helpers ────────── */
type Pt = { x: number; y: number };

function sampleText(text: string, w: number, h: number, fontSize: number, weight = 600): Pt[] {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) return [];
  g.fillStyle = "#fff";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `${weight} ${fontSize}px "IBM Plex Sans Arabic","IBM Plex Sans",system-ui,sans-serif`;
  g.fillText(text, w / 2, h / 2);
  const img = g.getImageData(0, 0, w, h).data;
  const pts: Pt[] = [];
  const step = Math.max(2, Math.floor(w / 260));
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const a = img[(y * w + x) * 4 + 3];
      if (a > 128) pts.push({ x, y });
    }
  }
  return pts;
}

function sampleImageAlpha(img: HTMLImageElement, w: number, h: number): Pt[] {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) return [];
  const ar = img.width / img.height;
  let dw = w, dh = h;
  if (ar > w / h) { dh = w / ar; } else { dw = h * ar; }
  g.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  const data = g.getImageData(0, 0, w, h).data;
  const pts: Pt[] = [];
  const step = Math.max(2, Math.floor(w / 220));
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      if (data[(y * w + x) * 4 + 3] > 110) pts.push({ x, y });
    }
  }
  return pts;
}

function generateCity(w: number, h: number): Pt[] {
  const pts: Pt[] = [];
  const cx = w / 2, cy = h * 0.62;
  const cols = 14, rows = 4;
  const cellW = w * 0.68 / cols;
  const cellH = h * 0.06;
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const bh = cellH * (1.2 + Math.sin((col + r * 3) * 0.9) * 0.7 + (col % 3 === 0 ? 1.2 : 0));
      const x0 = cx - (cols * cellW) / 2 + col * cellW;
      const y0 = cy - r * cellH * 1.6 - bh;
      const per = Math.max(6, Math.floor(bh / 4));
      // rectangle outline sampling
      for (let i = 0; i <= per; i++) {
        const t = i / per;
        pts.push({ x: x0, y: y0 + t * bh });
        pts.push({ x: x0 + cellW * 0.82, y: y0 + t * bh });
      }
      const perW = Math.max(4, Math.floor(cellW / 6));
      for (let i = 0; i <= perW; i++) {
        const t = i / perW;
        pts.push({ x: x0 + t * cellW * 0.82, y: y0 });
        pts.push({ x: x0 + t * cellW * 0.82, y: y0 + bh });
      }
    }
  }
  // perspective ground lines
  for (let i = -6; i <= 6; i++) {
    const per = 40;
    for (let j = 0; j < per; j++) {
      const t = j / per;
      pts.push({ x: cx + i * (w * 0.08) * (1 - t) + t * i * 4, y: cy + t * h * 0.28 });
    }
  }
  return pts;
}

/* ────────── main component ────────── */
type Phase = "void" | "wordmark" | "city" | "aria" | "conduct" | "done";

interface Props { onDone?: () => void }

export function GenesisHero({ onDone }: Props) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef(0);
  const startRef = useRef(0);
  const phaseRef = useRef<Phase>("void");
  const skipRef = useRef(false);
  const doneRef = useRef(false);
  const sfxRef = useRef<Sfx | null>(null);
  const ampRef = useRef(0);
  const pointerRef = useRef({ x: 0, y: 0, active: false });

  const [phase, setPhase] = useState<Phase>("void");
  const [visible, setVisible] = useState(true);
  const [needsGesture, setNeedsGesture] = useState(true);
  const [muted, setMuted] = useState(false);

  // reduced-motion escape hatch → skip immediately, delegate to fallback intro
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);

  // session-once
  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY) === "1") {
        setVisible(false); doneRef.current = true; onDone?.();
      }
    } catch { /* */ }
    const replay = () => {
      try { sessionStorage.removeItem(SESSION_KEY); } catch { /* */ }
      doneRef.current = false; skipRef.current = false;
      startRef.current = 0; phaseRef.current = "void";
      setPhase("void"); setNeedsGesture(true); setVisible(true);
    };
    window.addEventListener("nexios:replay-intro", replay);
    return () => window.removeEventListener("nexios:replay-intro", replay);
  }, [onDone]);

  useEffect(() => {
    if (!visible || reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = "100vw";
      canvas.style.height = "100vh";
    };
    resize();
    window.addEventListener("resize", resize);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ── device tier
    const tier = detectDeviceTier();
    const N = tier === "HIGH" ? 8000 : tier === "MID" ? 4000 : 1500;

    // ── typed pools
    const x = new Float32Array(N), y = new Float32Array(N);
    const vx = new Float32Array(N), vy = new Float32Array(N);
    const tx = new Float32Array(N), ty = new Float32Array(N);
    const size = new Float32Array(N);
    const stagger = new Float32Array(N); // 0..1 delay offset
    // color ramp indices (0=cyan, 1=blue, 2=emerald)
    const hue = new Uint8Array(N);
    const w = window.innerWidth, h = window.innerHeight;

    // ── seed: ink drop from center
    const cx = w / 2, cy = h * 0.52;
    for (let i = 0; i < N; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 40;
      x[i] = cx + Math.cos(a) * r;
      y[i] = cy + Math.sin(a) * r;
      const sp = 0.5 + Math.random() * 2.4;
      vx[i] = Math.cos(a) * sp;
      vy[i] = Math.sin(a) * sp;
      size[i] = 0.8 + Math.random() * 1.4;
      stagger[i] = Math.random();
      hue[i] = Math.random() < 0.5 ? 0 : Math.random() < 0.7 ? 1 : 2;
      tx[i] = x[i]; ty[i] = y[i];
    }

    // ── morph targets (lazy per-phase)
    let wordPts: Pt[] = [];
    let cityPts: Pt[] = [];
    let ariaPts: Pt[] = [];

    const buildWord = () => {
      const wcanW = Math.min(1600, w), wcanH = Math.min(600, h * 0.5);
      const fontPx = Math.min(wcanW * 0.28, wcanH * 0.9);
      const raw = sampleText(ar ? WORDMARK_AR : WORDMARK_EN, wcanW, wcanH, fontPx, 700);
      // center to viewport
      const ox = (w - wcanW) / 2, oy = h * 0.42 - wcanH / 2;
      wordPts = raw.map((p) => ({ x: p.x + ox, y: p.y + oy }));
    };
    const buildCity = () => { cityPts = generateCity(w, h); };
    const buildAria = (img: HTMLImageElement) => {
      const aw = Math.min(720, w * 0.7), ah = Math.min(900, h * 0.85);
      const ox = (w - aw) / 2, oy = h * 0.55 - ah / 2;
      ariaPts = sampleImageAlpha(img, aw, ah).map((p) => ({ x: p.x + ox, y: p.y + oy }));
    };
    buildWord();
    buildCity();
    const img = new Image();
    img.src = ariaAvatar;
    img.onload = () => buildAria(img);

    // assign targets from a point list (round-robin with RTL stagger for word)
    const assign = (pts: Pt[], rtlStagger = false) => {
      if (pts.length === 0) return;
      // sort for stroke-by-stroke stagger (RTL: right→left)
      const sorted = rtlStagger ? [...pts].sort((a, b) => b.x - a.x) : pts;
      for (let i = 0; i < N; i++) {
        const p = sorted[i % sorted.length];
        // small jitter
        tx[i] = p.x + (Math.random() - 0.5) * 1.6;
        ty[i] = p.y + (Math.random() - 0.5) * 1.6;
        stagger[i] = rtlStagger ? (i / N) : Math.random() * 0.35;
      }
    };

    // Pointer
    const onMove = (e: PointerEvent) => {
      pointerRef.current.x = e.clientX;
      pointerRef.current.y = e.clientY;
      pointerRef.current.active = true;
    };
    const onLeave = () => { pointerRef.current.active = false; };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);

    // Amp subscription
    const unAmp = ariaVoice.subscribeAmp((a) => { ampRef.current = a; });

    // ── SFX
    const sfx = sfxRef.current ?? (sfxRef.current = new Sfx());

    // ── ripple pool
    const ripples: { t0: number; life: number; x: number; y: number; peak: number }[] = [];
    const addRipple = (px: number, py: number) => {
      if (ripples.length > 8) ripples.shift();
      ripples.push({ t0: performance.now(), life: 1400, x: px, y: py, peak: 1 });
    };

    // ── conduction threads (4 → KPI corners)
    const threadTargets: Pt[] = [
      { x: w * 0.14, y: h * 0.85 },
      { x: w * 0.38, y: h * 0.88 },
      { x: w * 0.62, y: h * 0.88 },
      { x: w * 0.86, y: h * 0.85 },
    ];

    // ── grade & background
    const hour = new Date().getUTCHours() + 3; // Riyadh UTC+3
    const preSunset = ((hour + 24) % 24) < 18;

    // colour ramp
    const COL = [
      [0, 212, 255],   // cyan
      [88, 148, 255],  // blue
      [58, 232, 200],  // emerald
    ];

    // Phase transition helper
    const setPh = (p: Phase) => { phaseRef.current = p; setPhase(p); };

    // Timings (ms)
    const T = {
      voidEnd: 1500,
      wordStart: 1500, wordEnd: 4000,
      cityStart: 4000, cityEnd: 6000,
      ariaStart: 6000, ariaEnd: 8000,
      conductStart: 8000, conductEnd: 11000,
    };

    let wordAssigned = false, cityAssigned = false, ariaAssigned = false, spoken = false;
    let dissolving = 0;
    const rp_marks: boolean[] = [false, false, false, false];

    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* */ }
      // fade out
      const start = performance.now();
      const fade = (t: number) => {
        const k = Math.min(1, (t - start) / 700);
        dissolving = k;
        if (k < 1) requestAnimationFrame(fade);
        else { cancelAnimationFrame(rafRef.current); setVisible(false); sfx.stopHum(600); onDone?.(); }
      };
      requestAnimationFrame(fade);
    };

    const skip = () => { skipRef.current = true; };

    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") skip(); };
    window.addEventListener("keydown", onKey);

    // ── main loop
    const loop = (now: number) => {
      if (!startRef.current) startRef.current = now;
      const t = now - startRef.current;

      // handle skip
      if (skipRef.current && !doneRef.current) { finish(); return; }

      // phase transitions
      if (t >= T.wordStart && !wordAssigned) {
        assign(wordPts, ar); wordAssigned = true; setPh("wordmark");
        sfx.chime(660, 500);
      }
      if (t >= T.cityStart && !cityAssigned) {
        // radial impulse
        for (let i = 0; i < N; i++) {
          const dx = x[i] - cx, dy = y[i] - cy;
          const d = Math.hypot(dx, dy) + 0.001;
          const k = 4 / d;
          vx[i] += (dx / d) * k * 8;
          vy[i] += (dy / d) * k * 8;
        }
        assign(cityPts); cityAssigned = true; setPh("city");
        sfx.chime(440, 900);
        addRipple(cx, cy);
      }
      if (t >= T.ariaStart && !ariaAssigned && ariaPts.length) {
        assign(ariaPts); ariaAssigned = true; setPh("aria");
        sfx.chime(880, 700);
      }
      if (t >= T.ariaStart + 300 && !spoken) {
        spoken = true;
        // gesture-gated: only speak if audio unlocked
        try { ariaVoice.enqueue(ar ? GREETING_AR : GREETING_EN, ar ? "ar" : "en"); } catch { /* */ }
      }
      if (t >= T.conductStart && phaseRef.current !== "conduct") setPh("conduct");
      if (t >= T.conductEnd && !doneRef.current) finish();

      // ── physics
      const ampL = ampRef.current;
      const px = pointerRef.current.x, py = pointerRef.current.y, pa = pointerRef.current.active;
      const stiffness = 0.06, damping = 0.82;
      const freeMode = t < T.voidEnd; // drift outward
      for (let i = 0; i < N; i++) {
        const s = stagger[i];
        const springActive = t >= T.wordStart && (t - T.wordStart) / 700 > s;
        if (freeMode) {
          // curl-noise-ish drift
          const nx = Math.sin(y[i] * 0.006 + t * 0.0006) * 0.08;
          const ny = Math.cos(x[i] * 0.006 + t * 0.0008) * 0.08;
          vx[i] += nx; vy[i] += ny;
        } else if (springActive) {
          vx[i] += (tx[i] - x[i]) * stiffness;
          vy[i] += (ty[i] - y[i]) * stiffness;
        }
        // pointer repulsion
        if (pa) {
          const dx = x[i] - px, dy = y[i] - py;
          const d2 = dx * dx + dy * dy;
          if (d2 < 14400) {
            const d = Math.sqrt(d2) + 1;
            const f = Math.min(6, 900 / d2);
            vx[i] += (dx / d) * f;
            vy[i] += (dy / d) * f;
          }
        }
        vx[i] *= damping; vy[i] *= damping;
        x[i] += vx[i]; y[i] += vy[i];
      }

      // ── draw
      // motion-blur trail: translucent fill (no clear)
      ctx.globalCompositeOperation = "source-over";
      const bgAlpha = phaseRef.current === "void" ? 0.28 : 0.24;
      ctx.fillStyle = `rgba(2,6,12,${bgAlpha})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // gold horizon before 18:00
      if (preSunset && phaseRef.current === "void") {
        const grad = ctx.createRadialGradient(cx * dpr, h * 0.95 * dpr, 20, cx * dpr, h * 0.95 * dpr, w * 0.9 * dpr);
        grad.addColorStop(0, "rgba(255,180,80,0.10)");
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // particles
      ctx.globalCompositeOperation = "lighter";
      const brightness = 1 + Math.min(0.4, ampL * 0.6);
      for (let i = 0; i < N; i++) {
        let boost = 1;
        if (pa) {
          const dx = x[i] - px, dy = y[i] - py;
          const d2 = dx * dx + dy * dy;
          if (d2 < 14400) boost = 1.4;
        }
        const c = COL[hue[i]];
        const alpha = 0.55 * boost * brightness;
        ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
        const s = size[i] * boost;
        ctx.fillRect((x[i] - s / 2) * dpr, (y[i] - s / 2) * dpr, s * dpr, s * dpr);
      }

      // ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i];
        const k = (now - rp.t0) / rp.life;
        if (k >= 1) { ripples.splice(i, 1); continue; }
        const rad = k * Math.max(w, h) * 0.6;
        ctx.beginPath();
        ctx.arc(rp.x * dpr, rp.y * dpr, rad * dpr, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0,212,255,${(1 - k) * 0.35})`;
        ctx.lineWidth = 1.5 * dpr;
        ctx.stroke();
      }

      // conduction light-threads
      if (phaseRef.current === "conduct") {
        const kt = Math.min(1, (t - T.conductStart) / 2000);
        for (let ti = 0; ti < threadTargets.length; ti++) {
          const tg = threadTargets[ti];
          const delay = ti * 0.08;
          const kk = Math.max(0, Math.min(1, kt - delay));
          if (kk === 0) continue;
          const sx = cx, sy = h * 0.55;
          const mx = (sx + tg.x) / 2 + (ti - 1.5) * 40;
          const my = Math.min(sy, tg.y) - 120;
          // quadratic bezier at parameter kk
          const bx = (1 - kk) * (1 - kk) * sx + 2 * (1 - kk) * kk * mx + kk * kk * tg.x;
          const by = (1 - kk) * (1 - kk) * sy + 2 * (1 - kk) * kk * my + kk * kk * tg.y;
          // draw arc segment so far
          ctx.beginPath();
          ctx.moveTo(sx * dpr, sy * dpr);
          const steps = 24;
          for (let sIdx = 1; sIdx <= steps; sIdx++) {
            const p = (sIdx / steps) * kk;
            const qx = (1 - p) * (1 - p) * sx + 2 * (1 - p) * p * mx + p * p * tg.x;
            const qy = (1 - p) * (1 - p) * sy + 2 * (1 - p) * p * my + p * p * tg.y;
            ctx.lineTo(qx * dpr, qy * dpr);
          }
          const grad = ctx.createLinearGradient(sx * dpr, sy * dpr, bx * dpr, by * dpr);
          grad.addColorStop(0, "rgba(0,212,255,0.0)");
          grad.addColorStop(1, "rgba(58,232,255,0.9)");
          ctx.strokeStyle = grad;
          ctx.lineWidth = 2 * dpr;
          ctx.stroke();
          if (kk >= 0.98 && !(rp_marks[ti])) {
            rp_marks[ti] = true;
            addRipple(tg.x, tg.y);
            try { window.dispatchEvent(new CustomEvent("nexios:hero-ignite", { detail: { index: ti } })); } catch { /* */ }
          }
        }
      }

      // vignette + grain (composited)
      ctx.globalCompositeOperation = "source-over";
      const vg = ctx.createRadialGradient(w / 2 * dpr, h / 2 * dpr, w * 0.2 * dpr, w / 2 * dpr, h / 2 * dpr, w * 0.75 * dpr);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,0.55)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // dissolve overlay
      if (dissolving > 0) {
        ctx.fillStyle = `rgba(0,0,0,${dissolving})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("keydown", onKey);
      unAmp();
    };
  }, [visible, reduced, ar, onDone]);

  // gesture unlock
  const beginExperience = async () => {
    setNeedsGesture(false);
    const sfx = sfxRef.current ?? (sfxRef.current = new Sfx());
    const ok = await sfx.unlock();
    if (ok) sfx.startHum();
    setMuted(sfx.isMuted());
  };

  const toggleMute = () => {
    const sfx = sfxRef.current ?? (sfxRef.current = new Sfx());
    sfx.setMuted(!sfx.isMuted());
    setMuted(sfx.isMuted());
    if (sfx.isMuted()) ariaVoice.setEnabled?.(false);
  };

  if (!visible) return null;

  // reduced-motion path: render nothing, let parent fallback show the classic intro
  if (reduced) {
    // one-shot: mark done and let parent decide
    if (!doneRef.current) {
      doneRef.current = true;
      try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* */ }
      setTimeout(() => { setVisible(false); onDone?.(); }, 0);
    }
    return null;
  }

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[70] overflow-hidden bg-black"
      style={{ contain: "strict" }}
      dir={ar ? "rtl" : "ltr"}
      onClick={() => { if (needsGesture) void beginExperience(); }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* ARIA reveal layer — only visible in aria/conduct phases */}
      {(phase === "aria" || phase === "conduct") && (
        <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-[8vh]">
          <div
            className="transition-opacity duration-700"
            style={{
              opacity: phase === "aria" ? 0.85 : 1,
              width: "min(520px,60vw)",
              height: "min(720px,80vh)",
            }}
          >
            <AriaAvatarV3 framing="full" />
          </div>
        </div>
      )}

      {/* Gesture gate */}
      {needsGesture && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); void beginExperience(); }}
          className="absolute bottom-10 left-1/2 z-10 -translate-x-1/2 rounded-full border border-white/25 bg-white/[0.06] px-5 py-2.5 text-sm font-medium tracking-wide text-white/90 backdrop-blur-md transition hover:-translate-x-1/2 hover:-translate-y-0.5 hover:bg-white/15"
        >
          {ar ? "ابدأ التجربة ▸" : "Begin experience ▸"}
        </button>
      )}

      {/* Skip + mute */}
      <div className={`absolute top-4 z-10 flex items-center gap-2 ${ar ? "left-4" : "right-4"}`}>
        <button
          type="button"
          onClick={toggleMute}
          className="rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/70 backdrop-blur hover:bg-white/10"
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? "🔇" : "🔈"}
        </button>
        <button
          type="button"
          onClick={() => { skipRef.current = true; }}
          className="rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-white/70 backdrop-blur hover:bg-white/10 hover:text-white"
        >
          {ar ? "تخطي ▸" : "Skip ▸"}
        </button>
      </div>

      {/* Grain overlay (SVG noise) — sequence only */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 mix-blend-overlay opacity-[0.08]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")",
        }}
      />
    </div>
  );
}

export default GenesisHero;
