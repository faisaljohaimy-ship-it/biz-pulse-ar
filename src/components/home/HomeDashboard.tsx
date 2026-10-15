/**
 * لوحة الرئيسية — المؤشرات والخريطة ولوحات التشغيل (أمر المالك ٢٠٢٦/٠٩/٢٩).
 *
 * «طبّق هذا الشكل على صفحة النظام الرئيسية مع تفعيل جميع الأيقونات». والشكل
 * يُبنى من **قراءاتٍ قائمة لا من أرقامٍ تُكتب له**:
 *
 *   • `getSecOverview`  — البلاغات والدوريات وتنبيهات الكاميرات والأصول
 *     والمواقع (ومنها عدد الحرّاس المسجَّل على كل موقع).
 *   • `getCommandCenterState` — الامتثال لكل منطقة (بمفتاح الرئيسية نفسه)،
 *     ومنه «الامتثال العام» متوسطًا للمقيس وحده.
 *   • `getRiskBoard`     — عدد المخاطر العالية (بمفتاح الرئيسية نفسه).
 *   • `getExecKpis`      — الكاميرات المتصلة من إجماليها.
 *   • `getIntegrationsOverview` — حالة الأنظمة المرتبطة.
 *
 * **صفّ المؤشرات بأرقام الصورة موسومةً (قرار المالك N2، ٢٠٢٦/١٠/١٤):** كل
 * رقمٍ وسهم تغيّر ومنحنى صغير مرسوم يُعرض كما رُسم من المحاكاة المرجعية
 * (`home-reference.ts`) تحت شارة «محاكاة» ظاهرة على بطاقته — والقيمة الحيّة
 * تفوز تلقائيًّا متى وصلت مقيسة، باسمها الصادق، وخانة تغيّرها «لم يُقَس»:
 * لا سهمٌ مرجعي فوق رقمٍ حيّ (المادة ٢٧). ولا صورة كاميرا في اللوحات أدناه:
 * تنبيهاتها صفوفٌ بلا بثّ مرتبط، فتُعرض بطاقات حالة ويُقال ذلك.
 *
 * كل مؤشر ولوحة **رابطٌ إلى شاشته الحيّة** — والوجهات تُقاس في عقدها على
 * شجرة المسارات المولَّدة، فلا أيقونة ميتة.
 *
 * **مركز القيادة (أمر المالك ٢٠٢٦/١٠/١٣، المرحلة الأولى):** القراءات نُقلت
 * إلى `home-reads.ts`، والبطاقة والحالات الثلاث والحلقة وجداول التسميات إلى
 * `home-primitives.tsx` — كما هي، ليستوردها هذا الملف وصفوف الرئيسية الجديدة
 * من مصدرٍ واحد.
 */
import { Link } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Building2,
  CircleDashed,
  Lightbulb,
  ShieldCheck,
  Camera,
  OctagonAlert,
  Route as RouteIcon,
  ShieldAlert,
  UserRound,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useId, useMemo, type ComponentType, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { REGIONS, REGION_ACCENT_HEX, type RegionId } from "@/lib/regions";
import { ArabianPeninsulaMap, type ArabiaQuickStat } from "@/components/map/ArabianPeninsulaMap";
import { useSadeed } from "@/lib/sadeed-core/hooks/useSadeed";
import { PRODUCT_BRAND } from "@/lib/domain";
import { useHomeReads } from "@/components/home/home-reads";
import {
  ALERT_TYPE_AR,
  CATEGORY_TONES,
  CCTV_STATUS_AR,
  Donut,
  HEALTH_ORDER,
  HEALTH_VIEW,
  INCIDENT_STATUS_AR,
  PATROL_STATUS_AR,
  Panel,
  PanelBody,
  fmtNum,
  fmtTime,
  statusOf,
  type ReadStatus,
} from "@/components/home/home-primitives";
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
 * يُرسم مثمّنًا، عرف لوحات السلامة) · مثلثٌ برتقالي (تحذير) · وأزرقان للعدّ.
 * والنبرة تُترجم في `home-kpi.css` إلى رموزٍ وحدها (لون الرمز وغسلة البلاطة
 * ولون التغيّر ولون الرقم) — فاللون لا يُكتب هنا، والشكل والكلمة يحملان المعنى.
 */
type KpiTone = "ok" | "danger" | "warning" | "blue" | "sky";

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
      tone: "sky",
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
        {kpis.map((k) => (
          <li key={k.id} className="nx-home-kpi-cell">
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
  const badge = ar ? SIMULATION_BADGE_AR : "Simulated";
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
        simulated ? (ar ? "محاكاة مرجعية" : "reference simulation") : null,
        failed ? (ar ? "تعذّر التحميل" : "Unavailable") : null,
      ]
        .filter(Boolean)
        .join(" — ");
  const title = loading
    ? label
    : simulated
      ? ar
        ? `${label} — محاكاة مرجعية بأرقام التصميم${failed ? " (تعذّر التحميل)" : ""}؛ المصدر الحيّ: ${k.sourceAr}`
        : `${label} — reference simulation`
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
      ) : simulated ? (
        <span className="nx-home-kpi-value" dir="ltr">
          {valueText}
        </span>
      ) : (
        <span className="nx-home-kpi-value">
          <span dir="ltr">{fmtKpi(chosen.value)}</span>
          {liveUnit && (
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
    const step = CHART_W / series.length;
    const bw = step * 0.5;
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
          const h = max > 0 ? Math.max(2, (v / max) * (CHART_H - 1)) : 2;
          return (
            <rect
              key={i}
              x={i * step + (step - bw) / 2}
              y={CHART_H - h}
              width={bw}
              height={h}
              rx="0.6"
              fill={`url(#${uid}-bars)`}
            />
          );
        })}
      </svg>
    );
  }

  const span = max - min || 1;
  const top = 2;
  const bottom = 4;
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

/** درعٌ بسهمٍ نازل — «الحالة الأمنية العامة». */
function ShieldGlyph({ className }: { className?: string }) {
  return (
    <GlyphSvg className={className}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M12 1.6 20.4 4.8V11c0 5.4-3.6 9.7-8.4 11.4C7.2 20.7 3.6 16.4 3.6 11V4.8Z M10.55 6.4h2.9v4.1h3.2L12 16.3 7.35 10.5h3.2Z"
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

/** ثلاثة أشخاص — «إجمالي الأفراد». */
function PeopleGlyph({ className }: { className?: string }) {
  return (
    <GlyphSvg className={className}>
      <path
        fill="currentColor"
        d="M12 3.6a3.4 3.4 0 1 1 0 6.8 3.4 3.4 0 0 1 0-6.8Z M5.5 6.7a2.45 2.45 0 1 1 0 4.9 2.45 2.45 0 0 1 0-4.9Z M18.5 6.7a2.45 2.45 0 1 1 0 4.9 2.45 2.45 0 0 1 0-4.9Z M7.2 20.4V19c0-2.85 2.15-5.1 4.8-5.1s4.8 2.25 4.8 5.1v1.4Z M.8 19.5v-.9c0-2.6 2-4.6 4.6-4.6.7 0 1.4.15 2 .45-1 1.25-1.6 2.8-1.6 4.45v.6Z M23.2 19.5v-.9c0-2.6-2-4.6-4.6-4.6-.7 0-1.4.15-2 .45 1 1.25 1.6 2.8 1.6 4.45v.6Z"
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

/** كاميرا مراقبة على حاملها — «الكاميرات العاملة». */
function CctvGlyph({ className }: { className?: string }) {
  return (
    <GlyphSvg className={className}>
      <path
        fill="currentColor"
        d="M2.7 7.6c-.32-1.2.4-2.43 1.6-2.74l12.9-3.4c1.2-.32 2.43.4 2.74 1.6l1.02 3.88c.32 1.2-.4 2.43-1.6 2.74L6.46 13.08c-1.2.32-2.43-.4-2.74-1.6Z M12.3 11.2l2.05-.5 1.2 5h4.15v-1.9h2v7.8h-2v-3.9H14.8c-.68 0-1.27-.46-1.45-1.12Z"
      />
    </GlyphSvg>
  );
}

/** ثلاثة أبراجٍ على قاعدة — «الأصول الحرجة». النوافذ ثقوبٌ بلفٍّ معاكس. */
function BuildingGlyph({ className }: { className?: string }) {
  return (
    <GlyphSvg className={className}>
      <path
        fill="currentColor"
        d="M9 21V5.2C9 3.43 10.34 2 12 2s3 1.43 3 3.2V21Z M3 21v-9.6c0-1.44 1.12-2.6 2.5-2.6S8 9.96 8 11.4V21Z M16 21v-9.6c0-1.44 1.12-2.6 2.5-2.6S21 9.96 21 11.4V21Z M2 20.2h20V22H2Z M10.3 5.6v1.6h1.2V5.6Z M12.5 5.6v1.6h1.2V5.6Z M10.3 8.9v1.6h1.2V8.9Z M12.5 8.9v1.6h1.2V8.9Z M10.3 12.2v1.6h1.2v-1.6Z M12.5 12.2v1.6h1.2v-1.6Z M10.3 15.5v1.6h1.2v-1.6Z M12.5 15.5v1.6h1.2v-1.6Z M4.85 11.9v1.7h1.3v-1.7Z M4.85 15.3v1.7h1.3v-1.7Z M17.85 11.9v1.7h1.3v-1.7Z M17.85 15.3v1.7h1.3v-1.7Z"
      />
    </GlyphSvg>
  );
}

/* ── لوحات التشغيل ──────────────────────────────────────────────────────
   **لم تعد الصفحة تركّبها (مركز القيادة ٢٠٢٦/١٠/١٣).** لوحاتها تنتقل إلى
   صفوف الرئيسية الجديدة (`HomeMapCard` · `HomeOpsRow` · `HomeAnalyticsRow`)،
   والتصدير باقٍ حتى يكتمل النقل فلا ينكسر مستهلكٌ في الطريق. */

export function HomeOperations() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { sec, state, integrations } = useHomeReads();

  const mapSites = useMemo(
    () =>
      (sec.data?.sites ?? []).map((s) => ({
        id: s.id,
        name: ar ? s.name_ar : s.name_en,
        lat: s.lat,
        lng: s.lng,
      })),
    [sec.data, ar],
  );

  const openIncidents = (sec.data?.incidents ?? [])
    .filter((i) => i.status !== "closed" && i.status !== "resolved")
    .slice(0, 5);
  const patrols = (sec.data?.patrols ?? [])
    .filter((p) => p.status === "active" || p.status === "scheduled")
    .slice(0, 4);
  const alerts = (sec.data?.cctv ?? []).slice(0, 4);

  // الامتثال لكل منطقة من صفوف الخادم — `!== null` لا `> 0`: الصفر قياس.
  const compliance = REGIONS.map((region) => {
    const row = state.data?.regions.find((r) => r.region_id === region.id);
    return { region, pct: row && row.compliance_pct !== null ? row.compliance_pct : null };
  });

  const complianceByRegion: Partial<Record<RegionId, number>> = {};
  for (const c of compliance) if (c.pct !== null) complianceByRegion[c.region.id] = c.pct;

  // الخريطة تجمع قراءتين (المواقع والامتثال): خطأ أيٍّ منهما خطأ، وانتظار
  // أيٍّ منهما انتظار — فلا يُقرأ الغائب «لم يُقَس» وهو لم يصل بعد.
  const mapStatus = statusOf({
    isPending: sec.isPending || state.isPending,
    isError: sec.isError || state.isError,
  });
  const sites = sec.data?.sites;
  const quickStats: ArabiaQuickStat[] = [
    {
      key: "sites",
      ar: "المواقع",
      en: "Sites",
      value: sites ? sites.length : null,
      icon: <Building2 className="size-5" />,
    },
    {
      key: "guards",
      ar: "حرّاس المواقع",
      en: "Site guards",
      value: sites && sites.length ? sites.reduce((n, x) => n + x.guards_count, 0) : null,
      icon: <UserRound className="size-5" />,
    },
    {
      key: "assets",
      ar: "الأصول المسجَّلة",
      en: "Registered assets",
      value: sec.data ? sec.data.assets.length : null,
      icon: <Wrench className="size-5" />,
    },
    {
      key: "cctv",
      ar: "تنبيهات الكاميرات",
      en: "Camera alerts",
      value: sec.data ? sec.data.cctv.length : null,
      icon: <Camera className="size-5" />,
    },
  ];

  // فئات البلاغات — من الصفوف الواصلة نفسها (أحدث ما يعيده المصدر لا
  // كامل السجل)، ويُقال عددها في العنوان فلا يُقرأ توزيعًا للسجل كلّه.
  const incidentRows = sec.data?.incidents ?? [];
  const byCategory = new Map<string, number>();
  for (const i of incidentRows) byCategory.set(i.category, (byCategory.get(i.category) ?? 0) + 1);
  const ranked = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
  const top = ranked.slice(0, 3);
  const rest = ranked.slice(3).reduce((n, [, v]) => n + v, 0);
  const categorySlices = [
    ...top.map(([label, value], i) => ({ key: label, label, value, tone: CATEGORY_TONES[i] })),
    ...(rest > 0
      ? [{ key: "other", label: ar ? "أخرى" : "Other", value: rest, tone: "--ink-3" }]
      : []),
  ];

  const providers = integrations.data?.providers ?? [];
  const healthSlices = HEALTH_ORDER.map((h) => ({
    key: h,
    value: providers.filter((p) => p.health === h).length,
    tone: HEALTH_VIEW[h].tone,
  })).filter((s) => s.value > 0);

  return (
    <>
      {/* ── الخريطة وبجانبها حالة الأنظمة وفئات البلاغات (كما في التصميم:
          الخريطة شاشةٌ عريضة ولوحةٌ إلى جانبها) ───────────────────────── */}
      <div className="nx-home-row mt-8 grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0">
          <ArabianPeninsulaMap
            status={mapStatus}
            onRetry={() => {
              void sec.refetch();
              void state.refetch();
            }}
            sites={mapSites}
            compliance={complianceByRegion}
            quickStats={quickStats}
            ar={ar}
          />
        </div>

        <div className="grid min-w-0 gap-4">
          <Panel
            id="nx-home-systems"
            title={ar ? "حالة الأنظمة" : "Systems status"}
            to="/integrations"
            moreAr="مركز التكاملات"
            moreEn="Integrations"
            ar={ar}
          >
            <PanelBody
              q={integrations}
              ar={ar}
              isEmpty={providers.length === 0}
              empty={ar ? "لا أنظمة مرتبطة لعرض حالتها." : "No connected systems."}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <Donut
                  slices={healthSlices}
                  total={providers.length}
                  centerAr="الأنظمة"
                  centerEn="systems"
                  ar={ar}
                />
                <ul className="grid min-w-0 flex-1 gap-1.5">
                  {providers.slice(0, 6).map((p) => {
                    const v = HEALTH_VIEW[p.health];
                    const Icon = v.icon;
                    return (
                      <li
                        key={p.id}
                        className="flex min-w-0 items-center justify-between gap-2 text-[13px]"
                      >
                        <span className="truncate text-[color:var(--ink)]">
                          {ar ? p.name_ar : p.name}
                        </span>
                        <span
                          className="nx-home-health inline-flex shrink-0 items-center gap-1 text-[12px] font-bold"
                          style={{ ["--health-tone" as string]: `var(${v.tone})` }}
                        >
                          <Icon aria-hidden className="size-4" />
                          {ar ? v.ar : v.en}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </PanelBody>
          </Panel>
          <Panel
            id="nx-home-categories"
            // العدد في العنوان حين تصل القراءة وحدها: عند الخطأ كان يُقرأ «آخر ٠»
            // — صفرٌ هو غيابٌ لا قياس. وبلا تمييزٍ عدديّ يتبدّل بالعدد: «(٢٠٠)».
            title={
              statusOf(sec) === "ready"
                ? ar
                  ? `فئات أحدث البلاغات (${fmtNum(incidentRows.length, ar)})`
                  : `Latest incidents by category (${incidentRows.length})`
                : ar
                  ? "فئات أحدث البلاغات"
                  : "Latest incidents by category"
            }
            to="/sec/incidents"
            moreAr="كل البلاغات"
            moreEn="All incidents"
            ar={ar}
          >
            <PanelBody
              q={sec}
              ar={ar}
              isEmpty={incidentRows.length === 0}
              empty={ar ? "لا بلاغات لتوزيعها." : "No incidents to break down."}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Donut
                  slices={categorySlices}
                  total={incidentRows.length}
                  centerAr="الإجمالي"
                  centerEn="total"
                  ar={ar}
                />
                <ul className="grid min-w-0 flex-1 gap-1.5">
                  {categorySlices.map((c) => (
                    <li
                      key={c.key}
                      className="flex min-w-0 items-center justify-between gap-2 text-[13px]"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          aria-hidden
                          className="nx-home-swatch size-2.5 shrink-0 rounded-full"
                          style={{ ["--slice-tone" as string]: `var(${c.tone})` }}
                        />
                        <span className="truncate text-[color:var(--ink)]">{c.label}</span>
                      </span>
                      <span className="shrink-0 font-bold tabular-nums text-[color:var(--ink-2)]">
                        {`${Math.round((c.value / incidentRows.length) * 100)}%`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </PanelBody>
          </Panel>
        </div>
      </div>

      {/* ── البلاغات · الدوريات · الكاميرات ──────────────────────────── */}
      <div className="nx-home-row mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Panel
          id="nx-home-incidents"
          title={ar ? "أحدث البلاغات المفتوحة" : "Latest open incidents"}
          to="/sec/incidents"
          moreAr="كل البلاغات"
          moreEn="All incidents"
          ar={ar}
        >
          <PanelBody
            q={sec}
            ar={ar}
            isEmpty={openIncidents.length === 0}
            empty={ar ? "لا بلاغات مفتوحة الآن." : "No open incidents."}
          >
            <ul className="grid gap-2">
              {openIncidents.map((i) => (
                <li
                  key={i.id}
                  className="rounded-xl border border-[color:var(--hairline)] bg-[color:var(--chip)] px-3 py-2"
                >
                  <p className="truncate text-[13px] font-bold text-[color:var(--ink)]">
                    {ar ? i.title_ar : (i.title_en ?? i.title_ar)}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-[color:var(--ink-3)]">
                    <span className="tabular-nums">{i.ref}</span>
                    <span>{INCIDENT_STATUS_AR[i.status] ?? i.status}</span>
                    <span>{fmtTime(i.reported_at, ar)}</span>
                  </p>
                </li>
              ))}
            </ul>
          </PanelBody>
        </Panel>

        <Panel
          id="nx-home-patrols"
          title={ar ? "الدوريات الجارية والمجدولة" : "Running & scheduled patrols"}
          to="/sec/patrols"
          moreAr="كل الدوريات"
          moreEn="All patrols"
          ar={ar}
        >
          <PanelBody
            q={sec}
            ar={ar}
            isEmpty={patrols.length === 0}
            empty={ar ? "لا دوريات جارية أو مجدولة." : "No running or scheduled patrols."}
          >
            <ul className="grid gap-2">
              {patrols.map((p) => {
                // نسبة الإنجاز من نقاط التفتيش نفسها — ولا نسبة بلا مقام.
                const pct =
                  p.checkpoints_total > 0
                    ? Math.round((p.checkpoints_done / p.checkpoints_total) * 100)
                    : null;
                return (
                  <li
                    key={p.id}
                    className="rounded-xl border border-[color:var(--hairline)] bg-[color:var(--chip)] px-3 py-2"
                  >
                    <p className="flex items-center justify-between gap-2 text-[13px]">
                      <span className="truncate font-bold text-[color:var(--ink)]">{p.route}</span>
                      <span className="inline-flex shrink-0 items-center gap-1 text-[12px] text-[color:var(--ink-2)]">
                        <Activity aria-hidden className="size-3.5" />
                        {PATROL_STATUS_AR[p.status] ?? p.status}
                      </span>
                    </p>
                    <p className="mt-0.5 truncate text-[12px] text-[color:var(--ink-3)]">
                      {p.team}
                    </p>
                    {pct !== null && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <span
                          aria-hidden
                          className="h-1.5 flex-1 overflow-hidden rounded-full bg-[color:var(--hairline)]"
                        >
                          <span
                            className="nx-home-bar block h-full rounded-full bg-[color:var(--tone-blue)]"
                            style={{ ["--bar-pct" as string]: `${pct}%` }}
                          />
                        </span>
                        <span className="text-[12px] tabular-nums text-[color:var(--ink-2)]">
                          {ar
                            ? `${fmtNum(p.checkpoints_done, ar)} من ${fmtNum(p.checkpoints_total, ar)}`
                            : `${p.checkpoints_done}/${p.checkpoints_total}`}
                        </span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </PanelBody>
        </Panel>

        <Panel
          id="nx-home-cctv"
          title={ar ? "تنبيهات الكاميرات" : "Camera alerts"}
          to="/sec/cctv"
          moreAr="المراقبة بالكاميرات"
          moreEn="CCTV"
          ar={ar}
          // التنبيه صفٌّ بلا بثّ مرتبط — يُقال ذلك لا يُرسم إطار فيديو فارغ.
          note={ar ? "بطاقات حالة — لا بثّ مرتبط بالتنبيهات." : "Status cards — no linked feed."}
        >
          <PanelBody
            q={sec}
            ar={ar}
            isEmpty={alerts.length === 0}
            empty={ar ? "لا تنبيهات كاميرات." : "No camera alerts."}
          >
            <ul className="grid gap-2">
              {alerts.map((a) => {
                const danger = a.alert_type === "intrusion";
                const Icon = danger ? OctagonAlert : AlertTriangle;
                return (
                  <li
                    key={a.id}
                    className="rounded-xl border border-[color:var(--hairline)] bg-[color:var(--chip)] px-3 py-2"
                  >
                    <p className="flex items-center gap-1.5 text-[13px] font-bold text-[color:var(--ink)]">
                      <Icon
                        aria-hidden
                        className={`size-4 shrink-0 ${danger ? "text-[color:var(--tone-rose)]" : "text-[color:var(--tone-amber)]"}`}
                      />
                      <span className="truncate">
                        {danger ? (ar ? "خطر" : "Danger") : ar ? "تحذير" : "Warning"} ·{" "}
                        {ALERT_TYPE_AR[a.alert_type] ?? a.alert_type}
                      </span>
                    </p>
                    <p className="mt-0.5 flex flex-wrap gap-x-2 text-[12px] text-[color:var(--ink-3)]">
                      <span className="tabular-nums">{a.camera_code}</span>
                      <span>{CCTV_STATUS_AR[a.status] ?? a.status}</span>
                      <span>{fmtTime(a.detected_at, ar)}</span>
                    </p>
                  </li>
                );
              })}
            </ul>
          </PanelBody>
        </Panel>
      </div>

      {/* ── الامتثال لكل منطقة ───────────────────────────────────────── */}
      <div className="mt-4">
        <Panel
          id="nx-home-compliance"
          title={ar ? "الامتثال حسب المنطقة" : "Compliance by region"}
          to="/sec/governance"
          moreAr="الحوكمة والامتثال"
          moreEn="Governance"
          ar={ar}
        >
          <PanelBody q={state} ar={ar} isEmpty={false} empty="">
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {compliance.map(({ region, pct }) => (
                <li
                  key={region.id}
                  className="nx-home-comp"
                  style={{ ["--region-tint" as string]: REGION_ACCENT_HEX[region.id] }}
                >
                  <p className="flex items-center justify-between gap-2 text-[13px]">
                    <span className="flex min-w-0 items-center gap-1.5 font-bold text-[color:var(--ink)]">
                      <span
                        aria-hidden
                        className="size-2.5 shrink-0 rounded-full bg-[color:var(--region-tint)]"
                      />
                      <span className="truncate">{ar ? region.shortAr : region.shortEn}</span>
                    </span>
                    <span
                      className={
                        pct === null
                          ? "text-[12px] text-[color:var(--ink-3)]"
                          : "font-black tabular-nums text-[color:var(--ink)]"
                      }
                    >
                      {pct === null ? (ar ? "لم يُقَس" : "not measured") : `${Math.round(pct)}%`}
                    </span>
                  </p>
                  {/* لا شريط بلا قياس — الغياب نصٌّ، لا مسارٌ فارغ يوهم بصفر. */}
                  {pct !== null && (
                    <span
                      aria-hidden
                      className="mt-1.5 block h-2 overflow-hidden rounded-full bg-[color:var(--hairline)]"
                    >
                      <span
                        className="nx-home-bar block h-full rounded-full bg-[color:var(--region-tint)]"
                        style={{ ["--bar-pct" as string]: `${Math.max(0, Math.min(100, pct))}%` }}
                      />
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </PanelBody>
        </Panel>
      </div>
    </>
  );
}

/**
 * أسئلة سَدِيد السريعة — كما في التصميم تحت بطاقة المساعد. كل زرّ يفتح
 * لوحة سَدِيد الواحدة ويرسل السؤال عبر الواجهة الكانونية (`useSadeed`):
 * لا دردشة ثانية ولا استدعاء مزوّد من المكوّن.
 */
const QUICK_ASKS: { ar: string; en: string; icon: LucideIcon }[] = [
  { ar: "ملخّص الحالة الأمنية اليوم", en: "Today's security summary", icon: ShieldCheck },
  { ar: "ما أبرز المخاطر اليوم؟", en: "What are today's top risks?", icon: ShieldAlert },
  { ar: "تقرير دوريات المناطق", en: "Regional patrols report", icon: RouteIcon },
  { ar: "مقترحات لتحسين الجاهزية", en: "Readiness improvements", icon: Lightbulb },
];

export function SadeedQuickAsk() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { open, ask } = useSadeed();
  return (
    <div className="mt-3" aria-labelledby="nx-quick-ask-heading">
      <p id="nx-quick-ask-heading" className="text-[12px] font-bold text-[color:var(--ink-3)]">
        {ar ? `اسأل ${PRODUCT_BRAND.assistantName}` : `Ask ${PRODUCT_BRAND.en.name}`}
      </p>
      <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {QUICK_ASKS.map((q) => {
          const Icon = q.icon;
          const text = ar ? q.ar : q.en;
          return (
            <li key={q.en}>
              <button
                type="button"
                onClick={() => {
                  open({ focus: true });
                  ask(text);
                }}
                className="nx-home-ask flex min-h-11 w-full items-center gap-2 rounded-xl border border-[color:var(--hairline)] bg-[color:var(--surface)] px-3 text-start text-[13px] font-semibold text-[color:var(--ink)] hover:border-[color:var(--tone-blue)]"
              >
                <Icon aria-hidden className="size-4 shrink-0 text-[color:var(--tone-blue)]" />
                <span className="min-w-0 flex-1">{text}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
