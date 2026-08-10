/**
 * إطار الرسم — الغلاف الذي يشترك فيه كل رسوم التقارير.
 *
 * ثلاثة أشياء يضمنها الإطار، ولا يُترك أيّها لكل رسم يعيد بناءه:
 *
 * ① **الرسم ليس المحتوى كلّه.** مساحة الرسم `role="img"` بوصف عربي، وما
 *   داخل عنصر بهذا الدور **محجوب** عن قارئ الشاشة بأكمله. فالجدول البديل
 *   يُكتب **خارجه** لا داخله — وهذا خطأ شائع يُبطل البديل من حيث أُريد
 *   له أن ينقذ. الوسيلة والحاشية خارجه كذلك، فهما نصٌّ يُقرأ.
 *
 * ② **ما لم يُقَس يُقال.** إن لم يُقَس شيء أصلًا فلا رسم إطلاقًا — لا
 *   شبكة فارغة توهم بقياسٍ وقع — بل كتلة «لم يُقَس». وإن غاب بعضه فحاشية
 *   تُسمّي ما غاب. (المادة ٢٧)
 *
 * ③ **الالتقاط قبل الشاشة.** `staticRender` يضع `.rpt-static` على الجذر
 *   فتسقط كل حركة وانتقال، ويُحذف التلميح أصلًا لا يُخفى.
 */
import type { ReactElement, ReactNode } from "react";
import { NOT_MEASURED, type AltTable } from "./chart-tokens";

export interface ChartShellProps {
  title: string;
  /** الوصف العربي الذي يسمعه قارئ الشاشة بدل الرسم. */
  ariaLabel: string;
  caption?: string;
  staticRender?: boolean;
  className?: string;
  /** الوسيلة — تُرسم خارج `role="img"` لتبقى نصًّا مقروءًا. */
  legend?: ReactNode;
  /** حاشية الغياب. تُبنى بـ`unmeasuredNote`. */
  note?: string;
  /** الجدول البديل — إلزامي: الرسم وحده لا يكفي. */
  table: AltTable;
  /** لا قياس واحد في البيانات ⇐ لا رسم. */
  empty?: boolean;
  children: ReactNode;
}

export function ChartShell({
  title,
  ariaLabel,
  caption,
  staticRender,
  className,
  legend,
  note,
  table,
  empty,
  children,
}: ChartShellProps): ReactElement {
  const root = ["rpt-chart", staticRender ? "rpt-static" : "", className].filter(Boolean).join(" ");

  return (
    <figure className={root} dir="rtl">
      <figcaption className="rpt-head">
        <h3 className="rpt-title">{title}</h3>
        {caption ? <p className="rpt-caption">{caption}</p> : null}
      </figcaption>

      {empty ? (
        <div className="rpt-empty" role="img" aria-label={`${title} — ${NOT_MEASURED}`}>
          <span>{NOT_MEASURED}</span>
        </div>
      ) : (
        <div className="rpt-plot" role="img" aria-label={ariaLabel}>
          {children}
        </div>
      )}

      {legend}
      {note ? <p className="rpt-note">{note}</p> : null}

      {/* البديل النصّي. `sr-only` أداة النظام و`rpt-sr` نسخة الطقم المحلّية —
          يبقى مخفيًّا بصريًّا حتى لو اقتُطع الطقم إلى صفحة تصدير لا تمرّ على
          خطّ Tailwind نفسه. */}
      <div className="sr-only rpt-sr">
        <table>
          <caption>{`${title} — جدول القيم`}</caption>
          <thead>
            <tr>
              {table.columns.map((c) => (
                <th key={c} scope="col">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, i) => (
              <tr key={`${row[0]}-${i}`}>
                {row.map((cell, j) =>
                  j === 0 ? (
                    <th key={j} scope="row">
                      {cell}
                    </th>
                  ) : (
                    <td key={j}>{cell}</td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

/**
 * حاشية الغياب. تُعيد `undefined` حين قِيس كل شيء — فلا تُكتب جملة فارغة
 * تحت كل رسم سليم.
 */
export function unmeasuredNote(missing: readonly string[], total: number): string | undefined {
  if (missing.length === 0) return undefined;
  if (missing.length === total) return `${NOT_MEASURED}: كل القيم.`;
  return `${NOT_MEASURED}: ${missing.join(" · ")}.`;
}
