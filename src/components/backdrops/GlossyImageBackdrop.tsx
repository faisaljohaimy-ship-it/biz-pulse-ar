"use client";

/**
 * GlossyImageBackdrop — a full-bleed photographic backdrop with a "glossy"
 * (لامع) treatment: a low-opacity image, a navy readability veil (keeps
 * foreground text at WCAG AA), a slow diagonal sheen sweep, and a cyan top
 * edge-light. Decorative and inert.
 *
 * Place it as the FIRST child of a `relative overflow-hidden` container and
 * pass `className="-z-10"` (default) so it paints above the container's
 * background colour but below all in-flow content — no content wrapping needed.
 * Respects `prefers-reduced-motion` (freezes the sheen).
 */
import { useId } from "react";
import { cn } from "@/lib/utils";

export function GlossyImageBackdrop({
  src,
  className = "-z-10",
  opacity = 0.22,
}: {
  src: string;
  className?: string;
  opacity?: number;
}) {
  const uid = useId().replace(/[:]/g, "");
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      <img
        src={src}
        alt=""
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover"
        // No CSS filter here: a saturate/brightness filter on a full-page
        // image gets re-evaluated every time an overlapping layer animates
        // (the sheen does, continuously) — measured as a top scroll-fps
        // cost on weak GPUs, for a tint that is invisible at this opacity.
        style={{ opacity }}
      />
      {/* Navy readability veil so any text above stays crisp (AA). */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(4,7,15,0.42) 0%, rgba(4,10,20,0.26) 45%, rgba(4,7,15,0.68) 100%)",
        }}
      />
      {/* Glossy diagonal sheen sweep. */}
      <div className={`${uid}-sheen absolute inset-y-0 -inset-x-1/3`} />
      {/* Cyan top edge-light. */}
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(58,232,255,0.5), transparent)",
        }}
      />
      <style>{`
        .${uid}-sheen {
          background: linear-gradient(105deg, transparent 42%, rgba(180,220,255,0.07) 50%, transparent 58%);
          transform: translateX(-25%);
          /* steps(): ~6 position updates/s. On a layer this size a smooth
             per-frame sweep forces full-backdrop recomposition 60×/s; the
             stepped sweep of this soft 7%-alpha gradient reads identical. */
          animation: ${uid}-sweep 9s steps(54, jump-none) infinite;
        }
        @keyframes ${uid}-sweep {
          0%, 100% { transform: translateX(-25%); opacity: 0.4; }
          50% { transform: translateX(25%); opacity: 0.9; }
        }
        @media (prefers-reduced-motion: reduce) { .${uid}-sheen { animation: none; } }
      `}</style>
    </div>
  );
}

export default GlossyImageBackdrop;
