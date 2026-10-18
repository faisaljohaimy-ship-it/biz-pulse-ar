/**
 * صفّ مؤشرات الرئيسية — المؤشرات السبعة (أمر المالك ٢٠٢٦/٠٩/٢٩).
 *
 * «طبّق هذا الشكل على صفحة النظام الرئيسية مع تفعيل جميع الأيقونات». والشكل
 * يُبنى من **قراءاتٍ قائمة لا من أرقامٍ تُكتب له**:
 *
 *   • `getSecOverview`  — البلاغات والدوريات والأصول والمواقع (ومنها عدد
 *     الحرّاس المسجَّل على كل موقع).
 *   • `getCommandCenterState` — الامتثال لكل منطقة (بمفتاح الرئيسية نفسه)،
 *     ومنه «الامتثال العام» متوسطًا للمقيس وحده.
 *   • `getRiskBoard`     — عدد المخاطر العالية (بمفتاح الرئيسية نفسه).
 *   • `getExecKpis`      — الكاميرات المتصلة من إجماليها.
 *
 * **صفّ المؤشرات بأرقام الصورة موسومةً (قرار المالك N2، ٢٠٢٦/١٠/١٤):** كل
 * رقمٍ وسهم تغيّر ومنحنى صغير مرسوم يُعرض كما رُسم من المحاكاة المرجعية
 * (`home-reference.ts`) تحت شارة «محاكاة» ظاهرة على بطاقته — والقيمة الحيّة
 * تفوز تلقائيًّا متى وصلت مقيسة، باسمها الصادق، وخانة تغيّرها «لم يُقَس»:
 * لا سهمٌ مرجعي فوق رقمٍ حيّ (المادة ٢٧).
 *
 * كل مؤشر **رابطٌ إلى شاشته الحيّة** — والوجهات تُقاس في عقدها على شجرة
 * المسارات المولَّدة، فلا أيقونة ميتة.
 *
 * **مركز القيادة (أمر المالك ٢٠٢٦/١٠/١٣):** القراءات في `home-reads.ts` وحال
 * القراءة في `home-primitives.tsx`. ولوحات التشغيل وأسئلة سَدِيد السريعة التي
 * كانت هنا حُذفت (٢٠٢٦/١٠/١٧) بعد أن خلفتها صفوف الرئيسية الجديدة:
 * `HomeMapCard` · `HomeOpsRow` · `HomeAnalyticsRow` · `HomeSadeedCard`.
 */
import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, CircleDashed } from "lucide-react";
import { useId, type ComponentType, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { useHomeReads } from "@/components/home/home-reads";
import { statusOf, type ReadStatus } from "@/components/home/home-primitives";
import {
  CHANGE_NOT_MEASURED_AR,
  SIMULATION_BADGE_AR,
  chooseLive,
  labelOf,
  liveOf,
  refKpi,
  type RefKpi,
  type RefKpiId,
} from "@/components/home/home-reference";
import "@/styles/home/home-kpi.css";

/* ── المؤشرات — صفّ «مركز القيادة» السبعة (المواصفة §4.3، وقرار المالك N2) ──
   الترتيب يسارًا ← يمينًا كما في الصورة (D5)، والنصّ داخل كل بطاقة باتجاه
   لغته. وتشريح البطاقة كما رُسم بحذافيره: التسمية أعلى اليمين والرقم تحتها،
   وبلاطة الرمز الملوّنة يسارًا، وسطر التغيّر (سهم + نسبة) أسفل اليسار،
   والمنحنى الصغير أسفل اليمين.

   **الرقم من مصدرين لا يُخلطان** (`chooseLive`): القراءة الحيّة متى وصلت
   مقيسةً — باسمها الصادق، بلا سهمٍ ولا منحنى، وخانة تغيّرها «لم يُقَس» — وإلا
   فأرقام الصورة نفسها من المحاكاة المرجعية، بتسميتها المرسومة وسهمها
   ومنحناها، وشارة «محاكاة» ظاهرة على البطاقة. لا صفر بدل الغياب، ولا رقمٌ
   مرجعي بلا شارة، ولا رقمٌ يُدّعى قبل وصول قراءته (الانتظار هيكلٌ ساكن). */

/**
 * نبرة البطاقة كما رُسمت: درعٌ أخضر · مثمّنٌ أحمر (خطر — مثلث الصورة الأحمر
 * يُرسم مثمّنًا، عرف لوحات السلامة) · مثلثٌ برتقالي (تحذير) · وثلاث زرقات
 * للعدّ كما رُسمت (الأفراد والأصول أزرق · السيارة أزرق سماوي · الكاميرا أزرق
 * فاتح). والنبرة تُترجم في `home-kpi.css` إلى رموزٍ وحدها (لون الرمز وغسلة
 * البلاطة ولون التغيّر ولون الرقم) — فاللون لا يُكتب هنا، والشكل والكلمة
 * يحملان المعنى.
 */
type KpiTone = "ok" | "danger" | "warning" | "blue" | "cyan" | "sky";

interface Kpi {
  readonly id: RefKpiId;
  /** الاسم الإنجليزي الصادق للمقياس الحيّ، والمرسوم مع المرجع. العربي من المرجع. */
  readonly en: string;
  readonly enDrawn: string;
  /** القيمة الحيّة. `null` = لم تصل أو لم تُقَس — لا تُستبدل بصفر (المادة ٢٧). */
  readonly value: number | null;
  /** هل القراءة حيّة (لا محاكاة الخادم)؟ من كاشفات `liveOf` وحدها. */
  readonly live: boolean;
  /**
   * وحدة القيمة **الحيّة**: «%» أو مقام «من M» — جزءٌ من القياس نفسه. `spaced`
   * يضع قبلها هامشًا فلا تلتصق بالرقم، وتنزل كاملةً تحته إن ضاق السطر.
   */
  readonly unit?: { readonly ar: string; readonly en: string; readonly spaced?: boolean };
  /** كيف حُسب الرقم الحيّ حين لا يكفيه اسمه — يُقرأ في العنوان والتسمية. */
  readonly sub?: { readonly ar: string; readonly en: string };
  readonly glyph: ComponentType<{ className?: string }>;
  readonly to: string;
  /** مصدر الرقم الحيّ بالكلمات — يُقرأ في `title` لمن يسأل «من أين هذا؟». */
  readonly sourceAr: string;
  /**
   * حال القراءة — ثلاثٌ لا تُدمج: التحميل انتظار (هيكل)، والخطأ تعذّر وصول
   * (المرجع الموسوم مكانه ويُقال السبب)، و«جاهزة» تحسمها `chooseLive`.
   */
  readonly status: ReadStatus;
  readonly tone: KpiTone;
}

/** الأرقام كما كُتبت في الصورة: أرقامٌ لاتينية بفاصل الآلاف («5,997»). */
const fmtKpi = (n: number) => Math.round(n).toLocaleString("en-US");

export function HomeKpiRow() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { sec, state, risk, execKpis } = useHomeReads();
  const counts = sec.data?.counts;
  const sites = sec.data?.sites;
  const regions = state.data?.regions;
  const exec = execKpis.data;

  // «الامتثال العام» متوسط المناطق المقيسة وحدها — `!== null` لا `> 0`:
  // الصفر قياس. ولا يُقرأ `counters.compliance_avg` من الخادم: يعيد صفرًا
  // حين لا تُقاس منطقة، وهنا الغياب «لم يُقَس» لا ٠٪.
  const measuredPct: number[] = [];
  for (const r of regions ?? []) if (r.compliance_pct !== null) measuredPct.push(r.compliance_pct);
  const complianceMean = measuredPct.length
    ? measuredPct.reduce((s, v) => s + v, 0) / measuredPct.length
    : null;

  // الكاميرات «N من M» — ولا مقام صفري: بلا كاميرا مسجَّلة لا اتصال يُقاس
  // (كنسبة نقاط التفتيش في لوحة الدوريات: «ولا نسبة بلا مقام»).
  const camTotal = exec ? exec.cameras_total : null;

  const kpis: Kpi[] = [
    {
      // الصورة: «الحالة الأمنية العامة» — لا مركّب مقيس لها في النظام
      // (المركّبات السابقة محظورة)، فالحيّ أقرب مقياسٍ حقيقي باسمه (§9).
      id: "compliance",
      tone: "ok",
      en: "Overall compliance",
      enDrawn: "Overall security status",
      value: complianceMean,
      live: liveOf.state(state.data),
      unit: { ar: "%", en: "%" },
      sub:
        regions && measuredPct.length
          ? {
              ar: `متوسط المناطق المقيسة (${fmtKpi(measuredPct.length)} من ${fmtKpi(regions.length)})`,
              en: `Mean of measured regions (${measuredPct.length} of ${regions.length})`,
            }
          : { ar: "متوسط المناطق المقيسة", en: "Mean of measured regions" },
      glyph: ShieldGlyph,
      to: "/sec/governance",
      sourceAr: "متوسط نسب الامتثال للمناطق المقيسة وحدها",
      status: statusOf(state),
    },
    {
      // الصورة: «الحوادث النشطة» — والحيّ يُقرأ من صفوف البلاغات نفسها.
      id: "incidents",
      tone: "danger",
      en: "Open incidents",
      enDrawn: "Active incidents",
      value: counts ? counts.incidents_open : null,
      live: liveOf.secIncidents(sec.data),
      glyph: OctagonGlyph,
      to: "/sec/incidents",
      sourceAr: "بلاغات حالتها غير مغلقة",
      status: statusOf(sec),
    },
    {
      // الصورة: «المخاطر الحرجة» — والمصدر يدمج الحرجة في العالية.
      id: "risks",
      tone: "warning",
      en: "High risks",
      enDrawn: "Critical risks",
      value: risk.data ? risk.data.rows.filter((r) => r.severity === "high").length : null,
      live: liveOf.risk(risk.data),
      sub: { ar: "تشمل الحرجة", en: "Includes critical" },
      glyph: TriangleGlyph,
      to: "/sec/risks",
      sourceAr: "مخاطر السجل بأولوية حرجة أو عالية",
      status: statusOf(risk),
    },
    {
      // الصورة: «إجمالي الأفراد» — والحيّ يقول ما يُعدّ: حرّاس المواقع
      // المسجَّلون، لا حضورًا فعليًّا لا مصدر له في النظام.
      id: "guards",
      tone: "blue",
      en: "Site guards",
      enDrawn: "Total personnel",
      value: sites && sites.length ? sites.reduce((s, x) => s + x.guards_count, 0) : null,
      live: liveOf.sec(sec.data),
      glyph: PeopleGlyph,
      to: "/sec/shifts",
      sourceAr: "مجموع الحرّاس المسجَّلين على المواقع",
      status: statusOf(sec),
    },
    {
      id: "patrols",
      tone: "cyan",
      en: "Active patrols",
      enDrawn: "Active patrols",
      value: counts ? counts.patrols_active : null,
      live: liveOf.sec(sec.data),
      glyph: CarGlyph,
      to: "/sec/patrols",
      sourceAr: "دوريات حالتها نشطة",
      status: statusOf(sec),
    },
    {
      // الصورة: «الكاميرات العاملة» — والحيّ «N من M» المتصلة من المسجَّلة.
      id: "cameras",
      tone: "sky",
      en: "Cameras online",
      enDrawn: "Working cameras",
      value: exec && camTotal ? exec.cameras_online : null,
      live: liveOf.execKpis(exec),
      unit:
        camTotal !== null && camTotal > 0
          ? { ar: `من ${fmtKpi(camTotal)}`, en: `of ${fmtKpi(camTotal)}`, spaced: true }
          : undefined,
      glyph: CctvGlyph,
      to: "/sec/cctv",
      sourceAr: "كاميرات متصلة من إجمالي الكاميرات المسجَّلة",
      status: statusOf(execKpis),
    },
    {
      // الصورة: «الأصول الحرجة» — لا مصدر له؛ والحيّ الأقرب الأصول المتعطّلة.
      id: "assets",
      tone: "blue",
      en: "Assets offline",
      enDrawn: "Critical assets",
      value: counts ? counts.assets_offline : null,
      live: liveOf.sec(sec.data),
      glyph: BuildingGlyph,
      to: "/sec/maintenance",
      sourceAr: "أصول حالتها غير متصلة أو متدهورة",
      status: statusOf(sec),
    },
  ];

  return (
    <section aria-labelledby="nx-home-kpis-heading" className="nx-bp-stage">
      <h2 id="nx-home-kpis-heading" className="sr-only">
        {ar ? "المؤشرات الرئيسية" : "Key indicators"}
      </h2>
      {/* الصفّ `ltr` ترتيبًا فقط (D5): بطاقة الحالة الأمنية أولًا من اليسار
          كما في الصورة، وكل بطاقة تعلن اتجاه لغتها فلا يُقلب نصّها. */}
      <ul dir="ltr" className="nx-home-kpis">
        {kpis.map((k, i) => (
          // الترتيب يمرّ متغيّرًا لا قيمة: تأخير الدخول المتتابع يُحسب منه في
          // `styles/home/home-motion.css` (أمر المالك ٢٠٢٦/١٠/١٧).
          <li key={k.id} className="nx-home-kpi-cell" style={{ ["--nx-i" as string]: i }}>
            <KpiCard k={k} ar={ar} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function KpiCard({ k, ar }: { k: Kpi; ar: boolean }) {
  const ref: RefKpi = refKpi(k.id);
  const loading = k.status === "loading";
  // القاعدة الواحدة (N2): الحيّ المقيس يفوز بلا سهمٍ ولا منحنى، وإلا المرجع
  // كاملًا موسومًا. والخطأ والانتظار لا يحملان رقمًا حيًّا.
  const chosen = chooseLive(
    k.status === "ready" ? k.value : null,
    k.status === "ready" && k.live,
    ref,
  );
  const simulated = chosen.simulated;
  const label = ar ? labelOf(ref, simulated) : simulated ? k.enDrawn : k.en;

  // الوحدة: «%» المرسومة مع المرجع (جزءٌ من الرقم بحجمه كما في الصورة)،
  // ووحدة القياس الحيّ معه.
  const refUnit = ref.unit ?? "";
  const liveUnit = k.unit ? (ar ? k.unit.ar : k.unit.en) : "";
  const valueText = simulated
    ? `${fmtKpi(chosen.value)}${refUnit}`
    : `${fmtKpi(chosen.value)}${liveUnit ? `${k.unit?.spaced ? " " : ""}${liveUnit}` : ""}`;

  const notMeasured = ar ? CHANGE_NOT_MEASURED_AR : "not measured";
  const change = chosen.change;
  const changeText = change
    ? `${change.dir === "up" ? "↑" : "↓"} ${fmtKpi(change.pct)}%`
    : notMeasured;
  const badge = ar ? SIMULATION_BADGE_AR : "Reference";
  const sub = !simulated && k.sub ? (ar ? k.sub.ar : k.sub.en) : null;
  const Glyph = k.glyph;

  // ما يُقرأ: الاسم والرقم والتغيّر والمصدر — والمحاكاة تُقال صراحةً، ومعها
  // سبب ظهورها حين تتعذّر القراءة الحيّة (المادة ٦).
  const failed = k.status === "error";
  const spoken = loading
    ? `${label}: ${ar ? "جارٍ التحميل" : "Loading"}`
    : [
        `${label}: ${valueText}`,
        sub,
        `${ar ? "التغيّر" : "Change"}: ${changeText}`,
        simulated ? (ar ? "بيانات مرجعية (ليست حيّة)" : "reference data (not live)") : null,
        failed ? (ar ? "تعذّر التحميل" : "Unavailable") : null,
      ]
        .filter(Boolean)
        .join(" — ");
  const title = loading
    ? label
    : simulated
      ? ar
        ? `${label} — بيانات مرجعية بأرقام التصميم، ليست حيّة${failed ? " (تعذّر التحميل)" : ""}؛ المصدر الحيّ: ${k.sourceAr}`
        : `${label} — reference data (not live)`
      : ar
        ? `${label} — ${k.sourceAr}${sub ? ` (${sub})` : ""}`
        : label;

  return (
    <Link
      to={k.to}
      dir={ar ? "rtl" : "ltr"}
      title={title}
      aria-label={spoken}
      aria-busy={loading || undefined}
      data-status={k.status}
      data-tone={k.tone}
      data-sim={!loading && simulated ? "" : undefined}
      className="nx-home-kpi nx-home-kpi-card"
    >
      {!loading && simulated && (
        <span aria-hidden className="nx-home-kpi-sim">
          {badge}
        </span>
      )}
      <span className="nx-home-kpi-label">{label}</span>
      <span aria-hidden className="nx-home-kpi-icon">
        <Glyph className="nx-home-kpi-glyph" />
      </span>
      {loading ? (
        // هيكلٌ لا نصّ: الانتظار يُرى شكلًا ولا يُقرأ حكمًا.
        <span aria-hidden className="nx-home-skeleton nx-home-kpi-wait" />
      ) : (
        // الحاوية باتجاه البطاقة فيستقرّ الرقم على حافّة البداية (يمينًا) كما
        // رُسم، والأرقام وحدها `ltr` فلا تنقلب «96%» ولا «5,997».
        <span className="nx-home-kpi-value">
          <span dir="ltr">{simulated ? valueText : fmtKpi(chosen.value)}</span>
          {!simulated && liveUnit && (
            <span className="nx-home-kpi-unit" data-spaced={k.unit?.spaced ? "" : undefined}>
              {liveUnit}
            </span>
          )}
        </span>
      )}
      {!loading && chosen.series && <KpiMiniChart series={chosen.series} form={ref.seriesForm} />}
      {!loading &&
        (change ? (
          <span className="nx-home-kpi-change" dir="ltr">
            {change.dir === "up" ? <ArrowUp aria-hidden /> : <ArrowDown aria-hidden />}
            {`${fmtKpi(change.pct)}%`}
          </span>
        ) : (
          // الحيّ بلا تاريخ مقيس: لا سهم — دائرةٌ متقطّعة وكلمةٌ تقول ذلك.
          <span className="nx-home-kpi-change" data-absent="">
            <CircleDashed aria-hidden />
            {notMeasured}
          </span>
        ))}
    </Link>
  );
}

/* ── المنحنى الصغير — SVG خالص من سلسلة المرجع (لا مكتبة رسوم، §3.8) ──────
   يُرسم مع المرجع وحده: `chooseLive` تعيد سلسلةً `null` للحيّ، فلا منحنى
   فوق رقمٍ حيّ. والمحور الأفقي يسارًا ← يمينًا كما رُسم (آخر نقطة = الرقم).
   `preserveAspectRatio="none"` يمدّه على عرض خانته، وسماكة الخطّ ثابتة
   (`non-scaling-stroke`). الألوان أصنافٌ ترسمها الرموز في `home-kpi.css`. */

const CHART_W = 100;
const CHART_H = 24;

/** منحنى ناعم عبر النقاط (كاتمول-روم إلى بيزييه مكعّب). */
function smoothPath(pts: readonly (readonly [number, number])[]): string {
  const f = (n: number) => n.toFixed(2);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

function KpiMiniChart({ series, form }: { series: readonly number[]; form: RefKpi["seriesForm"] }) {
  // معرّف التدرّج فريدٌ لكل بطاقة، وبحروفٍ آمنة داخل `url(#…)`.
  const uid = `nx-kpi-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const max = Math.max(...series);
  const min = Math.min(...series);

  if (form === "bars") {
    // أعمدةٌ رفيعة بفجواتٍ أعرض منها كما رُسمت (~3px وفجوة ~3px).
    const step = CHART_W / series.length;
    const bw = step * 0.44;
    return (
      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        preserveAspectRatio="none"
        aria-hidden
        focusable="false"
        className="nx-home-kpi-chart"
      >
        <defs>
          <linearGradient
            id={`${uid}-bars`}
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1="0"
            x2={CHART_W}
            y2="0"
          >
            <stop offset="0" className="nx-home-kpi-stop-from" />
            <stop offset="1" className="nx-home-kpi-stop-to" />
          </linearGradient>
        </defs>
        {series.map((v, i) => {
          // القاع نفسه الذي ينتهي عنده المنحنى الخطّي، فتستقرّ البطاقات على خطٍّ واحد.
          const base = CHART_H - 1;
          const h = max > 0 ? Math.max(2, (v / max) * (base - 1)) : 2;
          return (
            <rect
              key={i}
              x={i * step + (step - bw) / 2}
              y={base - h}
              width={bw}
              height={h}
              rx="0.6"
              className="nx-home-kpi-bar"
              fill={`url(#${uid}-bars)`}
            />
          );
        })}
      </svg>
    );
  }

  const span = max - min || 1;
  const top = 2;
  const bottom = 2;
  const pts = series.map(
    (v, i) =>
      [
        (i / (series.length - 1)) * CHART_W,
        top + (1 - (v - min) / span) * (CHART_H - top - bottom),
      ] as const,
  );
  const line = smoothPath(pts);
  return (
    <svg
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      preserveAspectRatio="none"
      aria-hidden
      focusable="false"
      className="nx-home-kpi-chart"
    >
      <defs>
        <linearGradient id={`${uid}-area`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="nx-home-kpi-stop-top" />
          <stop offset="1" className="nx-home-kpi-stop-bottom" />
        </linearGradient>
      </defs>
      <path d={`${line} L${CHART_W} ${CHART_H} L0 ${CHART_H} Z`} fill={`url(#${uid}-area)`} />
      <path d={line} className="nx-home-kpi-line" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/* ── رموز البطاقات المصمتة كما رُسمت — `currentColor` وحده (المادة ٣٣) ────
   الفتحات (سهم الدرع، علامة التعجّب، الزجاج والمصابيح، النوافذ) ثقوبٌ
   حقيقية في الشكل (`evenodd` أو اتجاه لفٍّ معاكس) تُظهر غسلة البلاطة تحتها —
   لا تعبئة بيضاء، فتنقلب مع الوضعين بلا قاعدة. شبكة 24×24. */

function GlyphSvg({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden focusable="false" className={className}>
      {children}
    </svg>
  );
}

/** درعٌ عريض بقمّةٍ وسطى وسهمٍ نازل — «الحالة الأمنية العامة». */
function ShieldGlyph({ className }: { className?: string }) {
  return (
    <GlyphSvg className={className}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M12 1.8 21 4.2V12.2c0 4.9-3.6 8.9-9 10.6-5.4-1.7-9-5.7-9-10.6V4.2Z M10.6 6.9h2.8v4.1h3.6L12 16.7 7 11h3.6Z"
      />
    </GlyphSvg>
  );
}

/** مثمّنٌ بعلامة تعجّب — خطر (مثلث الصورة الأحمر يُرسم مثمّنًا). */
function OctagonGlyph({ className }: { className?: string }) {
  return (
    <GlyphSvg className={className}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M8.2 1.8h7.6c.53 0 1.04.21 1.41.59l4.4 4.4c.38.37.59.88.59 1.41v7.6c0 .53-.21 1.04-.59 1.41l-4.4 4.4c-.37.38-.88.59-1.41.59H8.2c-.53 0-1.04-.21-1.41-.59l-4.4-4.4A2 2 0 0 1 1.8 15.8V8.2c0-.53.21-1.04.59-1.41l4.4-4.4c.37-.38.88-.59 1.41-.59Z M10.75 6.2h2.5l-.38 7.9h-1.74Z M12 15.5a1.55 1.55 0 1 1 0 3.1 1.55 1.55 0 0 1 0-3.1Z"
      />
    </GlyphSvg>
  );
}

/** مثلثٌ بعلامة تعجّب — تحذير. */
function TriangleGlyph({ className }: { className?: string }) {
  return (
    <GlyphSvg className={className}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M10.27 3.1c.77-1.33 2.69-1.33 3.46 0l8.47 14.7c.77 1.33-.19 3-1.73 3H3.53c-1.54 0-2.5-1.67-1.73-3Z M10.85 7.9h2.3l-.35 6.5h-1.6Z M12 15.6a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8Z"
      />
    </GlyphSvg>
  );
}

/** ثلاثة أشخاص برؤوسٍ كبيرة، الأوسط أمامهما — «إجمالي الأفراد». */
function PeopleGlyph({ className }: { className?: string }) {
  return (
    <GlyphSvg className={className}>
      <path
        fill="currentColor"
        d="M12 2.9a3.3 3.3 0 1 1 0 6.6 3.3 3.3 0 0 1 0-6.6Z M5.2 4.4a2.6 2.6 0 1 1 0 5.2 2.6 2.6 0 0 1 0-5.2Z M18.8 4.4a2.6 2.6 0 1 1 0 5.2 2.6 2.6 0 0 1 0-5.2Z M6.4 16.3c0-3.05 2.5-5.4 5.6-5.4s5.6 2.35 5.6 5.4v1.6c0 .9-.7 1.6-1.6 1.6H8c-.9 0-1.6-.7-1.6-1.6Z M.9 15.5c0-2.5 1.9-4.3 4.4-4.3.5 0 1 .07 1.45.2-.95 1.3-1.5 2.9-1.5 4.6v.7H2c-.6 0-1.1-.5-1.1-1.2Z M23.1 15.5c0-2.5-1.9-4.3-4.4-4.3-.5 0-1 .07-1.45.2.95 1.3 1.5 2.9 1.5 4.6v.7H22c.6 0 1.1-.5 1.1-1.2Z"
      />
    </GlyphSvg>
  );
}

/** سيارةٌ من الأمام — «الدوريات النشطة». */
function CarGlyph({ className }: { className?: string }) {
  return (
    <GlyphSvg className={className}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M5.6 3.4h12.8c.95 0 1.75.65 1.97 1.57l1.13 4.83c.9.5 1.5 1.45 1.5 2.55v4.85c0 .55-.45 1-1 1h-1v2c0 .83-.67 1.5-1.5 1.5H18c-.83 0-1.5-.67-1.5-1.5v-2h-9v2c0 .83-.67 1.5-1.5 1.5H4.5c-.83 0-1.5-.67-1.5-1.5v-2H2c-.55 0-1-.45-1-1v-4.85c0-1.1.6-2.05 1.5-2.55l1.13-4.83C3.85 4.05 4.65 3.4 5.6 3.4Z M5.95 5.5h12.1l.95 4H5Z M5.4 12.2a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2Z M18.6 12.2a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2Z M9.4 14.2h5.2v1.4H9.4Z"
      />
    </GlyphSvg>
  );
}

/**
 * كاميرا مراقبة كما رُسمت — «الكاميرات العاملة»: غطاءٌ مصمت مستدير الطرف،
 * وتحته شفةٌ رفيعة، وعلى يمينه حاملٌ مثلثيّ مفرّغ (خطٌّ بلون الرمز نفسه).
 */
function CctvGlyph({ className }: { className?: string }) {
  return (
    <GlyphSvg className={className}>
      <path
        fill="currentColor"
        d="M3.8 4.3 18.8 3.5c.75-.04 1.15.82.68 1.38l-3.9 4.6c-.6.7-1.4 1.12-2.3 1.22l-9.1 1.4C2.6 12.35 1.2 11.15 1.2 9.6V6.9c0-1.4 1.15-2.53 2.6-2.6Z M5.1 14.5l9.3-1.35c.55-.08.9.55.55.98l-1.05 1.3c-.35.43-.85.7-1.4.74l-6.1.5c-.75.06-1.3-.5-1.3-1.2Z"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
        d="M19.9 7.4 21.2 20.4 13.9 15.5Z"
      />
    </GlyphSvg>
  );
}

/**
 * ثلاثة أبراجٍ مقوّسة الرؤوس على قاعدة — «الأصول الحرجة». النوافذ ثقوبٌ
 * (`evenodd`) تُظهر غسلة البلاطة: أربعٌ في الأوسط وواحدةٌ في كل جانب.
 */
function BuildingGlyph({ className }: { className?: string }) {
  return (
    <GlyphSvg className={className}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M8.6 20.4V4.4C8.6 2.5 10.1 1 12 1s3.4 1.5 3.4 3.4v16Z M2.4 20.4v-9.6c0-1.6 1.25-2.9 2.8-2.9S8 9.2 8 10.8v9.6Z M16 20.4v-9.6c0-1.6 1.25-2.9 2.8-2.9s2.8 1.3 2.8 2.9v9.6Z M10.5 4h3v2.4h-3Z M10.5 8h3v2.4h-3Z M10.5 12h3v2.4h-3Z M10.5 16h3v2.6h-3Z M4 11.4h2.4v2h-2.4Z M17.6 11.4h2.4v2h-2.4Z"
      />
      {/* القاعدة شكلٌ مستقلّ: لو شاركت الأبراج `evenodd` لصار تداخلهما ثقبًا. */}
      <path fill="currentColor" d="M.8 19.6h22.4v1.8H.8Z" />
    </GlyphSvg>
  );
}
