import { useEffect, useMemo, useState } from "react";
import {
  Maximize2,
  Minimize2,
  Radio,
  ExternalLink,
  Moon,
  AlertTriangle,
  CheckCircle2,
  Users,
  Activity,
  MapPin,
  Sparkles,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

// External Hajj Nusuk platform — kept as its own standalone deployment,
// intentionally NOT merged into the neexios.com domain.
const HAJJ_PLATFORM_URL = "https://hajj-nexus-prime.lovable.app/";

/**
 * LiveSystemShowcase — inline Hajj Nexus preview card.
 *
 * Notes
 * -----
 *  • No external iframe. The previous version embedded hajj.neexios.com
 *    which is served with `X-Frame-Options: deny`, so viewers were
 *    stuck on an "Opening…" spinner forever.
 *  • This card is a real preview rendered from live-styled data
 *    (deterministic values so SSR = client) with a direct link to the
 *    full internal command center at /hajj.
 *  • Permanent dark chrome, RTL-safe, no layout shift.
 */
export function LiveSystemShowcase() {
  const [expanded, setExpanded] = useState(true);
  const { locale } = useI18n();
  const ar = locale === "ar";

  // Deterministic KPI snapshot for the preview card (never Math.random —
  // that produces a hydration mismatch). Real numbers live in /hajj.
  const snapshot = useMemo(
    () => ({
      openIncidents: 3,
      activeAlerts: 5,
      tasksDone: 128,
      staff: 412,
      stations: { online: 22, total: 24 },
      compliance: 96,
    }),
    [],
  );

  // Tiny animated tick so the card reads as "live" without any network.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => (n + 1) % 1000), 1200);
    return () => window.clearInterval(id);
  }, []);

  const sites = useMemo(
    () => [
      { key: "mina", ar: "منى", en: "Mina", x: 62, y: 42, tone: "safe" as const },
      { key: "muzdalifah", ar: "مزدلفة", en: "Muzdalifah", x: 48, y: 58, tone: "safe" as const },
      { key: "arafat", ar: "عرفات", en: "Arafat", x: 32, y: 72, tone: "alert" as const },
      { key: "jamarat", ar: "الجمرات", en: "Jamarat", x: 70, y: 34, tone: "safe" as const },
      {
        key: "haram",
        ar: "المسجد الحرام",
        en: "Grand Mosque",
        x: 78,
        y: 62,
        tone: "safe" as const,
      },
    ],
    [],
  );

  const toneCls = {
    safe: "border-emerald-400/70 bg-emerald-400/15 text-emerald-200",
    alert: "border-amber-400/70 bg-amber-400/15 text-amber-200",
    danger: "border-rose-400/70 bg-rose-400/15 text-rose-200",
  } as const;

  return (
    <section
      dir={ar ? "rtl" : "ltr"}
      className="relative z-10 mx-auto mt-8 w-full max-w-7xl px-4 sm:mt-12 sm:px-6"
      aria-label={ar ? "معاينة نظام الحج المباشرة" : "Hajj system live preview"}
    >
      <div className="flex w-full justify-center">
        {/* Ambient halo */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[280px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.28),transparent_65%)] blur-3xl sm:h-[320px] sm:w-[520px]" />

        <div
          className={`group relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-b from-[#02101e] via-[#04111f] to-[#02101e] shadow-[0_0_50px_-10px_hsl(var(--primary)/0.55),inset_0_0_40px_hsl(var(--primary)/0.08)] backdrop-blur-xl transition-all duration-500 ${
            expanded ? "w-full max-w-6xl" : "w-full max-w-[520px]"
          }`}
          style={{ colorScheme: "dark" }}
        >
          {/* Conic animated border */}
          <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-50 [background:conic-gradient(from_0deg,transparent_0deg,hsl(var(--primary)/0.45)_60deg,transparent_120deg,transparent_240deg,hsl(var(--primary)/0.45)_300deg,transparent_360deg)] [animation:spin_22s_linear_infinite] [mask:linear-gradient(#000,#000)_content-box,linear-gradient(#000,#000)] [mask-composite:exclude] p-[1px]" />

          {/* Title bar */}
          <div
            dir="ltr"
            className="relative flex items-center justify-between gap-2 border-b border-white/10 bg-black/40 px-3 py-2"
          >
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57] shadow-[0_0_6px_rgba(255,95,87,0.7)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e] shadow-[0_0_6px_rgba(254,188,46,0.7)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840] shadow-[0_0_6px_rgba(40,200,64,0.7)]" />
            </div>

            <div className="flex flex-1 items-center justify-center">
              <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/50 px-2.5 py-1 text-[10px] text-white/70">
                <Moon
                  className="h-3 w-3 shrink-0 text-primary drop-shadow-[0_0_6px_hsl(var(--primary)/0.9)]"
                  aria-hidden
                />
                <span className="text-center">
                  {ar ? "مركز قيادة الحج · مشاعر 1447" : "Hajj Command · Mashaer 1447"}
                </span>
                <Radio
                  className="h-2.5 w-2.5 shrink-0 animate-pulse text-emerald-400"
                  aria-hidden
                />
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="rounded-md border border-white/10 bg-white/5 p-1 text-white/70 transition hover:bg-white/10 hover:text-white"
                aria-label={expanded ? (ar ? "تصغير" : "Minimize") : ar ? "تكبير" : "Maximize"}
              >
                {expanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
              </button>
              <a
                href={HAJJ_PLATFORM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-1.5 py-1 text-[10px] font-semibold text-white transition hover:bg-primary/20"
                aria-label={ar ? "فتح منصة الحج في نافذة جديدة" : "Open Hajj platform in new tab"}
              >
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
          </div>

          {/* Preview stage — real inline UI, not an iframe */}
          <div
            className="relative w-full overflow-hidden"
            style={{ backgroundColor: "#04111f", colorScheme: "dark" }}
          >
            {/* KPI strip — top toolbar, never overlapping the map */}
            <div className="flex flex-wrap items-center gap-1.5 border-b border-white/10 bg-black/50 px-3 py-2 sm:gap-2">
              <KpiChip
                icon={AlertTriangle}
                tone="rose"
                label={ar ? "حوادث" : "Incidents"}
                value={snapshot.openIncidents}
              />
              <KpiChip
                icon={Radio}
                tone="amber"
                label={ar ? "تنبيهات" : "Alerts"}
                value={snapshot.activeAlerts}
              />
              <KpiChip
                icon={CheckCircle2}
                tone="emerald"
                label={ar ? "منجزة" : "Done"}
                value={snapshot.tasksDone}
              />
              <KpiChip
                icon={Users}
                tone="cyan"
                label={ar ? "ميداني" : "Field"}
                value={snapshot.staff}
              />
              <KpiChip
                icon={Activity}
                tone="cyan"
                label={ar ? "محطات" : "Stations"}
                value={`${snapshot.stations.online}/${snapshot.stations.total}`}
              />
              <KpiChip
                icon={Sparkles}
                tone="emerald"
                label={ar ? "امتثال" : "Compliance"}
                value={`${snapshot.compliance}%`}
              />
            </div>

            {/* Map canvas */}
            <div className="relative aspect-[16/11] w-full sm:aspect-[16/9]">
              {/* Grid backdrop */}
              <svg
                aria-hidden
                className="absolute inset-0 h-full w-full opacity-20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <pattern
                    id="hajj-preview-grid"
                    width="40"
                    height="40"
                    patternUnits="userSpaceOnUse"
                  >
                    <path d="M40 0H0V40" fill="none" stroke="currentColor" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect
                  width="100%"
                  height="100%"
                  fill="url(#hajj-preview-grid)"
                  className="text-primary"
                />
              </svg>

              {/* Radial glows */}
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,hsl(var(--primary)/0.15),transparent_60%),radial-gradient(circle_at_70%_65%,hsl(var(--primary)/0.10),transparent_55%)]" />

              {/* Site markers */}
              {sites.map((s) => (
                <div
                  key={s.key}
                  className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${s.x}%`, top: `${s.y}%` }}
                >
                  <div className="relative flex flex-col items-center">
                    <span
                      className={`relative block size-3 rounded-full border sm:size-4 ${toneCls[s.tone]}`}
                    >
                      <span
                        className={`absolute inset-0 rounded-full ${toneCls[s.tone]} animate-ping opacity-60`}
                      />
                    </span>
                    <div
                      className={`mt-1 whitespace-nowrap rounded border px-1.5 py-0.5 text-[9px] font-medium backdrop-blur-md sm:px-2 sm:text-[10px] ${toneCls[s.tone]}`}
                    >
                      {ar ? s.ar : s.en}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom action row */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-black/50 px-3 py-2.5">
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/50">
                {ar ? "منصة مستقلة · نُسك الحج" : "Standalone · Nusuk Hajj"}
              </span>
              <a
                href={HAJJ_PLATFORM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-primary/60 bg-primary/15 px-4 py-1.5 text-xs font-semibold text-white shadow-[0_6px_24px_hsl(var(--primary)/0.25)] transition hover:border-primary hover:bg-primary/25"
              >
                <MapPin className="h-3.5 w-3.5" />
                {ar ? "فتح منصة نُسك الحج" : "Open Hajj Nusuk Platform"}
                <ExternalLink className="h-3 w-3 opacity-80" />
              </a>
            </div>

            {/* FR-19: static "LIVE/Live/TLS 1.3" badges removed — no verified Evidence source on this surface. */}
          </div>
        </div>
      </div>
    </section>
  );
}

function KpiChip({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: typeof Activity;
  tone: "rose" | "amber" | "emerald" | "cyan";
  label: string;
  value: number | string;
}) {
  const cls = {
    rose: "border-rose-500/40 text-rose-200",
    amber: "border-amber-500/40 text-amber-200",
    emerald: "border-emerald-500/40 text-emerald-200",
    cyan: "border-cyan-500/40 text-cyan-200",
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border bg-black/45 px-2 py-1 text-[10px] font-semibold tabular-nums backdrop-blur ${cls}`}
    >
      <Icon className="h-3 w-3 opacity-80" aria-hidden />
      <span className="opacity-75">{label}</span>
      <span>{value}</span>
    </span>
  );
}
