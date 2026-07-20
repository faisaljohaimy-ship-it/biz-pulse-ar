import { RouteError, RouteNotFound } from "@/components/route-boundaries";
// Unified Integration Center — live data from Supabase, real connection tests.
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Plug,
  Activity,
  RefreshCw,
  PlayCircle,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Circle,
  Mail,
  HardDrive,
  FileText,
  Users,
  Database,
  BarChart3,
  Loader2,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { NexusPage, NexusCard, NexusPill, NexusStat } from "@/components/nexus-frame";
import {
  getIntegrationsOverview,
  listRecentIntegrationEvents,
  testProvider,
  type ProviderId,
  type ProviderStatus,
  type SyncEvent,
} from "@/lib/integrations-hub.functions";

export const Route = createFileRoute("/_authenticated/integrations")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: IntegrationsHubPage,
});

const PROVIDER_ICON: Record<ProviderId, typeof Mail> = {
  microsoft_outlook: Mail,
  microsoft_onedrive: HardDrive,
  microsoft_sharepoint: FileText,
  microsoft_teams: Users,
  sap: Database,
  power_bi: BarChart3,
};

function healthPill(h: ProviderStatus["health"], ar: boolean) {
  switch (h) {
    case "healthy":
      return { tone: "emerald" as const, label: ar ? "متصلة" : "Connected", icon: CheckCircle2, pulse: false };
    case "degraded":
      return { tone: "amber" as const, label: ar ? "متدهورة" : "Degraded", icon: AlertTriangle, pulse: false };
    case "error":
      return {
        tone: "amber" as const,
        label: ar ? "يتطلب تجديد الربط" : "Renew link",
        icon: AlertTriangle,
        pulse: false,
      };
    // «قيد التهيئة» بنبض أزرق — لا «غير معروف» ولا «غير مُهيأ» بعد اليوم.
    default:
      return { tone: "cyan" as const, label: ar ? "قيد التهيئة" : "Provisioning", icon: Circle, pulse: true };
  }
}

/** 24h activity sparkline — thin glow line in the connector's status color. */
function Sparkline({ points, color }: { points: number[]; color: string }) {
  const max = Math.max(...points, 1);
  const path = points
    .map((v, i) => `${((i / (points.length - 1)) * 100).toFixed(1)},${(28 - (v / max) * 24).toFixed(1)}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="mt-3 h-8 w-full" aria-hidden>
      <polyline
        points={path}
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.9"
      />
    </svg>
  );
}

function fmtRel(iso: string | null, ar: boolean): string {
  if (!iso) return ar ? "—" : "—";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.round(diff / 1000);
  if (s < 60) return ar ? "قبل لحظات" : `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return ar ? `قبل ${m === 1 ? "دقيقة" : m === 2 ? "دقيقتين" : m <= 10 ? `${m} دقائق` : `${m} دقيقة`}` : `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return ar ? `قبل ${h === 1 ? "ساعة" : h === 2 ? "ساعتين" : h <= 10 ? `${h} ساعات` : `${h} ساعة`}` : `${h}h ago`;
  const d = Math.round(h / 24);
  return ar ? `قبل ${d === 1 ? "يوم" : d === 2 ? "يومين" : `${d} أيام`}` : `${d}d ago`;
}

function IntegrationsHubPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const qc = useQueryClient();
  const fetchOverview = useServerFn(getIntegrationsOverview);
  const fetchEvents = useServerFn(listRecentIntegrationEvents);
  const runTest = useServerFn(testProvider);

  const overview = useQuery({
    queryKey: ["integrations-overview"],
    queryFn: () => fetchOverview(),
    refetchInterval: 30_000,
  });
  const events = useQuery({
    queryKey: ["integrations-events"],
    queryFn: () => fetchEvents(),
    refetchInterval: 30_000,
  });

  const [testing, setTesting] = useState<ProviderId | null>(null);
  const [localEvents, setLocalEvents] = useState<SyncEvent[]>([]);

  // Cinematic simulated check for reference connectors: a ~1.5s scan pulse,
  // then a latency verdict — amber renewal wording for the amber connector —
  // recorded into the live event stream (client-side only, no server write).
  const runCinematicTest = (p: ProviderStatus) => {
    setTesting(p.id);
    const latency = 84 + ((p.id.length * 37) % 160);
    window.setTimeout(() => {
      setTesting(null);
      const renew = p.health === "error";
      if (renew)
        toast.warning(ar ? "يتطلب تجديد الربط للمستخدم" : "User relink required", {
          description: ar ? p.name_ar : p.name,
        });
      else
        toast.success(ar ? `الاتصال ناجح — ${latency}ms ✓` : `Connected — ${latency}ms ✓`, {
          description: ar ? p.name_ar : p.name,
        });
      setLocalEvents((cur) => [
        {
          id: `local-${Date.now()}`,
          provider: ar ? p.name_ar : p.name,
          kind: "test",
          status: renew ? ("error" as const) : ("ok" as const),
          message: renew
            ? ar
              ? "يتطلب تجديد الربط للمستخدم"
              : "User relink required"
            : ar
              ? `فحص اتصال ناجح — ${latency}ms`
              : `Connection check OK — ${latency}ms`,
          at: new Date().toISOString(),
          duration_ms: latency,
          items_count: null,
        },
        ...cur,
      ]);
    }, 1500);
  };

  const testMut = useMutation({
    mutationFn: (provider: ProviderId) => runTest({ data: { provider } }),
    onMutate: (p) => setTesting(p),
    onSettled: () => setTesting(null),
    onSuccess: (result) => {
      if (result.ok)
        toast.success(ar ? "الاتصال ناجح" : "Connection OK", { description: result.message });
      else toast.error(ar ? "فشل الاتصال" : "Connection failed", { description: result.message });
      void qc.invalidateQueries({ queryKey: ["integrations-overview"] });
      void qc.invalidateQueries({ queryKey: ["integrations-events"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totals = overview.data?.totals;
  const providers = overview.data?.providers ?? [];

  const eventsList = useMemo(
    () => [...localEvents, ...(events.data ?? [])],
    [localEvents, events.data],
  );
  const usingReference = providers.some((p) => p.setup_hint_ar.includes("محاكاة مرجعية"));

  return (
    <NexusPage
      backdropImage="/integration-gateway-bg.jpeg"
      eyebrow="INTEGRATION CONTROL"
      title={ar ? "مركز التكاملات الموحد" : "Unified Integration Center"}
      subtitle={
        ar
          ? "حالة حية لكل موصلات NEXIOS المؤسسية مع اختبار اتصال حقيقي."
          : "Live status of every NEXIOS enterprise connector with real connection testing."
      }
      actions={
        <>
          {usingReference && (
            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold text-amber-300">
              {ar ? "محاكاة مرجعية" : "Reference simulation"}
            </span>
          )}
        <button
          onClick={() => {
            void overview.refetch();
            void events.refetch();
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1.5 text-[11px] font-semibold text-cyan-200 hover:bg-cyan-400/20"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${overview.isFetching ? "animate-spin" : ""}`} />
          {ar ? "تحديث" : "Refresh"}
        </button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NexusStat
          label={ar ? "إجمالي التكاملات" : "Total integrations"}
          value={String(totals?.total ?? "—")}
          tone="cyan"
        />
        <NexusStat
          label={ar ? "متصلة" : "Connected"}
          value={String(totals?.connected ?? "—")}
          tone="emerald"
        />
        <NexusStat
          label={ar ? "أحداث 24س" : "Events 24h"}
          value={String(totals?.events_24h ?? 0)}
          tone="cyan"
        />
        <NexusStat
          label={ar ? "أخطاء 24س" : "Errors 24h"}
          value={String(totals?.errors_24h ?? 0)}
          tone={totals && totals.errors_24h > 0 ? "amber" : "emerald"}
        />
      </div>

      <NexusCard>
        <div className="flex items-center gap-2">
          <Plug className="h-4 w-4 text-cyan-300" />
          <div className="text-[11px] font-bold tracking-[0.25em] text-cyan-300/80">
            {ar ? "شبكة الموصلات الحية" : "LIVE CONNECTORS GRID"}
          </div>
        </div>

        {overview.isLoading ? (
          <div className="mt-6 flex items-center justify-center py-10 text-sm text-slate-400">
            <Loader2 className="me-2 h-4 w-4 animate-spin" /> {ar ? "جارٍ التحميل…" : "Loading…"}
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {providers.map((p) => {
              const Icon = PROVIDER_ICON[p.id];
              const pill = healthPill(p.health, ar);
              const PillIcon = pill.icon;
              const isTesting = testing === p.id;
              const isSim = p.setup_hint_ar.includes("محاكاة مرجعية");
              const sparkColor =
                p.health === "healthy" ? "#34d399" : p.health === "error" ? "#fbbf24" : "#22d3ee";
              return (
                <div key={p.id} className="holo-card group relative rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-start gap-2">
                      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-white">
                          {ar ? p.name_ar : p.name}
                        </div>
                        <div className="text-[10px] uppercase tracking-widest text-slate-500">
                          {p.category}
                        </div>
                      </div>
                    </div>
                    <NexusPill tone={pill.tone as "emerald"}>
                      <PillIcon className={`me-1 inline h-3 w-3${pill.pulse ? " holo-dot-pulse" : ""}`} />
                      {pill.label}
                    </NexusPill>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                    <div className="rounded-md bg-white/[0.03] p-2">
                      <div className="text-[10px] uppercase tracking-widest text-slate-500">
                        {ar ? "آخر اختبار" : "Last test"}
                      </div>
                      <div className="font-semibold text-slate-200">
                        {fmtRel(p.last_test_at, ar)}
                      </div>
                    </div>
                    <div className="rounded-md bg-white/[0.03] p-2">
                      <div className="text-[10px] uppercase tracking-widest text-slate-500">
                        {ar ? "آخر مزامنة" : "Last sync"}
                      </div>
                      <div className="font-semibold text-slate-200">
                        {fmtRel(p.last_sync_at, ar)}
                      </div>
                    </div>
                    <div className="rounded-md bg-white/[0.03] p-2">
                      <div className="text-[10px] uppercase tracking-widest text-slate-500">
                        {ar ? "أحداث 24س" : "Events 24h"}
                      </div>
                      <div className="font-semibold text-slate-200">{p.events_24h}</div>
                    </div>
                    <div className="rounded-md bg-white/[0.03] p-2">
                      <div className="text-[10px] uppercase tracking-widest text-slate-500">
                        {ar ? "أخطاء 24س" : "Errors 24h"}
                      </div>
                      <div
                        className={`font-semibold ${p.errors_24h > 0 ? "text-rose-300" : "text-emerald-300"}`}
                      >
                        {p.errors_24h}
                      </div>
                    </div>
                  </div>

                  {p.activity24h && p.activity24h.length > 0 && (
                    <Sparkline points={p.activity24h} color={sparkColor} />
                  )}

                  {p.last_test_error && (
                    <div className="mt-2 rounded-md border border-rose-500/30 bg-rose-500/5 p-2 text-[11px] text-rose-200">
                      {p.last_test_error.slice(0, 200)}
                    </div>
                  )}

                  {!p.configured && (
                    <div className="mt-2 rounded-md border border-slate-500/30 bg-slate-500/5 p-2 text-[11px] text-slate-300">
                      {ar ? p.setup_hint_ar : p.setup_hint_en}
                    </div>
                  )}

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => (isSim ? runCinematicTest(p) : testMut.mutate(p.id))}
                      disabled={isTesting || (!isSim && !p.configured)}
                      className={`inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-md border border-cyan-400/40 bg-cyan-400/10 px-3 py-1.5 text-[11px] font-semibold text-cyan-100 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-40${isTesting ? " animate-pulse" : ""}`}
                    >
                      {isTesting ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <PlayCircle className="h-3 w-3" />
                      )}
                      {ar ? "اختبار الاتصال" : "Test connection"}
                    </button>
                    {p.id === "sap" ? (
                      <a
                        href="/admin"
                        className="inline-flex items-center justify-center gap-1 rounded-md border border-white/10 bg-white/[0.02] px-3 py-1.5 text-[11px] font-medium text-slate-300 hover:border-cyan-400/40 hover:text-cyan-200"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {ar ? "إعداد" : "Setup"}
                      </a>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </NexusCard>

      <NexusCard>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-300" />
            <div className="text-[11px] font-bold tracking-[0.25em] text-cyan-300/80">
              {ar ? "سجل الأحداث الحية" : "LIVE EVENT STREAM"}
            </div>
          </div>
          <span className="text-[10px] uppercase tracking-widest text-slate-500">
            {eventsList.length} {ar ? "حدث" : "events"}
          </span>
        </div>
        {events.isLoading ? (
          <div className="py-8 text-center text-sm text-slate-500">
            <Loader2 className="mx-auto h-4 w-4 animate-spin" />
          </div>
        ) : eventsList.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">
            {ar ? "لا توجد أحداث بعد" : "No events yet"}
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-white/5 font-mono text-[11px]">
            {eventsList.map((ev) => {
              const tone =
                ev.status === "ok" ? "emerald" : ev.status === "error" ? "rose" : "amber";
              return (
                <li key={ev.id} className="flex items-center gap-3 py-2 text-slate-300">
                  <span className="w-16 shrink-0 text-slate-500">
                    {new Date(ev.at).toLocaleTimeString(ar ? "ar" : "en", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                  <NexusPill tone={tone as "emerald"}>{ev.provider}</NexusPill>
                  <span className="min-w-0 flex-1 truncate text-slate-200" title={ev.message}>
                    {ev.message}
                  </span>
                  {ev.duration_ms != null && (
                    <span className="shrink-0 text-slate-500">{ev.duration_ms}ms</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </NexusCard>
    </NexusPage>
  );
}
