/**
 * Human Explanation Layer — translate raw technical events into
 * executive-friendly bilingual sentences. Pure functions, deterministic.
 * Used by Digital Humans and the Story Engine.
 */

export type HumanExplanation = { ar: string; en: string };

const TOPIC_MAP: Record<string, HumanExplanation> = {
  "sql.read": { ar: "أقرأ سجلات تشغيلية مباشرة.", en: "Reading operational records." },
  "sql.write": { ar: "أُحدّث سجلات العمليات.", en: "Updating operational records." },
  "kb.search": {
    ar: "أراجع الإجراءات الصناعية الرسمية.",
    en: "Reviewing official industrial procedures.",
  },
  "tool.execute": {
    ar: "أنفّذ عملية تشغيلية آمنة.",
    en: "Executing a secure enterprise operation.",
  },
  "tool.executed": { ar: "اكتملت العملية التشغيلية.", en: "Enterprise operation completed." },
  "workflow.execute": { ar: "أطلق سير عمل الطوارئ.", en: "Launching emergency workflow." },
  "workflow.completed": { ar: "اكتمل سير العمل التشغيلي.", en: "Operational workflow completed." },
  "agent.run": { ar: "وكيل تنفيذي يبدأ مهمته.", en: "Specialist agent starting mission." },
  "incident.created": {
    ar: "تم استقبال حادث جديد للتحقق.",
    en: "New incident received for validation.",
  },
  "incident.escalated": {
    ar: "تم تصعيد حادث إلى الإدارة التنفيذية.",
    en: "Incident escalated to executive command.",
  },
  "patrol.checked": {
    ar: "تأكدت من تنفيذ نقطة تفتيش ميدانية.",
    en: "Verified a field checkpoint.",
  },
  "cctv.alert": { ar: "أراجع تنبيه فيديو ذكي.", en: "Reviewing an intelligent video alert." },
  "permit.issued": { ar: "تم إصدار تصريح عمل ساري.", en: "Work permit issued and active." },
  "visitor.checked_in": { ar: "تم تسجيل دخول زائر.", en: "Visitor checked in." },
  "report.published": { ar: "تم نشر إحاطة تنفيذية.", en: "Executive briefing published." },
};

export function humanizeTopic(topic: string | null | undefined): HumanExplanation {
  if (!topic) return { ar: "نشاط تشغيلي.", en: "Operational activity." };
  const exact = TOPIC_MAP[topic];
  if (exact) return exact;
  // graceful fallbacks by prefix
  if (topic.startsWith("sql.")) return TOPIC_MAP["sql.read"];
  if (topic.startsWith("kb.")) return TOPIC_MAP["kb.search"];
  if (topic.startsWith("tool.")) return TOPIC_MAP["tool.execute"];
  if (topic.startsWith("workflow.")) return TOPIC_MAP["workflow.execute"];
  if (topic.startsWith("agent.")) return TOPIC_MAP["agent.run"];
  // last-resort humanization
  const pretty = topic.replace(/[._]/g, " ");
  return { ar: `حدث تشغيلي: ${pretty}.`, en: `Operational event: ${pretty}.` };
}

export function humanizeSeverity(sev: string | null | undefined, ar: boolean): string {
  switch ((sev ?? "").toLowerCase()) {
    case "critical":
      return ar ? "حرج" : "Critical";
    case "high":
      return ar ? "مرتفع" : "High";
    case "medium":
      return ar ? "متوسط" : "Medium";
    case "low":
      return ar ? "منخفض" : "Low";
    default:
      return ar ? "عادي" : "Routine";
  }
}
