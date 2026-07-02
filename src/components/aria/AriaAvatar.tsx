/**
 * AriaAvatar — canonical ARIA presence renderer.
 *
 * Additive component. Does NOT replace the underlying `aria-holo-v2` asset;
 * it composes CSS crop + a light particle dissolve on top of it so ARIA reads
 * as a hologram from the shoulders up.
 *
 * Modes:
 *   - hologram (default): existing photograph, head-and-shoulders crop, radial
 *     mask that dissolves below the shoulders into drifting blue particles.
 *   - orb: abstract luminous sphere with orbit rings + breathing pulse.
 *
 * Framing (hologram only):
 *   - portrait (default): 1:1.2 aspect, head-and-shoulders crop.
 *   - full: 1:1 aspect, full figure (unchanged legacy rendering).
 *
 * Honors prefers-reduced-motion: no particles, no breathing.
 */
import { useEffect, useRef } from "react";
import ariaHologram from "@/assets/aria-hologram.png.asset.json";

export type AriaAvatarMode = "hologram" | "orb";
export type AriaAvatarFraming = "portrait" | "full";

type Props = {
  mode?: AriaAvatarMode;
  framing?: AriaAvatarFraming;
  /** Rendered width in px (height derives from framing). Default 96. */
  size?: number;
  speaking?: boolean;
  thinking?: boolean;
  className?: string;
  alt?: string;
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function AriaAvatar({
  mode = "hologram",
  framing = "portrait",
  size = 96,
  speaking = false,
  thinking = false,
  className = "",
  alt = "ARIA",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reduced = prefersReducedMotion();

  useEffect(() => {
    if (mode !== "hologram" || framing !== "portrait" || reduced) return;
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let disposed = false;

    const resize = () => {
      const rect = cv.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.max(1, Math.floor(rect.width * dpr));
      cv.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const w = () => cv.clientWidth;
    const h = () => cv.clientHeight;

    const MAX = 80;
    const parts = Array.from({ length: MAX }).map(() => {
      const H = h();
      return {
        x: Math.random() * w(),
        y: H * 0.55 + Math.random() * (H * 0.45),
        vx: (Math.random() - 0.5) * 0.25,
        vy: -0.15 - Math.random() * 0.4,
        r: 0.6 + Math.random() * 1.4,
        a: 0.25 + Math.random() * 0.55,
        life: 90 + Math.random() * 140,
        age: Math.random() * 200,
      };
    });

    const tick = () => {
      if (disposed) return;
      const W = w();
      const H = h();
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      for (const p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        p.age += 1;
        if (p.age > p.life || p.y < H * 0.38 || p.x < 0 || p.x > W) {
          p.x = Math.random() * W;
          p.y = H - 2;
          p.age = 0;
          p.vx = (Math.random() - 0.5) * 0.25;
          p.vy = -0.15 - Math.random() * 0.4;
        }
        const fade = 1 - p.age / p.life;
        ctx.beginPath();
        ctx.fillStyle = `rgba(58,232,255,${(p.a * fade).toFixed(3)})`;
        ctx.shadowColor = "rgba(0,212,255,0.85)";
        ctx.shadowBlur = 5;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onResize = () => resize();
    window.addEventListener("resize", onResize);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [mode, framing, reduced]);

  // ORB MODE
  if (mode === "orb") {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`relative overflow-hidden rounded-full ${className}`}
        style={{ width: size, height: size }}
      >
        <span
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 32% 30%, #a5f2ff 0%, #00d4ff 22%, #0a4b73 58%, #04121f 85%)",
            boxShadow:
              "0 0 28px rgba(0,212,255,0.55), inset 0 0 22px rgba(58,232,255,0.35)",
          }}
        />
        {/* orbit rings — slow inner particle orbit stand-in */}
        <span
          aria-hidden
          className="absolute inset-[10%] rounded-full border border-cyan-300/30 motion-safe:animate-[aa-spin_9s_linear_infinite]"
        />
        <span
          aria-hidden
          className="absolute inset-[22%] rounded-full border border-cyan-200/20 motion-safe:animate-[aa-spin-rev_14s_linear_infinite]"
        />
        {/* breathing pulse */}
        <span
          aria-hidden
          className="absolute inset-0 rounded-full motion-safe:animate-[aa-pulse_3.4s_ease-in-out_infinite]"
          style={{ boxShadow: "0 0 32px rgba(58,232,255,0.45)" }}
        />
        {speaking && (
          <span
            aria-hidden
            className="absolute -inset-1 rounded-full border-2 border-cyan-300/60 motion-safe:animate-[aa-wave_1.2s_ease-out_infinite]"
          />
        )}
        {thinking && (
          <span
            aria-hidden
            className="absolute inset-[38%] rounded-full border border-cyan-100/60 motion-safe:animate-[aa-spin_2.2s_linear_infinite]"
          />
        )}
        <style>{`
          @keyframes aa-spin { to { transform: rotate(360deg); } }
          @keyframes aa-spin-rev { to { transform: rotate(-360deg); } }
          @keyframes aa-pulse { 0%,100% { opacity:.55; transform: scale(.98);} 50% { opacity:1; transform: scale(1.03);} }
          @keyframes aa-wave { 0% { opacity:.8; transform: scale(1);} 100% { opacity:0; transform: scale(1.28);} }
          @media (prefers-reduced-motion: reduce) {
            .aria-orb-anim, [class*="aa-pulse"], [class*="aa-spin"], [class*="aa-wave"] { animation: none !important; }
          }
        `}</style>
      </div>
    );
  }

  // HOLOGRAM MODE
  const aspect = framing === "portrait" ? "1 / 1.2" : "1 / 1";
  const portraitMask =
    "linear-gradient(to bottom, #000 0%, #000 58%, rgba(0,0,0,0.55) 74%, rgba(0,0,0,0) 94%)";

  return (
    <div
      role="img"
      aria-label={alt}
      className={`relative overflow-hidden ${className}`}
      style={{ width: size, aspectRatio: aspect }}
    >
      <img
        src={ariaHologram.url}
        alt=""
        draggable={false}
        className={[
          "absolute inset-0 h-full w-full select-none",
          framing === "portrait" ? "object-cover" : "object-contain",
          reduced ? "" : "motion-safe:animate-[aa-breath_5s_ease-in-out_infinite]",
        ].join(" ")}
        style={{
          objectPosition: framing === "portrait" ? "center 10%" : "center",
          WebkitMaskImage: framing === "portrait" ? portraitMask : undefined,
          maskImage: framing === "portrait" ? portraitMask : undefined,
        }}
      />
      {/* ambient glow behind the head */}
      <span
        aria-hidden
        className={[
          "pointer-events-none absolute inset-0",
          reduced ? "" : "motion-safe:animate-[aa-glow_4s_ease-in-out_infinite]",
        ].join(" ")}
        style={{
          background:
            "radial-gradient(55% 42% at 50% 38%, rgba(58,232,255,0.22), transparent 70%)",
        }}
      />
      {/* particle dissolve below the shoulders */}
      {!reduced && framing === "portrait" && (
        <canvas
          ref={canvasRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full"
        />
      )}
      {/* eye blink micro-animation */}
      {!reduced && framing === "portrait" && (
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-full bg-[#061A2E]/0 motion-safe:animate-[aa-blink_6.4s_ease-in-out_infinite]"
          style={{
            top: "34%",
            width: "40%",
            height: "3%",
          }}
        />
      )}
      {speaking && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-1 mx-auto h-1.5 w-2/3 rounded-full bg-cyan-300/40 motion-safe:animate-[aa-wave2_0.9s_ease-in-out_infinite]"
        />
      )}
      {thinking && (
        <span
          aria-hidden
          className="pointer-events-none absolute right-1 top-1 h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(58,232,255,0.9)] motion-safe:animate-[aa-pulse_1.3s_ease-in-out_infinite]"
        />
      )}
      <style>{`
        @keyframes aa-breath { 0%,100% { transform: scale(1);} 50% { transform: scale(1.012);} }
        @keyframes aa-glow  { 0%,100% { opacity:.55;} 50% { opacity:.9;} }
        @keyframes aa-wave2 { 0%,100% { transform: scaleX(.55); opacity:.4;} 50% { transform: scaleX(1); opacity:.9;} }
        @keyframes aa-blink { 0%,94%,100% { background-color: rgba(6,26,46,0);} 96%,98% { background-color: rgba(6,26,46,0.55);} }
        @media (prefers-reduced-motion: reduce) {
          [class*="aa-breath"], [class*="aa-glow"], [class*="aa-wave2"], [class*="aa-blink"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

export default AriaAvatar;
