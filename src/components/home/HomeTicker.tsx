/**
 * «مزايا سَدِيد» — الشريط المتحرك فوق البانر (أمر المالك ٢٠٢٦/١٠/١٨ R3 بنصّه: «وكون
 * الشريط الإعلاني المتحرك باستمرار يعلو علامة سديد الموجودة فالمرفق»). السطور ومصادرها
 * في `home-ticker-content.ts`، والأنماط في `styles/home/home-ticker.css`.
 *
 * ## الحركة الدائمة هنا مأذونةٌ بنصّ المالك — لهذا الشريط وحده
 *
 * «المتحرك باستمرار» نصٌّ صريح، وهو أحدث نصوص المالك على الرئيسية (المادة ٣٥)، فنسخ
 * «لا حركة دائمة» (M1، ٢٠٢٦/١٠/١٧) **لهذا الشريط وحده**؛ والطفو واللمعة الدائمان باقيان
 * ممنوعين على غيره.
 *
 * ## كيف يتحرّك — المُركِّب وحده، بلا حلقة JS
 *
 * مسارٌ فيه النسخة المقروءة ونسخٌ مطابقة (`aria-hidden` + `inert`)، ينزاح بخاصية
 * `translate` المستقلّة نسخةً واحدة في كل دورة فتحلّ التالية محلّ الأولى بلا وصلةٍ
 * تُرى. والقياس مرّةً عند التركيب ومع كل تغيّر حجم (`ResizeObserver` — ويلتقط وصول
 * الخطوط)، يكتب متغيّرين لا قيمتين نهائيتين (المادة ٣٣): المدّة من عرض النسخة بسرعةٍ
 * ثابتة مهما طال المحتوى، وعدد النسخ بما يملأ أيّ عرضٍ فلا تظهر فجوة (`tickerLoop`).
 * والاتجاه من اللغة: العربية تجري من اليسار إلى اليمين فيتقدّم أوّلُ كل عبارة (طرفها
 * الأيمن) داخلًا، والإنجليزية بعكسها.
 *
 * ## متى لا يتحرّك
 *
 * • تحت `prefers-reduced-motion: reduce` و`html[data-nx-motion="off"]` والوضع الآمن:
 *   قائمةٌ ساكنة تُمرَّر أفقيًّا **داخل الشريط** لا الصفحة، بلا نسخٍ مطابقة ولا زرّ إيقاف
 *   (لا شيء يُوقَف). يقرّرها الـCSS من أوّل رسمة، والارتفاع واحدٌ في الحالين — لا قفزة.
 * • ويقف في مكانه (لا يعود إلى أوّله): عند مرور الفأرة، وعند التركيز داخله، وخارج الإطار،
 *   وبزرّ «إيقاف الحركة» الظاهر (WCAG 2.2.2) — والزرّ نفسه يوقف حلقة ماء البانر وتوهّج
 *   إطاره، وفيلمَ الخلفية عبر واجهة الإيقاف المجمَّدة (`data-nx-motion-paused` على الجذر
 *   وحدث `nx:motion-pause`)، ويُحفظ لكل متصفّح (`HomeBrandRow` يملك التفضيل ويمرّره).
 * • ولا يبدأ قبل القياس وقراءة التفضيل (`data-run`): من أوقفه سابقًا لا يرى إطار حركةٍ
 *   واحدًا، ولا تقفز السرعة حين تصل المدّة.
 *
 * ## الوصول
 *
 * منطقةٌ مسمّاة قابلةٌ للتركيز («مزايا سَدِيد») — التركيز يوقفها، وفي الحال الساكنة تُمرَّر
 * بالأسهم. **لا منطقة حيّة:** النصّ لا يتبدّل فلا يُعلَن شيء، والقارئ يسمع القائمة مرّةً
 * واحدة لأن النسخ المطابقة خارج الشجرة.
 */
import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { TICKER_LINES, TICKER_PX_PER_S } from "@/components/home/home-ticker-content";
import "@/styles/home/home-ticker.css";
import type { OperationalTickerLine } from "./operational-feed";
import { REGION_ACCENT_HEX } from "@/lib/regions";

export type TickerLoop = {
  /** مدّة الدورة بالثواني — عرض نسخةٍ واحدة ÷ السرعة. */
  readonly seconds: number;
  /** عدد النسخ في المسار — اثنتان على الأقل، وما يملأ العرض كلّه. */
  readonly copies: number;
};

/**
 * حلقة الشريط من قياسَين. المسار ينزاح نسخةً واحدة في الدورة، فما يُرى في أيّ لحظة
 * يقع في `[d, d + view]` من مسارٍ طوله `copies × copy` حيث `d < copy` — فيلزم
 * `copies ≥ 1 + view / copy`. و`null` حين لا قياس (النسخة بلا عرض).
 */
export function tickerLoop(
  copyWidth: number,
  viewWidth: number,
  speed: number = TICKER_PX_PER_S,
): TickerLoop | null {
  if (!(copyWidth > 0) || !(speed > 0)) return null;
  return {
    seconds: copyWidth / speed,
    copies: Math.max(2, Math.ceil(Math.max(0, viewWidth) / copyWidth) + 1),
  };
}

const sameLoop = (a: TickerLoop | null, b: TickerLoop | null) =>
  a !== null && b !== null && a.copies === b.copies && Math.abs(a.seconds - b.seconds) < 0.01;

export function HomeTicker({
  paused,
  offscreen,
  ready,
  onPausedChange,
  lines,
  failed,
  onRetry,
}: {
  /** إيقاف المستخدم — التفضيل المحفوظ المشترك مع حلقة الماء. */
  readonly paused: boolean;
  readonly lines?: readonly OperationalTickerLine[];
  readonly failed?: boolean;
  readonly onRetry?: () => void;
  /** الصفّ خارج الإطار. */
  readonly offscreen: boolean;
  /** قُرئ التفضيل المحفوظ — قبله لا حركة. */
  readonly ready: boolean;
  readonly onPausedChange: (next: boolean) => void;
}) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const viewRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLUListElement>(null);
  const [loop, setLoop] = useState<TickerLoop | null>(null);

  // القياس: عند التركيب، ومع تغيّر اللغة، وكلّما تغيّر عرض النسخة أو النافذة.
  useEffect(() => {
    const view = viewRef.current;
    const copy = copyRef.current;
    if (!view || !copy) return;
    const measure = () => {
      const next = tickerLoop(
        copy.getBoundingClientRect().width,
        view.getBoundingClientRect().width,
      );
      setLoop((prev) => (sameLoop(prev, next) ? prev : next));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(copy);
    observer.observe(view);
    return () => observer.disconnect();
  }, [ar, lines]);

  const label = ar ? "مزايا سَدِيد" : "SADEED highlights";
  const pauseLabel = ar ? "إيقاف الحركة" : "Pause motion";
  const copies = loop?.copies ?? 2;
  const items = () =>
    (lines ?? TICKER_LINES).map((line) => (
      <li
        key={line.id}
        className="nx-ticker-item"
        data-tone={"tone" in line ? line.tone : undefined}
        style={{
          ["--nx-feed-region" as string]:
            "regionId" in line && line.regionId ? REGION_ACCENT_HEX[line.regionId] : undefined,
        }}
      >
        <span className="nx-ticker-news">{ar ? line.ar : line.en}</span>
        {"progress" in line && typeof line.progress === "number" && (
          <span className="nx-ticker-progress" aria-hidden="true">
            <span style={{ inlineSize: `${line.progress}%` }} />
          </span>
        )}
      </li>
    ));

  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      className="nx-ticker"
      data-paused={paused || undefined}
      data-offscreen={offscreen || undefined}
    >
      <div className="nx-ticker-window">
        <div ref={viewRef} className="nx-ticker-view" role="region" aria-label={label} tabIndex={0}>
          <div
            className="nx-ticker-track"
            data-run={(ready && loop !== null) || undefined}
            style={{
              ["--nx-ticker-n" as string]: String(copies),
              ["--nx-ticker-s" as string]: loop ? `${loop.seconds.toFixed(2)}s` : undefined,
            }}
          >
            <ul ref={copyRef} className="nx-ticker-copy">
              {items()}
            </ul>
            {/* النسخ المطابقة للحلقة وحدها: خارج شجرة الوصول وخارج التركيز والبحث. */}
            {Array.from({ length: copies - 1 }, (_, k) => (
              <ul key={k} className="nx-ticker-copy" aria-hidden inert>
                {items()}
              </ul>
            ))}
          </div>
        </div>
      </div>
      {failed && onRetry && (
        <button type="button" className="nx-ticker-retry nx-focus-ring" onClick={onRetry}>
          {ar ? "تعذرت الأخبار · أعد المحاولة" : "Updates unavailable · Retry"}
        </button>
      )}
      {/* إيقاف الحركة (WCAG 2.2.2) — الشريط وحلقة الماء وتوهّج الإطار معًا. في طرف
          الشريط خارج اللوحة، ويُخفيه الـCSS حيث لا حركة أصلًا (لا قفزة تخطيط). */}
      <button
        type="button"
        className="nx-ticker-toggle nx-focus-ring"
        aria-pressed={paused}
        aria-label={pauseLabel}
        title={pauseLabel}
        onClick={() => onPausedChange(!paused)}
      >
        {paused ? <Play aria-hidden /> : <Pause aria-hidden />}
      </button>
    </div>
  );
}
