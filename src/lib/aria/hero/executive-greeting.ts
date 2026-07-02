// Executive Greeting Engine — pairs the visual welcome with a textual
// greeting slot. It never fabricates content: it exposes a "pending greeting"
// signal that the UI/copilot fills with a real briefing.

import type { HeroAudit } from "./audit";

export interface ExecutiveGreetingSlot {
  readonly requestedAt: number;
  fulfilled: boolean;
}

export class ExecutiveGreetingEngine {
  private slot: ExecutiveGreetingSlot | null = null;
  constructor(private readonly audit: HeroAudit) {}

  request(now: number): ExecutiveGreetingSlot {
    if (this.slot) return this.slot;
    this.slot = { requestedAt: now, fulfilled: false };
    this.audit.append({ at: now, kind: "greeting", from: "empty", to: "requested" });
    return this.slot;
  }

  fulfill(now: number): void {
    if (!this.slot || this.slot.fulfilled) return;
    this.slot.fulfilled = true;
    this.audit.append({ at: now, kind: "greeting", from: "requested", to: "fulfilled" });
  }

  clear(now: number): void {
    if (!this.slot) return;
    this.audit.append({ at: now, kind: "greeting", from: this.slot.fulfilled ? "fulfilled" : "requested", to: "cleared" });
    this.slot = null;
  }

  current(): ExecutiveGreetingSlot | null { return this.slot; }
}
