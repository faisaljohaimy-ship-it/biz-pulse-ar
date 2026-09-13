/**
 * ثوابت أمر العمل — أمر المالك ٢٠٢٦/٠٩/١٣.
 *
 * **المفاتيح إنجليزية والتسميات عربية، ولا يُخزَّن إلا المفتاح.** النصّ
 * العربي عرضٌ لا عقد: تخزينه يجعل كل استعلامٍ لاحق يطابق حروفًا قابلة
 * للتبدّل (همزة، تاء مربوطة، مسافة)، بينما `fault_type` قيدُ `check` في
 * القاعدة على هذه المفاتيح بعينها.
 */
export const FAULT_TYPES = [
  { key: "electrical", label: "كهرباء" },
  { key: "hvac", label: "تكييف وتبريد" },
  { key: "plumbing", label: "سباكة" },
  { key: "civil", label: "مدني وإنشائي" },
  { key: "cctv", label: "كاميرات المراقبة" },
  { key: "access_control", label: "التحكم بالدخول" },
  { key: "gates_barriers", label: "البوابات والحواجز" },
  { key: "fire_alarm", label: "الإنذار والإطفاء" },
  { key: "lighting", label: "الإضاءة" },
  { key: "network", label: "الشبكات والاتصالات" },
  { key: "other", label: "أخرى" },
] as const;

export const DEFAULT_ASSIGNEE_TEAM = "فريق الصيانة";
export const DEFAULT_CONTRACTOR = "شركة الجيل الحديث";
