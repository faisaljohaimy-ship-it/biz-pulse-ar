/**
 * CinematicReveal — the GSAP layer.
 *
 * Reserved for premium cinematic moments only (hero entrance, dashboard
 * introduction, presentation mode). GSAP is imported lazily on the client so
 * ordinary navigation never pays for it, and the timeline is skipped entirely
 * under prefers-reduced-motion.
 */
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

export interface CinematicRevealProps {
  children: ReactNode;
  /** CSS selector for the choreographed children inside this container. */
  selector?: string;
  stagger?: number;
  delay?: number;
  className?: string;
  /** Adds the slow premium light sweep across the container. */
  lightSweep?: boolean;
}

export function CinematicReveal({
  children,
  selector = "[data-cinematic]",
  stagger = 0.07,
  delay = 0.05,
  className,
  lightSweep = false,
}: CinematicRevealProps) {
  const root = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const targets = Array.from(el.querySelectorAll<HTMLElement>(selector));
    if (targets.length === 0) return;

    let ctxRevert: (() => void) | undefined;
    let cancelled = false;

    void import("gsap").then(({ gsap }) => {
      if (cancelled) return;
      const ctx = gsap.context(() => {
        gsap.from(targets, {
          y: 22,
          opacity: 0,
          filter: "blur(6px)",
          duration: 0.85,
          delay,
          stagger,
          ease: "expo.out",
          clearProps: "filter,opacity,transform",
        });
        if (lightSweep) {
          const sweep = el.querySelector<HTMLElement>("[data-cinematic-sweep]");
          if (sweep) {
            gsap.fromTo(
              sweep,
              { xPercent: -130, opacity: 0 },
              {
                xPercent: 130,
                opacity: 1,
                duration: 2.4,
                ease: "power2.inOut",
                repeat: -1,
                repeatDelay: 4.5,
              },
            );
          }
        }
      }, el);
      ctxRevert = () => ctx.revert();
    });

    return () => {
      cancelled = true;
      ctxRevert?.();
    };
  }, [selector, stagger, delay, lightSweep]);

  return (
    <div ref={root} className={className} style={{ position: "relative" }}>
      {lightSweep && (
        <span
          aria-hidden
          data-cinematic-sweep
          className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 opacity-0"
          style={{
            background:
              "linear-gradient(100deg, transparent, rgba(255,255,255,.55), rgba(186,230,253,.35), transparent)",
            filter: "blur(6px)",
          }}
        />
      )}
      {children}
    </div>
  );
}
