// Smooth count animation for KPI cards — GPU-friendly (rAF only).
import * as React from "react";

export function useAnimatedNumber(target: number, durationMs = 900): number {
  const [value, setValue] = React.useState(target);
  const startRef = React.useRef<number | null>(null);
  const fromRef = React.useRef<number>(target);
  const rafRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    fromRef.current = value;
    startRef.current = null;
    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const t = Math.min(1, (ts - startRef.current) / Math.max(1, durationMs));
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(fromRef.current + (target - fromRef.current) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return value;
}
