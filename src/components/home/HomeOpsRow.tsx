/**
 * صفّ التشغيل — أربع بطاقات يسارًا ← يمينًا كما في الصورة (مواصفة §4.6):
 * أبرز المخاطر · الحوادث النشطة · الدوريات الميدانية · كاميرات مباشرة.
 *
 * الشبكة (`.nx-home-quad`) `ltr` ترتيبًا فقط (قرار المالك D5)، وكل بطاقة تعلن
 * اتجاه لغتها بنفسها (`Panel`)، فيبقى نصّها عربيًّا `rtl`.
 *
 * ## من أين كل سطر (المادة ٢٧ — مصدرٌ واحد لكل رقم)
 *
 *   • أبرز المخاطر   ← `getRiskBoard().rows` — الصفوف نفسها التي يعدّ منها
 *     مؤشر «مخاطر عالية» (مفتاح `blueprint-risk-board` المشترك).
 *   • الحوادث النشطة ← `getSecOverview().incidents` غير المغلقة.
 *   • الدوريات       ← `getSecOverview().patrols` — والتقسيم يُعدّ من الصفوف
 *     نفسها التي يعدّ منها المصدر `patrols_active` لمؤشر «الدوريات النشطة».
 *   • الكاميرات      ← `getSecOverview().cctv` — أحدث التنبيهات.
 *
 * ## ما لا يُرسم لأنه لا مصدر له (D2 · D3 · §9)
 *
 *   • لا صور ولا بثّ: المخاطر والحوادث **بلاطة أيقونة فئة**، والكاميرات
 *     **بطاقات حالة** بهيئة إطار فيديو، ويُقال «لا بثّ مرتبط» في كل حال.
 *   • لا خريطة مسار للدوريات (لا هندسة مسار في المخطط): تقسيمٌ بالحالة
 *     وحلقة إنجاز نقاط التفتيش للدوريات النشطة.
 *   • لا نسبة تغيّر: موضعها يقول «التغيّر: لم يُقَس».
 *   • لا وقت للمخاطر (المصدر بلا تاريخ) — يُعرض موضعها حالة المعالجة.
 *   • المخاطرة بلا منطقة مُسنَدة ⇐ «المنطقة: لم يُقَس»، والبلاغ بلا موقع
 *     ⇐ «الموقع: لم يُقَس» — لا تخمين من نصّ العنوان.
 *
 * ## البيانات الشخصية (§3.3)
 *
 * لا يُقرأ هنا منشئ البلاغ ولا مُستلِم تنبيه الكاميرا ولا فريق الدورية —
 * الحقول الثلاثة في الصفوف الواصلة، ولا يُعرض منها شيء: صفوفٌ وأعداد فقط.
 *
 * ## الحالة: شكلٌ وكلمة لا لونٌ وحده (§3.5 · WCAG 2.2 §1.4.1)
 *
 * شدّة المخاطرة ونوع تنبيه الكاميرا من `STAT_TONES` (مثمّن «خطر» · مثلث
 * «تحذير» · دائرة «سليم») بالمطابقة نفسها في `/sec/cctv` وسجل المخاطر. وحالة
 * البلاغ وحالة التنبيه مرحلةُ عملٍ لا حكم — بألوان الهوية وأيقونة لكلٍّ منها.
 * والألوان كلّها رموزٌ تمرّ متغيّرات (`--ops-tone` · `--chip-tone`)؛ القيمة
 * النهائية في `styles/home/home-ops.css` وحده.
 */
import { Link } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  BellRing,
  Car,
  Cctv,
  Check,
  CheckCircle2,
  CircleDashed,
  CircleDot,
  Clock,
  DoorOpen,
  Eye,
  Fence,
  HardHat,
  MapPin,
  OctagonAlert,
  Search,
  Shield,
  ShieldAlert,
  Siren,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { REGIONS, type RegionId } from "@/lib/regions";
import { STAT_TONES, type StatTone } from "@/components/sec/sec-shell";
import type { RiskSeverity } from "@/lib/exec/risk-board.functions";
import { useHomeReads, type HomeReads } from "@/components/home/home-reads";
import {
  ALERT_TYPE_AR,
  CCTV_STATUS_AR,
  INCIDENT_STATUS_AR,
  PATROL_STATUS_AR,
  Panel,
  PanelBody,
  fmtNum,
  fmtTime,
} from "@/components/home/home-primitives";
import "@/styles/home/home-ops.css";

/* ── الرموز ─────────────────────────────────────────────────────────────── */

/** ألوان الهوية (عدٌّ وفئة) وألوان الحالة (حكم) — أسماء رموزٍ لا قيم. */
type ToneVar =
  | "--tone-blue"
  | "--tone-cyan"
  | "--tone-violet"
  | "--tone-rose"
  | "--tone-amber"
  | "--tone-emerald"
  | "--ink-3";

/** نغمة `STAT_TONES` ⇄ رمز لونها. المحايد (لم يُقَس) بالحبر الثالث لا بلونٍ يطمئن. */
const STAT_TONE_VAR: Record<StatTone, ToneVar> = {
  danger: "--tone-rose",
  warning: "--tone-amber",
  success: "--tone-emerald",
  default: "--ink-3",
};

/** كلمات `STAT_TONES` بالإنجليزية — العربية من الجدول نفسه (`badge`). */
const STAT_TONE_EN: Record<StatTone, string | null> = {
  danger: "Danger",
  warning: "Warning",
  success: "Healthy",
  default: null,
};

const NOT_MEASURED = { ar: "لم يُقَس", en: "not measured" } as const;

/* ── الوقت النسبي ───────────────────────────────────────────────────────────
   «قبل ١٥ دقيقة» من لحظة وصول القراءة (`dataUpdatedAt`) لا من ساعةٍ تُقرأ
   أثناء الرسم: الرقم يتجدّد مع كل قراءة (كل ٣٠ ثانية) ويبقى ثابتًا بينها. */

const REL_UNITS: readonly (readonly [Intl.RelativeTimeFormatUnit, number])[] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

function fmtAgo(iso: string | null, now: number, ar: boolean): string {
  const at = iso ? Date.parse(iso) : NaN;
  if (!Number.isFinite(at)) return ar ? NOT_MEASURED.ar : NOT_MEASURED.en;
  const diffSec = Math.round((at - now) / 1000);
  const rtf = new Intl.RelativeTimeFormat(ar ? "ar-SA" : "en-US", { numeric: "auto" });
  for (const [unit, size] of REL_UNITS) {
    if (Math.abs(diffSec) >= size) return rtf.format(Math.round(diffSec / size), unit);
  }
  return rtf.format(0, "minute");
}

/** الأحدث أولًا — المصدر يرتّب كذلك، والفرز هنا يحفظ المعنى إن تبدّل. */
const newestFirst = <T,>(rows: readonly T[], at: (r: T) => string) =>
  [...rows].sort((a, b) => Date.parse(at(b)) - Date.parse(at(a)));

/* ── اللبنات الصغيرة ────────────────────────────────────────────────────── */

/** بلاطة أيقونة الفئة — بديل الصورة (D3): غسلةٌ من لون الهوية والرمز بلونه. */
function Tile({ icon: Icon, tone }: { icon: LucideIcon; tone: ToneVar }) {
  return (
    <span aria-hidden className="nx-ops-tile" style={{ ["--ops-tone" as string]: `var(${tone})` }}>
      <Icon />
    </span>
  );
}

/** رقاقة حالة: شكلٌ وكلمة — اللون لا يحمل المعنى وحده. */
function Chip({
  icon: Icon,
  tone,
  dashed,
  children,
}: {
  icon: LucideIcon;
  tone: ToneVar;
  dashed?: boolean;
  children: string;
}) {
  return (
    <span
      className="nx-ops-chip"
      data-dashed={dashed ? "" : undefined}
      style={{ ["--chip-tone" as string]: `var(${tone})` }}
    >
      <Icon aria-hidden />
      <span>{children}</span>
    </span>
  );
}

/** رقاقة `STAT_TONES`: شكلها وكلمتها من الجدول الواحد، و«لم يُقَس» محايدة. */
function StatChip({ tone, detail, ar }: { tone: StatTone; detail: string; ar: boolean }) {
  const t = STAT_TONES[tone];
  const word = ar ? t.badge : STAT_TONE_EN[tone];
  return (
    <Chip icon={t.icon ?? CircleDashed} tone={STAT_TONE_VAR[tone]} dashed={tone === "default"}>
      {word ? `${word} · ${detail}` : detail}
    </Chip>
  );
}

/* ── ١) أبرز المخاطر ──────────────────────────────────────────────────── */

/** الشدّة ⇄ نغمة `STAT_TONES` — المطابقة نفسها في سجل المخاطر. */
const SEVERITY_TONE: Record<RiskSeverity, StatTone> = {
  high: "danger",
  medium: "warning",
  low: "success",
  // غير المقيس محايد لا أخضر: «سليم» حكمٌ يقتضي قياسًا وقع.
  unmeasured: "default",
};

const SEVERITY_WORD: Record<RiskSeverity, { ar: string; en: string }> = {
  high: { ar: "عالية", en: "High" },
  medium: { ar: "متوسطة", en: "Medium" },
  low: { ar: "منخفضة", en: "Low" },
  unmeasured: { ar: NOT_MEASURED.ar, en: "Not measured" },
};

// غير المقيس آخر الترتيب **ومعروضٌ لا مطويّ**: لا شدّة له تُقارَن فتقديمه
// يدفن ما قِيس فعلًا، وحذفه يجعل سجلًّا ناقص القياس يبدو مكتملًا.
const SEVERITY_ORDER: RiskSeverity[] = ["high", "medium", "low", "unmeasured"];

const REGION_BY_ID = new Map(REGIONS.map((r) => [r.id, r] as const));

function TopRisksCard({ ar, risk }: { ar: boolean; risk: HomeReads["risk"] }) {
  // الفرز مستقرّ: داخل الشدّة الواحدة يبقى ترتيب المصدر (الدرجة تنازليًّا).
  const top = [...(risk.data?.rows ?? [])]
    .sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity))
    .slice(0, 4);
  const regionName = (id: RegionId | null) => {
    const region = id ? REGION_BY_ID.get(id) : undefined;
    if (region) return ar ? region.shortAr : region.shortEn;
    return ar ? `المنطقة: ${NOT_MEASURED.ar}` : `Region: ${NOT_MEASURED.en}`;
  };

  return (
    <Panel
      id="nx-home-top-risks"
      title={ar ? "أبرز المخاطر" : "Top risks"}
      to="/sec/risks"
      moreAr="عرض الكل"
      moreEn="View all"
      ar={ar}
    >
      <PanelBody
        q={risk}
        ar={ar}
        isEmpty={top.length === 0}
        empty={ar ? "لا مخاطر مسجّلة في السجل." : "No risks in the register."}
      >
        <div className="nx-ops-body">
          <ul className="nx-ops-list">
            {top.map((r) => (
              <li key={r.id}>
                <Link to="/sec/risks" className="nx-ops-row nx-focus-ring">
                  {/* المصدر بلا فئة للمخاطرة: بلاطةٌ واحدة بأيقونة السجل
                      نفسها — لا فئة تُخمَّن من نصّ العنوان. */}
                  <Tile icon={ShieldAlert} tone="--tone-violet" />
                  <span className="nx-ops-main">
                    <span className="nx-ops-title">{r.title_ar}</span>
                    <span className="nx-ops-meta">
                      <MapPin aria-hidden />
                      <span>
                        {regionName(r.region_id)}
                        {" · "}
                        <bdi>{r.ref}</bdi>
                      </span>
                    </span>
                  </span>
                  <span className="nx-ops-aside">
                    <StatChip
                      tone={SEVERITY_TONE[r.severity]}
                      detail={ar ? SEVERITY_WORD[r.severity].ar : SEVERITY_WORD[r.severity].en}
                      ar={ar}
                    />
                    {/* لا وقت في المصدر — موضعه في الصورة يقول حالة المعالجة. */}
                    <span className="nx-ops-time">{r.status_ar}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </PanelBody>
    </Panel>
  );
}

/* ── ٢) الحوادث النشطة ─────────────────────────────────────────────────── */

/** فئة البلاغ ⇄ أيقونتها ولون هويتها. الفئة غير المعروفة (ومنها «الأحداث
 *  الأمنية» في التصدير الحقيقي) بصفّارة الحوادث — أيقونة القسم نفسه. */
const INCIDENT_CATEGORY: Record<string, { icon: LucideIcon; tone: ToneVar }> = {
  access: { icon: DoorOpen, tone: "--tone-blue" },
  cctv: { icon: Cctv, tone: "--tone-cyan" },
  gas_leak: { icon: Wind, tone: "--tone-violet" },
  perimeter: { icon: Fence, tone: "--tone-blue" },
  safety: { icon: HardHat, tone: "--tone-cyan" },
};
const INCIDENT_CATEGORY_FALLBACK = { icon: Siren, tone: "--tone-violet" as ToneVar };

/** حالة البلاغ مرحلة عمل لا حكم — ألوان الهوية وأيقونة تميّز كلًّا منها. */
const INCIDENT_STATE: Record<string, { icon: LucideIcon; tone: ToneVar; en: string }> = {
  open: { icon: CircleDot, tone: "--tone-blue", en: "Open" },
  investigating: { icon: Search, tone: "--tone-cyan", en: "Investigating" },
  contained: { icon: Shield, tone: "--tone-violet", en: "Contained" },
};

function ActiveIncidentsCard({ ar, sec }: { ar: boolean; sec: HomeReads["sec"] }) {
  const open = newestFirst(
    (sec.data?.incidents ?? []).filter((i) => i.status !== "closed" && i.status !== "resolved"),
    (i) => i.reported_at,
  ).slice(0, 4);
  const siteName = new Map((sec.data?.sites ?? []).map((s) => [s.id, ar ? s.name_ar : s.name_en]));
  const now = sec.dataUpdatedAt;

  return (
    <Panel
      id="nx-home-active-incidents"
      title={ar ? "الحوادث النشطة" : "Active incidents"}
      to="/sec/incidents"
      moreAr="عرض الكل"
      moreEn="View all"
      ar={ar}
    >
      <PanelBody
        q={sec}
        ar={ar}
        isEmpty={open.length === 0}
        empty={ar ? "لا حوادث مفتوحة الآن." : "No open incidents."}
      >
        <div className="nx-ops-body">
          <ul className="nx-ops-list">
            {open.map((i) => {
              const cat = INCIDENT_CATEGORY[i.category] ?? INCIDENT_CATEGORY_FALLBACK;
              const state = INCIDENT_STATE[i.status];
              const stateWord = ar
                ? (INCIDENT_STATUS_AR[i.status] ?? i.status)
                : (state?.en ?? i.status);
              // الموقع من سجلّ المواقع وحده — الصفّ بلا موقع «لم يُقَس».
              const where = (i.site_id && siteName.get(i.site_id)) || null;
              return (
                <li key={i.id}>
                  <Link to="/sec/incidents" className="nx-ops-row nx-focus-ring">
                    <Tile icon={cat.icon} tone={cat.tone} />
                    <span className="nx-ops-main">
                      <span className="nx-ops-title">
                        {ar ? i.title_ar : (i.title_en ?? i.title_ar)}
                      </span>
                      <span className="nx-ops-meta">
                        <MapPin aria-hidden />
                        <span>
                          {where ??
                            (ar ? `الموقع: ${NOT_MEASURED.ar}` : `Site: ${NOT_MEASURED.en}`)}
                        </span>
                      </span>
                    </span>
                    <span className="nx-ops-aside">
                      <Chip
                        icon={state?.icon ?? CircleDashed}
                        tone={state?.tone ?? "--ink-3"}
                        dashed={!state}
                      >
                        {stateWord}
                      </Chip>
                      <time
                        className="nx-ops-time"
                        dateTime={i.reported_at}
                        title={fmtTime(i.reported_at, ar)}
                      >
                        {fmtAgo(i.reported_at, now, ar)}
                      </time>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </PanelBody>
    </Panel>
  );
}

/* ── ٣) الدوريات الميدانية ─────────────────────────────────────────────── */

/**
 * التقسيم بكلمات الحالة الصادقة وأشكالها في `/sec/patrols` نفسها: دائرة
 * نشاط = نشطة · ساعة = مجدولة · دائرة صح = مكتملة · مثمّن = فائتة. والمثمّن
 * أحمر والدائرة خضراء لأن الشكل نفسه حكمٌ في عرف اللوحة (§3.5)؛ والجارية
 * والمجدولة عدٌّ بلون الهوية.
 */
const PATROL_SPLIT: readonly { key: string; en: string; icon: LucideIcon; tone: ToneVar }[] = [
  { key: "active", en: "Active", icon: Activity, tone: "--tone-blue" },
  { key: "scheduled", en: "Scheduled", icon: Clock, tone: "--tone-cyan" },
  { key: "completed", en: "Completed", icon: CheckCircle2, tone: "--tone-emerald" },
  { key: "missed", en: "Missed", icon: OctagonAlert, tone: "--tone-rose" },
];

/** سقف قراءة الدوريات في `fetchSecOverview` (`limit(200)`) — مرآته هنا كي
 *  لا يُقرأ «٢٠٠» إجماليًّا للسجل كلّه وهو أحدث ٢٠٠ فقط. */
const PATROL_READ_CAP = 200;

/** حلقة الإنجاز — SVG خالص، والقيمة نصًّا بجانبها لا داخل الرسم المُحجَّم. */
const RING_R = 42;
const RING_C = 2 * Math.PI * RING_R;

function FieldPatrolsCard({ ar, sec }: { ar: boolean; sec: HomeReads["sec"] }) {
  const patrols = sec.data?.patrols ?? [];
  const split = PATROL_SPLIT.map((s) => ({
    ...s,
    count: patrols.filter((p) => p.status === s.key).length,
  }));
  // حالةٌ خارج الأربع تُعدّ ولا تُطوى في إحداها: الإجمالي يساوي مجموع ما تحته.
  const other = patrols.length - split.reduce((n, s) => n + s.count, 0);
  const capped = patrols.length >= PATROL_READ_CAP;

  // نقاط التفتيش للدوريات النشطة — ولا نسبة بلا مقام (لا قوس فارغ يوهم بصفر).
  const active = patrols.filter((p) => p.status === "active");
  const cpTotal = active.reduce((n, p) => n + p.checkpoints_total, 0);
  const cpDone = active.reduce((n, p) => n + p.checkpoints_done, 0);
  const cpShare = cpTotal > 0 ? Math.min(1, Math.max(0, cpDone / cpTotal)) : null;

  const change = ar ? "التغيّر: لم يُقَس" : "Change: not measured";

  return (
    <Panel
      id="nx-home-field-patrols"
      title={ar ? "الدوريات الميدانية" : "Field patrols"}
      to="/sec/patrols"
      moreAr="عرض الكل"
      moreEn="View all"
      ar={ar}
    >
      <PanelBody
        q={sec}
        ar={ar}
        isEmpty={patrols.length === 0}
        empty={ar ? "لا دوريات مسجّلة." : "No patrols on record."}
      >
        <div className="nx-ops-patrol">
          <div className="nx-ops-patrol-grid">
            <Link to="/sec/patrols" className="nx-ops-patrol-total nx-focus-ring">
              <span className="nx-ops-patrol-label">
                {ar ? "إجمالي الدوريات" : "Total patrols"}
              </span>
              <span className="nx-ops-patrol-value">{fmtNum(patrols.length, ar)}</span>
              {capped && (
                <span className="nx-ops-patrol-sub">
                  {ar
                    ? `أحدث ${fmtNum(PATROL_READ_CAP, ar)} سجل`
                    : `Latest ${PATROL_READ_CAP} records`}
                </span>
              )}
              {/* موضع النسبة في الصورة: لا سلسلة زمنية للدوريات (D2). */}
              <span className="nx-ops-change">
                <CircleDashed aria-hidden />
                {change}
              </span>
            </Link>

            <Link to="/sec/patrols" className="nx-ops-patrol-visual nx-focus-ring">
              {cpShare !== null ? (
                <>
                  <span className="nx-ops-ring">
                    <svg viewBox="0 0 100 100" aria-hidden>
                      <circle
                        cx="50"
                        cy="50"
                        r={RING_R}
                        fill="none"
                        strokeWidth="10"
                        className="nx-ops-ring-track"
                      />
                      {cpShare > 0 && (
                        <circle
                          cx="50"
                          cy="50"
                          r={RING_R}
                          fill="none"
                          strokeWidth="10"
                          strokeDasharray={`${cpShare * RING_C} ${RING_C}`}
                          transform="rotate(-90 50 50)"
                          className="nx-ops-ring-arc"
                        />
                      )}
                    </svg>
                    <span className="nx-ops-ring-value">
                      {ar
                        ? `${fmtNum(Math.round(cpShare * 100), ar)}٪`
                        : `${Math.round(cpShare * 100)}%`}
                    </span>
                  </span>
                  <span className="nx-ops-ring-caption">{ar ? "نقاط التفتيش" : "Checkpoints"}</span>
                  <span className="nx-ops-ring-count">
                    {ar
                      ? `${fmtNum(cpDone, ar)} من ${fmtNum(cpTotal, ar)}`
                      : `${cpDone} of ${cpTotal}`}
                  </span>
                </>
              ) : (
                <>
                  <CircleDashed aria-hidden className="nx-ops-ring-absent" />
                  <span className="nx-ops-ring-caption">{ar ? "نقاط التفتيش" : "Checkpoints"}</span>
                  <span className="nx-ops-ring-count">
                    {active.length === 0
                      ? ar
                        ? "لا دوريات نشطة"
                        : "No active patrols"
                      : ar
                        ? NOT_MEASURED.ar
                        : NOT_MEASURED.en}
                  </span>
                </>
              )}
            </Link>

            <ul className="nx-ops-split">
              {split.map((s) => {
                const Icon = s.icon;
                const word = ar ? (PATROL_STATUS_AR[s.key] ?? s.key) : s.en;
                return (
                  <li key={s.key}>
                    <Link
                      to="/sec/patrols"
                      className="nx-ops-split-row nx-focus-ring"
                      style={{ ["--split-tone" as string]: `var(${s.tone})` }}
                    >
                      <Icon aria-hidden />
                      <span>{word}</span>
                      <span className="nx-ops-split-count">{fmtNum(s.count, ar)}</span>
                    </Link>
                  </li>
                );
              })}
              {other > 0 && (
                <li>
                  <Link
                    to="/sec/patrols"
                    className="nx-ops-split-row nx-focus-ring"
                    style={{ ["--split-tone" as string]: "var(--ink-3)" }}
                  >
                    <CircleDashed aria-hidden />
                    <span>{ar ? "أخرى" : "Other"}</span>
                    <span className="nx-ops-split-count">{fmtNum(other, ar)}</span>
                  </Link>
                </li>
              )}
            </ul>

            <Link to="/sec/patrols" className="nx-ops-cta nx-focus-ring">
              <Car aria-hidden />
              {ar ? "إدارة الدوريات" : "Manage patrols"}
            </Link>
          </div>
        </div>
      </PanelBody>
    </Panel>
  );
}

/* ── ٤) كاميرات مباشرة — بطاقات حالة بلا بثّ ─────────────────────────── */

/** حالة التنبيه مرحلة عمل — ألوان الهوية وأيقونة لكلٍّ منها. */
const CCTV_STATE: Record<string, { icon: LucideIcon; tone: ToneVar; en: string }> = {
  new: { icon: BellRing, tone: "--tone-cyan", en: "New" },
  acknowledged: { icon: Eye, tone: "--tone-blue", en: "Acknowledged" },
  resolved: { icon: Check, tone: "--tone-violet", en: "Resolved" },
};

/** نوع التنبيه: تسلّل = خطر، والبقية = تحذير — معيار `/sec/cctv` نفسه. */
const alertTone = (alertType: string): StatTone =>
  alertType === "intrusion" ? "danger" : "warning";

function CameraTilesCard({ ar, sec }: { ar: boolean; sec: HomeReads["sec"] }) {
  const alerts = newestFirst(sec.data?.cctv ?? [], (a) => a.detected_at).slice(0, 4);
  const siteName = new Map((sec.data?.sites ?? []).map((s) => [s.id, ar ? s.name_ar : s.name_en]));
  const now = sec.dataUpdatedAt;

  return (
    <Panel
      id="nx-home-camera-tiles"
      title={ar ? "كاميرات مباشرة" : "Cameras"}
      to="/sec/cctv"
      moreAr="عرض الكل"
      moreEn="View all"
      ar={ar}
      // في كل حال — تحميلًا وخطأً وفراغًا: لا بثّ مرتبط بالتنبيهات (D3).
      note={ar ? "بطاقات حالة — لا بثّ مرتبط" : "Status cards — no linked feed"}
    >
      <PanelBody
        q={sec}
        ar={ar}
        isEmpty={alerts.length === 0}
        empty={ar ? "لا تنبيهات كاميرات." : "No camera alerts."}
      >
        <div className="nx-ops-cams">
          <ul className="nx-ops-cam-grid">
            {alerts.map((a) => {
              const state = CCTV_STATE[a.status];
              const stateWord = ar
                ? (CCTV_STATUS_AR[a.status] ?? a.status)
                : (state?.en ?? a.status);
              const typeWord = ar ? (ALERT_TYPE_AR[a.alert_type] ?? a.alert_type) : a.alert_type;
              const where = (a.site_id && siteName.get(a.site_id)) || null;
              return (
                <li key={a.id}>
                  <Link to="/sec/cctv" className="nx-ops-cam nx-focus-ring">
                    <span className="nx-ops-cam-head">
                      <span className="nx-ops-cam-code">
                        <Cctv aria-hidden />
                        <bdi>{a.camera_code}</bdi>
                      </span>
                      <Chip
                        icon={state?.icon ?? CircleDashed}
                        tone={state?.tone ?? "--ink-3"}
                        dashed={!state}
                      >
                        {stateWord}
                      </Chip>
                    </span>
                    <span className="nx-ops-cam-alert">
                      <StatChip tone={alertTone(a.alert_type)} detail={typeWord} ar={ar} />
                    </span>
                    <span className="nx-ops-cam-foot">
                      <span className="nx-ops-cam-site">
                        {where ?? (ar ? "الموقع غير مسجّل" : "Site not registered")}
                      </span>
                      <time
                        className="nx-ops-cam-time"
                        dateTime={a.detected_at}
                        title={fmtTime(a.detected_at, ar)}
                      >
                        {fmtAgo(a.detected_at, now, ar)}
                      </time>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </PanelBody>
    </Panel>
  );
}

/* ── الصفّ ──────────────────────────────────────────────────────────────── */

export function HomeOpsRow() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  // المفاتيح نفسها التي يقرأ منها صفّ المؤشرات: طلبٌ واحد ورقمٌ واحد.
  const { sec, risk } = useHomeReads();
  return (
    <div dir="ltr" className="nx-home-quad">
      <TopRisksCard ar={ar} risk={risk} />
      <ActiveIncidentsCard ar={ar} sec={sec} />
      <FieldPatrolsCard ar={ar} sec={sec} />
      <CameraTilesCard ar={ar} sec={sec} />
    </div>
  );
}
