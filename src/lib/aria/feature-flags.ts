/**
 * Client-side feature flags for the ARIA presence layer.
 *
 * Flags default ON; users (or dev tools) can disable them via localStorage:
 *   localStorage.setItem('aria_v3', '0')
 */
export function isAriaV3Enabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const v = window.localStorage.getItem("aria_v3");
    return v !== "0";
  } catch {
    return true;
  }
}
