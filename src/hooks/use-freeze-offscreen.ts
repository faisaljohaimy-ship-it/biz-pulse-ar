import { useEffect, useRef } from "react";

/**
 * Freeze CSS animations inside a section while it is off-screen — the fix for
 * the cumulative-animation load that crashed iOS Safari (constitution: heavy
 * standing animations must pause when not visible). Returns a ref to attach to
 * the section wrapper; when the element leaves the viewport (plus a margin) it
 * gets `data-nx-frozen="true"`, and the global CSS rule sets
 * `animation-play-state: paused` on it and every descendant. Visible content is
 * never affected — only what the user isn't looking at stops animating.
 */
export function useFreezeOffscreen<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries[0]?.isIntersecting ?? true;
        el.setAttribute("data-nx-frozen", visible ? "false" : "true");
      },
      { rootMargin: "300px 0px", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}
