/**
 * NEXIOS AI OS — FINN | مصدر الزمن الوحيد (توقيت مكة المكرمة)
 * Asia/Riyadh (UTC+03:00، بلا توقيت صيفي إطلاقًا)
 *
 * دستور فِنّ — المادة ٢ (مادة صلبة): الزمن يُبنى هنا فقط، على الخادم، ويُحقن
 * في كتلة <FINN_RUNTIME> في بداية كل دور محادثة. النموذج لا يحسب الوقت إطلاقًا
 * ولا يسترجعه من ذاكرة التدريب — مصدره الوحيد هذه الكتلة.
 *
 * وحدة نقيّة صالحة للخادم (لا React، لا DOM) كي تُستورد من مسارات الـ API دون
 * سحب حزمة الواجهة. ساعة الواجهة الحيّة تبقى في LiveClock/LiveDateTime.
 */

export const MAKKAH_TZ = "Asia/Riyadh" as const;
export const MAKKAH_UTC_OFFSET_MIN = 180 as const; // ثابت — لا DST

/* ────────────────────────────── المنسّقات ────────────────────────────── */

const timeFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: MAKKAH_TZ,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const dayFmt = new Intl.DateTimeFormat("ar", {
  timeZone: MAKKAH_TZ,
  weekday: "long",
});

/** ميلادي بأرقام لاتينية — نتجنّب ar-SA لأن تقويمها الافتراضي هجري */
const gregFmt = new Intl.DateTimeFormat("ar-u-ca-gregory-nu-latn", {
  timeZone: MAKKAH_TZ,
  day: "numeric",
  month: "long",
  year: "numeric",
});

const gregNumFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: MAKKAH_TZ,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const hijriFmt = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura-nu-latn", {
  timeZone: MAKKAH_TZ,
  day: "numeric",
  month: "long",
  year: "numeric",
});

/* ────────────────────────────── الأنواع ────────────────────────────── */

export type FinnUserRole = "manager" | "supervisor" | "employee";

export interface MakkahMoment {
  /** ISO 8601 بإزاحة +03:00 — المرجع الحسابي الوحيد */
  iso: string;
  epochMs: number;
  time: string; // 14:07:33
  day: string; // الخميس
  dateG: string; // 23 يوليو 2026
  dateGNum: string; // 23/07/2026
  dateH: string; // 9 صفر 1448
  /** ⏱ 14:07:33 · الخميس 23 يوليو 2026 · توقيت مكة المكرمة (UTC+3) */
  header: string;
}

/* ────────────────────────────── البناء ────────────────────────────── */

/** ISO مع إزاحة مكة الصريحة (بدل Z) */
function toMakkahISO(d: Date): string {
  const shifted = new Date(d.getTime() + MAKKAH_UTC_OFFSET_MIN * 60_000);
  return shifted.toISOString().replace(/\.\d{3}Z$/, "+03:00");
}

export function buildMakkahMoment(d: Date = new Date()): MakkahMoment {
  const time = timeFmt.format(d);
  const day = dayFmt.format(d);
  const dateG = gregFmt.format(d);

  return {
    iso: toMakkahISO(d),
    epochMs: d.getTime(),
    time,
    day,
    dateG,
    dateGNum: gregNumFmt.format(d),
    dateH: hijriFmt.format(d),
    header: `⏱ ${time} · ${day} ${dateG} · توقيت مكة المكرمة (UTC+3)`,
  };
}

/**
 * كتلة الحقن النظامية — تُبنى على الخادم في كل دور. ساعة المتصفح غير موثوقة
 * للتدقيق، فلا تُستخدم هنا إطلاقًا.
 */
export function buildFinnRuntimeBlock(ctx: {
  now?: Date;
  userRole: FinnUserRole;
  region: string;
  isSimulation: boolean;
}): string {
  const m = buildMakkahMoment(ctx.now ?? new Date());
  return [
    "<FINN_RUNTIME>",
    `iso:        ${m.iso}`,
    `epoch_ms:   ${m.epochMs}`,
    `time:       ${m.time}`,
    `day:        ${m.day}`,
    `date_g:     ${m.dateG}`,
    `date_g_num: ${m.dateGNum}`,
    `date_h:     ${m.dateH} هـ`,
    `tz:         ${MAKKAH_TZ} (UTC+03:00, no DST)`,
    `user_role:  ${ctx.userRole}`,
    `region:     ${ctx.region}`,
    `is_simulation: ${ctx.isSimulation}`,
    "</FINN_RUNTIME>",
  ].join("\n");
}

/**
 * توجيه المادة ٢ — يُرفق مع الكتلة في مقدّمة كل System Prompt كي يعرف فِنّ
 * أن مصدره الزمني الوحيد هو <FINN_RUNTIME>، وكيف يعرض الترويسة الزمنية.
 */
export const MAKKAH_TIME_DIRECTIVE = `# المادة ٢ — الزمن الحيّ بتوقيت مكة المكرمة (مادة صلبة)
- كتلة <FINN_RUNTIME> أعلاه هي **مصدرك الوحيد** للوقت والتاريخ. يُحظر مطلقًا تقدير الوقت أو حسابه ذهنيًا أو استرجاعه من ذاكرة التدريب.
- المنطقة الزمنية: Asia/Riyadh = UTC+03:00 (توقيت مكة المكرمة، بلا توقيت صيفي إطلاقًا).
- في الردود النصّية التشغيلية، وعند أي سؤال عن الوقت أو أي إجراء زمنيّ الأثر (سريان تصريح، انتهاء نافذة عمل، عمر بلاغ)، صدّر ردّك بالترويسة حرفيًا:
  ⏱ [time] · [day] [date_g] · توقيت مكة المكرمة (UTC+3)
- في القناة الصوتية: تُنطق الترويسة **فقط** عند السؤال عن الوقت أو عند إجراء زمنيّ الأثر.
- كل حساب زمني (مدة تصريح، تأخّر مرحلة اعتماد، عمر بلاغ) يُشتقّ حصريًا من الحقل \`iso\` داخل الكتلة.
- إن غابت كتلة <FINN_RUNTIME> أو كانت تالفة، قل حرفيًا: «تعذّر تحديد الوقت الحيّ من مصدر النظام. لن أذكر وقتًا غير موثّق.» ولا تُكمل أي إجراء يعتمد على الزمن.`;
