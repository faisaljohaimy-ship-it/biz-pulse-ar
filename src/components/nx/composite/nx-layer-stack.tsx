/**
 * NxLayerStack · مكدّس الطبقات — spec: docs/design/03 §5 (layer palette) +
 * docs/components/07 (chips as panel-grade surfaces).
 *
 * The five architectural strata of the SADEED runtime rendered as a closed
 * chip row. Purely presentational: the runtime itself is frozen — this is a
 * mirror, never a control surface. Pulse is licensed only on the active
 * layer (presence loop, motion doc 03); everything else is static.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export type NxStackLayerId =
  | "executive-shell"
  | "intelligence"
  | "platform"
  | "agents"
  | "output-gateway";

export const STACK_LAYER_LABEL: Record<NxStackLayerId, string> = {
  "executive-shell": "الصدفة التنفيذية",
  intelligence: "الذكاء التنفيذي",
  platform: "منصة التشغيل",
  agents: "شبكة الوكلاء",
  "output-gateway": "بوابة المخرجات",
};

/** Order is the architecture's order — first chip is the outermost stratum. */
export const STACK_LAYER_ORDER: readonly NxStackLayerId[] = [
  "executive-shell",
  "intelligence",
  "platform",
  "agents",
  "output-gateway",
];

const CHIP_ACCENT: Record<NxStackLayerId, string> = {
  "executive-shell": "border-nx-layer-shell/40 text-nx-layer-shell",
  intelligence: "border-nx-layer-knowledge/40 text-nx-layer-knowledge",
  platform: "border-nx-layer-runtime/40 text-nx-layer-runtime",
  agents: "border-nx-layer-agent/40 text-nx-layer-agent",
  "output-gateway": "border-nx-layer-analytics/40 text-nx-layer-analytics",
};

export interface NxLayerStackProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The stratum currently carrying work — the only chip allowed to breathe. */
  activeLayer?: NxStackLayerId | null;
  /** When provided, chips become real buttons and clicking selects a layer. */
  onSelectLayer?: (id: NxStackLayerId) => void;
}

export const NxLayerStack = React.forwardRef<HTMLDivElement, NxLayerStackProps>(
  ({ className, activeLayer = null, onSelectLayer, ...props }, ref) => (
    <div
      ref={ref}
      role="list"
      aria-label="طبقات نظام التشغيل"
      className={cn("flex flex-wrap items-center gap-2", className)}
      {...props}
    >
      {STACK_LAYER_ORDER.map((id) => {
        const active = id === activeLayer;
        const chipClass = cn(
          "nx-glass-e1 rounded-nx-8 inline-flex items-center gap-2 border px-3 py-1.5 text-xs font-medium",
          CHIP_ACCENT[id],
          active && "nx-anim-breathe shadow-[var(--nx-glow-focus)]",
          onSelectLayer &&
            "min-h-11 cursor-pointer transition-[border-color,box-shadow] duration-[var(--nx-anim-fast)] ease-[var(--nx-ease-out)] hover:border-current/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nx-cyan",
        );
        const content = (
          <>
            <span aria-hidden className="size-1.5 rounded-full bg-current" />
            {STACK_LAYER_LABEL[id]}
            {active ? <span className="sr-only">— نشطة الآن</span> : null}
          </>
        );
        return onSelectLayer ? (
          <span key={id} role="listitem" className="inline-flex">
            <button
              type="button"
              data-layer={id}
              data-active={active || undefined}
              aria-pressed={active}
              onClick={() => onSelectLayer(id)}
              className={chipClass}
            >
              {content}
            </button>
          </span>
        ) : (
          <span
            key={id}
            role="listitem"
            data-layer={id}
            data-active={active || undefined}
            className={chipClass}
          >
            {content}
          </span>
        );
      })}
    </div>
  ),
);
NxLayerStack.displayName = "NxLayerStack";
