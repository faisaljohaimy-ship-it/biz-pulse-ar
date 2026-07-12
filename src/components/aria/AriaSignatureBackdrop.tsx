/**
 * AriaSignatureBackdrop — ARIA's cinematic visual signature (Phase 0).
 *
 * The wordmark «ARIA@nexios.com» rendered as huge, near-transparent 3D text
 * over a deep navy gradient, with a faint emerald edge glow and a very slow
 * "breathing" opacity wave. Pure CSS/SVG — no raster assets — so it stays
 * razor-sharp and cheap to paint on mobile.
 *
 * Depth is built from TWO tilted text layers at different sizes/opacities that
 * drift at slightly different speeds (a parallax-like effect without coupling
 * to any scroll container, which keeps it bulletproof on touch devices).
 *
 * Foreground contrast: the signature never exceeds ~6% white opacity, so any
 * chat text, KPI, or caption layered above it keeps WCAG AA contrast. Callers
 * still add their own readability veil for large body copy.
 *
 * `prefers-reduced-motion`: all motion freezes to a static, still frame.
 *
 * The SAME wordmark is reused, fainter, in generated PDFs and the loading
 * screen (see `ariaSignatureSvgMarkup`) so the identity is unified across every
 * touchpoint.
 */
import { useId } from "react";
import { cn } from "@/lib/utils";
import { ARIA_SIGNATURE_WORDMARK } from "@/lib/aria/signature";

type AriaSignatureBackdropProps = {
  className?: string;
  /** Multiplies the base opacity (1 = default 3–6% range). Use <1 for very
   *  subtle surfaces (e.g. behind dense dashboards). */
  intensity?: number;
  /** Show the animated emerald edge glow. Default true. */
  glow?: boolean;
};

/**
 * Full-bleed cinematic backdrop. Render it as the first child of a
 * `relative overflow-hidden` container; it is decorative and inert.
 */
export function AriaSignatureBackdrop({
  className,
  intensity = 1,
  glow = true,
}: AriaSignatureBackdropProps) {
  const uid = useId().replace(/[:]/g, "");
  const back = 0.045 * intensity; // rear layer base opacity (~4.5%)
  const front = 0.06 * intensity; // front layer base opacity (~6%)
  const row = `${ARIA_SIGNATURE_WORDMARK}  `;

  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      style={{
        background: "radial-gradient(120% 90% at 50% 0%, #0A1B33 0%, #06101F 45%, #04070F 100%)",
      }}
    >
      {/* Rear signature layer — larger, softer, drifts slower. */}
      <div className={`${uid}-sig ${uid}-back`} aria-hidden>
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i} className={`${uid}-line`}>
            {row.repeat(6)}
          </span>
        ))}
      </div>

      {/* Front signature layer — tighter, brighter, drifts the other way. */}
      <div className={`${uid}-sig ${uid}-front`} aria-hidden>
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} className={`${uid}-line`}>
            {row.repeat(5)}
          </span>
        ))}
      </div>

      {/* Emerald edge glow — vignette that lifts the frame's corners. */}
      {glow && (
        <div
          className={`${uid}-glow`}
          style={{
            background:
              "radial-gradient(140% 120% at 50% 50%, transparent 55%, rgba(16,185,129,0.10) 82%, rgba(16,185,129,0.16) 100%)",
          }}
        />
      )}

      <style>{`
        .${uid}-sig {
          position: absolute;
          inset: -25% -30%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          transform: rotate(-19deg);
          white-space: nowrap;
          font-family: "Space Grotesk", "DM Sans", ui-sans-serif, system-ui, sans-serif;
          font-weight: 800;
          letter-spacing: 0.02em;
          color: #ffffff;
          user-select: none;
          will-change: transform, opacity;
        }
        .${uid}-line { display: block; line-height: 1.05; }
        .${uid}-back {
          font-size: clamp(3.2rem, 11vw, 8.5rem);
          opacity: ${back};
          /* Soft 3D extrusion toward lower-right. */
          text-shadow:
            1px 1px 0 rgba(255,255,255,0.5),
            2px 2px 0 rgba(120,160,220,0.28),
            4px 4px 8px rgba(0,0,0,0.55);
          animation: ${uid}-breath 8s ease-in-out infinite,
                     ${uid}-drift-a 60s linear infinite;
        }
        .${uid}-front {
          font-size: clamp(2rem, 6.5vw, 5rem);
          opacity: ${front};
          text-shadow:
            1px 1px 0 rgba(255,255,255,0.6),
            2px 2px 0 rgba(52,232,255,0.25),
            3px 3px 6px rgba(0,0,0,0.5);
          animation: ${uid}-breath 8s ease-in-out infinite 1.4s,
                     ${uid}-drift-b 45s linear infinite;
        }
        .${uid}-glow {
          position: absolute;
          inset: 0;
          animation: ${uid}-glow-pulse 8s ease-in-out infinite;
        }
        @keyframes ${uid}-breath {
          0%, 100% { opacity: ${back}; }
          50% { opacity: ${(back * 1.55).toFixed(4)}; }
        }
        @keyframes ${uid}-drift-a {
          0% { transform: rotate(-19deg) translateX(0); }
          100% { transform: rotate(-19deg) translateX(-6%); }
        }
        @keyframes ${uid}-drift-b {
          0% { transform: rotate(-19deg) translateX(0); }
          100% { transform: rotate(-19deg) translateX(5%); }
        }
        @keyframes ${uid}-glow-pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .${uid}-back, .${uid}-front, .${uid}-glow { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

export default AriaSignatureBackdrop;
