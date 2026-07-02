// Hero action catalog — one row per hero button.
// Actions are deterministic descriptors; execution runs through the
// conversation bridge so every button is a real ARIA turn.
import type { HeroButtonId } from "./types";

export interface HeroActionSpec {
  readonly id: HeroButtonId;
  readonly label_ar: string;
  readonly label_en: string;
  readonly prompt_ar: string;
  readonly prompt_en: string;
  readonly requiresVoice: boolean;
  readonly kind: "voice" | "brief" | "demo" | "risks" | "summary" | "report";
}

export const HERO_ACTIONS: Readonly<Record<HeroButtonId, HeroActionSpec>> = {
  talk_to_aria: {
    id: "talk_to_aria",
    label_ar: "تحدّث مع أريا",
    label_en: "Talk to ARIA",
    prompt_ar: "ابدأي المحادثة التنفيذية. استمعي إلى المستخدم ثم أجيبي باحترافية.",
    prompt_en: "Start the executive conversation. Listen, then respond concisely.",
    requiresVoice: true,
    kind: "voice",
  },
  executive_briefing: {
    id: "executive_briefing",
    label_ar: "الإحاطة التنفيذية",
    label_en: "Executive Briefing",
    prompt_ar: "قدّمي إحاطة تنفيذية موجزة لهذا اليوم بالأدلة.",
    prompt_en: "Deliver a concise, evidence-backed executive briefing for today.",
    requiresVoice: false,
    kind: "brief",
  },
  start_demo: {
    id: "start_demo",
    label_ar: "ابدأ العرض التوضيحي",
    label_en: "Start Demo",
    prompt_ar: "شغّلي سيناريو العرض التنفيذي من 06:00 إلى 18:00.",
    prompt_en: "Launch the executive day scenario from 06:00 to 18:00.",
    requiresVoice: false,
    kind: "demo",
  },
  show_risks: {
    id: "show_risks",
    label_ar: "اعرضي المخاطر",
    label_en: "Show Risks",
    prompt_ar: "استعرضي أعلى المخاطر المفتوحة مع مستوى التأثير والمالك.",
    prompt_en: "Surface the top open risks with impact level and owner.",
    requiresVoice: false,
    kind: "risks",
  },
  show_today_summary: {
    id: "show_today_summary",
    label_ar: "ملخّص اليوم",
    label_en: "Today's Summary",
    prompt_ar: "قدّمي ملخّص العمليات لهذا اليوم بمؤشرات KPI فعلية.",
    prompt_en: "Provide today's operations summary using live KPIs.",
    requiresVoice: false,
    kind: "summary",
  },
  generate_report: {
    id: "generate_report",
    label_ar: "أنشئ تقريراً",
    label_en: "Generate Report",
    prompt_ar: "أنشئي تقريراً تنفيذياً قابلاً للنشر مع الأدلة.",
    prompt_en: "Generate a publishable executive report with evidence.",
    requiresVoice: false,
    kind: "report",
  },
} as const;

export function heroActionsList(): readonly HeroActionSpec[] {
  return Object.values(HERO_ACTIONS);
}
