/**
 * Lightweight runtime feature flags. Default values ship in code;
 * users can override per-flag via localStorage ("1" = ON, "0" = OFF)
 * or the URL query (?flag=hero_v2:0). SSR-safe.
 */
export type FlagName = "hero_v2";

const DEFAULTS: Record<FlagName, boolean> = {
  hero_v2: true,
};

export function isFlagOn(name: FlagName): boolean {
  const fallback = DEFAULTS[name];
  if (typeof window === "undefined") return fallback;
  try {
    const url = new URL(window.location.href);
    const qp = url.searchParams.get(name);
    if (qp === "0" || qp === "off") return false;
    if (qp === "1" || qp === "on") return true;
    const ls = window.localStorage.getItem(`flag:${name}`);
    if (ls === "0") return false;
    if (ls === "1") return true;
  } catch { /* ignore */ }
  return fallback;
}

export function setFlag(name: FlagName, on: boolean | null): void {
  if (typeof window === "undefined") return;
  try {
    if (on === null) window.localStorage.removeItem(`flag:${name}`);
    else window.localStorage.setItem(`flag:${name}`, on ? "1" : "0");
  } catch { /* ignore */ }
}
