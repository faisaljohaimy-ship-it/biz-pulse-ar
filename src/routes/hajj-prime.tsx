// منصة نُسك الحج — Hajj Nexus Command Shell
//
// Native, full-viewport command shell that mirrors the Industrial Security
// dashboard visual system (dark navy backdrop · glass KPI cards with corner
// brackets · header block with calligraphic module mark + live clock +
// hijri date · status strip · right-rail command console in RTL).
//
// All numeric values come from Supabase via getHajjPublicOverview. When
// data is unavailable the UI shows an honest "— لا بيانات بعد" empty
// state — no invented KPIs.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Bell,
  Search,
  Radio,
  Home,
  Users,
  Radar,
  AlertTriangle,
  FileText,
  Activity,
  Users2,
  CheckCircle2,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { getHajjPublicOverview, type HajjPublicKpi } from "@/lib/hajj-public.functions";

// ─── DESIGN TOKENS (mirrors the Industrial Security reference) ─────────
const NAVY_BASE = "#050B1A";
const NAVY_DEEP = "#02060F";
const NAVY_GLASS = "rgba(10, 22, 44, 0.55)";
const CYAN = "#3AE8FF";
const CYAN_SOFT = "rgba(58, 232, 255, 0.55)";
const EMERALD = "#34D399";

type Tone = "blue" | "purple" | "green" | "orange" | "red";
const TONE: Record<Tone, { ring: string; glow: string; text: string; bracket: string }> = {
  blue:   { ring: "rgba(56,189,248,0.55)",  glow: "rgba(56,189,248,0.28)",  text: "#7DD3FC", bracket: "#38BDF8" },
  purple: { ring: "rgba(167,139,250,0.55)", glow: "rgba(167,139,250,0.28)", text: "#C4B5FD", bracket: "#A78BFA" },
  green:  { ring: "rgba(52,211,153,0.55)",  glow: "rgba(52,211,153,0.28)",  text: "#6EE7B7", bracket: "#34D399" },
  orange: { ring: "rgba(251,146,60,0.55)",  glow: "rgba(251,146,60,0.28)",  text: "#FDBA74", bracket: "#FB923C" },
  red:    { ring: "rgba(244,63,94,0.55)",   glow: "rgba(244,63,94,0.28)",   text: "#FDA4AF", bracket: "#F43F5E" },
};

// ─── LIVE CLOCK (client-only, hydration-safe) ──────────────────────────
function useNow(): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

function formatClock(d: Date | null): string {
  if (!d) return "--:--:--";
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function formatHijri(d: Date | null): string {
  if (!d) return "";
  try {
    return new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
      day: "numeric", month: "long", year: "numeric",
    }).format(d);
  } catch { return ""; }
}

function formatGregorianAr(d: Date | null): string {
  if (!d) return "";
  try {
    return new Intl.DateTimeFormat("ar-SA", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    }).format(d);
  } catch { return ""; }
}

// ─── HAJJ YEAR (fixed cinematic label — no fabricated computation) ─────
const HAJJ_YEAR_LABEL = "حج ١٤٤٧ هـ";

// ─── FORMATTERS ────────────────────────────────────────────────────────
function fmtNum(v: number | null | undefined, pad = 0): string {
  if (v == null) return "—";
  const s = Math.trunc(v).toString();
  return pad > 0 ? s.padStart(pad, "0") : s;
}
function fmtPct(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${Math.round(v)}%`;
}
function fmtRatio(a: number | null | undefined, b: number | null | undefined): string {
  if (a == null || b == null) return "—";
  return `${a}/${b}`;
}

// ─── SUB-COMPONENTS ────────────────────────────────────────────────────

// Corner-bracket wrapper for glass cards — mirrors reference visuals.
function CornerBrackets({ color }: { color: string }) {
  const b: React.CSSProperties = {
    position: "absolute",
    width: 14, height: 14,
    borderColor: color,
    borderStyle: "solid",
    pointerEvents: "none",
    opacity: 0.9,
  };
  return (
    <>
      <span style={{ ...b, top: 6, insetInlineStart: 6, borderWidth: "1.5px 0 0 1.5px" }} />
      <span style={{ ...b, top: 6, insetInlineEnd: 6, borderWidth: "1.5px 1.5px 0 0" }} />
      <span style={{ ...b, bottom: 6, insetInlineStart: 6, borderWidth: "0 0 1.5px 1.5px" }} />
      <span style={{ ...b, bottom: 6, insetInlineEnd: 6, borderWidth: "0 1.5px 1.5px 0" }} />
    </>
  );
}

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  pad,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  tone: Tone;
  pad?: number;
}) {
  const t = TONE[tone];
  return (
    <div
      className="relative overflow-hidden rounded-2xl border p-3 sm:p-4 min-h-[120px] flex flex-col justify-between"
      style={{
        background:
          "linear-gradient(180deg, rgba(10,22,44,0.65) 0%, rgba(6,14,30,0.6) 100%)",
        borderColor: t.ring,
        boxShadow: `0 0 32px -12px ${t.glow}, inset 0 0 0 1px rgba(255,255,255,0.03)`,
        backdropFilter: "blur(14px) saturate(140%)",
      }}
    >
      <CornerBrackets color={t.bracket} />
      <div className="flex items-start justify-between gap-2">
        <span
          className="text-[10px] sm:text-[11px] font-semibold uppercase leading-tight"
          style={{ letterSpacing: "0.14em", color: "rgba(220,240,255,0.72)", fontFamily: 'var(--font-arabic, "IBM Plex Sans Arabic")' }}
        >
          {label}
        </span>
        <span
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md"
          style={{ backgroundColor: `${t.glow}`, color: t.bracket }}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div
          className="tabular-nums font-black leading-none"
          style={{
            fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
            color: t.text,
            textShadow: `0 0 24px ${t.glow}`,
            fontFamily: '"Space Grotesk", ui-sans-serif',
          }}
        >
          {pad ? fmtNum(Number(value === "—" ? NaN : value), pad) : value}
        </div>
        <div
          className="text-[10px] sm:text-[11px] pb-1 opacity-80"
          style={{ color: "rgba(200,220,240,0.65)", fontFamily: 'var(--font-arabic, "IBM Plex Sans Arabic")' }}
        >
          ↑ {hint}
        </div>
      </div>
    </div>
  );
}

// ─── HEADER BLOCK (top, RTL) ───────────────────────────────────────────
function HeaderBlock({ now }: { now: Date | null }) {
  return (
    <header
      dir="rtl"
      className="grid gap-4 border-b px-3 py-3 sm:px-6 sm:py-4"
      style={{
        borderColor: "rgba(56,189,248,0.14)",
        gridTemplateColumns: "1fr",
        background:
          "linear-gradient(180deg, rgba(4,10,22,0.9) 0%, rgba(5,11,26,0.55) 100%)",
        backdropFilter: "blur(20px)",
      }}
    >
      <div className="grid grid-cols-1 items-center gap-4 lg:grid-cols-[1fr_auto_1fr]">
        {/* RIGHT — entity in RTL (visual right) */}
        <div className="flex min-w-0 items-center justify-start gap-3 lg:justify-end">
          <div
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
            style={{
              background: "linear-gradient(135deg, #0EA5E9 0%, #22D3EE 100%)",
              boxShadow: "0 0 24px rgba(34,211,238,0.45)",
            }}
          >
            <span className="text-lg font-black text-slate-950">ن</span>
          </div>
          <div className="min-w-0">
            <div
              className="truncate text-sm font-bold sm:text-base"
              style={{ color: "#E6F7FF", fontFamily: 'var(--font-arabic, "IBM Plex Sans Arabic")' }}
            >
              منصة نُسك الحج
            </div>
            <div
              className="truncate text-[9px] sm:text-[10px] font-semibold uppercase"
              style={{ color: CYAN, letterSpacing: "0.22em", fontFamily: '"Space Grotesk", ui-sans-serif' }}
            >
              Hajj Nexus · Field Operations
            </div>
          </div>
        </div>

        {/* CENTER — calligraphic module mark + clock */}
        <div className="flex flex-col items-center justify-center text-center">
          <div
            className="leading-none"
            style={{
              fontSize: "clamp(2rem, 6vw, 3.25rem)",
              fontFamily: '"Aref Ruqaa", "Amiri", "Reem Kufi", serif',
              fontWeight: 700,
              background: "linear-gradient(180deg, #E6F7FF 0%, #7DD3FC 55%, #38BDF8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              color: "transparent",
              textShadow: "0 0 40px rgba(56,189,248,0.4)",
            }}
          >
            نُسك
          </div>
          <div
            className="mt-1 text-[9px] sm:text-[10px] font-bold uppercase"
            style={{ color: "rgba(180,220,255,0.75)", letterSpacing: "0.28em", fontFamily: '"Space Grotesk", ui-sans-serif' }}
          >
            Pilgrim Operations Command Platform
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: EMERALD, boxShadow: `0 0 8px ${EMERALD}` }}
            />
            <span
              className="text-[10px] sm:text-[11px] font-bold uppercase"
              style={{ color: EMERALD, letterSpacing: "0.22em", fontFamily: '"Space Grotesk", ui-sans-serif' }}
            >
              LIVE ·
            </span>
            <span
              suppressHydrationWarning
              className="tabular-nums text-sm sm:text-base font-bold"
              style={{ color: "#E6F7FF", fontFamily: '"Space Grotesk", ui-sans-serif', letterSpacing: "0.05em" }}
            >
              {formatClock(now)}
            </span>
            <span
              className="text-[10px] sm:text-[11px] font-bold"
              style={{ color: "rgba(220,240,255,0.7)", fontFamily: 'var(--font-arabic, "IBM Plex Sans Arabic")' }}
            >
              · {HAJJ_YEAR_LABEL}
            </span>
          </div>
        </div>

        {/* LEFT — controls */}
        <div className="flex items-center justify-end gap-2 lg:justify-start">
          <button
            type="button"
            aria-label="بحث"
            className="grid h-10 w-10 place-items-center rounded-full border transition hover:border-cyan-400/70"
            style={{ borderColor: "rgba(56,189,248,0.35)", background: NAVY_GLASS, color: CYAN_SOFT, minHeight: 44, minWidth: 44 }}
          >
            <Search className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="التنبيهات"
            className="grid h-10 w-10 place-items-center rounded-full border transition hover:border-cyan-400/70"
            style={{ borderColor: "rgba(56,189,248,0.35)", background: NAVY_GLASS, color: CYAN_SOFT, minHeight: 44, minWidth: 44 }}
          >
            <Bell className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded-full border px-3 py-2 text-[11px] font-bold uppercase transition hover:border-cyan-400/70"
            style={{ borderColor: "rgba(56,189,248,0.35)", background: NAVY_GLASS, color: CYAN_SOFT, letterSpacing: "0.14em", fontFamily: '"Space Grotesk", ui-sans-serif', minHeight: 44 }}
          >
            EN
          </button>
        </div>
      </div>

      {/* Date line */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[10px] sm:text-[11px]" style={{ color: "rgba(180,220,255,0.55)" }}>
        <span suppressHydrationWarning style={{ fontFamily: 'var(--font-arabic, "IBM Plex Sans Arabic")' }}>
          {formatHijri(now)}
        </span>
        <span suppressHydrationWarning style={{ fontFamily: 'var(--font-arabic, "IBM Plex Sans Arabic")' }}>
          {formatGregorianAr(now)}
        </span>
      </div>
    </header>
  );
}

// ─── STATUS STRIP ──────────────────────────────────────────────────────
function StatusStrip() {
  return (
    <div
      dir="ltr"
      className="flex items-center gap-6 overflow-x-auto whitespace-nowrap border-b px-3 py-2 text-[10px] sm:text-[11px] sm:px-6"
      style={{
        borderColor: "rgba(56,189,248,0.10)",
        background: "linear-gradient(180deg, rgba(5,11,26,0.6) 0%, rgba(5,11,26,0.2) 100%)",
        color: "rgba(180,220,255,0.7)",
        fontFamily: '"Space Grotesk", ui-sans-serif',
        letterSpacing: "0.16em",
        scrollbarWidth: "thin",
      }}
    >
      <span className="font-semibold uppercase">
        NETWORK · <span style={{ color: CYAN }}>SECURE TUNNEL</span>
      </span>
      <span aria-hidden style={{ color: "rgba(120,160,200,0.4)" }}>|</span>
      <span className="font-semibold uppercase flex items-center gap-2">
        ALL SYSTEMS NOMINAL
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: EMERALD, boxShadow: `0 0 8px ${EMERALD}` }}
        />
      </span>
    </div>
  );
}

// ─── COMMAND CONSOLE RAIL ──────────────────────────────────────────────
const RAIL_ITEMS: Array<{
  key: string;
  label_ar: string;
  label_en: string;
  icon: React.ComponentType<{ className?: string }>;
  active?: boolean;
}> = [
  { key: "home",    label_ar: "الرئيسية",       label_en: "Home",     icon: Home,    active: true },
  { key: "pilgs",   label_ar: "الحجاج",         label_en: "Pilgrims", icon: Users },
  { key: "field",   label_ar: "الفرق الميدانية", label_en: "Field",    icon: Radar },
  { key: "alerts",  label_ar: "التنبيهات",       label_en: "Alerts",   icon: AlertTriangle },
  { key: "reports", label_ar: "التقارير",        label_en: "Reports",  icon: FileText },
];

function CommandRail({ variant }: { variant: "side" | "bottom" }) {
  if (variant === "bottom") {
    return (
      <nav
        dir="rtl"
        aria-label="وحدة القيادة"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 gap-1 border-t px-2 pt-2"
        style={{
          borderColor: "rgba(56,189,248,0.14)",
          background: "linear-gradient(180deg, rgba(5,11,26,0.9) 0%, rgba(2,6,15,0.95) 100%)",
          backdropFilter: "blur(20px)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 6px)",
        }}
      >
        {RAIL_ITEMS.map((it) => {
          const Icon = it.icon;
          return (
            <button
              key={it.key}
              type="button"
              className="flex flex-col items-center justify-center gap-1 rounded-lg py-1.5 transition"
              style={{
                background: it.active ? "linear-gradient(135deg, rgba(14,165,233,0.35), rgba(34,211,238,0.2))" : "transparent",
                color: it.active ? "#E6F7FF" : "rgba(180,220,255,0.65)",
                minHeight: 44,
                boxShadow: it.active ? "0 0 20px -8px rgba(34,211,238,0.5)" : "none",
                border: it.active ? "1px solid rgba(56,189,248,0.4)" : "1px solid transparent",
              }}
            >
              <Icon className="h-4 w-4" />
              <span className="text-[10px] font-semibold" style={{ fontFamily: 'var(--font-arabic, "IBM Plex Sans Arabic")' }}>
                {it.label_ar}
              </span>
            </button>
          );
        })}
      </nav>
    );
  }

  return (
    <aside
      dir="rtl"
      aria-label="وحدة القيادة"
      className="hidden lg:flex lg:flex-col lg:gap-3 lg:p-4"
      style={{
        width: 240,
        background: "linear-gradient(180deg, rgba(5,11,26,0.55) 0%, rgba(2,6,15,0.35) 100%)",
        borderInlineStart: "1px solid rgba(56,189,248,0.12)",
      }}
    >
      <div>
        <div
          className="text-[10px] font-bold uppercase"
          style={{ color: CYAN, letterSpacing: "0.22em", fontFamily: '"Space Grotesk", ui-sans-serif' }}
        >
          Command Console
        </div>
        <div
          className="text-sm font-bold"
          style={{ color: "#E6F7FF", fontFamily: 'var(--font-arabic, "IBM Plex Sans Arabic")' }}
        >
          وحدة القيادة
        </div>
      </div>
      <div className="mt-2 flex flex-col gap-1.5">
        {RAIL_ITEMS.map((it) => {
          const Icon = it.icon;
          return (
            <button
              key={it.key}
              type="button"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-right transition"
              style={{
                background: it.active
                  ? "linear-gradient(90deg, rgba(14,165,233,0.35) 0%, rgba(34,211,238,0.15) 100%)"
                  : "transparent",
                color: it.active ? "#E6F7FF" : "rgba(200,220,255,0.72)",
                border: it.active ? "1px solid rgba(56,189,248,0.45)" : "1px solid transparent",
                boxShadow: it.active ? "0 0 20px -6px rgba(34,211,238,0.5)" : "none",
                minHeight: 44,
              }}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-sm font-semibold" style={{ fontFamily: 'var(--font-arabic, "IBM Plex Sans Arabic")' }}>
                {it.label_ar}
              </span>
              <span className="text-[9px] uppercase opacity-60" style={{ letterSpacing: "0.14em", fontFamily: '"Space Grotesk", ui-sans-serif' }}>
                {it.label_en}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

// ─── KPI GRID ──────────────────────────────────────────────────────────
function KpiGrid({ kpi, isLoading }: { kpi: HajjPublicKpi | undefined; isLoading: boolean }) {
  const hasData = !isLoading && kpi?.has_data === true;

  const val = (v: number | null | undefined, fallback = "—") =>
    hasData && v != null ? String(v) : fallback;

  const ratio = hasData
    ? fmtRatio(kpi?.stations_online, kpi?.stations_total)
    : "—";

  return (
    <div
      dir="rtl"
      className="grid gap-3 sm:gap-4"
      style={{
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
      }}
    >
      <KpiCard
        label="الحجاج في الميدان"
        value={val(kpi?.field_staff)}
        hint="متصل الآن"
        icon={Users2}
        tone="blue"
      />
      <KpiCard
        label="الفرق النشطة"
        value={ratio}
        hint="حالة الشبكة"
        icon={Activity}
        tone="purple"
      />
      <KpiCard
        label="المهام المنجزة اليوم"
        value={val(kpi?.tasks_done_today)}
        hint="خلال اليوم"
        icon={CheckCircle2}
        tone="green"
      />
      <KpiCard
        label="التنبيهات النشطة"
        value={hasData && kpi?.active_alerts != null ? fmtNum(kpi.active_alerts, 2) : "—"}
        hint="تتطلب اهتماماً"
        icon={ShieldAlert}
        tone="orange"
      />
      <KpiCard
        label="الحوادث المفتوحة"
        value={hasData && kpi?.open_incidents != null ? fmtNum(kpi.open_incidents, 2) : "—"}
        hint="آخر 24 ساعة"
        icon={AlertTriangle}
        tone="red"
      />
    </div>
  );
}

function EmptyBanner({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div
      dir="rtl"
      className="mb-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] sm:text-xs"
      style={{
        borderColor: "rgba(251,146,60,0.35)",
        background: "rgba(251,146,60,0.08)",
        color: "#FDBA74",
        fontFamily: 'var(--font-arabic, "IBM Plex Sans Arabic")',
      }}
    >
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      <span>— لا بيانات بعد. البيانات ستُعرض فور توفّرها من وحدة القيادة.</span>
    </div>
  );
}

function SampleBanner({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div
      dir="rtl"
      className="mb-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] sm:text-xs"
      style={{
        borderColor: "rgba(56,189,248,0.35)",
        background: "rgba(56,189,248,0.08)",
        color: CYAN,
        fontFamily: 'var(--font-arabic, "IBM Plex Sans Arabic")',
      }}
    >
      <Radio className="h-3.5 w-3.5 shrink-0" />
      <span>بيئة محاكاة — العرض يستخدم لقطة عرض توضيحية من قاعدة بيانات NEXIOS.</span>
    </div>
  );
}

// ─── ROOT ──────────────────────────────────────────────────────────────
function HajjPrimeShell() {
  const now = useNow();
  const fetchOverview = useServerFn(getHajjPublicOverview);
  const query = useQuery<HajjPublicKpi>({
    queryKey: ["hajj-public-overview"],
    queryFn: () => fetchOverview(),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const [entered, setEntered] = useState(false);
  useEffect(() => {
    // Body scroll lock for the takeover shell.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Fade shell in on next frame for a clean handoff from the loading state.
    const id = window.requestAnimationFrame(() => setEntered(true));
    return () => {
      document.body.style.overflow = prev;
      window.cancelAnimationFrame(id);
    };
  }, []);

  const loading = query.isPending;
  const kpi = query.data;
  const noData = !loading && kpi?.has_data === false;
  const isSample = !loading && kpi?.is_sample === true;

  return (
    <div
      dir="rtl"
      className="dark"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100dvh",
        overflow: "hidden",
        background: `radial-gradient(1200px 800px at 75% -10%, rgba(56,189,248,0.10) 0%, transparent 55%), radial-gradient(900px 600px at 15% 110%, rgba(167,139,250,0.08) 0%, transparent 60%), linear-gradient(180deg, ${NAVY_BASE} 0%, ${NAVY_DEEP} 100%)`,
        color: "#E6F7FF",
        colorScheme: "dark",
        fontFamily: 'var(--font-arabic, "IBM Plex Sans Arabic"), "Space Grotesk", ui-sans-serif',
      }}
    >
      {/* Slim top bar with back — safe-area aware */}
      <div
        className="flex items-center justify-between px-3 sm:px-4"
        style={{
          height: 48,
          paddingTop: "env(safe-area-inset-top, 0px)",
          borderBottom: "1px solid rgba(56,189,248,0.10)",
          background: "rgba(2,6,15,0.85)",
          backdropFilter: "blur(16px)",
          position: "relative",
          zIndex: 30,
        }}
      >
        <Link
          to="/"
          aria-label="رجوع إلى Neexios"
          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase transition hover:border-cyan-400/70"
          style={{
            borderColor: "rgba(56,189,248,0.35)",
            background: NAVY_GLASS,
            color: CYAN_SOFT,
            letterSpacing: "0.14em",
            fontFamily: '"Space Grotesk", ui-sans-serif',
            minHeight: 32,
          }}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>رجوع</span>
        </Link>
        <div
          className="text-[10px] font-bold uppercase"
          style={{ color: CYAN, letterSpacing: "0.24em", fontFamily: '"Space Grotesk", ui-sans-serif' }}
        >
          <Zap className="me-1 inline h-3 w-3" />
          Hajj Nexus · Command Shell
        </div>
      </div>

      {/* Shell body */}
      <div
        className="grid h-[calc(100dvh-48px)] w-full"
        style={{
          gridTemplateColumns: "1fr",
          opacity: entered ? 1 : 0,
          transition: "opacity 400ms ease",
        }}
      >
        <div className="grid lg:[grid-template-columns:1fr_240px]">
          {/* MAIN */}
          <main className="flex min-h-0 min-w-0 flex-col overflow-y-auto" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 88px)" }}>
            <HeaderBlock now={now} />
            <StatusStrip />
            <section className="p-3 sm:p-6">
              <EmptyBanner visible={noData} />
              <SampleBanner visible={isSample} />
              <KpiGrid kpi={kpi} isLoading={loading} />

              {/* Ops summary panel — real numbers only */}
              <div
                dir="rtl"
                className="mt-4 grid gap-3 rounded-2xl border p-4 sm:mt-6"
                style={{
                  borderColor: "rgba(56,189,248,0.18)",
                  background: "linear-gradient(180deg, rgba(10,22,44,0.5) 0%, rgba(6,14,30,0.4) 100%)",
                  backdropFilter: "blur(14px) saturate(140%)",
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div
                    className="text-sm font-bold"
                    style={{ color: "#E6F7FF", fontFamily: 'var(--font-arabic, "IBM Plex Sans Arabic")' }}
                  >
                    معدّل الامتثال التشغيلي
                  </div>
                  <div
                    className="tabular-nums text-lg font-black"
                    style={{ color: TONE.green.text, textShadow: `0 0 20px ${TONE.green.glow}`, fontFamily: '"Space Grotesk", ui-sans-serif' }}
                  >
                    {loading ? "…" : fmtPct(kpi?.compliance_pct ?? null)}
                  </div>
                </div>
                <div
                  className="h-2 w-full overflow-hidden rounded-full"
                  style={{ background: "rgba(56,189,248,0.12)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.max(0, Math.min(100, kpi?.compliance_pct ?? 0))}%`,
                      background: `linear-gradient(90deg, ${TONE.green.bracket} 0%, ${CYAN} 100%)`,
                      boxShadow: `0 0 12px ${TONE.green.glow}`,
                    }}
                  />
                </div>
                <div
                  className="text-[10px] uppercase"
                  style={{ color: "rgba(180,220,255,0.55)", letterSpacing: "0.18em", fontFamily: '"Space Grotesk", ui-sans-serif' }}
                >
                  <span suppressHydrationWarning>
                    آخر مزامنة: {kpi?.snapshot_at ? new Date(kpi.snapshot_at).toLocaleString("ar-SA") : "—"}
                  </span>
                </div>
              </div>
            </section>
          </main>

          {/* Right rail (RTL) — desktop only */}
          <CommandRail variant="side" />
        </div>
      </div>

      {/* Mobile bottom command bar */}
      <div className="lg:hidden">
        <CommandRail variant="bottom" />
      </div>

      {/* Branded loading — only until first render frame */}
      {!entered && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none"
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
            background: `linear-gradient(180deg, ${NAVY_BASE} 0%, ${NAVY_DEEP} 100%)`,
            zIndex: 60,
          }}
        >
          <div
            aria-hidden
            style={{
              width: 64,
              height: 64,
              borderRadius: "9999px",
              border: "3px solid rgba(16, 185, 129, 0.18)",
              borderTopColor: "#34D399",
              borderRightColor: "#10B981",
              animation: "hajj-spin 900ms linear infinite",
              boxShadow: "0 0 40px rgba(16,185,129,0.35)",
            }}
          />
          <div
            style={{
              fontFamily: 'var(--font-arabic, "IBM Plex Sans Arabic")',
              fontSize: 16,
              fontWeight: 700,
              color: "#E6FFF6",
            }}
          >
            جارٍ فتح منصة نُسك الحج…
          </div>
        </div>
      )}

      <style>{`
        @keyframes hajj-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export const Route = createFileRoute("/hajj-prime")({
  component: HajjPrimeShell,
  head: () => ({
    meta: [
      { title: "منصة نُسك الحج · Hajj Nexus Command — NEXIOS" },
      { name: "description", content: "منصة نُسك الحج — وحدة القيادة التشغيلية لعمليات الحج بواجهة NEXIOS الصناعية." },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "color-scheme", content: "dark" },
      { name: "theme-color", content: "#050B1A" },
      { property: "og:title", content: "منصة نُسك الحج · Hajj Nexus Command" },
      { property: "og:description", content: "وحدة القيادة التشغيلية لعمليات الحج داخل منظومة NEXIOS." },
      { property: "og:url", content: "https://neexios.com/hajj-prime" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "canonical", href: "https://neexios.com/hajj-prime" },
      // Calligraphic Arabic serif + Space Grotesk for HUD numerals
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Aref+Ruqaa:wght@400;700&family=Space+Grotesk:wght@500;700;900&display=swap",
      },
    ],
  }),
});
