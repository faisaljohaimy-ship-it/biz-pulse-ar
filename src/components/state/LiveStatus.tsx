import { cn } from "@/lib/utils";
import { Activity, Loader2, Radio, Search, RefreshCw, Cpu, CheckCircle2, Moon } from "lucide-react";

export type LiveStatusVariant =
  | "initializing"
  | "monitoring"
  | "queued"
  | "discovering"
  | "syncing"
  | "processing"
  | "live"
  | "idle";

const VARIANTS: Record<LiveStatusVariant, { label: string; icon: typeof Activity; cls: string; dot: string; pulse: boolean }> = {
  initializing: { label: "Initializing", icon: Loader2, cls: "text-cyan-300 border-cyan-500/30 bg-cyan-500/10", dot: "bg-cyan-400", pulse: true },
  monitoring:   { label: "Monitoring",   icon: Radio,    cls: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10", dot: "bg-emerald-400", pulse: true },
  queued:       { label: "Queued",       icon: Activity, cls: "text-slate-300 border-slate-500/30 bg-slate-500/10", dot: "bg-slate-400", pulse: false },
  discovering:  { label: "Discovering",  icon: Search,   cls: "text-sky-300 border-sky-500/30 bg-sky-500/10", dot: "bg-sky-400", pulse: true },
  syncing:      { label: "Syncing",      icon: RefreshCw,cls: "text-indigo-300 border-indigo-500/30 bg-indigo-500/10", dot: "bg-indigo-400", pulse: true },
  processing:   { label: "Processing",   icon: Cpu,      cls: "text-amber-300 border-amber-500/30 bg-amber-500/10", dot: "bg-amber-400", pulse: true },
  live:         { label: "Live",         icon: CheckCircle2, cls: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10", dot: "bg-emerald-400", pulse: true },
  idle:         { label: "Idle",         icon: Moon,     cls: "text-muted-foreground border-border/40 bg-muted/10", dot: "bg-muted-foreground", pulse: false },
};

export type LiveStatusProps = {
  variant?: LiveStatusVariant;
  label?: string;
  hint?: string;
  className?: string;
  size?: "sm" | "md";
};

/**
 * Token-driven live status indicator. Replaces blank/empty UI states with an
 * operational signal: initializing → monitoring → live, etc.
 */
export function LiveStatus({ variant = "monitoring", label, hint, className, size = "md" }: LiveStatusProps) {
  const v = VARIANTS[variant];
  const Icon = v.icon;
  const spin = variant === "initializing" || variant === "syncing";
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border font-mono",
        v.cls,
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs",
        className,
      )}
    >
      <span className="relative inline-flex">
        <span className={cn("size-1.5 rounded-full", v.dot)} />
        {v.pulse ? <span className={cn("absolute inset-0 size-1.5 rounded-full animate-ping opacity-60", v.dot)} /> : null}
      </span>
      <Icon className={cn(size === "sm" ? "size-3" : "size-3.5", spin && "animate-spin")} />
      <span className="tracking-wider uppercase">{label ?? v.label}</span>
      {hint ? <span className="text-muted-foreground normal-case font-sans">— {hint}</span> : null}
    </div>
  );
}

export function LiveStatusBlock({
  variant = "monitoring",
  title,
  hint,
  lastSync,
  className,
}: {
  variant?: LiveStatusVariant;
  title: string;
  hint?: string;
  lastSync?: string | Date | null;
  className?: string;
}) {
  const ts = lastSync ? new Date(lastSync).toLocaleTimeString() : null;
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-8 text-center", className)}>
      <LiveStatus variant={variant} />
      <div className="space-y-1">
        <div className="text-sm text-foreground/80">{title}</div>
        {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
        {ts ? <div className="text-[10px] text-muted-foreground font-mono">last sync · {ts}</div> : null}
      </div>
    </div>
  );
}
