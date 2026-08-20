/**
 * Command-center data model — the four regional panels of the unified SADEED
 * command center (the poster). Values mirror the executive poster and are
 * labelled «محاكاة» in the UI. Every module route is a REAL existing route so
 * every icon is active.
 */
import {
  BarChart3,
  Brain,
  Building,
  Building2,
  Bus,
  Database,
  Factory,
  FolderKanban,
  GraduationCap,
  HeartPulse,
  Leaf,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
  Wind,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { RegionId } from "@/lib/regions";

export interface CCKpi {
  ar: string;
  en: string;
  value: string;
  delta?: string;
  ringPct?: number; // when set, render a mini ring instead of a sparkline
}

export interface CCInitiative {
  ar: string;
  en: string;
  pct: number;
}

export interface CCModule {
  ar: string;
  en: string;
  to: string;
  icon: LucideIcon;
}

/**
 * The FOUR canonical region indicators (owner item 3).
 *
 * Before this, every region card showed a DIFFERENT third metric — western
 * «الموارد», central «إجمالي الإيرادات», eastern «الإنتاج اليومي», southern
 * «المجتمع» — so the four cards could not be read against each other, which is
 * the whole point of putting them side by side. Now all four carry the same
 * four indicators, and each indicator has ONE unified destination across every
 * region, so «إيرادات» always goes to the same place no matter which card you
 * clicked.
 *
 * Values are reference simulation, shown under the existing amber محاكاة badge
 * (Article 12) — they are not presented as live figures.
 */
export const CC_REGION_METRICS = [
  { key: "production", ar: "إنتاج", en: "Production", to: "/operations" },
  { key: "revenue", ar: "إيرادات", en: "Revenue", to: "/sec/reports" },
  { key: "resources", ar: "موارد", en: "Resources", to: "/sec/assets" },
  { key: "community", ar: "مجتمع", en: "Community", to: "/team" },
] as const;

export type CCMetricKey = (typeof CC_REGION_METRICS)[number]["key"];

export interface CCRegionPanel {
  id: RegionId;
  subtitleAr: string;
  subtitleEn: string;
  kpis: CCKpi[];
  /** The four unified indicators — same keys on every region (item 3). */
  metrics: Record<CCMetricKey, string>;
  initiatives: CCInitiative[];
  modules: CCModule[];
}

export const CC_REGIONS: Record<RegionId, CCRegionPanel> = {
  western: {
    id: "western",
    subtitleAr: "إدارة وتشغيل ذكي",
    subtitleEn: "Smart management & operations",
    kpis: [
      { ar: "المشاريع النشطة", en: "Active projects", value: "126", delta: "+12.4%" },
      { ar: "مؤشر الأداء", en: "Performance", value: "94%", delta: "+8.7%", ringPct: 94 },
      { ar: "الموارد", en: "Resources", value: "1,248", delta: "منتج" },
    ],
    // «موارد» keeps western's own existing 1,248 figure.
    metrics: { production: "1.24M", revenue: "84.2M", resources: "1,248", community: "1.9M" },
    initiatives: [
      { ar: "تطوير البنية التحتية", en: "Infrastructure development", pct: 68 },
      { ar: "مشروع التحول الرقمي", en: "Digital transformation", pct: 90 },
      { ar: "تحسين تجربة العملاء", en: "Customer experience", pct: 74 },
      { ar: "رفع الكفاءة التشغيلية", en: "Operational efficiency", pct: 85 },
    ],
    modules: [
      { ar: "إدارة البيانات", en: "Data management", to: "/knowledge", icon: Database },
      { ar: "الفني", en: "Technical", to: "/sec/maintenance", icon: Wrench },
      {
        ar: "منصة عمليات الوكلاء",
        en: "Agent Operations Platform",
        to: "/agents",
        icon: Sparkles,
      },
      { ar: "النقل والخدمات", en: "Transport & services", to: "/sec", icon: Truck },
      { ar: "العقارات", en: "Real estate", to: "/digital-twin", icon: Building2 },
    ],
  },
  central: {
    id: "central",
    subtitleAr: "مركز القيادة التنفيذي",
    subtitleEn: "Executive command center",
    kpis: [
      { ar: "المشاريع النشطة", en: "Active projects", value: "248", delta: "+15.3%" },
      { ar: "مؤشر الأداء", en: "Performance", value: "96%", delta: "+8.7%", ringPct: 96 },
      { ar: "إجمالي الإيرادات", en: "Total revenue", value: "125.6M", delta: "+12.5%" },
    ],
    // «إيرادات» keeps central's own existing 125.6M figure.
    metrics: { production: "0.96M", revenue: "125.6M", resources: "2,104", community: "3.1M" },
    initiatives: [],
    modules: [
      {
        ar: "منصة عمليات الوكلاء",
        en: "Agent Operations Platform",
        to: "/agents",
        icon: Brain,
      },
      { ar: "تحليل البيانات", en: "Data analytics", to: "/sec/kpi", icon: BarChart3 },
      { ar: "الأمن السيبراني", en: "Cybersecurity", to: "/sec", icon: ShieldCheck },
      {
        // كانت تشير إلى /mission-control المحجوب (٢٠٢٦/٠٨/١٢) — والوجهة
        // الصادقة لاسمها أصلًا هي شاشة المشاريع.
        ar: "إدارة المشاريع",
        en: "Project management",
        to: "/sec/projects",
        icon: FolderKanban,
      },
    ],
  },
  eastern: {
    id: "eastern",
    subtitleAr: "طاقة وإنتاج مستدام",
    subtitleEn: "Sustainable energy & production",
    kpis: [
      { ar: "المشاريع النشطة", en: "Active projects", value: "142", delta: "+15.3%" },
      { ar: "مؤشر الأداء", en: "Performance", value: "97%", delta: "+9.2%", ringPct: 97 },
      { ar: "الإنتاج اليومي", en: "Daily output", value: "3.67M", delta: "برميل" },
    ],
    // «إنتاج» keeps eastern's own existing 3.67M figure.
    metrics: { production: "3.67M", revenue: "142.8M", resources: "1,876", community: "1.4M" },
    initiatives: [
      { ar: "تحسين كفاءة الإنتاج", en: "Production efficiency", pct: 92 },
      { ar: "مشاريع الطاقة المتجددة", en: "Renewable energy", pct: 75 },
      { ar: "السلامة والجودة", en: "Safety & quality", pct: 88 },
      { ar: "خفض الانبعاثات", en: "Emissions reduction", pct: 67 },
    ],
    modules: [
      { ar: "إنتاج الطاقة", en: "Energy production", to: "/operations", icon: Zap },
      { ar: "المرافق", en: "Utilities", to: "/sec", icon: Factory },
      // ‏/risk حُجبت و/governance انتقلت إلى /sec/governance (٢٠٢٦/٠٨/١٢) —
      // «السلامة» إلى شاشة ملاحظات السلامة الحيّة، لا إلى مسار يرتدّ للرئيسية.
      { ar: "السلامة", en: "Safety", to: "/sec/safety", icon: ShieldAlert },
      { ar: "الاستدامة", en: "Sustainability", to: "/sec/governance", icon: Leaf },
      { ar: "جودة الهواء", en: "Air quality", to: "/situation-room", icon: Wind },
    ],
  },
  southern: {
    id: "southern",
    subtitleAr: "تنمية مجتمعية وبنية تحتية",
    subtitleEn: "Community development & infrastructure",
    kpis: [
      { ar: "المشاريع النشطة", en: "Active projects", value: "98", delta: "+11.7%" },
      { ar: "مؤشر الأداء", en: "Performance", value: "93%", delta: "+7.9%", ringPct: 93 },
      { ar: "المجتمع", en: "Community", value: "2.4M", delta: "مستفيد" },
    ],
    // «مجتمع» keeps southern's own existing 2.4M figure.
    metrics: { production: "0.58M", revenue: "46.3M", resources: "934", community: "2.4M" },
    initiatives: [
      { ar: "مبادرات تنمية المجتمعات", en: "Community development", pct: 72 },
      { ar: "التعليم والتدريب", en: "Education & training", pct: 85 },
      { ar: "الرعاية الصحية", en: "Healthcare", pct: 67 },
      { ar: "البنية التحتية الذكية", en: "Smart infrastructure", pct: 90 },
    ],
    modules: [
      { ar: "المجتمع", en: "Community", to: "/boardroom", icon: Users },
      { ar: "التعليم", en: "Education", to: "/knowledge", icon: GraduationCap },
      // ‏/risk حُجبت (٢٠٢٦/٠٨/١٢) — «الصحة» إلى شاشة صحة المنظومة /health.
      { ar: "الصحة", en: "Health", to: "/health", icon: HeartPulse },
      { ar: "البنية التحتية", en: "Infrastructure", to: "/digital-twin", icon: Building },
      { ar: "النقل الذكي", en: "Smart transport", to: "/executive-map", icon: Bus },
    ],
  },
};

/** SADEED executive-assistant capabilities (poster checklist). */
export const CC_SADEED_CAPS: { ar: string; en: string }[] = [
  { ar: "تحليل البيانات", en: "Data analysis" },
  { ar: "التوصيات الذكية", en: "Smart recommendations" },
  { ar: "التنبؤ والتحليل", en: "Forecasting & analytics" },
  { ar: "إدارة المهام", en: "Task management" },
  { ar: "التواصل الصوتي", en: "Voice interaction" },
];

/** System-health rings (poster «حالة النظام»). */
export const CC_SYSTEM_RINGS: { ar: string; en: string; pct: number }[] = [
  { ar: "الأداء العام", en: "Overall performance", pct: 96 },
  { ar: "الأمن السيبراني", en: "Cybersecurity", pct: 98 },
  { ar: "توفر النظام", en: "System uptime", pct: 99.9 },
];

/** Smart alerts (poster «التنبيهات الذكية»). */
export const CC_ALERTS: {
  ar: string;
  en: string;
  time: string;
  level: "high" | "info";
}[] = [
  {
    ar: "تنبيه أمني عالي الخطورة",
    en: "High-severity security alert",
    time: "10:34",
    level: "high",
  },
  { ar: "تحديث بيانات المشاريع", en: "Projects data updated", time: "09:21", level: "info" },
  { ar: "مراجعة أداء النظام", en: "System performance review", time: "08:15", level: "info" },
];
