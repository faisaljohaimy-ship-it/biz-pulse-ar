/**
 * Static assembled "NEXIOS" wordmark — liquid-chrome letters with a steady
 * emerald/cyan glow and an idle light-sweep every 6s. Pure CSS, zero deps.
 * No motion sequence — this is the settled hero headline shown on the
 * system page after the Genesis intro completes.
 */
const WORD = "NEXIOS";

export function NexiosWordmark() {
  return (
    <div className="nx-wm-wrap" role="img" aria-label={WORD}>
      <h1 className="nx-wm">
        {WORD.split("").map((ch, i) => (
          <span key={i} className="nx-wm__letter" aria-hidden>
            {ch}
          </span>
        ))}
      </h1>
      <style>{`
        .nx-wm-wrap {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          min-height: 1.2em;
          direction: ltr;
        }
        .nx-wm {
          position: relative;
          margin: 0;
          font-weight: 900;
          letter-spacing: 0.06em;
          line-height: 1;
          font-size: clamp(2.6rem, 8vw, 5.5rem);
          display: inline-flex;
          isolation: isolate;
        }
        @media (max-width: 767px) {
          .nx-wm { font-size: clamp(2.4rem, 12vw, 4.5rem); }
        }
        .nx-wm__letter {
          display: inline-block;
          background: linear-gradient(
            175deg,
            #f8f9fb 0%, #c8ccd4 18%, #6e7480 38%,
            #2a2e36 50%, #9aa0ac 64%, #eef0f4 82%, #b8bcc6 100%
          );
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          -webkit-text-fill-color: transparent;
          filter:
            drop-shadow(0 2px 1px rgba(0,0,0,0.55))
            drop-shadow(0 8px 22px rgba(0,0,0,0.4))
            drop-shadow(0 0 14px rgba(16,185,129,0.40))
            drop-shadow(0 0 22px rgba(34,211,238,0.22));
        }
        .nx-wm::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(
            105deg,
            transparent 0%, transparent 40%,
            rgba(255,255,255,0.85) 50%,
            transparent 60%, transparent 100%
          );
          mix-blend-mode: screen;
          transform: translateX(-120%);
          opacity: 0;
          animation: nxWmSweep 6s ease-in-out 1s infinite;
        }
        @keyframes nxWmSweep {
          0%   { transform: translateX(-120%); opacity: 0; }
          6%   { opacity: 1; }
          20%  { transform: translateX(120%); opacity: 0; }
          100% { transform: translateX(120%); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .nx-wm::after { animation: none !important; opacity: 0 !important; }
        }
      `}</style>
    </div>
  );
}
