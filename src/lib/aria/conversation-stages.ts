/**
 * Executive Conversation Lifecycle — Phase 4.3.
 *
 * Maps *real* request-elapsed time to a human-legible reasoning stage.
 * We never fabricate delays: the stage advances only as latency actually
 * accrues. When the response resolves we jump to `answering` → `done`;
 * if it resolves fast, some stages are skipped entirely (that's fine —
 * it means ARIA reasoned quickly).
 */
export type ConversationStage =
  | "listening"
  | "thinking"
  | "searching"
  | "reasoning"
  | "planning"
  | "answering"
  | "done"
  | "error";

export interface StageDescriptor {
  key: ConversationStage;
  label_en: string;
  label_ar: string;
  narration_en: string;
  narration_ar: string;
  /** Colour token for glow / indicator (Tailwind arbitrary value). */
  glow: string;
}

export const STAGE_DESCRIPTORS: Record<ConversationStage, StageDescriptor> = {
  listening: {
    key: "listening",
    label_en: "Listening",
    label_ar: "الاستماع",
    narration_en: "Listening…",
    narration_ar: "أستمع…",
    glow: "rgba(58,232,255,0.55)",
  },
  thinking: {
    key: "thinking",
    label_en: "Thinking",
    label_ar: "التفكير",
    narration_en: "Analyzing live operational data…",
    narration_ar: "أُحلّل البيانات التشغيلية المباشرة…",
    glow: "rgba(58,232,255,0.85)",
  },
  searching: {
    key: "searching",
    label_en: "Retrieving evidence",
    label_ar: "استرجاع الأدلة",
    narration_en: "Retrieving supporting evidence across incidents, KPIs and reports…",
    narration_ar: "أستحضر الأدلة من البلاغات والمؤشرات والتقارير…",
    glow: "rgba(0,212,255,0.9)",
  },
  reasoning: {
    key: "reasoning",
    label_en: "Reasoning",
    label_ar: "التحليل",
    narration_en: "Cross-referencing risks, ownership and business impact…",
    narration_ar: "أربط المخاطر والمسؤوليات والأثر التشغيلي…",
    glow: "rgba(0,212,255,1)",
  },
  planning: {
    key: "planning",
    label_en: "Planning",
    label_ar: "التخطيط",
    narration_en: "Composing an executive recommendation and next action…",
    narration_ar: "أُصيغ التوصية التنفيذية والإجراء التالي…",
    glow: "rgba(58,232,255,1)",
  },
  answering: {
    key: "answering",
    label_en: "Answering",
    label_ar: "الإجابة",
    narration_en: "Delivering executive summary…",
    narration_ar: "أُقدّم الملخص التنفيذي…",
    glow: "rgba(120,255,240,1)",
  },
  done: {
    key: "done",
    label_en: "Ready",
    label_ar: "جاهزة",
    narration_en: "Awaiting your next directive.",
    narration_ar: "بانتظار توجيهك التالي.",
    glow: "rgba(58,232,255,0.55)",
  },
  error: {
    key: "error",
    label_en: "Interrupted",
    label_ar: "توقفت",
    narration_en: "I couldn't complete that request.",
    narration_ar: "تعذّر إكمال الطلب.",
    glow: "rgba(255,120,140,0.9)",
  },
};

/**
 * Compute stage from *real* elapsed request time (ms). Thresholds are
 * chosen so short answers skip late stages entirely and long answers
 * naturally walk through them.
 */
export function stageFromElapsed(elapsedMs: number): ConversationStage {
  if (elapsedMs < 250) return "listening";
  if (elapsedMs < 1200) return "thinking";
  if (elapsedMs < 2800) return "searching";
  if (elapsedMs < 5000) return "reasoning";
  return "planning";
}

export const CONVERSATION_ORDER: ConversationStage[] = [
  "listening",
  "thinking",
  "searching",
  "reasoning",
  "planning",
  "answering",
  "done",
];
