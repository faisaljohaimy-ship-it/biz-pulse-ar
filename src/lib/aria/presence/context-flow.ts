/**
 * ARIA Presence — Context flow (client-safe).
 *
 * Single source of truth for the executive's "mental frame". The
 * copilot feeds it whenever the page / dashboard / filters / selected
 * object change; it only emits `true` when the frame has actually
 * moved AND a debounce interval has elapsed, so ARIA never re-runs on
 * a no-op re-render or widget flood.
 */

export interface ContextFrame {
  path?: string;
  title?: string;
  section?: string;
  siteId?: string;
  departmentId?: string;
  employeeId?: string;
  incidentId?: string;
  meetingId?: string;
  filters?: Record<string, unknown>;
  widgetIds: string[];
  kpiSelections: string[];
}

export function frameSignature(f: ContextFrame): string {
  return JSON.stringify({
    p: f.path ?? "",
    s: f.siteId ?? "",
    d: f.departmentId ?? "",
    e: f.employeeId ?? "",
    i: f.incidentId ?? "",
    m: f.meetingId ?? "",
    f: f.filters ? Object.keys(f.filters).sort().map((k) => [k, f.filters?.[k]]) : [],
    w: [...(f.widgetIds ?? [])].sort(),
    k: [...(f.kpiSelections ?? [])].sort(),
  });
}

interface Snapshot {
  frame: ContextFrame;
  signature: string;
  at: number;
}

let lastSnapshot: Snapshot | null = null;
const MIN_INTERVAL_MS = 350;

export function currentFrame(): ContextFrame | null {
  return lastSnapshot?.frame ?? null;
}

/**
 * Register a new candidate frame. Returns true iff the frame is a real
 * change AND the debounce interval has passed. Callers should only
 * trigger downstream work (evidence prefetch, memory writeback) when
 * this returns true.
 */
export function tryAdvanceFrame(frame: ContextFrame): boolean {
  const sig = frameSignature(frame);
  const now = Date.now();
  if (lastSnapshot && lastSnapshot.signature === sig) return false;
  if (lastSnapshot && now - lastSnapshot.at < MIN_INTERVAL_MS) return false;
  lastSnapshot = { frame, signature: sig, at: now };
  return true;
}

export function resetFrame(): void {
  lastSnapshot = null;
}
