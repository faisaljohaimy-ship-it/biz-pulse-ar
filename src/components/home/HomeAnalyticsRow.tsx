/**
 * صفّ التحليلات — أربع بطاقات يسارًا ← يمينًا كما في الصورة (مواصفة §4.7،
 * وقرارا المالك N2/N1 ٢٠٢٦/١٠/١٤):
 *   الأداء الأمني للمناطق · إحصائيات الحوادث والمخاطر · توزيع أنواع الحوادث ·
 *   حالة الأنظمة.
 *
 * الشبكة (`.nx-home-quad`) `ltr` ترتيبًا فقط (D5)، وكل بطاقة تعلن اتجاه
 * لغتها بنفسها فيبقى نصّها عربيًّا `rtl`. **ورأس بطاقات هذا الصفّ مرسومٌ
 * معكوسًا عن صفّ التشغيل**: العنوان يسارًا والأداة (القائمة / «عرض الكل ›»)
 * يمينًا — هكذا قِيس على بكسلات الصورة (العنوان 253–364 من بطاقةٍ 240–608)،
 * فيُرسم كذلك بـ`row-reverse` في `home-analytics.css` لا بقلب النصّ.
 *
 * ## مصدران لا يُخلطان (N2 — «محاكاة موسومة مطابقة»)
 *
 * لكل رقمٍ مرسوم قيمته المرجعية في `home-reference.ts` (أرقام الصورة نفسها)،
 * والقرار بـ`chooseLive` وحدها: القراءة الحيّة المقيسة تفوز تلقائيًّا بلا
 * سهم تغيّر (خانته «لم يُقَس»)، وإلا فالمرجع كاملًا تحت شارة «محاكاة» ظاهرة
 * في رأس البطاقة — و«محاكاة جزئية» حين يجتمع في البطاقة حيٌّ ومرجع.
 *
 *   أداء المناطق ← `getCommandCenterState().regions[].compliance_pct`
 *                  (`!== null` — الصفر قياس) · `liveOf.state`؛ الحيّ اسمه
 *                  الصادق «الامتثال حسب المنطقة».
 *   الحوادث والمخاطر ← **مرجعٌ دائمًا**: لا سلسلة شهرية في أي قراءة (البلاغات
 *                  صفحةٌ مسقوفة بـ200 صفّ، و`sim_risks` بلا زمن مقروء). وأوامر
 *                  الصيانة الشهرية الحقيقية مقياسٌ آخر لا يُعرض تحت هذا العنوان.
 *   أنواع الحوادث ← `getSecOverview().incidents[].category` · `liveOf.secIncidents`؛
 *                  المجموع الحيّ عدد الصفحة المقروءة فيُسمّى «أحدث البلاغات» لا
 *                  «إجمالي الحوادث».
 *   حالة الأنظمة ← `getExecKpis()` (الكاميرات · البوابات · نقاط التفتيش ·
 *                  الحسّاسات) · `liveOf.execKpis` (يفشل مغلقًا اليوم)؛ وSAP من
 *                  مزوّد `sap` في `getIntegrationsOverview()` · `liveOf.provider`
 *                  — كلمة صحّة لا نسبة.
 *
 * ## الألوان (المواد ٣٢–٣٤ · §3.5)
 *
 * لا لون هنا: كل نبرةٍ صنفٌ أو متغيّر تُترجمه `home-analytics.css` إلى رموز.
 * والأسلوب المضمّن يمرّر متغيّرات فقط (`--region-tint` · `--bar-pct` · `--y` ·
 * `--n`). ثلاثة أحكامٍ مقصودة:
 *   • **أشرطة المناطق بلون المنطقة** لا أخضر/برتقالي الصورة: لونٌ يتبدّل عند
 *     عتبةٍ على نسبة الامتثال حكمٌ مؤلَّف (ممنوعٌ صراحةً في
 *     `command-center.functions.ts`)، ولونٌ وحده يحمل حكمًا (WCAG 1.4.1).
 *   • **شرائح أنواع الحوادث بألوان الهوية** لا أحمر/كهرماني/أخضر: الفئة ليست
 *     حكمًا، وتلك معانٍ محجوزة (`CATEGORY_TONES` و§3.5).
 *   • خطّا الرسم البياني كما رُسما: الحوادث بالأحمر والمخاطر بالكهرماني —
 *     نبرتا صفّ المؤشرات نفسيهما لهذين المقياسين، والكلمة في المفتاح تحمل المعنى.
 *
 * ## الأهداف (§3.7)
 *
 * كل عنصرٍ تفاعلي ≥ 44px لمسًا: أعمدة المناطق (~85×110)، والرسم، والحلقة،
 * وقائمتا الفترة («هذا الشهر» · «12 شهرًا») بهدفٍ 44px حول وجهٍ مرسوم 24px،
 * و«عرض الكل». وصفوف «حالة الأنظمة» (≈20px مرسومة، متلاصقة) **ليست روابط**:
 * هدفٌ بارتفاعها دون الأرضية، والوجهة واحدة في رأس البطاقة.
 *
 * ## البيانات الشخصية (§3.3)
 *
 * أعدادٌ وفئاتٌ فقط — لا يُقرأ منشئ بلاغٍ ولا اسم شخص.
 */
import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, CircleDashed } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { REGIONS, REGION_ACCENT_HEX, type RegionId } from "@/lib/regions";
import { useRegion } from "@/lib/region-context";
import { STAT_TONES } from "@/components/sec/sec-shell";
import { useHomeReads, type HomeReads } from "@/components/home/home-reads";
import { HEALTH_VIEW } from "@/components/home/home-primitives";
import {
  CHANGE_NOT_MEASURED_AR,
  HOME_REFERENCE,
  SIMULATION_BADGE_AR,
  chooseLive,
  labelOf,
  liveOf,
  refRegionPerformance,
  refSystem,
  type RefChange,
  type RefSystemId,
} from "@/components/home/home-reference";
import "@/styles/home/home-analytics.css";

/* ── المفردات المشتركة ─────────────────────────────────────────────────── */

/** الأرقام كما كُتبت في الصورة: لاتينية بفاصل الآلاف — كبقية صفوف الرئيسية. */
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

/** كم رقمًا مرجعيًّا في البطاقة: لا شيء · بعضها · كلّها. */
type SimLevel = "none" | "partial" | "all";
const simLevel = (simulated: number, total: number): SimLevel =>
  simulated === 0 ? "none" : simulated === total ? "all" : "partial";

/** الحالة شكلًا وكلمة: دائرة سليم · مثلث تحذير · مثمّن خطر · متقطّعة لم يُقَس. */
type Verdict = "healthy" | "warning" | "danger" | "neutral";
const VERDICT_AR: Record<Verdict, string | null> = {
  healthy: STAT_TONES.success.badge,
  warning: STAT_TONES.warning.badge,
  danger: STAT_TONES.danger.badge,
  neutral: null,
};

function VerdictGlyph({ verdict }: { verdict: Verdict }) {
  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden
      focusable="false"
      className="nx-ana-verdict"
      data-verdict={verdict}
    >
      {verdict === "healthy" && <circle className="nx-ana-verdict-shape" cx="6" cy="6" r="5.4" />}
      {verdict === "warning" && <path className="nx-ana-verdict-shape" d="M6 0.8L11.4 10.8H0.6Z" />}
      {verdict === "danger" && (
        <path
          className="nx-ana-verdict-shape"
          d="M3.6 0.6H8.4L11.4 3.6V8.4L8.4 11.4H3.6L0.6 8.4V3.6Z"
        />
      )}
      {verdict === "neutral" && <circle className="nx-ana-verdict-ring" cx="6" cy="6" r="4.6" />}
    </svg>
  );
}

/** سطر التغيّر: سهمٌ ونسبة للمرجع، ودائرةٌ متقطّعة و«لم يُقَس» للحيّ. */
function ChangeLine({ change, ar }: { change: RefChange | null; ar: boolean }) {
  if (!change) {
    return (
      <span className="nx-ana-change" data-absent="">
        <CircleDashed aria-hidden />
        {ar ? CHANGE_NOT_MEASURED_AR : "not measured"}
      </span>
    );
  }
  const Arrow = change.dir === "up" ? ArrowUp : ArrowDown;
  return (
    <span className="nx-ana-change" dir="ltr">
      <Arrow aria-hidden />
      {`${fmt(change.pct)}%`}
    </span>
  );
}

const changeWords = (change: RefChange | null, ar: boolean) =>
  change
    ? `${change.dir === "up" ? (ar ? "ارتفاع" : "up") : ar ? "انخفاض" : "down"} ${fmt(change.pct)}%`
    : ar
      ? CHANGE_NOT_MEASURED_AR
      : "not measured";

/* ── قائمة الفترة — `<select>` حقيقي بوجهٍ مرسوم ───────────────────────────
   الوجه (24px) كما رُسم: النصّ يمينًا والسهم يسارًا. والقائمة الأصلية فوقه
   شفّافةً بهدفٍ 44px — لوحة المفاتيح وقارئ الشاشة والمنتقي الأصلي على الجوال
   كلّها من المتصفّح، لا قائمةٌ مصنوعة. */

type PickOption<T extends string> = { readonly id: T; readonly label: string };

function PeriodPick<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly PickOption<T>[];
  onChange: (v: T) => void;
}) {
  const current = options.find((o) => o.id === value) ?? options[0];
  return (
    <span className="nx-ana-pick">
      <span aria-hidden className="nx-ana-pick-face">
        <span className="nx-ana-pick-text">{current.label}</span>
        <ChevronDown />
      </span>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => {
          const next = options.find((o) => o.id === e.target.value);
          if (next) onChange(next.id);
        }}
        className="nx-ana-pick-select"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </span>
  );
}

/* ── البطاقة ───────────────────────────────────────────────────────────── */

function AnaCard({
  id,
  title,
  ar,
  sim,
  simNote,
  control,
  busy,
  failed,
  onRetry,
  kind,
  children,
}: {
  id: string;
  title: string;
  ar: boolean;
  sim: SimLevel;
  /** سبب الشارة لمن يسأل — يُقرأ في `title`. */
  simNote: string;
  control?: ReactNode;
  busy: boolean;
  failed: boolean;
  onRetry: () => void;
  kind: "regions" | "chart" | "types" | "systems";
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      aria-busy={busy || undefined}
      dir={ar ? "rtl" : "ltr"}
      data-kind={kind}
      className="nx-home-panel nx-ana-card"
    >
      <div className="nx-ana-head">
        <div className="nx-ana-heading">
          <h2 id={id} className="nx-ana-title">
            {title}
          </h2>
          {sim !== "none" && (
            <span className="nx-ana-sim" title={simNote}>
              {ar
                ? sim === "all"
                  ? SIMULATION_BADGE_AR
                  : `${SIMULATION_BADGE_AR} جزئية`
                : sim === "all"
                  ? "Simulated"
                  : "Partly simulated"}
            </span>
          )}
        </div>
        {control}
      </div>
      <div className="nx-ana-body">{children}</div>
      {failed && (
        <div role="alert" className="nx-ana-failed">
          <span>{ar ? "تعذّر تحميل البيانات الحيّة." : "Live data could not load."}</span>
          <button type="button" onClick={onRetry} className="nx-home-retry nx-ana-retry">
            {ar ? "أعد المحاولة" : "Retry"}
          </button>
        </div>
      )}
    </section>
  );
}

/** هيكل الانتظار — أشكالٌ ساكنة بلا نصّ: الانتظار يُرى ولا يُقرأ حكمًا. */
function Wait({ ar, count }: { ar: boolean; count: number }) {
  return (
    <div className="nx-ana-wait" data-count={count}>
      <span className="sr-only">{ar ? "جارٍ التحميل" : "Loading"}</span>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} aria-hidden className="nx-home-skeleton nx-ana-wait-item" />
      ))}
    </div>
  );
}

/* ── رموز المناطق — مبانٍ خطّية كما رُسمت بلون المنطقة ───────────────────
   شبكة 32×30 بخطٍّ واحد `currentColor`، واللون من `--region-tint` في
   `home-analytics.css` (ممزوجًا بالحبر في الفاتح ليعبر 3:1 على الأبيض). */

const REGION_GLYPH: Record<RegionId, string> = {
  // الوسطى: برجٌ بقبّةٍ وسارية، يحفّه قوسان مدبّبان.
  central:
    "M3 28.2H29 M16 1.4V4 M13.3 7.6C13.3 5.5 14.5 4 16 4S18.7 5.5 18.7 7.6Z M12.9 28.2V7.6H19.1V28.2 M16 10.4V12.8 M16 15.4V17.8 M14.7 28.2V25.2A1.3 1.3 0 0 1 17.3 25.2V28.2 M5 28.2C5.6 20.6 7.6 14.7 10.7 11.6 M8.3 28.2C8.6 23.6 9.3 20 10.7 17.4 M27 28.2C26.4 20.6 24.4 14.7 21.3 11.6 M23.7 28.2C23.4 23.6 22.7 20 21.3 17.4",
  // الغربية: دارٌ بقبّة يسارًا، وبرجٌ شبكيّ بساريةٍ مائلة يمينًا.
  western:
    "M3 28.2H29 M4.6 28.2V23.4C4.6 20.8 6.6 18.8 9 18.8S13.4 20.8 13.4 23.4V28.2 M7.8 28.2V25.8A1.2 1.2 0 0 1 10.2 25.8V28.2 M15.6 28.2L18.1 9.4H22.1L24.6 28.2 M16.8 19.6H23.4 M17.5 14.4H22.7 M16.8 19.6L22.7 14.4 M17.4 9.4H22.8 M18.6 9.4V6.4H21.6V9.4 M20.1 6.4L23.4 1.8 M21.7 4.1L25 4.9",
  // الشرقية: مبنى صغير يسارًا، وبرجٌ بقبّة وبابٍ مدبّب، ومبنى مائل يمينًا.
  eastern:
    "M3 28.2H29 M4.6 28.2V17.6H9.6V28.2 M6.1 20.6H8.1 M6.1 23.6H8.1 M11.6 28.2V9.6H20.4V28.2 M13.1 9.6C13.1 6.7 14.4 4.9 16 4.9S18.9 6.7 18.9 9.6 M16 4.9V1.8 M13.8 12.6H18.2 M13.8 28.2V20.6C13.8 18 15 16.1 16 15.1 17 16.1 18.2 18 18.2 20.6V28.2 M22.4 28.2V15.1L26.6 13.1V28.2 M24.4 18V20.6",
  // الجنوبية: بيوتٌ برجية — كتلةٌ منخفضة، وبرجٌ عالٍ بقبّة، وكتلتان يمينًا.
  southern:
    "M3 28.2H29 M4.4 28.2V18.2H10 V28.2 M6.1 21.1H8.3 M6.1 24.1H8.3 M11.5 28.2V8.6H19V28.2 M13 8.6C13 5.9 14.1 4.1 15.25 4.1S17.5 5.9 17.5 8.6 M15.25 4.1V1.6 M14 12V24.6 M16.5 12V24.6 M20.6 28.2V13.6H25.4V28.2 M22.3 16.6V24.6 M23.8 16.6V24.6 M27.4 28.2V19.4",
};

function RegionGlyph({ id }: { id: RegionId }) {
  return (
    <svg viewBox="0 0 32 30" aria-hidden focusable="false" className="nx-ana-region-glyph">
      <path d={REGION_GLYPH[id]} />
    </svg>
  );
}

/* ── ١) الأداء الأمني للمناطق ─────────────────────────────────────────── */

type RegionPeriod = "month" | "quarter" | "year";

function RegionsCard({ ar, state }: { ar: boolean; state: HomeReads["state"] }) {
  const { setRegion } = useRegion();
  const [period, setPeriod] = useState<RegionPeriod>("month");
  const ref = HOME_REFERENCE.regionsPerformance;
  const busy = state.isPending && !state.isError;
  const readLive = !busy && !state.isError && liveOf.state(state.data);

  const cols = REGIONS.map((region) => {
    const row = state.data?.regions.find((r) => r.region_id === region.id);
    // `!== null` لا `> 0`: منطقةٌ امتثالها صفرٌ مقيس تُعرض صفرًا.
    const livePct = row && row.compliance_pct !== null ? row.compliance_pct : null;
    return { region, chosen: chooseLive(livePct, readLive, refRegionPerformance(region.id)) };
  });
  const liveCount = cols.filter((c) => !c.chosen.simulated).length;
  const allLive = liveCount === cols.length;
  // المرجع والحيّ كلاهما لقطة «الآن»: لا قياس لربعٍ ولا لعام ⇐ «لم يُقَس».
  const inPeriod = period === "month";
  const sim = busy ? "none" : simLevel(inPeriod ? cols.length - liveCount : 0, cols.length);

  const options: PickOption<RegionPeriod>[] = [
    {
      id: "month",
      label: allLive ? (ar ? "آخر قياس" : "Latest") : ar ? ref.periodLabelAr : "This month",
    },
    { id: "quarter", label: ar ? "هذا الربع" : "This quarter" },
    { id: "year", label: ar ? "هذا العام" : "This year" },
  ];
  const periodLabel = options.find((o) => o.id === period)?.label ?? options[0].label;
  const notMeasured = ar ? CHANGE_NOT_MEASURED_AR : "not measured";

  return (
    <AnaCard
      id="nx-home-region-performance"
      kind="regions"
      title={
        ar
          ? allLive
            ? "الامتثال حسب المنطقة"
            : "الأداء الأمني للمناطق"
          : allLive
            ? "Compliance by region"
            : "Regional security performance"
      }
      ar={ar}
      sim={sim}
      simNote={
        ar
          ? `محاكاة مرجعية بأرقام التصميم${state.isError ? " — تعذّر تحميل الامتثال الحيّ" : ""}؛ المصدر الحيّ: امتثال كل منطقة في الحوكمة`
          : "Reference simulation"
      }
      control={
        <PeriodPick
          label={ar ? "فترة الأداء" : "Period"}
          value={period}
          options={options}
          onChange={setPeriod}
        />
      }
      busy={busy}
      failed={state.isError}
      onRetry={() => void state.refetch()}
    >
      {busy ? (
        <Wait ar={ar} count={4} />
      ) : (
        <ul className="nx-ana-regions">
          {cols.map(({ region, chosen }) => {
            const value = inPeriod ? chosen.value : null;
            const change = inPeriod ? chosen.change : null;
            const simulated = inPeriod && chosen.simulated;
            const name = ar ? region.shortAr : region.shortEn;
            const valueText = value === null ? notMeasured : `${fmt(value)}%`;
            // الاسم يتبع المصدر: المرجع «الأداء الأمني» كما رُسم، والحيّ ما يُعدّ فعلًا.
            const liveMetric = value === null ? !chosen.simulated : !simulated;
            const metric = ar
              ? liveMetric
                ? "نسبة الامتثال"
                : "الأداء الأمني"
              : liveMetric
                ? "Compliance"
                : "Security performance";
            const spoken = [
              ar ? `افتح ${region.labelAr}` : `Open ${region.labelEn}`,
              `${metric} (${periodLabel}): ${valueText}`,
              `${ar ? "التغيّر" : "Change"}: ${changeWords(change, ar)}`,
              simulated ? (ar ? "محاكاة مرجعية" : "reference simulation") : null,
            ]
              .filter(Boolean)
              .join(" — ");
            return (
              <li key={region.id}>
                <Link
                  to="/sec"
                  search={{ region: region.id }}
                  onClick={() => setRegion(region.id)}
                  aria-label={spoken}
                  title={spoken}
                  data-sim={simulated ? "" : undefined}
                  className="nx-ana-region nx-focus-ring"
                  style={{ ["--region-tint" as string]: REGION_ACCENT_HEX[region.id] }}
                >
                  <RegionGlyph id={region.id} />
                  <span className="nx-ana-region-name">{name}</span>
                  <span
                    className="nx-ana-region-value"
                    dir={value === null ? undefined : "ltr"}
                    data-absent={value === null ? "" : undefined}
                  >
                    {valueText}
                  </span>
                  {/* لا شريط بلا قياس — الغياب نصٌّ، لا مسارٌ فارغ يوهم بصفر. */}
                  {value !== null ? (
                    <span aria-hidden className="nx-ana-region-bar">
                      <span
                        className="nx-ana-region-fill"
                        style={{
                          ["--bar-pct" as string]: `${Math.max(0, Math.min(100, value))}%`,
                        }}
                      />
                    </span>
                  ) : (
                    <span aria-hidden className="nx-ana-region-bar" data-absent="" />
                  )}
                  <ChangeLine change={change} ar={ar} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AnaCard>
  );
}

/* ── ٢) إحصائيات الحوادث والمخاطر — SVG خالص (§3.8) ───────────────────────
   الزمن يسارًا ← يمينًا كما رُسم (يناير يسارًا)، فالشكل `ltr` والكلمات عربية.
   المحاور والمفتاح HTML بأحجام بكسل حقيقية (≥ 12px كما تُرى)، والرسم وحده
   SVG ممدودٌ على عرض خانته (`preserveAspectRatio="none"`) بخطوطٍ ونقاطٍ لا
   تتمدّد (`non-scaling-stroke`): النقطة قطعةٌ صفرية الطول بغطاءٍ دائري، فتبقى
   دائرةً مهما امتدّ العرض. */

const PLOT_W = 120;
const PLOT_H = 100;
/** ارتفاع الرسم المعروض (px) — مثبّت في `home-analytics.css` بالقيمة نفسها. */
const PLOT_PX = 80;
/** نصف عرض العمود (px) — غطاؤه الدائري يعلو قمّته بقدره، فيُطرح منها. */
const BAR_CAP_PX = 3;

/** منحنى ناعم عبر النقاط (كاتمول-روم إلى بيزييه مكعّب). */
function smoothPath(pts: readonly (readonly [number, number])[]): string {
  const f = (n: number) => n.toFixed(2);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(
      p2[0] - (p3[0] - p1[0]) / 6,
    )} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

type Span = "12" | "6";

function IncidentsRisksCard({ ar }: { ar: boolean }) {
  const uid = `nx-ana-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const ref = HOME_REFERENCE.incidentsRisksChart;
  const [span, setSpan] = useState<Span>("12");

  const from = span === "6" ? ref.months.length - 6 : 0;
  const months = ref.months.slice(from);
  const n = months.length;
  const yMax = Math.max(...ref.yTicks);
  const xAt = (i: number) => ((i + 0.5) / n) * PLOT_W;
  const yAt = (v: number) => PLOT_H - (v / yMax) * PLOT_H;
  const capUnits = BAR_CAP_PX * (PLOT_H / PLOT_PX);
  const series = ref.series.map((s) => ({ ...s, values: s.values.slice(from) }));
  const columns = ref.columns.slice(from);
  // يُرسم الأحمر أولًا فيعلوه الكهرماني كما في الصورة.
  const drawOrder = [...series].reverse();

  const options: PickOption<Span>[] = [
    { id: "12", label: ar ? ref.periodLabelAr : "12 months" },
    { id: "6", label: ar ? "6 أشهر" : "6 months" },
  ];
  const spanLabel = options.find((o) => o.id === span)?.label ?? options[0].label;
  const title = ar ? "إحصائيات الحوادث والمخاطر" : "Incidents & risks";
  const legendName = (id: string, labelAr: string) =>
    ar ? labelAr : id === "risks" ? "Risks" : "Incidents";

  return (
    <AnaCard
      id="nx-home-incidents-risks"
      kind="chart"
      title={title}
      ar={ar}
      sim="all"
      simNote={
        ar
          ? "محاكاة مرجعية بأرقام التصميم — لا سلسلة شهرية مقيسة للحوادث والمخاطر بعد"
          : "Reference simulation — no measured monthly series yet"
      }
      control={
        <PeriodPick
          label={ar ? "مدى الرسم البياني" : "Chart range"}
          value={span}
          options={options}
          onChange={setSpan}
        />
      }
      busy={false}
      failed={false}
      onRetry={() => undefined}
    >
      <figure dir="ltr" className="nx-ana-chart">
        <ul aria-hidden dir={ar ? "rtl" : "ltr"} className="nx-ana-legend">
          {series.map((s) => (
            <li key={s.id} className="nx-ana-legend-item">
              <span>{legendName(s.id, s.labelAr)}</span>
              <span className="nx-ana-legend-dot" data-series={s.id} />
            </li>
          ))}
        </ul>
        <ol aria-hidden className="nx-ana-yaxis">
          {[...ref.yTicks].reverse().map((t) => (
            <li key={t} style={{ ["--y" as string]: String(t / yMax) }}>
              {fmt(t)}
            </li>
          ))}
        </ol>
        <Link
          to="/sec/incidents"
          className="nx-ana-plot nx-focus-ring"
          aria-label={
            ar
              ? `${title} (${spanLabel}) — محاكاة مرجعية — افتح سجل البلاغات`
              : `${title} (${spanLabel}) — reference simulation — open incidents`
          }
          title={ar ? `${title} — محاكاة مرجعية بأرقام التصميم` : title}
        >
          <svg
            viewBox={`0 0 ${PLOT_W} ${PLOT_H}`}
            preserveAspectRatio="none"
            aria-hidden
            focusable="false"
          >
            <defs>
              <linearGradient
                id={`${uid}-bar`}
                gradientUnits="userSpaceOnUse"
                x1="0"
                y1="0"
                x2="0"
                y2={PLOT_H}
              >
                <stop offset="0" className="nx-ana-bar-stop-a" />
                <stop offset="1" className="nx-ana-bar-stop-b" />
              </linearGradient>
              {/* يقصّ غطاء العمود السفلي عند خطّ الصفر. */}
              <clipPath id={`${uid}-clip`}>
                <rect x="0" y={-PLOT_H} width={PLOT_W} height={PLOT_H * 2} />
              </clipPath>
            </defs>
            {Array.from({ length: n - 1 }, (_, i) => (
              <line
                key={i}
                x1={((i + 1) / n) * PLOT_W}
                x2={((i + 1) / n) * PLOT_W}
                y1="0"
                y2={PLOT_H}
                className="nx-ana-gridline"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <g clipPath={`url(#${uid}-clip)`}>
              {columns.map((v, i) =>
                v === null ? null : (
                  <line
                    key={i}
                    x1={xAt(i)}
                    x2={xAt(i)}
                    y1={PLOT_H + capUnits}
                    y2={Math.min(PLOT_H, yAt(v) + capUnits)}
                    stroke={`url(#${uid}-bar)`}
                    className="nx-ana-bar"
                    vectorEffect="non-scaling-stroke"
                  />
                ),
              )}
            </g>
            {drawOrder.map((s) => (
              <path
                key={s.id}
                d={smoothPath(s.values.map((v, i) => [xAt(i), yAt(v)] as const))}
                data-series={s.id}
                className="nx-ana-line"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {drawOrder.map((s) => (
              <g key={s.id} data-series={s.id}>
                {s.values.map((v, i) => {
                  const d = `M${xAt(i).toFixed(2)} ${yAt(v).toFixed(2)}h0.01`;
                  return (
                    <g key={i}>
                      <path d={d} className="nx-ana-dot-ring" vectorEffect="non-scaling-stroke" />
                      <path
                        d={d}
                        data-series={s.id}
                        className="nx-ana-dot"
                        vectorEffect="non-scaling-stroke"
                      />
                    </g>
                  );
                })}
              </g>
            ))}
          </svg>
        </Link>
        <ol
          aria-hidden
          className="nx-ana-xaxis"
          data-n={n}
          style={{ ["--n" as string]: String(n) }}
        >
          {months.map((m, i) => (
            <li
              key={m}
              data-odd={i % 2 === 1 ? "" : undefined}
              data-third={i % 3 === 0 ? "" : undefined}
            >
              {ar ? m : String(from + i + 1)}
            </li>
          ))}
        </ol>
      </figure>
      {/* البديل النصّي للرسم: القيم نفسها جدولًا (WCAG 1.1.1). والأعمدة
          الزرقاء مرسومةٌ في الصورة بلا مفتاح، فتُسمّى بذلك لا باسمٍ مخترع. */}
      <table className="sr-only">
        <caption>
          {ar
            ? `${title} — ${spanLabel} — محاكاة مرجعية بأرقام التصميم`
            : `${title} — ${spanLabel} — reference simulation`}
        </caption>
        <thead>
          <tr>
            <th scope="col">{ar ? "الشهر" : "Month"}</th>
            {series.map((s) => (
              <th key={s.id} scope="col">
                {legendName(s.id, s.labelAr)}
              </th>
            ))}
            <th scope="col">{ar ? "الأعمدة الزرقاء (بلا مفتاح في التصميم)" : "Blue columns"}</th>
          </tr>
        </thead>
        <tbody>
          {months.map((m, i) => (
            <tr key={m}>
              <th scope="row">{m}</th>
              {series.map((s) => (
                <td key={s.id}>{fmt(s.values[i])}</td>
              ))}
              <td>
                {columns[i] === null
                  ? ar
                    ? CHANGE_NOT_MEASURED_AR
                    : "not measured"
                  : fmt(columns[i] as number)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AnaCard>
  );
}

/* ── ٣) توزيع أنواع الحوادث ───────────────────────────────────────────── */

/** فئات البلاغات المعروفة بالعربية؛ وغيرها يُعرض بنصّه (والتصدير الحقيقي عربيّ). */
const INCIDENT_CATEGORY_AR: Record<string, string> = {
  access: "التحكم بالدخول",
  cctv: "كاميرات المراقبة",
  gas_leak: "تسرّب غاز",
  perimeter: "محيط أمني",
  safety: "سلامة",
};

type Slice = {
  key: string;
  label: string;
  count: number;
  pct: number;
  /** موضع لون الهوية (0–3)، أو «أخرى» الرمادية. */
  tone: "0" | "1" | "2" | "3" | "other";
};

const DONUT_VIEW = 112;
const DONUT_R = 47;
const DONUT_STROKE = 17;
/** فاصلٌ رفيع بين الشرائح كما رُسم (بوحدات المحيط). */
const DONUT_GAP = 1.6;

function IncidentTypesCard({ ar, sec }: { ar: boolean; sec: HomeReads["sec"] }) {
  const ref = HOME_REFERENCE.incidentTypes;
  const busy = sec.isPending && !sec.isError;
  const live = !busy && !sec.isError && liveOf.secIncidents(sec.data);

  let slices: Slice[];
  let total: number;
  if (live) {
    const rows = sec.data?.incidents ?? [];
    const byCat = new Map<string, number>();
    for (const r of rows) {
      const prev = byCat.get(r.category);
      byCat.set(r.category, prev === undefined ? 1 : prev + 1);
    }
    const ranked = [...byCat.entries()].sort((a, b) => b[1] - a[1]);
    total = rows.length;
    const top = ranked.length > 5 ? ranked.slice(0, 4) : ranked;
    const rest = ranked.length > 5 ? ranked.slice(4).reduce((s, [, v]) => s + v, 0) : 0;
    slices = top.map(([key, count], i) => ({
      key,
      label: ar ? (INCIDENT_CATEGORY_AR[key] ?? key) : key,
      count,
      pct: Math.round((count / total) * 100),
      tone: String(i % 4) as Slice["tone"],
    }));
    if (rest > 0) {
      slices.push({
        key: "other",
        label: ar ? "أخرى" : "Other",
        count: rest,
        pct: Math.round((rest / total) * 100),
        tone: "other",
      });
    }
  } else {
    total = ref.total;
    let i = 0;
    slices = ref.slices.map((s) => ({
      key: s.id,
      label: ar ? s.labelAr : s.id.replace(/-/g, " "),
      count: s.count,
      pct: s.pct,
      tone: s.id === "other" ? "other" : (String(i++ % 4) as Slice["tone"]),
    }));
  }

  const caption = live
    ? ar
      ? "أحدث البلاغات"
      : "latest incidents"
    : ar
      ? ref.totalLabelAr
      : "total incidents";
  const c = 2 * Math.PI * DONUT_R;
  let offset = 0;
  const title = ar ? "توزيع أنواع الحوادث" : "Incident types";
  const spoken = [
    `${title}: ${caption} ${fmt(total)}`,
    ...slices.map((s) => `${s.label} ${fmt(s.pct)}%`),
    live ? null : ar ? "محاكاة مرجعية" : "reference simulation",
    ar ? "افتح سجل البلاغات" : "open incidents",
  ]
    .filter(Boolean)
    .join(ar ? "، " : ", ");

  return (
    <AnaCard
      id="nx-home-incident-types"
      kind="types"
      title={title}
      ar={ar}
      sim={busy || live ? "none" : "all"}
      simNote={
        ar
          ? `محاكاة مرجعية بأرقام التصميم${sec.isError ? " — تعذّر تحميل البلاغات" : ""}؛ المصدر الحيّ: فئات أحدث البلاغات`
          : "Reference simulation"
      }
      busy={busy}
      failed={sec.isError}
      onRetry={() => void sec.refetch()}
    >
      {busy ? (
        <Wait ar={ar} count={1} />
      ) : live && total === 0 ? (
        <p className="nx-ana-empty">{ar ? "لا بلاغات لتوزيعها." : "No incidents to break down."}</p>
      ) : (
        <div className="nx-ana-types">
          <ul className="nx-ana-types-legend">
            {slices.map((s) => (
              <li key={s.key} className="nx-ana-types-row">
                <span className="nx-ana-types-pct" dir="ltr">{`${fmt(s.pct)}%`}</span>
                <span className="nx-ana-types-label" title={s.label}>
                  {s.label}
                </span>
                <span aria-hidden className="nx-ana-types-dot" data-tone={s.tone} />
              </li>
            ))}
          </ul>
          <Link
            to="/sec/incidents"
            aria-label={spoken}
            title={spoken}
            className="nx-ana-donut nx-focus-ring"
          >
            <svg viewBox={`0 0 ${DONUT_VIEW} ${DONUT_VIEW}`} aria-hidden focusable="false">
              <circle
                cx={DONUT_VIEW / 2}
                cy={DONUT_VIEW / 2}
                r={DONUT_R}
                strokeWidth={DONUT_STROKE}
                className="nx-ana-donut-track"
              />
              {total > 0 &&
                slices.map((s) => {
                  const len = (s.count / total) * c;
                  const gap = slices.length > 1 ? DONUT_GAP : 0;
                  const el = (
                    <circle
                      key={s.key}
                      cx={DONUT_VIEW / 2}
                      cy={DONUT_VIEW / 2}
                      r={DONUT_R}
                      strokeWidth={DONUT_STROKE}
                      strokeDasharray={`${Math.max(0, len - gap)} ${c}`}
                      strokeDashoffset={-offset}
                      transform={`rotate(-90 ${DONUT_VIEW / 2} ${DONUT_VIEW / 2})`}
                      data-tone={s.tone}
                      className="nx-ana-donut-slice"
                    />
                  );
                  offset += len;
                  return el;
                })}
            </svg>
            <span aria-hidden className="nx-ana-donut-center">
              <span className="nx-ana-donut-num" dir="ltr">
                {fmt(total)}
              </span>
              <span className="nx-ana-donut-cap">{caption}</span>
            </span>
          </Link>
        </div>
      )}
    </AnaCard>
  );
}

/* ── ٤) حالة الأنظمة ──────────────────────────────────────────────────── */

type SysRow = {
  id: RefSystemId;
  label: string;
  /** نصّ القيمة؛ `null` ⇐ «لم يُقَس». */
  value: string | null;
  stateWord: string;
  verdict: Verdict;
  simulated: boolean;
};

function SystemsCard({
  ar,
  execKpis,
  integrations,
}: {
  ar: boolean;
  execKpis: HomeReads["execKpis"];
  integrations: HomeReads["integrations"];
}) {
  const execBusy = execKpis.isPending && !execKpis.isError;
  const intBusy = integrations.isPending && !integrations.isError;
  const busy = execBusy || intBusy;
  const execLive = !execBusy && !execKpis.isError && liveOf.execKpis(execKpis.data);
  const k = execKpis.data;
  const notMeasured = ar ? CHANGE_NOT_MEASURED_AR : "not measured";

  /** صفّ نسبةٍ من مؤشرات اللوحة التنفيذية: الحيّ المقيس يفوز، وإلا المرجع. */
  const pctRow = (id: RefSystemId, live: number | null | undefined, en: string): SysRow => {
    const ref = refSystem(id);
    const chosen = chooseLive(live, execLive, ref);
    return {
      id,
      label: ar ? labelOf(ref, chosen.simulated) : en,
      value: `${fmt(chosen.value)}%`,
      // لا حكم تشغيلٍ مقيس للحيّ: «يعمل» كلمة المرجع وحده.
      stateWord: chosen.simulated ? (ar ? ref.stateAr : "Running") : notMeasured,
      verdict: chosen.simulated ? "healthy" : "neutral",
      simulated: chosen.simulated,
    };
  };

  // الحسّاسات: «N من M» في الإنذار — والمقام صفر يعني لا حسّاسات ⇐ لا قياس.
  const iotRef = refSystem("iot");
  const iotLive = execLive && k !== undefined && k.sensors_total > 0;
  const iot: SysRow = iotLive
    ? {
        id: "iot",
        label: ar ? iotRef.liveLabelAr : "Sensors in alarm",
        value: ar
          ? `${fmt(k.sensors_alarming)} من ${fmt(k.sensors_total)}`
          : `${fmt(k.sensors_alarming)}/${fmt(k.sensors_total)}`,
        stateWord: notMeasured,
        verdict: "neutral",
        simulated: false,
      }
    : {
        id: "iot",
        label: ar ? iotRef.labelAr : "IoT platform",
        value: `${fmt(iotRef.value)}%`,
        stateWord: ar ? iotRef.stateAr : "Running",
        verdict: "healthy",
        simulated: true,
      };

  // SAP: الحيّ كلمة صحّة بشكلها (لا نسبة) — والنسبة حينها «لم يُقَس».
  const sapRef = refSystem("sap");
  const provider = integrations.data?.providers.find((p) => p.id === "sap");
  const sapLive = !intBusy && !integrations.isError && liveOf.provider(provider);
  const SAP_VERDICT: Record<string, Verdict> = {
    healthy: "healthy",
    degraded: "warning",
    error: "danger",
  };
  const sap: SysRow =
    sapLive && provider
      ? {
          id: "sap",
          label: ar ? sapRef.liveLabelAr : "SAP integration",
          value: null,
          stateWord: ar ? HEALTH_VIEW[provider.health].ar : HEALTH_VIEW[provider.health].en,
          verdict: SAP_VERDICT[provider.health] ?? "neutral",
          simulated: false,
        }
      : {
          id: "sap",
          label: ar ? sapRef.labelAr : "SAP integration",
          value: `${fmt(sapRef.value)}%`,
          stateWord: ar ? sapRef.stateAr : "Running",
          verdict: "healthy",
          simulated: true,
        };

  const rows: SysRow[] = [
    pctRow("cctv", k?.cctv_health, "CCTV"),
    pctRow("access", k?.access_health, "Access control"),
    pctRow("patrols", k?.patrol_completion, "Patrols"),
    sap,
    iot,
  ];
  const simCount = rows.filter((r) => r.simulated).length;

  return (
    <AnaCard
      id="nx-home-systems-health"
      kind="systems"
      title={ar ? "حالة الأنظمة" : "Systems status"}
      ar={ar}
      sim={busy ? "none" : simLevel(simCount, rows.length)}
      simNote={
        ar
          ? `محاكاة مرجعية بأرقام التصميم لما لم يُقَس حيًّا: ${rows
              .filter((r) => r.simulated)
              .map((r) => r.label)
              .join("، ")}`
          : "Reference simulation"
      }
      control={
        <Link to="/integrations" className="nx-home-more nx-ana-more">
          <span className="nx-ana-more-face">
            {ar ? "عرض الكل" : "View all"}
            <ChevronRight aria-hidden />
          </span>
        </Link>
      }
      busy={busy}
      failed={execKpis.isError || integrations.isError}
      onRetry={() => {
        if (execKpis.isError) void execKpis.refetch();
        if (integrations.isError) void integrations.refetch();
      }}
    >
      {busy ? (
        <Wait ar={ar} count={5} />
      ) : (
        <ul className="nx-ana-sys">
          {rows.map((r) => {
            const verdictWord = VERDICT_AR[r.verdict];
            return (
              <li
                key={r.id}
                className="nx-ana-sys-row"
                data-sim={r.simulated ? "" : undefined}
                title={
                  ar
                    ? `${r.label}: ${r.value ?? notMeasured} — ${r.stateWord}${r.simulated ? " — محاكاة مرجعية" : ""}`
                    : r.label
                }
              >
                <span
                  className="nx-ana-sys-value"
                  dir={r.value === null ? undefined : "ltr"}
                  data-absent={r.value === null ? "" : undefined}
                >
                  {r.value ?? notMeasured}
                </span>
                <span className="nx-ana-sys-name">{r.label}</span>
                <span className="nx-ana-sys-state" data-verdict={r.verdict}>
                  {verdictWord && ar && <span className="sr-only">{`${verdictWord}: `}</span>}
                  {r.stateWord}
                  {r.simulated && (
                    <span className="sr-only">{ar ? " (محاكاة)" : " (simulated)"}</span>
                  )}
                </span>
                <VerdictGlyph verdict={r.verdict} />
              </li>
            );
          })}
        </ul>
      )}
    </AnaCard>
  );
}

/* ── الصفّ ──────────────────────────────────────────────────────────────── */

export function HomeAnalyticsRow() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  // المفاتيح نفسها التي يقرأ منها صفّ المؤشرات والتشغيل: طلبٌ واحد ورقمٌ واحد.
  const { sec, state, integrations, execKpis } = useHomeReads();
  return (
    <div dir="ltr" className="nx-home-quad nx-ana-quad">
      <RegionsCard ar={ar} state={state} />
      <IncidentsRisksCard ar={ar} />
      <IncidentTypesCard ar={ar} sec={sec} />
      <SystemsCard ar={ar} execKpis={execKpis} integrations={integrations} />
    </div>
  );
}
