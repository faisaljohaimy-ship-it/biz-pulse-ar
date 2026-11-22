import type { Locale } from "@/lib/i18n";
import type { SecurityDecisionDemoState } from "./security-decision-demo";
import type { SecurityDecisionScenario } from "./security-decision-scenarios";

const entities: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};
const escape = (value: string) => value.replace(/[&<>"']/g, (c) => entities[c]);

/** Standalone printable HTML, no scripts, network assets, live data, or operational authority. */
export function buildSecurityDecisionReport(
  demo: SecurityDecisionScenario,
  state: SecurityDecisionDemoState,
  locale: Locale,
  exportedAt = new Date(),
): string {
  if (
    (locale !== "ar" && locale !== "en") ||
    !Number.isSafeInteger(demo.reviewWindowMinutes) ||
    demo.reviewWindowMinutes <= 0 ||
    demo.simulated !== true ||
    demo.source !== "demo_fixture" ||
    demo.evidence.some((entry) => entry.simulated !== true) ||
    state.simulated !== true ||
    state.operationalApproval !== false ||
    state.executedActions.length !== 0
  ) {
    throw new Error("Only non-operational synthetic reports are supported");
  }
  const ar = locale === "ar";
  const t = (a: string, e: string) => escape(ar ? a : e);
  const reviewed = state.stage === "reviewed" || state.stage === "needs_verification";
  const status =
    state.stage === "reviewed"
      ? t("مراجعة محاكاة مكتملة", "Simulated review completed")
      : state.stage === "needs_verification"
        ? t("طلب تحقق في المحاكاة", "Simulated verification requested")
        : t("مسودة غير مراجعة", "Unreviewed draft");
  return `<!doctype html><html lang="${locale}" dir="${ar ? "rtl" : "ltr"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${t("تقرير سديد التنفيذي · محاكاة", "SADEED executive report · simulation")}</title><style>body{font:16px/1.8 system-ui,sans-serif;color:#102b3a;max-width:900px;margin:32px auto;padding:24px}h1,h2{color:#075e50}aside{border:2px solid #a64900;padding:16px;background:#fff7ed}section{margin:24px 0}dt{font-weight:bold}dd{margin:0 0 12px}li{margin:8px 0}footer{border-top:1px solid #aaa;padding-top:16px}@media print{body{margin:0;max-width:none}section{break-inside:avoid}}</style></head><body>
<h1>${t("تقرير سديد التنفيذي", "SADEED executive report")}</h1><aside><strong>${t("محاكاة افتراضية بالكامل · ليس سجل تدقيق تشغيليًا", "Entirely synthetic simulation · not an operational audit record")}</strong><p>${t("لم يُرسل طلب ولم يُنفذ أي إجراء. الاعتماد الحقيقي ما زال مطلوبًا، ولا يثبت هذا التقرير وقوع حادث أو صحة أدلة.", "No request was sent and no action was executed. Actual approval is still required; this report proves neither an incident nor evidence validity.")}</p></aside>
<section><h2>${t("ملخص القرار", "Decision summary")}</h2><dl>
<dt>${t("المرجع والمصدر", "Reference and source")}</dt><dd>${escape(demo.id)} · demo_fixture · simulated=true</dd>
<dt>${t("تاريخ التصدير، وليس وقت حادث", "Export time, not an incident time")}</dt><dd>${escape(exportedAt.toISOString())}</dd>
<dt>${t("الحدث والموقع الافتراضيان", "Fictional event and location")}</dt><dd>${t(demo.eventAr, demo.eventEn)}<br>${t(demo.locationAr, demo.locationEn)}</dd>
<dt>${t("التصنيف التجريبي وأسبابه", "Preset demo risk and rationale")}</dt><dd>${demo.severity === "critical" ? t("حرج", "Critical") : t("مرتفع", "High")} · ${t(demo.severityReasonAr, demo.severityReasonEn)}</dd>
<dt>${t("المسؤول والمهلة الافتراضيان", "Fictional owner and review window")}</dt><dd>${t(demo.ownerAr, demo.ownerEn)} · ${demo.reviewWindowMinutes} ${t("دقيقة من بدء المحاكاة؛ ليست مهلة تشغيلية", "minutes from simulation start; not an operational deadline")}</dd>
<dt>${t("الحالة", "Status")}</dt><dd>${status} · ${t("الاعتماد التشغيلي غير ممنوح", "Operational approval not granted")} · ${t("إجراءات منفذة", "Executed actions")}: 0</dd></dl></section>
<section><h2>${t("الأدلة الافتراضية غير المتحققة", "Unverified synthetic evidence")}</h2><ul>${demo.evidence.map((e) => `<li><strong>${t(e.labelAr, e.labelEn)}</strong>: ${t(e.detailAr, e.detailEn)}</li>`).join("")}</ul></section>
<section><h2>${t("التوصيات والبدائل", "Recommendations and alternatives")}</h2><ol>${(ar ? demo.recommendedActionsAr : demo.recommendedActionsEn).map((a) => `<li>${escape(a)}</li>`).join("")}</ol>${demo.alternatives.map((a) => `<p><strong>${t(a.titleAr, a.titleEn)}</strong>: ${t(a.tradeoffAr, a.tradeoffEn)}</p>`).join("")}</section>
<section><h2>${t("سجل المحاكاة المحلي", "Local simulation journey")}</h2>${state.auditTrail.length ? `<ol>${state.auditTrail.map((e) => `<li>${t(e.detailAr, e.detailEn)}</li>`).join("")}</ol>` : `<p>${t("لم يبدأ السيناريو بعد", "The scenario has not started")}</p>`}</section>
<footer>${reviewed ? t("اكتملت خطوة مراجعة محلية فقط؛ أي فعل مؤثر يحتاج اعتمادًا حقيقيًا خارج العرض.", "Only a local review step was completed; any consequential action needs actual approval outside this demonstration.") : t("تقرير مبدئي؛ لم تكتمل المراجعة المحلية.", "Draft report; the local review is incomplete.")} ${t("القيمة: سياق أوضح، أسباب قابلة للمراجعة، ومسار قرار قابل للتكرار. زمن الاستجابة والعائد التشغيلي لم يُقاسا.", "Value: clearer context, reviewable rationale, and a repeatable decision process. Response-time improvement and operational ROI have not been measured.")}</footer></body></html>`;
}
