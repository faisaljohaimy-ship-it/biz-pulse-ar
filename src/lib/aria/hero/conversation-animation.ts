// Conversation Animation Engine — orchestrates gesture accents while ARIA
// speaks. Fires small accents on natural boundaries reported by the
// speech driver (word/sentence). No fake speech: fully driver-owned.

import type { HeroTick } from "./types";
import type { GestureEngine } from "./gesture";

export type ConversationCue = "word" | "sentence" | "pause";

export class ConversationAnimationEngine {
  private queue: { cue: ConversationCue; at: number }[] = [];
  constructor(private readonly gestures: GestureEngine) {}

  cue(cue: ConversationCue, at: number): void {
    this.queue.push({ cue, at });
    if (this.queue.length > 32) this.queue.shift();
  }

  tick(tick: HeroTick): void {
    const drained = this.queue.filter((q) => q.at <= tick.t);
    if (!drained.length) return;
    this.queue = this.queue.filter((q) => q.at > tick.t);
    for (const q of drained) {
      if (q.cue === "sentence") this.gestures.trigger("explain", tick.t);
      else if (q.cue === "word") this.gestures.trigger("accent", tick.t);
      // "pause" intentionally does nothing — silence is the animation.
    }
  }
}
