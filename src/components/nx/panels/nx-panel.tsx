/**
 * NxPanel · اللوح — spec: docs/components/07-panels.md
 *
 * The atomic composition unit: header (≤3-word title + slot) · one-idea
 * content · provenance footer. Layer accents telegraph the architectural
 * stratum; density switches the padding register.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export type NxLayer = "runtime" | "shell" | "agent" | "knowledge" | "twin" | "analytics";
export type NxDensity = "boardroom" | "command" | "operations";

const LAYER_BORDER: Record<NxLayer, string> = {
  runtime: "border-t-2 border-t-nx-layer-runtime/24",
  shell: "border-t-2 border-t-nx-layer-shell/24",
  agent: "border-t-2 border-t-nx-layer-agent/24",
  knowledge: "border-t-2 border-t-nx-layer-knowledge/24",
  twin: "border-t-2 border-t-nx-layer-twin/24",
  analytics: "border-t-2 border-t-nx-layer-analytics/24",
};

const DENSITY_PADDING: Record<NxDensity, string> = {
  boardroom: "p-8",
  command: "p-6",
  operations: "p-4",
};

export interface NxPanelProps extends React.HTMLAttributes<HTMLElement> {
  title: string;
  layer?: NxLayer;
  density?: NxDensity;
  /** Header trailing slot (status chip / action). */
  headerSlot?: React.ReactNode;
  /** Provenance footer: time + source class (Standards §7 four truths). */
  footer?: React.ReactNode;
}

export const NxPanel = React.forwardRef<HTMLElement, NxPanelProps>(
  (
    { className, title, layer, density = "command", headerSlot, footer, children, ...props },
    ref,
  ) => (
    <section
      ref={ref}
      aria-label={title}
      data-density={density}
      className={cn(
        "nx-glass-e1 rounded-nx-16 flex flex-col",
        layer && LAYER_BORDER[layer],
        className,
      )}
      {...props}
    >
      <header className="flex h-12 shrink-0 items-center justify-between gap-2 px-6">
        <h3 className="text-lg font-semibold text-nx-pearl">{title}</h3>
        {headerSlot}
      </header>
      <div className={cn("flex-1", DENSITY_PADDING[density], "pt-0")}>{children}</div>
      {footer ? (
        <footer className="flex h-10 shrink-0 items-center justify-between px-6 text-xs text-nx-pearl/56">
          {footer}
        </footer>
      ) : null}
    </section>
  ),
);
NxPanel.displayName = "NxPanel";
