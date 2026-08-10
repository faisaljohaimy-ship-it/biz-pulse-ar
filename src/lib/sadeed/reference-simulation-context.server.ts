/**
 * Compact, privacy-safe reference context for public/demo SADEED turns.
 * It is never described as live and never mixes with production rows.
 */
import {
  buildCommandCenterSimulation,
  buildSecOverviewSimulation,
} from "@/lib/exec/showcase-simulation.server";

const REGION_AR: Record<string, string> = {
  central: "الوسطى",
  western: "الغربية",
  eastern: "الشرقية",
  southern: "الجنوبية",
};

export type ReferenceSimulationContext = {
  contextBlock: string;
  observedAt: string;
  dataAvailable: true;
};

export function buildReferenceSimulationContext(now = Date.now()): ReferenceSimulationContext {
  const observedAt = new Date(now).toISOString();
  const overview = buildSecOverviewSimulation(now);
  const command = buildCommandCenterSimulation(now);
  const siteById = new Map(overview.sites.map((site) => [site.id, site.name_ar]));
  const openIncidents = overview.incidents.filter(
    (incident) => incident.status !== "resolved" && incident.status !== "closed",
  );

  const lines = [
    "DATA_MODE: REFERENCE_SIMULATION_ONLY",
    "هذه بيانات محاكاة مرجعية للتجربة وليست حالة إنتاج حية. يجب وسم كل رقم مشتق منها بوضوح، ومنع خلطها بأي بيانات تشغيلية.",
    `observed_at: ${observedAt}`,
    "scope: قطاع الأمن الصناعي — جميع المناطق (الوسطى، الغربية، الشرقية، الجنوبية)",
    "source: [SIM:SEC_OVERVIEW] + [SIM:COMMAND_CENTER]",
    "",
    "## المؤشرات المرجعية",
    `- المواقع التشغيلية: ${overview.counts.sites}`,
    `- البلاغات المفتوحة: ${overview.counts.incidents_open}؛ الحرجة: ${overview.counts.incidents_critical}`,
    `- الدوريات النشطة: ${overview.counts.patrols_active}`,
    `- التصاريح النشطة أو المعتمدة: ${overview.counts.permits_active}`,
    `- الأصول غير المتصلة أو المتدهورة: ${overview.counts.assets_offline}`,
    `- تنبيهات CCTV الجديدة: ${overview.counts.cctv_new}`,
    `- متوسط الامتثال عبر المناطق: ${command.counters.compliance_avg}%`,
    "",
    "## الامتثال والبلاغات حسب المنطقة",
    // المادة ٢٧ — ما لم يُقَس يُقال «لم يُقَس»، ولا يُسرَّب `null` نصًّا إلى
    // فم سَدِيد. المحاكاة المرجعية اليوم تُقيس الحقلين، والحارس لما بعدها.
    ...command.regions.map((region) => {
      // `!== null` لا `> 0`: الصفر قياسٌ (امتثال ٠٪) لا غياب. والفرق يبلغ فم سَدِيد:
      // «امتثال ٠٪» خبرٌ عاجل، و«لم يُقَس» اعتذارٌ عن غياب — ولا يُقالان معًا.
      const compliance = region.compliance_pct !== null ? `${region.compliance_pct}%` : "لم يُقَس";
      const incidents = region.incidents_open ?? "لم يُقَس";
      return `- ${REGION_AR[region.region_id] ?? region.region_id}: امتثال ${compliance}؛ بلاغات مفتوحة ${incidents}؛ حالة ${region.severity}`;
    }),
    "",
    "## البلاغات المفتوحة ذات الأولوية",
    ...openIncidents.map(
      (incident) =>
        `- ${incident.ref}: ${incident.title_ar}؛ الخطورة ${incident.severity}؛ الحالة ${incident.status}؛ الموقع ${siteById.get(incident.site_id ?? "") ?? "غير محدد"}`,
    ),
  ];

  return { contextBlock: lines.join("\n"), observedAt, dataAvailable: true };
}
