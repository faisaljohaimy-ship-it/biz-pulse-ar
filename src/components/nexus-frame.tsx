import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

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
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.10),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(59,130,246,0.08),transparent_55%)]" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(34,211,238,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.4) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
      </div>

      <div className="relative z-10 p-4 md:p-8 space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            {eyebrow && (
              <div className="text-[10px] font-bold tracking-[0.35em] text-cyan-300/80">
                {eyebrow}
              </div>
            )}
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white md:text-3xl">
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
        "relative rounded-2xl border border-cyan-400/15 bg-[#06101f]/70 p-5 backdrop-blur-xl",
        glow && "shadow-[0_0_40px_-12px_rgba(34,211,238,0.45)]",
        className,
      )}
    >
      {children}
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
