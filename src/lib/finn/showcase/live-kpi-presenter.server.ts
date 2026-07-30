import type { ShowcaseKpi } from "./types";
import { assertKpi, SHOWCASE_CONTRACTS } from "./contracts";

export interface KpiSource {
  readonly key: string;
  readonly label_ar: string;
  readonly label_en: string;
  readonly value?: number | null;
  readonly unit?: string;
  readonly source?: "live" | "sample";
  readonly asOf?: string;
}

// Never fabricates numbers: missing value stays null with source "unknown".
export function presentKpis(sources: readonly KpiSource[]): readonly ShowcaseKpi[] {
  const trimmed = sources.slice(0, SHOWCASE_CONTRACTS.MAX_KPIS);
  const out: ShowcaseKpi[] = trimmed.map((s) => {
    const hasValue = typeof s.value === "number" && Number.isFinite(s.value);
    const kpi: ShowcaseKpi = {
      key: s.key,
      label_ar: s.label_ar,
      label_en: s.label_en,
      value: hasValue ? (s.value as number) : null,
      unit: s.unit,
      source: hasValue ? (s.source ?? "live") : "unknown",
      asOf: s.asOf,
    };
    assertKpi(kpi);
    return kpi;
  });
  return out;
}

export function formatKpiCaption(kpi: ShowcaseKpi, lang: "ar" | "en"): string {
  const label = lang === "ar" ? kpi.label_ar : kpi.label_en;
  if (kpi.value === null) {
    return lang === "ar" ? `${label}: غير متاح` : `${label}: unavailable`;
  }
  const unit = kpi.unit ? ` ${kpi.unit}` : "";
  const sourceTag = kpi.source === "sample" ? (lang === "ar" ? " [عيّنة]" : " [SAMPLE]") : "";
  return `${label}: ${kpi.value}${unit}${sourceTag}`;
}
