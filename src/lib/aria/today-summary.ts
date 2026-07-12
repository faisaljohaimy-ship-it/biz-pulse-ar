/**
 * ARIA daily executive summary — a 3-line narrative derived from the SAME
 * simulation fixtures the dashboard reads (Phase 5). Deterministic, no network,
 * no external key. Every figure traces to `regionSim`, so the card is honestly
 * badged «محاكاة» and stays mathematically consistent with the rest of the deck
 * (constitution art. 11 + 13.5: single source of truth).
 */
import { REGIONS } from "@/lib/regions";
import { regionSim } from "@/lib/sec/region-sim-data";

export function getDailySummary(): readonly string[] {
  const per = REGIONS.map((r) => regionSim(r.id).counts);
  const sum = (f: (c: (typeof per)[number]) => number) => per.reduce((a, c) => a + f(c), 0);
  const avg = (f: (c: (typeof per)[number]) => number) => Math.round(sum(f) / per.length);

  const compliance = avg((c) => c.safety);
  const incidents = sum((c) => c.incidents_open);
  const alerts = sum((c) => c.cctv_new);
  const fieldStaff = sum((c) => c.contractors_active + c.patrols_active);
  const operational = per.filter((c) => c.readiness >= 90).length;

  return [
    `الامتثال العام ${compliance}% عبر المناطق الأربع، و${operational} منها بجاهزية عالية.`,
    `${incidents} بلاغاً مفتوحاً و${alerts} تنبيه كاميرات نشط تحت المتابعة، بتغطية ${fieldStaff} فرداً في الميدان.`,
    `أولوية اليوم: مراجعة البلاغات المفتوحة أولاً، ثم إغلاق تدقيق التنبيهات قبل نهاية الوردية.`,
  ];
}
