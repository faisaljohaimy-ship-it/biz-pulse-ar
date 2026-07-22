/**
 * FINN Permanent Self-Healing Agent (client-side, always-on).
 *
 * Runs continuously in the background from the moment the shell hydrates
 * and never stops. It complements the pre-hydration Crash-Loop Breaker
 * (see src/routes/__root.tsx Article XIII inline script) and the runtime
 * watchdog (src/lib/aria/self-healing/watchdog.ts) by taking *actions*,
 * not just reporting.
 *
 * Recovery ladder (each step is idempotent + rate-limited):
 *   1. Chunk / module load failure → cache-busting reload (once per session).
 *   2. Repeated hard crashes (Safari "problem repeatedly occurred") → purge
 *      Cache Storage, unregister service workers, clear volatile session
 *      keys, then reload into safe-mode.
 *   3. Memory pressure (performance.memory or safe-mode flag) → set
 *      `html.safe-mode` so heavy scenes opt out (animations, video, r3f).
 *   4. Long offline stretch → soft-reload when the network returns.
 *
 * Contract:
 *   - SSR-safe (all globals accessed inside install()).
 *   - Idempotent — safe to import from multiple places.
 *   - Never throws to the host page; failures are swallowed.
 */

const HEAL_FLAG = "nexios-heal-run";
const HEAL_QUERY = "heal";
const BOOT_KEY = "nexios-boot-attempts";
const HEARTBEAT_MS = 30_000;

let installed = false;

function safe<T>(fn: () => T): T | undefined {
  try {
    return fn();
  } catch {
    return undefined;
  }
}

function isChunkError(msg: string): boolean {
  return /Loading (chunk|CSS chunk|module)|ChunkLoadError|Failed to fetch dynamically imported module|Importing a module script failed/i.test(
    msg,
  );
}

function purgeCachesAndSW(): Promise<void> {
  const jobs: Promise<unknown>[] = [];
  if ("caches" in window) {
    jobs.push(
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .catch(() => undefined),
    );
  }
  if ("serviceWorker" in navigator) {
    jobs.push(
      navigator.serviceWorker
        .getRegistrations()
        .then((rs) => Promise.all(rs.map((r) => r.unregister())))
        .catch(() => undefined),
    );
  }
  return Promise.all(jobs).then(() => undefined);
}

function reloadWithHeal(reason: string): void {
  if (safe(() => sessionStorage.getItem(HEAL_FLAG)) === "1") return; // one heal per session
  safe(() => sessionStorage.setItem(HEAL_FLAG, "1"));
  safe(() => sessionStorage.setItem("nexios-heal-reason", reason.slice(0, 80)));
  const url = new URL(window.location.href);
  url.searchParams.set(HEAL_QUERY, Date.now().toString(36));
  window.location.replace(url.toString());
}

function enterSafeMode(reason: string): void {
  safe(() => document.documentElement.classList.add("safe-mode"));
  safe(() => sessionStorage.setItem("nexios-safe-mode", "1"));
  safe(() => sessionStorage.setItem("nexios-safe-mode-reason", reason.slice(0, 80)));
}

function hardHeal(reason: string): void {
  void purgeCachesAndSW().finally(() => {
    // Clear volatile boot state so the next mount starts fresh.
    safe(() => sessionStorage.removeItem(BOOT_KEY));
    safe(() => sessionStorage.removeItem("nexios-welcome"));
    reloadWithHeal(reason);
  });
}

/**
 * Install the permanent healing agent. Idempotent, SSR-safe.
 * Returns a cleanup function.
 */
export function installPermanentHealer(): (() => void) | undefined {
  if (typeof window === "undefined") return undefined;
  if (installed) return undefined;
  installed = true;

  const attempts = Number(safe(() => sessionStorage.getItem(BOOT_KEY)) ?? "0") || 0;
  if (attempts >= 3) {
    // The pre-hydration breaker already promoted us to safe-mode after 2.
    // A 3rd attempt means safe-mode alone was not enough — do a hard heal.
    hardHeal(`boot_attempts=${attempts}`);
    return undefined;
  }

  // ── Chunk / dynamic import failures ───────────────────────────────
  const onError = (e: ErrorEvent) => {
    const msg = String(e.message ?? "");
    if (isChunkError(msg)) reloadWithHeal("chunk_error");
  };
  const onRejection = (e: PromiseRejectionEvent) => {
    const r: unknown = e.reason;
    const msg = r instanceof Error ? r.message : typeof r === "string" ? r : "";
    if (isChunkError(msg)) reloadWithHeal("chunk_rejection");
  };

  // ── Memory pressure sensor ────────────────────────────────────────
  const checkMemory = () => {
    // Chrome-only, but harmless elsewhere.
    const perf = performance as unknown as {
      memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number };
    };
    const m = perf.memory;
    if (!m || !m.jsHeapSizeLimit) return;
    const ratio = m.usedJSHeapSize / m.jsHeapSizeLimit;
    if (ratio > 0.9) enterSafeMode(`heap=${ratio.toFixed(2)}`);
  };

  // ── Offline / online recovery ─────────────────────────────────────
  // Note: we intentionally do NOT auto-reload when the network returns.
  // A surprise reload would discard in-progress form input (permits,
  // incident reports, etc.) on common mobile connectivity gaps
  // (elevators, tunnels, sleep/wake, weak Wi-Fi). Loaders and realtime
  // channels re-sync on their own; if a hard refresh is ever needed the
  // user can trigger it manually.
  const onOffline = () => {
    /* no-op: observed for future telemetry only */
  };
  const onOnline = () => {
    /* no-op: see comment above */
  };

  // ── Heartbeat ─────────────────────────────────────────────────────
  const heartbeat = window.setInterval(() => {
    if (document.visibilityState !== "visible") return;
    checkMemory();
    // Reset the pre-hydration attempt counter every healthy minute; if the
    // page stays visible & interactive, previous strikes are forgiven.
    safe(() => sessionStorage.removeItem(BOOT_KEY));
  }, HEARTBEAT_MS);

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  window.addEventListener("offline", onOffline);
  window.addEventListener("online", onOnline);
  // First check right after hydration.
  window.setTimeout(checkMemory, 2_000);

  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
    window.removeEventListener("offline", onOffline);
    window.removeEventListener("online", onOnline);
    window.clearInterval(heartbeat);
    installed = false;
  };
}
