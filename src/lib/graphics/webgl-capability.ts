/**
 * WebGL capability detection — decide BEFORE mounting a renderer.
 *
 * WHY THIS EXISTS
 * The platform mounts `<Canvas>` (react-three-fiber) in four places with no
 * capability check. On a device or environment without WebGL — a locked-down
 * corporate browser, a headless run, an older tablet, a machine where the GPU
 * process has crashed — three.js constructs a renderer, fails, and the failure
 * repeats on every re-render. The console fills with the same error and the
 * user sees a blank panel with no explanation.
 *
 * The fix is ordering: ask whether WebGL exists, and if it does not, never
 * mount the renderer at all. A component that is not rendered cannot throw.
 *
 * WHY THE RESULT IS CACHED
 * Detection creates a real context. Doing that on every render is itself a
 * source of the "too many WebGL contexts" warning this is meant to prevent —
 * browsers cap live contexts (commonly 8–16) and evict the oldest, which can
 * break a canvas that was working. The answer cannot change within a page
 * lifetime, so it is computed once.
 */

let cached: boolean | null = null;

/**
 * True when a WebGL (2 or 1) context can actually be created.
 *
 * SSR-safe: returns false when there is no `window`, so a server render never
 * attempts detection and never disagrees with the client about markup — the
 * client re-checks on mount.
 */
export function canUseWebGL(): boolean {
  if (cached !== null) return cached;
  if (typeof window === "undefined" || typeof document === "undefined") {
    // Not cached: this is the SSR pass, and the client must be free to answer
    // differently. Caching `false` here would disable 3D for the whole session.
    return false;
  }
  try {
    const canvas = document.createElement("canvas");
    const ok =
      Boolean(window.WebGL2RenderingContext && canvas.getContext("webgl2")) ||
      Boolean(
        window.WebGLRenderingContext &&
        (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")),
      );
    // Release the probe context immediately rather than waiting for GC — it
    // counts against the browser's live-context cap like any other.
    const probe = (canvas.getContext("webgl2") ??
      canvas.getContext("webgl")) as WebGLRenderingContext | null;
    probe?.getExtension("WEBGL_lose_context")?.loseContext();
    cached = ok;
    return ok;
  } catch {
    // A throw here means the environment refuses context creation outright.
    // That is a definitive "no", not a transient error worth retrying.
    cached = false;
    return false;
  }
}

/**
 * Device pixel ratio for a 3D surface, capped.
 *
 * An uncapped DPR on a 3× phone renders nine times the pixels of a 1× screen
 * for a decorative backdrop — the single biggest cause of thermal throttling
 * and dropped frames on mobile in this kind of UI. 2 is visually indistinguishable
 * from 3 at arm's length for these scenes.
 */
export function cappedDpr(max = 2): [number, number] {
  if (typeof window === "undefined") return [1, 1];
  return [1, Math.min(window.devicePixelRatio || 1, max)];
}

/** Test seam: forget the cached answer. Not used by application code. */
export function __resetWebGLCapabilityCache(): void {
  cached = null;
}
