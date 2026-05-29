import type { ReactNode } from "react";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

/* ───────────────────────── Ambient layers ───────────────────────── */

function ParticleField() {
  const dots = useMemo(
    () =>
      Array.from({ length: 36 }).map((_, i) => ({
        left: (Math.sin(i * 12.9898) * 43758.5453) % 1,
        size: (i % 5 === 0 ? 2 : 1) + (i % 3),
        delay: (i % 11) * 0.9,
        dur: 9 + (i % 7) * 1.4,
      })),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {dots.map((d, i) => (
        <span
          key={i}
          className="absolute bottom-0 rounded-full bg-cyan-300/70"
          style={{
            left: `${Math.abs(d.left) * 100}%`,
            width: d.size,
            height: d.size,
            filter: "blur(0.4px)",
            boxShadow: "0 0 8px rgba(34,211,238,0.8)",
            animation: `drift-up ${d.dur}s linear ${d.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

function Starfield() {
  const stars = useMemo(
    () =>
      Array.from({ length: 60 }).map((_, i) => {
        const x = Math.abs((Math.sin(i * 92.13) * 43758.5453) % 1) * 100;
        const y = Math.abs((Math.cos(i * 17.7) * 43758.5453) % 1) * 100;
        return { x, y, r: i % 6 === 0 ? 1.4 : 0.6, o: 0.2 + (i % 5) * 0.12 };
      }),
    [],
  );
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full">
      {stars.map((s, i) => (
        <circle
          key={i}
          cx={`${s.x}%`}
          cy={`${s.y}%`}
          r={s.r}
          fill="white"
          opacity={s.o}
        />
      ))}
    </svg>
  );
}

/* ───────────────────────────── Page ─────────────────────────────── */

export function NexusPage({
  eyebrow,
  title,
  subtitle,
  children,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] overflow-hidden bg-[#04060f] text-slate-200">
      {/* Background field */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-cyan-500/15 blur-[120px]" />
        <div className="absolute -top-24 right-1/4 h-96 w-96 rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute bottom-0 left-1/2 h-80 w-[80%] -translate-x-1/2 rounded-full bg-cyan-400/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.10),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(59,130,246,0.08),transparent_55%)]" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(34,211,238,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.4) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage:
              "radial-gradient(ellipse at center, black 30%, transparent 80%)",
          }}
        />
        <Starfield />
        <ParticleField />
        {/* vignette */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.55) 100%)",
          }}
        />
        {/* scanlines */}
        <div className="scanlines absolute inset-0 opacity-40 mix-blend-overlay" />
      </div>

      <div className="relative z-10 p-4 md:p-8 space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            {eyebrow && (
              <div className="inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.35em] text-cyan-300/80">
                <span className="h-1 w-1 rounded-full bg-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
                {eyebrow}
              </div>
            )}
            <h1 className="mt-1 bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-2xl font-bold tracking-tight text-transparent md:text-3xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 max-w-3xl text-sm text-slate-400">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
        {children}
      </div>
    </div>
  );
}

export function NexusCard({
  className,
  children,
  glow,
}: {
  className?: string;
  children: ReactNode;
  glow?: boolean;
}) {
  return (
    <div
      className={cn(
        "holo-edge group relative overflow-hidden rounded-2xl border border-cyan-400/15 bg-[#06101f]/70 p-5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-300/35",
        glow && "shadow-exec",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
      <div
        className="pointer-events-none absolute -inset-x-12 -top-12 h-32 -rotate-12 bg-gradient-to-r from-transparent via-cyan-300/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      />
      <div className="relative">{children}</div>
    </div>
  );
}

export function NexusPill({
  tone = "cyan",
  children,
}: {
  tone?: "cyan" | "amber" | "rose" | "emerald" | "violet" | "slate";
  children: ReactNode;
}) {
  const tones: Record<string, string> = {
    cyan: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
    amber: "border-amber-400/30 bg-amber-400/10 text-amber-300",
    rose: "border-rose-400/30 bg-rose-400/10 text-rose-300",
    emerald: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    violet: "border-violet-400/30 bg-violet-400/10 text-violet-300",
    slate: "border-slate-500/30 bg-slate-500/10 text-slate-300",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function NexusStat({
  label,
  value,
  hint,
  tone = "cyan",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "cyan" | "emerald" | "amber" | "rose" | "violet";
}) {
  const colors: Record<string, string> = {
    cyan: "text-cyan-300",
    emerald: "text-emerald-300",
    amber: "text-amber-300",
    rose: "text-rose-300",
    violet: "text-violet-300",
  };
  return (
    <NexusCard>
      <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        {label}
      </div>
      <div className={cn("mt-2 text-2xl font-bold", colors[tone])}>{value}</div>
      {hint && <div className="mt-1 text-[11px] text-slate-500">{hint}</div>}
    </NexusCard>
  );
}
