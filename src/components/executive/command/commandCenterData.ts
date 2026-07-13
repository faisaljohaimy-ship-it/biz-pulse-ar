/**
 * Command-center data model — the four regional panels of the unified NEXIOS
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

export interface CCRegionPanel {
  id: RegionId;
  subtitleAr: string;
  subtitleEn: string;
  kpis: CCKpi[];
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
    initiatives: [
      { ar: "تطوير البنية التحتية", en: "Infrastructure development", pct: 68 },
      { ar: "مشروع التحول الرقمي", en: "Digital transformation", pct: 90 },
      { ar: "تحسين تجربة العملاء", en: "Customer experience", pct: 74 },
      { ar: "رفع الكفاءة التشغيلية", en: "Operational efficiency", pct: 85 },
    ],
    modules: [
      { ar: "إدارة البيانات", en: "Data management", to: "/analytics", icon: Database },
      { ar: "الفني", en: "Technical", to: "/sec/maintenance", icon: Wrench },
      { ar: "الخدمات الذكية", en: "Smart services", to: "/agents", icon: Sparkles },
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
    initiatives: [],
    modules: [
      { ar: "الذكاء الاصطناعي", en: "AI", to: "/agents", icon: Brain },
      { ar: "تحليل البيانات", en: "Data analytics", to: "/analytics", icon: BarChart3 },
      { ar: "الأمن السيبراني", en: "Cybersecurity", to: "/sec", icon: ShieldCheck },
      {
        ar: "إدارة المشاريع",
        en: "Project management",
        to: "/mission-control",
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
    initiatives: [
      { ar: "تحسين كفاءة الإنتاج", en: "Production efficiency", pct: 92 },
      { ar: "مشاريع الطاقة المتجددة", en: "Renewable energy", pct: 75 },
      { ar: "السلامة والجودة", en: "Safety & quality", pct: 88 },
      { ar: "خفض الانبعاثات", en: "Emissions reduction", pct: 67 },
    ],
    modules: [
      { ar: "إنتاج الطاقة", en: "Energy production", to: "/analytics", icon: Zap },
      { ar: "المرافق", en: "Utilities", to: "/sec", icon: Factory },
      { ar: "السلامة", en: "Safety", to: "/risk", icon: ShieldAlert },
      { ar: "الاستدامة", en: "Sustainability", to: "/governance", icon: Leaf },
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
    initiatives: [
      { ar: "مبادرات تنمية المجتمعات", en: "Community development", pct: 72 },
      { ar: "التعليم والتدريب", en: "Education & training", pct: 85 },
      { ar: "الرعاية الصحية", en: "Healthcare", pct: 67 },
      { ar: "البنية التحتية الذكية", en: "Smart infrastructure", pct: 90 },
    ],
    modules: [
      { ar: "المجتمع", en: "Community", to: "/boardroom", icon: Users },
      { ar: "التعليم", en: "Education", to: "/analytics", icon: GraduationCap },
      { ar: "الصحة", en: "Health", to: "/risk", icon: HeartPulse },
      { ar: "البنية التحتية", en: "Infrastructure", to: "/digital-twin", icon: Building },
      { ar: "النقل الذكي", en: "Smart transport", to: "/executive-map", icon: Bus },
    ],
  },
};

/** ARIA executive-assistant capabilities (poster checklist). */
export const CC_ARIA_CAPS: { ar: string; en: string }[] = [
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
