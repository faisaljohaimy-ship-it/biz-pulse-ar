// Hero metrics.
import type { HeroButtonId } from "./types";

type Kind = "button_ok" | "button_error" | "greet" | "interrupt";

interface Counters {
  button_ok: number;
  button_error: number;
  greet: number;
  interrupt: number;
  perButton: Partial<Record<HeroButtonId, { ok: number; error: number }>>;
}

const M: Counters = { button_ok: 0, button_error: 0, greet: 0, interrupt: 0, perButton: {} };

export function recordHeroMetric(kind: Kind, buttonId?: HeroButtonId): void {
  M[kind]++;
  if (buttonId) {
    const row = M.perButton[buttonId] ?? { ok: 0, error: 0 };
    if (kind === "button_ok") row.ok++;
    if (kind === "button_error") row.error++;
    M.perButton[buttonId] = row;
  }
}

export interface HeroMetricsSnapshot {
  readonly button_ok: number;
  readonly button_error: number;
  readonly greet: number;
  readonly interrupt: number;
  readonly perButton: Readonly<Partial<Record<HeroButtonId, { ok: number; error: number }>>>;
}

export function heroMetricsSnapshot(): HeroMetricsSnapshot {
  return { ...M, perButton: { ...M.perButton } };
}
