/**
 * الإجابات الفورية من بيانات النظام — أمر المالك ٢٠٢٦/٠٩/٠٢:
 * «اجعل سَدِيد يجاوب بشكل سريع جدًّا عند طرح السؤال فورًا واجعله يعطي
 * إجابات من داخل النظام كعدد المشاريع والتفاصيل وغيرها مثل الصيانة
 * والبلاغات».
 *
 * ## أين يقع هذا من المادة ٢٢ §٣
 *
 * المسار الفوري القائم (`matchFastRecall`) محصور بأسئلة الهوية الثابتة،
 * وقاعدته «الحقائق التنظيمية لا تتجاوز الاسترجاع». هذه الطبقة **ليست
 * توسيعًا لمصفوفته النصية**: أجوبتها **تُحسب من المجموعات الكنسية
 * نفسها** التي تعرضها الشاشات (697 مشروعًا · 249 أمر صيانة · 3,427
 * بلاغًا) — فلا نصّ مغروس يتعفّن حين تتغيّر البيانات، والجواب مطابق
 * للمرجع لأنه المرجع ذاته. والحقائق التنظيمية (HCIS/التوجيهات) خارجها
 * كليًّا كما تُلزم المهارة — مرجعها مسار النموذج.
 *
 * ## الدقة قبل الشمول
 *
 * سؤالٌ يُجاب هنا لا يصل النموذج، فالمطابقة الخاطئة تُسكت تحليلًا طُلب.
 * القاعدة: يُجاب فورًا **العدّ الصريح على كامل المجموعة** (كم/عدد + كيان
 * + حالة اختيارية، بلا أي قيدٍ آخر) و**سجلّ مرجعٍ حرفيّ واحد** — وكل ما
 * عداهما `null` فيسقط لمسار النموذج الذي يملك الاسترجاع الكامل. سؤالٌ
 * يحمل تحليلًا (لماذا/قارن/حلّل) أو قيدًا (موقعًا، مديرًا، مدةً) ليس
 * عدًّا صرفًا ولا يُختطف.
 *
 * ## بوابة المستأجر
 *
 * الأرقام والسجلّات هنا **إنتاجية**، والوحدة لا ترى هوية النداء — فالبوابة
 * على المستدعي: `/api/chat` لا يستشيرها إلا لنداءٍ مصادَق (`userId`)،
 * والزائر يبقى على مسار النموذج بمحاكاته الموسومة. حارسها في
 * `chat-latency.contract.test.ts`.
 */
import { REAL_PROJECT_COUNTS, REAL_SEC_PROJECTS } from "@/lib/exec/projects-report.real.server";
import {
  REAL_SEC_WORK_ORDERS,
  REAL_WORK_ORDER_COUNTS,
} from "@/lib/exec/maintenance-report.real.server";
import { REAL_INCIDENT_COUNTS } from "@/lib/exec/event-report.real.server";
import {
  formatProjectRecord,
  formatWorkOrderRecord,
  normalizeText,
} from "@/lib/sadeed/projects-maintenance-recall.server";

export type InstantDataAnswer = {
  answer: string;
  /** لقياس المصدر في الترويسة والسجلّ — لا يظهر للمستخدم. */
  source: "projects-count" | "maintenance-count" | "incidents-count" | "record-lookup";
};

/** نيّة العدّ الصريحة — «كم» أو «عدد» بصورهما المطبَّعة. */
const COUNT_INTENT = /(^|\s)(كم|عدد|اعداد|ما عدد)(\s|$)/;

/** كلمات تحليلٍ أو شرطٍ تعني أن السؤال أكبر من عدٍّ صرف — يذهب للنموذج. */
const ANALYTIC = [
  "لماذا",
  "كيف",
  "قارن",
  "مقارنه",
  "حلل",
  "تحليل",
  "اشرح",
  "اعرض",
  "رتب",
  "الاعلي",
  "الاقل",
  "الاكثر",
  "افضل",
  "اسوا",
  "توقع",
  "خطه",
  "اقترح",
];

/** الكيانات وحالاتها المسموح عدُّها فورًا — كل ما عداها يترك بقية للسؤال. */
const VOCAB = {
  project: ["مشروع", "مشروعا", "مشاريع", "المشاريع", "المشروع", "مشاريعنا", "project", "projects"],
  maintenance: [
    "صيانه",
    "الصيانه",
    "صيانات",
    "الصيانات",
    "امر",
    "اوامر",
    "عمل",
    "العمل",
    "maintenance",
  ],
  incident: [
    "بلاغ",
    "بلاغا",
    "بلاغات",
    "البلاغات",
    "البلاغ",
    "حادث",
    "حوادث",
    "الحوادث",
    "incidents",
  ],
  status: [
    "جاري",
    "جاريه",
    "الجاريه",
    "مكتمل",
    "مكتمله",
    "المكتمله",
    "ملغي",
    "ملغيه",
    "الملغاه",
    "ملغاه",
    "مفتوح",
    "مفتوحه",
    "المفتوحه",
    "مغلق",
    "مغلقه",
    "المغلقه",
    "وقائي",
    "وقائيه",
    "الوقائيه",
    "تصحيحي",
    "تصحيحيه",
    "التصحيحيه",
  ],
  filler: [
    "في",
    "لدي",
    "لدينا",
    "عندنا",
    "النظام",
    "المنظومه",
    "هو",
    "هي",
    "الان",
    "حاليا",
    "الي",
    "من",
    "يوجد",
    "هناك",
    "اجمالي",
    "الاجمالي",
    "كل",
    "جميع",
    "the",
    "of",
    "in",
    "how",
    "many",
    "total",
  ],
} as const;

// المقارنة على الصورة المطبَّعة من الجهتين: المفردات تحمل همزاتٍ وتاءً
// مربوطة كما تُكتب، والمقاطع تصل مطبَّعة — بلا تطبيع القاموس تُفلت
// «وقائية» (ئ←ي) من «وقائيه» المكتوبة. اكتُشف باختبارٍ ساقط لا بحدس.
const norm = (list: readonly string[]) => list.map((w) => normalizeText(w));
const contains = (tokens: string[], list: readonly string[]) => {
  const normalized = norm(list);
  return tokens.some((t) => normalized.includes(t));
};

/**
 * عدٌّ صرف: بعد إسقاط أدوات العدّ والكيان والحالة والحشو لا يبقى مقطعٌ
 * ذو معنى. البقية قيدٌ (موقع/مدير/مدة) لا نملك عدّه الفوري بصدق — نموذج.
 */
function isPureCountQuestion(tokens: string[], entity: readonly string[]): boolean {
  const known = new Set<string>([
    ...norm(entity),
    ...norm(VOCAB.status),
    ...norm(VOCAB.filler),
    "كم",
    "عدد",
    "اعداد",
    "ما",
  ]);
  return tokens.every((t) => known.has(t));
}

/** الكيانات التي يُجاب عدُّها فورًا — مشتركة بين المطابق العربي والموجّه الحتمي الإنجليزي. */
export type InstantCountEntity = "project" | "maintenance" | "incident";

/** الحالات المسمّاة؛ ما لا يخصّ الكيان منها يسقط إلى الإجمالي بتوزيعه. */
export type InstantCountStatus =
  "in_progress" | "completed" | "cancelled" | "open" | "closed" | "preventive" | "corrective";

/**
 * الحالة التي يسمّيها السؤال العربي لكيانٍ بعينه — بترتيب الفحص الأصلي نفسه
 * (أوّل حالةٍ تطابق تفوز)، و`null` يعني الإجمالي.
 */
function arabicStatus(entity: InstantCountEntity, tokens: string[]): InstantCountStatus | null {
  const checks: ReadonlyArray<readonly [InstantCountStatus, readonly string[]]> =
    entity === "project"
      ? [
          ["in_progress", ["جاري", "جاريه", "الجاريه"]],
          ["completed", ["مكتمل", "مكتمله", "المكتمله"]],
          ["cancelled", ["ملغي", "ملغيه", "الملغاه", "ملغاه"]],
        ]
      : entity === "maintenance"
        ? [
            ["preventive", ["وقائي", "وقائيه", "الوقائيه"]],
            ["corrective", ["تصحيحي", "تصحيحيه", "التصحيحيه"]],
            ["closed", ["مغلق", "مغلقه", "المغلقه"]],
            ["open", ["مفتوح", "مفتوحه", "المفتوحه"]],
          ]
        : [
            ["open", ["مفتوح", "مفتوحه", "المفتوحه"]],
            ["closed", ["مغلق", "مغلقه", "المغلقه"]],
          ];
  return checks.find(([, words]) => contains(tokens, words))?.[0] ?? null;
}

/**
 * جواب العدّ من العدّادات الكنسية — **المصدر الوحيد للأرقام في اللغتين**:
 * المطابق العربي هنا والموجّه الحتمي الإنجليزي (`llm/zero-cost-router.server`)
 * يقرآن الدالة نفسها، فلا رقم منسوخ يتعفّن في موضعٍ ثانٍ. حالةٌ لا تخصّ
 * الكيان تعيد الإجمالي بتوزيعه — كما كان الجواب العربي منذ البداية.
 */
export function renderInstantCount(
  entity: InstantCountEntity,
  status: InstantCountStatus | null,
  locale: "ar" | "en",
): string {
  const en = locale === "en";
  if (entity === "project") {
    const c = REAL_PROJECT_COUNTS;
    if (status === "in_progress")
      return en ? `Projects in progress: ${c.in_progress}.` : `المشاريع الجارية ${c.in_progress}.`;
    if (status === "completed")
      return en ? `Completed projects: ${c.completed}.` : `المشاريع المكتملة ${c.completed}.`;
    if (status === "cancelled")
      return en ? `Cancelled projects: ${c.cancelled}.` : `المشاريع الملغاة ${c.cancelled}.`;
    return en
      ? `Projects: ${c.total} — in progress ${c.in_progress} · completed ${c.completed} · cancelled ${c.cancelled}.`
      : `المشاريع ${c.total}: جارية ${c.in_progress} · مكتملة ${c.completed} · ملغاة ${c.cancelled}.`;
  }
  if (entity === "maintenance") {
    const c = REAL_WORK_ORDER_COUNTS;
    if (status === "preventive")
      return en
        ? `Preventive maintenance orders: ${c.preventive}.`
        : `أوامر الصيانة الوقائية ${c.preventive}.`;
    if (status === "corrective")
      return en
        ? `Corrective maintenance orders: ${c.corrective}.`
        : `أوامر الصيانة التصحيحية ${c.corrective}.`;
    if (status === "closed")
      return en ? `Closed maintenance orders: ${c.closed}.` : `أوامر الصيانة المغلقة ${c.closed}.`;
    if (status === "open")
      return en
        ? `Maintenance orders not closed: ${c.open + c.in_progress} — in progress ${c.in_progress} · open ${c.open}.`
        : `أوامر الصيانة غير المغلقة ${c.open + c.in_progress}: قيد التنفيذ ${c.in_progress} · مفتوحة ${c.open}.`;
    return en
      ? `Maintenance work orders: ${c.total} — closed ${c.closed} · in progress ${c.in_progress} · open ${c.open}.`
      : `أوامر الصيانة ${c.total}: مغلقة ${c.closed} · قيد التنفيذ ${c.in_progress} · مفتوحة ${c.open}.`;
  }
  const c = REAL_INCIDENT_COUNTS;
  if (status === "open") return en ? `Open incidents: ${c.open}.` : `البلاغات المفتوحة ${c.open}.`;
  if (status === "closed")
    return en ? `Closed incidents: ${c.closed}.` : `البلاغات المغلقة ${c.closed}.`;
  return en
    ? `Incidents: ${c.total} — open ${c.open} · closed ${c.closed}.`
    : `البلاغات ${c.total}: مفتوحة ${c.open} · مغلقة ${c.closed}.`;
}

/** مرجع SAP لأمر صيانة — النسق الحرفي للمجموعة المستوردة. */
const SAP_ORDER = /\b(66000\d{6})\b/;

/**
 * سؤال مرجعٍ حرفيّ: يحمل مرجعًا موجودًا فعلًا في المجموعة، وبقية السؤال
 * استفهام حالة/تفاصيل لا تحليل. الجواب سجلّه الكامل (≤٥ أسطر — درجة
 * «معقّد» في عقد الاختصار، والمرجع المسؤول عنها).
 */
function matchRecordLookup(raw: string, normalized: string): InstantDataAnswer | null {
  const sap = SAP_ORDER.exec(normalized);
  if (sap) {
    const order = REAL_SEC_WORK_ORDERS.find((w) => w.ref === sap[1]);
    if (order) return { answer: formatWorkOrderRecord(order), source: "record-lookup" };
  }
  // مراجع المشاريع (مثل NG-PSS-23-CO-002): مطابقة حرفية ضد المجموعة —
  // لا نمط عام قد يلتقط ما ليس مرجعًا.
  const upper = raw.toUpperCase();
  if (/[A-Z]\w*-/.test(upper)) {
    const project = REAL_SEC_PROJECTS.find((p) => upper.includes(p.ref.toUpperCase()));
    if (project) return { answer: formatProjectRecord(project), source: "record-lookup" };
  }
  return null;
}

/**
 * المدخل الوحيد — `null` يعني: ليس سؤالًا فوريًّا، أكمل لمسار النموذج.
 * **لا يُستدعى إلا لنداءٍ مصادَق** (بوابة المستأجر في `/api/chat`).
 */
export function matchInstantDataAnswer(question: string): InstantDataAnswer | null {
  const trimmed = question.trim();
  if (!trimmed || trimmed.length > 220) return null;
  const normalized = normalizeText(trimmed);
  const tokens = normalized.split(/[^\p{L}\p{N}-]+/u).filter((t) => t.length >= 2);
  if (tokens.some((t) => ANALYTIC.includes(t))) return null;

  const record = matchRecordLookup(trimmed, normalized);
  if (record) return record;

  if (!COUNT_INTENT.test(` ${normalized} `)) return null;
  if (contains(tokens, VOCAB.project) && isPureCountQuestion(tokens, VOCAB.project)) {
    const answer = renderInstantCount("project", arabicStatus("project", tokens), "ar");
    return { answer, source: "projects-count" };
  }
  if (contains(tokens, VOCAB.incident) && isPureCountQuestion(tokens, VOCAB.incident)) {
    const answer = renderInstantCount("incident", arabicStatus("incident", tokens), "ar");
    return { answer, source: "incidents-count" };
  }
  if (contains(tokens, VOCAB.maintenance) && isPureCountQuestion(tokens, VOCAB.maintenance)) {
    const answer = renderInstantCount("maintenance", arabicStatus("maintenance", tokens), "ar");
    return { answer, source: "maintenance-count" };
  }
  return null;
}
