/**
 * Cockpit shared state — one provider owning the minimal cross-panel
 * state (package 01 §إدارة الحالة): snapshot, selectedRegion, mapMode,
 * experienceLevel, live events (pause buffer), notifications, overlays.
 *
 * Region selection flows through the app-wide RegionProvider so the
 * cockpit and the rest of SADEED agree on the active region; the previous
 * region request is aborted on rapid switching; screen readers hear the
 * change through a polite live region owned by the page.
 */
import * as React from "react";
import { toast } from "sonner";
import { useRegion } from "@/lib/region-context";
import type { RegionId } from "@/lib/regions";
import {
  createDemoCockpitRepository,
  type ActionResult,
  type CockpitEvent,
  type CockpitSnapshot,
  type ExecutiveCockpitRepository,
  type ExperienceLevel,
  type MapMode,
  type NotificationItem,
  type RegionSnapshot,
} from "./repository";
import { emitCockpitAction, type CockpitActionId } from "./actions";

// ── Overlay model ────────────────────────────────────────────────────────

export type DrawerTopic =
  | { type: "layer"; id: CockpitSnapshot["layers"][number]["id"] }
  | { type: "stage"; id: CockpitSnapshot["runtimeFlow"][number]["id"] }
  | { type: "kpi"; id: string }
  | { type: "recommendation" }
  | { type: "event"; id: string }
  | { type: "notifications" }
  | { type: "search" }
  | { type: "risk-analysis" }
  | { type: "decision-review" };

export type WorkflowId = "initiative-create" | "sector-report";

export type CockpitOverlay =
  { kind: "drawer"; topic: DrawerTopic } | { kind: "modal"; workflow: WorkflowId } | null;

export type SnapshotState =
  | { state: "loading" }
  | { state: "ready"; data: CockpitSnapshot; stale: boolean }
  | { state: "error"; messageAr: string };

const LEVEL_STORAGE_KEY = "nexios.cockpit.level";
const EVENT_CAP = 40;
const STALE_AFTER_MS = 120_000;

export interface CockpitContextValue {
  repository: ExecutiveCockpitRepository;
  snapshot: SnapshotState;
  reloadSnapshot: () => void;

  selectedRegion: RegionId;
  selectRegion: (id: RegionId) => void;
  regionDetail: RegionSnapshot | null;
  regionLoading: boolean;

  mapMode: MapMode;
  setMapMode: (mode: MapMode) => void;

  level: ExperienceLevel;
  setLevel: (level: ExperienceLevel) => void;

  events: readonly CockpitEvent[];
  eventsPaused: boolean;
  bufferedCount: number;
  toggleEventsPaused: () => void;
  dismissEvent: (id: string) => void;

  notifications: readonly NotificationItem[];
  unreadCount: number;
  markNotificationsRead: () => void;

  overlay: CockpitOverlay;
  openDrawer: (topic: DrawerTopic) => void;
  openWorkflow: (workflow: WorkflowId) => void;
  closeOverlay: () => void;

  /** Simulated sensitive execution (audit-logged, idempotent per key). */
  runCommand: (
    actionId: CockpitActionId,
    payload?: Readonly<Record<string, string | number | boolean>>,
  ) => Promise<ActionResult | null>;
  commandBusy: boolean;

  announce: (textAr: string) => void;
  liveMessage: string;
}

const CockpitContext = React.createContext<CockpitContextValue | null>(null);

export function useCockpit(): CockpitContextValue {
  const value = React.useContext(CockpitContext);
  if (!value) throw new Error("useCockpit خارج CockpitProvider");
  return value;
}

export interface CockpitProviderProps {
  children: React.ReactNode;
  /** Injectable for tests; defaults to the demo (reference simulation). */
  repository?: ExecutiveCockpitRepository;
  initialLevel?: ExperienceLevel;
}

export function CockpitProvider({ children, repository, initialLevel }: CockpitProviderProps) {
  const repo = React.useMemo(() => repository ?? createDemoCockpitRepository(), [repository]);
  const { regionId: selectedRegion, setRegion } = useRegion();

  const [snapshot, setSnapshot] = React.useState<SnapshotState>({ state: "loading" });
  const [regionDetail, setRegionDetail] = React.useState<RegionSnapshot | null>(null);
  const [regionLoading, setRegionLoading] = React.useState(false);
  const [mapMode, setMapModeState] = React.useState<MapMode>("3d");
  const [level, setLevelState] = React.useState<ExperienceLevel>(initialLevel ?? "executive");
  const [events, setEvents] = React.useState<readonly CockpitEvent[]>([]);
  const [eventsPaused, setEventsPaused] = React.useState(false);
  const [buffered, setBuffered] = React.useState<readonly CockpitEvent[]>([]);
  const [dismissed, setDismissed] = React.useState<ReadonlySet<string>>(new Set());
  const [notifications, setNotifications] = React.useState<readonly NotificationItem[]>([]);
  const [overlay, setOverlay] = React.useState<CockpitOverlay>(null);
  const [commandBusy, setCommandBusy] = React.useState(false);
  const [liveMessage, setLiveMessage] = React.useState("");

  const regionAbortRef = React.useRef<AbortController | null>(null);
  const snapshotAbortRef = React.useRef<AbortController | null>(null);
  const pausedRef = React.useRef(false);
  const commandKeysRef = React.useRef<Set<string>>(new Set());
  const staleTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const announce = React.useCallback((textAr: string) => setLiveMessage(textAr), []);

  // ── Snapshot lifecycle ────────────────────────────────────────────────
  const loadSnapshot = React.useCallback(
    (signal?: AbortSignal) => {
      setSnapshot({ state: "loading" });
      repo
        .getSnapshot(signal)
        .then((data) => {
          if (signal?.aborted) return;
          setSnapshot({ state: "ready", data, stale: false });
          setEvents(data.events.slice(0, EVENT_CAP));
          setNotifications(data.notifications);
          if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
          staleTimerRef.current = setTimeout(() => {
            setSnapshot((s) => (s.state === "ready" ? { ...s, stale: true } : s));
          }, STALE_AFTER_MS);
        })
        .catch((error: unknown) => {
          if (signal?.aborted || (error instanceof DOMException && error.name === "AbortError"))
            return;
          console.error("[cockpit] snapshot load failed", error);
          setSnapshot({
            state: "error",
            messageAr: "تعذر تحميل لقطة القمرة — أعد المحاولة.",
          });
        });
    },
    [repo],
  );

  React.useEffect(() => {
    const controller = new AbortController();
    snapshotAbortRef.current = controller;
    loadSnapshot(controller.signal);
    return () => {
      // Abort whatever is CURRENT in the ref — reloadSnapshot may have replaced
      // this mount-time controller, and aborting the stale closure would leak
      // the live request (setState after unmount). Mirrors the region cleanup.
      snapshotAbortRef.current?.abort();
      if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
    };
  }, [loadSnapshot]);

  // Manual reload is cancellable too: abort any in-flight load first so a
  // stale response can never overwrite a fresher one (or a torn-down page).
  const reloadSnapshot = React.useCallback(() => {
    snapshotAbortRef.current?.abort();
    const controller = new AbortController();
    snapshotAbortRef.current = controller;
    loadSnapshot(controller.signal);
  }, [loadSnapshot]);

  // ── Persisted experience level (non-sensitive preference only) ────────
  React.useEffect(() => {
    if (initialLevel) return;
    try {
      const stored = window.localStorage.getItem(LEVEL_STORAGE_KEY);
      if (stored === "executive" || stored === "operational" || stored === "technical") {
        setLevelState(stored);
      }
    } catch {
      /* storage unavailable — keep default */
    }
  }, [initialLevel]);

  const setLevel = React.useCallback(
    (next: ExperienceLevel) => {
      setLevelState(next);
      try {
        window.localStorage.setItem(LEVEL_STORAGE_KEY, next);
      } catch {
        /* preference only */
      }
      announce(
        next === "executive"
          ? "انتقلت إلى المستوى التنفيذي"
          : next === "operational"
            ? "انتقلت إلى المستوى التشغيلي"
            : "انتقلت إلى المستوى التقني",
      );
    },
    [announce],
  );

  // ── Region selection ──────────────────────────────────────────────────
  // Both the initial detail load and every user switch go through ONE shared
  // AbortController ref, so a slow earlier request can never land after a
  // newer one (last write wins). We abort the previous request at the START
  // of a new load rather than in an effect cleanup — cleanup-abort would
  // cancel a switch that the very same render just kicked off.
  const loadRegion = React.useCallback(
    (id: RegionId, opts?: { announce?: boolean }) => {
      regionAbortRef.current?.abort();
      const controller = new AbortController();
      regionAbortRef.current = controller;
      setRegionLoading(true);
      repo
        .getRegion(id, controller.signal)
        .then((data) => {
          if (controller.signal.aborted) return;
          setRegionDetail(data);
          setRegionLoading(false);
          if (opts?.announce) announce(`اختيرت ${data.labelAr} — الجاهزية ${data.readiness}٪`);
        })
        .catch((error: unknown) => {
          if (
            controller.signal.aborted ||
            (error instanceof DOMException && error.name === "AbortError")
          )
            return;
          console.error("[cockpit] region load failed", error);
          setRegionLoading(false);
        });
    },
    [repo, announce],
  );

  const selectRegion = React.useCallback(
    (id: RegionId) => {
      setRegion(id);
      loadRegion(id, { announce: true });
    },
    [setRegion, loadRegion],
  );

  // Load the initial region detail EXACTLY once, when the snapshot first
  // becomes ready. A one-shot ref stops this effect from re-firing when
  // selectedRegion changes while regionDetail is still null — otherwise a
  // user tap during that window would be clobbered by an un-announced reload
  // (and lose its aria-live announcement). Every later switch is owned by
  // selectRegion, which announces.
  const initialRegionRef = React.useRef(false);
  React.useEffect(() => {
    if (initialRegionRef.current || snapshot.state !== "ready" || regionDetail) return;
    initialRegionRef.current = true;
    loadRegion(selectedRegion);
  }, [snapshot.state, regionDetail, selectedRegion, loadRegion]);

  // Abort any in-flight region request only on unmount.
  React.useEffect(() => () => regionAbortRef.current?.abort(), []);

  const setMapMode = React.useCallback(
    (mode: MapMode) => {
      setMapModeState(mode);
      announce(
        mode === "3d"
          ? "وضع العرض ثلاثي الأبعاد"
          : mode === "layers"
            ? "وضع طبقات البيانات"
            : mode === "heat"
              ? "وضع الخريطة الحرارية"
              : "وضع التتبع المباشر",
      );
    },
    [announce],
  );

  // ── Live event stream (bounded buffer while paused) ───────────────────
  pausedRef.current = eventsPaused;
  React.useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        for await (const event of repo.getEventStream(controller.signal)) {
          if (controller.signal.aborted) return;
          if (pausedRef.current) {
            setBuffered((current) => [event, ...current].slice(0, EVENT_CAP));
          } else {
            setEvents((current) => [event, ...current].slice(0, EVENT_CAP));
          }
        }
      } catch (error) {
        // A deliberate abort (unmount / repo swap) is a clean end. Anything
        // else is a real stream failure — surface it instead of masking it
        // as a normal completion. Either way the last events are kept.
        if (
          controller.signal.aborted ||
          (error instanceof DOMException && error.name === "AbortError")
        )
          return;
        console.error("[cockpit] event stream error", error);
      }
    })();
    return () => controller.abort();
  }, [repo]);

  const toggleEventsPaused = React.useCallback(() => {
    setEventsPaused((paused) => {
      if (paused) {
        // Resume: merge the buffer newest-first without a visual explosion.
        setBuffered((buffer) => {
          if (buffer.length > 0) {
            setEvents((current) => [...buffer, ...current].slice(0, EVENT_CAP));
          }
          return [];
        });
        announce("استؤنف سجل الأحداث");
        return false;
      }
      announce("أوقف سجل الأحداث مؤقتًا");
      return true;
    });
  }, [announce]);

  const dismissEvent = React.useCallback((id: string) => {
    setDismissed((current) => new Set(current).add(id));
  }, []);

  const visibleEvents = React.useMemo(
    () => events.filter((e) => !dismissed.has(e.id)),
    [events, dismissed],
  );

  // ── Notifications ─────────────────────────────────────────────────────
  const unreadCount = React.useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );
  const markNotificationsRead = React.useCallback(() => {
    setNotifications((current) => current.map((n) => (n.read ? n : { ...n, read: true })));
  }, []);

  // ── Overlays ──────────────────────────────────────────────────────────
  const openDrawer = React.useCallback((topic: DrawerTopic) => {
    setOverlay({ kind: "drawer", topic });
  }, []);
  const openWorkflow = React.useCallback((workflow: WorkflowId) => {
    setOverlay({ kind: "modal", workflow });
  }, []);
  const closeOverlay = React.useCallback(() => setOverlay(null), []);

  // ── Simulated sensitive execution (audited, idempotent) ───────────────
  const runCommand = React.useCallback(
    async (
      actionId: CockpitActionId,
      payload?: Readonly<Record<string, string | number | boolean>>,
    ): Promise<ActionResult | null> => {
      const idempotencyKey = `${actionId}:${JSON.stringify(payload ?? {})}`;
      if (commandKeysRef.current.has(idempotencyKey)) {
        toast.info("الإجراء نفسه قيد التنفيذ بالفعل");
        return null;
      }
      commandKeysRef.current.add(idempotencyKey);
      setCommandBusy(true);
      try {
        emitCockpitAction(actionId);
        const result = await repo.executeAction({ actionId, payload });
        setEvents((current) =>
          [
            {
              id: `act-${result.correlationId}`,
              time: "الآن",
              severity: "success" as const,
              titleAr: "سُجل إجراء معتمد",
              detailAr: `${actionId} · ${result.correlationId}`,
              source: "بوابة الموافقات",
            },
            ...current,
          ].slice(0, EVENT_CAP),
        );
        return result;
      } catch (error) {
        console.error(`[cockpit] action ${actionId} failed`, error);
        toast.error("تعذر تنفيذ الإجراء — أعد المحاولة");
        return null;
      } finally {
        commandKeysRef.current.delete(idempotencyKey);
        setCommandBusy(false);
      }
    },
    [repo],
  );

  // Memoized so a consumer subscribing to only part of the value doesn't
  // re-render on every unrelated tick (e.g. the ~14s event stream). The
  // identity changes only when a field it actually depends on changes.
  const value = React.useMemo<CockpitContextValue>(
    () => ({
      repository: repo,
      snapshot,
      reloadSnapshot,
      selectedRegion,
      selectRegion,
      regionDetail,
      regionLoading,
      mapMode,
      setMapMode,
      level,
      setLevel,
      events: visibleEvents,
      eventsPaused,
      bufferedCount: buffered.length,
      toggleEventsPaused,
      dismissEvent,
      notifications,
      unreadCount,
      markNotificationsRead,
      overlay,
      openDrawer,
      openWorkflow,
      closeOverlay,
      runCommand,
      commandBusy,
      announce,
      liveMessage,
    }),
    [
      repo,
      snapshot,
      reloadSnapshot,
      selectedRegion,
      selectRegion,
      regionDetail,
      regionLoading,
      mapMode,
      setMapMode,
      level,
      setLevel,
      visibleEvents,
      eventsPaused,
      buffered.length,
      toggleEventsPaused,
      dismissEvent,
      notifications,
      unreadCount,
      markNotificationsRead,
      overlay,
      openDrawer,
      openWorkflow,
      closeOverlay,
      runCommand,
      commandBusy,
      announce,
      liveMessage,
    ],
  );

  return <CockpitContext.Provider value={value}>{children}</CockpitContext.Provider>;
}

/** Shared: respect the user's reduced-motion preference (SSR-safe false). */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return reduced;
}
