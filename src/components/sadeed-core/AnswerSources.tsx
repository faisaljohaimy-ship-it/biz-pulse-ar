import { useSadeedStore } from "@/lib/sadeed-core/store";
import { readAnswerSources } from "./answer-sources";

const COPY = {
  ar: {
    title: "مصادر الإجابة وكيف أُعدّت",
    missing: "المصادر غير مرفقة أو غير صالحة.",
    cited: "مستشهَد بها — الوسم في الإجابة",
    retrieved: "مسترجعة — دون وسم في الإجابة",
    uncertain: "الاستشهاد غير محدد",
    none: "لا مراجع للعرض؛ قد توجد مصادر.",
    caveat: "الوسم لا يثبت الدقة أو اعتماد الوثيقة.",
    bounded: "عرض جزئي للبيانات.",
    unknownFields: [
      "المنطقة والموقع",
      "الفترة",
      "تحديث المصدر",
      "المعتمد المخوّل",
      "الموثق/المستنتج/المفقود",
    ],
    unknown: "غير مرفق",
    simulation: "محاكاة وفق بيانات الإجابة",
    insufficient: "البيانات: أدلة غير كافية",
    approval: "يلزم اعتماد؛ العرض لا يمنح صلاحية.",
    receipt: "إيصال مرفق؛ صحته غير متحققة.",
    noReceipt: "الإيصال غير مرفق؛ الأدوات قد تكون عملت.",
    tools: "حالات الأدوات المرفقة",
    noTools: "حالات الأدوات غير مرفقة.",
    unverified: "سياق غير موثق — العدد المبلّغ",
    states: {
      "input-streaming": "إعداد الطلب",
      "input-available": "طلب متاح؛ التنفيذ غير مثبت",
      "output-available": "مخرج؛ النجاح غير مثبت",
      "output-error": "خطأ مسجل",
    },
  },
  en: {
    title: "Answer sources and preparation",
    missing: "Source metadata missing or invalid.",
    cited: "Cited — tag in answer",
    retrieved: "Retrieved — tag absent",
    uncertain: "Citation unknown",
    none: "No references shown; sources may exist.",
    caveat: "Tags prove neither accuracy nor document approval.",
    bounded: "Limited view; metadata may be omitted.",
    unknownFields: [
      "Region/site",
      "Period",
      "Source updated",
      "Authorized approver",
      "Documented/inferred/missing",
    ],
    unknown: "Not provided",
    simulation: "Metadata: simulation",
    insufficient: "Metadata: insufficient evidence",
    approval: "Needs approval; view grants no authority.",
    receipt: "Receipt attached; authenticity unverified.",
    noReceipt: "No receipt; tools may have run.",
    tools: "Attached tool states",
    noTools: "Tool states not provided.",
    unverified: "Reported unverified items",
    states: {
      "input-streaming": "Preparing request",
      "input-available": "Request ready; execution unproven",
      "output-available": "Output; success unproven",
      "output-error": "Recorded error",
    },
  },
} as const;

function paragraph(text: string | false | null | undefined) {
  return text ? <p>{text}</p> : null;
}

const HEADING_CLASS = "font-semibold text-foreground";

export function AnswerSources({
  message,
  locale,
  displayedText,
}: {
  message: unknown;
  locale?: "ar" | "en";
  displayedText?: string;
}) {
  const contextLocale = useSadeedStore((state) => state.pageContext?.locale);
  const language = locale ?? contextLocale ?? "ar";
  const copy = COPY[language];
  const view = readAnswerSources(message, displayedText);
  const envelope = view.envelope;
  const groups = [
    { title: copy.cited, items: view.cited },
    { title: copy.retrieved, items: view.retrieved },
    { title: copy.uncertain, items: view.uncertain },
  ];

  return (
    <details
      className="mt-2 border-t border-border/70 text-xs"
      dir={language === "ar" ? "rtl" : "ltr"}
      lang={language}
    >
      <summary className="nx-focus-ring min-h-[44px] cursor-pointer content-center rounded-md px-1 py-2 font-semibold text-foreground">
        {copy.title}
      </summary>
      <div className="space-y-3 pb-2 leading-relaxed text-muted-foreground">
        {paragraph(!view.metadataAvailable && copy.missing)}
        {paragraph(groups.every((group) => group.items.length === 0) && copy.none)}
        {groups.map(
          (group) =>
            group.items.length > 0 && (
              <section key={group.title} aria-label={group.title}>
                <h4 className={HEADING_CLASS}>{group.title}</h4>
                <ul className="list-inside list-disc space-y-1 break-words">
                  {group.items.map((reference) => (
                    <li key={reference.tag}>
                      <span>{reference.title}</span> <bdi>{reference.tag}</bdi>
                    </li>
                  ))}
                </ul>
              </section>
            ),
        )}
        {paragraph(copy.caveat)}
        {paragraph(view.bounded && copy.bounded)}
        {paragraph(view.unverifiedCount !== null && `${copy.unverified}: ${view.unverifiedCount}`)}
        <dl className="space-y-1">
          {copy.unknownFields.map((title) => (
            <div key={title}>
              <dt className="inline font-medium text-foreground">{title}: </dt>
              <dd className="inline">{copy.unknown}</dd>
            </div>
          ))}
        </dl>
        {paragraph(envelope?.isSimulation === true && copy.simulation)}
        {paragraph(envelope?.status === "insufficient_evidence" && copy.insufficient)}
        {paragraph(envelope?.status === "approval_required" && copy.approval)}
        {paragraph(envelope?.executionReceipts.length ? copy.receipt : copy.noReceipt)}
        <section aria-label={copy.tools}>
          <h4 className={HEADING_CLASS}>{copy.tools}</h4>
          {view.tools.length ? (
            <ul className="list-inside list-disc">
              {view.tools.map((state, index) => (
                <li key={index}>{copy.states[state]}</li>
              ))}
            </ul>
          ) : (
            paragraph(copy.noTools)
          )}
        </section>
      </div>
    </details>
  );
}
