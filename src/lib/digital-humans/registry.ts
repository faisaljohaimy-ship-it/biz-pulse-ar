/**
 * Digital Human Registry — production catalogue of executive AI characters.
 *
 * Each entry is a complete persona spec: identity, department, language,
 * voice, personality, and the deterministic visual palette used by the
 * avatar renderer. Used by the Digital Human Engine and the Mission
 * Control roster. Pure data — safe on client and server.
 */

export type DigitalHumanState =
  | "idle"
  | "listening"
  | "thinking"
  | "searching"
  | "reading"
  | "analyzing"
  | "speaking"
  | "waiting"
  | "completed"
  | "error";

export type DigitalHumanPersonality =
  | "executive"
  | "vigilant"
  | "analytical"
  | "field"
  | "advisory"
  | "narrative"
  | "calm"
  | "decisive";

export type DigitalHumanRole =
  | "primary"
  | "incident"
  | "risk"
  | "compliance"
  | "cctv"
  | "patrol"
  | "emergency"
  | "visitor"
  | "knowledge"
  | "reporter"
  | "twin";

export type AvatarPalette = {
  base: string; // skin / face base
  suit: string; // jacket / uniform
  accent: string; // tie / sash
  ring: string; // border tint (text-* not used; raw hex for SVG)
  glow: string; // ambient glow color (rgba)
  badge: string; // department badge tint
};

export type AvatarFeatures = {
  hairStyle: "short" | "tied" | "buzz" | "wave";
  hairColor: string;
  hasGlasses: boolean;
  hasBeard: boolean;
  hasHeadset: boolean;
  hasHijab: boolean;
};

export interface DigitalHumanSpec {
  id: string;
  role: DigitalHumanRole;
  personality: DigitalHumanPersonality;
  name_ar: string;
  name_en: string;
  department_ar: string;
  department_en: string;
  title_ar: string;
  title_en: string;
  initials: string;
  voiceProfileId: string;
  palette: AvatarPalette;
  features: AvatarFeatures;
  /** Default confidence baseline 0-1 used when no live signal is available. */
  baselineConfidence: number;
}

const PAL = {
  cyan: {
    base: "#F4D9B4",
    suit: "#0A2A44",
    accent: "#00D4FF",
    ring: "#00D4FF",
    glow: "rgba(0,212,255,0.45)",
    badge: "rgba(0,212,255,0.18)",
  },
  rose: {
    base: "#E8C9A6",
    suit: "#1A1322",
    accent: "#FB7185",
    ring: "#FB7185",
    glow: "rgba(251,113,133,0.40)",
    badge: "rgba(251,113,133,0.18)",
  },
  amber: {
    base: "#EFD3A8",
    suit: "#1F1810",
    accent: "#FBBF24",
    ring: "#FBBF24",
    glow: "rgba(251,191,36,0.40)",
    badge: "rgba(251,191,36,0.18)",
  },
  emerald: {
    base: "#E6C9A4",
    suit: "#0F2A22",
    accent: "#34D399",
    ring: "#34D399",
    glow: "rgba(52,211,153,0.40)",
    badge: "rgba(52,211,153,0.18)",
  },
  violet: {
    base: "#E9CDB0",
    suit: "#1A1530",
    accent: "#A78BFA",
    ring: "#A78BFA",
    glow: "rgba(167,139,250,0.40)",
    badge: "rgba(167,139,250,0.18)",
  },
  teal: {
    base: "#EDD0AC",
    suit: "#0E2A2A",
    accent: "#22D3EE",
    ring: "#22D3EE",
    glow: "rgba(34,211,238,0.40)",
    badge: "rgba(34,211,238,0.18)",
  },
  indigo: {
    base: "#E6CCAF",
    suit: "#101630",
    accent: "#818CF8",
    ring: "#818CF8",
    glow: "rgba(129,140,248,0.40)",
    badge: "rgba(129,140,248,0.18)",
  },
  sky: {
    base: "#F0D5B0",
    suit: "#08233A",
    accent: "#7DD3FC",
    ring: "#7DD3FC",
    glow: "rgba(125,211,252,0.40)",
    badge: "rgba(125,211,252,0.18)",
  },
  blush: {
    base: "#EBC9AE",
    suit: "#2A1322",
    accent: "#F472B6",
    ring: "#F472B6",
    glow: "rgba(244,114,182,0.40)",
    badge: "rgba(244,114,182,0.18)",
  },
  steel: {
    base: "#E7CCAA",
    suit: "#1B2230",
    accent: "#94A3B8",
    ring: "#94A3B8",
    glow: "rgba(148,163,184,0.35)",
    badge: "rgba(148,163,184,0.18)",
  },
} as const;

/** Canonical 11 Digital Humans. ARIA is always index 0 (primary). */
export const DIGITAL_HUMANS: DigitalHumanSpec[] = [
  {
    id: "aria",
    role: "primary",
    personality: "executive",
    name_ar: "آريا",
    name_en: "ARIA",
    department_ar: "الذكاء التنفيذي",
    department_en: "Executive Intelligence",
    title_ar: "المساعد التنفيذي الرئيسي",
    title_en: "Chief Executive AI",
    initials: "AI",
    voiceProfileId: "aria",
    palette: PAL.cyan,
    features: {
      hairStyle: "tied",
      hairColor: "#0B1220",
      hasGlasses: false,
      hasBeard: false,
      hasHeadset: true,
      hasHijab: true,
    },
    baselineConfidence: 0.96,
  },
  {
    id: "incident_commander",
    role: "incident",
    personality: "decisive",
    name_ar: "قائد الحوادث",
    name_en: "Incident Commander",
    department_ar: "إدارة الحوادث",
    department_en: "Incident Response",
    title_ar: "قائد عمليات الحوادث",
    title_en: "Incident Operations Lead",
    initials: "IC",
    voiceProfileId: "incident",
    palette: PAL.rose,
    features: {
      hairStyle: "short",
      hairColor: "#0F172A",
      hasGlasses: false,
      hasBeard: true,
      hasHeadset: true,
      hasHijab: false,
    },
    baselineConfidence: 0.92,
  },
  {
    id: "risk_intelligence",
    role: "risk",
    personality: "analytical",
    name_ar: "ذكاء المخاطر",
    name_en: "Risk Intelligence",
    department_ar: "تحليل المخاطر",
    department_en: "Risk Analytics",
    title_ar: "محلل المخاطر التشغيلية",
    title_en: "Operational Risk Analyst",
    initials: "RI",
    voiceProfileId: "risk",
    palette: PAL.amber,
    features: {
      hairStyle: "short",
      hairColor: "#1E293B",
      hasGlasses: true,
      hasBeard: false,
      hasHeadset: false,
      hasHijab: false,
    },
    baselineConfidence: 0.89,
  },
  {
    id: "compliance_auditor",
    role: "compliance",
    personality: "advisory",
    name_ar: "مدقق الامتثال",
    name_en: "Compliance Auditor",
    department_ar: "الامتثال والحوكمة",
    department_en: "Compliance & Governance",
    title_ar: "مدقق السياسات الصناعية",
    title_en: "Industrial Policy Auditor",
    initials: "CA",
    voiceProfileId: "compliance",
    palette: PAL.violet,
    features: {
      hairStyle: "tied",
      hairColor: "#1F2937",
      hasGlasses: true,
      hasBeard: false,
      hasHeadset: false,
      hasHijab: true,
    },
    baselineConfidence: 0.94,
  },
  {
    id: "cctv_intelligence",
    role: "cctv",
    personality: "vigilant",
    name_ar: "ذكاء الكاميرات",
    name_en: "CCTV Intelligence",
    department_ar: "مراقبة الفيديو",
    department_en: "Video Surveillance",
    title_ar: "محلل تنبيهات الكاميرات",
    title_en: "Visual Alerts Analyst",
    initials: "CV",
    voiceProfileId: "cctv",
    palette: PAL.teal,
    features: {
      hairStyle: "buzz",
      hairColor: "#0B1220",
      hasGlasses: false,
      hasBeard: true,
      hasHeadset: true,
      hasHijab: false,
    },
    baselineConfidence: 0.9,
  },
  {
    id: "patrol_commander",
    role: "patrol",
    personality: "field",
    name_ar: "قائد الدوريات",
    name_en: "Patrol Commander",
    department_ar: "العمليات الميدانية",
    department_en: "Field Operations",
    title_ar: "قائد الفرق الميدانية",
    title_en: "Field Teams Lead",
    initials: "PT",
    voiceProfileId: "patrol",
    palette: PAL.emerald,
    features: {
      hairStyle: "short",
      hairColor: "#0F172A",
      hasGlasses: false,
      hasBeard: true,
      hasHeadset: true,
      hasHijab: false,
    },
    baselineConfidence: 0.91,
  },
  {
    id: "emergency_coordinator",
    role: "emergency",
    personality: "decisive",
    name_ar: "منسق الطوارئ",
    name_en: "Emergency Coordinator",
    department_ar: "استجابة الطوارئ",
    department_en: "Emergency Response",
    title_ar: "منسق الاستجابة للأزمات",
    title_en: "Crisis Response Coordinator",
    initials: "ER",
    voiceProfileId: "emergency",
    palette: PAL.rose,
    features: {
      hairStyle: "short",
      hairColor: "#1E293B",
      hasGlasses: false,
      hasBeard: false,
      hasHeadset: true,
      hasHijab: false,
    },
    baselineConfidence: 0.93,
  },
  {
    id: "visitor_intelligence",
    role: "visitor",
    personality: "advisory",
    name_ar: "ذكاء الزوار",
    name_en: "Visitor Intelligence",
    department_ar: "إدارة الزوار",
    department_en: "Visitor Management",
    title_ar: "محلل دخول الزوار",
    title_en: "Visitor Flow Analyst",
    initials: "VI",
    voiceProfileId: "visitor",
    palette: PAL.blush,
    features: {
      hairStyle: "tied",
      hairColor: "#1F2937",
      hasGlasses: false,
      hasBeard: false,
      hasHeadset: false,
      hasHijab: true,
    },
    baselineConfidence: 0.88,
  },
  {
    id: "knowledge_ai",
    role: "knowledge",
    personality: "advisory",
    name_ar: "ذكاء المعرفة",
    name_en: "Knowledge AI",
    department_ar: "قاعدة المعرفة الصناعية",
    department_en: "Industrial Knowledge Base",
    title_ar: "أمين الإجراءات الصناعية",
    title_en: "Industrial Procedures Custodian",
    initials: "KB",
    voiceProfileId: "knowledge",
    palette: PAL.indigo,
    features: {
      hairStyle: "wave",
      hairColor: "#111827",
      hasGlasses: true,
      hasBeard: false,
      hasHeadset: false,
      hasHijab: false,
    },
    baselineConfidence: 0.95,
  },
  {
    id: "executive_reporter",
    role: "reporter",
    personality: "narrative",
    name_ar: "المراسل التنفيذي",
    name_en: "Executive Reporter",
    department_ar: "التقارير التنفيذية",
    department_en: "Executive Reporting",
    title_ar: "كاتب الإحاطات التنفيذية",
    title_en: "Executive Briefings Author",
    initials: "ER",
    voiceProfileId: "reporting",
    palette: PAL.sky,
    features: {
      hairStyle: "short",
      hairColor: "#0F172A",
      hasGlasses: true,
      hasBeard: false,
      hasHeadset: false,
      hasHijab: false,
    },
    baselineConfidence: 0.93,
  },
  {
    id: "digital_twin",
    role: "twin",
    personality: "analytical",
    name_ar: "التوأم الرقمي",
    name_en: "Digital Twin",
    department_ar: "النمذجة التشغيلية",
    department_en: "Operational Modeling",
    title_ar: "محاكي البيئة الصناعية",
    title_en: "Industrial Environment Simulator",
    initials: "DT",
    voiceProfileId: "twin",
    palette: PAL.steel,
    features: {
      hairStyle: "buzz",
      hairColor: "#0B1220",
      hasGlasses: false,
      hasBeard: false,
      hasHeadset: true,
      hasHijab: false,
    },
    baselineConfidence: 0.9,
  },
];

export const ARIA: DigitalHumanSpec = DIGITAL_HUMANS[0];

export const SPECIALISTS: DigitalHumanSpec[] = DIGITAL_HUMANS.slice(1);

export function findHuman(id: string): DigitalHumanSpec | undefined {
  return DIGITAL_HUMANS.find((h) => h.id === id);
}
