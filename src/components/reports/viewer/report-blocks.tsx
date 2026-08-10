/**
 * كتل التقرير — نصّ · جدول · رسم · صورة · شبكة مؤشرات · تنبيه.
 *
 * القاعدة الحاكمة لهذا الملف كلّه (طلب المالك حرفيًّا): «جميعها تفتح
 * تلقائيًّا بمجرّد النظر للتقرير». فلا `<details>` ولا accordion ولا
 * tabs ولا «اضغط للتوسيع» ولا `loading="lazy"` ولا حالة مطويّة — كل
 * كتلة مرسومة كاملةً في أوّل إطار. ولا حالة React في هذا العارض إطلاقًا:
 * المكوّن دالّة عرض خالصة، وما لا يملك حالة لا يستطيع أن يُخفي شيئًا.
 *
 * الحارس: `report-viewer.contract.test.tsx`.
 */
import type {
  ReportBlock,
  ReportCalloutBlock,
  ReportFigureBlock,
  ReportKpiGridBlock,
  ReportProseBlock,
  ReportTableBlock,
} from "./report-document.types";
import { ReportChart, formatReportNumber } from "./report-charts";
import { REPORT_TONES, ReportToneBadge, ReportToneGlyph } from "./report-tones";

function ProseBlock({ block, headingId }: { block: ReportProseBlock; headingId: string }) {
  return (
    <div className="rv-block rv-prose" data-block="prose">
      {block.titleAr ? (
        <h3 className="rv-block-title" id={headingId}>
          {block.titleAr}
          {block.titleEn ? (
            <span className="rv-en" lang="en" dir="ltr">
              {block.titleEn}
            </span>
          ) : null}
        </h3>
      ) : null}
      {block.paragraphsAr.map((paragraph, i) => (
        <p className="rv-p" key={i}>
          {paragraph}
        </p>
      ))}
      {block.paragraphsEn?.length ? (
        <div className="rv-prose-en" lang="en" dir="ltr">
          {block.paragraphsEn.map((paragraph, i) => (
            <p className="rv-p" key={i}>
              {paragraph}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function cellText(value: string | number | undefined): string {
  if (value === undefined || value === null || value === "") return "—";
  return typeof value === "number" ? formatReportNumber(value) : String(value);
}

/**
 * جدول. `<caption>` إلزامي، وكل `<th>` يحمل `scope` — العمود الأول
 * ترويسة صفّ فيُقرأ اسم السطر مع كل خلية.
 */
function TableBlock({ block }: { block: ReportTableBlock }) {
  const [firstColumn, ...restColumns] = block.columns;
  return (
    <div className="rv-block rv-table-block" data-block="table">
      <div className="rv-table-wrap" role="group" aria-label={block.captionAr} tabIndex={0}>
        <table className="rv-table">
          <caption className="rv-caption">
            {block.captionAr}
            <span className="rv-en" lang="en" dir="ltr">
              {block.captionEn}
            </span>
          </caption>
          <thead>
            <tr>
              {block.columns.map((column) => (
                <th key={column.key} scope="col" data-align={column.align ?? "start"}>
                  {column.labelAr}
                  <span className="rv-en" lang="en" dir="ltr">
                    {column.labelEn}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {firstColumn ? (
                  <th scope="row" data-align={firstColumn.align ?? "start"}>
                    {cellText(row[firstColumn.key])}
                  </th>
                ) : null}
                {restColumns.map((column) => (
                  <td key={column.key} data-align={column.align ?? "start"}>
                    {cellText(row[column.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {block.footnoteAr ? (
        <p className="rv-footnote">
          {block.footnoteAr}
          {block.footnoteEn ? (
            <span className="rv-en" lang="en" dir="ltr">
              {block.footnoteEn}
            </span>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

/**
 * صورة. `loading="eager"` و`decoding="sync"` قصدًا: `lazy` تعني صورةً
 * غائبة حتى يمرّ عليها البصر — وهو نقض حرفيّ لشرط «مفتوح بمجرّد النظر»،
 * ويعني صفحةً مطبوعة بمربّع فارغ.
 */
function FigureBlock({ block }: { block: ReportFigureBlock }) {
  return (
    <figure className="rv-block rv-figure" data-block="figure">
      <img
        className="rv-figure-img"
        src={block.src}
        alt={block.altAr}
        loading="eager"
        decoding="sync"
      />
      <figcaption className="rv-figcaption">
        {block.captionAr}
        <span className="rv-en" lang="en" dir="ltr">
          {block.captionEn}
        </span>
        {block.creditAr ? <span className="rv-credit">{block.creditAr}</span> : null}
      </figcaption>
    </figure>
  );
}

function KpiGridBlock({ block, headingId }: { block: ReportKpiGridBlock; headingId: string }) {
  return (
    <div className="rv-block rv-kpi-block" data-block="kpi-grid">
      {block.titleAr ? (
        <h3 className="rv-block-title" id={headingId}>
          {block.titleAr}
          {block.titleEn ? (
            <span className="rv-en" lang="en" dir="ltr">
              {block.titleEn}
            </span>
          ) : null}
        </h3>
      ) : null}
      <ul className="rv-kpi-grid">
        {block.items.map((item, i) => {
          const tone = item.tone ?? "info";
          return (
            <li className="rv-kpi" key={i} data-tone={tone}>
              <span className="rv-kpi-head">
                <ReportToneGlyph tone={tone} />
                <span className="rv-kpi-label">
                  {item.labelAr}
                  <span className="rv-en" lang="en" dir="ltr">
                    {item.labelEn}
                  </span>
                </span>
              </span>
              <span className="rv-kpi-value">
                {typeof item.value === "number" ? formatReportNumber(item.value) : item.value}
                {item.unitAr ? <span className="rv-unit"> {item.unitAr}</span> : null}
              </span>
              <span className="rv-kpi-foot">
                <span className="rv-tone-word">{REPORT_TONES[tone].wordAr}</span>
                {item.deltaAr ? <span className="rv-kpi-delta">{item.deltaAr}</span> : null}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CalloutBlock({ block, headingId }: { block: ReportCalloutBlock; headingId: string }) {
  return (
    // `role="note"` لا `<aside>`: الأخيرة تُخرَّج معلمًا (complementary) —
    // ومعلم مساعد **داخل** جسم التقرير مخالفة بنيويّة يرصدها axe، ولا
    // معنى لها هنا: التنبيه جزء من متن القسم لا محتوى جانبي عنه.
    <div
      className="rv-block rv-callout"
      data-block="callout"
      data-tone={block.tone}
      role="note"
      aria-labelledby={headingId}
    >
      <ReportToneBadge tone={block.tone} />
      <h3 className="rv-block-title" id={headingId}>
        {block.titleAr}
        <span className="rv-en" lang="en" dir="ltr">
          {block.titleEn}
        </span>
      </h3>
      <p className="rv-p">{block.bodyAr}</p>
      {block.bodyEn ? (
        <p className="rv-p rv-prose-en" lang="en" dir="ltr">
          {block.bodyEn}
        </p>
      ) : null}
    </div>
  );
}

export function ReportBlockView({ block, headingId }: { block: ReportBlock; headingId: string }) {
  switch (block.kind) {
    case "prose":
      return <ProseBlock block={block} headingId={headingId} />;
    case "table":
      return <TableBlock block={block} />;
    case "chart":
      return <ReportChart block={block} headingId={headingId} />;
    case "figure":
      return <FigureBlock block={block} />;
    case "kpi-grid":
      return <KpiGridBlock block={block} headingId={headingId} />;
    case "callout":
      return <CalloutBlock block={block} headingId={headingId} />;
  }
}
