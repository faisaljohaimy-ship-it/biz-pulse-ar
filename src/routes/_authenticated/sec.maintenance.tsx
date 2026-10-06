/**
 * الصيانة — أوامر عمل الصيانة التصحيحية (أمر المالك ٢٠٢٦/١٠/٠٦).
 *
 * المصدر: «سجل الصيانة التصحيحية» الحقيقي (١٧٩٥ طلبًا منذ ٢٠٢٥/٠٤) مستوردًا إلى
 * `maint_orders` خلف الدخول، وما يُنشأ من هنا. الزائر يرى محاكاة مرجعية موسومة.
 *
 * التصميم لمشرف صيانة في الميدان، من الجوال أولًا:
 *  ١. مؤشرات ستّة تُقرأ في ثانية (النشط · المتأخر · متوسط الإنجاز · نسبة الإنجاز ·
 *     الالتزام بالموعد · الغرامات) — وكل نسبةٍ بلا مقام «لم يُقَس» (المادة ٢٧).
 *  ٢. «يحتاج انتباهك»: ما لا يتحرّك وحده (بلا فني · بلا رقم SAP · أسباب الإيقاف)
 *     — كلٌّ منها نقرةٌ تفلتر القائمة.
 *  ٣. تبويبات: النشطة (الأقدم تأخّرًا أولًا) · السجل · التحليلات · من البلاغات.
 *  ٤. البطاقة تفتح درجًا فيه المراحل الثماني والإجراء التالي بزرٍّ واحد.
 */
import { lazy, Suspense, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Banknote,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  FileWarning,
  Gauge,
  OctagonAlert,
  Search,
  Timer,
  UserRoundX,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { SecPageHeader } from "@/components/sec/sec-shell";
import { useAuth } from "@/lib/auth-context";
import {
  getMaintStaffDirectory,
  getMaintSummary,
  listMaintOrders,
  type MaintListInput,
} from "@/lib/maint.functions";
import {
  CITY_AR,
  SYSTEM_AR,
  STATUS_AR,
  type OrderStatus,
  type SystemCode,
} from "@/lib/maintenance/cm-log-rules";
import type { MaintOrder, MaintSummary } from "@/lib/maintenance/maint-types";
import { MaintOrderCard } from "@/components/sec/maint/MaintOrderCard";
import { MaintOrderSheet } from "@/components/sec/maint/MaintOrderSheet";
import { NewMaintOrderDialog } from "@/components/sec/maint/NewMaintOrderDialog";
import {
  OverdueBadge,
  SYSTEM_ICON,
  SourceBadge,
  StatusChip,
  cityAr,
  fmt,
  fmt1,
  fmtDate,
  fmtSar,
  fmtSarCompact,
  holdAr,
} from "@/components/sec/maint/maint-ui";
import { cn } from "@/lib/utils";

const MaintAnalytics = lazy(() => import("@/components/sec/maint/MaintAnalytics"));
const IncidentWorkOrdersTab = lazy(() => import("@/components/sec/maint/IncidentWorkOrdersTab"));

export const Route = createFileRoute("/_authenticated/sec/maintenance")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: Maintenance,
});

type Tab = "active" | "history" | "analytics" | "incidents";
const TABS: Array<[Tab, string]> = [
  ["active", "النشطة"],
  ["history", "السجل"],
  ["analytics", "التحليلات"],
  ["incidents", "من البلاغات"],
];
const PAGE_SIZE: Record<"active" | "history", number> = { active: 24, history: 30 };
const CONTROL =
  "nx-focus-ring h-11 rounded-lg border border-[color:var(--hairline)] bg-[color:var(--surface)] px-3 text-sm text-[color:var(--ink)]";

interface Filters {
  q: string;
  system: SystemCode | "";
  city: string;
  status: OrderStatus | "";
  holdReason: string;
  mine: boolean;
  unassigned: boolean;
}
const NO_FILTERS: Filters = {
  q: "",
  system: "",
  city: "",
  status: "",
  holdReason: "",
  mine: false,
  unassigned: false,
};

function Kpi({
  icon: Icon,
  tone,
  label,
  value,
  hint,
  loading,
  badge,
}: {
  icon: LucideIcon;
  tone: string;
  label: string;
  value: string;
  hint?: string;
  loading: boolean;
  badge?: string;
}) {
  return (
    <li className="nx-home-kpi flex min-h-28 min-w-0 flex-col gap-2 rounded-2xl border border-[color:var(--hairline)] bg-[color:var(--surface)] p-3">
      <span className="flex items-start justify-between gap-2">
        <span
          aria-hidden
          className="nx-home-kpi-icon grid size-10 shrink-0 place-items-center rounded-xl"
          style={{ ["--kpi-tone" as string]: `var(${tone})` }}
        >
          <Icon className="size-5" />
        </span>
        {badge && (
          <span className="rounded-full border border-red-500/50 bg-red-500/10 px-1.5 text-[11px] font-bold text-red-700 dark:text-red-300">
            {badge}
          </span>
        )}
      </span>
      {/* الرقم في صفّه بعرض البطاقة كاملًا ويلتفّ داخلها — كان بجانب الأيقونة
          بلا التفاف فخرج مبلغ الغرامة عن حدّ البطاقة ١١–١٨px (قاسه حارس الجودة). */}
      {loading ? (
        <span aria-hidden className="nx-home-skeleton h-7 w-16 rounded-md" />
      ) : (
        <span
          className={cn(
            "min-w-0 font-black leading-tight tabular-nums [overflow-wrap:anywhere] text-[color:var(--ink)]",
            value.length > 9 ? "text-lg" : "text-2xl",
          )}
        >
          {value}
        </span>
      )}
      <span className="mt-auto grid min-w-0 gap-0.5">
        <span className="text-[13px] font-bold text-[color:var(--ink)]">{label}</span>
        {hint && <span className="text-[12px] text-[color:var(--ink-3)]">{hint}</span>}
      </span>
    </li>
  );
}

function KpiStrip({ s, loading }: { s: MaintSummary | undefined; loading: boolean }) {
  const k = s?.kpis;
  const pct = (v: number | null | undefined) =>
    v === null || v === undefined ? "لم يُقَس" : `${fmt1(v)}٪`;
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      <Kpi
        icon={Wrench}
        tone="--tone-blue"
        label="أوامر نشطة"
        value={fmt(k ? k.open + k.on_hold : null)}
        hint={k ? `مفتوح ${fmt(k.open)} · موقوف ${fmt(k.on_hold)}` : undefined}
        loading={loading}
      />
      <Kpi
        icon={OctagonAlert}
        tone="--tone-rose"
        label="تجاوزت موعدها"
        value={fmt(k?.overdue)}
        badge={k && k.overdue > 0 ? "خطر" : undefined}
        hint="من النشطة، حسب تاريخ الإنجاز المتفق عليه"
        loading={loading}
      />
      <Kpi
        icon={Gauge}
        tone="--tone-cyan"
        label="متوسط إنجاز النشطة"
        value={
          k?.avg_progress_active === null || k?.avg_progress_active === undefined
            ? "لم يُقَس"
            : `${fmt(k.avg_progress_active)}٪`
        }
        hint="من مرحلة كل أمر في دورة الصيانة"
        loading={loading}
      />
      <Kpi
        icon={CircleCheck}
        tone="--tone-emerald"
        label="نسبة الإنجاز"
        value={pct(k?.completion_rate)}
        hint={k ? `${fmt(k.completed)} من ${fmt(k.total - k.cancelled)} (بلا الملغى)` : undefined}
        loading={loading}
      />
      <Kpi
        icon={Timer}
        tone="--tone-violet"
        label="الإنجاز في الموعد"
        value={pct(k?.on_time_rate)}
        hint={
          k?.avg_delay_late
            ? `المتأخر منها: ${fmt1(k.avg_delay_late)} يومًا في المتوسط`
            : k
              ? `من ${fmt(k.on_time_basis)} أمرًا مُنجزًا`
              : undefined
        }
        loading={loading}
      />
      <Kpi
        icon={Banknote}
        tone="--tone-amber"
        label="غرامات التأخير"
        // المادة ٢٧: المجموع `null` = لا قيمة مسجّلة أصلًا ⇐ «لم يُقَس»؛ والصفر وحده «لا غرامات».
        value={
          k?.penalties === null || k?.penalties === undefined
            ? "لم يُقَس"
            : k.penalties === 0
              ? "لا غرامات"
              : fmtSarCompact(k.penalties)
        }
        hint={
          k?.maintenance_cost ? `تكلفة المنجز: ${fmtSarCompact(k.maintenance_cost)}` : undefined
        }
        loading={loading}
      />
    </ul>
  );
}

/** فشل الملخّص — رسالة عربية وزرّ إعادة، لا هيكل تحميلٍ أبدي (المادة ١٤). */
function SummaryError({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-2 rounded-2xl border border-[color:var(--hairline)] bg-[color:var(--surface)] p-4 text-[13px] text-[color:var(--ink)]"
    >
      تعذّر تحميل مؤشرات الصيانة الآن.
      <button
        type="button"
        onClick={onRetry}
        className="nx-home-retry inline-flex min-h-11 items-center rounded-lg border border-[color:var(--hairline)] px-3 font-bold"
      >
        أعد المحاولة
      </button>
    </div>
  );
}

function Attention({
  s,
  onPick,
}: {
  s: MaintSummary;
  onPick: (f: Partial<Filters>, tab: Tab) => void;
}) {
  const k = s.kpis;
  const holds = s.analytics.by_hold_reason.slice(0, 4);
  if (!k.unassigned_active && !k.sap_pending && holds.length === 0) return null;
  const chip =
    "nx-focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3 text-[13px] font-bold";
  return (
    <section
      aria-label="يحتاج انتباهك"
      className="rounded-2xl border border-[color:var(--hairline)] bg-[color:var(--surface)] p-3"
    >
      <h2 className="mb-2 text-[13px] font-black text-[color:var(--ink)]">يحتاج انتباهك</h2>
      <div className="flex flex-wrap gap-2">
        {k.unassigned_active > 0 && (
          <button
            type="button"
            onClick={() => onPick({ unassigned: true }, "active")}
            className={cn(chip, "border-[color:var(--hairline)] text-[color:var(--ink)]")}
          >
            <UserRoundX aria-hidden className="size-4 text-[color:var(--tone-rose)]" />
            {fmt(k.unassigned_active)} أمرًا نشطًا بلا فني مُسنَد
          </button>
        )}
        {k.sap_pending > 0 && (
          <span
            className={cn(
              chip,
              "border-amber-500/50 bg-amber-500/10 text-amber-800 dark:text-amber-200",
            )}
          >
            <FileWarning aria-hidden className="size-4" />
            {fmt(k.sap_pending)} أمرًا مُنجزًا بلا رقم SAP — مخاطرة فوترة
          </span>
        )}
        {holds.map((h) => (
          <button
            key={h.key ?? "none"}
            type="button"
            onClick={() => onPick({ holdReason: h.key ?? "unclassified" }, "active")}
            className={cn(chip, "border-[color:var(--hairline)] text-[color:var(--ink)]")}
          >
            {holdAr(h.key)}
            <span className="rounded-md bg-[color:var(--chip-strong)] px-1.5 tabular-nums">
              {fmt(h.n)}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function FilterBar({
  f,
  set,
  tab,
  signedIn,
}: {
  f: Filters;
  set: (p: Partial<Filters>) => void;
  tab: "active" | "history";
  signedIn: boolean;
}) {
  const dirty = JSON.stringify(f) !== JSON.stringify(NO_FILTERS);
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <label className="relative min-w-0 flex-1 basis-56">
          <span className="sr-only">ابحث</span>
          <Search
            aria-hidden
            className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-[color:var(--ink-3)]"
          />
          <input
            type="search"
            value={f.q}
            onChange={(e) => set({ q: e.target.value })}
            placeholder="ابحث برقم الأمر أو الموقع أو المكوّن"
            className={cn(CONTROL, "w-full ps-9")}
          />
        </label>
        <select
          aria-label="المدينة"
          value={f.city}
          onChange={(e) => set({ city: e.target.value })}
          className={CONTROL}
        >
          <option value="">كل المدن</option>
          {Object.entries(CITY_AR).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        {tab === "history" && (
          <select
            aria-label="الحالة"
            value={f.status}
            onChange={(e) => set({ status: e.target.value as OrderStatus | "" })}
            className={CONTROL}
          >
            <option value="">كل الحالات</option>
            {(Object.keys(STATUS_AR) as OrderStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_AR[s]}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {(["", ...Object.keys(SYSTEM_AR)] as Array<SystemCode | "">).map((s) => {
          const Icon = s ? SYSTEM_ICON[s] : null;
          return (
            <button
              key={s || "all"}
              type="button"
              aria-pressed={f.system === s}
              onClick={() => set({ system: s })}
              className={cn(
                "nx-focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-[13px] font-bold",
                f.system === s
                  ? "border-[color:var(--tone-blue)] bg-[color:var(--tone-blue)] text-[color:var(--surface)]"
                  : "border-[color:var(--hairline)] text-[color:var(--ink)]",
              )}
            >
              {Icon && <Icon aria-hidden className="size-4" />}
              {s ? SYSTEM_AR[s] : "كل الأنظمة"}
            </button>
          );
        })}
        {signedIn && (
          <button
            type="button"
            aria-pressed={f.mine}
            onClick={() => set({ mine: !f.mine })}
            className={cn(
              "nx-focus-ring inline-flex min-h-11 items-center rounded-full border px-3 text-[13px] font-bold",
              f.mine
                ? "border-[color:var(--tone-blue)] bg-[color:var(--tone-blue)] text-[color:var(--surface)]"
                : "border-[color:var(--hairline)] text-[color:var(--ink)]",
            )}
          >
            أوامري
          </button>
        )}
        {f.unassigned && (
          <button
            type="button"
            onClick={() => set({ unassigned: false })}
            className="nx-focus-ring inline-flex min-h-11 items-center gap-1 rounded-full border border-[color:var(--hairline)] px-3 text-[13px] font-bold text-[color:var(--ink)]"
          >
            بلا فني مُسنَد <X aria-label="إزالة" className="size-4" />
          </button>
        )}
        {f.holdReason && (
          <button
            type="button"
            onClick={() => set({ holdReason: "" })}
            className="nx-focus-ring inline-flex min-h-11 items-center gap-1 rounded-full border border-amber-500/50 bg-amber-500/10 px-3 text-[13px] font-bold text-amber-800 dark:text-amber-200"
          >
            {holdAr(f.holdReason)} <X aria-label="إزالة" className="size-4" />
          </button>
        )}
        {dirty && (
          <button
            type="button"
            onClick={() => set(NO_FILTERS)}
            className="nx-focus-ring min-h-11 px-2 text-[13px] font-semibold text-[color:var(--tone-blue)] underline-offset-4 hover:underline"
          >
            مسح الفلاتر
          </button>
        )}
      </div>
    </div>
  );
}

function HistoryRow({ o, onOpen }: { o: MaintOrder; onOpen: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="nx-focus-ring grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1 rounded-xl border border-[color:var(--hairline-soft)] bg-[color:var(--surface)] p-3 text-start hover:border-[color:var(--tone-blue)] sm:grid-cols-[6.5rem_minmax(0,1fr)_auto_auto]"
      >
        <span className="text-[12px] text-[color:var(--ink-3)]">
          <bdi className="block font-mono">{o.ref}</bdi>
          {fmtDate(o.requested_at)}
        </span>
        <span className="min-w-0">
          <bdi className="block truncate text-[14px] font-bold text-[color:var(--ink)]">
            {o.component ?? "—"}
          </bdi>
          <bdi className="block truncate text-[12px] text-[color:var(--ink-2)]">
            {o.site ?? "—"} · {cityAr(o.city)}
          </bdi>
        </span>
        <span className="col-span-2 flex flex-wrap items-center gap-1.5 sm:col-span-1">
          <StatusChip status={o.status} holdReason={o.hold_reason} />
          <OverdueBadge days={o.overdue_days} />
          {o.delay_days !== null && o.delay_days > 0 && (
            <span className="text-[12px] font-semibold text-[color:var(--ink-2)]">
              تأخير {fmt(o.delay_days)} يومًا
            </span>
          )}
        </span>
        <span className="col-span-2 text-[13px] font-bold tabular-nums text-[color:var(--ink)] sm:col-span-1 sm:text-end">
          {fmtSar(o.maintenance_cost)}
        </span>
      </button>
    </li>
  );
}

function Pager({
  page,
  total,
  size,
  onPage,
}: {
  page: number;
  total: number;
  size: number;
  onPage: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / size));
  if (pages <= 1) return null;
  return (
    <nav aria-label="الصفحات" className="flex items-center justify-center gap-2">
      <button
        type="button"
        disabled={page === 0}
        onClick={() => onPage(page - 1)}
        className={cn(CONTROL, "inline-flex items-center gap-1 disabled:opacity-40")}
      >
        <ChevronRight aria-hidden className="size-4" /> السابق
      </button>
      <span className="text-[13px] tabular-nums text-[color:var(--ink-2)]">
        صفحة {fmt(page + 1)} من {fmt(pages)}
      </span>
      <button
        type="button"
        disabled={page >= pages - 1}
        onClick={() => onPage(page + 1)}
        className={cn(CONTROL, "inline-flex items-center gap-1 disabled:opacity-40")}
      >
        التالي <ChevronLeft aria-hidden className="size-4" />
      </button>
    </nav>
  );
}

function Maintenance() {
  const { user, loading: authLoading } = useAuth();
  const uid = user?.id ?? null;
  const fetchSummary = useServerFn(getMaintSummary);
  const fetchList = useServerFn(listMaintOrders);
  const fetchStaff = useServerFn(getMaintStaffDirectory);

  const [tab, setTab] = useState<Tab>("active");
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<MaintOrder | null>(null);
  const setF = (p: Partial<Filters>) => {
    setFilters((f) => ({ ...f, ...p }));
    setPage(0);
  };

  const summary = useQuery({
    queryKey: ["maint", "summary", uid],
    queryFn: () => fetchSummary(),
    enabled: !authLoading,
    refetchInterval: 60_000,
  });
  const staff = useQuery({
    queryKey: ["maint", "staff", uid],
    queryFn: () => fetchStaff(),
    enabled: !authLoading,
    staleTime: 5 * 60_000,
  });

  const listTab = tab === "history" ? "history" : "active";
  const input: MaintListInput = useMemo(
    () => ({
      tab: listTab,
      q: filters.q || undefined,
      system: filters.system || undefined,
      city: filters.city || undefined,
      status: listTab === "history" ? filters.status || undefined : undefined,
      holdReason: filters.holdReason || undefined,
      mine: filters.mine || undefined,
      unassigned: filters.unassigned || undefined,
      page,
      pageSize: PAGE_SIZE[listTab],
    }),
    [listTab, filters, page],
  );
  const list = useQuery({
    queryKey: ["maint", "list", uid, input],
    queryFn: () => fetchList({ data: input }),
    enabled: !authLoading && (tab === "active" || tab === "history"),
    placeholderData: keepPreviousData,
  });

  const s = summary.data;
  // المادة ٦: شارة «بيانات حقيقية» لا تعلو محاكاةً — يكفي أن يكون أحد المصدرين
  // (الملخّص أو القائمة) مرجعيًّا لتُوسم الصفحة كلّها مرجعية (نقض حارس الجودة).
  const sources = [
    s?.source,
    tab === "active" || tab === "history" ? list.data?.source : undefined,
  ];
  const source = sources.includes("reference")
    ? "reference"
    : sources.includes("database")
      ? "database"
      : undefined;
  const rows = list.data?.rows ?? [];
  const activeCount = s ? s.kpis.open + s.kpis.on_hold : null;

  return (
    <div className="space-y-4">
      <SecPageHeader
        title="الصيانة"
        subtitle={
          s
            ? `أوامر العمل التصحيحية — ${fmt(s.kpis.total)} طلبًا من ${fmtDate(s.kpis.first_request)} إلى ${fmtDate(s.kpis.last_request)}`
            : "أوامر العمل التصحيحية لأنظمة الأمن: الكاميرات والبوابات والتحكم في الدخول"
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          {source && <SourceBadge source={source} />}
          <NewMaintOrderDialog />
        </div>
      </SecPageHeader>

      {source === "reference" && (
        <p
          role="note"
          className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-[13px] text-amber-900 dark:text-amber-100"
        >
          {user
            ? "تعذّر الوصول إلى سجل الصيانة الآن — المعروض محاكاة مرجعية موسومة، وتعود البيانات الحقيقية تلقائيًّا."
            : "المعروض محاكاة مرجعية للعرض. سجلّ الصيانة الحقيقي يظهر بعد تسجيل الدخول."}
        </p>
      )}

      {summary.isError && !s ? (
        <SummaryError onRetry={() => summary.refetch()} />
      ) : (
        <KpiStrip s={s} loading={!s} />
      )}
      {s && (
        <Attention
          s={s}
          onPick={(p, t) => {
            setTab(t);
            setF({ ...NO_FILTERS, ...p });
          }}
        />
      )}

      <div
        role="tablist"
        aria-label="أقسام الصيانة"
        className="flex gap-1 overflow-x-auto rounded-2xl border border-[color:var(--hairline)] bg-[color:var(--surface)] p-1"
      >
        {TABS.map(([t, label]) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => {
              setTab(t);
              setPage(0);
            }}
            className={cn(
              "nx-focus-ring min-h-11 flex-1 whitespace-nowrap rounded-xl px-3 text-[14px] font-bold",
              tab === t
                ? "bg-[color:var(--tone-blue)] text-[color:var(--surface)]"
                : "text-[color:var(--ink-2)] hover:bg-[color:var(--chip-strong)]",
            )}
          >
            {label}
            {t === "active" && activeCount !== null && (
              <span className="ms-1.5 tabular-nums opacity-90">({fmt(activeCount)})</span>
            )}
          </button>
        ))}
      </div>

      {(tab === "active" || tab === "history") && (
        <div role="tabpanel" className="space-y-3">
          <FilterBar f={filters} set={setF} tab={listTab} signedIn={!!user} />

          {list.isError ? (
            <div
              role="alert"
              className="flex flex-wrap items-center gap-2 rounded-xl border border-[color:var(--hairline)] p-4 text-[13px]"
            >
              تعذّر تحميل الأوامر الآن.
              <button
                type="button"
                onClick={() => list.refetch()}
                className="nx-home-retry inline-flex min-h-11 items-center rounded-lg border border-[color:var(--hairline)] px-3 font-bold"
              >
                أعد المحاولة
              </button>
            </div>
          ) : !list.data ? (
            <div aria-busy className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <span key={i} aria-hidden className="nx-home-skeleton h-52 rounded-2xl" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[color:var(--hairline)] p-8 text-center text-[14px] text-[color:var(--ink-2)]">
              {JSON.stringify(filters) !== JSON.stringify(NO_FILTERS)
                ? "لا أوامر تطابق هذه الفلاتر."
                : tab === "active"
                  ? "لا أوامر نشطة — كل الطلبات مُنجزة أو ملغاة."
                  : "لا أوامر في السجل بعد."}
            </div>
          ) : (
            <>
              <p className="text-[12px] text-[color:var(--ink-3)]" aria-live="polite">
                {fmt(list.data.total)} أمرًا
                {tab === "active" ? " — الأطول تأخّرًا أولًا" : " — الأحدث أولًا"}
              </p>
              {tab === "active" ? (
                <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {rows.map((o) => (
                    <li key={o.id} className="min-w-0">
                      <MaintOrderCard order={o} onOpen={() => setSelected(o)} />
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="grid gap-2">
                  {rows.map((o) => (
                    <HistoryRow key={o.id} o={o} onOpen={() => setSelected(o)} />
                  ))}
                </ul>
              )}
              <Pager
                page={page}
                total={list.data.total}
                size={PAGE_SIZE[listTab]}
                onPage={setPage}
              />
            </>
          )}
        </div>
      )}

      {tab === "analytics" && (
        <div role="tabpanel">
          <Suspense
            fallback={<span aria-hidden className="nx-home-skeleton block h-96 rounded-2xl" />}
          >
            {s ? (
              <MaintAnalytics data={s.analytics} />
            ) : summary.isError ? (
              <SummaryError onRetry={() => summary.refetch()} />
            ) : (
              <span aria-hidden className="nx-home-skeleton block h-96 rounded-2xl" />
            )}
          </Suspense>
        </div>
      )}

      {tab === "incidents" && (
        <div role="tabpanel">
          <Suspense
            fallback={<span aria-hidden className="nx-home-skeleton block h-96 rounded-2xl" />}
          >
            <IncidentWorkOrdersTab />
          </Suspense>
        </div>
      )}

      <MaintOrderSheet
        order={selected}
        staff={staff.data ?? []}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
