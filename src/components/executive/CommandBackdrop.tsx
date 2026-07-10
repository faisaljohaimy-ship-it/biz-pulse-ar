/**
 * CommandBackdrop — a modern navy→emerald backdrop for the executive command
 * surface: a deep gradient base, two slow aurora blobs, and a faint mesh grid.
 *
 * Performance-first & calm: pure CSS (no JS, no canvas), GPU-friendly
 * transform/opacity animation only, and prefers-reduced-motion freezes the
 * aurora entirely. Absolutely positioned behind content; non-interactive.
 */
export function CommandBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* Base navy → emerald gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(155deg, #04070F 0%, #061A2E 45%, #052E2B 78%, #04211f 100%)",
        }}
      />
      {/* Aurora blob 1 (cyan) */}
      <div
        className="cmd-aurora absolute -top-24 right-[-10%] h-[520px] w-[520px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(52,182,255,0.28), transparent 65%)",
          filter: "blur(70px)",
        }}
      />
      {/* Aurora blob 2 (emerald) */}
      <div
        className="cmd-aurora-2 absolute bottom-[-15%] left-[-8%] h-[560px] w-[560px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(30,233,182,0.22), transparent 65%)",
          filter: "blur(80px)",
        }}
      />
      {/* Aurora blob 3 (deep NEXIOS teal — third accent) */}
      <div
        className="cmd-aurora-3 absolute top-[35%] left-[45%] h-[420px] w-[420px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(58,232,255,0.16), transparent 60%)",
          filter: "blur(90px)",
        }}
      />
      {/* Faint mesh grid */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(58,232,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(58,232,255,0.6) 1px, transparent 1px)",
          backgroundSize: "46px 46px",
          maskImage: "radial-gradient(ellipse 85% 75% at 50% 40%, black 55%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 85% 75% at 50% 40%, black 55%, transparent 100%)",
        }}
      />
      {/* NEXIOS particle sparkles — pure CSS, no canvas. Radial-gradient
         dots layered over the aurora; parallax drift on two z-planes.
         Reduced-motion freezes them entirely. */}
      <div
        className="cmd-stars absolute inset-0 opacity-[0.55]"
        style={{
          backgroundImage: [
            "radial-gradient(1px 1px at 12% 22%, rgba(58,232,255,0.9), transparent 60%)",
            "radial-gradient(1px 1px at 78% 14%, rgba(52,211,153,0.85), transparent 60%)",
            "radial-gradient(1.4px 1.4px at 34% 68%, rgba(58,232,255,0.7), transparent 60%)",
            "radial-gradient(1px 1px at 62% 82%, rgba(52,211,153,0.8), transparent 60%)",
            "radial-gradient(1.2px 1.2px at 88% 55%, rgba(58,232,255,0.75), transparent 60%)",
            "radial-gradient(1px 1px at 22% 92%, rgba(52,211,153,0.7), transparent 60%)",
            "radial-gradient(1px 1px at 52% 30%, rgba(58,232,255,0.6), transparent 60%)",
          ].join(","),
          backgroundSize: "620px 620px",
          maskImage: "radial-gradient(ellipse 90% 80% at 50% 45%, black 60%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 90% 80% at 50% 45%, black 60%, transparent 100%)",
        }}
      />
      <div
        className="cmd-stars-2 absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: [
            "radial-gradient(1px 1px at 8% 48%, rgba(58,232,255,0.8), transparent 60%)",
            "radial-gradient(1px 1px at 44% 8%, rgba(52,211,153,0.7), transparent 60%)",
            "radial-gradient(1px 1px at 72% 62%, rgba(58,232,255,0.7), transparent 60%)",
            "radial-gradient(1px 1px at 18% 78%, rgba(52,211,153,0.65), transparent 60%)",
          ].join(","),
          backgroundSize: "420px 420px",
          maskImage: "radial-gradient(ellipse 90% 80% at 50% 45%, black 60%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 90% 80% at 50% 45%, black 60%, transparent 100%)",
        }}
      />
      <style>{`
        @keyframes cmd-drift-1 {
          0%,100% { transform: translate3d(0,0,0) scale(1); opacity: .85; }
          50%     { transform: translate3d(-4%, 5%, 0) scale(1.08); opacity: 1; }
        }
        @keyframes cmd-drift-2 {
          0%,100% { transform: translate3d(0,0,0) scale(1); opacity: .8; }
          50%     { transform: translate3d(5%, -4%, 0) scale(1.12); opacity: 1; }
        }
        @keyframes cmd-drift-3 {
          0%,100% { transform: translate3d(-3%,-2%,0) scale(1); opacity: .55; }
          50%     { transform: translate3d(4%, 3%, 0) scale(1.1);  opacity: .85; }
        }
        @keyframes cmd-stars-pan  { from { background-position: 0 0; }       to { background-position: 620px -620px; } }
        @keyframes cmd-stars2-pan { from { background-position: 0 0; }       to { background-position: -420px 420px; } }
        .cmd-aurora   { animation: cmd-drift-1 22s ease-in-out infinite; will-change: transform, opacity; }
        .cmd-aurora-2 { animation: cmd-drift-2 26s ease-in-out infinite; will-change: transform, opacity; }
        .cmd-aurora-3 { animation: cmd-drift-3 34s ease-in-out infinite; will-change: transform, opacity; }
        .cmd-stars    { animation: cmd-stars-pan  180s linear infinite; will-change: background-position; }
        .cmd-stars-2  { animation: cmd-stars2-pan 240s linear infinite; will-change: background-position; }
        @media (prefers-reduced-motion: reduce) {
          .cmd-aurora, .cmd-aurora-2, .cmd-aurora-3,
          .cmd-stars, .cmd-stars-2 { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

export default CommandBackdrop;
