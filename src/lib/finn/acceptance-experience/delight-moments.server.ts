// Delight moments — deterministic, non-noisy micro-cues.
// Emits at most one delight per 30s window per instance.
export type DelightKind = "soft_glow" | "warm_smile" | "gentle_nod" | "subtle_chime";

interface Row {
  lastAt: number;
  count: number;
}
const LAST = new Map<string, Row>();
const COOLDOWN_MS = 30_000;

export interface DelightRequest {
  readonly reason: "first_response" | "positive_feedback" | "task_completed" | "user_returned";
}

export interface DelightDecision {
  readonly emit: boolean;
  readonly kind?: DelightKind;
  readonly reason: string;
}

export function requestDelight(id: string, req: DelightRequest): DelightDecision {
  const now = Date.now();
  const row = LAST.get(id) ?? { lastAt: 0, count: 0 };
  if (now - row.lastAt < COOLDOWN_MS) {
    return { emit: false, reason: "cooldown" };
  }
  const kind: DelightKind =
    req.reason === "first_response"
      ? "warm_smile"
      : req.reason === "positive_feedback"
        ? "soft_glow"
        : req.reason === "task_completed"
          ? "gentle_nod"
          : "subtle_chime";
  row.lastAt = now;
  row.count += 1;
  LAST.set(id, row);
  return { emit: true, kind, reason: req.reason };
}

export function resetDelight(id: string): void {
  LAST.delete(id);
}
