/**
 * Executive Event Narrator — pure, deterministic mapping from a real
 * `enterprise_events` row to a bilingual human explanation with agent
 * attribution. NEVER fabricates state: every field comes from the row.
 *
 * Used by the Mission Control Executive Narrator panel and by the TTS
 * speech queue. Pure function — safe on client and server.
 */
import type { EnterpriseEventRow } from "@/lib/events/useEventStream";

export type NarratorTone = "info" | "success" | "warn" | "critical";

export type NarratorAgent =
  | "aria"
  | "incident_commander"
  | "risk_analyst"
  | "compliance_auditor"
  | "cctv_intelligence"
  | "visitor_intelligence"
  | "patrol_intelligence"
  | "emergency_coordinator"
  | "asset_intelligence"
  | "permit_authority"
  | "executive_reporter"
  | "digital_twin"
  | "predictive_analytics"
  | "knowledge_ai"
  | "workflow_supervisor";

export interface NarratorLine {
  id: string;
  ts: number;
  topic: string;
  status: string;
  severity: string;
  tone: NarratorTone;
  agent: NarratorAgent;
  agent_name_ar: string;
  agent_name_en: string;
  /** Plain-language explanation for an executive — Arabic. */
  text_ar: string;
  /** Plain-language explanation for an executive — English. */
  text_en: string;
  /** Optional one-line "why this matters" follow-up. */
  reason_ar?: string;
  reason_en?: string;
  correlation_id: string | null;
}

const AGENT_NAMES: Record<NarratorAgent, { ar: string; en: string }> = {
  aria:                  { ar: "آريا التنفيذية",      en: "ARIA Executive" },
  incident_commander:    { ar: "قائد الحوادث",       en: "Incident Commander" },
  risk_analyst:          { ar: "محلل المخاطر",       en: "Risk Analyst" },
  compliance_auditor:    { ar: "مدقق الامتثال",      en: "Compliance Auditor" },
  cctv_intelligence:     { ar: "ذكاء الكاميرات",     en: "CCTV Intelligence" },
  visitor_intelligence:  { ar: "ذكاء الزوار",        en: "Visitor Intelligence" },
  patrol_intelligence:   { ar: "ذكاء الدوريات",      en: "Patrol Intelligence" },
  emergency_coordinator: { ar: "منسق الطوارئ",       en: "Emergency Coordinator" },
  asset_intelligence:    { ar: "ذكاء الأصول",        en: "Asset Intelligence" },
  permit_authority:      { ar: "سلطة التصاريح",      en: "Permit Authority" },
  executive_reporter:    { ar: "كاتب التقارير التنفيذي", en: "Executive Reporter" },
  digital_twin:          { ar: "التوأم الرقمي",       en: "Digital Twin" },
  predictive_analytics:  { ar: "التحليلات التنبؤية",  en: "Predictive Analytics" },
  knowledge_ai:          { ar: "ذكاء المعرفة",        en: "Knowledge AI" },
  workflow_supervisor:   { ar: "مشرف سير العمل",      en: "Workflow Supervisor" },
};

/* ── Topic → agent routing (deterministic; based on real topic prefix) ── */
function routeAgent(topic: string, subjectType: string | null): NarratorAgent {
  const t = topic.toLowerCase();
  if (t.startsWith("agent.") || t.includes("aria")) return "aria";
  if (t.startsWith("incident") || subjectType === "incident") return "incident_commander";
  if (t.startsWith("risk")) return "risk_analyst";
  if (t.startsWith("compliance") || t.startsWith("audit")) return "compliance_auditor";
  if (t.startsWith("cctv") || t.startsWith("camera")) return "cctv_intelligence";
  if (t.startsWith("visitor")) return "visitor_intelligence";
  if (t.startsWith("patrol")) return "patrol_intelligence";
  if (t.startsWith("emergency") || t.startsWith("evacuation")) return "emergency_coordinator";
  if (t.startsWith("asset") || t.startsWith("work_order") || subjectType === "work_order") return "asset_intelligence";
  if (t.startsWith("permit")) return "permit_authority";
  if (t.startsWith("report") || t.startsWith("brief")) return "executive_reporter";
  if (t.startsWith("twin")) return "digital_twin";
  if (t.startsWith("forecast") || t.startsWith("predict")) return "predictive_analytics";
  if (t.startsWith("kb") || t.startsWith("knowledge")) return "knowledge_ai";
  if (t.startsWith("workflow") || t.startsWith("tool") || t.startsWith("step")) return "workflow_supervisor";
  return "aria";
}

function toneFor(severity: string, status: string): NarratorTone {
  const s = severity.toLowerCase();
  const st = status.toLowerCase();
  if (s === "critical" || st === "failed" || st === "error") return "critical";
  if (s === "high" || s === "warn" || s === "warning") return "warn";
  if (st === "succeeded" || st === "completed" || st === "ok") return "success";
  return "info";
}

/* ── Topic verb dictionary (technical → human, AR/EN) ── */
const TOPIC_VERBS: Array<{ match: RegExp; ar: string; en: string }> = [
  { match: /incident\.created/i,         ar: "بلاغ حادث جديد",                en: "New incident reported" },
  { match: /incident\.updated/i,         ar: "تحديث حالة الحادث",            en: "Incident updated" },
  { match: /incident\.closed/i,          ar: "إغلاق حادث",                    en: "Incident closed" },
  { match: /patrol\.started/i,           ar: "بدء دورية",                     en: "Patrol started" },
  { match: /patrol\.completed/i,         ar: "إكمال دورية",                   en: "Patrol completed" },
  { match: /permit\.requested/i,         ar: "طلب تصريح جديد",                en: "Permit requested" },
  { match: /permit\.approved/i,          ar: "اعتماد تصريح",                  en: "Permit approved" },
  { match: /permit\.expired/i,           ar: "انتهاء تصريح",                  en: "Permit expired" },
  { match: /visitor\.checkin/i,          ar: "دخول زائر",                     en: "Visitor checked in" },
  { match: /visitor\.checkout/i,         ar: "خروج زائر",                     en: "Visitor checked out" },
  { match: /workflow\.run\.started/i,    ar: "بدء تنفيذ سير عمل",            en: "Workflow execution started" },
  { match: /workflow\.run\.succeeded/i,  ar: "اكتمال سير العمل بنجاح",        en: "Workflow completed successfully" },
  { match: /workflow\.run\.failed/i,     ar: "فشل تنفيذ سير عمل",            en: "Workflow execution failed" },
  { match: /workflow\.step/i,            ar: "خطوة في سير العمل",            en: "Workflow step update" },
  { match: /tool\.executed/i,            ar: "تنفيذ أداة تشغيلية",            en: "Operational tool executed" },
  { match: /tool\.failed/i,              ar: "فشل تنفيذ أداة",                en: "Tool execution failed" },
  { match: /agent\.run\.started/i,       ar: "بدء وكيل تنفيذي",               en: "Agent run started" },
  { match: /agent\.run\.succeeded/i,     ar: "اكتمال تنفيذ وكيل",             en: "Agent run completed" },
  { match: /agent\.run\.failed/i,        ar: "فشل تنفيذ وكيل",                en: "Agent run failed" },
  { match: /report\./i,                  ar: "تحديث تقرير تنفيذي",           en: "Executive report update" },
  { match: /risk\./i,                    ar: "تقييم مخاطر",                   en: "Risk assessment" },
  { match: /compliance\./i,              ar: "تدقيق امتثال",                  en: "Compliance check" },
];

function humaniseTopic(topic: string): { ar: string; en: string } {
  for (const v of TOPIC_VERBS) if (v.match.test(topic)) return { ar: v.ar, en: v.en };
  // Fallback: convert "foo.bar.baz" into "Foo bar baz" / Arabic loose translation.
  const en = topic.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return { ar: `حدث تشغيلي: ${en}`, en };
}

function pickSubjectLabel(row: EnterpriseEventRow): { ar: string; en: string } | null {
  if (!row.subject_type) return null;
  const id = row.subject_id ? ` #${row.subject_id.slice(0, 8)}` : "";
  const map: Record<string, { ar: string; en: string }> = {
    incident:   { ar: "حادث",     en: "incident" },
    patrol:     { ar: "دورية",    en: "patrol" },
    permit:     { ar: "تصريح",    en: "permit" },
    visitor:    { ar: "زائر",     en: "visitor" },
    work_order: { ar: "أمر عمل",  en: "work order" },
    site:       { ar: "موقع",     en: "site" },
    asset:      { ar: "أصل",      en: "asset" },
    agent:      { ar: "وكيل",     en: "agent" },
    workflow:   { ar: "سير عمل", en: "workflow" },
  };
  const m = map[row.subject_type] ?? { ar: row.subject_type, en: row.subject_type };
  return { ar: `${m.ar}${id}`, en: `${m.en}${id}` };
}

function severityLabel(s: string): { ar: string; en: string } {
  const map: Record<string, { ar: string; en: string }> = {
    critical: { ar: "حرجة",   en: "critical" },
    high:     { ar: "عالية",  en: "high" },
    medium:   { ar: "متوسطة", en: "medium" },
    low:      { ar: "منخفضة", en: "low" },
    info:     { ar: "إعلامي", en: "info" },
  };
  return map[s.toLowerCase()] ?? { ar: s, en: s };
}

/**
 * Pure mapper: enterprise_events row → executive narration line.
 * Faithful to the row — no synthesis, no fabricated numbers.
 */
export function narrateEvent(row: EnterpriseEventRow): NarratorLine {
  const agent = routeAgent(row.topic, row.subject_type);
  const verb = humaniseTopic(row.topic);
  const subject = pickSubjectLabel(row);
  const sev = severityLabel(row.severity);
  const tone = toneFor(row.severity, row.status);

  const subjectAr = subject ? ` على ${subject.ar}` : "";
  const subjectEn = subject ? ` on ${subject.en}` : "";

  const text_ar = `${verb.ar}${subjectAr} — الأهمية: ${sev.ar}.`;
  const text_en = `${verb.en}${subjectEn} — severity: ${sev.en}.`;

  const reason_ar = row.error
    ? `سبب الفشل المسجّل: ${row.error}`
    : row.duration_ms != null
      ? `زمن المعالجة: ${row.duration_ms} مللي ثانية.`
      : undefined;
  const reason_en = row.error
    ? `Recorded failure cause: ${row.error}`
    : row.duration_ms != null
      ? `Processed in ${row.duration_ms} ms.`
      : undefined;

  return {
    id: row.id,
    ts: new Date(row.occurred_at).getTime(),
    topic: row.topic,
    status: row.status,
    severity: row.severity,
    tone,
    agent,
    agent_name_ar: AGENT_NAMES[agent].ar,
    agent_name_en: AGENT_NAMES[agent].en,
    text_ar,
    text_en,
    reason_ar,
    reason_en,
    correlation_id: row.correlation_id,
  };
}

/** Map a batch (most-recent-first preserved). */
export function narrateEvents(rows: EnterpriseEventRow[]): NarratorLine[] {
  return rows.map(narrateEvent);
}
