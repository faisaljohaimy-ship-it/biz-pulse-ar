/**
 * NEXIOS Operating System Runtime — shared contracts (Phase 7).
 *
 * The OS layer sits ABOVE every previous layer: it owns the deterministic
 * boot sequence, module lifecycle, health, snapshots, recovery, telemetry
 * and performance of the whole stack. It composes the frozen Phases 1-6 —
 * it never modifies them and never bypasses their gateways.
 */
export class OsError extends Error {
  constructor(
    readonly area: string,
    message: string,
  ) {
    super(`[os:${area}] ${message}`);
    this.name = "OsError";
  }
}

export type Clock = () => string;

/** Injectable monotonic counter (milliseconds) — tests inject a fixed one. */
export type PerfNow = () => number;

export type OsState =
  | "created"
  | "booting"
  | "ready"
  | "degraded"
  | "shutting_down"
  | "stopped"
  | "failed";

/** Injectable resource probe (memory / storage) — deterministic in tests. */
export type ResourceProbe = () => { usedMb: number; limitMb: number };

export type ResourceStatus = "healthy" | "degraded" | "unhealthy";
