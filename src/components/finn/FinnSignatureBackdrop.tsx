/**
 * FinnSignatureBackdrop — FINN's cinematic visual signature (Phase 0).
 *
 * The wordmark «FINN» rendered as huge, near-transparent 3D text
 * over a deep navy gradient, with a faint emerald edge glow, independently
 * moving rows, and floating letterforms. Pure CSS/SVG — no raster assets — so
 * it stays razor-sharp and cheap to paint on mobile.
 *
 * Depth is built from TWO tilted text layers at different sizes/opacities that
 * drift at different speeds plus a sparse field of individual FINN glyphs.
 * Motion is self-contained and never couples to scroll, keeping it reliable on
 * touch devices.
 *
 * Foreground contrast: the signature never exceeds ~6% white opacity, so any
 * chat text, KPI, or caption layered above it keeps WCAG AA contrast. Callers
 * still add their own readability veil for large body copy.
 *
 * `prefers-reduced-motion`: all motion freezes to a static, still frame.
 *
 * The SAME wordmark is reused, fainter, in generated PDFs and the loading
 * screen (see `finnSignatureSvgMarkup`) so the identity is unified across every
 * touchpoint.
 */
import { useId } from "react";
import { cn } from "@/lib/utils";
import { FINN_SIGNATURE_WORDMARK } from "@/lib/finn/signature";

type FinnSignatureBackdropProps = {
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
export function FinnSignatureBackdrop({
  className,
  intensity = 1,
  glow = true,
}: FinnSignatureBackdropProps) {
  const uid = useId().replace(/[:]/g, "");
  const back = 0.045 * intensity; // rear layer base opacity (~4.5%)
  const front = 0.06 * intensity; // front layer base opacity (~6%)
  const glyph = 0.052 * intensity; // floating letters stay below chat contrast
  const row = `${FINN_SIGNATURE_WORDMARK}  `;
  // الحروف الطائرة مشتقّة من العلامة نفسها لا مكتوبة حرفيًّا: كانت نسخة
  // ثانية من الاسم تتخلّف عن مصدرها عند أي تغيير للعلامة.
  const floatingGlyphs = FINN_SIGNATURE_WORDMARK.repeat(3).split("");

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

      {/* Individually moving letters add visible depth without distracting from
          the conversation. Positions and timings are deterministic for SSR. */}
      <div className={`${uid}-glyph-field`} aria-hidden>
        {floatingGlyphs.map((letter, i) => (
          <span key={`${letter}-${i}`} className={`${uid}-glyph`}>
            {letter}
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
        .${uid}-line {
          display: block;
          line-height: 1.05;
          will-change: transform;
          animation: ${uid}-row-wave-a 12s ease-in-out infinite alternate;
        }
        .${uid}-line:nth-child(even) {
          animation-name: ${uid}-row-wave-b;
          animation-duration: 15s;
        }
        .${uid}-line:nth-child(2) { animation-delay: -8s; }
        .${uid}-line:nth-child(3) { animation-delay: -3s; }
        .${uid}-line:nth-child(4) { animation-delay: -11s; }
        .${uid}-line:nth-child(5) { animation-delay: -6s; }
        .${uid}-line:nth-child(6) { animation-delay: -13s; }
        .${uid}-line:nth-child(7) { animation-delay: -4s; }
        .${uid}-line:nth-child(8) { animation-delay: -10s; }
        .${uid}-back {
          font-size: clamp(3.2rem, 11vw, 8.5rem);
          opacity: ${back};
          /* Soft 3D extrusion toward lower-right. */
          text-shadow:
            1px 1px 0 rgba(255,255,255,0.5),
            2px 2px 0 rgba(120,160,220,0.28),
            4px 4px 8px rgba(0,0,0,0.55);
          animation: ${uid}-breath-back 8s ease-in-out infinite,
                     ${uid}-drift-a 28s ease-in-out infinite alternate;
        }
        .${uid}-front {
          font-size: clamp(2rem, 6.5vw, 5rem);
          opacity: ${front};
          text-shadow:
            1px 1px 0 rgba(255,255,255,0.6),
            2px 2px 0 rgba(52,232,255,0.25),
            3px 3px 6px rgba(0,0,0,0.5);
          animation: ${uid}-breath-front 8s ease-in-out infinite 1.4s,
                     ${uid}-drift-b 21s ease-in-out infinite alternate;
        }
        .${uid}-glyph-field {
          position: absolute;
          inset: 0;
          overflow: hidden;
          perspective: 900px;
        }
        .${uid}-glyph {
          --finn-dx: 24px;
          --finn-dy: -18px;
          --finn-r0: -8deg;
          --finn-r1: 8deg;
          position: absolute;
          display: block;
          color: rgba(214, 248, 255, ${glyph});
          font-family: "Space Grotesk", "DM Sans", ui-sans-serif, system-ui, sans-serif;
          font-size: clamp(2.5rem, 9vw, 7rem);
          font-weight: 900;
          line-height: 1;
          text-shadow:
            0 0 12px rgba(52,232,255,0.10),
            0 0 28px rgba(16,185,129,0.08);
          user-select: none;
          will-change: transform, opacity;
          animation:
            ${uid}-glyph-float 14s ease-in-out infinite alternate,
            ${uid}-glyph-luma 7s ease-in-out infinite;
        }
        .${uid}-glyph:nth-child(1)  { left: 5%;  top: 12%; --finn-dx: 38px; --finn-dy: -22px; --finn-r0: -13deg; --finn-r1: 7deg;  animation-duration: 15s, 7s; animation-delay: -4s, -1s; }
        .${uid}-glyph:nth-child(2)  { left: 28%; top: 5%;  --finn-dx: -26px; --finn-dy: 30px; --finn-r0: 9deg;   --finn-r1: -6deg; animation-duration: 18s, 9s; animation-delay: -11s, -3s; }
        .${uid}-glyph:nth-child(3)  { left: 55%; top: 18%; --finn-dx: 32px; --finn-dy: 18px; --finn-r0: -4deg;  --finn-r1: 12deg; animation-duration: 13s, 6s; animation-delay: -8s, -2s; }
        .${uid}-glyph:nth-child(4)  { left: 82%; top: 8%;  --finn-dx: -34px; --finn-dy: -20px; --finn-r0: 11deg; --finn-r1: -8deg; animation-duration: 17s, 8s; animation-delay: -5s, -4s; }
        .${uid}-glyph:nth-child(5)  { left: 12%; top: 42%; --finn-dx: 24px; --finn-dy: 28px; --finn-r0: 7deg;   --finn-r1: -11deg; animation-duration: 16s, 7s; animation-delay: -12s, -5s; }
        .${uid}-glyph:nth-child(6)  { left: 38%; top: 51%; --finn-dx: -30px; --finn-dy: -24px; --finn-r0: -10deg; --finn-r1: 6deg; animation-duration: 14s, 10s; animation-delay: -7s, -6s; }
        .${uid}-glyph:nth-child(7)  { left: 68%; top: 39%; --finn-dx: 36px; --finn-dy: -16px; --finn-r0: 5deg;  --finn-r1: 14deg; animation-duration: 19s, 8s; animation-delay: -15s, -2s; }
        .${uid}-glyph:nth-child(8)  { left: 88%; top: 55%; --finn-dx: -28px; --finn-dy: 22px; --finn-r0: -7deg; --finn-r1: 9deg; animation-duration: 15s, 6s; animation-delay: -9s, -3s; }
        .${uid}-glyph:nth-child(9)  { left: 3%;  top: 77%; --finn-dx: 42px; --finn-dy: -26px; --finn-r0: 12deg; --finn-r1: -5deg; animation-duration: 20s, 9s; animation-delay: -13s, -7s; }
        .${uid}-glyph:nth-child(10) { left: 31%; top: 82%; --finn-dx: -22px; --finn-dy: -32px; --finn-r0: -6deg; --finn-r1: 11deg; animation-duration: 16s, 7s; animation-delay: -6s, -4s; }
        .${uid}-glyph:nth-child(11) { left: 61%; top: 72%; --finn-dx: 30px; --finn-dy: 24px; --finn-r0: 8deg;   --finn-r1: -9deg; animation-duration: 18s, 8s; animation-delay: -14s, -1s; }
        .${uid}-glyph:nth-child(12) { left: 84%; top: 86%; --finn-dx: -40px; --finn-dy: -18px; --finn-r0: -12deg; --finn-r1: 5deg; animation-duration: 14s, 6s; animation-delay: -10s, -5s; }
        .${uid}-glow {
          position: absolute;
          inset: 0;
          animation: ${uid}-glow-pulse 8s ease-in-out infinite;
        }
        @keyframes ${uid}-breath-back {
          0%, 100% { opacity: ${back}; }
          50% { opacity: ${(back * 1.55).toFixed(4)}; }
        }
        @keyframes ${uid}-breath-front {
          0%, 100% { opacity: ${front}; }
          50% { opacity: ${(front * 1.4).toFixed(4)}; }
        }
        @keyframes ${uid}-drift-a {
          0% { transform: rotate(-19deg) translate3d(2%, -1%, 0) scale(1.01); }
          100% { transform: rotate(-17deg) translate3d(-7%, 3%, 0) scale(1.04); }
        }
        @keyframes ${uid}-drift-b {
          0% { transform: rotate(-20deg) translate3d(-3%, 2%, 0) scale(0.99); }
          100% { transform: rotate(-18deg) translate3d(7%, -3%, 0) scale(1.03); }
        }
        @keyframes ${uid}-row-wave-a {
          0% { transform: translate3d(-2.5%, -3px, 0); }
          50% { transform: translate3d(1%, 4px, 0); }
          100% { transform: translate3d(3.5%, -1px, 0); }
        }
        @keyframes ${uid}-row-wave-b {
          0% { transform: translate3d(3%, 2px, 0); }
          50% { transform: translate3d(-1%, -4px, 0); }
          100% { transform: translate3d(-3.5%, 1px, 0); }
        }
        @keyframes ${uid}-glyph-float {
          0% {
            transform: translate3d(0, 0, 0) rotate(var(--finn-r0)) scale(0.88);
          }
          50% {
            transform: translate3d(8px, -10px, 18px) rotate(0deg) scale(1.04);
          }
          100% {
            transform: translate3d(var(--finn-dx), var(--finn-dy), 0) rotate(var(--finn-r1)) scale(0.94);
          }
        }
        @keyframes ${uid}-glyph-luma {
          0%, 100% { opacity: 0.42; }
          45% { opacity: 1; }
          65% { opacity: 0.68; }
        }
        @keyframes ${uid}-glow-pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .${uid}-back,
          .${uid}-front,
          .${uid}-line,
          .${uid}-glyph,
          .${uid}-glow {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default FinnSignatureBackdrop;
