/**
 * ARIA "Today's recommendations" — proactive, deterministic insights derived
 * from the SAME simulation fixtures the dashboard reads (Phase 2 §3). No live
 * network, no external key. Every figure traces to `regionSim` counts, so the
 * card is honestly badged «محاكاة» and stays mathematically consistent with the
 * rest of the deck (constitution art. 11 + 13.5: single source of truth).
 */
import { REGIONS } from "@/lib/regions";
import { REGION_MARKERS } from "@/components/executive/region-markers";
import { regionSim } from "@/lib/sec/region-sim-data";

export type RecoTone = "rose" | "amber" | "cyan";

export interface AriaRecommendation {
  readonly id: string;
  readonly textAr: string;
  readonly tone: RecoTone;
  /** A REAL existing route to act on (constitution art. 6). */
  readonly to: string;
}

const shortName = (id: string): string => REGION_MARKERS.find((m) => m.id === id)?.ar ?? id;

/**
 * Three prioritized recommendations, computed from the region fixtures:
 * most open incidents, lowest compliance, and total pending CCTV alerts.
 */
export function getTodayRecommendations(): readonly AriaRecommendation[] {
  const per = REGIONS.map((r) => ({ id: r.id, c: regionSim(r.id).counts }));

  const worstIncidents = per.reduce((a, b) => (b.c.incidents_open > a.c.incidents_open ? b : a));
  const lowestCompliance = per.reduce((a, b) => (b.c.safety < a.c.safety ? b : a));
  const totalAlerts = per.reduce((s, x) => s + x.c.cctv_new, 0);

  return [
    {
      id: "incidents",
      tone: "rose",
      to: "/sec/incidents",
      textAr: `أعلى البلاغات المفتوحة في المنطقة ${shortName(worstIncidents.id)} (${worstIncidents.c.incidents_open}) — راجعها أولاً.`,
    },
    {
      id: "compliance",
      tone: "amber",
      to: "/sec/kpi",
      textAr: `الامتثال الأدنى في المنطقة ${shortName(lowestCompliance.id)} عند ${lowestCompliance.c.safety}% — يستحق متابعة.`,
    },
    {
      id: "alerts",
      tone: "cyan",
      to: "/sec/cctv",
      textAr: `${totalAlerts} تنبيه كاميرات نشط عبر المناطق بانتظار المراجعة.`,
    },
  ];
}
