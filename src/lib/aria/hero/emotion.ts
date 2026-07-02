// Emotion Engine — deterministic mapping from presence + explicit hints to Emotion.
// Never fabricates emotion: only expresses what a driver explicitly signals.

import type { HeroAudit } from "./audit";
import type { Emotion, PresenceMode } from "./types";
import type { HeroStateSynchronizer } from "./state-synchronizer";

export class EmotionEngine {
  private emotion: Emotion = "neutral";
  private hint: Emotion | null = null;

  constructor(
    private readonly sync: HeroStateSynchronizer,
    private readonly audit: HeroAudit,
  ) {}

  setHint(hint: Emotion | null, now: number): void {
    if (this.hint === hint) return;
    this.hint = hint;
    this.recompute(now, "hint");
  }

  onPresence(mode: PresenceMode, now: number): void {
    this.recompute(now, `presence:${mode}`);
  }

  current(): Emotion { return this.emotion; }

  private recompute(now: number, detail: string): void {
    const derived: Emotion = this.hint
      ?? this.derive(this.sync.get().presence);
    if (derived === this.emotion) return;
    const prev = this.emotion;
    this.emotion = derived;
    this.sync.patch({ emotion: derived });
    this.audit.append({ at: now, kind: "emotion", from: prev, to: derived, detail });
  }

  private derive(mode: PresenceMode): Emotion {
    switch (mode) {
      case "listening": return "attentive";
      case "thinking": return "focused";
      case "speaking": return "confident";
      case "welcome": return "warm";
      case "paused": return "neutral";
      default: return "neutral";
    }
  }
}
