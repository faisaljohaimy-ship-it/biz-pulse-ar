import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";

/**
 * Cinematic route transition overlay.
 * Additive — does NOT wrap or block <Outlet />. Mounts once at root,
 * observes router location, and plays a light-sweep + dim over the top.
 * Navigation happens normally; this is a purely visual companion.
 */
export function CinematicRouteShell() {
  const location = useRouterState({ select: (s) => s.location.pathname });
  const historyIdx = useRouterState({ select: (s) => (s.location.state as { key?: string; __TSR_index?: number } | null)?.__TSR_index ?? 0 });
  const prevPath = useRef<string>(location);
  const prevIdx = useRef<number>(historyIdx);
  const [active, setActive] = useState(false);
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const [contentKey, setContentKey] = useState(0);

  useEffect(() => {
    if (prevPath.current === location) return;
    const goingBack = historyIdx < prevIdx.current;
    setDir(goingBack ? "back" : "fwd");
    setActive(true);
    setContentKey((k) => k + 1);
    prevPath.current = location;
    prevIdx.current = historyIdx;
    const t = window.setTimeout(() => setActive(false), 520);
    return () => window.clearTimeout(t);
  }, [location, historyIdx]);

  // Apply the enter animation class to <main> content by keying an invisible
  // marker. We inject a global one-shot class via CSS variable on <html>.
  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove("nx-route-content");
    // force reflow so the animation replays
    void html.offsetWidth;
    html.classList.add("nx-route-content");
    const t = window.setTimeout(() => html.classList.remove("nx-route-content"), 320);
    return () => window.clearTimeout(t);
  }, [contentKey]);

  return (
    <div
      aria-hidden
      className="nx-route-overlay"
      data-active={active ? "1" : "0"}
      data-dir={dir}
    >
      <div className="nx-route-dim" />
      <div className="nx-route-sweep" />
    </div>
  );
}
