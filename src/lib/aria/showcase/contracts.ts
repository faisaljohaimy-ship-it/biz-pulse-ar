import type { ShowcaseStep, ShowcaseKpi, VoiceCue, HighlightDirective } from "./types";

export const SHOWCASE_CONTRACTS = {
  INTRO_MAX_MS: 6_000,
  STEP_MIN_MS: 3_000,
  STEP_MAX_MS: 45_000,
  MAX_STEPS: 24,
  MAX_HIGHLIGHTS_PER_STEP: 3,
  MAX_KPIS: 12,
} as const;

export function assertStep(s: ShowcaseStep): void {
  if (!s.id || !s.title_ar || !s.title_en) throw new Error("step missing identity");
  if (
    s.durationMs < SHOWCASE_CONTRACTS.STEP_MIN_MS ||
    s.durationMs > SHOWCASE_CONTRACTS.STEP_MAX_MS
  ) {
    throw new Error(`step duration out of range: ${s.id}`);
  }
}

export function assertKpi(k: ShowcaseKpi): void {
  if (!k.key) throw new Error("kpi missing key");
  if (k.value !== null && !Number.isFinite(k.value)) throw new Error(`kpi ${k.key} value invalid`);
  // No fake KPIs: if value present, source must be live or sample.
  if (k.value !== null && k.source === "unknown") {
    throw new Error(`kpi ${k.key} has value but unknown source`);
  }
}

export function assertVoiceCue(c: VoiceCue): void {
  if (!c.text || c.text.trim().length === 0) throw new Error("empty voice cue");
}

export function assertHighlight(h: HighlightDirective): void {
  if (!h.selector) throw new Error("highlight missing selector");
  if (h.durationMs < 400 || h.durationMs > 8_000)
    throw new Error("highlight duration out of range");
}
