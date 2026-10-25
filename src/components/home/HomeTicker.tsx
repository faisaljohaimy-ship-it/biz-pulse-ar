/**
 * «شريط الإعلانات» — الشريط المتحرك فوق البانر، يعكس **أربعة بنودٍ حيّة**: الحالة الأمنية ·
 * الصيانة · البلاغات · المشاريع (أمر المالك ٢٠٢٦/١٠/٢٤). كان «مزايا سَدِيد» بسطور دعاية بلا أرقام
 * (٢٠٢٦/١٠/١٨ R3)؛ والحركة الدائمة هنا ما زالت مأذونةٌ بنصّ المالك «المتحرك باستمرار» لهذا الشريط
 * وحده (المادة ٣٥)، والطفو واللمعة الدائمان باقيان ممنوعين على غيره.
 *
 * ## من أين الأرقام — وأيّ قاعدة تحكمها
 *
 * القواعد والأرقام كلّها في `home-ticker-status.ts` (وحدةٌ خالصة بعقدها): كل بند = رمز حالةٍ متحرّك
 * (الشكل يحمل المعنى: مثمّن خطر · مثلث تحذير · دائرة سليم) + اسم + **كلمة الحالة** + أرقام +
 * سهم اتجاهٍ حيث يوجد تغيّرٌ مقيس + شارة «مرجعي» حين يكون المعروض مرجعًا موسومًا. اللون وحده
 * لا يحمل حالةً أبدًا (WCAG 2.2 §1.4.1). والقراءات هي **القراءات المشتركة نفسها** (`useHomeReads`:
 * مفاتيح react-query نفسها) فلا طلبٌ مضاعف ولا رقمٌ يخالف بطاقة المؤشرات تحته.
 * `HomeTicker` يقرأ ويقرّر؛ و`TickerStrip` يرسم ما يُعطاه وحده (فيُجرَّب بلا شبكة).
 *
 * ## كيف يتحرّك — المُركِّب وحده، بلا حلقة JS، ومتواصلٌ بلا توقّف
 *
 * مسارٌ فيه النسخة المقروءة ونسخٌ مطابقة (`aria-hidden` + `inert`)، ينزاح بخاصية
 * `translate` المستقلّة نسخةً واحدة في كل دورة فتحلّ التالية محلّ الأولى بلا وصلةٍ
 * تُرى (قِيس: موضع أوّل بند عند t وt+دورة متطابق تمامًا). والقياس مرّةً عند التركيب ومع كل تغيّر حجم
 * (`ResizeObserver` — ويلتقط وصول الخطوط وتبدّل نصّ البنود)، يكتب متغيّرين لا قيمتين نهائيتين (المادة ٣٣): المدّة
 * من عرض النسخة بسرعةٍ ثابتة (44px/ث) مهما طال المحتوى، وعدد النسخ بما يملأ أيّ عرضٍ فلا تظهر فجوة
 * (`tickerLoop`). والاتجاه من اللغة: العربية تجري من اليسار إلى اليمين فيتقدّم أوّلُ كل عبارة (طرفها
 * الأيمن) داخلًا، والإنجليزية بعكسها.
 *
 * **الاستمرار (أمر ٢٠٢٦/١٠/٢٥ «متواصل بدون توقف»):** تغيّر المدّة — وصول الخطّ، تحديث القراءات، تغيّر
 * العرض — لا يعيد المسار إلى أوّله ولا يقفز به، ولا يُعاد تركيب المسار ولا النسخ. CSS وحده يقفز بعد
 * أوّل دورة (`T mod الجديدة` غير `T mod القديمة`)، فيُصحَّح الزمن المحلي مرّةً واحدة (`retimeLoop`) **داخل
 * نداء المراقب نفسه قبل الرسم**: الإزاحة بالبكسل = السرعة × الزمن المحلي، فيُحفظ الزمن المحلي لا نسبة
 * التقدّم (`carryLoopTime`). وهذا تصحيحٌ لا حلقة — حركة المسار تبقى CSS على المُركِّب.
 *
 * ## الحركة السينمائية ولماذا لا تمسّ الحرف العربي
 *
 * أجزاء كل بند (الرمز ← الاسم ← كلمة الحالة ← الرقم ← الاتجاه ← الشارة) تُكشف بالتتابع بمسافاتٍ
 * بنسبة خطّ الشريط (`em`) في الـCSS. **كلمةً كلمةً أو سطرًا سطرًا — لا حرفًا حرفًا**: لا يُقسَّم نصٌّ
 * إلى حروف في هذا المكوّن (يكسر وصل الحروف العربية وتشكيلها)، ولا `letter-spacing` متحرّكًا (خاصيةُ
 * تخطيطٍ تغيّر عرض النسخة المقيس)، ولا وزنَ متحرّكًا. العدّ التصاعدي للرقم زخرفةٌ `aria-hidden`.
 *
 * والمظهر لوحٌ زجاجي (٢٠٢٦/١٠/٢٥): شفقٌ مصيَّر خلف البنود وشفقٌ ثانٍ منجرف بعكسه، وغبارٌ نجميّ يتلألأ،
 * ومذنّبان (علويٌّ وسفليٌّ بعكسه) وحدٌّ قزحيّ جارٍ، ووميضٌ كل 9 ث، وسداسيُّ فاصلٍ يدور ويتنفّس، وبريقٌ
 * يعبر كل كبسولة بالتناوب، ومدارٌ يدور حول رمز الحالة، والبنود كبسولاتٌ مثلّجة بتوهّجٍ داخلي من نبرة
 * حالتها — كلّها في `home-ticker.css` على المُركِّب وفي بوّابة الحركة نفسها.
 *
 * وفوق المسار حركةٌ **مُركِّبة** (`opacity`/`scale`/`translate` وحدها، في `home-ticker.css`):
 * الرمز المتحرّك (WebP) مقابل ساكنه (SVG) باختيار الـCSS لا JS؛ نبضةٌ واحدة حين يتغيّر صنف
 * بندٍ (`data-flip` وإعادة تركيب الجسم بمفتاح عدّاد التغيّر)؛ نبضة انتباهٍ بطيئة على حلقة الرمز الحرج؛ ودفعةٌ باتجاه
 * السهم مع النبضة. كلّها في بوّابة الحركة نفسها.
 *
 * ## متى لا يتحرّك — وما لا يوقفه أبدًا
 *
 * • تحت `prefers-reduced-motion: reduce` و`html[data-nx-motion="off"]` والوضع الآمن:
 *   قائمةٌ ساكنة تُمرَّر أفقيًّا **داخل الشريط** لا الصفحة، بلا نسخٍ مطابقة، وبالرموز والشفق
 *   الساكنَين. يقرّرها الـCSS من أوّل رسمة، والارتفاع واحدٌ في الحالين. وهي **الآلية الوحيدة لمن يريد
 *   السكون** (أمر المالك ٢٠٢٦/١٠/٢٥: «أزل علامة التوقف والاستمرار» — لا زرّ إيقاف في الشريط).
 * • ويقف في مكانه (لا يعود إلى أوّله) في اثنتين فقط: خارج الإطار (لا يُرى)، وتركيز لوحة المفاتيح عليه
 *   (`:focus-visible`: من يقرأ بالأسهم لا يهرب منه النصّ، ويستأنف بخروج التركيز). **لا الفأرة ولا النقر
 *   ولا تفضيلٌ محفوظ يوقفه**: والتفضيل القديم (`nx-brand-motion`) يُمحى عند أوّل قراءة لأنه لا زرّ يلغيه.
 * • ولا يبدأ قبل القياس وقراءة التفضيل (`data-run`): فلا يرى المستخدم إطار حركةٍ واحدًا قبل الجهوزية،
 *   ولا تقفز السرعة حين تصل المدّة.
 *
 * ## الوصول
 *
 * منطقةٌ مسمّاة قابلةٌ للتركيز — تركيز لوحة المفاتيح يوقفها (وهو آلية الإيقاف الوحيدة بالكيبورد بعد إزالة الزرّ)، وفي الحال الساكنة تُمرَّر بالأسهم. نصّ كل بند هو
 * ملخّصه (لا اسمٌ مستقل): الاسم · كلمة الحالة · الأرقام · الاتجاه · الشارة، والقارئ يسمع القائمة
 * مرّةً واحدة لأن النسخ المطابقة خارج الشجرة. **لا `aria-live` ولا منطقة حيّة للبنود** (الأرقام
 * تتبدّل كل دقيقة فلا يُعلَن شيء)؛ والاستثناء الوحيد عقدة `role="status"` مخفيةٌ بصريًّا يتبدّل
 * نصّها حين يتغيّر **صنف الحالة الأمنية** إلى «حرجة» وحدها — مرّةً مهذّبةً (`nextTransitions`).
 */
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useHomeReads } from "@/components/home/home-reads";
import {
  GLYPH_FOR_TONE,
  glyphForTrend,
  TICKER_GLYPHS,
  TICKER_GLYPH_SIZE,
  TICKER_LABELS,
  TICKER_PX_PER_S,
  type TickerGlyphName,
} from "@/components/home/home-ticker-content";
import {
  INITIAL_TRANSITIONS,
  NOT_MEASURED,
  TREND_DIR_WORD,
  TREND_POLARITY_WORD,
  badgeTextOf,
  buildTickerItems,
  nextTransitions,
  type Bilingual,
  type TickerFigure,
  type TickerItem,
  type TickerTransitions,
} from "@/components/home/home-ticker-status";
import "@/styles/home/home-ticker.css";
import "@/styles/home/home-ticker-focus.css";

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

/** ما يُكتب في الـCSS فعلًا: ثانيتان بعد الفاصلة — وبه يُقاس تغيّر المدّة، لا بالقياس الخام. */
const writtenSeconds = (loop: TickerLoop | null) => (loop ? Number(loop.seconds.toFixed(2)) : null);

/**
 * وقت الدورة المحلي الذي يُبقي المسار حيث هو حين تتغيّر المدّة (٢٠٢٦/١٠/٢٥: «متواصل بدون توقف»).
 *
 * الإزاحة بالبكسل = السرعة × وقت الدورة المحلي — **لا تتبع المدّة**، لأن المدّة نفسها عرض النسخة ÷
 * السرعة. فما يُحفظ هو الوقت المحلي لا نسبة التقدّم: حفظ النسبة يقفز بالمسار `نسبة × فرق العرض` عند
 * وصول الخطّ أو تبدّل نصّ بند، وحفظ الوقت المحلي لا يقفز. والـ`currentTime` الخام لا يصلح: بعد دورةٍ
 * أولى يكون `T mod الجديدة` غير `T mod القديمة` فيقفز المسار حتى لو لم يتغيّر شيء في العرض. وإن صار الوقت
 * المحلي فوق المدّة الجديدة (نسخةٌ أقصر من إزاحتها الحاليّة) التفّ حول الدورة — القفزة هنا لازمة.
 */
export function carryLoopTime(currentMs: number, prevMs: number, nextMs: number): number {
  if (!Number.isFinite(currentMs) || !(prevMs > 0) || !(nextMs > 0)) return currentMs;
  return (currentMs % prevMs) % nextMs;
}

/**
 * يكتب المدّة الجديدة ويُعيد ضبط حركة المسار القائمة (دون إعادة تشغيلها). الحركة نفسها تبقى CSS مُركِّبًا؛
 * هذا تصحيحٌ لمرّةٍ عند التغيّر وليس حلقة، وكتابة المتغيّر هنا هي نفسها ما سيكتبه React بعد إيداعه (القيمة
 * ذاتها فلا أثر). و`false` من التصحيح حين لا حركة قائمة (سكون، أو قبل `data-run`، أو متصفّحٌ بلا
 * `getAnimations`) — فلا شيء يُصحَّح.
 */
export function retimeLoop(
  track: Pick<HTMLElement, "getAnimations" | "style">,
  prevSeconds: number,
  nextSeconds: number,
): boolean {
  track.style.setProperty("--nx-ticker-s", `${nextSeconds.toFixed(2)}s`);
  if (typeof track.getAnimations !== "function") return false;
  for (const a of track.getAnimations()) {
    if (!(a as Partial<CSSAnimation>).animationName?.startsWith("nxTicker")) continue;
    if (typeof a.currentTime !== "number") continue;
    a.currentTime = carryLoopTime(a.currentTime, prevSeconds * 1000, nextSeconds * 1000);
    return true;
  }
  return false;
}

/** الأرقام لاتينيةٌ بفاصل الآلاف كما في صفّ المؤشرات (`fmtKpi`) — وتُرسم `ltr`. */
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

/**
 * الرمز: صورتان في صندوقٍ واحد — المتحرّكة (WebP) والساكنة (SVG) — يختار الـCSS بينهما. المتحرّكة
 * `loading="lazy"`: مخفيّةً (سكون/إيقاف/وضع آمن) لا صندوق لها فلا تُجلَب أصلًا. `alt=""`: الكلمة
 * تحمل المعنى والرمز زينةٌ مرافقة.
 */
function Glyph({
  name,
  role,
}: {
  readonly name: TickerGlyphName;
  readonly role: "state" | "trend";
}) {
  const g = TICKER_GLYPHS[name];
  return (
    <span className="nx-tk-glyph" data-role={role} data-glyph={name}>
      <span aria-hidden className="nx-tk-ring" />
      <img
        className="nx-tk-img nx-tk-img-anim"
        src={g.anim}
        width={TICKER_GLYPH_SIZE}
        height={TICKER_GLYPH_SIZE}
        loading="lazy"
        decoding="async"
        alt=""
      />
      <img
        className="nx-tk-img nx-tk-img-still"
        src={g.still}
        width={TICKER_GLYPH_SIZE}
        height={TICKER_GLYPH_SIZE}
        decoding="async"
        alt=""
      />
    </span>
  );
}

function Figure({ f, ar }: { readonly f: TickerFigure; readonly ar: boolean }) {
  const label = ar ? f.label.ar : f.label.en;
  return (
    <span className="nx-tk-fig" data-fig={f.id}>
      {label && <span className="nx-tk-fig-label">{label}</span>}
      {f.value === null ? (
        <span className="nx-tk-nm">{ar ? NOT_MEASURED.ar : NOT_MEASURED.en}</span>
      ) : (
        // الرقم الحقيقي نصٌّ في الشجرة دائمًا؛ والغطاء `aria-hidden` زخرفةُ العدّ (CSS وحده، ولا يُرسم
        // إلا في الحركة). المفتاح قيمته: تبدّلها يعيد تركيب العنصر فيُعاد العدّ من الصفر.
        <bdi
          key={f.value}
          dir="ltr"
          className="nx-tk-num"
          style={{ ["--tk-to" as string]: String(Math.round(f.value)) }}
        >
          <span className="nx-tk-real">{fmt(f.value)}</span>
          <span aria-hidden className="nx-tk-count" />
          {f.unit ?? ""}
        </bdi>
      )}
    </span>
  );
}

const pick = (b: Bilingual, ar: boolean) => (ar ? b.ar : b.en);

function Item({
  item,
  ar,
  flip,
}: {
  readonly item: TickerItem;
  readonly ar: boolean;
  readonly flip: number | undefined;
}) {
  const badge = badgeTextOf(item);
  const t = item.trend;
  return (
    <li
      className="nx-ticker-item nx-tk"
      data-kind={item.kind}
      data-tone={item.tone}
      data-read={item.read}
      data-status={item.statusId}
      data-badge={item.badge ?? undefined}
      data-flip={flip ? "" : undefined}
    >
      {/* المفتاح عدّاد تغيّر الصنف: تغيّره يعيد تركيب الجسم فتبدأ حركاته (غسلة · كشف · كنس · دفعة) من
            أولها بلا اسمَي حركةٍ متكافئين في الـCSS. */}
      <span key={flip ?? 0} className="nx-tk-body">
        <Glyph name={GLYPH_FOR_TONE[item.tone]} role="state" />
        <span className="nx-tk-label">{pick(TICKER_LABELS[item.kind], ar)}:</span>
        <strong className="nx-tk-word">{pick(item.word, ar)}</strong>
        {item.figures.map((f) => (
          <Figure key={f.id} f={f} ar={ar} />
        ))}
        {t && (
          <span className="nx-tk-trend" data-dir={t.dir} data-polarity={t.polarity}>
            <Glyph name={glyphForTrend(t.dir, t.polarity)} role="trend" />
            <span className="nx-tk-sr">
              {ar ? "الاتجاه" : "Trend"}
              {t.polarity === "unmeasured" ? "" : ` ${pick(TREND_DIR_WORD[t.dir], ar)}`}
            </span>
            {t.pct !== null && t.dir !== "flat" && (
              <bdi dir="ltr" className="nx-tk-num">
                {fmt(t.pct)}%
              </bdi>
            )}
            <span className="nx-tk-pol">{pick(TREND_POLARITY_WORD[t.polarity], ar)}</span>
          </span>
        )}
        {badge && <span className="nx-tk-badge">{pick(badge, ar)}</span>}
        {item.note && <span className="nx-tk-sr">{pick(item.note, ar)}</span>}
      </span>
    </li>
  );
}

export type TickerStripProps = {
  /** البنود بترتيب العرض. */
  readonly items: readonly TickerItem[];
  /** نبضات تغيّر الصنف لكل بند. */
  readonly flips?: TickerTransitions["flips"];
  /** نصّ إعلان «حرجة» المهذّب، أو فارغ. */
  readonly announcement?: string;
  /** الصفّ خارج الإطار. */
  readonly offscreen: boolean;
  /** قُرئ التفضيل المحفوظ — قبله لا حركة. */
  readonly ready: boolean;
};

/** الشريط كما يُرسم لبنودٍ معطاة — بلا قراءات، فيُجرَّب كل حال (حيّ · مرجعي · فاشل) مباشرةً. */
export function TickerStrip({ items, flips, announcement, offscreen, ready }: TickerStripProps) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const viewRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLUListElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [loop, setLoop] = useState<TickerLoop | null>(null);
  const seconds = writtenSeconds(loop);
  // آخر حلقةٍ كُتبت فعلًا — يقرؤها القياس المتزامن (الحالة نفسها تتأخّر إلى الإيداع التالي).
  const written = useRef<TickerLoop | null>(null);

  // القياس: عند التركيب، ومع تغيّر اللغة، وكلّما تغيّر عرض النسخة أو النافذة (ومنها تبدّل البنود). وهو
  // **متزامنٌ مع التخطيط قبل الرسم** (ResizeObserver): تغيّر العرض بلا تغيّر المدّة يزيح المسار
  // `نسبة × فرق العرض` لإطارٍ واحد، فتُكتب المدّة الجديدة ويُصحَّح الزمن هنا لا بعد إيداع React.
  useEffect(() => {
    const view = viewRef.current;
    const copy = copyRef.current;
    const track = trackRef.current;
    if (!view || !copy || !track) return;
    const measure = () => {
      const next = tickerLoop(
        copy.getBoundingClientRect().width,
        view.getBoundingClientRect().width,
      );
      const prev = written.current;
      if (sameLoop(prev, next)) return;
      written.current = next;
      const [from, to] = [writtenSeconds(prev), writtenSeconds(next)];
      if (from !== null && to !== null && from !== to) retimeLoop(track, from, to);
      setLoop(next);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(copy);
    observer.observe(view);
    return () => observer.disconnect();
  }, [ar]);

  const label = ar ? "شريط الإعلانات — الحالة التشغيلية" : "Announcements — operational status";
  const copies = loop?.copies ?? 2;
  const list = () =>
    items.map((item) => <Item key={item.kind} item={item} ar={ar} flip={flips?.[item.kind]} />);

  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      className="nx-ticker"
      data-run={(ready && loop !== null) || undefined}
      data-offscreen={offscreen || undefined}
    >
      <div className="nx-ticker-window">
        {/* طبقتا الضوء الزخرفيتان (شفقٌ منجرف · غبارٌ نجميّ · مذنّبٌ سفليّ · حدٌّ قزحيّ): خلف المسار، لا تُرسمان
            إلا داخل بوّابة الحركة (CSS)، ولا تدخلان شجرة الوصول ولا قياس النسخة. */}
        <span aria-hidden className="nx-tk-fx" data-fx="a" />
        <span aria-hidden className="nx-tk-fx" data-fx="b" />
        <div ref={viewRef} className="nx-ticker-view" role="region" aria-label={label} tabIndex={0}>
          <div
            ref={trackRef}
            className="nx-ticker-track"
            data-run={(ready && loop !== null) || undefined}
            style={{
              ["--nx-ticker-n" as string]: String(copies),
              ["--nx-ticker-s" as string]: seconds === null ? undefined : `${seconds.toFixed(2)}s`,
            }}
          >
            <ul ref={copyRef} className="nx-ticker-copy">
              {list()}
            </ul>
            {/* النسخ المطابقة للحلقة وحدها: خارج شجرة الوصول وخارج التركيز والبحث. */}
            {Array.from({ length: copies - 1 }, (_, k) => (
              <ul key={k} className="nx-ticker-copy" aria-hidden inert>
                {list()}
              </ul>
            ))}
          </div>
        </div>
      </div>
      {/* العقدة الوحيدة المُعلِنة: موجودةٌ دائمًا (القارئ لا يعلن عقدةً تُركَّب للتوّ)، ونصّها لا
          يتبدّل إلا حين ينتقل صنف الحالة الأمنية إلى «حرجة». */}
      <span role="status" className="nx-tk-sr">
        {announcement ?? ""}
      </span>
    </div>
  );
}

export function HomeTicker(props: Omit<TickerStripProps, "items" | "flips" | "announcement">) {
  const { locale } = useI18n();
  const reads = useHomeReads();
  const items = buildTickerItems(reads);
  // حالةٌ مشتقّة من الخصائص تُحدَّث أثناء الرسم (نمط React المعتمد): تحمل آخر صنفٍ لكل بند، فيُعرف
  // التغيّر بين قراءتين بلا أثرٍ ولا مرجعٍ يُكتب في الرسم.
  const [transitions, setTransitions] = useState<TickerTransitions>(INITIAL_TRANSITIONS);
  const next = nextTransitions(transitions, items);
  if (next !== transitions) setTransitions(next);
  const announcement = next.announce ? pick(next.announce, locale === "ar") : "";
  return <TickerStrip {...props} items={items} flips={next.flips} announcement={announcement} />;
}
