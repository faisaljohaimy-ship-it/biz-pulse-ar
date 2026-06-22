/**
 * Local test harness to reproduce iOS Safari auth/session edge cases
 * without leaving the desktop browser.
 *
 * Activate by appending ?authtest=1 to any URL, or running
 * `window.__nxAuthTest.enable()` in the console. Once enabled it exposes
 * `window.__nxAuthTest` with helpers that fire the same events the auth
 * diagnostics layer listens for (net:online/offline, doc:visibility,
 * page:show with `persisted: true` to mimic the iOS back-forward cache).
 *
 * Pure dev/QA aid — no production behavior changes.
 */

import { authLog } from "@/lib/auth-diagnostics";

type Harness = {
  enabled: boolean;
  enable: () => void;
  disable: () => void;
  goOffline: () => void;
  goOnline: () => void;
  hide: () => void;
  show: () => void;
  bfcacheRestore: () => void;
  simulateStuckSession: (ms?: number) => void;
  runIosScenario: () => Promise<void>;
};

declare global {
  interface Window {
    __nxAuthTest?: Harness;
  }
}

const FLAG_KEY = "nx_auth_test";

function dispatch(target: EventTarget, type: string, init?: EventInit) {
  try {
    target.dispatchEvent(new Event(type, init));
  } catch {
    /* noop */
  }
}

function setOnline(value: boolean) {
  try {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => value,
    });
  } catch {
    /* some browsers refuse — events still fire */
  }
}

function setVisibility(state: "visible" | "hidden") {
  try {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => state,
    });
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => state === "hidden",
    });
  } catch {
    /* noop */
  }
}

function build(): Harness {
  const h: Harness = {
    enabled: false,
    enable() {
      h.enabled = true;
      try {
        window.localStorage.setItem(FLAG_KEY, "1");
      } catch {
        /* noop */
      }
      authLog("test:enable");
    },
    disable() {
      h.enabled = false;
      try {
        window.localStorage.removeItem(FLAG_KEY);
      } catch {
        /* noop */
      }
      setOnline(true);
      setVisibility("visible");
      authLog("test:disable");
    },
    goOffline() {
      setOnline(false);
      dispatch(window, "offline");
      authLog("test:goOffline");
    },
    goOnline() {
      setOnline(true);
      dispatch(window, "online");
      authLog("test:goOnline");
    },
    hide() {
      setVisibility("hidden");
      dispatch(document, "visibilitychange");
      authLog("test:hide");
    },
    show() {
      setVisibility("visible");
      dispatch(document, "visibilitychange");
      authLog("test:show");
    },
    bfcacheRestore() {
      try {
        const evt = new PageTransitionEvent("pageshow", { persisted: true });
        window.dispatchEvent(evt);
      } catch {
        // Fallback for browsers without PageTransitionEvent ctor
        const evt = new Event("pageshow") as Event & { persisted?: boolean };
        (evt as { persisted?: boolean }).persisted = true;
        window.dispatchEvent(evt);
      }
      authLog("test:bfcacheRestore");
    },
    simulateStuckSession(ms = 5000) {
      // Monkey-patch supabase fetch to hang once, mimicking an iOS
      // storage read that never resolves. Restores itself after `ms`.
      const original = window.fetch;
      let restored = false;
      const restore = () => {
        if (restored) return;
        restored = true;
        window.fetch = original;
        authLog("test:stuckSession:restore");
      };
      window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url.includes("/auth/v1/")) {
          authLog("test:stuckSession:hang", { url });
          return new Promise<Response>(() => {
            /* never resolves */
          });
        }
        return original(input, init);
      }) as typeof window.fetch;
      window.setTimeout(restore, ms);
      authLog("test:stuckSession:arm", { ms });
    },
    async runIosScenario() {
      authLog("test:iosScenario:start");
      h.hide();
      await new Promise((r) => setTimeout(r, 400));
      h.goOffline();
      await new Promise((r) => setTimeout(r, 600));
      h.show();
      await new Promise((r) => setTimeout(r, 200));
      h.bfcacheRestore();
      await new Promise((r) => setTimeout(r, 200));
      h.goOnline();
      authLog("test:iosScenario:done");
    },
  };
  return h;
}

export function installAuthTestHarness() {
  if (typeof window === "undefined") return;
  if (window.__nxAuthTest) return;
  const harness = build();
  window.__nxAuthTest = harness;

  const params = new URLSearchParams(window.location.search);
  const flagged =
    params.get("authtest") === "1" ||
    (() => {
      try {
        return window.localStorage.getItem(FLAG_KEY) === "1";
      } catch {
        return false;
      }
    })();

  if (flagged) {
    harness.enable();
    // eslint-disable-next-line no-console
    console.info(
      "[nx-auth-test] enabled. Try window.__nxAuthTest.runIosScenario() — also: goOffline, goOnline, hide, show, bfcacheRestore, simulateStuckSession(ms).",
    );
  }
}
