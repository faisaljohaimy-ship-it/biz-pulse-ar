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
      <style>{`
        @keyframes cmd-drift-1 {
          0%,100% { transform: translate3d(0,0,0) scale(1); opacity: .85; }
          50%     { transform: translate3d(-4%, 5%, 0) scale(1.08); opacity: 1; }
        }
        @keyframes cmd-drift-2 {
          0%,100% { transform: translate3d(0,0,0) scale(1); opacity: .8; }
          50%     { transform: translate3d(5%, -4%, 0) scale(1.12); opacity: 1; }
        }
        .cmd-aurora  { animation: cmd-drift-1 22s ease-in-out infinite; will-change: transform, opacity; }
        .cmd-aurora-2 { animation: cmd-drift-2 26s ease-in-out infinite; will-change: transform, opacity; }
        @media (prefers-reduced-motion: reduce) {
          .cmd-aurora, .cmd-aurora-2 { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

export default CommandBackdrop;
