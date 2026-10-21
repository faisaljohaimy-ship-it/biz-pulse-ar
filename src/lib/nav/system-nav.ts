/**
 * سجلّ الشريط الجانبي للنظام — المصدر الواحد لعناصره العامة ومساحة المالك.
 *
 * أمر المالك ٢٠٢٦/٠٩/٢٩: تطبيق تصميم لوحة القيادة على الصفحة الرئيسية
 * «مع تفعيل جميع الأيقونات»، واختار أن يظهر الشريط **في النظام كلّه**.
 * وهذا ناسخٌ صريح لأمر ٢٠٢٦/٠٨/٢٠ («حذف جميع الأزرار في الشريط الجانبي
 * باستثناء خمسة»).
 *
 * **ولا رابط ميّت.** ستّة عناصر في التصميم لا تصل بأسمائها مباشرة:
 * أربعة مساراتها محجوبة بأوامر سابقة (مركز القيادة · الأصول · المخاطر ·
 * التكاملات)، واثنان بلا صفحة أصلًا (الأفراد · التحقيقات). واختار المالك
 * «أقرب بديلٍ حيّ» **بلا فكّ أيّ حجب** — فكلُّ وجهةٍ هنا حيّةٌ غير محجوبة،
 * ويحرس ذلك `system-nav.contract.test.ts` على شجرة المسارات نفسها.
 *
 * **والاسم المحروس يُقرأ لا يُكتب:** «مركز القيادة» اسمٌ كانوني لـ
 * `/mission-control` المحجوب، فيُقرأ من `screen-names` عبر `labelRoute`
 * والوجهةُ بديلُه الحيّ — نمط V4 (١١٩٢) نفسه في زرّ غرفة العمليات.
 */
import {
  Boxes,
  BookOpen,
  Bot,
  Building2,
  Car,
  Cctv,
  ChartColumn,
  DoorOpen,
  FileSearch,
  HardHat,
  House,
  LayoutDashboard,
  Map as MapIcon,
  MapPinned,
  Puzzle,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { RegionId } from "@/lib/regions";

export type SystemNavLeaf = {
  readonly id: string;
  readonly ownerOnly?: boolean;
  /** الوجهة الحيّة. */
  readonly to: string;
  /** صاحب الاسم إن اختلف عن الوجهة — يُقرأ اسمه من `screen-names`. */
  readonly labelRoute?: string;
  readonly ar?: string;
  readonly en?: string;
  readonly icon: LucideIcon;
  /** يضبط المنطقة قبل الانتقال (عناصر «المناطق»). */
  readonly region?: RegionId;
};

export type SystemNavItem =
  | (SystemNavLeaf & { readonly kind: "link" })
  /** فعلٌ لا انتقال: يفتح لوحة سَدِيد، ويبقى `to` رابطًا احتياطيًّا بلا JS. */
  | (SystemNavLeaf & { readonly kind: "sadeed" })
  | {
      readonly kind: "group";
      readonly id: string;
      readonly ar: string;
      readonly en: string;
      readonly icon: LucideIcon;
      /** «regions» تُولَّد أبناؤها من `REGIONS` — لا قائمة مناطق ثانية. */
      readonly children: readonly SystemNavLeaf[] | "regions";
    };

export const SYSTEM_NAV: readonly SystemNavItem[] = [
  { kind: "link", id: "home", to: "/", ar: "الرئيسية", en: "Home", icon: House },
  {
    kind: "link",
    id: "command",
    // الاسم لـ/mission-control المحجوب، والوجهة بديله الحيّ.
    to: "/sec/exec",
    labelRoute: "/mission-control",
    icon: LayoutDashboard,
  },
  {
    kind: "sadeed",
    id: "sadeed",
    to: "/assistant",
    ar: "سَدِيد AI",
    en: "SADEED AI",
    icon: Sparkles,
  },
  {
    kind: "group",
    id: "regions",
    ar: "المناطق",
    en: "Regions",
    icon: MapIcon,
    children: "regions",
  },
  {
    kind: "link",
    id: "fnn-owner",
    to: "/orchestration",
    ar: "قيادة سَدِيد وFNN",
    en: "SADEED & FNN Command",
    icon: Bot,
    ownerOnly: true,
  },
  {
    kind: "group",
    id: "facilities",
    ar: "المرافق",
    en: "Facilities",
    icon: Building2,
    children: [
      {
        id: "facilities-list",
        to: "/sec/facilities",
        ar: "المرافق والمواقع",
        en: "Sites",
        icon: Building2,
      },
      {
        id: "facilities-twin",
        to: "/sec/twin",
        ar: "التوأم الرقمي",
        en: "Digital twin",
        icon: Boxes,
      },
    ],
  },
  {
    kind: "link",
    id: "map",
    to: "/executive-map",
    ar: "الخريطة التفاعلية",
    en: "Interactive map",
    icon: MapPinned,
  },
  { kind: "link", id: "cctv", to: "/sec/cctv", ar: "كاميرات المراقبة", en: "CCTV", icon: Cctv },
  {
    kind: "link",
    id: "access",
    to: "/sec/access",
    ar: "التحكم في الدخول",
    en: "Access control",
    icon: DoorOpen,
  },
  { kind: "link", id: "patrols", to: "/sec/patrols", ar: "الدوريات", en: "Patrols", icon: Car },
  // «الأفراد» بلا صفحة: أقرب بديلٍ حيّ **إدارة الورديات** (أعداد الحرّاس).
  // كان `/team` فقِيس صفحة «قريباً» موضوعها دعوات مساحة العمل لا أفراد الأمن.
  { kind: "link", id: "people", to: "/sec/shifts", ar: "الأفراد", en: "People", icon: Users },
  {
    kind: "link",
    id: "contractors",
    to: "/sec/contractors",
    ar: "المقاولون",
    en: "Contractors",
    icon: HardHat,
  },
  // «/sec/assets» محجوب: البديل الحيّ الصيانة.
  {
    kind: "link",
    id: "assets",
    to: "/sec/maintenance",
    ar: "الأصول والمعدات",
    en: "Assets & equipment",
    icon: Boxes,
  },
  // «Siren» لا المثلث: المثلث رمزُ «تحذير» في لوحة السلامة، فلا يُستعار لقسم.
  {
    kind: "link",
    id: "incidents",
    to: "/sec/incidents",
    ar: "إدارة الحوادث",
    en: "Incidents",
    icon: Siren,
  },
  // «/risk» محجوب: البديل الحيّ سجلّ المخاطر.
  {
    kind: "link",
    id: "risks",
    to: "/sec/risks",
    ar: "إدارة المخاطر",
    en: "Risk management",
    icon: ShieldAlert,
  },
  {
    kind: "link",
    id: "compliance",
    to: "/sec/governance",
    ar: "الامتثال والتدقيق",
    en: "Compliance & audit",
    icon: ShieldCheck,
  },
  // «التحقيقات» بلا صفحة: أقرب بديلٍ حيّ الخطّ الزمني للأحداث.
  {
    kind: "link",
    id: "investigations",
    to: "/sec/timeline",
    ar: "التحقيقات والأدلة",
    en: "Investigations",
    icon: FileSearch,
  },
  {
    kind: "link",
    id: "reports",
    to: "/sec/reports",
    ar: "التقارير والتحليلات",
    en: "Reports & analytics",
    icon: ChartColumn,
  },
  // «/sec/integrations» محجوب: البديل الحيّ مركز التكاملات.
  {
    kind: "link",
    id: "integrations",
    to: "/integrations",
    ar: "التكاملات",
    en: "Integrations",
    icon: Puzzle,
  },
  {
    kind: "link",
    id: "documents",
    to: "/files",
    ar: "المستندات والمعرفة",
    en: "Documents & knowledge",
    icon: BookOpen,
  },
  {
    kind: "link",
    id: "settings",
    to: "/settings",
    ar: "الإعدادات",
    en: "Settings",
    icon: Settings,
  },
];

export function systemNavForOwner(allowed: boolean): readonly SystemNavItem[] {
  return SYSTEM_NAV.filter((item) => !("ownerOnly" in item && item.ownerOnly) || allowed);
}

/** كلُّ وجهةٍ في السجل — للحارس ولأيّ سطحٍ يعدّها. */
export function systemNavDestinations(): string[] {
  const out: string[] = [];
  for (const item of SYSTEM_NAV) {
    if (item.kind === "group") {
      if (item.children === "regions") out.push("/sec");
      else for (const c of item.children) out.push(c.to);
    } else out.push(item.to);
  }
  return out;
}
