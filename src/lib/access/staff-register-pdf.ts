/**
 * تصدير سجلّ الدخول إلى PDF — بناء الوثيقة هنا، والرسم في `pdf-rich`.
 *
 * ## لماذا بناء الوثيقة منفصلٌ عن رسمها
 *
 * `renderReportPdf` يحتاج متصفّحًا وخطوطًا ويعيد Blob — فلا يُختبر بالمساواة.
 * أمّا **ما يدخل الجدول** (الأعمدة، ترتيب الصفوف، صيغة التاريخ، ما يُكتب
 * حين لا يُقاس شيء) فمنطقٌ خالص، وهو موضع الخطأ الفعليّ. ففُصل ليُختبر.
 *
 * ## والأرقام لاتينية في الملفّ كما في الشاشة
 *
 * الرقم الوظيفي مُطبَّع إلى اللاتينية عند الحفظ (`normalizeStaffNumber`)،
 * فكتابته هنا بالهندية تجعل ما في الـPDF غير قابلٍ للمطابقة مع ما في
 * القاعدة — وهو أوّل ما يُفعل بسجلٍّ مطبوع.
 *
 * ## ولا شارة محاكاة — ولا محاكاة أصلًا
 *
 * `isSimulation: false` دائمًا، لأن هذا السجلّ لا يُصدَّر إلا من صفوفٍ
 * حقيقية: الواجهة تمنع التصدير حين يكون السجلّ غير مفعَّل. ووثيقةٌ تحمل
 * شارة «محاكاة» في سجلّ دخولٍ تناقضٌ في ذاتها.
 */
import type { ReportDocument } from "@/lib/reports/pdf-rich";
import type { StaffEntry } from "./staff-entry";
import { REGIONS } from "@/lib/regions";
import type { AccessPeriod } from "./staff-period";

/** توقيت العرض الموحَّد للمنتج. */
const TZ = "Asia/Riyadh";

const stamp = new Intl.DateTimeFormat("en-GB-u-nu-latn", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: TZ,
  numberingSystem: "latn",
});

/**
 * «2026-09-20 14:35» — تاريخٌ ثم وقت، بأرقام لاتينية وبتوقيت الرياض.
 *
 * `en-GB` يعطي «20/09/2026, 14:35»؛ يُعاد ترتيبه إلى ISO-like لأن الفرز
 * النصّي عليه يطابق الفرز الزمني، وهو ما يُفعل بجدولٍ مطبوع.
 */
export function formatEntryStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const parts = stamp.formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

export interface StaffRegisterDocInput {
  readonly rows: readonly StaffEntry[];
  readonly period: AccessPeriod;
  /** لحظة التصدير — تُكتب في الوثيقة. */
  readonly generatedAt?: Date;
  /** بلغت القراءة سقفها ⇒ يُعلن في الوثيقة لا يُسكت عنه. */
  readonly truncated?: boolean;
}

/** عدد الأرقام الوظيفية المتمايزة في مجموعة صفوف. */
export function distinctStaffCount(rows: readonly StaffEntry[]): number {
  return new Set(rows.map((r) => r.staff_number)).size;
}

/**
 * يبني وثيقة التقرير جاهزةً لـ`renderReportPdf`.
 *
 * الصفوف تُكتب **بالترتيب الوارد** — الواجهة هي من يقرّر الفرز، فيطابق
 * الملفُّ ما رآه المصدِّر على الشاشة. وملفٌّ يعيد ترتيب نفسه يجعل ما
 * يُطبع غير ما يُراجَع.
 */
export function buildStaffRegisterDoc(input: StaffRegisterDocInput): ReportDocument {
  const { rows, period, truncated = false } = input;
  const generatedAt = input.generatedAt ?? new Date();

  const summary =
    rows.length === 0
      ? "لا دخول مسجَّل في هذه الدورة."
      : `${rows.length} دخولًا لـ${distinctStaffCount(rows)} رقمًا وظيفيًّا.`;

  return {
    title: "سجلّ الدخول بالرقم الوظيفي",
    subtitle: period.labelAr,
    dateKey: generatedAt.toISOString().slice(0, 10),
    isSimulation: false,
    sections: [
      {
        title: "ملخّص الدورة",
        blocks: [
          {
            kind: "kpi-grid",
            items: [
              { label: "عدد مرّات الدخول", value: rows.length },
              { label: "أرقام وظيفية متمايزة", value: distinctStaffCount(rows) },
            ],
          },
          { kind: "prose", text: summary },
          // الصدق العدديّ: السجلّ يُثبت تصريحًا لا هوية، وطباعتُه تُغري
          // بقراءته إثباتًا. فالتحفّظ مكتوبٌ في الملفّ نفسه لا في الشاشة
          // وحدها — الورقة تُتداول بعد أن تُغلق الصفحة.
          {
            kind: "callout",
            tone: "warning",
            title: "حدود هذا السجلّ",
            text:
              "الرقم الوظيفي يُكتب يدويًّا عند الدخول ولا يُقارن بسجلّ الموظفين ولا يمنح صلاحية. " +
              "فالسجلّ يُثبت أن أحدًا صرّح بهذا الرقم في هذا الوقت — لا أن صاحبه هو من دخل.",
          },
          ...(truncated
            ? [
                {
                  kind: "callout" as const,
                  tone: "danger" as const,
                  title: "قائمة ناقصة",
                  text: "بلغت القراءة سقفها في هذه الدورة، فالصفوف أدناه ليست كلّ الدخول المسجَّل.",
                },
              ]
            : []),
        ],
      },
      {
        title: "تفصيل الدخول",
        blocks: [
          {
            kind: "table",
            columns: [
              { header: "الرقم الوظيفي", key: "staff_number", weight: 1.1, align: "right" },
              { header: "التاريخ والوقت", key: "at", weight: 1.4, align: "right" },
              { header: "المنطقة", key: "region", weight: 0.9, align: "right" },
              { header: "الوجهة", key: "path", weight: 1.3, align: "left" },
            ],
            rows: rows.map((r) => ({
              staff_number: r.staff_number,
              at: formatEntryStamp(r.entered_at),
              region: regionLabel(r.region),
              path: r.path || "/",
            })),
            note: `أُنشئ في ${formatEntryStamp(generatedAt.toISOString())} — بتوقيت الرياض.`,
          },
        ],
      },
    ],
  };
}

/**
 * اسم المنطقة العربي القصير، أو «—» لصفٍّ سابقٍ للحقل.
 *
 * لا يُملأ الفراغ بالافتراضي: صفٌّ دخل قبل وجود الاختيار لم تُعرف منطقته،
 * وكتابة «الوسطى» فيه إسنادٌ لم يقع.
 */
export function regionLabel(id: string | null | undefined): string {
  return REGIONS.find((r) => r.id === id)?.shortAr ?? "—";
}

/** اسم الملفّ المُنزَّل — يحمل الدورة فلا تختلط ملفّات نصفين. */
export function staffRegisterFileName(period: AccessPeriod): string {
  return `staff-access-${period.key}.pdf`;
}
