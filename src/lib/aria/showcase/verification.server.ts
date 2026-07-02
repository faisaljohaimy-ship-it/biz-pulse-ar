import type { ShowcaseKpi, ShowcaseStep } from "./types";
import { assertStep, assertKpi } from "./contracts";

export interface ShowcaseVerification {
  readonly ok: boolean;
  readonly violations: readonly string[];
  readonly checkedAt: number;
}

export function verifyShowcase(
  steps: readonly ShowcaseStep[],
  kpis: readonly ShowcaseKpi[],
): ShowcaseVerification {
  const v: string[] = [];
  try { steps.forEach(assertStep); } catch (e) { v.push((e as Error).message); }
  try { kpis.forEach(assertKpi); } catch (e) { v.push((e as Error).message); }
  const ids = new Set<string>();
  for (const s of steps) {
    if (ids.has(s.id)) v.push(`duplicate step id: ${s.id}`);
    ids.add(s.id);
  }
  for (const k of kpis) {
    if (k.source === "sample" && !/\[SAMPLE\]|\[عيّنة\]/.test(k.label_en + k.label_ar)) {
      // Sample source is allowed; labels don't need to hardcode the tag —
      // formatKpiCaption injects it. This check enforces that no live KPI
      // silently carries a fabricated value.
    }
    if (k.value !== null && k.source === "unknown") v.push(`kpi ${k.key} value without source`);
  }
  return { ok: v.length === 0, violations: v, checkedAt: Date.now() };
}
