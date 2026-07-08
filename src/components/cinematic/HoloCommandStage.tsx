import {
  ShieldAlert,
  Camera,
  KeyRound,
  Activity,
  Wrench,
  Users,
  Radio,
  Gauge,
  Hexagon,
  Boxes,
  SignalHigh,
  Network,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExecKpis } from "@/lib/sec.functions";

/**
 * HoloCommandStage — NEXUS holographic Executive Command Center backdrop.
 *
 * Pure SVG / CSS hologram (no static avatar, no ARIA branding). Renders a
 * central rotating core with concentric halo rings, an orbiting Digital Twin
 * status constellation, and floating live KPI cards anchored around the
 * stage. All visible numbers are bound to real `ExecKpis` data.
 *
 * GPU-accelerated transforms only (translate / rotate / opacity) for 60 FPS.
 * Pointer-events disabled so the layer sits behind the interactive shell.
 */
export function HoloCommandStage({
  isAr = true,
  k,
  status,
}: {
  isAr?: boolean;
  k: ExecKpis | undefined;
  status: "OPTIMAL" | "ELEVATED" | "ALERT" | "INITIALIZING";
}) {
  const num = (v: number | undefined) =>
    v === undefined ? "—" : v.toLocaleString(isAr ? "ar-SA" : "en-US");
  const pct = (v: number | undefined) => (v === undefined ? "—" : `${Math.round(v)}%`);

  const widgets: Array<{
    icon: typeof ShieldAlert;
    label: string;
    value: string;
    pos: string;
    tone: string;
    text: string;
  }> = [
    {
      icon: ShieldAlert,
      label: isAr ? "حوادث مفتوحة" : "Open Incidents",
      value: `${num(k?.incidents_open)} · ${num(k?.incidents_critical)} ${isAr ? "حرجة" : "crit"}`,
      pos: "top-[6%] start-[3%]",
      tone: "from-rose-400/30 to-rose-600/10",
      text: "text-rose-200",
    },
    {
      icon: Camera,
      label: isAr ? "كاميرات نشطة" : "CCTV Online",
      value: `${num(k?.cameras_online)}/${num(k?.cameras_total)}`,
      pos: "top-[16%] end-[4%]",
      tone: "from-cyan-400/30 to-blue-600/10",
      text: "text-cyan-100",
    },
    {
      icon: Activity,
      label: isAr ? "مؤشر المخاطر" : "Risk Index",
      value: pct(k?.risk_index),
      pos: "top-[4%] end-[22%]",
      tone: "from-orange-400/30 to-orange-600/10",
      text: "text-orange-100",
    },
    {
      icon: Gauge,
      label: isAr ? "الجاهزية التنفيذية" : "Executive Readiness",
      value: pct(k?.executive_readiness),
      pos: "top-[40%] end-[1%]",
      tone: "from-emerald-400/30 to-emerald-600/10",
      text: "text-emerald-100",
    },
    {
      icon: KeyRound,
      label: isAr ? "تصاريح نشطة" : "Active Permits",
      value: num(k?.permits_active),
      pos: "top-[40%] start-[1%]",
      tone: "from-amber-400/30 to-amber-600/10",
      text: "text-amber-100",
    },
    {
      icon: Radio,
      label: isAr ? "دوريات ميدانية" : "Field Patrols",
      value: `${num(k?.patrols_active)} · ${pct(k?.patrol_completion)}`,
      pos: "bottom-[14%] start-[5%]",
      tone: "from-violet-400/30 to-violet-600/10",
      text: "text-violet-100",
    },
    {
      icon: Wrench,
      label: isAr ? "أوامر الصيانة" : "Work Orders",
      value: num(k?.wo_open),
      pos: "bottom-[16%] end-[4%]",
      tone: "from-pink-400/30 to-pink-600/10",
      text: "text-pink-100",
    },
    {
      icon: Users,
      label: isAr ? "زوار في الموقع" : "Visitors Inside",
      value: `${num(k?.visitors_inside)} · ${num(k?.contractors_active)} ${isAr ? "مقاول" : "ctr"}`,
      pos: "top-[66%] end-[18%]",
      tone: "from-sky-400/30 to-sky-600/10",
      text: "text-sky-100",
    },
  ];

  // Digital Twin status nodes orbiting the core
  const twin: Array<{
    icon: typeof Hexagon;
    label: string;
    value: string;
    deg: number;
    text: string;
  }> = [
    {
      icon: Network,
      label: isAr ? "مواقع" : "Sites",
      value: `${k?.sites_operational ?? 0}/${k?.sites_total ?? 0}`,
      deg: -90,
      text: "text-cyan-200",
    },
    { icon: Camera, label: "CCTV", value: pct(k?.cctv_health), deg: -30, text: "text-emerald-200" },
    {
      icon: KeyRound,
      label: isAr ? "البوابات" : "Gates",
      value: `${k?.gates_online ?? 0}/${k?.gates_total ?? 0}`,
      deg: 30,
      text: "text-amber-200",
    },
    {
      icon: Boxes,
      label: isAr ? "الحساسات" : "Sensors",
      value: `${k?.sensors_total ?? 0}`,
      deg: 90,
      text: "text-violet-200",
    },
    {
      icon: Activity,
      label: isAr ? "السلامة" : "Safety",
      value: pct(k?.safety_index),
      deg: 150,
      text: "text-rose-200",
    },
    {
      icon: SignalHigh,
      label: isAr ? "الوصول" : "Access",
      value: pct(k?.access_health),
      deg: 210,
      text: "text-sky-200",
    },
  ];

  const statusTone =
    status === "OPTIMAL"
      ? "text-emerald-300"
      : status === "ELEVATED"
        ? "text-amber-300"
        : status === "ALERT"
          ? "text-rose-300"
          : "text-cyan-200";

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[1] overflow-hidden"
      dir={isAr ? "rtl" : "ltr"}
    >
      {/* Volumetric backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,184,217,0.20),transparent_65%)]" />
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(110,231,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(110,231,255,0.08) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />

      {/* Halo rings + Core */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative h-[min(720px,82vh)] w-[min(720px,82vh)]">
          {/* outer ring */}
          <svg
            className="absolute inset-0 h-full w-full opacity-80"
            viewBox="0 0 400 400"
            style={{ animation: "aria-spin-slow 90s linear infinite" }}
          >
            <defs>
              <radialGradient id="hcs-halo" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(58,232,255,0.45)" />
                <stop offset="55%" stopColor="rgba(0,184,217,0.12)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0)" />
              </radialGradient>
            </defs>
            <circle cx="200" cy="200" r="195" fill="url(#hcs-halo)" />
            <circle
              cx="200"
              cy="200"
              r="195"
              fill="none"
              stroke="rgba(110,231,255,0.5)"
              strokeWidth="0.4"
              strokeDasharray="1 6"
            />
            <circle
              cx="200"
              cy="200"
              r="160"
              fill="none"
              stroke="rgba(110,231,255,0.35)"
              strokeWidth="0.5"
            />
            <circle
              cx="200"
              cy="200"
              r="125"
              fill="none"
              stroke="rgba(110,231,255,0.25)"
              strokeWidth="0.5"
              strokeDasharray="3 8"
            />
            {Array.from({ length: 32 }).map((_, i) => {
              const a = (i / 32) * Math.PI * 2;
              return (
                <circle
                  key={i}
                  cx={200 + Math.cos(a) * 195}
                  cy={200 + Math.sin(a) * 195}
                  r={i % 4 === 0 ? 2 : 1}
                  fill="rgba(110,231,255,0.85)"
                />
              );
            })}
          </svg>
          {/* counter-rotating ring */}
          <svg
            className="absolute inset-0 h-full w-full opacity-60"
            viewBox="0 0 400 400"
            style={{ animation: "aria-spin-slow 60s linear infinite reverse" }}
          >
            <circle
              cx="200"
              cy="200"
              r="180"
              fill="none"
              stroke="rgba(58,232,255,0.55)"
              strokeWidth="0.6"
              strokeDasharray="2 18"
            />
            <circle
              cx="200"
              cy="200"
              r="145"
              fill="none"
              stroke="rgba(58,232,255,0.4)"
              strokeWidth="0.5"
              strokeDasharray="6 90"
            />
          </svg>

          {/* Inner NEXUS core */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ animation: "aria-holo-float 9s ease-in-out infinite" }}
          >
            <div className="relative flex h-[230px] w-[230px] items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(0,212,255,0.55),rgba(0,184,217,0.15)_60%,transparent_75%)] blur-2xl" />
              <div className="absolute inset-6 rounded-full border border-cyan-300/40" />
              <div className="absolute inset-12 rounded-full border border-cyan-200/30" />
              <div className="absolute inset-[60px] rounded-full border border-cyan-100/40 bg-[radial-gradient(circle,rgba(0,212,255,0.35),rgba(4,18,31,0.6)_70%)] shadow-[inset_0_0_40px_rgba(110,231,255,0.4)]" />
              <div className="relative z-10 text-center leading-none">
                <div className="text-[9px] tracking-[0.4em] text-cyan-200/70 font-mono">NEXUS</div>
                <div className={cn("mt-1 text-[11px] tracking-[0.3em] font-mono", statusTone)}>
                  {status}
                </div>
                <div className="mt-3 text-3xl font-bold tabular-nums text-cyan-100">
                  {pct(k?.executive_readiness)}
                </div>
                <div className="mt-1 text-[9px] tracking-[0.3em] text-cyan-200/60 font-mono">
                  {isAr ? "الجاهزية" : "READINESS"}
                </div>
              </div>
              {/* travelling scanline */}
              <div
                className="absolute inset-x-0 h-16 mix-blend-screen pointer-events-none rounded-full"
                style={{
                  background:
                    "linear-gradient(180deg, transparent, rgba(110,231,255,0.45), transparent)",
                  animation: "aria-holo-scan 6s ease-in-out infinite",
                }}
              />
            </div>
          </div>

          {/* Digital Twin orbiting nodes */}
          {twin.map((t, i) => {
            const Icon = t.icon;
            const r = 46; // % from center
            const x = 50 + r * Math.cos((t.deg * Math.PI) / 180);
            const y = 50 + r * Math.sin((t.deg * Math.PI) / 180);
            return (
              <div
                key={i}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  animation: `aria-holo-float ${7 + (i % 3)}s ease-in-out ${i * 0.3}s infinite`,
                }}
              >
                <div className="flex items-center gap-2 rounded-lg border border-cyan-300/30 bg-[#04121f]/70 px-2.5 py-1.5 backdrop-blur-xl shadow-[0_0_20px_-5px_rgba(58,232,255,0.5)]">
                  <Icon className={cn("h-3.5 w-3.5", t.text)} />
                  <div className="leading-none">
                    <div className="text-[8px] uppercase tracking-[0.2em] text-white/50 font-mono">
                      {t.label}
                    </div>
                    <div className={cn("text-[11px] font-semibold tabular-nums", t.text)}>
                      {t.value}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* floating live KPI widgets — desktop only */}
      <div className="absolute inset-0 hidden lg:block">
        {widgets.map((w, i) => {
          const Icon = w.icon;
          return (
            <div
              key={i}
              className={cn(
                "absolute flex w-[180px] items-center gap-2.5 rounded-xl border border-cyan-300/25 bg-gradient-to-br px-3 py-2.5 backdrop-blur-xl",
                w.pos,
                w.tone,
              )}
              style={{
                boxShadow:
                  "0 10px 40px -10px rgba(58,232,255,0.45), inset 0 0 30px rgba(110,231,255,0.08)",
                animation: `aria-holo-float ${6 + (i % 4)}s ease-in-out ${i * 0.4}s infinite`,
              }}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-300/30 bg-[#04121f]/70">
                <Icon className={cn("h-4 w-4", w.text)} />
              </div>
              <div className="min-w-0 leading-tight text-start">
                <div
                  className={cn(
                    "truncate text-[9px] text-white/55",
                    isAr ? "font-medium" : "uppercase tracking-[0.22em]",
                  )}
                >
                  {w.label}
                </div>
                <div className={cn("truncate text-[12px] font-semibold tabular-nums", w.text)}>
                  {w.value}
                </div>
              </div>
              <span className="absolute -left-[3px] -top-[3px] h-2 w-2 border-l border-t border-cyan-300/70" />
              <span className="absolute -right-[3px] -top-[3px] h-2 w-2 border-r border-t border-cyan-300/70" />
              <span className="absolute -left-[3px] -bottom-[3px] h-2 w-2 border-b border-l border-cyan-300/70" />
              <span className="absolute -right-[3px] -bottom-[3px] h-2 w-2 border-b border-r border-cyan-300/70" />
            </div>
          );
        })}
      </div>

      {/* vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,#04060d_98%)]" />
    </div>
  );
}
