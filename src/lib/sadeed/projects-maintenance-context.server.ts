/**
 * ما يعرفه سَدِيد عن **المشاريع والصيانة** — أمر المالك ٢٠٢٦/٠٨/٣١:
 * «اجعل سَدِيد يحفظ ويتفاعل مع البيانات المعكوسة في المشاريع والصيانة».
 *
 * ## الثغرة التي يسدّها هذا الملف
 *
 * الصفحتان تعرضان البيانات منذ الاستيراد، لكن سَدِيد كان **لا يراها** —
 * على المسارين معًا:
 *   • **المصادَق**: `sadeed-context.server` يقرأ `sec_projects` و
 *     `sec_work_orders` من القاعدة مباشرةً، وهما فارغتان (ولذلك يسقط
 *     `getProjects` إلى المجموعة المستوردة أصلًا). والشرط
 *     `if (projectsQ.data?.length)` يتخطّى القسم كلَّه على الفارغ — فلا
 *     قسم مشاريع في سياقه إطلاقًا.
 *   • **الزائر**: كتلة المحاكاة المرجعية لم تكن تحوي مشاريع ولا صيانة.
 * فكان سَدِيد يجيب «لا تتوفّر البيانات» عن شاشةٍ مفتوحةٍ أمام المستخدم.
 *
 * ## الأصل المزدوج — وهو أدقّ ما هنا
 *
 * القسمان **ليسا من طبيعة واحدة**، فلا يُوسمان وسمًا واحدًا:
 *   • **المشاريع إنتاجية** (أمر المالك ٢٠٢٦/٠٨/٣٠ «ارفع شارة المحاكاة،
 *     البيانات إنتاجية») — صفوفها مجمّدة ولا يسمها `markSimulation`.
 *   • **الصيانة مستوردة من تصدير SAP** (٢٠٢٦/٠٩/٠٢ «اعكس جميع بيانات
 *     الصيانة المرفقة») وموسومة محاكاةً مرجعية حتى إقرار المالك
 *     بإنتاجيتها — `MAINTENANCE_IMPORT_ORIGIN` أدناه؛ ومحاكاة الزائر
 *     المولّدة من `buildOmsSimulation` باقية لفرع النداء بلا هوية.
 * ولذلك يحمل كل قسمٍ وسمَ أصله في متنه (`PROVENANCE`)، ويُلزَم سَدِيد بأن
 * ينسب كل رقمٍ إلى وسم قسمه لا إلى وسمٍ شامل للكتلة. الخلط في الاتجاهين
 * خطأ: أن يصف مشروعًا إنتاجيًّا بأنه محاكاة يُهدر مصداقية بيانات حقيقية،
 * وأن يصف أمر عملٍ مولَّدًا بأنه واقع هو الفبركة التي تمنعها المادة ٢٧.
 *
 * ## لماذا خلاصات لا صفوف
 *
 * 697 مشروعًا لا تدخل نافذة سياق، وحشوها يزاحم ما يحتاجه سَدِيد فعلًا.
 * فالمعروض: عدّادات كاملة على المجموعة + توزيع حسب منطقة العمليات
 * والنظام + **المشاريع المعرَّضة للخطر والمتأخّرة بأسمائها** (وهي القليلة
 * التي تُتَّخذ عليها قرارات) + أقرب المواعيد. الخلاصة تُحسب على الـ697
 * كاملةً لا على المعروض منها.
 */
import type { SecProject } from "@/lib/sec.functions";

/** وسم الأصل — يُكتب في متن كل قسم، ويُقرأ نصًّا في إجابة سَدِيد. */
const PROVENANCE_PRODUCTION = "[PROD:PROJECTS_EXPORT]";
const PROVENANCE_SIMULATION = "[SIM:MAINTENANCE]";

type WorkOrderLike = {
  ref: string;
  title_ar: string;
  kind?: string | null;
  priority?: string | null;
  status: string;
  assigned_to?: string | null;
  /** تحملها المجموعة المستوردة (من مجموعة التخطيط)؛ المحاكاة بلا مناطق. */
  area_ar?: string | null;
  asset_kind?: string | null;
};

/** أعلى `n` مفاتيح تكرارًا — للتوزيع حسب المنطقة والنظام. */
function topCounts(values: readonly (string | null | undefined)[], n: number): string {
  const counts = new Map<string, number>();
  for (const v of values) {
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k, c]) => `${k}: ${c}`)
    .join(" · ");
}

/**
 * قسم المشاريع من مجموعةٍ معطاة — تُمرَّر من القاعدة حين تمتلئ، ومن
 * المجموعة المستوردة حين تفرغ. الحساب واحد في الحالتين فلا يفترق الرقم
 * بين مسار وآخر.
 */
export function buildProjectsContextSection(
  projects: readonly SecProject[],
  /**
   * تجاوزُ الوسم — لنداءٍ بلا `orgId` تُقدَّم **محاكاة** مشاريع لا مشاريع
   * المؤسسة، فيجب أن تحمل وسمها الصحيح `[SIM:*]`. الوسم يتبع المصدر
   * المُمرَّر لا اسم الدالّة: نفس البناء يخدم المصدرين، والكذب يقع حين
   * يُوسم أحدهما بوسم الآخر.
   */
  origin: { provenance: string; note: string } = {
    provenance: PROVENANCE_PRODUCTION,
    note: "بياناتٌ إنتاجية من تصدير مشاريع الأمن الصناعي. لا تُوصف بأنها محاكاة.",
  },
): string[] {
  if (projects.length === 0) return [];

  const byStatus = (s: string) => projects.filter((p) => p.status === s).length;
  const atRisk = projects.filter((p) => p.health === "red");
  const delayed = projects.filter((p) => p.health === "amber");
  const unmeasured = projects.filter((p) => p.health === null).length;

  // أقرب المواعيد بين الجارية وحدها — موعدُ مشروعٍ مكتمل أو ملغى لا يُتابَع.
  const upcoming = projects
    .filter((p) => p.status === "in-progress" && p.ends_at)
    .sort((a, b) => (a.ends_at ?? "").localeCompare(b.ends_at ?? ""))
    .slice(0, 8);

  const lines = [
    "",
    `## المشاريع ${origin.provenance}`,
    `provenance: ${origin.note}`,
    `- الإجمالي: ${projects.length}`,
    `- جارية: ${byStatus("in-progress")} · مكتملة: ${byStatus("completed")} · ملغاة: ${byStatus("cancelled")}`,
    // المادة ٢٧: غياب التقييم يُقال صراحةً ولا يُطوى خلف «سليم».
    `- الصحّة: معرَّضة للخطر ${atRisk.length} · متأخّرة ${delayed.length} · سليمة ${projects.filter((p) => p.health === "green").length} · **لم تُقَس ${unmeasured}**`,
    `- تنبيه للإسناد: ${unmeasured} مشروعًا بلا تقييم مخاطر في المصدر. لا تصفها سليمة ولا متعثّرة — قل «لم تُقَس».`,
  ];

  const areas = topCounts(
    projects.map((p) => p.area_ar),
    6,
  );
  if (areas) lines.push(`- حسب منطقة العمليات: ${areas}`);
  const systems = topCounts(
    projects.map((p) => p.kind),
    6,
  );
  if (systems) lines.push(`- حسب النظام: ${systems}`);

  if (atRisk.length) {
    lines.push("### المشاريع المعرَّضة للخطر (تصنيف المصدر)");
    lines.push(
      ...atRisk
        .slice(0, 12)
        .map(
          (p) =>
            `- ${p.ref}: ${p.name_ar} — ${p.progress}% — ${p.area_ar ?? "منطقة غير محددة"} — نهاية ${p.ends_at ?? "لم تُحدَّد"}`,
        ),
    );
  }
  if (delayed.length) {
    lines.push("### المشاريع المتأخّرة (تحليل التأخّر في المصدر)");
    lines.push(
      ...delayed
        .slice(0, 12)
        .map(
          (p) => `- ${p.ref}: ${p.name_ar} — ${p.progress}% — نهاية ${p.ends_at ?? "لم تُحدَّد"}`,
        ),
    );
  }
  if (upcoming.length) {
    lines.push("### أقرب مواعيد التسليم بين الجارية");
    lines.push(...upcoming.map((p) => `- ${p.ends_at}: ${p.ref} — ${p.name_ar} (${p.progress}%)`));
  }
  return lines;
}

/**
 * وسم مجموعة الصيانة المستوردة (تصدير SAP، ٢٠٢٦/٠٩/٠٢) — بياناتٌ من ملف
 * المالك لكنها **ما زالت موسومة «محاكاة مرجعية»** لأن المالك لم يُقرّ
 * إنتاجيتها بعد (سابقة المشاريع: الإقرار سبق رفع الشارة). فالوسم يقولها
 * كما هي: مستوردة لا مولّدة، ومحاكاةٌ حتى الإقرار.
 */
export const MAINTENANCE_IMPORT_ORIGIN = {
  provenance: "[SIM:MAINTENANCE_IMPORT]",
  note:
    "مجموعة أوامر صيانة مستوردة من تصدير SAP المرفق (249 أمرًا) — موسومة" +
    " محاكاة مرجعية حتى إقرار المالك بإنتاجيتها. صِفها «بيانات الصيانة" +
    " المستوردة» لا محاكاةً مولّدة ولا واقعًا إنتاجيًّا مؤكَّدًا.",
} as const;

/** قسم الصيانة — الوسم يتبع المصدر المُمرَّر؛ المولَّدة محاكاةٌ افتراضًا. */
export function buildMaintenanceContextSection(
  orders: readonly WorkOrderLike[],
  origin: { provenance: string; note: string } = {
    provenance: PROVENANCE_SIMULATION,
    note: "محاكاة مرجعية. كل رقمٍ مشتقٍّ منها يُوسم محاكاةً صراحةً.",
  },
): string[] {
  if (orders.length === 0) return [];
  const openOrders = orders.filter((w) => w.status !== "closed" && w.status !== "cancelled");
  const lines = [
    "",
    `## الصيانة وأوامر العمل ${origin.provenance}`,
    `provenance: ${origin.note}`,
    `- الإجمالي: ${orders.length} · مفتوحة: ${openOrders.length}`,
    `- وقائية: ${orders.filter((w) => w.kind === "preventive").length} · تصحيحية: ${orders.filter((w) => w.kind === "corrective").length}`,
  ];
  // المادة ٢٧: الأولوية غير المقيسة تُعدّ وتُسمّى — لا تُطوى في «متوسط».
  const priorityUnmeasured = orders.filter((w) => w.priority == null).length;
  if (priorityUnmeasured > 0)
    lines.push(
      `- أوامر بلا أولوية في المصدر: ${priorityUnmeasured} — قل «لم تُحدَّد» لا «متوسطة».`,
    );
  const byPriority = topCounts(
    openOrders.map((w) => w.priority),
    4,
  );
  if (byPriority) lines.push(`- المفتوحة حسب الأولوية: ${byPriority}`);
  const byArea = topCounts(
    orders.map((w) => w.area_ar),
    6,
  );
  if (byArea) lines.push(`- حسب منطقة العمليات: ${byArea}`);
  const byAsset = topCounts(
    orders.map((w) => w.asset_kind),
    6,
  );
  if (byAsset) lines.push(`- حسب نوع الأصل: ${byAsset}`);
  if (openOrders.length) {
    lines.push("### أبرز أوامر العمل المفتوحة");
    lines.push(
      ...openOrders
        .slice(0, 8)
        .map(
          (w) =>
            `- ${w.ref}: ${w.title_ar} [${w.kind ?? "غير مصنّف"}/${w.priority ?? "بلا أولوية"}] — ${w.assigned_to ?? "غير موكَّل"}`,
        ),
    );
  }
  return lines;
}
