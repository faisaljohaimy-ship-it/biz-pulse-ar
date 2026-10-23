/**
 * مداخل التنقّل **الخاصة بالمالك** — خارج `SYSTEM_NAV` و`MODULES` عمدًا.
 *
 * السجلّان الآخران يقرؤهما كل مستخدم (الشريط الجانبي · قائمة التطبيقات · دليل
 * النظام · لوحة الأوامر)، وعقد `system-nav` يحصر الأول في عشرين عنصرًا. مدخل «فِن»
 * لا يظهر إلا للمالك، **وقرار الظهور من الخادم** (`getFinnAccess` في
 * `src/lib/finn-agent/access.functions.ts`): هنا الوصف الثابت وحده — الوجهة والأيقونة
 * — بلا حكم على أحد. والاسم المعروض يُقرأ من `screen-names` لا يُكتب هنا.
 *
 * وإخفاء المدخل **ليس حمايةً**: الحماية في المسار البرمجي (`/api/finn/chat`) الذي
 * يردّ 404 لغير المالك، وفي الصفحة التي ترمي notFound. المدخل راحةٌ لا بوّابة.
 */
import { SquareTerminal, type LucideIcon } from "lucide-react";

export type OwnerNavEntry = {
  readonly id: string;
  /** الوجهة الحيّة — مسارٌ في الشجرة غير محجوب (يحرسه `finn-nav.contract.test.ts`). */
  readonly to: string;
  readonly icon: LucideIcon;
};

/** مدخل فِن. الاسم من `screen-names["/finn"]`. */
export const FINN_NAV_ENTRY: OwnerNavEntry = {
  id: "finn",
  to: "/finn",
  icon: SquareTerminal,
};
