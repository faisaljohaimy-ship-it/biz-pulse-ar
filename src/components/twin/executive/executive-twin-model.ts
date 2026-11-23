/** Values transcribed from the owner's visual reference, never operational telemetry. */
export const EXECUTIVE_TWIN_REFERENCE = {
  is_simulation: true,
  source: "owner-reference-image",
  metrics: [
    { value: "99%", ar: "الامتثال", en: "Compliance" },
    { value: "4,820", ar: "الموظفون", en: "Employees" },
    { value: "320", ar: "المواقع", en: "Sites" },
    { value: "2,150", ar: "الدوريات", en: "Patrols" },
    { value: "12", ar: "البلاغات", en: "Alerts" },
  ],
  departments: [
    {
      id: "substations",
      ar: "محطات التحويل",
      en: "Substations",
      pct: 98,
      sites: 6,
      reports: 0,
      status: "normal",
    },
    {
      id: "perimeter",
      ar: "المحيط والبوابات",
      en: "Perimeter & gates",
      pct: 76,
      sites: 4,
      reports: 2,
      status: "watch",
    },
    {
      id: "surveillance",
      ar: "المراقبة البصرية",
      en: "Visual surveillance",
      pct: 62,
      sites: 3,
      reports: 1,
      status: "watch",
    },
    {
      id: "sensors",
      ar: "الاستشعار والإنذار",
      en: "Sensors & alarms",
      pct: 48,
      sites: 2,
      reports: 1,
      status: "alert",
    },
    {
      id: "logistics",
      ar: "الإسناد اللوجستي",
      en: "Logistics",
      pct: 90,
      sites: 5,
      reports: 0,
      status: "normal",
    },
  ],
} as const;

export type ExecutiveDepartmentId = (typeof EXECUTIVE_TWIN_REFERENCE.departments)[number]["id"];

export const EXECUTIVE_STATUS = {
  normal: { ar: "تشغيل طبيعي", en: "Normal" },
  watch: { ar: "تحت المراقبة", en: "Monitoring" },
  alert: { ar: "بلاغ توضيحي", en: "Example alert" },
} as const;
