/**
 * ARIA Executive Personas (Phase 4.4).
 *
 * Route → executive persona resolver. Purely additive: gives the global
 * copilot a role-scoped identity so answers frame themselves as the
 * appropriate advisor (Risk Advisor on /risk, Patrol Commander on
 * /patrol, Executive Analyst on /reports, HR Advisor on /employees,
 * Executive Copilot as default).
 *
 * No UI, no fetches. Pure derivation from the current pathname.
 */
export type AriaPersonaId =
  | "copilot"
  | "risk_advisor"
  | "patrol_commander"
  | "executive_analyst"
  | "hr_advisor"
  | "operations_director"
  | "hajj_commander"
  | "security_advisor";

export interface AriaPersona {
  id: AriaPersonaId;
  label_ar: string;
  label_en: string;
  /** Short mission line spoken in the header + injected into system prompt. */
  mission_ar: string;
  mission_en: string;
  /** Accent glow hex for the persona (kept within the cyan family). */
  glow: string;
}

export const ARIA_PERSONAS: Record<AriaPersonaId, AriaPersona> = {
  copilot: {
    id: "copilot",
    label_ar: "المساعد التنفيذي",
    label_en: "Executive Copilot",
    mission_ar: "أرافقك عبر النظام وأدعم قراراتك التنفيذية.",
    mission_en: "I accompany you across the system and back your executive decisions.",
    glow: "#3AE8FF",
  },
  risk_advisor: {
    id: "risk_advisor",
    label_ar: "مستشار المخاطر",
    label_en: "Risk Advisor",
    mission_ar: "أرصد المخاطر الحرجة وأقترح خطط التخفيف.",
    mission_en: "I track critical risks and recommend mitigation plans.",
    glow: "#FF6A9A",
  },
  patrol_commander: {
    id: "patrol_commander",
    label_ar: "قائد الدوريات",
    label_en: "Patrol Commander",
    mission_ar: "أتابع الدوريات الميدانية والانحرافات لحظياً.",
    mission_en: "I oversee live patrols and field deviations in real time.",
    glow: "#7CFFB8",
  },
  executive_analyst: {
    id: "executive_analyst",
    label_ar: "المحلل التنفيذي",
    label_en: "Executive Analyst",
    mission_ar: "أحلّل التقارير وأستخرج الاتجاهات والفرص.",
    mission_en: "I analyze reports and surface trends and opportunities.",
    glow: "#3AE8FF",
  },
  hr_advisor: {
    id: "hr_advisor",
    label_ar: "مستشار الموارد البشرية",
    label_en: "HR Advisor",
    mission_ar: "أدعم قرارات الموظفين والأداء والامتثال.",
    mission_en: "I support workforce, performance and compliance decisions.",
    glow: "#F5C86B",
  },
  operations_director: {
    id: "operations_director",
    label_ar: "مدير العمليات",
    label_en: "Operations Director",
    mission_ar: "أدير غرفة العمليات وتنسيق الفرق الميدانية.",
    mission_en: "I run the operations center and coordinate field teams.",
    glow: "#00D4FF",
  },
  hajj_commander: {
    id: "hajj_commander",
    label_ar: "قائد منظومة الحج",
    label_en: "Hajj Command",
    mission_ar: "أراقب مؤشرات المشاعر وسلامة الحجاج.",
    mission_en: "I monitor Mashaer KPIs and pilgrim safety.",
    glow: "#3AE8FF",
  },
  security_advisor: {
    id: "security_advisor",
    label_ar: "مستشار الأمن الصناعي",
    label_en: "Industrial Security Advisor",
    mission_ar: "أدعم قرارات الحماية والتصاريح والتفتيش.",
    mission_en: "I back protection, permit and inspection decisions.",
    glow: "#3AE8FF",
  },
};

const PERSONA_ROUTES: Array<{ match: (p: string) => boolean; id: AriaPersonaId }> = [
  { match: (p) => /\/risk(s)?(\/|$)/.test(p), id: "risk_advisor" },
  { match: (p) => /\/patrol/.test(p), id: "patrol_commander" },
  { match: (p) => /\/(exec(utive)?[-]?reports?|reports?)(\/|$)/.test(p), id: "executive_analyst" },
  { match: (p) => /\/(employees|hr|workforce)(\/|$)/.test(p), id: "hr_advisor" },
  { match: (p) => /\/hajj/.test(p), id: "hajj_commander" },
  { match: (p) => /\/(operations|command|mission-control)/.test(p), id: "operations_director" },
  { match: (p) => /\/sec(\/|$)/.test(p), id: "security_advisor" },
];

export function resolvePersona(pathname: string): AriaPersona {
  const match = PERSONA_ROUTES.find((r) => r.match(pathname));
  return ARIA_PERSONAS[match?.id ?? "copilot"];
}
