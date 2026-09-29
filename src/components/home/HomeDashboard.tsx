/**
 * لوحة الرئيسية — المؤشرات والخريطة ولوحات التشغيل (أمر المالك ٢٠٢٦/٠٩/٢٩).
 *
 * «طبّق هذا الشكل على صفحة النظام الرئيسية مع تفعيل جميع الأيقونات». والشكل
 * يُبنى من **قراءاتٍ قائمة لا من أرقامٍ تُكتب له**:
 *
 *   • `getSecOverview`  — البلاغات والدوريات وتنبيهات الكاميرات والأصول
 *     والمواقع (ومنها عدد الحرّاس المسجَّل على كل موقع).
 *   • `getOmsKpis`       — التصاريح النشطة، وهي الرقم نفسه في بطاقة «نشطة»
 *     على `/sec/permits`. (كانت هنا «الجاهزية التنفيذية» فحُذفت: حذف المالك
 *     صندوقها من `/sec/exec` ٢٠٢٦/٠٨/٢٠، ولها تعريفان باسمٍ واحد.)
 *   • `getCommandCenterState` — الامتثال لكل منطقة (بمفتاح الرئيسية نفسه).
 *   • `getRiskBoard`     — عدد المخاطر العالية (بمفتاح الرئيسية نفسه).
 *   • `getIntegrationsOverview` — حالة الأنظمة المرتبطة.
 *
 * **ما ليس له مصدر لا يُرسم:** لا خطّ اتجاه ولا نسبة تغيّر على أي مؤشر —
 * لا سلسلة زمنية مقيسة لها في النظام، ورسمُها اختلاقٌ يُقرأ قياسًا. ولا
 * صورة كاميرا: تنبيهاتها صفوفٌ بلا بثّ مرتبط، فتُعرض بطاقات حالة ويُقال ذلك.
 *
 * **ولا شارة محاكاة على اللوحات** — أمر المالك ٢٠٢٦/٠٨/١١ رفعها من كل
 * شاشة (انظر `sec.index.tsx`)، والإفصاح سطرُ التذييل الباقي بأمره.
 *
 * كل مؤشر ولوحة **رابطٌ إلى شاشته الحيّة** — والوجهات تُقاس في عقدها على
 * شجرة المسارات المولَّدة، فلا أيقونة ميتة.
 */
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronLeft,
  CircleDashed,
  FileCheck2,
  OctagonAlert,
  Route as RouteIcon,
  ShieldAlert,
  Siren,
  UserRound,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useMemo, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { REGIONS, REGION_ACCENT_HEX } from "@/lib/regions";
import { getSecOverview } from "@/lib/sec.functions";
import { getOmsKpis } from "@/lib/oms.functions.reports";
import { getCommandCenterState } from "@/lib/exec/command-center.functions";
import { getRiskBoard } from "@/lib/exec/risk-board.functions";
import { getIntegrationsOverview, type ProviderStatus } from "@/lib/integrations-hub.functions";
import { RegionPulseMap } from "@/components/map/RegionPulseMap";

/* ── القراءات — مفاتيح مشتركة مع شاشاتها فلا طلبان للبيانات نفسها ────── */

function useHomeReads() {
  // البوابة الوحيدة `!authLoading` — لا `enabled: !!user` على قراءة عرض.
  const { user, loading: authLoading } = useAuth();
  const fetchSec = useServerFn(getSecOverview);
  const fetchOms = useServerFn(getOmsKpis);
  const fetchState = useServerFn(getCommandCenterState);
  const fetchRisk = useServerFn(getRiskBoard);
  const fetchIntegrations = useServerFn(getIntegrationsOverview);

  const sec = useQuery({
    queryKey: ["sec-overview", user?.id ?? "anon"],
    queryFn: () => fetchSec(),
    enabled: !authLoading,
    refetchInterval: 30_000,
  });
  const oms = useQuery({
    queryKey: ["home-oms-kpis"],
    queryFn: () => fetchOms(),
    enabled: !authLoading,
    staleTime: 60_000,
  });
  const state = useQuery({
    queryKey: ["blueprint-state"],
    queryFn: () => fetchState(),
    enabled: !authLoading,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
  const risk = useQuery({
    queryKey: ["blueprint-risk-board"],
    queryFn: () => fetchRisk(),
    enabled: !authLoading,
    staleTime: 60_000,
  });
  const integrations = useQuery({
    queryKey: ["home-integrations-overview"],
    queryFn: () => fetchIntegrations(),
    enabled: !authLoading,
    staleTime: 60_000,
  });
  return { sec, oms, state, risk, integrations };
}

/* ── تسميات الحالة — الكلمات نفسها في نوافذ اللوحة التنفيذية
      (`sec-exec-kpis.functions.ts`). النوع غير المعروف يُعرض بنصّه. ──── */

const INCIDENT_STATUS_AR: Record<string, string> = {
  open: "مفتوح",
  investigating: "قيد التحقيق",
  contained: "محتوى",
  resolved: "محلول",
  closed: "مغلق",
};
const PATROL_STATUS_AR: Record<string, string> = {
  scheduled: "مجدولة",
  active: "نشطة",
  completed: "مكتملة",
  missed: "فائتة",
};
const ALERT_TYPE_AR: Record<string, string> = {
  motion: "رصد حركة",
  loitering: "تسكّع",
  intrusion: "تسلل",
  camera_offline: "انقطاع كاميرا",
  tamper: "عبث بالكاميرا",
};
// القيم الثلاث الواردة فعلًا في المصدر (القاعدة والمحاكاة): new · acknowledged · resolved.
const CCTV_STATUS_AR: Record<string, string> = {
  new: "جديد",
  acknowledged: "مُستلَم",
  resolved: "مُعالَج",
};

/**
 * صحّة المزوّد: كلمةٌ وشكل ولون معًا (WCAG 2.2 §1.4.1 وعرف لوحات السلامة):
 * دائرة صحّ = سليم · مثلث = متدهور · مثمّن = عطل · دائرة متقطّعة = لم يُقَس.
 * و«غير مهيّأ» ليس عطلًا ولا سلامة — نظامٌ لم يُربط بعد.
 */
const HEALTH_VIEW: Record<
  ProviderStatus["health"],
  { ar: string; en: string; icon: LucideIcon; tone: string }
> = {
  healthy: { ar: "سليم", en: "Healthy", icon: CheckCircle2, tone: "--tone-emerald" },
  degraded: { ar: "متدهور", en: "Degraded", icon: AlertTriangle, tone: "--tone-amber" },
  error: { ar: "عطل", en: "Error", icon: OctagonAlert, tone: "--tone-rose" },
  unknown: { ar: "لم يُقَس", en: "Not measured", icon: CircleDashed, tone: "--ink-3" },
  not_configured: { ar: "غير مهيّأ", en: "Not set up", icon: CircleDashed, tone: "--ink-3" },
};
const HEALTH_ORDER: ProviderStatus["health"][] = [
  "healthy",
  "degraded",
  "error",
  "unknown",
  "not_configured",
];

const fmtNum = (n: number, ar: boolean) => n.toLocaleString(ar ? "ar-SA" : "en-US");
const fmtTime = (iso: string | null, ar: boolean) =>
  iso
    ? new Date(iso).toLocaleString(ar ? "ar-SA" : "en-US", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

/* ── المؤشرات ─────────────────────────────────────────────────────────── */

interface Kpi {
  readonly id: string;
  readonly ar: string;
  readonly en: string;
  /** `null` = لم يصل أو لم يُقَس — يُقرأ نصًّا لا صفرًا (المادة ٢٧). */
  readonly value: number | null;
  readonly unit?: "%";
  readonly icon: LucideIcon;
  readonly to: string;
  /** مصدر الرقم بالكلمات — يُقرأ في `title` لمن يسأل «من أين هذا؟». */
  readonly sourceAr: string;
  /**
   * حال القراءة — ثلاثٌ لا تُدمج في «لم يُقَس»: التحميل انتظار، والخطأ
   * تعذّر وصول، و«لم يُقَس» قراءةٌ وصلت بلا قياس (المادتان ١٤ و٢٧).
   */
  readonly status: ReadStatus;
}

type ReadStatus = "loading" | "error" | "ready";
const statusOf = (q: { isPending: boolean; isError: boolean }): ReadStatus =>
  q.isError ? "error" : q.isPending ? "loading" : "ready";

export function HomeKpiRow() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { sec, oms, risk } = useHomeReads();
  const counts = sec.data?.counts;
  const sites = sec.data?.sites;

  const kpis: Kpi[] = [
    // «الجاهزية التنفيذية» ليست هنا: حذف المالك صندوقها من `/sec/exec`
    // (٢٠٢٦/٠٨/٢٠)، ولها تعريفان مختلفان باسمٍ واحد في النظام. وحلّ محلّها
    // عدٌّ تعرضه وجهته بالرقم نفسه — بطاقة «نشطة» في `/sec/permits`.
    {
      id: "permits",
      ar: "التصاريح النشطة",
      en: "Active permits",
      value: oms.data ? oms.data.permits.active : null,
      icon: FileCheck2,
      to: "/sec/permits",
      sourceAr: "تصاريح معتمدة أو نشطة لم تنتهِ مدّتها",
      status: statusOf(oms),
    },
    {
      id: "incidents",
      ar: "البلاغات المفتوحة",
      en: "Open incidents",
      value: counts ? counts.incidents_open : null,
      icon: Siren,
      to: "/sec/incidents",
      sourceAr: "بلاغات حالتها غير مغلقة",
      status: statusOf(sec),
    },
    {
      id: "risks",
      ar: "مخاطر عالية",
      en: "High risks",
      value: risk.data ? risk.data.rows.filter((r) => r.severity === "high").length : null,
      icon: ShieldAlert,
      to: "/sec/risks",
      sourceAr: "مخاطر السجل بشدّة عالية",
      status: statusOf(risk),
    },
    {
      id: "patrols",
      ar: "الدوريات النشطة",
      en: "Active patrols",
      value: counts ? counts.patrols_active : null,
      icon: RouteIcon,
      to: "/sec/patrols",
      sourceAr: "دوريات حالتها نشطة",
      status: statusOf(sec),
    },
    {
      id: "cctv",
      ar: "تنبيهات كاميرات جديدة",
      en: "New camera alerts",
      value: counts ? counts.cctv_new : null,
      icon: Camera,
      to: "/sec/cctv",
      sourceAr: "تنبيهات كاميرات لم تُستلم بعد",
      status: statusOf(sec),
    },
    {
      id: "guards",
      // الاسم يقول ما يُعدّ: الحرّاس المسجَّلون على المواقع — لا «على رأس
      // العمل»، فلا مصدر للحضور الفعلي في النظام.
      ar: "حرّاس المواقع",
      en: "Site guards",
      value: sites && sites.length ? sites.reduce((s, x) => s + x.guards_count, 0) : null,
      icon: UserRound,
      to: "/sec/facilities",
      sourceAr: "مجموع الحرّاس المسجَّلين على المواقع",
      status: statusOf(sec),
    },
    {
      id: "assets",
      ar: "أصول خارج الخدمة",
      en: "Assets offline",
      value: counts ? counts.assets_offline : null,
      icon: Wrench,
      to: "/sec/maintenance",
      sourceAr: "أصول حالتها غير متصلة أو متدهورة",
      status: statusOf(sec),
    },
  ];

  return (
    <section aria-labelledby="nx-home-kpis-heading" className="nx-bp-stage mt-6">
      <h2 id="nx-home-kpis-heading" className="sr-only">
        {ar ? "المؤشرات الرئيسية" : "Key indicators"}
      </h2>
      <ul className="nx-home-kpis grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
        {kpis.map((k) => {
          const Icon = k.icon;
          const label = ar ? k.ar : k.en;
          const shown =
            k.status === "loading"
              ? ar
                ? "جارٍ التحميل"
                : "Loading"
              : k.status === "error"
                ? ar
                  ? "تعذّر التحميل"
                  : "Unavailable"
                : k.value === null
                  ? ar
                    ? "لم يُقَس"
                    : "not measured"
                  : `${fmtNum(Math.round(k.value), ar)}${k.unit ?? ""}`;
          return (
            <li key={k.id}>
              <Link
                to={k.to}
                title={ar ? `${label} — ${k.sourceAr}` : label}
                aria-label={`${label}: ${shown}`}
                aria-busy={k.status === "loading" || undefined}
                data-status={k.status}
                className="nx-home-kpi flex h-full min-h-24 flex-col justify-between gap-2 rounded-2xl border border-[color:var(--hairline)] bg-[color:var(--surface)] p-3 transition-colors hover:border-[color:var(--tone-blue)]"
              >
                {/* الأيقونة والرقم في صفّ، والتسمية تحتهما بعرض البطاقة كاملًا —
                    سبع بطاقات في عمود المحتوى على 1280 تضيّق الصفّ الواحد حتى
                    تنكسر التسمية على ثلاثة أسطر (رُئي بلقطة). */}
                <span className="flex items-center justify-between gap-2">
                  <span
                    aria-hidden
                    className="grid size-8 shrink-0 place-items-center rounded-lg bg-[color:var(--chip-strong)] text-[color:var(--tone-blue)]"
                  >
                    <Icon className="size-4" />
                  </span>
                  {k.status === "loading" ? (
                    // هيكلٌ لا نصّ: الانتظار يُرى شكلًا ولا يُقرأ حكمًا.
                    <span aria-hidden className="nx-home-skeleton h-7 w-12 rounded-md" />
                  ) : (
                    <span
                      className={
                        k.status === "ready" && k.value !== null
                          ? "text-2xl font-black tabular-nums text-[color:var(--ink)]"
                          : "text-[13px] font-semibold text-[color:var(--ink-3)]"
                      }
                    >
                      {shown}
                    </span>
                  )}
                </span>
                <span className="text-[12px] font-bold leading-snug text-[color:var(--ink-2)]">
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ── لوحات التشغيل ────────────────────────────────────────────────────── */

function Panel({
  id,
  title,
  to,
  moreAr,
  moreEn,
  ar,
  children,
  note,
}: {
  id: string;
  title: string;
  to: string;
  moreAr: string;
  moreEn: string;
  ar: boolean;
  children: ReactNode;
  note?: string;
}) {
  return (
    <section
      aria-labelledby={id}
      className="nx-home-panel flex min-w-0 flex-col rounded-2xl border border-[color:var(--hairline)] bg-[color:var(--surface)] p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id={id} className="nx-bp-h2">
          {title}
        </h2>
        <Link
          to={to}
          className="nx-home-more inline-flex min-h-11 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-2 text-[12px] font-bold text-[color:var(--tone-blue)] hover:bg-[color:var(--chip-strong)]"
        >
          {ar ? moreAr : moreEn}
          <ChevronLeft aria-hidden className={`size-4 ${ar ? "" : "rotate-180"}`} />
        </Link>
      </div>
      {note && <p className="mt-1 text-[12px] text-[color:var(--ink-3)]">{note}</p>}
      <div className="mt-3 min-w-0 flex-1">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="nx-dash-empty text-[13px] text-[color:var(--ink-3)]">{children}</p>;
}

function Loading({ ar }: { ar: boolean }) {
  return (
    <div aria-busy="true" className="grid gap-2">
      <span className="sr-only">{ar ? "جارٍ التحميل" : "Loading"}</span>
      {[0, 1, 2].map((i) => (
        <span key={i} aria-hidden className="nx-home-skeleton h-12 rounded-xl" />
      ))}
    </div>
  );
}

/** تعذّر الوصول ليس فراغًا: يُقال بالعربية ومعه إعادة المحاولة (المادة ١٤). */
function ErrorState({ ar, onRetry }: { ar: boolean; onRetry: () => void }) {
  return (
    <div role="alert" className="nx-home-error flex flex-wrap items-center gap-2 text-[13px]">
      <span className="text-[color:var(--ink-2)]">
        {ar ? "تعذّر تحميل هذه اللوحة الآن." : "This panel could not load right now."}
      </span>
      <button
        type="button"
        onClick={onRetry}
        className="nx-home-retry inline-flex min-h-11 items-center rounded-lg border border-[color:var(--hairline)] px-3 font-bold text-[color:var(--ink)] hover:bg-[color:var(--chip-strong)]"
      >
        {ar ? "أعد المحاولة" : "Retry"}
      </button>
    </div>
  );
}

/**
 * الحالات الثلاث بترتيبها: الخطأ أولًا (فلا يُقرأ فراغًا)، ثم التحميل، ثم
 * الفراغ — وهذا وحده حين تصل قراءةٌ بلا صفوف.
 */
function PanelBody({
  q,
  ar,
  empty,
  isEmpty,
  children,
}: {
  q: { isPending: boolean; isError: boolean; refetch: () => unknown };
  ar: boolean;
  empty: string;
  isEmpty: boolean;
  children: ReactNode;
}) {
  if (q.isError) return <ErrorState ar={ar} onRetry={() => void q.refetch()} />;
  if (q.isPending) return <Loading ar={ar} />;
  if (isEmpty) return <Empty>{empty}</Empty>;
  return <>{children}</>;
}

/** حلقة توزيع — SVG خالص بلا مكتبة رسوم: الشرائح أطوال أقواس مقيسة. */
function Donut({
  slices,
  total,
  centerAr,
  centerEn,
  ar,
}: {
  slices: { key: string; value: number; tone: string }[];
  total: number;
  centerAr: string;
  centerEn: string;
  ar: boolean;
}) {
  const r = 42;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox="0 0 120 120" className="size-28 shrink-0" aria-hidden>
      <circle cx="60" cy="60" r={r} fill="none" strokeWidth="14" className="nx-home-donut-track" />
      {total > 0 &&
        slices.map((s) => {
          const len = (s.value / total) * c;
          const el = (
            <circle
              key={s.key}
              cx="60"
              cy="60"
              r={r}
              fill="none"
              strokeWidth="14"
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 60 60)"
              className="nx-home-donut-slice"
              style={{ ["--slice-tone" as string]: `var(${s.tone})` }}
            />
          );
          offset += len;
          return el;
        })}
      <text x="60" y="58" textAnchor="middle" className="nx-home-donut-value" fill="currentColor">
        {fmtNum(total, ar)}
      </text>
      <text x="60" y="76" textAnchor="middle" className="nx-home-donut-caption" fill="currentColor">
        {ar ? centerAr : centerEn}
      </text>
    </svg>
  );
}

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
        // لا مقياس صحّةٍ للموقع في المصدر — `null` لا «سليم» (المادة ٢٧).
        health: null,
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

  const providers = integrations.data?.providers ?? [];
  const healthSlices = HEALTH_ORDER.map((h) => ({
    key: h,
    value: providers.filter((p) => p.health === h).length,
    tone: HEALTH_VIEW[h].tone,
  })).filter((s) => s.value > 0);

  return (
    <>
      {/* ── الخريطة + حالة الأنظمة ───────────────────────────────────── */}
      <div className="nx-home-row mt-8 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0">
          <RegionPulseMap
            sites={mapSites}
            loading={sec.isPending}
            error={sec.isError ? (ar ? "تعذّر تحميل المواقع" : "Sites unavailable") : null}
            ar={ar}
          />
        </div>

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
