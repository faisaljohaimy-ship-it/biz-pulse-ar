// Client-side scheduler that drives the enterprise runtime pulse.
// Calls runtimePulse on an interval while the tab is visible, producing
// continuous agent/workflow/event activity across every dashboard.
import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { runtimePulse } from "./pulse.functions";

const INTERVAL_MS = 6_000;

export function useRuntimeScheduler(enabled: boolean = true) {
  const pulse = useServerFn(runtimePulse);
  const inflight = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const tick = async () => {
      if (cancelled || inflight.current) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      inflight.current = true;
      try {
        await pulse();
      } catch {
        // never throw from the scheduler; pulse logs internally
      } finally {
        inflight.current = false;
      }
    };

    // Kick once immediately so investor mode is alive on first paint.
    void tick();
    const id = window.setInterval(tick, INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled, pulse]);
}
