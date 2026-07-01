/**
 * ARIA Planning Engine (server-only, additive).
 *
 * Turns a raw executive question + detected intent into an ordered,
 * dependency-aware plan of internal steps ARIA will run before it speaks.
 * Deterministic and cheap — no extra LLM hop. The output is injected into
 * the system prompt so the model can align its reasoning with the plan.
 */

import type { AriaIntent } from "./executive-reasoning.server";

export interface PlanStep {
  id: string;
  goal_en: string;
  goal_ar: string;
  tool:
    | "retrieve_incidents"
    | "retrieve_kpis"
    | "retrieve_notifications"
    | "retrieve_risks"
    | "retrieve_work_orders"
    | "scan_insights"
    | "recall_memory"
    | "reason_summary"
    | "recommend"
    | "verify";
  depends_on?: string[];
}

export interface ExecutionPlan {
  intent: AriaIntent;
  steps: PlanStep[];
  block: string;
}

function baseSteps(): PlanStep[] {
  return [
    { id: "S1", tool: "recall_memory", goal_en: "Recall prior context, preferences and past recommendations.", goal_ar: "استرجاع السياق السابق والتفضيلات والتوصيات السابقة." },
    { id: "S2", tool: "scan_insights", goal_en: "Scan operations for risks, drops and bottlenecks.", goal_ar: "مسح العمليات لرصد المخاطر والتراجعات والاختناقات.", depends_on: ["S1"] },
  ];
}

export function buildPlan(intent: AriaIntent): ExecutionPlan {
  const steps: PlanStep[] = baseSteps();
  const add = (s: Omit<PlanStep, "depends_on"> & { depends_on?: string[] }) => steps.push(s);

  switch (intent) {
    case "incident_review":
    case "root_cause":
    case "investigation":
      add({ id: "S3", tool: "retrieve_incidents", goal_en: "Pull recent incidents and correlated notifications.", goal_ar: "جلب الحوادث الأخيرة والتنبيهات المرتبطة.", depends_on: ["S2"] });
      add({ id: "S4", tool: "reason_summary", goal_en: "Cross-reference site, severity and time to isolate root cause.", goal_ar: "الربط بين الموقع والخطورة والزمن لعزل السبب الجذري.", depends_on: ["S3"] });
      add({ id: "S5", tool: "recommend", goal_en: "Recommend 1–3 concrete corrective actions.", goal_ar: "اقتراح ١–٣ إجراءات تصحيحية ملموسة.", depends_on: ["S4"] });
      break;
    case "risk_assessment":
      add({ id: "S3", tool: "retrieve_risks", goal_en: "Retrieve top risks by impact × likelihood.", goal_ar: "استرجاع أعلى المخاطر بالأثر × الاحتمال.", depends_on: ["S2"] });
      add({ id: "S4", tool: "recommend", goal_en: "Recommend mitigation owners and checkpoints.", goal_ar: "اقتراح مالكي التخفيف ونقاط المراجعة.", depends_on: ["S3"] });
      break;
    case "kpi_explanation":
    case "trend_analysis":
    case "comparison":
    case "analysis":
    case "prediction":
      add({ id: "S3", tool: "retrieve_kpis", goal_en: "Retrieve latest KPI snapshot and deltas.", goal_ar: "استرجاع أحدث صورة للمؤشرات والفروقات.", depends_on: ["S2"] });
      add({ id: "S4", tool: "reason_summary", goal_en: "Explain drivers and project the near-term trajectory.", goal_ar: "شرح المسبّبات وتوقّع المسار قريب المدى.", depends_on: ["S3"] });
      break;
    case "operational_status":
    case "executive_summary":
    case "meeting_brief":
    case "decision_support":
    case "recommendation":
      add({ id: "S3", tool: "retrieve_kpis", goal_en: "Pull KPIs, alerts, risks and open work orders.", goal_ar: "جلب المؤشرات والتنبيهات والمخاطر وأوامر العمل المفتوحة.", depends_on: ["S2"] });
      add({ id: "S4", tool: "reason_summary", goal_en: "Compose executive posture across modules.", goal_ar: "صياغة الموقف التنفيذي عبر الوحدات.", depends_on: ["S3"] });
      add({ id: "S5", tool: "recommend", goal_en: "Deliver decision-ready recommendation with next action.", goal_ar: "تقديم توصية جاهزة للقرار مع الإجراء التالي.", depends_on: ["S4"] });
      break;
    default:
      add({ id: "S3", tool: "reason_summary", goal_en: "Answer the executive question grounded in evidence.", goal_ar: "الإجابة على السؤال التنفيذي مستنداً إلى الأدلة.", depends_on: ["S2"] });
  }
  add({ id: "SV", tool: "verify", goal_en: "Verify each claim maps to a cited evidence row.", goal_ar: "التحقق من ارتباط كل ادعاء بصف مصدر مذكور.", depends_on: steps.map((s) => s.id) });

  const block = `# EXECUTION PLAN (${intent})\n${steps
    .map((s) => `- ${s.id} · ${s.tool}${s.depends_on?.length ? ` [after ${s.depends_on.join(",")}]` : ""}: ${s.goal_en}`)
    .join("\n")}`;
  return { intent, steps, block };
}
