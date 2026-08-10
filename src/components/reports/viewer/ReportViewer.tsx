/**
 * ReportViewer — عارض التقرير المفصَّل.
 *
 * طلب المالك حرفيًّا: تقرير «مفصَّل مدعَّم بالصور والجداول ويحتوي تشارت
 * وقراف، **وجميعها تفتح تلقائيًّا بمجرّد النظر للتقرير**». وهذا العقد
 * مطبَّق بالبنية لا بالنيّة:
 *
 *   ① لا حالة React في العارض كلّه — لا `useState` ولا `useEffect` ولا
 *      `onClick`. ما لا يملك حالة لا يستطيع أن يطوي شيئًا.
 *   ② لا `<details>` ولا accordion ولا tabs ولا `hidden` ولا
 *      `aria-expanded` — كل كتلة في الشجرة عند أوّل رسم.
 *   ③ الرسوم SVG مضمّن بـ`viewBox` لا مكتبة تقيس الحاوية، والصور
 *      `loading="eager"` — فلا شيء ينتظر تمريرة بصر أو إطارًا ثانيًا.
 *
 * الحارس: `report-viewer.contract.test.tsx` (اختبار عقد، كل تأكيد فيه
 * أُسقط بكسرٍ مصطنع قبل اعتماده).
 *
 * الطباعة: `@media print` بمقاس A4، كسر صفحة بين الأقسام، `break-inside:
 * avoid` على البطاقات، وترويسة/تذييل مكرّران على كل صفحة. والورق دائمًا
 * أرضية فاتحة بحبر داكن مهما كان وضع الشاشة — لأن الوضع الداكن يُطبع
 * أحبارًا لا تُقرأ ويستهلك الحبر بلا فائدة.
 *
 * النموذج: يُستورد اليوم من `report-document.types.ts` — تعريف **مؤقّت
 * محلّي** بانتظار توحيده مع `src/lib/reports/report-model.ts`.
 */
import "@/styles/report-viewer.css";

import type { CSSProperties } from "react";

import { REGION_ACCENT_RGB, getRegion } from "@/lib/regions";
import type { ReportDocument } from "./report-document.types";
import { ReportBlockView } from "./report-blocks";

export type { ReportDocument } from "./report-document.types";

/** شارة المحاكاة — تظهر على الشاشة وعلى الورق معًا، ولا تُخفى في الطباعة. */
function SimulationBadge() {
  return (
    <p className="rv-sim-badge" data-simulation="true">
      <span className="rv-sim-dot" aria-hidden="true" />
      <span className="rv-sim-text">
        محاكاة مرجعية · البيانات موسومة <code className="rv-sim-code">is_simulation = true</code>{" "}
        ولا تمثّل عميلًا حقيقيًّا
      </span>
      <span className="rv-en" lang="en" dir="ltr">
        Reference simulation — not customer data
      </span>
    </p>
  );
}

export interface ReportViewerProps {
  doc: ReportDocument;
  className?: string;
  /**
   * بادئة المعرّفات. تُغيَّر فقط حين يُعرض تقريران في الصفحة نفسها، وإلا
   * تعارضت معرّفات `aria-labelledby`. تُمرَّر ولا تُولَّد كي يبقى الخرج
   * متطابقًا بين الخادم والعميل (لا اختلاف ترطيب).
   */
  idPrefix?: string;
}

export function ReportViewer({ doc, className, idPrefix = "rv" }: ReportViewerProps) {
  const region = getRegion(doc.regionId);
  const titleId = `${idPrefix}-title`;
  const headerLine = `${doc.titleAr} · ${region.labelAr}`;
  const footerLine = doc.isSimulation
    ? `${doc.periodAr} · محاكاة مرجعية (is_simulation = true)`
    : doc.periodAr;

  return (
    <section
      className={className ? `rv-doc ${className}` : "rv-doc"}
      dir="rtl"
      lang="ar"
      aria-labelledby={titleId}
      data-simulation={doc.isSimulation ? "true" : "false"}
      data-region={doc.regionId}
      style={{ "--rv-region-rgb": REGION_ACCENT_RGB[doc.regionId] } as CSSProperties}
    >
      {/* ترويسة/تذييل الورق: مخفيّان على الشاشة، ويتكرّران على كل صفحة
          مطبوعة (`position: fixed` داخل `@media print`). */}
      <div className="rv-print-header" aria-hidden="true">
        {headerLine}
      </div>

      <header className="rv-doc-head">
        <p className="rv-region">
          {region.labelAr}
          <span className="rv-en" lang="en" dir="ltr">
            {region.labelEn}
          </span>
        </p>
        <h1 className="rv-doc-title" id={titleId}>
          {doc.titleAr}
          <span className="rv-en" lang="en" dir="ltr">
            {doc.titleEn}
          </span>
        </h1>
        <p className="rv-period">
          <span className="rv-period-label">الفترة:</span> {doc.periodAr}
          <span className="rv-en" lang="en" dir="ltr">
            {doc.periodEn}
          </span>
        </p>
        {doc.isSimulation ? <SimulationBadge /> : null}
      </header>

      <div className="rv-body">
        {doc.sections.length === 0 ? (
          <p className="rv-empty">لا توجد أقسام في هذا التقرير بعد.</p>
        ) : (
          doc.sections.map((section, sectionIndex) => {
            const sectionId = `${idPrefix}-s${sectionIndex}`;
            return (
              <section className="rv-section" key={sectionIndex} aria-labelledby={sectionId}>
                <h2 className="rv-section-title" id={sectionId}>
                  <span className="rv-section-index" aria-hidden="true">
                    {sectionIndex + 1}
                  </span>
                  {section.titleAr}
                  <span className="rv-en" lang="en" dir="ltr">
                    {section.titleEn}
                  </span>
                </h2>
                {section.blocks.map((block, blockIndex) => (
                  <ReportBlockView
                    key={blockIndex}
                    block={block}
                    headingId={`${sectionId}-b${blockIndex}`}
                  />
                ))}
              </section>
            );
          })
        )}
      </div>

      <footer className="rv-doc-foot">
        <p className="rv-foot-line">
          {region.labelAr} · {doc.periodAr}
        </p>
        {doc.isSimulation ? (
          <p className="rv-foot-line rv-foot-sim">
            هذا التقرير مبنيّ على محاكاة مرجعية موسومة <code>is_simulation = true</code>.
          </p>
        ) : null}
      </footer>

      <div className="rv-print-footer" aria-hidden="true">
        {footerLine}
      </div>
    </section>
  );
}

export default ReportViewer;
