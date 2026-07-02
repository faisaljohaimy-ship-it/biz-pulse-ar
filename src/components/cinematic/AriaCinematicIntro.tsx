/**
 * AriaCinematicIntro — film-grade opening overlay.
 * Additive. Plays once per session (or on manual replay via
 * window "nexios:replay-intro"). Never modifies existing state.
 *
 * Direction pass:
 *  - 5-layer parallax depth stack (mouse-move on desktop, static on mobile)
 *  - Directed timeline w/ anticipation, settle, volumetric sweep
 *  - Grain + vignette + cool color grade (intro only)
 *  - WebAudio SFX (ambient hum + chime), autoplay-safe, ~0KB
 *  - Escape / Skip / reduced-motion honored (1.5s fade path)
 */
import { useEffect, useRef, useState } from "react";
import ariaAvatar from "@/assets/aria-holo-executive.png";
import { useI18n } from "@/lib/i18n";
import { ariaVoice, useAriaVoice } from "@/lib/aria/voice-queue";

const SESSION_KEY = "nexios_intro_seen";
const AUDIO_PREF_KEY = "nexios_intro_muted";

const GREETING_AR = "مرحباً. أنا آريا — مساعدك التنفيذي الرقمي. النظام جاهز.";
const GREETING_EN = "Hello. I am ARIA — your Digital Executive. The system is ready.";
const HEADLINE_AR = "المستقبل ذكي. المستقبل نِكسيوس.";
const HEADLINE_EN = "The future is intelligent. The future is NEXIOS.";

const EASE = "cubic-bezier(0.16,1,0.3,1)";

type Phase = "ignite" | "materialize" | "settle" | "greet" | "headline" | "dissolve" | "done";

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduced;
}

/* ---------- tiny WebAudio SFX (no assets, autoplay-safe) ---------- */
class IntroSfx {
  private ctx: AudioContext | null = null;
  private humGain: GainNode | null = null;
  private hum: OscillatorNode | null = null;
  private unlocked = false;
  private muted = false;

  constructor() {
    try {
      this.muted = typeof sessionStorage !== "undefined" && sessionStorage.getItem(AUDIO_PREF_KEY) === "1";
    } catch { /* ignore */ }
  }
  setMuted(m: boolean) {
    this.muted = m;
    try { sessionStorage.setItem(AUDIO_PREF_KEY, m ? "1" : "0"); } catch { /* ignore */ }
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
  startHum(durationMs = 2400) {
    if (!this.unlocked || !this.ctx || this.muted || this.hum) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.09, now + durationMs / 1000);
    const o = ctx.createOscillator();
    o.type = "sine"; o.frequency.value = 55;
    const o2 = ctx.createOscillator();
    o2.type = "sine"; o2.frequency.value = 82.5;
    const g2 = ctx.createGain(); g2.gain.value = 0.35;
    o2.connect(g2).connect(g);
    o.connect(g).connect(ctx.destination);
    o.start(); o2.start();
    this.hum = o; this.humGain = g;
  }
  stopHum() {
    if (!this.ctx || !this.hum || !this.humGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    try {
      this.humGain.gain.cancelScheduledValues(now);
      this.humGain.gain.setValueAtTime(this.humGain.gain.value, now);
      this.humGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
      this.hum.stop(now + 0.7);
    } catch { /* ignore */ }
    this.hum = null; this.humGain = null;
  }
  chime() {
    if (!this.unlocked || !this.ctx || this.muted) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    [1320, 1760, 2640].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, now + i * 0.03);
      g.gain.exponentialRampToValueAtTime(0.08, now + i * 0.03 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.03 + 0.9);
      o.connect(g).connect(ctx.destination);
      o.start(now + i * 0.03); o.stop(now + i * 0.03 + 1.0);
    });
  }
  dispose() { this.stopHum(); try { this.ctx?.close(); } catch { /* ignore */ } this.ctx = null; }
}

export function AriaCinematicIntro() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const greeting = ar ? GREETING_AR : GREETING_EN;
  const headline = ar ? HEADLINE_AR : HEADLINE_EN;

  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState<boolean>(false);
  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY) !== "1") setMounted(true);
    } catch { setMounted(true); }
    const replay = () => {
      try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
      setMounted(true);
      setPhase("ignite");
      setTyped(0);
      setAvatarIn(false);
      setSettled(false);
      setDissolving(false);
      setHeadlineIn(false);
      spokeRef.current = false;
    };
    window.addEventListener("nexios:replay-intro", replay);
    return () => window.removeEventListener("nexios:replay-intro", replay);
  }, []);

  const [phase, setPhase] = useState<Phase>("ignite");
  const [typed, setTyped] = useState(0);
  const [avatarIn, setAvatarIn] = useState(false);
  const [settled, setSettled] = useState(false);
  const [dissolving, setDissolving] = useState(false);
  const [headlineIn, setHeadlineIn] = useState(false);
  const [started, setStarted] = useState(false);
  const [muted, setMutedState] = useState<boolean>(() => {
    try { return sessionStorage.getItem(AUDIO_PREF_KEY) === "1"; } catch { return false; }
  });


  const voice = useAriaVoice();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const skipRef = useRef<HTMLButtonElement | null>(null);
  const liveRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const parallaxRef = useRef<HTMLDivElement | null>(null);
  const timersRef = useRef<number[]>([]);
  const spokeRef = useRef(false);
  const sfxRef = useRef<IntroSfx | null>(null);
  if (!sfxRef.current && typeof window !== "undefined") sfxRef.current = new IntroSfx();

  /* speak greeting */
  useEffect(() => {
    if (phase !== "greet" || spokeRef.current) return;
    if (!ariaVoice.isEnabled()) return;
    spokeRef.current = true;
    ariaVoice.enqueue(greeting);
  }, [phase, greeting]);

  /* cleanup audio on unmount */
  useEffect(() => () => { ariaVoice.clear(); sfxRef.current?.dispose(); }, []);

  const finish = () => {
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* ignore */ }
    sfxRef.current?.stopHum();
    setMounted(false);
  };

  const skip = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    finish();
  };

  /* ---------- particle field (2 depth layers) ---------- */
  useEffect(() => {
    if (!mounted || reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = window.innerWidth, h = window.innerHeight;
    const resize = () => {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w + "px"; canvas.style.height = h + "px";
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const hc = (navigator as Navigator & { hardwareConcurrency?: number }).hardwareConcurrency ?? 4;
    const isMobile = w < 640;
    const nearCount = isMobile || hc < 4 ? 60 : 160;
    const farCount  = isMobile || hc < 4 ? 40 : 100;

    const cx = w / 2, cy = h / 2;
    const mk = (near: boolean) => Array.from({ length: near ? nearCount : farCount }, () => {
      const angle = Math.random() * Math.PI * 2;
      const radius = 220 + Math.random() * 380;
      return {
        a: angle, r: radius,
        tr: 40 + Math.random() * (near ? 90 : 200),
        s: (0.0008 + Math.random() * 0.0018) * (near ? 1 : 0.55),
        size: (near ? 0.7 : 0.4) + Math.random() * (near ? 1.5 : 0.9),
        hue: 188 + Math.random() * 34,
        near,
      };
    });
    const near = mk(true);
    const far  = mk(false);

    let raf = 0;
    const start = performance.now();
    const loop = (now: number) => {
      const t = (now - start) / 1000;
      const conv = Math.min(1, Math.max(0, (t - 1.2) / 1.4));
      ctx.clearRect(0, 0, w, h);

      // central glow
      const glowR = 40 + Math.min(180, t * 90);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
      g.addColorStop(0,   "rgba(80,180,255,0.55)");
      g.addColorStop(0.4, "rgba(34,211,238,0.22)");
      g.addColorStop(1,   "rgba(10,14,20,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, glowR, 0, Math.PI * 2); ctx.fill();

      // far layer (slower, dimmer)
      for (const p of far) {
        p.a += p.s * 16;
        const r = p.r + (p.tr - p.r) * conv;
        const x = cx + Math.cos(p.a) * r;
        const y = cy + Math.sin(p.a) * r * 0.9;
        ctx.beginPath();
        ctx.fillStyle = `hsla(${p.hue}, 90%, 70%, ${0.16 + 0.24 * (1 - conv)})`;
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      // near layer
      for (const p of near) {
        p.a += p.s * 16;
        const r = p.r + (p.tr - p.r) * conv;
        const x = cx + Math.cos(p.a) * r;
        const y = cy + Math.sin(p.a) * r * 0.85;
        ctx.beginPath();
        ctx.fillStyle = `hsla(${p.hue}, 95%, 68%, ${0.35 + 0.55 * (1 - conv)})`;
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      if (phase !== "done" && !dissolving) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [mounted, reduced, phase, dissolving]);

  /* ---------- mouse parallax (desktop) ---------- */
  useEffect(() => {
    if (!mounted || reduced) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const el = parallaxRef.current;
    if (!el) return;
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    const onMove = (e: MouseEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const tick = () => {
      cx += (tx - cx) * 0.06; cy += (ty - cy) * 0.06;
      el.style.setProperty("--px", cx.toFixed(3));
      el.style.setProperty("--py", cy.toFixed(3));
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => { window.removeEventListener("mousemove", onMove); cancelAnimationFrame(raf); };
  }, [mounted, reduced]);

  /* ---------- directed timeline ---------- */
  useEffect(() => {
    if (!mounted || !started) return;

    setTimeout(() => skipRef.current?.focus(), 60);
    setTimeout(() => { if (liveRef.current) liveRef.current.textContent = greeting; }, 400);

    if (reduced) {
      setAvatarIn(true); setSettled(true); setHeadlineIn(true);
      setTyped(greeting.length); setPhase("greet");
      const t = window.setTimeout(finish, 1500);
      timersRef.current.push(t);
      return () => { timersRef.current.forEach(clearTimeout); timersRef.current = []; };
    }

    const push = (fn: () => void, ms: number) => {
      const id = window.setTimeout(fn, ms);
      timersRef.current.push(id);
    };

    // 0.0–0.8s ignite (anticipation shrink happens via CSS below)
    // 0.8–2.4s materialize
    push(() => { setPhase("materialize"); setAvatarIn(true); sfxRef.current?.startHum(2400); }, 800);
    // 2.4–2.6s settle
    push(() => { setPhase("settle"); setSettled(true); sfxRef.current?.chime(); }, 2400);
    // 2.6–4.4s greet + type
    push(() => setPhase("greet"), 2600);
    const startTyping = 2600;
    const perChar = 1600 / Math.max(greeting.length, 1);
    for (let i = 1; i <= greeting.length; i++) {
      push(() => setTyped(i), startTyping + i * perChar);
    }
    // 4.4–5.0s headline
    push(() => { setPhase("headline"); setHeadlineIn(true); }, 4400);
    // 5.0–7.5s dissolve
    push(() => { setPhase("dissolve"); setDissolving(true); sfxRef.current?.stopHum(); }, 5000);
    push(() => { setPhase("done"); finish(); }, 7500);

    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") skip(); };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, reduced, started]);


  if (!mounted) return null;

  const shownGreeting = greeting.slice(0, typed);
  const igniteScale = phase === "ignite" ? 0.92 : 1;

  const toggleMute = () => {
    const next = !muted;
    setMutedState(next);
    sfxRef.current?.setMuted(next);
  };

  const enableAudio = async () => {
    const ok = await sfxRef.current?.unlock();
    if (ok && phase !== "done" && !dissolving) sfxRef.current?.startHum(1200);
    // let ARIA's voice queue resume too
    if (voice.enabled && voice.autoplayBlocked) ariaVoice.resume();
  };

  const beginExperience = async () => {
    if (started) return;
    // Gesture — unlock audio BEFORE the timeline runs so greeting is audible.
    await sfxRef.current?.unlock();
    // Probe TTS path once and log it explicitly.
    let path: "elevenlabs" | "browser" | "text-only" = "text-only";
    try {
      const r = await fetch("/api/public/aria-tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: ar ? "جاهزة." : "Ready.", lang: ar ? "ar" : "en" }),
      });
      if (r.ok) path = "elevenlabs";
      else if (typeof window !== "undefined" && "speechSynthesis" in window) path = "browser";
    } catch {
      if (typeof window !== "undefined" && "speechSynthesis" in window) path = "browser";
    }
    // eslint-disable-next-line no-console
    console.info("ARIA voice path:", path);
    if (path === "browser" && ar) {
      try {
        const voices = window.speechSynthesis?.getVoices?.() ?? [];
        const hasAr = voices.some((v) => v.lang?.toLowerCase().startsWith("ar"));
        if (!hasAr && !sessionStorage.getItem("nx_hint_chrome_voice")) {
          sessionStorage.setItem("nx_hint_chrome_voice", "1");
          window.dispatchEvent(new CustomEvent("nexios:hint", { detail: { message: "أفضل تجربة صوتية عبر Chrome" } }));
        }
      } catch { /* ignore */ }
    }
    setStarted(true);
  };


  return (
    <div
      ref={overlayRef}
      dir={ar ? "rtl" : "ltr"}
      role="dialog"
      aria-label={ar ? "افتتاحية آريا" : "ARIA Intro"}
      className="fixed inset-0 z-[2147483000] overflow-hidden"
      style={{
        background: "#05070C",
        opacity: dissolving ? 0 : 1,
        transition: `opacity 900ms ${EASE}`,
        pointerEvents: dissolving ? "none" : "auto",
        willChange: "opacity, filter",
        // cool color grade (removed with the overlay itself at exit)
        filter: dissolving ? "none" : "saturate(1.05) contrast(1.02) hue-rotate(-4deg)",
      }}
    >
      <div ref={liveRef} aria-live="polite" className="sr-only" />

      {/* Parallax root — CSS vars --px/--py updated per rAF */}
      <div
        ref={parallaxRef}
        className="absolute inset-0"
        style={{ ["--px" as string]: 0, ["--py" as string]: 0 }}
      >
        {/* L1 city-glow gradient backdrop (slow drift) */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 55%, rgba(0,80,140,0.35), rgba(5,7,12,0) 70%), radial-gradient(90% 60% at 50% 100%, rgba(0,50,90,0.45), rgba(5,7,12,0) 70%)",
            transform: "translate3d(calc(var(--px) * -6px), calc(var(--py) * -6px), 0)",
            animation: reduced ? undefined : "nx-drift 20s ease-in-out infinite alternate",
            willChange: "transform",
          }}
        />

        {/* L2 volumetric particles */}
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="absolute inset-0 h-full w-full"
          style={{
            transform: "translate3d(calc(var(--px) * -3px), calc(var(--py) * -3px), 0)",
            willChange: "transform, opacity",
          }}
        />

        {/* Radial dissolve mask (fades with the exit) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, rgba(5,7,12,0) 0%, rgba(5,7,12,0) 30%, rgba(5,7,12,0.85) 72%)",
            opacity: dissolving ? 0 : 1,
            transition: `opacity 800ms ${EASE}`,
          }}
        />

        {/* L3 ARIA rig */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="relative flex flex-col items-center"
            style={{
              transform: `translate3d(calc(var(--px) * -1.5px), calc(var(--py) * -1.5px), 0) scale(${
                dissolving ? 1.06 : settled ? 1 : avatarIn ? 1.02 : igniteScale
              })`,
              opacity: avatarIn ? 1 : 0,
              transition: `transform 1500ms ${EASE}, opacity 1200ms ease-out`,
              willChange: "transform, opacity",
            }}
          >
            <div
              className="relative"
              style={{
                width: "min(52vh, 380px)",
                aspectRatio: "1 / 1",
                filter:
                  "drop-shadow(0 0 60px rgba(59,130,246,0.55)) drop-shadow(0 0 120px rgba(34,211,238,0.35))",
                animation: reduced ? undefined : "aria-breathe 4s ease-in-out infinite",
              }}
            >
              <img
                src={ariaAvatar}
                alt=""
                aria-hidden="true"
                draggable={false}
                className="h-full w-full object-contain"
                style={{
                  maskImage: "radial-gradient(circle at 50% 45%, #000 55%, transparent 78%)",
                  WebkitMaskImage: "radial-gradient(circle at 50% 45%, #000 55%, transparent 78%)",
                }}
              />
              {/* volumetric vertical light sweep — one pass at materialize */}
              {avatarIn && !settled && !reduced && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 overflow-hidden"
                  style={{
                    background:
                      "linear-gradient(105deg, transparent 40%, rgba(180,230,255,0.35) 50%, transparent 60%)",
                    backgroundSize: "220% 220%",
                    animation: "nx-sweep 900ms cubic-bezier(0.16,1,0.3,1) forwards",
                    mixBlendMode: "screen",
                  }}
                />
              )}
              {/* speaking pulse — sync w/ first word */}
              {phase === "greet" && !reduced && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-full"
                  style={{
                    boxShadow: "0 0 80px 10px rgba(59,130,246,0.35) inset",
                    animation: "aria-pulse 900ms ease-in-out infinite",
                  }}
                />
              )}
            </div>

            {/* L5 typography — greeting bubble */}
            <div className="mt-6 max-w-[86vw] px-4 text-center" style={{ minHeight: 56 }}>
              <p
                className="mx-auto rounded-2xl border px-5 py-3 text-base sm:text-lg md:text-xl"
                style={{
                  fontFamily: ar
                    ? "'IBM Plex Sans Arabic','Cairo',ui-sans-serif,system-ui"
                    : "'Space Grotesk','DM Sans',ui-sans-serif,system-ui",
                  color: "rgba(232,246,255,0.96)",
                  background: "rgba(10,14,20,0.55)",
                  borderColor: "rgba(255,255,255,0.08)",
                  backdropFilter: "blur(14px) saturate(140%)",
                  letterSpacing: ar ? 0 : "0.01em",
                  lineHeight: 1.55,
                  textShadow: "0 0 24px rgba(59,130,246,0.35)",
                }}
              >
                {shownGreeting}
                {phase === "greet" && typed < greeting.length && (
                  <span aria-hidden="true" style={{ opacity: 0.7 }}>▍</span>
                )}
              </p>
            </div>

            {/* Headline — masked wipe reveal */}
            <div
              className="mt-5 max-w-[92vw] px-4 text-center"
              aria-hidden={!headlineIn}
              style={{ minHeight: 40 }}
            >
              <h1
                style={{
                  fontFamily: ar
                    ? "'IBM Plex Sans Arabic','Cairo',ui-sans-serif,system-ui"
                    : "'Space Grotesk','DM Sans',ui-sans-serif,system-ui",
                  fontWeight: 600,
                  fontSize: "clamp(18px, 2.4vw, 28px)",
                  letterSpacing: ar ? 0 : "0.005em",
                  color: "rgba(240,250,255,0.98)",
                  textShadow: "0 0 26px rgba(80,180,255,0.35)",
                  clipPath: headlineIn ? "inset(0 0% 0 0)" : ar ? "inset(0 0 0 100%)" : "inset(0 100% 0 0)",
                  transition: `clip-path 700ms ${EASE}`,
                  willChange: "clip-path",
                }}
              >
                {headline}
              </h1>
            </div>
          </div>
        </div>

        {/* L4 — vignette (top layer, fades with dissolve) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 90% at 50% 50%, transparent 60%, rgba(0,0,0,0.55) 100%)",
            opacity: dissolving ? 0 : 1,
            transition: `opacity 800ms ${EASE}`,
          }}
        />

        {/* Film grain (intro only, cheap SVG noise, ~1KB) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: dissolving ? 0 : 0.06,
            transition: `opacity 700ms ${EASE}`,
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
            mixBlendMode: "overlay",
          }}
        />
      </div>

      {/* Begin CTA — gesture bridge that unlocks audio & triggers the sequence */}
      {!started && (
        <button
          type="button"
          onClick={beginExperience}
          className="fixed left-1/2 z-20 -translate-x-1/2 rounded-full border px-6 py-3 text-sm font-medium tracking-wide transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60"
          style={{
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 88px)",
            color: "rgba(232,246,255,0.98)",
            borderColor: "rgba(34,211,238,0.55)",
            background: "rgba(6,26,46,0.62)",
            backdropFilter: "blur(14px) saturate(140%)",
            boxShadow: "0 8px 32px -8px rgba(0,212,255,0.55), inset 0 0 24px rgba(58,232,255,0.14)",
            fontFamily: ar
              ? "'IBM Plex Sans Arabic','Cairo',ui-sans-serif,system-ui"
              : "'Space Grotesk','DM Sans',ui-sans-serif,system-ui",
            animation: "aria-cta-glow 2.6s ease-in-out infinite",
          }}
        >
          {ar ? "ابدأ التجربة ▸" : "Begin experience ▸"}
        </button>
      )}
      {/* Fullscreen tap fallback — any tap before start unlocks audio + begins. */}
      {!started && (
        <button
          type="button"
          aria-hidden
          tabIndex={-1}
          onClick={beginExperience}
          className="fixed inset-0 z-[5] cursor-pointer bg-transparent"
        />
      )}


      {/* Skip */}
      <button
        ref={skipRef}
        type="button"
        onClick={skip}
        className="fixed bottom-5 z-10 rounded-full border px-4 py-2 text-xs font-medium tracking-wide transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-300/60"
        style={{
          [ar ? "left" : "right"]: 20,
          color: "rgba(232,246,255,0.85)",
          borderColor: "rgba(255,255,255,0.16)",
          background: "rgba(10,14,20,0.5)",
          backdropFilter: "blur(10px)",
        } as React.CSSProperties}
      >
        {ar ? "تخطي" : "Skip"}
      </button>

      {/* Audio controls — mute toggle + gesture unlock chip */}
      <div
        className="fixed bottom-5 z-10 flex items-center gap-2"
        style={{ [ar ? "right" : "left"]: 20 } as React.CSSProperties}
      >
        <button
          type="button"
          onClick={toggleMute}
          aria-pressed={!muted}
          aria-label={muted ? (ar ? "تشغيل الصوت" : "Unmute") : (ar ? "كتم الصوت" : "Mute")}
          className="rounded-full border px-3 py-2 text-xs font-medium transition hover:bg-white/10"
          style={{
            color: "rgba(232,246,255,0.85)",
            borderColor: "rgba(255,255,255,0.16)",
            background: "rgba(10,14,20,0.5)",
            backdropFilter: "blur(10px)",
          }}
        >
          {muted ? "🔇" : "🔈"}
        </button>
        {((voice.enabled && voice.autoplayBlocked) || (!muted && phase !== "done")) && (
          <button
            type="button"
            onClick={enableAudio}
            className="rounded-full border px-4 py-2 text-xs font-medium tracking-wide transition hover:bg-white/10"
            style={{
              color: "rgba(232,246,255,0.9)",
              borderColor: "rgba(34,211,238,0.4)",
              background: "rgba(10,14,20,0.55)",
              backdropFilter: "blur(10px)",
            }}
          >
            {ar ? "🔊 تفعيل الصوت" : "🔊 Enable sound"}
          </button>
        )}
      </div>

      <style>{`
        @keyframes aria-breathe {
          0%,100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
        @keyframes aria-pulse {
          0%,100% { box-shadow: 0 0 60px 6px rgba(59,130,246,0.28) inset; }
          50% { box-shadow: 0 0 100px 14px rgba(34,211,238,0.45) inset; }
        }
        @keyframes nx-drift {
          0%   { transform: translate3d(-3px, -2px, 0); }
          100% { transform: translate3d( 3px,  2px, 0); }
        }
        @keyframes nx-sweep {
          0%   { background-position: 120% 0%; opacity: 0; }
          20%  { opacity: 1; }
          100% { background-position: -20% 0%; opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-nx-intro] * { animation: none !important; transition-duration: 1.5s !important; }
        }
      `}</style>
    </div>
  );
}

export default AriaCinematicIntro;
