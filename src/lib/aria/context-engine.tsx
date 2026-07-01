/**
 * ARIA Global Context Engine.
 *
 * Purely additive, client-side layer that gives ARIA a live snapshot of
 * "what the executive is currently looking at" without redesigning any
 * page. Pages, dashboards, widgets, and KPI cards register themselves
 * declaratively; ARIA reads the merged snapshot when the user asks a
 * question.
 *
 * Zero UI. No layout changes.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "@tanstack/react-router";
import {
  ariaSessionMemory,
  type AriaTurn,
} from "./session-memory";
import { useAriaAutoScan } from "./use-auto-scan";

export type AriaWidgetKind =
  | "kpi"
  | "chart"
  | "table"
  | "notification"
  | "widget"
  | "report"
  | "document"
  | "object";

export interface AriaWidgetSnapshot {
  id: string;
  kind: AriaWidgetKind;
  label: string;
  /** Compact serializable payload (numbers, strings, small arrays). */
  value?: unknown;
  meta?: Record<string, unknown>;
  /** Optional short (<=240 chars) natural-language description of the widget. */
  hint?: string;
  updated_at: string;
}

export interface AriaPageSnapshot {
  path: string;
  title?: string;
  section?: string;
  filters?: Record<string, unknown>;
  selected?: Record<string, unknown> | null;
  meta?: Record<string, unknown>;
  updated_at: string;
}

export interface AriaContextSnapshot {
  page: AriaPageSnapshot;
  widgets: AriaWidgetSnapshot[];
  history: AriaTurn[];
  locale: "ar" | "en" | "mixed";
  ts: string;
}

interface Store {
  page: AriaPageSnapshot;
  widgets: Map<string, AriaWidgetSnapshot>;
  listeners: Set<() => void>;
  locale: "ar" | "en" | "mixed";
}

const AriaContextCtx = createContext<{
  setPage: (p: Partial<AriaPageSnapshot>) => void;
  registerWidget: (w: AriaWidgetSnapshot) => void;
  unregisterWidget: (id: string) => void;
  setLocale: (l: "ar" | "en" | "mixed") => void;
  snapshot: () => AriaContextSnapshot;
  subscribe: (fn: () => void) => () => void;
} | null>(null);

function nowIso() {
  return new Date().toISOString();
}

function createStore(): Store {
  return {
    page: { path: "/", updated_at: nowIso() },
    widgets: new Map(),
    listeners: new Set(),
    locale: "en",
  };
}

function snapshotOf(store: Store): AriaContextSnapshot {
  return {
    page: store.page,
    widgets: Array.from(store.widgets.values()),
    history: ariaSessionMemory.list(),
    locale: store.locale,
    ts: nowIso(),
  };
}

interface WindowWithAria {
  __aria_context?: {
    get: () => AriaContextSnapshot;
    setPage: (p: Partial<AriaPageSnapshot>) => void;
    registerWidget: (w: AriaWidgetSnapshot) => void;
    unregisterWidget: (id: string) => void;
    pushTurn: (t: Omit<AriaTurn, "ts">) => void;
    subscribe: (fn: () => void) => () => void;
  };
}

export function AriaContextProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<Store>(createStore());
  const router = useRouter();

  const emit = useCallback(() => {
    for (const fn of storeRef.current.listeners) {
      try {
        fn();
      } catch {
        /* noop */
      }
    }
  }, []);

  const setPage = useCallback(
    (p: Partial<AriaPageSnapshot>) => {
      const cur = storeRef.current.page;
      storeRef.current.page = {
        ...cur,
        ...p,
        updated_at: nowIso(),
      };
      emit();
    },
    [emit],
  );

  const registerWidget = useCallback(
    (w: AriaWidgetSnapshot) => {
      storeRef.current.widgets.set(w.id, { ...w, updated_at: nowIso() });
      emit();
    },
    [emit],
  );

  const unregisterWidget = useCallback(
    (id: string) => {
      storeRef.current.widgets.delete(id);
      emit();
    },
    [emit],
  );

  const setLocale = useCallback(
    (l: "ar" | "en" | "mixed") => {
      storeRef.current.locale = l;
      emit();
    },
    [emit],
  );

  const snapshot = useCallback(() => snapshotOf(storeRef.current), []);

  const subscribe = useCallback((fn: () => void) => {
    storeRef.current.listeners.add(fn);
    return () => storeRef.current.listeners.delete(fn);
  }, []);

  // Auto-register the current route on every navigation.
  useEffect(() => {
    const update = () => {
      try {
        const loc = router.state.location;
        setPage({
          path: loc.pathname,
          title: typeof document !== "undefined" ? document.title : undefined,
          // Reset selected state on navigation — widgets re-register on mount.
          selected: null,
          filters: {},
        });
        // Widgets from the previous page should not leak into ARIA's view
        // of the new page.
        storeRef.current.widgets.clear();
        emit();
      } catch {
        /* noop */
      }
    };
    update();
    const unsub = router.subscribe("onResolved", update);
    return () => unsub();
  }, [router, setPage, emit]);

  // Expose an imperative window API for non-React callers (dock, voice
  // layer, embedded iframes, DevTools).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as unknown as WindowWithAria;
    w.__aria_context = {
      get: snapshot,
      setPage,
      registerWidget,
      unregisterWidget,
      pushTurn: (t) => ariaSessionMemory.push(t),
      subscribe,
    };
    return () => {
      if (w.__aria_context) delete w.__aria_context;
    };
  }, [snapshot, setPage, registerWidget, unregisterWidget, subscribe]);

  const value = useMemo(
    () => ({
      setPage,
      registerWidget,
      unregisterWidget,
      setLocale,
      snapshot,
      subscribe,
    }),
    [setPage, registerWidget, unregisterWidget, setLocale, snapshot, subscribe],
  );

  // Silent, proactive Executive Auto-Scan: greeting + background insights.
  useAriaAutoScan();

  return (
    <AriaContextCtx.Provider value={value}>{children}</AriaContextCtx.Provider>
  );
}

export function useAriaContext() {
  const v = useContext(AriaContextCtx);
  if (!v) {
    // Safe no-op fallback so pages don't crash when rendered outside the
    // provider (unit tests, storybook).
    return {
      setPage: () => {},
      registerWidget: () => {},
      unregisterWidget: () => {},
      setLocale: () => {},
      snapshot: (): AriaContextSnapshot => ({
        page: { path: "/", updated_at: nowIso() },
        widgets: [],
        history: [],
        locale: "en",
        ts: nowIso(),
      }),
      subscribe: () => () => {},
    };
  }
  return v;
}

/**
 * Declaratively announce the current page to ARIA. Call from a route
 * component's body; runs on mount + whenever `snapshot` changes.
 */
export function useRegisterPage(snapshot: Partial<AriaPageSnapshot>) {
  const { setPage } = useAriaContext();
  const serialized = JSON.stringify(snapshot);
  useEffect(() => {
    try {
      setPage(JSON.parse(serialized) as Partial<AriaPageSnapshot>);
    } catch {
      /* noop */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized]);
}

/**
 * Declaratively announce a widget (KPI, chart, table, notification card).
 * Auto-unregisters on unmount.
 */
export function useRegisterWidget(w: Omit<AriaWidgetSnapshot, "updated_at">) {
  const { registerWidget, unregisterWidget } = useAriaContext();
  const serialized = JSON.stringify(w);
  useEffect(() => {
    try {
      const parsed = JSON.parse(serialized) as Omit<AriaWidgetSnapshot, "updated_at">;
      registerWidget({ ...parsed, updated_at: nowIso() });
      return () => unregisterWidget(parsed.id);
    } catch {
      /* noop */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized]);
}

/**
 * Read the live ARIA snapshot from React with re-renders on change.
 * Prefer `snapshot()` from `useAriaContext()` for one-shot reads.
 */
export function useAriaSnapshot(): AriaContextSnapshot {
  const { snapshot, subscribe } = useAriaContext();
  const [snap, setSnap] = useState<AriaContextSnapshot>(() => snapshot());
  useEffect(() => {
    const un = subscribe(() => setSnap(snapshot()));
    return () => {
      un();
    };
  }, [snapshot, subscribe]);
  return snap;
}
