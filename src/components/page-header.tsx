import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  badge,
  actions,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  badge?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <Icon className="h-5 w-5 text-primary-foreground" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
            {badge && (
              <span className="rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Section({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("space-y-6 p-4 md:p-8", className)}>{children}</section>;
}

export function ModuleCard({
  icon: Icon,
  title,
  description,
  tag,
  children,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  tag?: string;
  children?: ReactNode;
}) {
  return (
    <div className="group rounded-2xl border border-border bg-card/60 p-5 shadow-elevated backdrop-blur transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-glow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
          )}
          <div className="text-sm font-semibold">{title}</div>
        </div>
        {tag && (
          <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
            {tag}
          </span>
        )}
      </div>
      {description && <p className="mt-2 text-xs text-muted-foreground">{description}</p>}
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}
