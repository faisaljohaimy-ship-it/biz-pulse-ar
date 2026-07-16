/**
 * Specialist-agent speech adapters.
 *
 * Every production agent id resolves deterministically to one of the canonical
 * Digital Human specialists. Speech never replaces execution: these helpers
 * only narrate verified state or the real summary returned by an agent run.
 */
import type { BridgeAgent } from "@/lib/exec/bridge.functions";
import { ARIA, findHuman, type DigitalHumanSpec } from "@/lib/digital-humans/registry";
import { speakAs, type SpeakHandle } from "@/lib/digital-humans/aria-voice";

type RuntimeAgentIdentity = {
  id: string;
  name: string;
  metadata?: unknown;
};

function human(id: string): DigitalHumanSpec {
  return findHuman(id) ?? ARIA;
}

/** Maps every runtime definition — including legacy ids — to a voice persona. */
export function resolveAgentSpeaker(agent: RuntimeAgentIdentity): DigitalHumanSpec {
  const metadata =
    agent.metadata && typeof agent.metadata === "object"
      ? (agent.metadata as { category?: unknown; department?: unknown })
      : {};
  const haystack = [agent.id, agent.name, metadata.category, metadata.department]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  if (/\baria\b/.test(haystack)) return ARIA;
  if (/incident|triage/.test(haystack)) return human("incident_commander");
  if (/emergency|crisis/.test(haystack)) return human("emergency_coordinator");
  if (/compliance|audit|governance/.test(haystack)) return human("compliance_auditor");
  if (/transport|visitor|access/.test(haystack)) return human("visitor_intelligence");
  if (/knowledge|rag|document/.test(haystack)) return human("knowledge_ai");
  if (/report|brief|notification|communication/.test(haystack)) {
    return human("executive_reporter");
  }
  if (/twin|asset|maintenance/.test(haystack)) return human("digital_twin");
  if (/patrol|operations|workflow|automation/.test(haystack)) return human("patrol_commander");
  if (/cctv|camera|industrial.security|threat/.test(haystack)) {
    return human("cctv_intelligence");
  }
  if (/risk|kpi|analytic|intelligence/.test(haystack)) return human("risk_intelligence");
  return human("risk_intelligence");
}

const STATUS_AR: Record<string, string> = {
  idle: "في وضع الاستعداد",
  ready: "جاهز للعمل",
  running: "أنفّذ المهمة الحالية",
  queued: "بانتظار دوري في التنفيذ",
  monitoring: "أراقب البيانات الحية",
  waiting: "بانتظار مدخلات",
  thinking: "أحلّل الوضع الراهن",
  searching: "أبحث في السجلات",
  analyzing: "أجري تحليلاً تفصيلياً",
  consulting: "أتشاور مع الوكلاء",
  executing: "أنفّذ المهمة الحالية",
  speaking: "أتحدث الآن",
  succeeded: "أكملت المهمة بنجاح",
  completed: "أكملت مهمتي الأخيرة",
  failed: "تعذر إكمال المهمة",
  escalated: "أصعّد الحدث للقيادة",
  warning: "ألاحظ مؤشر تحذير",
  error: "أعالج خطأً تشغيلياً",
  recovery: "في وضع الاسترداد",
  disabled: "متوقف حالياً",
  offline: "غير متصل حالياً",
};

const STATUS_EN: Record<string, string> = {
  idle: "on standby",
  ready: "ready for work",
  running: "executing the current task",
  queued: "waiting in the execution queue",
  monitoring: "monitoring live telemetry",
  waiting: "awaiting input",
  thinking: "analyzing the current situation",
  searching: "searching the records",
  analyzing: "running a detailed analysis",
  consulting: "consulting other agents",
  executing: "executing the current task",
  speaking: "speaking now",
  succeeded: "completed the task successfully",
  completed: "completed my latest task",
  failed: "could not complete the task",
  escalated: "escalating an event",
  warning: "tracking a warning indicator",
  error: "recovering from an operational error",
  recovery: "in recovery mode",
  disabled: "currently disabled",
  offline: "currently offline",
};

function cleanForSpeech(value: string | null | undefined, max = 900): string {
  return (value ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[*_#`>|{}[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/** Speaks the real result or current state of any runtime agent. */
export function speakRuntimeAgent(
  agent: RuntimeAgentIdentity,
  options: {
    ar: boolean;
    status: string;
    summary?: string | null;
    goal?: string | null;
  },
): SpeakHandle {
  const speaker = resolveAgentSpeaker(agent);
  const statusAr = STATUS_AR[options.status] ?? "أتابع العمل التشغيلي";
  const statusEn = STATUS_EN[options.status] ?? "continuing operational work";
  const detail = cleanForSpeech(options.summary || options.goal);
  const text = options.ar
    ? `أنا ${speaker.name_ar}، ${speaker.title_ar}. ${statusAr}.${detail ? ` النتيجة: ${detail}` : ""}`
    : `I am ${speaker.name_en}, ${speaker.title_en}. I am ${statusEn}.${detail ? ` Result: ${detail}` : ""}`;

  return speakAs(speaker, { text, lang: options.ar ? "ar" : "en" });
}

/** Tap-to-speak adapter used by the live Executive Bridge agent ring. */
export function speakAgent(agent: BridgeAgent, ar: boolean): void {
  const speaker = resolveAgentSpeaker({ id: agent.id, name: agent.name });
  const pct = Math.round(agent.confidence * 100);
  const statusAr = STATUS_AR[agent.status] ?? "في وضع المراقبة";
  const statusEn = STATUS_EN[agent.status] ?? "monitoring";
  const task = cleanForSpeech(agent.current_task, 500);
  const last = cleanForSpeech(agent.last_run_status, 120);
  const text = ar
    ? `أنا ${speaker.name_ar}، ${speaker.title_ar}. ${statusAr} بثقة ${pct} بالمئة.${task ? ` مهمتي الحالية: ${task}.` : ""}${last ? ` آخر تنفيذ: ${last}.` : ""}`
    : `I am ${speaker.name_en}, ${speaker.title_en}. I am ${statusEn} with ${pct} percent confidence.${task ? ` Current task: ${task}.` : ""}${last ? ` Last run: ${last}.` : ""}`;

  void speakAs(speaker, { text, lang: ar ? "ar" : "en" }).promise.catch((error) => {
    console.warn("[agent-voice] tap narration failed", error);
  });
}
