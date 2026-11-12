/**
 * Client-side auth/session diagnostics.
 * Tags every log line with a per-tab session id so multiple devices/tabs
 * can be told apart when investigating a stuck loader.
 *
 * Logs are mirrored to:
 *  - console (visible to Lovable's console reader)
 *  - window.__nxAuthLog (ring buffer, last 100 entries)
 *  - localStorage "nx_auth_diag" (last 50, survives reloads)
 */

const SID_KEY = "nx_diag_sid";
const BUF_KEY = "nx_auth_diag";
const MAX_MEM = 100;
const MAX_PERSIST = 50;

function makeSid(): string {
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

function getSid(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let sid = window.sessionStorage.getItem(SID_KEY);
    if (!sid) {
      sid = makeSid();
      window.sessionStorage.setItem(SID_KEY, sid);
    }
    return sid;
  } catch {
    return "nostorage";
  }
}

export type DiagEntry = {
  t: number;
  sid: string;
  ev: string;
  data?: Record<string, unknown>;
};

declare global {
  interface Window {
    __nxAuthLog?: DiagEntry[];
    __nxAuthDiag?: {
      sid: string;
      dump: () => DiagEntry[];
      clear: () => void;
    };
  }
}

function ringPush(entry: DiagEntry) {
  if (typeof window === "undefined") return;
  // Reuse the ring reference rather than repeatedly reading the window slot.
  const memory = (window.__nxAuthLog ??= []);
  memory.push(entry);
  if (memory.length > MAX_MEM) memory.splice(0, memory.length - MAX_MEM);
  try {
    let arr: DiagEntry[] = [];
    try {
      const saved: unknown = JSON.parse(window.localStorage.getItem(BUF_KEY) ?? "[]");
      if (Array.isArray(saved)) arr = saved;
    } catch {
      // Corrupt storage must not prevent new auth diagnostic events.
    }
    arr.push(entry);
    if (arr.length > MAX_PERSIST) arr.splice(0, arr.length - MAX_PERSIST);
    window.localStorage.setItem(BUF_KEY, JSON.stringify(arr));
  } catch {
    // private mode / quota — ignore
  }
}

export function authLog(ev: string, data?: Record<string, unknown>) {
  const entry: DiagEntry = { t: Date.now(), sid: getSid(), ev, data };
  ringPush(entry);
  // Single tagged console line — easy to grep in Safari Web Inspector.

  console.info(`[nx-auth ${entry.sid}] ${ev}`, data ?? "");
}

export function installAuthDiagnostics() {
  if (typeof window === "undefined") return;
  if (window.__nxAuthDiag) return;
  const sid = getSid();
  window.__nxAuthDiag = {
    sid,
    dump: () => window.__nxAuthLog ?? [],
    clear: () => {
      window.__nxAuthLog = [];
      try {
        window.localStorage.removeItem(BUF_KEY);
      } catch {
        /* noop */
      }
    },
  };
  authLog("diag:init", {
    ua: navigator.userAgent,
    online: navigator.onLine,
    lang: navigator.language,
    visibility: document.visibilityState,
    hasLocalStorage: (() => {
      try {
        window.localStorage.setItem("__nx_probe", "1");
        window.localStorage.removeItem("__nx_probe");
        return true;
      } catch {
        return false;
      }
    })(),
  });

  window.addEventListener("online", () => authLog("net:online"));
  window.addEventListener("offline", () => authLog("net:offline"));
  document.addEventListener("visibilitychange", () =>
    authLog("doc:visibility", { state: document.visibilityState }),
  );
  window.addEventListener("pageshow", (e) =>
    authLog("page:show", { persisted: (e as PageTransitionEvent).persisted }),
  );
}
