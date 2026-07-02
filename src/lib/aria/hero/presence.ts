// Presence Engine — governs top-level presence mode transitions.
// Presence is deliberate: no auto-flapping between listening/thinking/speaking;
// external drivers (voice, request, response) request a mode, this engine
// applies interruption-safe transitions with debouncing.

import type { HeroAudit } from "./audit";
import type { PresenceMode } from "./types";
import type { HeroStateSynchronizer } from "./state-synchronizer";

const MIN_HOLD_MS = 180; // debounce jittery drivers

export class PresenceEngine {
  private mode: PresenceMode = "boot";
  private since = 0;
  constructor(
    private readonly sync: HeroStateSynchronizer,
    private readonly audit: HeroAudit,
  ) {}

  current(): PresenceMode { return this.mode; }

  request(next: PresenceMode, now: number, detail?: string): boolean {
    if (next === this.mode) return false;
    if (now - this.since < MIN_HOLD_MS && next !== "paused" && this.mode !== "boot") {
      return false;
    }
    const prev = this.mode;
    this.mode = next;
    this.since = now;
    this.sync.patch({ presence: next });
    this.audit.append({ at: now, kind: "presence", from: prev, to: next, detail });
    return true;
  }
}
