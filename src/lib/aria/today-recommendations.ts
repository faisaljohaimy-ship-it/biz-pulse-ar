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
import type { ExecKpis } from "@/lib/sec-exec-kpis.functions";

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
export function getTodayRecommendations(live?: ExecKpis): readonly AriaRecommendation[] {
  if (live) {
    return [
      {
        id: "incidents",
        tone: live.incidents_critical > 0 ? "rose" : "cyan",
        to: "/sec/incidents",
        textAr:
          live.incidents_critical > 0
            ? `${live.incidents_critical} بلاغ حرج من أصل ${live.incidents_open} بلاغ مفتوح — ابدأ بالحرج.`
            : `${live.incidents_open} بلاغ مفتوح بلا حالات حرجة حالياً — استمر في المتابعة.`,
      },
      {
        id: "maintenance",
        tone: live.wo_open > 0 ? "amber" : "cyan",
        to: "/sec/maintenance",
        textAr: `${live.wo_open} أمر عمل مفتوح، و${live.wo_closed} مغلق — راجع الأولويات المتأخرة.`,
      },
      {
        id: "readiness",
        tone: live.executive_readiness >= 75 ? "cyan" : "amber",
        to: "/sec/kpi",
        textAr: `الجاهزية التنفيذية ${live.executive_readiness}% ومؤشر المخاطر ${live.risk_index}% — المؤشر محسوب من المصادر التشغيلية الحية.`,
      },
    ];
  }
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
