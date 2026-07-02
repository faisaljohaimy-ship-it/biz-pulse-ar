import type { HighlightDirective } from "./types";
import { assertHighlight, SHOWCASE_CONTRACTS } from "./contracts";

export interface HighlightRequest {
  readonly selector: string;
  readonly ring?: "soft" | "focused" | "critical";
  readonly labelAr?: string;
  readonly labelEn?: string;
  readonly durationMs?: number;
}

export function planHighlights(reqs: readonly HighlightRequest[]): readonly HighlightDirective[] {
  const trimmed = reqs.slice(0, SHOWCASE_CONTRACTS.MAX_HIGHLIGHTS_PER_STEP);
  return trimmed.map((r) => {
    const h: HighlightDirective = {
      selector: r.selector,
      ring: r.ring ?? "focused",
      labelAr: r.labelAr,
      labelEn: r.labelEn,
      durationMs: Math.min(8_000, Math.max(400, r.durationMs ?? 2_400)),
    };
    assertHighlight(h);
    return h;
  });
}
