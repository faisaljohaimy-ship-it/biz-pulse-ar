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
 * ## لكل نداء — والبوابة نُسخت
 *
 * وُلدت الطبقة خلف بوابة `userId` في `/api/chat`، **ونسخها المالك
 * ٢٠٢٦/٠٩/٠٣** («البيانات الإنتاجية المعكوسة وليست المحاكاة»): المجموعات
 * نفسها معروضة للزائر في الشاشات المفتوحة. وهي لا تنفق نموذجًا ولا تقرأ
 * قاعدة، فتُجيب **حتى حين يتعذّر مخزن الحدّ** والسياسة مغلقة (DEF-10،
 * ٢٠٢٦/١٠/١٨). حارسها في `chat-latency.contract.test.ts`.
 *
 * ## لقطةٌ لا قراءةٌ حيّة — والتاريخ في الجواب (DEF-18)
 *
 * الأرقام من تصديرٍ معتمد، لا من القاعدة الحيّة؛ فكل جوابٍ يحمل «حسب التصدير
 * المعتمد في <التاريخ>» — رقمٌ بلا تاريخ يُقرأ حالًا، وهو ليس كذلك. والتاريخ تاريخ
 * اعتماد المالك للتصدير، لا تاريخ استخراجه (غير مسجّل) — فالعبارة «المعتمد في» لا
 * «تصدير <التاريخ>» (ملاحظة الحارس ٦ على c3444ef6d). وأوامر
 * PLAN في تصدير الصيانة **ملغاة** لا مفتوحة (الخريطة المصحَّحة في
 * `sap-export-rules.ts`: أُغلقت في SAP دون إنجاز وعليها علامة حذف)، والملف
 * المضمَّن سبق التصحيح فسمّاها `open` — كما يقرؤها بديل صفحة الصيانة.
 */
import {
  PROJECTS_REPORT_DATE,
  REAL_PROJECT_COUNTS,
  REAL_SEC_PROJECTS,
} from "@/lib/exec/projects-report.real.server";
import {
  MAINTENANCE_REPORT_DATE,
  REAL_SEC_WORK_ORDERS,
  REAL_WORK_ORDER_COUNTS,
} from "@/lib/exec/maintenance-report.real.server";
import { EVENT_REPORT_DATE, REAL_INCIDENT_COUNTS } from "@/lib/exec/event-report.real.server";
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
 * الحالة التي يسمّيها السؤال العربي لكيانٍ بعينه — أوّل حالةٍ تطابق تفوز، بترتيب الفحص
 * المعتمد لكل كيان، و`null` يعني الإجمالي.
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
            ["cancelled", ["ملغي", "ملغيه", "الملغاه", "ملغاه"]],
            ["closed", ["مغلق", "مغلقه", "المغلقه"]],
            ["completed", ["مكتمل", "مكتمله", "المكتمله"]],
            ["open", ["مفتوح", "مفتوحه", "المفتوحه", "جاري", "جاريه", "الجاريه"]],
          ]
        : [
            ["open", ["مفتوح", "مفتوحه", "المفتوحه"]],
            ["closed", ["مغلق", "مغلقه", "المغلقه"]],
          ];
  return checks.find(([, words]) => contains(tokens, words))?.[0] ?? null;
}

/**
 * «حسب التصدير المعتمد في <التاريخ>» على سطر الجواب نفسه — اللقطة تُقرأ بتاريخها لا حالًا
 * (DEF-18)؛ وبالإنجليزية العبارة نفسها.
 */
const asOf = (line: string, date: string, en: boolean) =>
  en
    ? `${line} — per the approved export of ${date}.`
    : `${line} — حسب التصدير المعتمد في ${date}.`;

/** PLAN في الملف المضمَّن (`status: "open"`) ملغاة — رأس الوحدة؛ فالمفتوح فعلًا قيد التنفيذ وحده. */
const WO_CANCELLED = REAL_WORK_ORDER_COUNTS.open;
const WO_CANCELLED_PREVENTIVE = REAL_SEC_WORK_ORDERS.filter(
  (w) => w.status === "open" && w.kind === "preventive",
).length;

/**
 * جواب العدّ من العدّادات الكنسية — **المصدر الوحيد للأرقام في اللغتين**:
 * المطابق العربي هنا والموجّه الحتمي الإنجليزي (`llm/zero-cost-router.server`)
 * يقرآن الدالة نفسها، فلا رقم منسوخ يتعفّن في موضعٍ ثانٍ. حالةٌ لا تخصّ
 * الكيان تعيد الإجمالي بتوزيعه.
 */
export function renderInstantCount(
  entity: InstantCountEntity,
  status: InstantCountStatus | null,
  locale: "ar" | "en",
): string {
  const en = locale === "en";
  if (entity === "project") {
    const c = REAL_PROJECT_COUNTS;
    const line =
      status === "in_progress"
        ? en
          ? `Projects in progress: ${c.in_progress}`
          : `المشاريع الجارية ${c.in_progress}`
        : status === "completed"
          ? en
            ? `Completed projects: ${c.completed}`
            : `المشاريع المكتملة ${c.completed}`
          : status === "cancelled"
            ? en
              ? `Cancelled projects: ${c.cancelled}`
              : `المشاريع الملغاة ${c.cancelled}`
            : en
              ? `Projects: ${c.total} — in progress ${c.in_progress} · completed ${c.completed} · cancelled ${c.cancelled}`
              : `المشاريع ${c.total}: جارية ${c.in_progress} · مكتملة ${c.completed} · ملغاة ${c.cancelled}`;
    return asOf(line, PROJECTS_REPORT_DATE, en);
  }
  if (entity === "maintenance") {
    const c = REAL_WORK_ORDER_COUNTS;
    const line =
      status === "preventive"
        ? en
          ? `Preventive maintenance orders: ${c.preventive}, of which ${WO_CANCELLED_PREVENTIVE} cancelled`
          : `أوامر الصيانة الوقائية ${c.preventive}، منها ${WO_CANCELLED_PREVENTIVE} ملغاة`
        : status === "corrective"
          ? en
            ? `Corrective maintenance orders: ${c.corrective}`
            : `أوامر الصيانة التصحيحية ${c.corrective}`
          : status === "cancelled"
            ? en
              ? `Cancelled maintenance orders: ${WO_CANCELLED}`
              : `أوامر الصيانة الملغاة ${WO_CANCELLED}`
            : status === "closed"
              ? en
                ? `Closed maintenance orders: ${c.closed + WO_CANCELLED} — completed ${c.closed} · cancelled ${WO_CANCELLED}`
                : `أوامر الصيانة المغلقة ${c.closed + WO_CANCELLED}: مكتملة ${c.closed} · ملغاة ${WO_CANCELLED}`
              : status === "completed"
                ? en
                  ? `Completed maintenance orders: ${c.closed}`
                  : `أوامر الصيانة المكتملة ${c.closed}`
                : status === "open" || status === "in_progress"
                  ? en
                    ? `Open maintenance orders: ${c.in_progress}, all in progress`
                    : `أوامر الصيانة المفتوحة ${c.in_progress}، كلّها قيد التنفيذ`
                  : en
                    ? `Maintenance work orders: ${c.total} — completed ${c.closed} · in progress ${c.in_progress} · cancelled ${WO_CANCELLED}`
                    : `أوامر الصيانة ${c.total}: مكتملة ${c.closed} · قيد التنفيذ ${c.in_progress} · ملغاة ${WO_CANCELLED}`;
    return asOf(line, MAINTENANCE_REPORT_DATE, en);
  }
  const c = REAL_INCIDENT_COUNTS;
  const line =
    status === "open"
      ? en
        ? `Open incidents: ${c.open}`
        : `البلاغات المفتوحة ${c.open}`
      : status === "closed"
        ? en
          ? `Closed incidents: ${c.closed}`
          : `البلاغات المغلقة ${c.closed}`
        : en
          ? `Incidents: ${c.total} — open ${c.open} · closed ${c.closed}`
          : `البلاغات ${c.total}: مفتوحة ${c.open} · مغلقة ${c.closed}`;
  return asOf(line, EVENT_REPORT_DATE, en);
}

/** مرجع SAP لأمر صيانة — النسق الحرفي للمجموعة المستوردة. */
const SAP_ORDER = /\b(66000\d{6})\b/;

/**
 * قيم السجلّ كما تُقرأ في جوابٍ بلا نموذج: لا مفتاحٌ إنجليزي خام، و`open` المضمَّنة
 * (PLAN) «ملغى» على الخريطة المصحَّحة — لا «مفتوح» يناقض صفحة الصيانة.
 */
const WO_STATUS_SHOWN: Record<string, string> = {
  closed: "مُنجَز",
  in_progress: "قيد التنفيذ",
  open: "ملغى (أُغلق في SAP دون إنجاز)",
};
const WO_KIND_SHOWN: Record<string, string> = { preventive: "وقائية", corrective: "تصحيحية" };
const WO_PRIORITY_SHOWN: Record<string, string> = { high: "عالٍ", medium: "متوسط" };
/** أنواع الأصل في التصدير بعربيّة `WO_ASSET_KIND_AR` نفسها (الحارس يقارنهما) — لا مفتاح خام. */
const WO_ASSET_KIND_SHOWN: Record<string, string> = {
  cctv: "كاميرات المراقبة",
  access_control: "تحكم بالدخول",
  perimeter: "محيط أمني",
  control_room: "غرفة التحكم",
  physical_security: "الأمن المادي",
  facility: "منشأة",
};

/**
 * المصدر على السطر الأوّل لا سطرًا سادسًا: السجلّ «معقّد ← ٥ أسطر» في عقد الاختصار (المادة ٢٢،
 * نقض الحارس N2). والسجلّ نفسه من المُنسِّق المشترك مع كتلة الاسترجاع، فلا يُمسّ.
 */
const withSource = (record: string, source: string) => {
  const [first, ...rest] = record.split("\n");
  return [`${first} · ${source}`, ...rest].join("\n");
};

/**
 * سؤال مرجعٍ حرفيّ: يحمل مرجعًا موجودًا فعلًا في المجموعة، وبقية السؤال
 * استفهام حالة/تفاصيل لا تحليل. الجواب سجلّه الكامل ومصدره على سطره الأوّل (≤٥ أسطر —
 * درجة «معقّد» في عقد الاختصار، والمرجع المسؤول عنها).
 */
function matchRecordLookup(raw: string, normalized: string): InstantDataAnswer | null {
  const sap = SAP_ORDER.exec(normalized);
  if (sap) {
    const order = REAL_SEC_WORK_ORDERS.find((w) => w.ref === sap[1]);
    if (order) {
      const shown = {
        ...order,
        status: WO_STATUS_SHOWN[order.status] ?? order.status,
        kind: order.kind ? (WO_KIND_SHOWN[order.kind] ?? order.kind) : order.kind,
        priority: order.priority
          ? (WO_PRIORITY_SHOWN[order.priority] ?? order.priority)
          : order.priority,
        asset_kind: order.asset_kind
          ? (WO_ASSET_KIND_SHOWN[order.asset_kind] ?? order.asset_kind)
          : order.asset_kind,
      };
      return {
        answer: withSource(
          formatWorkOrderRecord(shown),
          `تصدير SAP PM المعتمد في ${MAINTENANCE_REPORT_DATE}`,
        ),
        source: "record-lookup",
      };
    }
  }
  // مراجع المشاريع (مثل NG-PSS-23-CO-002): مطابقة حرفية ضد المجموعة —
  // لا نمط عام قد يلتقط ما ليس مرجعًا.
  const upper = raw.toUpperCase();
  if (/[A-Z]\w*-/.test(upper)) {
    const project = REAL_SEC_PROJECTS.find((p) => upper.includes(p.ref.toUpperCase()));
    if (project) {
      return {
        answer: withSource(
          formatProjectRecord(project),
          `تصدير المشاريع المعتمد في ${PROJECTS_REPORT_DATE}`,
        ),
        source: "record-lookup",
      };
    }
  }
  return null;
}

/**
 * المدخل الوحيد — `null` يعني: ليس سؤالًا فوريًّا، أكمل لمسار النموذج.
 * يُستشار لكل نداء، وحين تكون البوّابة مغلقة أيضًا (رأس الوحدة).
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
