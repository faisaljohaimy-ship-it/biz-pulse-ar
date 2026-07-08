// Executive Demo — Motion Director (cinematic overlay)
// -----------------------------------------------------------------------------
// Phase 4.2 · Executive Cinematic Experience
//
// A fullscreen, pointer-events:none overlay rendered only while demo is
// active. Provides:
//   • Ambient glow that tracks the mouse (parallax spotlight)
//   • Volumetric radial vignette behind ARIA
//   • Floating particle field (canvas, GPU-accelerated, rAF-driven)
//   • Subtle vertical scroll parallax
// All rendering is throttled to a single rAF loop and pauses when tab hidden.

import * as React from "react";
import { useDemoMode } from "@/lib/demo/demo-controller";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  a: number;
}

export function DemoMotionOverlay() {
  const demo = useDemoMode();
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const spotRef = React.useRef<HTMLDivElement>(null);
  const rafRef = React.useRef<number | null>(null);
  const mouseRef = React.useRef({ x: 0.5, y: 0.5 });
  const scrollRef = React.useRef(0);
  const particlesRef = React.useRef<Particle[]>([]);

  React.useEffect(() => {
    if (!demo.isActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0,
      h = 0;
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize, { passive: true });

    // Seed particles (density scaled to viewport — cap for mobile).
    const count = Math.min(72, Math.floor((w * h) / 24000));
    particlesRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.15,
      vy: -0.05 - Math.random() * 0.18,
      r: 0.6 + Math.random() * 1.6,
      a: 0.15 + Math.random() * 0.5,
    }));

    const onMove = (e: PointerEvent) => {
      mouseRef.current.x = e.clientX / window.innerWidth;
      mouseRef.current.y = e.clientY / window.innerHeight;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const onScroll = () => {
      scrollRef.current = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    let running = true;
    const onVis = () => {
      running = !document.hidden;
      if (running && !rafRef.current) rafRef.current = requestAnimationFrame(tick);
    };
    document.addEventListener("visibilitychange", onVis);

    const tick = () => {
      rafRef.current = null;
      if (!running) return;
      ctx.clearRect(0, 0, w, h);

      // Volumetric spotlight follows mouse.
      const mx = mouseRef.current.x * w;
      const my = mouseRef.current.y * h;
      const grad = ctx.createRadialGradient(mx, my, 0, mx, my, Math.max(w, h) * 0.6);
      grad.addColorStop(0, "rgba(58,232,255,0.10)");
      grad.addColorStop(0.4, "rgba(0,212,255,0.045)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Particles
      const parallaxY = -((scrollRef.current || 0) * 0.03);
      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y + parallaxY < -10) {
          p.y = h + 10;
          p.x = Math.random() * w;
        }
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        ctx.beginPath();
        ctx.arc(p.x, p.y + parallaxY, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(58,232,255,${p.a * 0.55})`;
        ctx.fill();
      }

      // Move spotlight div (behind ARIA) with mouse parallax.
      if (spotRef.current) {
        const tx = (mouseRef.current.x - 0.5) * 40;
        const ty = (mouseRef.current.y - 0.5) * 24;
        spotRef.current.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVis);
      particlesRef.current = [];
    };
  }, [demo.isActive]);

  if (!demo.isActive) return null;

  return (
    <>
      {/* Ambient tint + vignette */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[80] animate-[fade-in_600ms_ease-out]"
        style={{
          background:
            "radial-gradient(1200px 800px at 50% 40%, rgba(0,212,255,0.10) 0%, rgba(6,26,46,0.0) 60%), linear-gradient(to bottom, rgba(6,26,46,0.35), rgba(6,26,46,0.55))",
          mixBlendMode: "screen",
        }}
      />
      {/* Executive spotlight behind ARIA presenter */}
      <div
        ref={spotRef}
        aria-hidden
        className="pointer-events-none fixed left-1/2 top-1/2 z-[81] h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full will-change-transform"
        style={{
          background:
            "radial-gradient(closest-side, rgba(58,232,255,0.20), rgba(0,212,255,0.08) 45%, transparent 70%)",
          filter: "blur(24px)",
        }}
      />
      {/* Particle field */}
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[82] will-change-transform"
      />
    </>
  );
}
