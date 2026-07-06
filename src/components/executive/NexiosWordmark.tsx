/**
 * Static assembled "NEXIOS" wordmark — liquid-chrome letters with a steady
 * emerald/cyan glow and an idle light-sweep every 6s. Pure CSS, zero deps.
 *
 * Accessibility contract:
 *  - The visual is a `role="img"` region with a bilingual, descriptive
 *    aria-label ("NEXIOS AI · نكسيوس — Enterprise AI Operating System") so
 *    screen readers announce the brand once as a single image, not as six
 *    separate letters.
 *  - The individual letter <span>s carry `aria-hidden` so AT never spells
 *    "N. E. X. I. O. S." out loud.
 *  - Renders as a semantic `<span>` by default to avoid clashing with the
 *    page's `<h1>` landmark. Pass `as="h1"` (or "h2", "h3"…) when the caller
 *    needs it to act as a heading, and pass `href` when it should act as
 *    the brand link back to the homepage.
 */

import { Link } from "@tanstack/react-router";
import type { ElementType } from "react";

const WORD = "NEXIOS";
const ARIA_LABEL = "NEXIOS AI · نكسيوس — Enterprise AI Operating System";

type NexiosWordmarkProps = {
  /** Semantic tag for the visible wordmark (default: span). Use "h1" only
   *  when the page has no other h1. */
  as?: Extract<ElementType, "span" | "h1" | "h2" | "h3">;
  /** When set, the whole wordmark becomes a TanStack Router link. */
  href?: string;
  /** Optional accessible label override. Defaults to the bilingual brand. */
  ariaLabel?: string;
};

export function NexiosWordmark({
  as: Tag = "span",
  href,
  ariaLabel = ARIA_LABEL,
}: NexiosWordmarkProps = {}) {
  const inner = (
    <Tag className="nx-wm">
      {WORD.split("").map((ch, i) => (
        <span key={i} className="nx-wm__letter" aria-hidden="true">
          {ch}
        </span>
      ))}
      {/* Screen-reader-only text — pairs with role="img" on the wrapper so
          AT reads the brand name (bilingual) instead of spelling letters. */}
      <span className="sr-only">{ariaLabel}</span>
    </Tag>
  );

  const shell = href ? (
    <Link
      to={href}
      aria-label={ariaLabel}
      className="nx-wm-link"
    >
      {inner}
    </Link>
  ) : (
    inner
  );

  return (
    <div
      className="nx-wm-wrap"
      role="img"
      aria-label={ariaLabel}
    >
      {shell}
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
        .nx-wm-link {
          display: inline-flex;
          text-decoration: none;
          border-radius: 6px;
          outline: none;
        }
        .nx-wm-link:focus-visible {
          box-shadow: 0 0 0 2px rgba(0,212,255,0.9), 0 0 0 6px rgba(0,212,255,0.25);
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
