/**
 * System health — an honest connection state.
 *
 * WHY THIS EXISTS
 * The home header rendered a hard-coded «الأنظمة متصلة» / "Systems online"
 * badge. It was a string, not a status: it said connected while the Supabase
 * environment variables were absent and every data-backed feature was failing.
 * A status indicator that cannot report a problem is worse than no indicator,
 * because it actively teaches the operator to trust a signal that means nothing
 * — and this is a platform whose whole job is telling people what is wrong.
 *
 * The states are deliberately five, not two. "Not connected" and "connected to
 * a misconfigured deployment" need different words because they need different
 * actions: one is waited out, the other is a deployment fix nobody will make if
 * the UI calls it a network blip.
 */

export type SystemHealth = "checking" | "connected" | "degraded" | "disconnected" | "misconfigured";

export interface SupabaseEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

/**
 * Whether the browser bundle actually carries a usable Supabase configuration.
 *
 * Both key names are accepted because the project has shipped under both, and a
 * deployment that sets only the older one is configured, not broken. Values are
 * trimmed so that a variable present-but-empty — the usual shape of a missing
 * CI secret — counts as absent rather than as a valid empty string.
 *
 * This reads only public `VITE_*` values and never returns or logs them.
 */
export function hasSupabaseConfig(env: SupabaseEnv): boolean {
  const url = env.VITE_SUPABASE_URL?.trim();
  const key = env.VITE_SUPABASE_ANON_KEY?.trim() || env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  return Boolean(url && key);
}

export interface HealthInput {
  readonly env: SupabaseEnv;
  /** Result of a real reachability probe. `undefined` = not answered yet. */
  readonly probeOk?: boolean;
  /** Browser connectivity, when the caller knows it. */
  readonly online?: boolean;
}

/**
 * Derive the state. Ordering is the whole design:
 *
 * 1. Missing configuration outranks everything. No probe can succeed without
 *    it, and reporting "disconnected" would send someone to check the network
 *    for a problem that lives in the deploy environment.
 * 2. Known-offline browser next — an accurate, actionable answer.
 * 3. Only then the probe. An unanswered probe is `checking`, never `connected`:
 *    the optimistic default is exactly the bug this module replaces.
 */
export function deriveSystemHealth({ env, probeOk, online }: HealthInput): SystemHealth {
  if (!hasSupabaseConfig(env)) return "misconfigured";
  if (online === false) return "disconnected";
  if (probeOk === undefined) return "checking";
  return probeOk ? "connected" : "degraded";
}

/** Bilingual label + tone. Kept beside the state so no page invents its own. */
export function healthLabel(state: SystemHealth, ar: boolean): string {
  switch (state) {
    case "connected":
      return ar ? "الأنظمة متصلة" : "Systems online";
    case "checking":
      return ar ? "جارٍ التحقق" : "Checking";
    case "degraded":
      return ar ? "اتصال متقطّع" : "Degraded";
    case "disconnected":
      return ar ? "غير متصل" : "Offline";
    case "misconfigured":
      return ar ? "إعداد غير مكتمل" : "Setup incomplete";
  }
}

/** Only a verified probe earns the positive tone. */
export function healthTone(state: SystemHealth): "positive" | "warning" | "neutral" {
  if (state === "connected") return "positive";
  if (state === "checking") return "neutral";
  return "warning";
}
