/**
 * ARIA KPI anomaly detection — deterministic, fixture-derived (Phase 5).
 *
 * Scans the SAME simulation snapshot the dashboard reads (`regionSim`) and
 * flags any region whose metric deviates from the four-region peer baseline
 * beyond a graceful threshold. No network, no external key, no randomness —
 * every finding traces to the fixtures and is honestly badged «محاكاة»
 * (constitution art. 11 + 13.5). When live `sec_*` telemetry is wired, this is
 * the single seam to swap the source; the detection logic stays identical.
 */
import { REGIONS } from "@/lib/regions";
import { regionSim } from "@/lib/sec/region-sim-data";
import type { SimCounts } from "@/lib/sec/region-sim-data";

export type AnomalySeverity = "warning" | "critical";

export interface Anomaly {
  readonly key: string;
  readonly regionId: string;
  readonly regionAr: string;
  readonly metricAr: string;
  readonly value: number;
  readonly baseline: number;
  readonly severity: AnomalySeverity;
  readonly summaryAr: string;
  readonly to: string;
}

type Direction = "higher-worse" | "lower-worse";

interface MetricDef {
  readonly field: keyof SimCounts;
  readonly ar: string;
  readonly dir: Direction;
  readonly to: string;
  readonly unit?: string;
}

// Which KPIs to watch, their "bad" direction, and the module to jump to.
const METRICS: readonly MetricDef[] = [
  { field: "incidents_open", ar: "البلاغات المفتوحة", dir: "higher-worse", to: "/sec/incidents" },
  {
    field: "incidents_critical",
    ar: "البلاغات الحرجة",
    dir: "higher-worse",
    to: "/sec/incidents",
  },
  { field: "cctv_new", ar: "تنبيهات الكاميرات", dir: "higher-worse", to: "/sec/cctv" },
  { field: "assets_offline", ar: "أصول متوقفة", dir: "higher-worse", to: "/sec/assets" },
  { field: "risk", ar: "مؤشر المخاطر", dir: "higher-worse", to: "/risk", unit: "%" },
  { field: "readiness", ar: "الجاهزية", dir: "lower-worse", to: "/sec/kpi", unit: "%" },
  { field: "safety", ar: "الامتثال", dir: "lower-worse", to: "/sec/kpi", unit: "%" },
];

const round1 = (n: number) => Math.round(n * 10) / 10;

export function detectAnomalies(): readonly Anomaly[] {
  const rows = REGIONS.map((r) => ({ id: r.id, ar: r.shortAr, c: regionSim(r.id).counts }));
  const out: Anomaly[] = [];

  for (const m of METRICS) {
    const values = rows.map((r) => Number(r.c[m.field]));
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    if (mean <= 0) continue;

    for (const r of rows) {
      const v = Number(r.c[m.field]);
      let severity: AnomalySeverity | null = null;

      if (m.dir === "higher-worse") {
        if (v >= mean * 1.8 && v >= mean + 1) severity = "critical";
        else if (v >= mean * 1.4 && v >= mean + 1) severity = "warning";
      } else {
        // lower-worse: flag when meaningfully below the peer mean.
        const gap = mean - v;
        if (gap >= mean * 0.06) severity = "critical";
        else if (gap >= Math.max(2, mean * 0.03)) severity = "warning";
      }

      if (!severity) continue;

      const u = m.unit ?? "";
      const dirWord = m.dir === "higher-worse" ? "أعلى" : "أدنى";
      out.push({
        key: `${r.id}:${m.field}`,
        regionId: r.id,
        regionAr: r.ar,
        metricAr: m.ar,
        value: v,
        baseline: round1(mean),
        severity,
        summaryAr: `${m.ar} في ${r.ar} ${v}${u} — ${dirWord} من متوسط المناطق (${round1(mean)}${u}).`,
        to: m.to,
      });
    }
  }

  // Critical first, then by distance from baseline (most extreme on top).
  return out.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "critical" ? -1 : 1;
    return Math.abs(b.value - b.baseline) - Math.abs(a.value - a.baseline);
  });
}
