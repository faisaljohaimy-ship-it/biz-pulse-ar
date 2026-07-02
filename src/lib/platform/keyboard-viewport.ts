/**
 * Keyboard-aware viewport binding.
 *
 * On Android/Chrome and iOS Safari, the on-screen keyboard shrinks the
 * `visualViewport` but not `window.innerHeight`. We publish the delta as
 * `--nx-kb` on <html> so any docked panel or input can lift itself with
 *   bottom: max(env(safe-area-inset-bottom), var(--nx-kb, 0px));
 * Additive; safe to install from a top-level provider.
 */
export function installKeyboardViewportBinding(): () => void {
  if (typeof window === "undefined") return () => {};
  const vv = window.visualViewport;
  const root = document.documentElement;
  if (!vv) { root.style.setProperty("--nx-kb", "0px"); return () => {}; }

  let raf = 0;
  const update = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const delta = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      root.style.setProperty("--nx-kb", `${Math.round(delta)}px`);
    });
  };
  update();
  vv.addEventListener("resize", update);
  vv.addEventListener("scroll", update);
  return () => {
    vv.removeEventListener("resize", update);
    vv.removeEventListener("scroll", update);
    cancelAnimationFrame(raf);
  };
}
