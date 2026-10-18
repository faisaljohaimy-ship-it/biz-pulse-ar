/**
 * صفّ التشغيل — أربع بطاقات يسارًا ← يمينًا كما في الصورة (مواصفة §4.6):
 * أبرز المخاطر · الحوادث النشطة · الدوريات الميدانية · كاميرات مباشرة.
 *
 * الشبكة (`.nx-home-quad`) `ltr` ترتيبًا فقط (قرار المالك D5)، وكل بطاقة تعلن
 * اتجاه لغتها بنفسها، فيبقى نصّها عربيًّا `rtl`. وعرض البطاقات الأربع بنسبها
 * المرسومة (352 · 320 · 307 · 267) في `home-ops.css`.
 *
 * ## مصدران لا يُخلطان (قرار المالك N2 — «محاكاة موسومة مطابقة»)
 *
 * لكل بطاقة مصدرٌ واحد في اللحظة الواحدة، يقرّره كاشفٌ من `liveOf`:
 *
 *   • **الحيّ يفوز تلقائيًّا** — متى أعادت القراءة صفوفًا حيّة عُرضت هي
 *     بكلماتها الصادقة، بلا شارة، وخانة التغيّر فيها «لم يُقَس» (لا سهمٌ
 *     مرجعي فوق رقمٍ حيّ). والحيّ بلا صفوف فراغٌ صادق لا مرجع.
 *   • **وإلا فأرقام الصورة نفسها** من `HOME_REFERENCE` (`home-reference.ts`)
 *     تحت شارة «محاكاة» ظاهرة في رأس البطاقة — ومنها حين تتعذّر القراءة،
 *     ومعها إعادة المحاولة (المادة ١٤).
 *   • الانتظار هيكلٌ ساكن: لا رقم يُدّعى قبل وصول قراءته.
 *
 *   أبرز المخاطر ← `getRiskBoard().rows` · `liveOf.risk` (محاكاة دائمًا اليوم).
 *   الحوادث       ← `getSecOverview().incidents` غير المغلقة · `liveOf.secIncidents`.
 *   الدوريات      ← `getSecOverview().patrols` بحالاتها الصادقة · `liveOf.sec`.
 *   الكاميرات     ← الصور توضيحية دائمًا؛ والوسوم من `cctv` متى `liveOf.sec`.
 *
 * ## الصور (قرار N3 — «صور توضيحية موسومة»)
 *
 * من `home-images.ts` وحده، بأبعادٍ صريحة ونصٍّ بديل يحمل «صورة توضيحية»،
 * وكسولةً تحت الطيّ. والوسم «صورة توضيحية — لا بثّ مرتبط» سطرٌ ظاهر في كل
 * بطاقة تعرض صورًا. **والصفّ الحيّ لا يُلصق به صورةُ مرجعٍ**: صورةٌ توضيحية
 * فوق بلاغٍ حقيقي توهم أنها لقطته — فالحيّ ببلاطة أيقونة فئته. وخريطة
 * الدوريات رسمٌ توضيحي SVG بحسب الوضع (`PatrolRouteMap`).
 *
 * ## البيانات الشخصية (§3.3)
 *
 * لا يُقرأ منشئ البلاغ (`owner`) ولا مُستلِم تنبيه الكاميرا ولا فريق الدورية —
 * صفوفٌ وأعداد فقط.
 *
 * ## الحالة: شكلٌ وكلمة لا لونٌ وحده (§3.5 · WCAG 2.2 §1.4.1)
 *
 * رقاقة الحالة تحمل كلمتها المرسومة وشكل `STAT_TONES` (مثمّن «خطر» · مثلث
 * «تحذير» · دائرة «سليم»)، وكلمة الحكم نفسها مقروءةٌ لقارئ الشاشة. والألوان
 * رموزٌ في `home-ops.css` وحده؛ الأسلوب المضمّن يمرّر متغيّرات فقط.
 */
import { Link } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowUp,
  Cctv,
  ChevronLeft,
  CircleDashed,
  DoorOpen,
  Fence,
  HardHat,
  Maximize,
  ShieldAlert,
  Siren,
  UserRoundPlus,
  Wind,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { STAT_TONES } from "@/components/sec/sec-shell";
import type { RiskSeverity } from "@/lib/exec/risk-board.functions";
import { useHomeReads, type HomeReads } from "@/components/home/home-reads";
import {
  ALERT_TYPE_AR,
  INCIDENT_STATUS_AR,
  PATROL_STATUS_AR,
  fmtTime,
} from "@/components/home/home-primitives";
import {
  CHANGE_NOT_MEASURED_AR,
  HOME_REFERENCE,
  SIMULATION_BADGE_AR,
  liveOf,
  regionLineAr,
  type RefImageKey,
  type RefStatus,
} from "@/components/home/home-reference";
import { HOME_IMAGES, ILLUSTRATIVE_LABEL } from "@/components/home/home-images";
import { PatrolRouteMap } from "@/components/home/PatrolRouteMap";
import "@/styles/home/home-ops.css";

/* ── المفردات ──────────────────────────────────────────────────────────── */

/** حالة الرقاقة: دلالات المرجع الأربع، و«محايدة» لما لم يُقَس أو لا تعرفه الخريطة. */
type ChipStatus = RefStatus | "neutral";

/** كلمة الحكم المقروءة لقارئ الشاشة — من `STAT_TONES` نفسها حيث هي حكم. */
const VERDICT_AR: Record<ChipStatus, string | null> = {
  danger: STAT_TONES.danger.badge,
  warning: STAT_TONES.warning.badge,
  healthy: STAT_TONES.success.badge,
  info: null,
  neutral: null,
};

/** الأرقام كما كُتبت في الصورة: لاتينية بفاصل الآلاف — كصفّ المؤشرات. */
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

/* ── الزمن النسبي — «منذ 15 دقيقة» كما رُسم ─────────────────────────────
   من لحظة وصول القراءة (`dataUpdatedAt`) لا من ساعةٍ تُقرأ أثناء الرسم:
   الرقم يتجدّد مع كل قراءة ويبقى ثابتًا بينها، ويتطابق رسم الخادم والعميل. */

/** العدد بصيغته العربية: المفرد · المثنى · الجمع (3–10) · التمييز (11+). */
function countAr(n: number, forms: readonly [string, string, string, string]): string {
  if (n === 1) return `منذ ${forms[0]}`;
  if (n === 2) return `منذ ${forms[1]}`;
  if (n <= 10) return `منذ ${n} ${forms[2]}`;
  return `منذ ${n} ${forms[3]}`;
}

function agoText(iso: string | null, now: number, ar: boolean): string {
  const at = iso ? Date.parse(iso) : NaN;
  if (!Number.isFinite(at) || !now) return ar ? CHANGE_NOT_MEASURED_AR : "not measured";
  const min = Math.max(0, Math.round((now - at) / 60_000));
  if (!ar) {
    const rtf = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });
    if (min < 60) return rtf.format(-min, "minute");
    if (min < 1440) return rtf.format(-Math.round(min / 60), "hour");
    if (min < 43_200) return rtf.format(-Math.round(min / 1440), "day");
    if (min < 525_600) return rtf.format(-Math.round(min / 43_200), "month");
    return rtf.format(-Math.round(min / 525_600), "year");
  }
  if (min < 1) return "الآن";
  if (min < 60) return countAr(min, ["دقيقة", "دقيقتين", "دقائق", "دقيقة"]);
  const h = Math.round(min / 60);
  if (h < 24) return countAr(h, ["ساعة", "ساعتين", "ساعات", "ساعة"]);
  const d = Math.round(h / 24);
  if (d < 30) return countAr(d, ["يوم", "يومين", "أيام", "يومًا"]);
  const mo = Math.round(d / 30);
  if (mo < 12) return countAr(mo, ["شهر", "شهرين", "أشهر", "شهرًا"]);
  return countAr(Math.max(1, Math.round(d / 365)), ["سنة", "سنتين", "سنوات", "سنة"]);
}

/** الأحدث أولًا — المصدر يرتّب كذلك، والفرز هنا يحفظ المعنى إن تبدّل. */
const newestFirst = <T,>(rows: readonly T[], at: (r: T) => string) =>
  [...rows].sort((a, b) => Date.parse(at(b)) - Date.parse(at(a)));

/* ── الشكل: مثمّن · مثلث · دائرة (عرف لوحات السلامة) ─────────────────────
   رسمٌ صغير بلون الرقاقة: الشكل ممتلئ والعلامة داخله بلون خلفيتها — كما
   رُسمت رموز الرقاقات في الصورة، بأشكال `STAT_TONES` لا بمثلثٍ للجميع. */

function StatusGlyph({ status, className }: { status: ChipStatus; className?: string }) {
  const cls = className ? `nx-ops-glyph ${className}` : "nx-ops-glyph";
  if (status === "neutral") {
    return (
      <svg viewBox="0 0 12 12" aria-hidden focusable="false" className={cls} data-status={status}>
        <circle className="nx-ops-glyph-ring" cx="6" cy="6" r="4.6" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 12 12" aria-hidden focusable="false" className={cls} data-status={status}>
      {status === "danger" && (
        <>
          <path
            className="nx-ops-glyph-shape"
            d="M3.6 0.6H8.4L11.4 3.6V8.4L8.4 11.4H3.6L0.6 8.4V3.6Z"
          />
          <path className="nx-ops-glyph-mark" d="M6 3.2V6.6M6 8.7V8.8" />
        </>
      )}
      {status === "warning" && (
        <>
          <path className="nx-ops-glyph-shape" d="M6 0.9L11.3 10.6H0.7Z" />
          <path className="nx-ops-glyph-mark" d="M6 4.4V7.2M6 9.1V9.2" />
        </>
      )}
      {status === "healthy" && (
        <>
          <circle className="nx-ops-glyph-shape" cx="6" cy="6" r="5.4" />
          <path className="nx-ops-glyph-mark" d="M3.5 6.1L5.2 7.8L8.5 4.4" />
        </>
      )}
      {status === "info" && (
        <>
          <circle className="nx-ops-glyph-shape" cx="6" cy="6" r="5.4" />
          <path className="nx-ops-glyph-mark" d="M6 3.5V3.6M6 5.4V8.6" />
        </>
      )}
    </svg>
  );
}

/** رقاقة الحالة: الكلمة كما رُسمت، والشكل، وكلمة الحكم لقارئ الشاشة. */
function StatusChip({ status, children }: { status: ChipStatus; children: string }) {
  const verdict = VERDICT_AR[status];
  return (
    <span className="nx-ops-chip" data-status={status}>
      {verdict && <span className="sr-only">{`${verdict}: `}</span>}
      <span className="nx-ops-chip-word">{children}</span>
      <StatusGlyph status={status} />
    </span>
  );
}

/* ── البطاقة ───────────────────────────────────────────────────────────── */

/** حال البطاقة: انتظار (هيكل) · حيّ · مرجعٌ موسوم (ومعه سبب التعذّر إن كان). */
type CardMode = "loading" | "live" | "reference";

function modeOf(q: { isPending: boolean; isError: boolean }, live: boolean): CardMode {
  if (q.isError) return "reference";
  if (q.isPending) return "loading";
  return live ? "live" : "reference";
}

function OpsCard({
  id,
  title,
  icon,
  to,
  ar,
  mode,
  failed,
  onRetry,
  caption,
  variant,
  children,
}: {
  id: string;
  title: string;
  icon?: ReactNode;
  to: string;
  ar: boolean;
  mode: CardMode;
  failed: boolean;
  onRetry: () => void;
  caption?: string | null;
  /** صنفٌ إضافي لبطاقةٍ تختلف حواشيها المرسومة (الكاميرات). */
  variant?: string;
  children: ReactNode;
}) {
  const simulated = mode === "reference";
  return (
    <section
      aria-labelledby={id}
      aria-busy={mode === "loading" || undefined}
      dir={ar ? "rtl" : "ltr"}
      data-mode={mode}
      className={variant ? `nx-home-panel nx-ops-card ${variant}` : "nx-home-panel nx-ops-card"}
    >
      <div className="nx-ops-head">
        <h2 id={id} className="nx-ops-title">
          {icon}
          <span>{title}</span>
        </h2>
        {simulated && (
          // الخانة تنزل سطرًا كاملًا تحت العنوان في البطاقة الضيّقة، والشارة
          // داخلها بحجمها — فلا يُقصّ العنوان ولا تتمدّد الشارة.
          <span className="nx-ops-sim-slot">
            <span
              className="nx-ops-sim"
              title={
                ar
                  ? `بيانات مرجعية بأرقام التصميم، ليست حيّة${failed ? " — تعذّر تحميل البيانات الحيّة" : ""}`
                  : "Reference data (not live)"
              }
            >
              {ar ? SIMULATION_BADGE_AR : "Reference"}
            </span>
          </span>
        )}
        <Link to={to} className="nx-home-more nx-ops-more">
          <span className="nx-ops-more-face">
            {ar ? "عرض الكل" : "View all"}
            <ChevronLeft aria-hidden className={ar ? undefined : "nx-ops-flip"} />
          </span>
        </Link>
      </div>
      <div className="nx-ops-body">{children}</div>
      {failed && (
        <div role="alert" className="nx-ops-failed">
          <span>{ar ? "تعذّر تحميل البيانات الحيّة." : "Live data could not load."}</span>
          <button type="button" onClick={onRetry} className="nx-home-retry nx-ops-retry">
            {ar ? "أعد المحاولة" : "Retry"}
          </button>
        </div>
      )}
      {caption && <p className="nx-ops-caption">{caption}</p>}
    </section>
  );
}

/** هيكل الانتظار — أشكالٌ ساكنة بلا نصّ: الانتظار يُرى ولا يُقرأ حكمًا. */
function Skeleton({ rows, kind, ar }: { rows: number; kind: "row" | "tile"; ar: boolean }) {
  return (
    <div className="nx-ops-wait" data-kind={kind}>
      <span className="sr-only">{ar ? "جارٍ التحميل" : "Loading"}</span>
      {Array.from({ length: rows }, (_, i) => (
        <span key={i} aria-hidden className="nx-home-skeleton nx-ops-wait-item" />
      ))}
    </div>
  );
}

/** الفراغ الصادق لقراءةٍ حيّة بلا صفوف — لا مرجع يملؤه. */
function EmptyLive({ children }: { children: string }) {
  return <p className="nx-ops-empty">{children}</p>;
}

/** الصورة المصغّرة — من بيان الصور وحده، بأبعاده ونصّه البديل. */
function Thumb({ image }: { image: RefImageKey }) {
  const img = HOME_IMAGES[image];
  return (
    <img
      src={img.src}
      width={img.width}
      height={img.height}
      alt={img.alt}
      title={img.alt}
      loading={img.loading}
      decoding="async"
      className="nx-ops-thumb"
    />
  );
}

/** بلاطة أيقونة الفئة — للصفوف الحيّة (لا صورة مرجعٍ فوق صفٍّ حقيقي). */
type ToneVar = "--tone-blue" | "--tone-cyan" | "--tone-violet";
function Tile({ icon: Icon, tone }: { icon: LucideIcon; tone: ToneVar }) {
  return (
    <span aria-hidden className="nx-ops-tile" style={{ ["--ops-tone" as string]: `var(${tone})` }}>
      <Icon />
    </span>
  );
}

/** صفّ القائمة: الصورة/البلاطة · العنوان والمكان · الرقاقة والزمن. */
function ListRow({
  to,
  media,
  title,
  meta,
  chip,
  time,
  timeIso,
  ar,
}: {
  to: string;
  media: ReactNode;
  title: string;
  meta: string;
  chip: ReactNode;
  time: string;
  timeIso?: string | null;
  ar: boolean;
}) {
  return (
    <li>
      <Link to={to} className="nx-ops-row nx-focus-ring" title={title}>
        <span className="nx-ops-media">{media}</span>
        <span className="nx-ops-main">
          <span className="nx-ops-row-title">{title}</span>
          <span className="nx-ops-meta">{meta}</span>
        </span>
        <span className="nx-ops-aside">
          {chip}
          {timeIso ? (
            <time className="nx-ops-time" dateTime={timeIso} title={fmtTime(timeIso, ar)}>
              {time}
            </time>
          ) : (
            <span className="nx-ops-time">{time}</span>
          )}
        </span>
      </Link>
    </li>
  );
}

/** رمز رأس «أبرز المخاطر» كما رُسم: لوحٌ أزرق ممتلئ بأسطرٍ من لون السطح. */
function RisksHeadGlyph() {
  return (
    <svg viewBox="0 0 16 18" aria-hidden focusable="false" className="nx-ops-head-glyph">
      <rect className="nx-ops-head-glyph-body" x="1.5" y="2" width="13" height="15.5" rx="2.6" />
      <rect className="nx-ops-head-glyph-clip" x="5" y="0.5" width="6" height="3.4" rx="1.2" />
      <path className="nx-ops-head-glyph-line" d="M4.6 7.4H11.4M4.6 10.4H11.4M4.6 13.4H9" />
    </svg>
  );
}

/* ── ١) أبرز المخاطر ──────────────────────────────────────────────────── */

/** الشدّة ⇄ دلالة الرقاقة وكلمتها — مفردات الصورة («مرتفع» · «متوسط»). */
const SEVERITY_VIEW: Record<RiskSeverity, { status: ChipStatus; ar: string }> = {
  high: { status: "danger", ar: "مرتفع" },
  medium: { status: "warning", ar: "متوسط" },
  low: { status: "healthy", ar: "منخفض" },
  // غير المقيس محايد لا أخضر: «سليم» حكمٌ يقتضي قياسًا وقع.
  unmeasured: { status: "neutral", ar: CHANGE_NOT_MEASURED_AR },
};
const SEVERITY_ORDER: RiskSeverity[] = ["high", "medium", "low", "unmeasured"];

function TopRisksCard({ ar, risk }: { ar: boolean; risk: HomeReads["risk"] }) {
  const mode = modeOf(risk, liveOf.risk(risk.data));
  const ref = HOME_REFERENCE.risks;
  let body: ReactNode;

  if (mode === "loading") {
    body = <Skeleton rows={4} kind="row" ar={ar} />;
  } else if (mode === "live") {
    // الفرز مستقرّ: داخل الشدّة الواحدة يبقى ترتيب المصدر (الدرجة تنازليًّا).
    const top = [...(risk.data?.rows ?? [])]
      .sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity))
      .slice(0, 4);
    body =
      top.length === 0 ? (
        <EmptyLive>{ar ? "لا مخاطر مسجّلة في السجل." : "No risks in the register."}</EmptyLive>
      ) : (
        <ul className="nx-ops-list">
          {top.map((r) => {
            const sev = SEVERITY_VIEW[r.severity];
            return (
              <ListRow
                key={r.id}
                to="/sec/risks"
                ar={ar}
                media={<Tile icon={ShieldAlert} tone="--tone-violet" />}
                title={r.title_ar}
                meta={
                  r.region_id ? regionLineAr(r.region_id) : `المنطقة: ${CHANGE_NOT_MEASURED_AR}`
                }
                chip={<StatusChip status={sev.status}>{sev.ar}</StatusChip>}
                // لا زمن في المصدر — موضعه يقول حالة المعالجة.
                time={r.status_ar}
              />
            );
          })}
        </ul>
      );
  } else {
    body = (
      <ul className="nx-ops-list">
        {ref.rows.map((r) => (
          <ListRow
            key={r.image}
            to="/sec/risks"
            ar={ar}
            media={<Thumb image={r.image} />}
            title={r.titleAr}
            meta={regionLineAr(r.regionId, r.siteAr)}
            chip={<StatusChip status={r.status}>{r.severityAr}</StatusChip>}
            time={r.agoAr}
          />
        ))}
      </ul>
    );
  }

  return (
    <OpsCard
      id="nx-home-top-risks"
      title={ar ? "أبرز المخاطر" : "Top risks"}
      icon={<RisksHeadGlyph />}
      to="/sec/risks"
      ar={ar}
      mode={mode}
      failed={risk.isError}
      onRetry={() => void risk.refetch()}
      caption={mode === "reference" ? ILLUSTRATIVE_LABEL : null}
    >
      {body}
    </OpsCard>
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

/** حالة البلاغ الحيّة ⇄ دلالة الصورة: قيد التحقيق تحذير، والمحتوى سليم، والمفتوح متابعة. */
const INCIDENT_STATE: Record<string, ChipStatus> = {
  open: "info",
  investigating: "warning",
  contained: "healthy",
};

/** كلمة الحالة على الرقاقة: مفردة الصورة حيث تطابق المعنى نفسه («تم الاحتواء»
 *  هي «محتوى»)، وإلا مفردات النظام المشتركة. */
const INCIDENT_CHIP_AR: Record<string, string> = {
  ...INCIDENT_STATUS_AR,
  contained: "تم الاحتواء",
};

function ActiveIncidentsCard({ ar, sec }: { ar: boolean; sec: HomeReads["sec"] }) {
  const mode = modeOf(sec, liveOf.secIncidents(sec.data));
  const ref = HOME_REFERENCE.incidents;
  let body: ReactNode;

  if (mode === "loading") {
    body = <Skeleton rows={4} kind="row" ar={ar} />;
  } else if (mode === "live") {
    const open = newestFirst(
      (sec.data?.incidents ?? []).filter((i) => i.status !== "closed" && i.status !== "resolved"),
      (i) => i.reported_at,
    ).slice(0, 4);
    const siteName = new Map(
      (sec.data?.sites ?? []).map((s) => [s.id, ar ? s.name_ar : s.name_en]),
    );
    const now = sec.dataUpdatedAt;
    body =
      open.length === 0 ? (
        <EmptyLive>{ar ? "لا حوادث مفتوحة الآن." : "No open incidents."}</EmptyLive>
      ) : (
        <ul className="nx-ops-list" data-kind="incident">
          {open.map((i) => {
            const cat = INCIDENT_CATEGORY[i.category] ?? INCIDENT_CATEGORY_FALLBACK;
            // الموقع من سجلّ المواقع وحده — الصفّ بلا موقع «لم يُقَس».
            const where = (i.site_id && siteName.get(i.site_id)) || null;
            return (
              <ListRow
                key={i.id}
                to="/sec/incidents"
                ar={ar}
                media={<Tile icon={cat.icon} tone={cat.tone} />}
                title={ar ? i.title_ar : (i.title_en ?? i.title_ar)}
                meta={where ?? (ar ? `الموقع: ${CHANGE_NOT_MEASURED_AR}` : "Site: not measured")}
                chip={
                  <StatusChip status={INCIDENT_STATE[i.status] ?? "neutral"}>
                    {ar ? (INCIDENT_CHIP_AR[i.status] ?? i.status) : i.status}
                  </StatusChip>
                }
                time={agoText(i.reported_at, now, ar)}
                timeIso={i.reported_at}
              />
            );
          })}
        </ul>
      );
  } else {
    body = (
      <ul className="nx-ops-list" data-kind="incident">
        {ref.rows.map((r) => (
          <ListRow
            key={r.image}
            to="/sec/incidents"
            ar={ar}
            media={<Thumb image={r.image} />}
            title={r.titleAr}
            meta={regionLineAr(r.regionId)}
            chip={<StatusChip status={r.status}>{r.statusAr}</StatusChip>}
            time={r.agoAr}
          />
        ))}
      </ul>
    );
  }

  return (
    <OpsCard
      id="nx-home-active-incidents"
      title={ar ? "الحوادث النشطة" : "Active incidents"}
      to="/sec/incidents"
      ar={ar}
      mode={mode}
      failed={sec.isError}
      onRetry={() => void sec.refetch()}
      caption={mode === "reference" ? ILLUSTRATIVE_LABEL : null}
    >
      {body}
    </OpsCard>
  );
}

/* ── ٣) الدوريات الميدانية ─────────────────────────────────────────────── */

/** صفّ تقسيم: الكلمة والعدد والدلالة (شكلًا ولونًا). */
type SplitRow = { key: string; label: string; value: number; status: ChipStatus };

/**
 * الحيّ بحالاته الصادقة الأربع (لا الثلاث المرسومة): النشطة سليمة كما رُسمت
 * خضراء، والفائتة خطر، والمجدولة والمكتملة عدٌّ لا حكم (أزرق محايد).
 */
const PATROL_LIVE: readonly { key: string; en: string; status: ChipStatus }[] = [
  { key: "active", en: "Active", status: "healthy" },
  { key: "scheduled", en: "Scheduled", status: "info" },
  { key: "completed", en: "Completed", status: "info" },
  { key: "missed", en: "Missed", status: "danger" },
];

/** سقف قراءة الدوريات في `fetchSecOverview` (`limit(200)`) — مرآته هنا كي
 *  لا يُقرأ «٢٠٠» إجماليًّا للسجل كلّه وهو أحدث ٢٠٠ فقط. */
const PATROL_READ_CAP = 200;

function FieldPatrolsCard({ ar, sec }: { ar: boolean; sec: HomeReads["sec"] }) {
  const mode = modeOf(sec, liveOf.sec(sec.data));
  const ref = HOME_REFERENCE.patrols;
  const mapLabel = ar
    ? `خريطة توضيحية لمسارات الدوريات ونقاط التفتيش (${ILLUSTRATIVE_LABEL})`
    : "Illustrative patrol route map (no linked feed)";

  let total: number | null = null;
  let totalLabel = ar ? ref.totalLabelAr : "Total patrols today";
  let change: ReactNode = null;
  let capped = false;
  let split: SplitRow[] = [];

  if (mode === "live") {
    const patrols = sec.data?.patrols ?? [];
    split = PATROL_LIVE.map((s) => ({
      key: s.key,
      label: ar ? (PATROL_STATUS_AR[s.key] ?? s.key) : s.en,
      value: patrols.filter((p) => p.status === s.key).length,
      status: s.status,
    }));
    // حالةٌ خارج الأربع تُعدّ ولا تُطوى في إحداها: الإجمالي يساوي مجموع ما تحته.
    const other = patrols.length - split.reduce((n, s) => n + s.value, 0);
    if (other > 0) {
      split.push({ key: "other", label: ar ? "أخرى" : "Other", value: other, status: "neutral" });
    }
    total = patrols.length;
    capped = patrols.length >= PATROL_READ_CAP;
    // «اليوم» لا يُقال عن سجلٍّ بلا نافذة يوم: الإجمالي إجمالي ما قُرئ.
    totalLabel = ar ? "إجمالي الدوريات" : "Total patrols";
    change = (
      <span className="nx-ops-change" data-absent="">
        <CircleDashed aria-hidden />
        {ar ? CHANGE_NOT_MEASURED_AR : "not measured"}
      </span>
    );
  } else if (mode === "reference") {
    total = ref.total.value;
    split = ref.split.map((s) => ({
      key: s.id,
      label: s.labelAr,
      value: s.value,
      status: s.status,
    }));
    const c = ref.total.change;
    change = (
      <span className="nx-ops-change" dir="ltr">
        {c.dir === "up" ? <ArrowUp aria-hidden /> : <ArrowDown aria-hidden />}
        {`${fmt(c.pct)}%`}
      </span>
    );
  }

  return (
    <OpsCard
      id="nx-home-field-patrols"
      title={ar ? "الدوريات الميدانية" : "Field patrols"}
      to="/sec/patrols"
      ar={ar}
      mode={mode}
      failed={sec.isError}
      onRetry={() => void sec.refetch()}
      caption={ILLUSTRATIVE_LABEL}
    >
      <div className="nx-ops-patrol">
        <PatrolRouteMap label={mapLabel} className="nx-ops-patrol-map" />
        <Link
          to="/sec/patrols"
          className="nx-ops-patrol-expand nx-focus-ring"
          aria-label={ar ? "توسيع خريطة الدوريات — صفحة الدوريات" : "Expand patrol map"}
          title={ar ? "توسيع الخريطة" : "Expand map"}
        >
          <span className="nx-ops-patrol-expand-face">
            <Maximize aria-hidden />
          </span>
        </Link>
        <div className="nx-ops-patrol-aside">
          {mode === "loading" ? (
            <Skeleton rows={2} kind="tile" ar={ar} />
          ) : (
            <>
              <Link to="/sec/patrols" className="nx-ops-patrol-total nx-focus-ring">
                <span className="nx-ops-patrol-label">{totalLabel}</span>
                <span className="nx-ops-patrol-figure">
                  <span className="nx-ops-patrol-value" dir="ltr">
                    {total === null ? CHANGE_NOT_MEASURED_AR : fmt(total)}
                  </span>
                  {change}
                </span>
                {capped && (
                  <span className="nx-ops-patrol-sub">
                    {ar ? `أحدث ${fmt(PATROL_READ_CAP)} سجل` : `Latest ${PATROL_READ_CAP} records`}
                  </span>
                )}
              </Link>
              <Link to="/sec/patrols" className="nx-ops-patrol-split nx-focus-ring">
                {split.length === 0 ? (
                  <span className="nx-ops-patrol-none">
                    {ar ? "لا دوريات مسجّلة." : "No patrols on record."}
                  </span>
                ) : (
                  split.map((s) => {
                    const verdict = VERDICT_AR[s.status];
                    return (
                      // ترتيب الرسم في السطر `rtl`: العدد يمينًا، والكلمة، ثم الشكل يسارًا.
                      <span key={s.key} className="nx-ops-split-row">
                        <span className="nx-ops-split-count" dir="ltr">
                          {fmt(s.value)}
                        </span>
                        <span className="nx-ops-split-label">
                          {verdict && <span className="sr-only">{`${verdict}: `}</span>}
                          {s.label}
                        </span>
                        <StatusGlyph status={s.status} className="nx-ops-dot" />
                      </span>
                    );
                  })
                )}
              </Link>
            </>
          )}
          <Link to="/sec/patrols" className="nx-ops-patrol-cta nx-focus-ring">
            <span className="nx-ops-patrol-cta-face">
              {ar ? "إدارة الدوريات" : "Manage patrols"}
              <UserRoundPlus aria-hidden />
            </span>
          </Link>
        </div>
      </div>
    </OpsCard>
  );
}

/* ── ٤) كاميرات مباشرة — صور توضيحية موسومة (N3) ───────────────────────── */

function CameraTilesCard({ ar, sec }: { ar: boolean; sec: HomeReads["sec"] }) {
  const tiles = HOME_REFERENCE.cameras.tiles;
  const alerts = newestFirst(sec.data?.cctv ?? [], (a) => a.detected_at).slice(0, tiles.length);
  // الوسوم الحيّة من التنبيهات متى وصلت حيّةً بصفوف، وإلا وسوم المرجع موسومة.
  const mode = modeOf(sec, liveOf.sec(sec.data) && alerts.length > 0);
  const siteName = new Map((sec.data?.sites ?? []).map((s) => [s.id, ar ? s.name_ar : s.name_en]));
  const now = sec.dataUpdatedAt;

  return (
    <OpsCard
      id="nx-home-camera-tiles"
      title={ar ? "كاميرات مباشرة" : "Cameras"}
      to="/sec/cctv"
      ar={ar}
      mode={mode}
      failed={sec.isError}
      onRetry={() => void sec.refetch()}
      // في كل حال — تحميلًا وخطأً وحياةً: الصور توضيحية ولا بثّ مرتبط (N3).
      caption={ILLUSTRATIVE_LABEL}
      variant="nx-ops-card-cams"
    >
      {mode === "loading" ? (
        <Skeleton rows={4} kind="tile" ar={ar} />
      ) : (
        <ul className="nx-ops-cams">
          {tiles.map((t, i) => {
            const img = HOME_IMAGES[t.image];
            const a = mode === "live" ? alerts[i] : undefined;
            const typeWord = a
              ? ar
                ? (ALERT_TYPE_AR[a.alert_type] ?? a.alert_type)
                : a.alert_type
              : null;
            const where = a ? (a.site_id && siteName.get(a.site_id)) || a.camera_code : null;
            const label = a ? `${typeWord} · ${where}` : t.labelAr;
            const hint = a
              ? `${label} — ${agoText(a.detected_at, now, ar)} (${ILLUSTRATIVE_LABEL})`
              : `${t.labelAr} (${ILLUSTRATIVE_LABEL})`;
            return (
              <li key={t.id}>
                <Link to="/sec/cctv" className="nx-ops-cam nx-focus-ring" title={hint}>
                  <img
                    src={img.src}
                    width={img.width}
                    height={img.height}
                    alt={img.alt}
                    loading={img.loading}
                    decoding="async"
                    className="nx-ops-cam-img"
                  />
                  <span className="nx-ops-cam-label">
                    <span aria-hidden className="nx-ops-cam-dot" />
                    <span className="nx-ops-cam-name">{label}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </OpsCard>
  );
}

/* ── الصفّ ──────────────────────────────────────────────────────────────── */

export function HomeOpsRow() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  // المفاتيح نفسها التي يقرأ منها صفّ المؤشرات: طلبٌ واحد ورقمٌ واحد.
  const { sec, risk } = useHomeReads();
  return (
    <div dir="ltr" className="nx-home-quad nx-ops-quad">
      <TopRisksCard ar={ar} risk={risk} />
      <ActiveIncidentsCard ar={ar} sec={sec} />
      <FieldPatrolsCard ar={ar} sec={sec} />
      <CameraTilesCard ar={ar} sec={sec} />
    </div>
  );
}
