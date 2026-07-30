// Thinking state — deterministic stage tracking during reasoning.
export type ThinkingStage = "planning" | "retrieving" | "reasoning" | "verifying" | "composing";

export interface ThinkingSnapshot {
  readonly active: boolean;
  readonly stage: ThinkingStage | null;
  readonly startedAt: number | null;
  readonly caption_ar?: string;
  readonly caption_en?: string;
}

const CAPTIONS: Record<ThinkingStage, { ar: string; en: string }> = {
  planning: { ar: "أخطط للإجابة…", en: "Planning the answer…" },
  retrieving: { ar: "أراجع البيانات…", en: "Retrieving data…" },
  reasoning: { ar: "أفكر…", en: "Reasoning…" },
  verifying: { ar: "أتحقق من الأدلة…", en: "Verifying evidence…" },
  composing: { ar: "أصيغ الرد…", en: "Composing response…" },
};

export class ThinkingStateStore {
  private snap: ThinkingSnapshot = { active: false, stage: null, startedAt: null };
  private listeners = new Set<(s: ThinkingSnapshot) => void>();

  start(stage: ThinkingStage = "planning"): void {
    const c = CAPTIONS[stage];
    this.snap = { active: true, stage, startedAt: Date.now(), caption_ar: c.ar, caption_en: c.en };
    this.publish();
  }

  advance(stage: ThinkingStage): void {
    if (!this.snap.active) return;
    const c = CAPTIONS[stage];
    this.snap = { ...this.snap, stage, caption_ar: c.ar, caption_en: c.en };
    this.publish();
  }

  stop(): void {
    this.snap = { active: false, stage: null, startedAt: null };
    this.publish();
  }

  get(): ThinkingSnapshot {
    return this.snap;
  }

  subscribe(l: (s: ThinkingSnapshot) => void): () => void {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  }

  private publish(): void {
    for (const l of this.listeners) {
      try {
        l(this.snap);
      } catch {
        /* isolated */
      }
    }
  }
}
