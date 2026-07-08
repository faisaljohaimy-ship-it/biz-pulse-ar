/**
 * AvatarTelemetry — bounded ring buffer of avatar state transitions and
 * presence snapshots. Read-only diagnostic surface for HUD/devtools.
 * No LLM calls, no persistence, no network I/O.
 */
import { avatarStateManager, type AvatarEvent } from "./avatar-state-manager";
import { executivePresence, type PresenceSnapshot } from "./executive-presence";

const MAX = 64;

export interface TelemetrySnapshot {
  running: boolean;
  events: readonly AvatarEvent[];
  lastPresence: PresenceSnapshot | null;
  presenceSamples: readonly PresenceSnapshot[];
}

class AvatarTelemetry {
  private events: AvatarEvent[] = [];
  private samples: PresenceSnapshot[] = [];
  private lastPresence: PresenceSnapshot | null = null;
  private unsubState: (() => void) | null = null;
  private unsubPresence: (() => void) | null = null;
  private running = false;

  start(): void {
    if (this.running) return;
    this.running = true;
    this.unsubState = avatarStateManager.subscribe((ev) => {
      this.events.push(ev);
      if (this.events.length > MAX) this.events.splice(0, this.events.length - MAX);
    });
    this.unsubPresence = executivePresence.subscribe((snap) => {
      this.lastPresence = snap;
      this.samples.push(snap);
      if (this.samples.length > MAX) this.samples.splice(0, this.samples.length - MAX);
    });
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    this.unsubState?.();
    this.unsubState = null;
    this.unsubPresence?.();
    this.unsubPresence = null;
    this.events = [];
    this.samples = [];
    this.lastPresence = null;
  }

  snapshot(): TelemetrySnapshot {
    return {
      running: this.running,
      events: this.events.slice(),
      lastPresence: this.lastPresence,
      presenceSamples: this.samples.slice(),
    };
  }
}

export const avatarTelemetry = new AvatarTelemetry();
