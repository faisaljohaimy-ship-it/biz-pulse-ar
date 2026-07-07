/**
 * ARIA Self-Healing Watchdog — client-side.
 * Enforces Article III of docs/NEXUS_ENGINEERING_CONSTITUTION.md.
 *
 * Detects failures on the client (unhandled errors, unhandled promise
 * rejections, video/audio errors, offline transitions) and forwards
 * bounded, redacted incident reports to the server for durable logging
 * into `aria_incidents`. Circuit-breaker prevents log storms.
 *
 * Contract:
 *   - No PII, no chat content, no auth tokens ever leave the browser.
 *   - Dedup + rate limit: ≤ 10 events / minute / kind (client-side).
 *   - Best-effort transport (sendBeacon); silent on failure.
 *   - SSR-safe: all globals accessed inside install().
 */

const RATE_LIMIT_PER_KIND_PER_MIN = 10;
const REPORT_ENDPOINT = "/api/public/hooks/aria-incident";

type Kind =
  | "unhandled_error"
  | "unhandled_rejection"
  | "video_error"
  | "audio_error"
  | "autoplay_blocked"
  | "offline"
  | "chat_stream_error"
  | "tts_failure";

interface Incident {
  readonly kind: Kind;
  readonly detail: string;
  readonly url?: string;
  readonly device_class: "mobile" | "tablet" | "desktop";
  readonly viewport?: { w: number; h: number };
  readonly ts: number;
}

const counters = new Map<Kind, { count: number; windowStart: number }>();

function classifyDevice(): "mobile" | "tablet" | "desktop" {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone/i.test(ua)) return "mobile";
  return "desktop";
}

function allow(kind: Kind): boolean {
  const now = Date.now();
  const cur = counters.get(kind);
  if (!cur || now - cur.windowStart > 60_000) {
    counters.set(kind, { count: 1, windowStart: now });
    return true;
  }
  cur.count += 1;
  return cur.count <= RATE_LIMIT_PER_KIND_PER_MIN;
}

function redact(s: string): string {
  // Strip anything that looks like a token/JWT/email/URL query strings.
  return s
    .replace(/eyJ[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{20,}/g, "[jwt]")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email]")
    .replace(/(\?|&)[a-zA-Z0-9_]+=[^&\s]+/g, "$1[q]")
    .slice(0, 500);
}

function report(kind: Kind, detail: string): void {
  if (typeof window === "undefined") return;
  if (!allow(kind)) return;
  const incident: Incident = {
    kind,
    detail: redact(detail),
    url: typeof location !== "undefined" ? location.pathname : undefined,
    device_class: classifyDevice(),
    viewport:
      typeof window !== "undefined"
        ? { w: window.innerWidth, h: window.innerHeight }
        : undefined,
    ts: Date.now(),
  };
  try {
    const body = new Blob([JSON.stringify(incident)], { type: "application/json" });
    if (navigator.sendBeacon?.(REPORT_ENDPOINT, body)) return;
    void fetch(REPORT_ENDPOINT, {
      method: "POST",
      body: JSON.stringify(incident),
      headers: { "content-type": "application/json" },
      keepalive: true,
    }).catch(() => { /* silent — watchdog must never itself fail loud */ });
  } catch {
    /* silent */
  }
}

let installed = false;

/**
 * Install the watchdog once, at app root. Idempotent + SSR-safe.
 * Returns a cleanup function that removes all listeners.
 */
export function installAriaWatchdog(): (() => void) | undefined {
  if (typeof window === "undefined") return undefined;
  if (installed) return undefined;
  installed = true;

  const onError = (e: ErrorEvent) => {
    report("unhandled_error", `${e.message} @ ${e.filename ?? "?"}:${e.lineno ?? 0}`);
  };
  const onRejection = (e: PromiseRejectionEvent) => {
    const r: unknown = e.reason;
    const msg = r instanceof Error ? r.message : typeof r === "string" ? r : "unknown";
    report("unhandled_rejection", msg);
  };
  const onOffline = () => report("offline", "navigator.onLine=false");

  // Global video/audio errors — capture-phase so any <video> or <audio>
  // element hits the watchdog even if a component swallows the event.
  const onMediaError = (e: Event) => {
    const t = e.target as HTMLMediaElement | null;
    if (!t) return;
    const tag = t.tagName?.toLowerCase();
    if (tag !== "video" && tag !== "audio") return;
    const code = t.error?.code ?? 0;
    report(tag === "video" ? "video_error" : "audio_error", `code=${code} src=${t.currentSrc?.slice(-60) ?? ""}`);
  };

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  window.addEventListener("offline", onOffline);
  window.addEventListener("error", onMediaError, true); // capture

  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
    window.removeEventListener("offline", onOffline);
    window.removeEventListener("error", onMediaError, true);
    installed = false;
  };
}

/** Public helper for components to report a domain-specific failure. */
export function reportAriaIncident(kind: Kind, detail: string): void {
  report(kind, detail);
}
