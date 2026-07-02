/**
 * demoDataProvider — pure client-side simulated live-KPI stream for the
 * unauthenticated public session. Zero network. Single shared interval.
 *
 * IMPORTANT: Never feeds authenticated views. Callers gate on auth state.
 */

export interface DemoKpiSnapshot {
  criticalIncidents24h: number;
  mttrMin: number;
  resolutionRate: number;     // percent, 1 decimal
  openWorkOrders: number;
  riskLevelKey: "low" | "elevated" | "critical";
  openIncidents: number;
  preventiveWo: number;
  activeProjects: number;
  updatedAt: number;
  changedKey: keyof Omit<DemoKpiSnapshot, "updatedAt" | "changedKey" | "riskLevelKey"> | "riskLevelKey" | null;
}

const SEED: DemoKpiSnapshot = {
  criticalIncidents24h: 3,
  mttrMin: 18,
  resolutionRate: 96.4,
  openWorkOrders: 42,
  riskLevelKey: "low",
  openIncidents: 7,
  preventiveWo: 128,
  activeProjects: 11,
  updatedAt: Date.now(),
  changedKey: null,
};

const BOUNDS = {
  criticalIncidents24h: [1, 8] as const,
  mttrMin: [12, 26] as const,
  resolutionRate: [94.0, 98.5] as const,
  openWorkOrders: [35, 55] as const,
  openIncidents: [4, 12] as const,
  preventiveWo: [115, 140] as const,
  activeProjects: [8, 14] as const,
};

let state: DemoKpiSnapshot = { ...SEED };
const listeners = new Set<(s: DemoKpiSnapshot) => void>();
let timer: ReturnType<typeof setInterval> | null = null;

const clamp = (v: number, [lo, hi]: readonly [number, number]) => Math.min(hi, Math.max(lo, v));

const NUMERIC_KEYS: Array<keyof typeof BOUNDS> = [
  "criticalIncidents24h",
  "mttrMin",
  "resolutionRate",
  "openWorkOrders",
  "openIncidents",
  "preventiveWo",
  "activeProjects",
];

function drift() {
  const key = NUMERIC_KEYS[Math.floor(Math.random() * NUMERIC_KEYS.length)];
  const delta =
    key === "resolutionRate"
      ? (Math.random() < 0.5 ? -0.2 : 0.2)
      : (Math.random() < 0.5 ? -1 : 1);
  const nextVal = clamp(state[key] + delta, BOUNDS[key]);
  const rounded = key === "resolutionRate" ? Math.round(nextVal * 10) / 10 : Math.round(nextVal);
  const next: DemoKpiSnapshot = {
    ...state,
    [key]: rounded,
    updatedAt: Date.now(),
    changedKey: key,
  };
  // Derive risk level from critical count.
  next.riskLevelKey =
    next.criticalIncidents24h >= 6 ? "critical"
    : next.criticalIncidents24h >= 4 ? "elevated"
    : "low";
  state = next;
  listeners.forEach((fn) => fn(state));

  // Clear changedKey after 300ms so cards can flash briefly.
  setTimeout(() => {
    if (state.changedKey === key) {
      state = { ...state, changedKey: null };
      listeners.forEach((fn) => fn(state));
    }
  }, 320);
}

function ensureTimer() {
  if (timer || typeof window === "undefined") return;
  // 7–10s cadence.
  const tick = () => { drift(); };
  timer = setInterval(tick, 7000 + Math.floor(Math.random() * 3000));
}

function stopTimer() {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
}

export function subscribeDemoData(fn: (s: DemoKpiSnapshot) => void): () => void {
  listeners.add(fn);
  ensureTimer();
  fn(state);
  return () => {
    listeners.delete(fn);
    if (listeners.size === 0) stopTimer();
  };
}

export function getDemoSnapshot(): DemoKpiSnapshot {
  return state;
}

export function riskLevelLabel(key: DemoKpiSnapshot["riskLevelKey"], ar: boolean): string {
  if (key === "critical") return ar ? "حرج" : "Critical";
  if (key === "elevated") return ar ? "متوسط" : "Elevated";
  return ar ? "منخفض" : "Low";
}
