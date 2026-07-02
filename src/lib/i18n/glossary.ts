/**
 * NEXIOS Executive Arabic Glossary — canonical terminology lock.
 *
 * Every executive-facing surface must import labels from this file.
 * Fusha, executive register. Western numerals (0-9) for KPI values
 * and dates; Arabic-Indic digits only inside sentences (e.g. "٣٠ ثانية").
 * Punctuation: Arabic comma "،" and Arabic question mark "؟".
 *
 * Additive layer — do not remove keys; add new entries here rather
 * than hardcoding Arabic strings in components.
 */

export const glossary = {
  // Boot
  boot_brand:       { ar: "نِكسيوس · بدء التشغيل",             en: "NEXIOS · Boot" },
  boot_init:        { ar: "تهيئة بيئة التشغيل الآمنة…",         en: "Initializing secure runtime…" },
  boot_scene_10:    { ar: "المشهد ١٠ · الكشف",                 en: "Scene 10 · Reveal" },

  // Hero
  hero_headline:    { ar: "المستقبل ذكي. المستقبل نِكسيوس.",   en: "The future is intelligent. The future is NEXIOS." },
  hero_sub:         {
    ar: "منظومة التشغيل الذكية للعمليات الصناعية والأمنية — رؤية تنفيذية موحّدة، في الزمن الحقيقي.",
    en: "The intelligent operating system for industrial & security operations — a unified executive view, in real time.",
  },
  cta_primary:      { ar: "غرفة القيادة التنفيذية",             en: "Executive Command Room" },
  cta_secondary:    { ar: "استكشف المنظومة",                    en: "Explore the platform" },

  // Marquee (public)
  marquee_1:        { ar: "✦ نِكسيوس AI OS · الإصدار 1.0",     en: "✦ NEXIOS AI OS · v1.0" },
  marquee_2:        { ar: "✦ منصة القيادة التنفيذية · رؤية 2030", en: "✦ Executive Command Platform · Vision 2030" },
  marquee_3:        { ar: "✦ مدعومة بآريا",                     en: "✦ Powered by ARIA" },

  // KPIs (executive labels)
  kpi_critical_24h: { ar: "الحوادث الحرجة · 24 ساعة",           en: "Critical Incidents · 24h" },
  kpi_mttr:         { ar: "متوسط زمن الإصلاح",                  en: "Mean Time to Repair" },
  kpi_resolution:   { ar: "معدل الإنجاز",                       en: "Resolution Rate" },
  kpi_open_wo:      { ar: "أوامر العمل المفتوحة",               en: "Open Work Orders" },
  kpi_preventive:   { ar: "الصيانة الوقائية",                   en: "Preventive Maintenance" },
  kpi_active_proj:  { ar: "المشاريع النشطة",                    en: "Active Projects" },
  kpi_risk_level:   { ar: "مستوى المخاطر",                      en: "Risk Level" },

  // Live pulse
  pulse_title:      { ar: "نبض العمليات المباشر",               en: "Live Operations Pulse" },
  pulse_demo_chip:  { ar: "بيانات عرض توضيحية",                 en: "Demo data" },

  // Agents section
  agents_title:     { ar: "منظومة الوكلاء الأذكياء",            en: "Intelligent Agent Fleet" },

  // ARIA
  aria_greeting:    {
    ar: "مرحباً، أنا آريا — مساعدتك التنفيذية الرقمية. المنظومة جاهزة.",
    en: "Hello, I am ARIA — your digital executive aide. The platform is ready.",
  },
  aria_chip_brief:  { ar: "أعطني إحاطة تنفيذية في ٣٠ ثانية",    en: "Give me a 30-second executive brief" },
  aria_chip_risk:   { ar: "ما وضع المخاطر الآن؟",               en: "What's the current risk posture?" },
  aria_chip_wo:     { ar: "اعرض أداء أوامر العمل",              en: "Show me work-order performance" },

  // Briefing button + states
  briefing_button:  { ar: "الإحاطة التنفيذية ▸",                en: "Executive Briefing ▸" },
  briefing_stop:    { ar: "إيقاف الإحاطة",                      en: "Stop briefing" },
  state_listening:  { ar: "أستمع…",                             en: "Listening…" },
  state_thinking:   { ar: "أُفكّر…",                            en: "Thinking…" },
  state_speaking:   { ar: "أتحدث…",                             en: "Speaking…" },
} as const;

export type GlossaryKey = keyof typeof glossary;

export function gloss(key: GlossaryKey, locale: "ar" | "en"): string {
  return glossary[key][locale];
}

/**
 * Hijri + Gregorian dual date, executive header format.
 * Example: "الخميس ١٦ محرم ١٤٤٨هـ · 2 يوليو 2026"
 */
export function dualDate(locale: "ar" | "en", now: Date = new Date()): string {
  try {
    if (locale === "ar") {
      const hijri = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      }).format(now);
      const greg = new Intl.DateTimeFormat("ar", {
        day: "numeric", month: "long", year: "numeric",
      }).format(now);
      return `${hijri}هـ · ${greg}`;
    }
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    }).format(now);
  } catch {
    return now.toDateString();
  }
}
