import { readMessageResultEvidence } from "@/lib/sadeed-core/read-result-evidence";

/** Existing transport metadata only; no fetch, callback, tool invocation, or authority. */
export function ReadResultEvidence({
  message,
  locale,
}: {
  readonly message: unknown;
  readonly locale: "ar" | "en";
}) {
  const views = readMessageResultEvidence(message);
  if (!views.length) return null;
  const ar = locale === "ar";
  const unknown = ar ? "غير مرفق" : "Not provided";
  return (
    <section aria-label={ar ? "أدلة نتائج القراءة" : "Read-result evidence"} className="space-y-3">
      <h4 className="font-semibold text-foreground">
        {ar ? "نتائج القراءة المرفقة" : "Attached read results"}
      </h4>
      <p>
        {ar
          ? "الأعداد تخص السجلات المعادة فقط، ولا تثبت إجمالي المؤسسة أو اكتمال الفترة. العرض لا يمنح صلاحية."
          : "Counts describe returned records only, not organization totals or a complete period. This view grants no authority."}
      </p>
      {views.map((view, index) => (
        <section
          key={`${view.tool}-${index}`}
          className="space-y-1"
          aria-label={view.title[locale]}
        >
          <h5 className="font-medium text-foreground">{view.title[locale]}</h5>
          {view.status !== "available" ? (
            <p>
              {ar
                ? "نتيجة القراءة غير متاحة؛ لا يمكن إثبات العدد."
                : "Read result unavailable; count is unknown."}
            </p>
          ) : (
            <>
              <p>
                {ar ? "السجلات المعادة: " : "Returned records: "}
                <bdi>{view.returnedCount}</bdi>
                {ar ? " · الإجمالي: غير معلوم" : " · Total: unknown"}
              </p>
              {view.countMismatch && (
                <p>
                  {ar
                    ? "العدد المرفق مختلف عن حجم القائمة: "
                    : "Attached count differs from list size: "}
                  <bdi>{view.reportedSampleCount}</bdi>
                </p>
              )}
              {view.sampleRecordTimes && (
                <p>
                  {ar ? "أزمنة السجلات في العينة: " : "Record timestamps in this sample: "}
                  <bdi>{view.sampleRecordTimes.from}</bdi>
                  {" — "}
                  <bdi>{view.sampleRecordTimes.to}</bdi>
                </p>
              )}
              {view.records.length > 0 && (
                <ul className="list-inside list-disc break-all">
                  {view.records.map((record) => (
                    <li key={record.id}>
                      <bdi>{record.reference ?? record.id}</bdi>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          <p>
            {ar
              ? "المؤسسة والمنطقة والموقع والفترة وتحديث المصدر: "
              : "Organization, region, site, query period and source update: "}
            {unknown}
          </p>
          {view.bounded && <p>{ar ? "عرض محدود للسجلات." : "Limited record view."}</p>}
          {view.route && (
            <a
              href={view.route}
              className="nx-focus-ring inline-flex min-h-[44px] items-center rounded px-1 underline"
            >
              {ar ? "فتح صفحة المصدر" : "Open source page"}
            </a>
          )}
        </section>
      ))}
    </section>
  );
}
