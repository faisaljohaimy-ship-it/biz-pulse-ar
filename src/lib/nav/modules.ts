/**
 * Canonical module registry — the SINGLE SOURCE OF TRUTH for the name and icon
 * of every top-level system module (constitution art. 13.5).
 *
 * Both the module dashboard (`SystemModulesDashboard`) and the app sidebar
 * (`app-shell`) resolve their labels/icons from here, so a module's identity is
 * literally defined once and can never drift between surfaces. Any route that
 * appears here is rendered with THIS name and THIS icon everywhere it shows.
 *
 * Every `to` is a REAL existing route under src/routes/_authenticated
 * (constitution art. 6: no dead/placeholder icons).
 */

import {
  Bot,
  Boxes,
  FileBarChart,
  FileCheck2,
  LineChart,
  Map as MapIcon,
  Presentation,
  Radar,
  Shield,
  Siren,
  Sparkles,
  Telescope,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export interface ModuleEntry {
  readonly to: string;
  readonly ar: string;
  readonly en: string;
  readonly icon: LucideIcon;
  /** External sister platform: icons open it directly in a new tab. */
  readonly external?: boolean;
}

export const MODULES: readonly ModuleEntry[] = [
  { to: "/sec", ar: "الأمن الصناعي", en: "Industrial Security", icon: Shield },
  // «مركز القيادة» (/mission-control) حُجب بأمر المالك ٢٠٢٦/٠٨/١٢ — وضع
  // العرض التنفيذي وحده نجا، زرًّا في ترويسة لوحة سَدِيد.
  // ٢٠٢٦/٠٨/٢٤ — دُمج محتوى «غرفة العمليات» في «النظرة العامة» /sec بقرار
  // المالك؛ المسار يبقى إعادة توجيه إلى /sec، والاسم يبقى محجوزًا هنا مصدرًا
  // وحيدًا لتسمية زر الشريط الجانبي (حارس التفرّد في screen-names.test).
  { to: "/situation-room", ar: "غرفة العمليات", en: "Situation Room", icon: Radar },
  { to: "/executive-map", ar: "الخريطة التنفيذية", en: "Executive Map", icon: MapIcon },
  // G7: the canonical name is «منصة عمليات الوكلاء» in every surface.
  { to: "/agents", ar: "منصة عمليات الوكلاء", en: "Agent Operations Platform", icon: Bot },
  { to: "/digital-twin", ar: "التوأم الرقمي", en: "Digital Twin", icon: Boxes },
  // تقرير لا رسم بياني: `BarChart3` كانت أيقونة **مؤشرات الأداء** نفسها في
  // الشريط الجانبي، فقرأت الوحدتان بأيقونة واحدة. الوحدة تُصدِّر ملفات
  // (PDF/Excel) — فالوثيقة ذات البيانات هي دلالتها.
  { to: "/sec/reports", ar: "التقارير", en: "Reports", icon: FileBarChart },
  // «الحوكمة» انتقلت من وحدة مستقلة إلى شريط الأمن الصناعي (/sec/governance)
  // بأمر المالك ٢٠٢٦/٠٨/١٢ — مدخلها في SecSubNav لا هنا.
  // و«المخاطر» (/risk — إدارة المخاطر المؤسسية) حُجبت بالأمر نفسه؛
  // «سجل المخاطر» /sec/risks شاشة أخرى وباقية.
  { to: "/sec/maintenance", ar: "الصيانة", en: "Maintenance", icon: Wrench },
  // التصريح وثيقة **مُعتمَدة** لا ورقة نصّ: علامة الاعتماد هي ما يميّزه عن
  // أي مستند آخر في المنظومة.
  { to: "/sec/permits", ar: "التصاريح", en: "Permits", icon: FileCheck2 },
  // «الامتثال HCIS» (/hcis) حُذفت بالكامل بأمر المالك ٢٠٢٦/٠٨/٠٩ — لا إخفاء
  // ولا توجيه: الصفحة وأيقونتها ومسارها وطبقة بياناتها (src/lib/hcis)
  // اقتُلعت من الشجرة. لا يُعاد سطرها هنا إلا بأمر مالك جديد.
  // الاسم بأمر المالك ٢٠٢٦/٠٨/٢٠: «متابعة الأعمال العاجلة» بدل «العاجل».
  { to: "/urgent-ops", ar: "متابعة الأعمال العاجلة", en: "Urgent Ops", icon: Siren },
  // «قاعة المجلس» (/boardroom) حُجبت بأمر المالك ٢٠٢٦/٠٨/٢٠ — «حذف
  // الواجهة بالكامل لتكرار المعلومات».

  // المسارات `/sadeed*` عقود توجيه حيّة تبقى كما هي؛ التسمية وحدها هي المعروضة.
  { to: "/sadeed", ar: "سَدِيد التنفيذي", en: "SADEED Engine", icon: Sparkles },
  { to: "/sadeed-analytics", ar: "تحليلات سَدِيد", en: "SADEED Analytics", icon: LineChart },
  { to: "/observability", ar: "الرصد والتكاليف", en: "Observability", icon: Telescope },
];

/**
 * One-line purpose per module route (constitution art. 21: every icon can
 * explain itself). Single source — consumed by the module-grid tooltip and
 * the /guide system map alike, so a tile and its guide entry never drift.
 */
export const MODULE_PURPOSE: Record<string, { ar: string; en: string }> = {
  "/sec": {
    ar: "المظلة التشغيلية للأمن الصناعي — المواقع والبلاغات والحوادث.",
    en: "The industrial-security umbrella — sites, incidents, alerts.",
  },
  "/situation-room": {
    ar: "غرفة العمليات الحيّة — المتابعة اللحظية والتصعيد.",
    en: "The live operations room — real-time watch and escalation.",
  },
  "/executive-map": {
    ar: "الخريطة الجغرافية التنفيذية للأصول والمناطق.",
    en: "The executive geographic map of assets and regions.",
  },
  "/agents": {
    ar: "منصة عمليات الوكلاء — تشغيل ومراقبة تحت قيادة سَدِيد.",
    en: "Agent operations platform — run and monitor under SADEED.",
  },
  "/digital-twin": {
    ar: "التوأم الرقمي — مطابقة الميدان بالنموذج الرقمي.",
    en: "The digital twin — reconcile field state with the model.",
  },
  "/sec/reports": {
    ar: "تصدير الملخصات وتقارير الأمن الصناعي بصيغة PDF عربية أو Excel.",
    en: "Export industrial-security summaries and reports as Arabic PDF or Excel.",
  },
  "/analytics": {
    ar: "الإحصائيات التشغيلية والاتجاهات الزمنية.",
    en: "Operational statistics and time-series trends.",
  },
  "/bi": {
    ar: "لوحات تحليلية تفاعلية بنمط Power BI مع تصدير.",
    en: "Interactive Power BI-style dashboards with export.",
  },
  // «الحوكمة» تسكن شريط الأمن الصناعي (/sec/governance) — غرضها يظهر في
  // ترويسة صفحتها لا في شبكة الوحدات. و«المخاطر» /risk حُجبت ٢٠٢٦/٠٨/١٢.
  "/sec/maintenance": {
    ar: "أوامر الصيانة الوقائية والتصحيحية.",
    en: "Preventive and corrective maintenance orders.",
  },
  "/sec/permits": {
    ar: "إدارة تصاريح العمل السارية والمنتهية.",
    en: "Manage active and expired work permits.",
  },
  "/ptw": {
    ar: "تصاريح العمل الرقمية بدورة حياة كاملة وQR.",
    en: "Digital permits-to-work with full lifecycle and QR.",
  },
  "/urgent-ops": {
    ar: "الأعمال العاجلة واتفاقيات الخدمة (SLA).",
    en: "Urgent operations and service-level agreements.",
  },
  "/sadeed": {
    ar: "سَدِيد التنفيذي — المساعد الذكي الصوتي والنصي.",
    en: "SADEED Executive — the voice and text AI assistant.",
  },
  "/sadeed-analytics": {
    ar: "تحليلات أداء سَدِيد واستخدامه.",
    en: "SADEED performance and usage analytics.",
  },
  "/observability": {
    ar: "الرصد التقني والتكاليف وصحة المنظومة.",
    en: "Technical observability, costs and system health.",
  },
  "/learn": {
    ar: "مركز التعلّم — مسارات ودروس واختبارات.",
    en: "The learning center — tracks, lessons and quizzes.",
  },
};

const BY_ROUTE = new Map<string, ModuleEntry>(MODULES.map((m) => [m.to, m]));

/** Canonical entry for a route, or undefined if the route is not a top-level module. */
export function moduleByRoute(to: string): ModuleEntry | undefined {
  return BY_ROUTE.get(to);
}

/**
 * Resolved external URL for an external module. Currently no modules are
 * external — Nusuk Hajj was retired.
 */
export function moduleExternalUrl(entry: ModuleEntry): string | null {
  if (!entry.external) return null;
  return null;
}
