/**
 * HajjCommandDashboard — a NATIVE, self-contained reproduction of the Hajj
 * platform's executive command center, rendered directly on the homepage
 * (outside the embed iframe) so the dashboard is visible as real content.
 *
 * Faithful to the standalone Hajj Nexus command center: brand + live clock
 * header, a 6-tile KPI strip, a stations-network panel, a live-alerts feed,
 * and three analytics panels (incident donut, risk gauge, compliance area).
 *
 * Data policy (constitution art. 11): every figure is the platform's own
 * deterministic demo dataset, rendered synchronously (never empty) and
 * explicitly badged «محاكاة · لقطة عامة» — no live/DB claim, no auth, no
 * network. Fully RTL and responsive: KPI 2→3→6 columns, panels stack on
 * mobile and lay out 3-wide on desktop, charts use locked aspect boxes.
 */
import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  Building,
  Camera,
  CheckCircle2,
  Cloud,
  Droplets,
  FileText,
  FileWarning,
  Phone,
  Radio,
  ShieldAlert,
  ShieldCheck,
  StickyNote,
  Sun,
  Users,
  Wind,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SimBadge } from "@/components/os/SimBadge";

/* ── Palette (from the Hajj platform) ─────────────────────────────────── */
const C = {
  cyan: "#34B6FF",
  cyanLight: "#7DD3FC",
  mint: "#1EE9B6",
  amber: "#FF9F1C",
  gold: "#F2C76E",
  red: "#FF4D6D",
  violet: "#9B8BFF",
} as const;

const tt = {
  background: "rgba(4,17,31,.94)",
  border: "1px solid rgba(255,255,255,.08)",
  borderRadius: 12,
  color: "#fff",
  fontSize: 11,
} as const;

/* ── Demo dataset (from the platform's getFallbackOpsData) ────────────── */
const KPIS = {
  openIncidents: 3,
  activeAlerts: 5,
  completedTasks: 28,
  activeStaff: 256,
  operational: 3,
  totalStations: 4,
  compliancePct: 97,
};

const STATIONS = [
  { name: "مركز قيادة منى", code: "MINA-01", status: "operational", cap: 4200 },
  { name: "نقطة عرفات الصناعية", code: "ARA-02", status: "warning", cap: 3100 },
  { name: "محطة مزدلفة الأمنية", code: "MUZ-03", status: "operational", cap: 2600 },
  { name: "غرفة مراقبة الجمرات", code: "JAM-04", status: "critical", cap: 5200 },
] as const;

const ALERTS = [
  {
    id: "a1",
    title: "تسرّب غاز محتمل",
    where: "محطة عرفات 2",
    since: "منذ دقيقتين",
    c: C.red,
    Ic: AlertTriangle,
  },
  {
    id: "a2",
    title: "عدم ارتداء معدّات الوقاية",
    where: "منى 1 — المنطقة الشرقية",
    since: "منذ 5 دقائق",
    c: C.amber,
    Ic: ShieldAlert,
  },
  {
    id: "a3",
    title: "قرب انتهاء تصريح عمل",
    where: "منطقة المواقد — منى",
    since: "منذ 10 دقائق",
    c: C.gold,
    Ic: FileText,
  },
] as const;

const INCIDENTS = [
  { name: "إصابات", value: 18, c: C.red },
  { name: "ممتلكات", value: 14, c: C.amber },
  { name: "بيئية", value: 10, c: C.mint },
  { name: "قريبة من الحدوث", value: 22, c: C.cyan },
] as const;

const COMPLIANCE = [58, 61, 64, 66, 69, 73, 76, 81, 86, 91, 94, 97].map((v, i) => ({
  d: `${(i + 1) * 2} مايو`,
  v,
}));

const STATUS_META: Record<string, { label: string; c: string }> = {
  operational: { label: "تشغيلية", c: C.mint },
  warning: { label: "تنبيه", c: C.amber },
  critical: { label: "حرجة", c: C.red },
};

/* ── Shared panel shell ───────────────────────────────────────────────── */
function Panel({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#3AE8FF]/15 bg-[#061A2E]/50 p-3 backdrop-blur-xl sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5">
            {icon}
          </span>
          <h3 className="truncate text-[13px] font-semibold text-white">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/* ── Live clock header ────────────────────────────────────────────────── */
function HeaderStrip() {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const time = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Riyadh",
  });
  const date = now.toLocaleDateString("ar-SA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Asia/Riyadh",
  });

  return (
    <header className="relative overflow-hidden rounded-2xl border border-[#3AE8FF]/20 bg-gradient-to-b from-[#04243c]/70 to-[#04111f]/80 px-4 py-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-24 h-48 opacity-70"
        style={{
          background: "radial-gradient(50% 100% at 50% 0%, rgba(125,211,252,.35), transparent 70%)",
        }}
      />
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#3AE8FF]/12 ring-1 ring-[#3AE8FF]/40">
            <ShieldCheck className="h-6 w-6 text-[#3AE8FF]" />
          </span>
          <div className="leading-tight">
            <div className="text-sm font-bold text-white">منصة نُسك الحج · الأمن الصناعي</div>
            <div className="text-[9px] tracking-[0.28em] text-[#7DD3FC]/80">
              INDUSTRIAL SECURITY COMMAND · مشاعر 1447
            </div>
          </div>
        </div>
        {/* Live clock */}
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.18em] text-white/90">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span suppressHydrationWarning className="tabular-nums">
              LIVE · {time} · حج 1447 هـ
            </span>
          </div>
          <div suppressHydrationWarning className="mt-0.5 text-[10px] text-white/55">
            {date}
          </div>
        </div>
      </div>
      {/* Secondary system strip */}
      <div className="relative mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2 text-[10px] tracking-[0.14em] text-white/65">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#1EE9B6]" /> ALL SYSTEMS NOMINAL
          </span>
          <span className="hidden opacity-50 sm:inline">|</span>
          <span className="hidden sm:inline">UPTIME 99.97%</span>
          <span className="hidden opacity-50 sm:inline">|</span>
          <span className="hidden sm:inline">SECURE TUNNEL · TLS 1.3</span>
        </div>
        <SimBadge ar className="text-[9px]" />
      </div>
    </header>
  );
}

/* ── KPI strip ────────────────────────────────────────────────────────── */
function KpiStrip() {
  const items = [
    {
      ar: "الحوادث المفتوحة",
      v: String(KPIS.openIncidents).padStart(2, "0"),
      d: "آخر 24 ساعة",
      up: false,
      c: C.red,
      Ic: AlertTriangle,
    },
    {
      ar: "التنبيهات النشطة",
      v: String(KPIS.activeAlerts).padStart(2, "0"),
      d: "تتطلّب اهتماماً",
      up: false,
      c: C.amber,
      Ic: ShieldAlert,
    },
    {
      ar: "المهام المنجزة",
      v: String(KPIS.completedTasks),
      d: "خلال اليوم",
      up: true,
      c: C.mint,
      Ic: ShieldCheck,
    },
    {
      ar: "الموظفون في الميدان",
      v: String(KPIS.activeStaff),
      d: "متصل الآن",
      up: true,
      c: C.cyan,
      Ic: Users,
    },
    {
      ar: "المحطات التشغيلية",
      v: `${KPIS.operational}/${KPIS.totalStations}`,
      d: "حالة الشبكة",
      up: true,
      c: C.violet,
      Ic: FileText,
    },
    {
      ar: "معدّل الامتثال",
      v: `${KPIS.compliancePct}%`,
      d: "إنجاز المهام",
      up: true,
      c: C.cyanLight,
      Ic: CheckCircle2,
    },
  ];
  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-px-4 px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((it) => (
        <div
          key={it.ar}
          className="relative w-[62%] shrink-0 snap-start overflow-hidden rounded-2xl border bg-[#061A2E]/55 p-3 backdrop-blur-xl xs:w-[46%] sm:w-[31%] md:w-[23%] lg:w-[15.5%]"
          style={{ borderColor: `color-mix(in oklab, ${it.c} 35%, transparent)` }}
        >
          <div className="flex items-start justify-between gap-2">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{
                background: `color-mix(in oklab, ${it.c} 18%, transparent)`,
                color: it.c,
                boxShadow: `0 0 20px color-mix(in oklab, ${it.c} 35%, transparent)`,
              }}
            >
              <it.Ic className="h-4 w-4" />
            </span>
            <div className="min-w-0 text-right">
              <div className="truncate text-[10px] text-white/70" title={it.ar}>
                {it.ar}
              </div>
              <div className="mt-0.5 text-2xl font-bold tabular-nums text-white">{it.v}</div>
            </div>
          </div>
          <div className="mt-2 text-right text-[10px]" style={{ color: it.up ? C.mint : C.amber }}>
            {it.up ? "↑" : "↓"} {it.d}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Stations network ─────────────────────────────────────────────────── */
function StationsPanel() {
  return (
    <Panel title="شبكة المحطات" icon={<Building className="h-4 w-4 text-[#3AE8FF]" />}>
      <ul className="grid grid-cols-2 gap-2">
        {STATIONS.map((s) => {
          const m = STATUS_META[s.status];
          return (
            <li
              key={s.code}
              className="flex items-center justify-between gap-2 rounded-xl border border-white/8 bg-black/25 px-3 py-2.5"
            >
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold text-white">{s.name}</div>
                <div className="text-[10px] tracking-widest text-white/45">
                  {s.code} · سعة {s.cap.toLocaleString("ar-SA")}
                </div>
              </div>
              <span
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{
                  color: m.c,
                  background: `color-mix(in oklab, ${m.c} 15%, transparent)`,
                }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.c }} />
                {m.label}
              </span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

/* ── Alerts feed ──────────────────────────────────────────────────────── */
function AlertsPanel() {
  return (
    <Panel title="التنبيهات الفورية" icon={<Bell className="h-4 w-4 text-[#FF9F1C]" />}>
      <ul className="space-y-2">
        {ALERTS.map((r) => (
          <li
            key={r.id}
            className="flex items-start gap-2.5 rounded-xl border border-white/8 bg-black/25 p-2.5"
          >
            <span
              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{
                background: `color-mix(in oklab, ${r.c} 18%, transparent)`,
                color: r.c,
                boxShadow: `0 0 18px color-mix(in oklab, ${r.c} 35%, transparent)`,
              }}
            >
              <r.Ic className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-white">{r.title}</div>
              <div className="text-[11px] text-white/60">{r.where}</div>
              <div className="mt-0.5 text-[10px] tracking-widest text-white/40">{r.since}</div>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/* ── Cameras (surveillance) ───────────────────────────────────────────── */
const CAMS = [
  { ar: "منى 1 — المحطة الرئيسية", g: "from-[#0a1b3a] to-[#1e3a5f]" },
  { ar: "عرفات — منطقة الخدمات", g: "from-[#0a1b3a] to-[#1a3c2a]" },
  { ar: "مزدلفة — محطة التبريد", g: "from-[#0a1b3a] to-[#2d2d4a]" },
  { ar: "منى 2 — المستودعات", g: "from-[#0a1b3a] to-[#3a1a2a]" },
] as const;

function CamerasPanel() {
  return (
    <Panel
      title="المراقبة"
      icon={<Camera className="h-4 w-4 text-[#1EE9B6]" />}
      action={
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#1EE9B6]/40 bg-[#1EE9B6]/10 px-2 py-0.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#1EE9B6]" />
          <span className="text-[10px] tracking-widest text-[#1EE9B6]">مباشر</span>
        </span>
      }
    >
      <div className="grid grid-cols-2 gap-2">
        {CAMS.map((c) => (
          <div
            key={c.ar}
            className={`relative aspect-[16/10] overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br ${c.g}`}
          >
            <div
              aria-hidden
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(52,182,255,.12) 1px,transparent 1px),linear-gradient(90deg,rgba(52,182,255,.12) 1px,transparent 1px)",
                backgroundSize: "18px 18px",
              }}
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_60%,rgba(52,182,255,.18),transparent_60%)]" />
            <div className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-black/50 px-1.5 py-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FF4D6D]" />
              <span className="text-[8px] tracking-widest text-white/80">REC</span>
            </div>
            <div className="absolute inset-x-1.5 bottom-1.5 rounded-md bg-black/55 px-2 py-1 backdrop-blur">
              <div className="truncate text-[10px] text-white">{c.ar}</div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ── Quick actions ────────────────────────────────────────────────────── */
const QUICK_ACTIONS = [
  { ar: "بلاغ حادث", c: C.red, Ic: FileWarning },
  { ar: "جولة تفتيشية", c: C.mint, Ic: ShieldCheck },
  { ar: "تصريح عمل", c: C.gold, Ic: FileText },
  { ar: "ملاحظة أمنية", c: C.cyan, Ic: StickyNote },
  { ar: "اتصل بالطوارئ", c: C.red, Ic: Phone },
] as const;

function QuickActions() {
  return (
    <Panel title="إجراءات سريعة" icon={<Radio className="h-4 w-4 text-[#34B6FF]" />}>
      <ul className="space-y-2">
        {QUICK_ACTIONS.map((a) => (
          <li key={a.ar}>
            <button
              type="button"
              className="flex min-h-11 w-full items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-right transition hover:-translate-x-0.5"
              style={{
                borderColor: `color-mix(in oklab, ${a.c} 45%, transparent)`,
                background: `color-mix(in oklab, ${a.c} 10%, transparent)`,
              }}
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ background: `color-mix(in oklab, ${a.c} 22%, transparent)`, color: a.c }}
              >
                <a.Ic className="h-4 w-4" />
              </span>
              <span className="text-[12px] text-white">{a.ar}</span>
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/* ── Weather ──────────────────────────────────────────────────────────── */
function WeatherWidget() {
  return (
    <Panel title="حالة الطقس" icon={<Cloud className="h-4 w-4 text-[#7DD3FC]" />}>
      <div className="text-center">
        <div className="text-[12px] text-white/70">منى</div>
        <div className="my-1 inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#F2C76E]/30 to-[#FF9F1C]/20">
          <Sun className="h-7 w-7 text-[#F2C76E]" />
        </div>
        <div className="text-3xl font-bold tabular-nums text-white">36°</div>
        <div className="text-[11px] text-white/60">مشمس</div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <span className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/5 bg-black/25 px-2 py-1.5 text-white/80">
          <Droplets className="h-3 w-3" />
          <span className="tabular-nums">12%</span>
        </span>
        <span className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/5 bg-black/25 px-2 py-1.5 text-white/80">
          <Wind className="h-3 w-3" />
          <span className="tabular-nums">6 كم/س</span>
        </span>
      </div>
    </Panel>
  );
}

/* ── Incident donut ───────────────────────────────────────────────────── */
function IncidentDonut() {
  const total = INCIDENTS.reduce((s, d) => s + d.value, 0);
  return (
    <Panel title="تحليل الحوادث" icon={<Activity className="h-4 w-4 text-[#34B6FF]" />}>
      <div className="grid grid-cols-[1fr_1.1fr] items-center gap-2">
        {/* Decorative viz — the same data is available as text in the legend
            list beside it, so hide the SVG segments from assistive tech. */}
        <div className="relative aspect-square" aria-hidden="true">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={INCIDENTS as unknown as Array<{ name: string; value: number }>}
                dataKey="value"
                nameKey="name"
                innerRadius="58%"
                outerRadius="92%"
                paddingAngle={3}
                stroke="none"
              >
                {INCIDENTS.map((d) => (
                  <Cell key={d.name} fill={d.c} />
                ))}
              </Pie>
              <Tooltip contentStyle={tt} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-2xl font-bold tabular-nums text-white">{total}</div>
            <div className="text-[10px] text-white/60">إجمالي الحوادث</div>
          </div>
        </div>
        <ul className="space-y-1.5">
          {INCIDENTS.map((d) => (
            <li key={d.name} className="flex items-center justify-between gap-2 text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: d.c }} />
                <span className="text-white/85">{d.name}</span>
              </span>
              <span className="tabular-nums text-white/70">
                {d.value} ({Math.round((d.value / total) * 100)}%)
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}

/* ── Risk gauge ───────────────────────────────────────────────────────── */
function RiskGauge() {
  const value = 0.55;
  const angle = -90 + 180 * value;
  return (
    <Panel title="مستوى المخاطر" icon={<ShieldAlert className="h-4 w-4 text-[#FF9F1C]" />}>
      <div className="relative mx-auto w-full max-w-xs" style={{ aspectRatio: "200 / 130" }}>
        <svg viewBox="0 0 200 120" className="h-full w-full">
          <defs>
            <linearGradient id="hajj-gauge" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={C.mint} />
              <stop offset="50%" stopColor={C.gold} />
              <stop offset="100%" stopColor={C.red} />
            </linearGradient>
          </defs>
          <path
            d="M20 100 A 80 80 0 0 1 180 100"
            stroke="rgba(255,255,255,.08)"
            strokeWidth="14"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M20 100 A 80 80 0 0 1 180 100"
            stroke="url(#hajj-gauge)"
            strokeWidth="14"
            fill="none"
            strokeLinecap="round"
          />
          <g transform={`rotate(${angle} 100 100)`}>
            <line
              x1="100"
              y1="100"
              x2="100"
              y2="32"
              stroke="#fff"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="100" cy="100" r="6" fill="#fff" />
          </g>
        </svg>
        <div className="pointer-events-none absolute inset-x-0 bottom-1 text-center">
          <div className="text-xl font-bold text-white">متوسط</div>
          <div className="text-[10px] text-white/60">المستوى الحالي</div>
        </div>
        <div className="absolute inset-x-2 bottom-0 flex justify-between text-[10px] text-white/50">
          <span>منخفض</span>
          <span>عالٍ</span>
        </div>
      </div>
    </Panel>
  );
}

/* ── Compliance area chart ────────────────────────────────────────────── */
function ComplianceChart() {
  return (
    <Panel
      title="الامتثال والسلامة"
      icon={<CheckCircle2 className="h-4 w-4 text-[#1EE9B6]" />}
      action={<span className="text-xl font-bold tabular-nums text-white">97%</span>}
    >
      <div className="aspect-[16/9] w-full">
        <ResponsiveContainer>
          <AreaChart data={COMPLIANCE} margin={{ top: 8, right: 6, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="hajj-ca" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.cyan} stopOpacity={0.5} />
                <stop offset="100%" stopColor={C.cyan} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="d"
              stroke="#7a8aa3"
              fontSize={9}
              tickLine={false}
              axisLine={false}
              minTickGap={20}
            />
            <YAxis
              stroke="#7a8aa3"
              fontSize={9}
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
              ticks={[0, 50, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip contentStyle={tt} />
            <Area
              type="monotone"
              dataKey="v"
              stroke={C.cyan}
              strokeWidth={2}
              fill="url(#hajj-ca)"
              dot={{ fill: C.cyan, r: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

/* ── Root ─────────────────────────────────────────────────────────────── */
export function HajjCommandDashboard() {
  return (
    <div dir="rtl" className="flex flex-col gap-3 sm:gap-4">
      <HeaderStrip />
      <KpiStrip />
      {/* Horizontal-only layout: every row scrolls sideways on all devices. */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div
          tabIndex={0}
          role="group"
          aria-label="المحطات والتنبيهات — تمرير أفقي"
          className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>*]:w-[88%] [&>*]:shrink-0 [&>*]:snap-start"
        >
          <StationsPanel />
          <AlertsPanel />
        </div>
        <CamerasPanel />
        <div
          tabIndex={0}
          role="group"
          aria-label="مؤشرات المخاطر والامتثال — تمرير أفقي"
          className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>*]:w-[85%] [&>*]:shrink-0 [&>*]:snap-start"
        >
          <IncidentDonut />
          <RiskGauge />
          <ComplianceChart />
        </div>
        <aside
          tabIndex={0}
          aria-label="إجراءات سريعة والطقس — تمرير أفقي"
          className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>*]:w-[80%] [&>*]:shrink-0 [&>*]:snap-start"
        >
          <QuickActions />
          <WeatherWidget />
        </aside>
      </div>
    </div>
  );
}

export default HajjCommandDashboard;
