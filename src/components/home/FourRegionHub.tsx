import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  Bell,
  Bot,
  CheckCircle2,
  Clock3,
  FlaskConical,
  ShieldCheck,
  Siren,
  Wifi,
} from "lucide-react";
import { FinnHolographicPortal } from "@/components/home/FinnHolographicPortal";
import { MicroMeter } from "@/components/charts/premium-charts";
import { GlassSurface } from "@/components/visual/GlassSurface";
import { CinematicReveal } from "@/components/visual/CinematicReveal";
import {
  CC_REGIONS,
  CC_REGION_METRICS,
  type CCRegionPanel,
} from "@/components/executive/command/commandCenterData";
import { getCommandCenterState } from "@/lib/exec/command-center.functions";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useRegion } from "@/lib/region-context";
import { REGIONS, REGION_ACCENT_HEX, type RegionId } from "@/lib/regions";

/** "#22D3EE" → "34, 211, 238" for the `--accent-rgb` edge-glow token. */
function hexToRgbTriplet(hex: string): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  const n = Number.parseInt(full, 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

type Severity = "critical" | "high" | "medium" | "low";

const SEVERITY_RANK: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const SEVERITY_DOT: Record<Severity, string> = {
  critical: "bg-rose-400",
  high: "bg-amber-400",
  medium: "bg-cyan-300",
  low: "bg-emerald-400",
};
const SEVERITY_LABEL_AR: Record<Severity, string> = {
  critical: "حرج",
  high: "عالٍ",
  medium: "متوسط",
  low: "منخفض",
};

function LiveClock({ ar }: { ar: boolean }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="leading-tight">
      <div className="font-semibold tabular-nums text-[color:var(--tone-cyan)]">
        {now?.toLocaleTimeString(ar ? "ar-SA" : "en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }) ?? "—"}
      </div>
      <div className="text-[12px] text-[color:var(--ink-3)]">
        {now?.toLocaleDateString(ar ? "ar-SA" : "en-US", {
          weekday: "long",
          day: "numeric",
          month: "long",
        }) ?? ""}
      </div>
    </div>
  );
}

function Ring({ pct, color }: { pct: number; color: string }) {
  const radius = 23;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(100, pct)) / 100);

  return (
    <svg viewBox="0 0 56 56" className="h-14 w-14 shrink-0" aria-hidden>
      <circle
        cx="28"
        cy="28"
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,.08)"
        strokeWidth="4"
      />
      <circle
        cx="28"
        cy="28"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 28 28)"
      />
      {/* fill="white" كان يخفي النسبة تمامًا في الوضع الفاتح — أبيض على أبيض.
          currentColor يجعلها تتبع لون النص المحيط في الوضعين. */}
      <text
        x="28"
        y="31"
        textAnchor="middle"
        fontSize="12"
        fontWeight="700"
        fill="currentColor"
        className="text-[color:var(--ink)]"
      >
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

function RegionCard({
  panel,
  color,
  performance,
  active,
  ar,
  onSelect,
}: {
  panel: CCRegionPanel;
  color: string;
  performance: number;
  active: boolean;
  ar: boolean;
  onSelect: () => void;
}) {
  const region = REGIONS.find((item) => item.id === panel.id)!;
  const light = useTheme().theme === "light";
  const rgb = hexToRgbTriplet(color);

  return (
    <article
      data-region={panel.id}
      data-region-active={active || undefined}
      className="holo-card nx-glass-region nx-region-aura relative overflow-hidden rounded-2xl p-3"
      style={{
        ["--accent-rgb" as string]: rgb,
        // كل منطقة تُشعّ وتلمع وتتموّج بلونها هي: نُثبّت لون الهالة محليًا
        // (--hx-ic) ونُعيد تعريف لون المنطقة داخل البطاقة فقط، فترث كل
        // الأيقونات والحدود بداخلها لون هذه المنطقة بدل لون المنطقة النشطة.
        ["--hx-ic" as string]: rgb,
        ["--nx-region-rgb" as string]: rgb,
        borderColor: active ? color : `${color}55`,
        // لهجة المنطقة تُمرَّر كمتغيّر لا كخلفية جاهزة. الخلفية الجاهزة inline
        // تتفوّق على أي صنف، فكانت تمحو بريق الزجاج عن هذه اللوحات الأربع
        // وحدها. الآن تتركّب في styles.css فوق حشوة الزجاج وتحت بريقه.
        ["--region-tint" as string]: `${color}${light ? "14" : "1f"}`,
      }}
    >
      <span aria-hidden className="nx-region-ripple" />
      <span aria-hidden className="nx-region-ripple nx-region-ripple--delayed" />
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={active}
        className="relative z-[1] flex min-h-14 w-full items-center gap-3 rounded-xl text-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
      >
        <Ring pct={performance} color={color} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-base font-black" style={{ color }}>
              {ar ? region.shortAr : region.shortEn}
            </span>
            {active && (
              <span className="shrink-0 rounded-md border border-[color:var(--hairline)] bg-[color:var(--chip-strong)] px-1.5 py-0.5 text-[12px] font-semibold text-[color:var(--ink)]">
                {ar ? "المنطقة الحالية" : "Current"}
              </span>
            )}
          </div>
          <div className="mt-1 truncate text-xs text-[color:var(--ink-2)]">
            {ar ? panel.subtitleAr : panel.subtitleEn}
          </div>
        </div>
      </button>

      <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {CC_REGION_METRICS.map((metric) => (
          <Link
            key={metric.key}
            to={metric.to}
            className="nx-glass flex min-h-12 flex-col items-center justify-center rounded-xl border border-[color:var(--hairline-soft)] px-1 py-1.5 text-center transition hover:border-[color:var(--hairline-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
          >
            <span className="text-sm font-black tabular-nums text-[color:var(--ink)]">
              {panel.metrics[metric.key]}
            </span>
            <span className="mt-0.5 text-[12px] text-[color:var(--ink-2)]">
              {ar ? metric.ar : metric.en}
            </span>
          </Link>
        ))}
      </div>
    </article>
  );
}

export function FourRegionHub() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { regionId, setRegion } = useRegion();
  const { loading: authLoading } = useAuth();
  const getState = useServerFn(getCommandCenterState);

  const { data } = useQuery({
    queryKey: ["region-hub-state"],
    queryFn: () => getState(),
    enabled: !authLoading,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const livePerformance = useMemo(() => {
    const values: Partial<Record<RegionId, number>> = {};
    for (const region of data?.regions ?? []) {
      if (region.compliance_pct > 0) values[region.region_id] = region.compliance_pct;
    }
    return values;
  }, [data]);

  const counters = data?.counters;
  const kpis = [
    {
      labelAr: "الوكلاء النشطون",
      labelEn: "Active agents",
      value: counters?.agents_active ?? 0,
      Icon: Bot,
      tone: "text-[color:var(--tone-emerald)]",
      accent: "52, 211, 153",
      to: "/nx-agents",
    },
    {
      labelAr: "بانتظار الاعتماد",
      labelEn: "Pending approval",
      value: counters?.proposals_pending ?? 0,
      Icon: ShieldCheck,
      tone: "text-[color:var(--tone-cyan)]",
      accent: "34, 211, 238",
      to: "/decisions",
    },
    {
      labelAr: "أعمال عاجلة",
      labelEn: "Urgent work",
      value: counters?.urgent_open ?? 0,
      Icon: Siren,
      tone: "text-[color:var(--tone-rose)]",
      accent: "251, 113, 133",
      to: "/urgent-ops",
    },
    {
      labelAr: "قيد المعالجة",
      labelEn: "In progress",
      value: counters?.support_processing ?? 0,
      Icon: Clock3,
      tone: "text-[color:var(--tone-amber)]",
      accent: "245, 158, 11",
      to: "/operations",
    },
    {
      labelAr: "منجز اليوم",
      labelEn: "Completed today",
      value: counters?.done_today ?? 0,
      Icon: CheckCircle2,
      tone: "text-[color:var(--tone-emerald)]",
      accent: "52, 211, 153",
      to: "/execution",
    },
    {
      labelAr: "متوسط الامتثال",
      labelEn: "Compliance",
      value: `${counters?.compliance_avg ?? 0}%`,
      Icon: Activity,
      tone: "text-[color:var(--tone-cyan)]",
      accent: "34, 211, 238",
      to: "/hcis-compliance",
    },
  ] as const;

  const alerts = data?.urgent ?? [];
  const simulation = data?.simulation ?? true;

  // Severity derived from the live SLA window (no invented values).
  const sortedAlerts = alerts
    .map((alert) => {
      const dueMs = new Date(alert.due_at).getTime();
      const hoursLeft = (dueMs - Date.now()) / 3_600_000;
      const severity: Severity =
        hoursLeft <= 0 ? "critical" : hoursLeft <= 6 ? "high" : hoursLeft <= 24 ? "medium" : "low";
      return { alert, severity, dueMs };
    })
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || a.dueMs - b.dueMs);

  return (
    <section
      aria-label={ar ? "SADEED" : "Unified Work Execution Platform"}
      data-nx-frozen="false"
      className="relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-[color:var(--surface)] bg-gradient-to-br from-[color:var(--surface)] via-[color:var(--surface-2)] to-[color:var(--surface)] p-3 shadow-[0_36px_110px_-45px_rgba(0,212,255,.45)] sm:p-5"
    >
      <style>{`
        .nx-hub-pulse { animation: nxHubPulse 2.8s ease-in-out infinite; }
        @keyframes nxHubPulse {
          0%, 100% { opacity: .72; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }
        @media (prefers-reduced-motion: reduce) {
          .nx-hub-pulse { animation: none !important; }
        }
        [data-nx-frozen="true"] .nx-hub-pulse {
          animation-play-state: paused !important;
        }
      `}</style>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,212,255,.4) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,.4) 1px,transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      <header className="relative flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--hairline)] pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-cyan-400/20 bg-[color:var(--chip-strong)] px-3 py-2">
            <LiveClock ar={ar} />
          </div>
          <span className="hidden min-h-11 items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-3 text-xs text-emerald-200 sm:inline-flex">
            <Wifi className="h-4 w-4" aria-hidden />
            {ar ? "الأنظمة متصلة" : "Systems online"}
          </span>
        </div>

        <div className="min-w-[220px] flex-1 text-center">
          <p className="text-[12px] font-bold uppercase tracking-[0.3em] text-[color:var(--tone-cyan)]">
            {ar ? "منصة إدارة الأمن الصناعي" : "Industrial Security Management Platform"}
          </p>
          <h1 className="mt-1 text-xl font-black text-[color:var(--ink)] sm:text-2xl">
            {ar ? "SADEED" : "Unified Work Execution Platform"}
          </h1>
        </div>

        <Link
          to="/situation-room"
          className="nx-holo-icon relative grid min-h-11 min-w-11 place-items-center rounded-xl text-cyan-200"
          aria-label={ar ? "فتح غرفة العمليات" : "Open Operations Room"}
        >
          <Bell className="h-4 w-4" aria-hidden />
          {alerts.length > 0 && (
            <span className="nx-hub-pulse absolute -end-1 -top-1 grid min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[12px] font-bold text-white">
              {alerts.length}
            </span>
          )}
        </Link>
      </header>

      {simulation && (
        <div className="relative mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[12px] text-amber-200">
          <FlaskConical className="h-3.5 w-3.5" aria-hidden />
          {ar ? "بيانات محاكاة مرجعية" : "Reference simulation"}
        </div>
      )}

      <CinematicReveal className="relative mt-4" selector="[data-cinematic]" lightSweep>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {kpis.map(({ labelAr, labelEn, value, Icon, tone, accent, to }) => {
            // Honest encoding only: percentages map directly, counts map to their
            // share of the largest count in the same row. Nothing is invented.
            const numeric =
              typeof value === "number" ? value : Number(String(value).replace("%", "")) || 0;
            const isPct = typeof value === "string" && value.includes("%");
            const maxCount = Math.max(
              1,
              ...kpis.filter((k) => typeof k.value === "number").map((k) => k.value as number),
            );
            const ratio = isPct ? numeric / 100 : numeric / maxCount;
            return (
              <GlassSurface key={labelEn} accent={accent} className="rounded-2xl">
                <Link
                  data-cinematic
                  to={to}
                  aria-label={ar ? labelAr : labelEn}
                  style={{ ["--accent-rgb" as string]: accent }}
                  className="nx-icon-edge-glow block min-h-11 rounded-2xl p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-[color:var(--ink-2)]">
                      {ar ? labelAr : labelEn}
                    </span>
                    <Icon className={`h-4 w-4 ${tone}`} aria-hidden />
                  </div>
                  <div className={`mt-2 text-2xl font-black tabular-nums ${tone}`}>{value}</div>
                  <MicroMeter ratio={ratio} accent={accent} className="mt-2" />
                </Link>
              </GlassSurface>
            );
          })}
        </div>
      </CinematicReveal>

      <div className="relative mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start">
        <div className="order-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:order-none lg:grid-cols-1">
          {REGIONS.map((region) => {
            const panel = CC_REGIONS[region.id];
            return (
              <RegionCard
                key={region.id}
                panel={panel}
                color={REGION_ACCENT_HEX[region.id]}
                performance={
                  livePerformance[region.id] ??
                  panel.kpis.find((item) => item.ringPct != null)?.ringPct ??
                  0
                }
                active={regionId === region.id}
                ar={ar}
                onSelect={() => setRegion(region.id)}
              />
            );
          })}
        </div>

        <div className="order-1 lg:order-none">
          <FinnHolographicPortal ar={ar} />
        </div>

        <div
          id="smart-alerts"
          data-order="3"
          style={{ ["--accent-rgb" as string]: "251, 113, 133" }}
          className="holo-card order-3 rounded-2xl bg-rose-500/[0.05] p-4 lg:order-none"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm font-semibold text-[color:var(--ink-2)]">
              <Bell className="h-4 w-4 text-[color:var(--tone-rose)]" aria-hidden />
              {ar ? "تنبيهات غرفة العمليات" : "Operations Room alerts"}
            </span>
            <Link
              to="/situation-room"
              className="text-xs font-semibold text-[color:var(--tone-cyan)] hover:opacity-80"
            >
              {ar ? "فتح غرفة العمليات" : "Open room"}
            </Link>
          </div>
          <ul className="grid gap-2">
            {sortedAlerts.slice(0, 6).map(({ alert, severity }) => (
              <li key={alert.id}>
                <Link
                  to="/situation-room"
                  aria-label={`${alert.title_ar} — ${alert.department}`}
                  className="nx-glass flex min-h-11 items-center justify-between gap-3 rounded-xl border border-[color:var(--hairline-soft)] px-3 py-2 text-xs transition hover:border-[color:var(--hairline-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${SEVERITY_DOT[severity]}`}
                      aria-hidden
                    />
                    <span className="truncate text-[color:var(--ink-2)]">{alert.title_ar}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-[color:var(--ink-3)]">
                    <span>{alert.department}</span>
                    <span className="rounded-md border border-[color:var(--hairline)] px-1.5 py-0.5 text-[12px]">
                      {ar ? SEVERITY_LABEL_AR[severity] : severity}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
            {sortedAlerts.length === 0 && (
              <li className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.04] px-3 py-4 text-center text-xs text-emerald-200">
                {ar ? "لا توجد تنبيهات عاجلة حالياً" : "No urgent alerts"}
              </li>
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default FourRegionHub;
