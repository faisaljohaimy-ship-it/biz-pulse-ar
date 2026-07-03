/**
 * AttentionEngine — tracks what the avatar is currently "attending to":
 * the user (camera), a UI element (explain target), or an environmental
 * signal (alert). Deterministic; consumed by EyeEngine + HeadEngine.
 */
export type AttentionTarget =
  | { kind: "camera" }
  | { kind: "ui"; x: number; y: number; label?: string }
  | { kind: "away" };

class AttentionEngine {
  private target: AttentionTarget = { kind: "camera" };
  private updatedAt = 0;

  focusCamera(): void { this.target = { kind: "camera" }; this.updatedAt = Date.now(); }
  focusUi(x: number, y: number, label?: string): void {
    this.target = { kind: "ui", x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)), label };
    this.updatedAt = Date.now();
  }
  lookAway(): void { this.target = { kind: "away" }; this.updatedAt = Date.now(); }

  current(): AttentionTarget { return this.target; }
  age(nowMs: number = Date.now()): number { return nowMs - this.updatedAt; }
}

export const attentionEngine = new AttentionEngine();
