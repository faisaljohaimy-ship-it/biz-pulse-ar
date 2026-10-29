/**
 * سجلّ الشريط الجانبي للنظام — **المصدر الواحد لعناصره الاثني عشر.**
 *
 * أمر المالك ٢٠٢٦/٠٩/٢٩: تطبيق تصميم لوحة القيادة على الصفحة الرئيسية
 * «مع تفعيل جميع الأيقونات»، واختار أن يظهر الشريط **في النظام كلّه**.
 * وهذا ناسخٌ صريح لأمر ٢٠٢٦/٠٨/٢٠ («حذف جميع الأزرار في الشريط الجانبي
 * باستثناء خمسة»).
 *
 * **ثم أمر المالك ٢٠٢٦/١٠/٢٩ — «احذف الموجود فالمرفق من النافذه فقط».** المرفق
 * لقطةٌ من هذه النافذة (القائمة نفسها في الشريط ≥1024 وفي درج الترويسة دونه)
 * تُظهر ثمانية صفوف بعينها: الدوريات · الأفراد · المقاولون · الأصول والمعدات ·
 * إدارة الحوادث · إدارة المخاطر · الامتثال والتدقيق · التحقيقات والأدلة —
 * فسقطت الثمانية من هذا السجلّ وحده (عشرون ← اثنا عشر)، ناسخةً من أمر
 * ٢٠٢٦/٠٩/٢٩ ما يخصّها لا غير. و«من النافذه فقط»: صفحاتها حيّة غير محجوبة —
 * لا سطر في `hidden-routes` ولا حذف ملفّ — وتبقى مبلوغةً من شريط الأمن الصناعي
 * (`sec-shell`؛ سبعةً منها، قِيس ٢٠٢٦/١٠/٢٩) وبطاقة الخريطة ولوحة القيادة وصفحة
 * التحكم في الدخول (المقاولون — الوحيد الذي لا يصله الشريط). وصفٌّ تاسع
 * تحت الثمانية كان مشطوبًا في اللقطة لا يُقرأ («التقارير والتحليلات»): ما لم
 * يُقرأ لم يُؤمر به، **فبقي** حتى يحسمه المالك. الحارس
 * `system-nav.contract.test.ts` («حُذفت من النافذة فقط»).
 *
 * **ولا رابط ميّت.** عنصران في التصميم لا يصلان باسميهما مباشرة — مساراهما
 * محجوبان بأوامر سابقة (مركز القيادة · التكاملات) — واختار المالك «أقرب بديلٍ
 * حيّ» **بلا فكّ أيّ حجب**، فكلُّ وجهةٍ هنا حيّةٌ غير محجوبة، ويحرس ذلك
 * `system-nav.contract.test.ts` على شجرة المسارات نفسها. (وكانت أربعةٌ أخرى على
 * بدائل حيّة — الأصول · المخاطر · الأفراد · التحقيقات — وسقطت بأمر ٢٠٢٦/١٠/٢٩.)
 *
 * **والاسم المحروس يُقرأ لا يُكتب:** «مركز القيادة» اسمٌ كانوني لـ
 * `/mission-control` المحجوب، فيُقرأ من `screen-names` عبر `labelRoute`
 * والوجهةُ بديلُه الحيّ — نمط V4 (١١٩٢) نفسه في زرّ غرفة العمليات.
 */
import {
  Boxes,
  BookOpen,
  Building2,
  Cctv,
  ChartColumn,
  DoorOpen,
  House,
  LayoutDashboard,
  Map as MapIcon,
  MapPinned,
  Puzzle,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { RegionId } from "@/lib/regions";

export type SystemNavLeaf = {
  readonly id: string;
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
  // هنا كانت ثمانية صفوف (الدوريات · الأفراد · المقاولون · الأصول والمعدات ·
  // إدارة الحوادث · إدارة المخاطر · الامتثال والتدقيق · التحقيقات والأدلة) —
  // سقطت من النافذة وحدها بأمر المالك ٢٠٢٦/١٠/٢٩ (رأس الملفّ)، وصفحاتها حيّة.
  // و«التقارير» تاليها كان مشطوبًا في اللقطة فبقي حتى يحسمه المالك.
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
