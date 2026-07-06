/**
 * HajjExecDrawer — inline executive dashboard for the Hajj Nusuk launcher.
 *
 * Opens as a right-side sheet on a single click of the launcher icon; long-press
 * / right-click on the launcher navigates directly to /hajj-prime (expert
 * shortcut). All data is real: pulls kpi + stations + top open tasks via
 * getHajjExecSummary. Null fields render "في انتظار الربط" — never fake zeros.
 *
 * Identity: Hajj gold/emerald (distinct from ARIA cyan).
 */
import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Loader2,
  Moon,
  ShieldAlert,
  Sparkles,
  Users,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getHajjExecSummary } from "@/lib/hajj-public.functions";
import { useI18n } from "@/lib/i18n";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const GOLD = "#C9A961";
const EMERALD = "#1E6B4F";

function hijriToday(locale: "ar" | "en") {
  try {
    return new Intl.DateTimeFormat(
      locale === "ar" ? "ar-SA-u-ca-islamic-umalqura" : "en-US-u-ca-islamic-umalqura",
      { day: "numeric", month: "long", year: "numeric" },
    ).format(new Date());
  } catch {
    return "";
  }
}

function fmt(n: number | null | undefined, ar: boolean): string {
  if (n == null || Number.isNaN(n)) return ar ? "في انتظار الربط" : "Pending";
  return new Intl.NumberFormat(ar ? "ar-SA" : "en-US").format(n);
}

function statusHue(status: string | null | undefined): { bg: string; fg: string; label_ar: string; label_en: string } {
  const s = (status ?? "").toLowerCase();
  if (s === "operational" || s === "online" || s === "active")
    return { bg: "rgba(47,191,113,0.18)", fg: "#2FBF71", label_ar: "تشغيلية", label_en: "Operational" };
  if (s === "degraded" || s === "warning")
    return { bg: "rgba(224,169,59,0.18)", fg: "#E0A93B", label_ar: "متأثرة", label_en: "Degraded" };
  if (s === "offline" || s === "down" || s === "critical")
    return { bg: "rgba(214,69,69,0.2)", fg: "#D64545", label_ar: "متوقفة", label_en: "Offline" };
  return { bg: "rgba(255,255,255,0.08)", fg: "rgba(255,255,255,0.7)", label_ar: "غير محدد", label_en: "Unknown" };
}

function priorityHue(p: string | null | undefined): string {
  const s = (p ?? "").toLowerCase();
  if (s === "critical") return "#D64545";
  if (s === "high") return "#E0A93B";
  if (s === "medium") return "#C9A961";
  return "#7dd3fc";
}

export function HajjExecDrawer({ open, onOpenChange }: Props) {
  const { locale } = useI18n();
  const ar = locale === "ar";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={ar ? "right" : "left"}
        className="w-full max-w-[440px] border-l border-[color:var(--hajj-gold,#C9A961)]/25 bg-[linear-gradient(180deg,#0B1A1E_0%,#0F2A24_100%)] p-0 text-white sm:max-w-[440px]"
        style={{ boxShadow: `-24px 0 60px -20px ${GOLD}22` }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 10%, #C9A961 0, transparent 40%), radial-gradient(circle at 80% 90%, #1E6B4F 0, transparent 45%)",
          }}
        />

        <SheetHeader className="relative border-b border-white/5 px-5 pb-4 pt-5 text-start">
          <div className="flex items-center gap-3">
            <span
              className="flex h-11 w-11 items-center justify-center rounded-2xl border"
              style={{
                borderColor: `${GOLD}66`,
                background: `linear-gradient(135deg, ${GOLD}22, ${EMERALD}22)`,
                boxShadow: `0 0 24px -6px ${GOLD}55`,
              }}
            >
              <Moon className="h-5 w-5" style={{ color: GOLD }} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <SheetTitle className="truncate text-base font-semibold text-white">
                {ar ? "منصة نسك الحج · 1447 هـ" : "Hajj Nusuk Platform · 1447 AH"}
              </SheetTitle>
              <div className="mt-0.5 flex items-center gap-2 text-[10px] uppercase tracking-[0.22em]" style={{ color: `${GOLD}cc` }}>
                <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: "#2FBF71" }} />
                <span>{ar ? "بث حي" : "Live"}</span>
                <span className="text-white/40">·</span>
                <span className="normal-case tracking-normal text-white/60">{hijriToday(ar ? "ar" : "en")}</span>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="relative flex h-[calc(100dvh-84px)] flex-col overflow-y-auto px-5 py-4">
          <Suspense fallback={<DrawerSkeleton ar={ar} />}>
            <DrawerBody ar={ar} onOpenChange={onOpenChange} />
          </Suspense>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DrawerBody({ ar, onOpenChange }: { ar: boolean; onOpenChange: (o: boolean) => void }) {
  const fn = useServerFn(getHajjExecSummary);
  const { data } = useSuspenseQuery({
    queryKey: ["hajj-exec-summary"],
    queryFn: () => fn(),
    staleTime: 30_000,
  });

  const { kpi, stations, top_tasks } = data;

  const kpis: Array<{ label: string; value: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; hue: string }> = [
    { label: ar ? "الطاقم الميداني" : "Field staff", value: fmt(kpi.field_staff, ar), icon: Users, hue: GOLD },
    {
      label: ar ? "المحطات التشغيلية" : "Stations",
      value:
        kpi.stations_online != null && kpi.stations_total != null
          ? `${kpi.stations_online} / ${kpi.stations_total}`
          : ar
            ? "في انتظار الربط"
            : "Pending",
      icon: CheckCircle2,
      hue: "#2FBF71",
    },
    { label: ar ? "المهام المُنجزة اليوم" : "Tasks done today", value: fmt(kpi.tasks_done_today, ar), icon: ClipboardList, hue: EMERALD },
    { label: ar ? "التنبيهات النشطة" : "Active alerts", value: fmt(kpi.active_alerts, ar), icon: AlertTriangle, hue: "#E0A93B" },
    { label: ar ? "الحوادث المفتوحة" : "Open incidents", value: fmt(kpi.open_incidents, ar), icon: ShieldAlert, hue: "#D64545" },
    {
      label: ar ? "الامتثال" : "Compliance",
      value: kpi.compliance_pct != null ? `${Math.round(kpi.compliance_pct)}%` : ar ? "في انتظار الربط" : "Pending",
      icon: Sparkles,
      hue: GOLD,
    },
  ];

  return (
    <>
      {/* KPI grid 2x3 */}
      <section>
        <SectionTitle>{ar ? "المؤشرات التنفيذية" : "Executive KPIs"}</SectionTitle>
        {/* source: hajj_kpi_snapshots (latest snapshot_at) */}
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {kpis.map((k) => {
            const Icon = k.icon;
            return (
              <div
                key={k.label}
                className="rounded-xl border border-white/5 bg-black/25 p-3 backdrop-blur-sm"
                style={{ boxShadow: `inset 0 0 24px -12px ${k.hue}55` }}
              >
                <div className="flex items-center justify-between">
                  <Icon className="h-3.5 w-3.5" style={{ color: k.hue }} aria-hidden />
                  <span className="text-[9px] uppercase tracking-[0.2em] text-white/45">{k.label}</span>
                </div>
                <div className="mt-1.5 text-xl font-semibold tracking-tight text-white">{k.value}</div>
              </div>
            );
          })}
        </div>
        {kpi.is_sample && (
          <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-[color:var(--nx-warning,#E0A93B)]/80">
            {ar ? "بيئة محاكاة · SAMPLE" : "Sample environment"}
          </p>
        )}
      </section>

      {/* Stations */}
      <section className="mt-6">
        <SectionTitle>{ar ? "المحطات" : "Stations"}</SectionTitle>
        {/* source: hajj_stations (id, code, name_ar, status) — top 6 by code */}
        <div className="mt-3 space-y-1.5">
          {stations.length === 0 ? (
            <EmptyRow ar={ar} />
          ) : (
            stations.map((s) => {
              const hue = statusHue(s.status);
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border border-white/5 bg-black/20 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-white">
                      {ar ? s.name_ar ?? s.name_en ?? s.code : s.name_en ?? s.name_ar ?? s.code}
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">{s.code}</div>
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em]"
                    style={{ background: hue.bg, color: hue.fg }}
                  >
                    {ar ? hue.label_ar : hue.label_en}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Top open tasks */}
      <section className="mt-6">
        <SectionTitle>{ar ? "أهم المهام المفتوحة" : "Top open tasks"}</SectionTitle>
        {/* source: hajj_tasks WHERE status != 'completed' ORDER BY priority weight */}
        <div className="mt-3 space-y-1.5">
          {top_tasks.length === 0 ? (
            <EmptyRow ar={ar} label={ar ? "لا مهام مفتوحة" : "No open tasks"} />
          ) : (
            top_tasks.map((t) => (
              <div key={t.id} className="rounded-lg border border-white/5 bg-black/20 px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 truncate text-xs font-medium text-white/90">
                    {ar ? t.title_ar ?? t.title_en ?? "—" : t.title_en ?? t.title_ar ?? "—"}
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em]"
                    style={{ background: `${priorityHue(t.priority)}22`, color: priorityHue(t.priority) }}
                  >
                    {t.priority ?? (ar ? "—" : "—")}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Readiness (composite from KPI: stations_online/total × compliance) */}
      <section className="mt-6">
        <SectionTitle>{ar ? "جاهزية النظام" : "System readiness"}</SectionTitle>
        <ReadinessBar
          value={computeReadiness(kpi.stations_online, kpi.stations_total, kpi.compliance_pct)}
          ar={ar}
        />
      </section>

      {/* Footer CTAs */}
      <div className="sticky bottom-0 mt-6 -mx-5 flex items-center gap-2 border-t border-white/5 bg-[linear-gradient(180deg,rgba(11,26,30,0),#0B1A1E_45%)] px-5 pb-5 pt-4">
        <Link
          to="/hajj-prime"
          onClick={() => onOpenChange(false)}
          className="group inline-flex flex-1 items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-xs font-semibold text-white transition"
          style={{
            borderColor: `${GOLD}88`,
            background: `linear-gradient(90deg, ${GOLD}33, ${EMERALD}33)`,
            boxShadow: `0 0 24px -8px ${GOLD}77`,
          }}
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          <span>{ar ? "افتح المنصة الكاملة" : "Open full platform"}</span>
          <ArrowUpRight className="h-3 w-3 opacity-80 transition group-hover:-translate-y-0.5" aria-hidden />
        </Link>
        <button
          type="button"
          onClick={() => {
            onOpenChange(false);
            try {
              window.dispatchEvent(
                new CustomEvent("aria:open", { detail: { prompt: ar ? "لخّص حالة الحج الآن" : "Summarize Hajj status now" } }),
              );
            } catch { /* noop */ }
          }}
          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#3AE8FF]/50 bg-[#3AE8FF]/10 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-[#3AE8FF]/20"
        >
          <Sparkles className="h-3.5 w-3.5 text-[#3AE8FF]" aria-hidden />
          <span>{ar ? "موجز آريا" : "ARIA brief"}</span>
        </button>
      </div>
    </>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="text-[10px] font-semibold uppercase tracking-[0.28em]"
      style={{ color: `${GOLD}cc` }}
    >
      {children}
    </h3>
  );
}

function EmptyRow({ ar, label }: { ar: boolean; label?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-white/10 bg-black/10 px-3 py-3 text-center text-[11px] text-white/50">
      {label ?? (ar ? "في انتظار الربط" : "Pending connection")}
    </div>
  );
}

function computeReadiness(online: number | null, total: number | null, compliance: number | null): number | null {
  if (online == null && total == null && compliance == null) return null;
  const stationsPct = online != null && total != null && total > 0 ? (online / total) * 100 : null;
  const parts = [stationsPct, compliance].filter((n): n is number => typeof n === "number");
  if (parts.length === 0) return null;
  return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
}

function ReadinessBar({ value, ar }: { value: number | null; ar: boolean }) {
  if (value == null) {
    return (
      <div className="mt-3">
        <EmptyRow ar={ar} />
      </div>
    );
  }
  const hue = value >= 90 ? "#2FBF71" : value >= 70 ? GOLD : "#E0A93B";
  return (
    <div className="mt-3">
      <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-white/55">
        <span>{ar ? "المؤشر المركّب" : "Composite index"}</span>
        <span style={{ color: hue }}>{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: `linear-gradient(90deg, ${hue}, ${hue}cc)`, boxShadow: `0 0 12px ${hue}88` }}
        />
      </div>
    </div>
  );
}

function DrawerSkeleton({ ar }: { ar: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-white/50">
      <Loader2 className="h-6 w-6 animate-spin" style={{ color: GOLD }} aria-hidden />
      <span className="text-xs uppercase tracking-[0.22em]">{ar ? "تحميل الملخص التنفيذي" : "Loading executive summary"}</span>
    </div>
  );
}

export default HajjExecDrawer;
