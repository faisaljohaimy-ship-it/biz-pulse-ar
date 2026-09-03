/**
 * استرجاع سجلّات المشاريع والصيانة بحسب السؤال — أمر المالك ٢٠٢٦/٠٩/٠١:
 * «اجعل الوكلاء وسَدِيد يعلمون ويحفظون ما يتم تسجيله في **جميع** المشاريع
 * و**جميع** الصيانات … ليرد الشات بوت **بجميع ما يُطلب**».
 *
 * ## لماذا استرجاعٌ لا حشو
 *
 * الخلاصة الدائمة (`projects-maintenance-context`) تعطي العدّادات وأبرز
 * المتعثّر — لكنها لا تجيب «من مدير NG-PSS-23-CO-002؟» عن مشروعٍ خارج
 * قوائمها. وحشو الـ697 سجلًّا كاملةً في كل دورة ≈ 97 ألف حرف: يتجاوز سقف
 * الكتلة (48k)، ويدفن السؤال في ركام، والنماذج تسوء في التقاط الإبرة من
 * كومةٍ بهذا الحجم — فيصير «يحفظ كل شيء» عمليًّا «لا يجد شيئًا».
 *
 * فالتصميم: **المجموعة كلُّها محفوظة في الخادم وقابلة للنداء**، وكل دورةٍ
 * تُحقن بالسجلّات الكاملة لما يمسّه السؤال وحده. «جميع ما يُطلب» تتحقّق
 * حرفيًّا — أيّ مشروعٍ من الـ697 يُسأل عنه يصل سجلُّه كاملًا — بلا دفع
 * ثمن الـ696 الباقية في كل سؤال.
 *
 * ## المطابقة حتمية لا دلالية
 *
 * مطابقةُ رموزٍ ومقاطع (مرجع · اسم · موقع · منطقة · مدير · نظام · حالة ·
 * رقم مرحلة) لا تضمينات: تعمل بلا مفتاح مزوّد، ونتيجتها قابلة للاختبار
 * بالمساواة، ولا تُخطئ مرجعًا حرفيًّا أبدًا — والسؤال التشغيلي غالبًا
 * يحمل مرجعًا أو موقعًا حرفيًّا.
 *
 * ## والعدّ قبل القصّ
 *
 * «كم مشروعًا في القصيم؟» تحتاج **عدد** المطابقات لا أوّلها. فالكتلة تصرّح
 * بالعدد الكلي وتوزيع الحالات على **كل** المطابقات، ثم تعرض أوّل 12 سجلًّا
 * — فالعدّ دقيق ولو قُصّ العرض.
 */
import type { SecProject } from "@/lib/sec.functions";

export type RecallWorkOrder = {
  ref: string;
  title_ar: string;
  kind?: string | null;
  priority?: string | null;
  status: string;
  assigned_to?: string | null;
  site_id?: string | null;
  opened_at?: string | null;
  due_at?: string | null;
  /** تحملها مجموعة تصدير SAP المستوردة (٢٠٢٦/٠٩/٠٢) — رمز الموقع الوظيفي
   * والمنطقة والملاحظات (المنشئ والمعدّة والتكاليف) تدخل المطابقة والعرض. */
  asset_kind?: string | null;
  asset_code?: string | null;
  area_ar?: string | null;
  notes?: string | null;
};

/** تطبيع عربي/لاتيني: همزات وتاء مربوطة وياء، وحذف التشكيل والتطويل. */
export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[ً-ْـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي");
}

/** مقاطع السؤال — أرقامٌ ومراجع تبقى، وكلمات الوصل تسقط بطولها. */
export function tokenize(question: string): string[] {
  return normalizeText(question)
    .split(/[^\p{L}\p{N}-]+/u)
    .filter((t) => t.length >= 2);
}

/** كلماتٌ لا تميّز مشروعًا عن آخر فلا تُحتسب مطابقةً. */
const STOP = new Set([
  "في",
  "من",
  "عن",
  "ما",
  "هل",
  "كم",
  "متي",
  "اين",
  "الذي",
  "التي",
  "علي",
  "الي",
  "مشروع",
  "مشاريع",
  "المشروع",
  "المشاريع",
  "صيانه",
  "الصيانه",
  "امر",
  "اوامر",
  "عمل",
  "حاله",
  "the",
  "of",
  "at",
  "in",
  "for",
  "project",
  "projects",
]);

function scoreAgainst(tokens: string[], fields: (string | null | undefined)[]): number {
  const hay = normalizeText(fields.filter(Boolean).join("  "));
  let score = 0;
  for (const t of tokens) {
    if (STOP.has(t)) continue;
    // المطابقة جزئية (`includes`)، ومقطعٌ من حرفين يقع داخل الكلمات وقوعًا
    // عرضيًّا («هي» داخل «تنبيهات») — فلا يُحتسب إلا ما بلغ ثلاثة أحرف أو
    // حمل رقمًا. انكشف حين صار مجمع الصيانة الإنتاجي (بملاحظاته الغنية)
    // يطابق سؤالًا أجنبيًّا عن المجموعة.
    if (t.length < 3 && !/\d/.test(t)) continue;
    if (!hay.includes(t)) continue;
    // المرجع أثقل من الكلمة: مقطعٌ يحمل أرقامًا وواصلات شبه مؤكّد أنه
    // مرجعٌ أو رقم مرحلة، ومطابقته وحدها تكفي لجلب السجلّ.
    score += /\d/.test(t) ? 6 : t.length >= 4 ? 2 : 1;
  }
  return score;
}

export type ProjectRecallHit = { project: SecProject; score: number };

/** كل المطابقات مرتّبةً — العدّ على كاملها والعرض يقصّه المتّصل. */
export function findProjectsForQuestion(
  question: string,
  projects: readonly SecProject[],
): ProjectRecallHit[] {
  const tokens = tokenize(question);
  if (tokens.length === 0) return [];
  const hits: ProjectRecallHit[] = [];
  for (const p of projects) {
    const score = scoreAgainst(tokens, [
      p.ref,
      p.name_ar,
      p.name_en,
      p.kind,
      p.status,
      p.manager,
      p.area_ar,
      p.location_ar,
      p.business_ar,
    ]);
    if (score > 0) hits.push({ project: p, score });
  }
  return hits.sort((a, b) => b.score - a.score || a.project.ref.localeCompare(b.project.ref));
}

export function findWorkOrdersForQuestion(
  question: string,
  orders: readonly RecallWorkOrder[],
): Array<{ order: RecallWorkOrder; score: number }> {
  const tokens = tokenize(question);
  if (tokens.length === 0) return [];
  const hits: Array<{ order: RecallWorkOrder; score: number }> = [];
  for (const w of orders) {
    const score = scoreAgainst(tokens, [
      w.ref,
      w.title_ar,
      w.kind,
      w.priority,
      w.status,
      w.assigned_to,
      w.asset_kind,
      w.asset_code,
      w.area_ar,
      w.notes,
    ]);
    if (score > 0) hits.push({ order: w, score });
  }
  return hits.sort((a, b) => b.score - a.score || a.order.ref.localeCompare(b.order.ref));
}

const STATUS_AR: Record<string, string> = {
  "in-progress": "جارٍ",
  completed: "مكتمل",
  cancelled: "ملغى",
  planned: "مخطَّط",
  "on-hold": "متوقّف",
};

/** السجلّ الكامل لمشروعٍ واحد — كل حقلٍ يحمله الصفّ، والغائب «لم يُحدَّد». */
export function formatProjectRecord(p: SecProject): string {
  const health =
    p.health === "red"
      ? "معرَّض للخطر"
      : p.health === "amber"
        ? "متأخّر"
        : p.health === "green"
          ? "سليم"
          : "لم تُقَس";
  return [
    `- ${p.ref} | ${p.name_ar}`,
    `  الحالة: ${STATUS_AR[p.status] ?? p.status} · الإنجاز: ${p.progress}% · الصحّة: ${health}`,
    `  النظام: ${p.kind} · المنطقة: ${p.area_ar ?? "لم تُحدَّد"} · الموقع: ${p.location_ar ?? "لم يُحدَّد"} · خطّ الأعمال: ${p.business_ar ?? "لم يُحدَّد"}`,
    `  المدير: ${p.manager ?? "لم يُحدَّد"} · المقاول: ${p.contractor ?? "لا عمود له في المصدر"}`,
    `  البداية: ${p.starts_at ?? "لم تُحدَّد"} · النهاية: ${p.ends_at ?? "لم تُحدَّد"} · الميزانية: ${p.budget_sar ? p.budget_sar.toLocaleString("en-US") : "0"} · المصروف: ${p.spent_sar ? p.spent_sar.toLocaleString("en-US") : "0"}`,
  ].join("\n");
}

export function formatWorkOrderRecord(w: RecallWorkOrder): string {
  const lines = [
    `- ${w.ref} | ${w.title_ar}`,
    // «لم تُحدَّد» لا «بلا أولوية»: تصدير SAP يترك الحقل فارغًا، والفراغ
    // غيابُ قياسٍ لا حكمًا بانعدام الأولوية (المادة ٢٧).
    `  الحالة: ${w.status} · النوع: ${w.kind ?? "غير مصنّف"} · الأولوية: ${w.priority ?? "لم تُحدَّد"} · الموكَّل: ${w.assigned_to ?? "لم يُحدَّد في المصدر"}`,
    `  فُتح: ${w.opened_at ?? "لم يُحدَّد"} · الاستحقاق: ${w.due_at ?? "لم يُحدَّد"}`,
  ];
  const place = [
    w.area_ar ? `المنطقة: ${w.area_ar}` : null,
    w.asset_kind ? `الأصل: ${w.asset_kind}` : null,
    w.asset_code ? `الموقع الوظيفي: ${w.asset_code}` : null,
  ].filter(Boolean);
  if (place.length) lines.push(`  ${place.join(" · ")}`);
  if (w.notes) lines.push(`  ${w.notes}`);
  return lines.join("\n");
}

const MAX_SHOWN = 12;

/**
 * كتلة الاسترجاع لدورةٍ واحدة — تُبنى فقط حين يمسّ السؤالُ شيئًا.
 * `provenance` يمرّره المتّصل: الوسم يتبع المصدر لا هذه الدالّة — واليوم
 * (بعد أمر ٢٠٢٦/٠٩/٠٣) كل المجمعات إنتاجية `[PROD:*]`، أو صفوف القاعدة
 * الحيّة `[PROD:WORK_ORDERS]` حين تمتلئ.
 */
export function buildRecallBlock(
  question: string,
  projects: readonly SecProject[],
  orders: readonly RecallWorkOrder[],
  provenance: { projects: string; maintenance: string },
): string {
  const trimmed = question.trim();
  if (!trimmed) return "";
  const projectHits = findProjectsForQuestion(trimmed, projects);
  const orderHits = findWorkOrdersForQuestion(trimmed, orders);
  if (projectHits.length === 0 && orderHits.length === 0) return "";

  const parts: string[] = [
    "# سجلّات مطابقة للسؤال — كاملةُ الحقول",
    "المجموعة الكاملة محفوظة في الخادم؛ ما يلي سجلّات ما مسّه هذا السؤال" +
      " تحديدًا. العدّ الكلي مُصرَّح به قبل القصّ، فاعتمده في أسئلة «كم».",
  ];

  if (projectHits.length) {
    const all = projectHits.map((h) => h.project);
    const byStatus = (s: string) => all.filter((p) => p.status === s).length;
    parts.push(
      `## مشاريع مطابقة ${provenance.projects}`,
      `المطابقات الكلية: ${all.length} — جارية ${byStatus("in-progress")} · مكتملة ${byStatus("completed")} · ملغاة ${byStatus("cancelled")}${
        all.length > MAX_SHOWN ? ` — المعروض أوّل ${MAX_SHOWN} بحسب قوّة المطابقة` : ""
      }`,
      ...projectHits.slice(0, MAX_SHOWN).map((h) => formatProjectRecord(h.project)),
    );
  }
  if (orderHits.length) {
    parts.push(
      `## أوامر صيانة مطابقة ${provenance.maintenance}`,
      `المطابقات الكلية: ${orderHits.length}${orderHits.length > MAX_SHOWN ? ` — المعروض أوّل ${MAX_SHOWN}` : ""}`,
      ...orderHits.slice(0, MAX_SHOWN).map((h) => formatWorkOrderRecord(h.order)),
    );
  }
  return parts.join("\n");
}
