// Nexios Guided Tour — dim + glow around highlighted element.
import * as React from "react";
import { createPortal } from "react-dom";
import { useTour } from "@/lib/simulation/tour/tour-controller";

export function HighlightSpotlight() {
  const t = useTour();
  const [rect, setRect] = React.useState<DOMRect | null>(null);
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = () => setReduced(mq.matches);
    handler();
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  const selector = t.step?.highlightSelector;
  const active = t.state !== "idle" && t.state !== "ended" && !!selector;

  React.useEffect(() => {
    if (!active || !selector) { setRect(null); return; }
    let raf = 0;
    const measure = () => {
      const el = document.querySelector(selector);
      if (el instanceof HTMLElement) setRect(el.getBoundingClientRect());
      else setRect(null);
    };
    measure();
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); };
    window.addEventListener("resize", onScroll);
    window.addEventListener("scroll", onScroll, true);
    const interval = setInterval(measure, 600);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scroll", onScroll, true);
      clearInterval(interval);
    };
  }, [active, selector, t.stepIndex]);

  if (!active || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[55] pointer-events-none">
      <div className="absolute inset-0 bg-background/40" />
      {rect && (
        <div
          className={`absolute rounded-2xl ring-2 ring-primary/70 shadow-[0_0_0_9999px_hsl(var(--background)/0.55)] ${reduced ? "" : "animate-pulse"}`}
          style={{
            left: rect.left - 8,
            top: rect.top - 8,
            width: rect.width + 16,
            height: rect.height + 16,
          }}
        />
      )}
    </div>,
    document.body,
  );
}
