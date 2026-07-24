/**
 * Executive KPI Intelligence — deterministic analytics over KPI series.
 *
 * Trend analysis (least-squares slope), anomaly detection (z-score),
 * executive summaries, linear performance prediction, objective tracking and
 * variance analysis. Unknown KPIs are refused (closed world) — no silent
 * empty answers.
 */
import { IntelError, type KpiSample } from "./types";

export type TrendDirection = "rising" | "falling" | "stable";

export class ExecutiveKpiIntelligence {
  private readonly series = new Map<string, KpiSample[]>();

  ingest(sample: KpiSample): void {
    const list = this.series.get(sample.kpiId) ?? [];
    list.push(sample);
    list.sort((a, b) => a.atISO.localeCompare(b.atISO));
    this.series.set(sample.kpiId, list);
  }

  private samplesOf(kpiId: string): readonly KpiSample[] {
    const list = this.series.get(kpiId);
    if (!list || list.length === 0) throw new IntelError("kpi", `unknown KPI "${kpiId}"`);
    return list;
  }

  seriesOf(kpiId: string): readonly KpiSample[] {
    return [...this.samplesOf(kpiId)];
  }

  known(kpiId: string): boolean {
    return (this.series.get(kpiId)?.length ?? 0) > 0;
  }

  /** Least-squares slope over the ordered series. */
  trend(kpiId: string, stableEpsilon = 1e-9): { direction: TrendDirection; slope: number } {
    const values = this.samplesOf(kpiId).map((s) => s.value);
    const n = values.length;
    if (n === 1) return { direction: "stable", slope: 0 };
    const meanX = (n - 1) / 2;
    const meanY = values.reduce((a, b) => a + b, 0) / n;
    let num = 0;
    let den = 0;
    values.forEach((y, x) => {
      num += (x - meanX) * (y - meanY);
      den += (x - meanX) ** 2;
    });
    const slope = den === 0 ? 0 : num / den;
    const direction: TrendDirection =
      Math.abs(slope) <= stableEpsilon ? "stable" : slope > 0 ? "rising" : "falling";
    return { direction, slope: Math.round(slope * 1000) / 1000 };
  }

  /** Z-score anomaly detection; a flat series has no anomalies. */
  anomalies(kpiId: string, zThreshold = 2): readonly KpiSample[] {
    const samples = this.samplesOf(kpiId);
    const values = samples.map((s) => s.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length);
    if (std === 0) return [];
    return samples.filter((s) => Math.abs(s.value - mean) / std >= zThreshold);
  }

  /** Executive summary of one KPI. */
  summarize(kpiId: string): {
    kpiId: string;
    count: number;
    latest: number;
    mean: number;
    min: number;
    max: number;
    direction: TrendDirection;
  } {
    const samples = this.samplesOf(kpiId);
    const values = samples.map((s) => s.value);
    return {
      kpiId,
      count: values.length,
      latest: values[values.length - 1],
      mean: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 1000) / 1000,
      min: Math.min(...values),
      max: Math.max(...values),
      direction: this.trend(kpiId).direction,
    };
  }

  /** Linear extrapolation of the fitted trend line. */
  predict(kpiId: string, steps: number): readonly number[] {
    if (steps < 1) throw new IntelError("kpi", "steps must be >= 1");
    const values = this.samplesOf(kpiId).map((s) => s.value);
    const { slope } = this.trend(kpiId);
    const last = values[values.length - 1];
    return Array.from(
      { length: steps },
      (_, i) => Math.round((last + slope * (i + 1)) * 1000) / 1000,
    );
  }

  /** Objective tracking against a target, direction-aware. */
  trackObjective(
    kpiId: string,
    target: number,
    direction: "at-least" | "at-most" = "at-least",
  ): { current: number; target: number; attainment: number; onTrack: boolean } {
    const samples = this.samplesOf(kpiId);
    const current = samples[samples.length - 1].value;
    const attainment =
      target === 0 ? (current === 0 ? 1 : 0) : Math.round((current / target) * 1000) / 1000;
    const onTrack = direction === "at-least" ? current >= target : current <= target;
    return { current, target, attainment, onTrack };
  }

  /** Variance analysis against a target level. */
  variance(kpiId: string, target: number): { meanDeviation: number; maxDeviation: number } {
    const values = this.samplesOf(kpiId).map((s) => s.value);
    const deviations = values.map((v) => Math.abs(v - target));
    return {
      meanDeviation:
        Math.round((deviations.reduce((a, b) => a + b, 0) / deviations.length) * 1000) / 1000,
      maxDeviation: Math.max(...deviations),
    };
  }
}
