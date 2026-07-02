import { useEffect, useRef } from "react";

/**
 * HeroAIBackground
 * Fully code-generated futuristic AI background for the landing hero.
 * - Deep navy gradient base with an emerald hint at the bottom
 * - Animated neural network mesh (canvas)
 * - Rising particle field
 * - Faint perspective grid horizon (CSS)
 * - Soft central cyan radial glow (CSS)
 * - Optional edge data streams (CSS)
 *
 * Performance: rAF loop pauses on tab hide and respects prefers-reduced-motion.
 * Responsive: mobile reduces node/particle count ~50%.
 * RTL-safe: symmetric composition.
 */

type Node = { x: number; y: number; vx: number; vy: number; color: string };
type Particle = { x: number; y: number; v: number; r: number; a: number };

const CYAN = "34, 211, 238"; // #22D3EE
const EMERALD = "16, 185, 129"; // #10B981

export function HeroAIBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let nodes: Node[] = [];
    let particles: Particle[] = [];
    let running = true;
    let t0 = performance.now();

    const isMobile = () => window.innerWidth < 768;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const nodeCount = isMobile() ? 34 : 70;
      const particleCount = isMobile() ? 22 : 45;

      nodes = Array.from({ length: nodeCount }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        color: Math.random() < 0.55 ? CYAN : EMERALD,
      }));

      particles = Array.from({ length: particleCount }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        v: 0.15 + Math.random() * 0.35,
        r: Math.random() < 0.7 ? 1 : 2,
        a: 0.25 + Math.random() * 0.45,
      }));
    };

    const drawStatic = () => {
      ctx.clearRect(0, 0, width, height);
    };

    const step = (now: number) => {
      if (!running) return;
      const t = (now - t0) / 1000;
      ctx.clearRect(0, 0, width, height);

      // Neural mesh links
      const linkDist = isMobile() ? 120 : 160;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        a.x += a.vx;
        a.y += a.vy;
        if (a.x < 0 || a.x > width) a.vx *= -1;
        if (a.y < 0 || a.y > height) a.vy *= -1;

        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < linkDist) {
            const base = 1 - d / linkDist;
            const pulse = 0.5 + 0.5 * Math.sin(t * 1.4 + (i + j) * 0.15);
            const alpha = 0.08 + base * 0.07 * pulse;
            const color = a.color === b.color ? a.color : CYAN;
            ctx.strokeStyle = `rgba(${color}, ${alpha.toFixed(3)})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Nodes
      for (const n of nodes) {
        ctx.fillStyle = `rgba(${n.color}, 0.85)`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 1.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(${n.color}, 0.15)`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Rising particles (data flow)
      for (const p of particles) {
        p.y -= p.v;
        if (p.y < -4) {
          p.y = height + 4;
          p.x = Math.random() * width;
        }
        ctx.fillStyle = `rgba(${CYAN}, ${p.a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(step);
    };

    resize();
    if (reduced) {
      drawStatic();
    } else {
      rafRef.current = requestAnimationFrame(step);
    }

    const onResize = () => resize();
    const onVis = () => {
      if (document.hidden) {
        running = false;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      } else if (!reduced) {
        running = true;
        t0 = performance.now();
        rafRef.current = requestAnimationFrame(step);
      }
    };
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Base gradient — deep navy with an emerald hint at the bottom */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #020617 0%, #0A1628 55%, #06251E 100%)",
        }}
      />

      {/* Central cyan radial glow for headline contrast */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 45% at 50% 38%, rgba(34,211,238,0.22) 0%, rgba(34,211,238,0.08) 40%, rgba(2,6,23,0) 70%)",
        }}
      />

      {/* Neural mesh + particles */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* Digital grid horizon (bottom third) */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/3"
        style={{
          background:
            "linear-gradient(to bottom, rgba(2,6,23,0) 0%, rgba(2,6,23,0) 30%, rgba(6,37,30,0.35) 100%)",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            opacity: 0.06,
            perspective: "600px",
            perspectiveOrigin: "50% 0%",
          }}
        >
          <div
            className="absolute left-1/2 top-0 h-[220%] w-[220%] -translate-x-1/2 origin-top"
            style={{
              transform: "rotateX(65deg)",
              backgroundImage:
                "linear-gradient(rgba(34,211,238,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.9) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
              maskImage:
                "linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 85%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 85%)",
            }}
          />
        </div>
      </div>

      {/* Edge data streams — subtle vertical dashes */}
      <DataStream side="left" />
      <DataStream side="right" />

      {/* Vignette to seat the composition */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </div>
  );
}

function DataStream({ side }: { side: "left" | "right" }) {
  return (
    <div
      className={`absolute top-0 h-full w-[1px] overflow-hidden ${
        side === "left" ? "left-[6%]" : "right-[6%]"
      }`}
      style={{ opacity: 0.35 }}
    >
      <div
        className="absolute inset-x-0 h-[200%] animate-[heroStream_9s_linear_infinite] font-mono text-[9px] leading-[10px] text-[#22D3EE]"
        style={{ writingMode: "vertical-rl" }}
      >
        {"·─·──·─── ·· ─── ·─·· ── ─·─· ·─· ─── ·─·· ── ·─·· ─·─· ·─·── ─·─·".repeat(
          8,
        )}
      </div>
      <style>{`@keyframes heroStream { 0% { transform: translateY(-50%);} 100% { transform: translateY(0);} }`}</style>
    </div>
  );
}
