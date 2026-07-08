/**
 * speakAgent — single source of truth for tap-to-speak agent interaction.
 *
 * Composes a bilingual self-introduction line for the selected agent
 * (identity + current task + confidence + last run) and pushes it onto
 * the AriaDock queue using the agent's own voice profile via the global
 * `window.aria.speak({ speaker })` bridge. Works across desktop, tablet,
 * and mobile because AriaDock itself is responsive.
 */
import type { BridgeAgent } from "@/lib/exec/bridge.functions";
import { findHuman, ARIA, type DigitalHumanSpec } from "@/lib/digital-humans/registry";

function pickPersona(name: string): DigitalHumanSpec {
  const n = name.toLowerCase();
  const id = n.includes("incident")
    ? "incident_commander"
    : n.includes("risk")
      ? "risk_intelligence"
      : n.includes("compliance") || n.includes("audit")
        ? "compliance_auditor"
        : n.includes("cctv") || n.includes("camera")
          ? "cctv_intelligence"
          : n.includes("patrol")
            ? "patrol_intelligence"
            : n.includes("emergency")
              ? "emergency_coordinator"
              : n.includes("visitor")
                ? "visitor_intelligence"
                : n.includes("knowledge") || n.includes("kb")
                  ? "knowledge_ai"
                  : n.includes("report") || n.includes("brief")
                    ? "executive_reporter"
                    : n.includes("twin") || n.includes("asset")
                      ? "digital_twin"
                      : "risk_intelligence";
  return findHuman(id) ?? ARIA;
}

const STATUS_AR: Record<string, string> = {
  idle: "في وضع الاستعداد",
  monitoring: "أراقب البيانات الحية",
  waiting: "بانتظار مدخلات",
  thinking: "أحلّل الوضع الراهن",
  searching: "أبحث في السجلات",
  analyzing: "أجري تحليلًا تفصيليًا",
  consulting: "أتشاور مع الوكلاء",
  executing: "أنفّذ المهمة الحالية",
  speaking: "أتحدث الآن",
  completed: "أكملت مهمتي الأخيرة",
  escalated: "أصعّد الحدث للقيادة",
  warning: "ألاحظ مؤشر تحذير",
  error: "أعالج خطأً تشغيليًا",
  recovery: "في وضع الاسترداد",
  offline: "غير متصل حاليًا",
};
const STATUS_EN: Record<string, string> = {
  idle: "on standby",
  monitoring: "monitoring live telemetry",
  waiting: "awaiting input",
  thinking: "analyzing the current situation",
  searching: "searching the records",
  analyzing: "running a detailed analysis",
  consulting: "consulting other agents",
  executing: "executing the current task",
  speaking: "speaking now",
  completed: "have just completed my last task",
  escalated: "escalating an event",
  warning: "tracking a warning indicator",
  error: "recovering from an operational error",
  recovery: "in recovery mode",
  offline: "currently offline",
};

export function speakAgent(agent: BridgeAgent, ar: boolean): void {
  const w = window as unknown as {
    aria?: {
      speak: (turn: {
        id?: string;
        text_ar: string;
        text_en: string;
        speaker?: DigitalHumanSpec;
      }) => void;
    };
  };
  if (!w.aria?.speak) return;

  const speaker = pickPersona(agent.name);
  const pct = Math.round(agent.confidence * 100);
  const statusAr = STATUS_AR[agent.status] ?? "في وضع المراقبة";
  const statusEn = STATUS_EN[agent.status] ?? "monitoring";

  const taskAr = agent.current_task
    ? `مهمتي الحالية: ${agent.current_task}.`
    : "لا توجد مهمة مفتوحة في هذه اللحظة.";
  const taskEn = agent.current_task
    ? `Current task: ${agent.current_task}.`
    : "No open task right now.";

  const lastAr = agent.last_run_status
    ? `آخر تنفيذ: ${agent.last_run_status === "completed" ? "اكتمل بنجاح" : agent.last_run_status}.`
    : "";
  const lastEn = agent.last_run_status ? `Last run: ${agent.last_run_status}.` : "";

  const text_ar =
    `أنا ${speaker.name_ar}، ${speaker.title_ar}. ${statusAr} بثقة ${pct} بالمئة. ${taskAr} ${lastAr}`.trim();
  const text_en =
    `I am ${speaker.name_en}, ${speaker.title_en}. I am ${statusEn} with ${pct} percent confidence. ${taskEn} ${lastEn}`.trim();

  w.aria.speak({ id: `agent-tap-${agent.id}-${Date.now()}`, text_ar, text_en, speaker });
}
