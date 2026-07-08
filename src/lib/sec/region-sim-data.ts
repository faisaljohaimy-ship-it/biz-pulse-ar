/**
 * Region simulation data — deterministic demo dataset per region.
 * Used by /sec pages when a region is active so the UI reflects
 * the switch instantly (circles, sections, KPIs).
 *
 * NOTE: Every KPI derived from this dataset is a demo simulation
 * and must be labelled "عرض توضيحي · محاكاة" in the UI.
 */

import type { RegionId } from "@/lib/regions";

export interface SimCircle {
  id: string;
  name_ar: string;
  name_en: string;
  manager: string;
  staff_count: number;
  sites_count: number;
  lat?: number;
  lng?: number;
}

export interface SimSection {
  id: string;
  code: "support" | "maintenance" | "projects";
  name_ar: string;
  name_en: string;
  head: string;
  staff_count: number;
}

export interface SimCounts {
  sites: number;
  incidents_open: number;
  incidents_critical: number;
  patrols_active: number;
  visitors_inside: number;
  permits_active: number;
  cctv_new: number;
  assets_offline: number;
  contractors_active: number;
  cameras_online: number;
  cameras_total: number;
  gates_online: number;
  gates_total: number;
  readiness: number;
  safety: number;
  risk: number;
}

export interface RegionSim {
  code: RegionId;
  circles: SimCircle[];
  sections: SimSection[];
  counts: SimCounts;
}

const CIRCLE_TEMPLATES: Record<
  RegionId,
  Array<{ ar: string; en: string; manager: string; lat: number; lng: number }>
> = {
  central: [
    {
      ar: "دائرة الرياض الصناعية",
      en: "Riyadh Industrial Circle",
      manager: "م. فهد العتيبي",
      lat: 24.7136,
      lng: 46.6753,
    },
    {
      ar: "دائرة الخرج",
      en: "Al-Kharj Circle",
      manager: "م. سعد القحطاني",
      lat: 24.1554,
      lng: 47.3346,
    },
    { ar: "دائرة سدير", en: "Sudair Circle", manager: "م. ناصر الحربي", lat: 25.6667, lng: 46.1 },
    {
      ar: "دائرة الوشم",
      en: "Al-Washm Circle",
      manager: "م. عبدالله الشمري",
      lat: 25.5,
      lng: 45.5,
    },
  ],
  western: [
    {
      ar: "دائرة ينبع الصناعية",
      en: "Yanbu Industrial Circle",
      manager: "م. خالد الزهراني",
      lat: 24.0895,
      lng: 38.0618,
    },
    {
      ar: "دائرة رابغ",
      en: "Rabigh Circle",
      manager: "م. ماجد المالكي",
      lat: 22.7987,
      lng: 39.0349,
    },
    {
      ar: "دائرة جدة",
      en: "Jeddah Circle",
      manager: "م. طلال الغامدي",
      lat: 21.4858,
      lng: 39.1925,
    },
    {
      ar: "دائرة مكة",
      en: "Makkah Circle",
      manager: "م. سلطان الحارثي",
      lat: 21.3891,
      lng: 39.8579,
    },
    {
      ar: "دائرة المدينة",
      en: "Madinah Circle",
      manager: "م. فيصل الأنصاري",
      lat: 24.5247,
      lng: 39.5692,
    },
  ],
  eastern: [
    {
      ar: "دائرة الجبيل الصناعية",
      en: "Jubail Industrial Circle",
      manager: "م. عبدالعزيز الدوسري",
      lat: 27.0046,
      lng: 49.6461,
    },
    {
      ar: "دائرة الدمام",
      en: "Dammam Circle",
      manager: "م. بندر العجمي",
      lat: 26.4207,
      lng: 50.0888,
    },
    {
      ar: "دائرة الظهران",
      en: "Dhahran Circle",
      manager: "م. مشعل السبيعي",
      lat: 26.2361,
      lng: 50.0393,
    },
    {
      ar: "دائرة الخبر",
      en: "Khobar Circle",
      manager: "م. راشد المطيري",
      lat: 26.2794,
      lng: 50.2083,
    },
    {
      ar: "دائرة رأس تنورة",
      en: "Ras Tanura Circle",
      manager: "م. عبدالرحمن الشهري",
      lat: 26.6438,
      lng: 50.158,
    },
    {
      ar: "دائرة الأحساء",
      en: "Al-Ahsa Circle",
      manager: "م. حمد القرني",
      lat: 25.3833,
      lng: 49.5833,
    },
  ],
  southern: [
    {
      ar: "دائرة جازان الصناعية",
      en: "Jazan Industrial Circle",
      manager: "م. علي الشهراني",
      lat: 16.8892,
      lng: 42.5511,
    },
    { ar: "دائرة أبها", en: "Abha Circle", manager: "م. يحيى عسيري", lat: 18.2164, lng: 42.5053 },
    {
      ar: "دائرة نجران",
      en: "Najran Circle",
      manager: "م. مبارك اليامي",
      lat: 17.4924,
      lng: 44.1277,
    },
    { ar: "دائرة بيشة", en: "Bisha Circle", manager: "م. سالم البقمي", lat: 20.0, lng: 42.6 },
  ],
};

const SECTION_TEMPLATES: Array<{ code: SimSection["code"]; ar: string; en: string }> = [
  { code: "support", ar: "قسم الإسناد الأمني", en: "Security Support" },
  { code: "maintenance", ar: "قسم الصيانة", en: "Maintenance" },
  { code: "projects", ar: "قسم المشاريع", en: "Projects" },
];

const HEADS: Record<RegionId, [string, string, string]> = {
  central: ["م. تركي القحطاني", "م. عايض الدوسري", "م. مازن الشمري"],
  western: ["م. وليد الحجيلي", "م. أنس الصاعدي", "م. حسام باخشوين"],
  eastern: ["م. يوسف العتيبي", "م. زياد الغامدي", "م. طارق آل مقبل"],
  southern: ["م. جابر عسيري", "م. مسفر آل زايد", "م. مانع القحطاني"],
};

// Deterministic-per-region KPI factors so switching feels distinct but stable.
const KPI_TEMPLATES: Record<RegionId, SimCounts> = {
  central: {
    sites: 22,
    incidents_open: 7,
    incidents_critical: 1,
    patrols_active: 14,
    visitors_inside: 63,
    permits_active: 41,
    cctv_new: 3,
    assets_offline: 4,
    contractors_active: 18,
    cameras_online: 412,
    cameras_total: 430,
    gates_online: 58,
    gates_total: 60,
    readiness: 94,
    safety: 96,
    risk: 12,
  },
  western: {
    sites: 28,
    incidents_open: 9,
    incidents_critical: 2,
    patrols_active: 19,
    visitors_inside: 88,
    permits_active: 55,
    cctv_new: 4,
    assets_offline: 6,
    contractors_active: 24,
    cameras_online: 532,
    cameras_total: 560,
    gates_online: 74,
    gates_total: 78,
    readiness: 92,
    safety: 95,
    risk: 14,
  },
  eastern: {
    sites: 34,
    incidents_open: 12,
    incidents_critical: 3,
    patrols_active: 26,
    visitors_inside: 121,
    permits_active: 78,
    cctv_new: 6,
    assets_offline: 9,
    contractors_active: 33,
    cameras_online: 704,
    cameras_total: 740,
    gates_online: 96,
    gates_total: 100,
    readiness: 90,
    safety: 93,
    risk: 17,
  },
  southern: {
    sites: 16,
    incidents_open: 4,
    incidents_critical: 0,
    patrols_active: 10,
    visitors_inside: 42,
    permits_active: 28,
    cctv_new: 1,
    assets_offline: 2,
    contractors_active: 12,
    cameras_online: 288,
    cameras_total: 300,
    gates_online: 40,
    gates_total: 42,
    readiness: 96,
    safety: 97,
    risk: 9,
  },
};

const STAFF_PER_CIRCLE: Record<RegionId, number> = {
  central: 46,
  western: 52,
  eastern: 61,
  southern: 38,
};
const SITES_PER_CIRCLE: Record<RegionId, number> = {
  central: 5,
  western: 6,
  eastern: 6,
  southern: 4,
};

export function regionSim(code: RegionId): RegionSim {
  const circles: SimCircle[] = CIRCLE_TEMPLATES[code].map((c, i) => ({
    id: `${code}-c${i + 1}`,
    name_ar: c.ar,
    name_en: c.en,
    manager: c.manager,
    staff_count: STAFF_PER_CIRCLE[code] + i * 3,
    sites_count: SITES_PER_CIRCLE[code] + (i % 2),
    lat: c.lat,
    lng: c.lng,
  }));

  const [h1, h2, h3] = HEADS[code];
  const base = STAFF_PER_CIRCLE[code];
  const sections: SimSection[] = SECTION_TEMPLATES.map((s, i) => ({
    id: `${code}-s${i + 1}`,
    code: s.code,
    name_ar: s.ar,
    name_en: s.en,
    head: [h1, h2, h3][i],
    staff_count: base * (i === 0 ? 3 : i === 1 ? 2 : 1) + i * 4,
  }));

  return { code, circles, sections, counts: KPI_TEMPLATES[code] };
}
