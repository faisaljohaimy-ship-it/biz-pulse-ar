/**
 * Digital Twin primitives · التوأم الرقمي — spec: docs/motion/05 §Digital
 * Twin + docs/components/03 (Twin card zone rules).
 *
 * Sector color comes exclusively from src/lib/regions.ts (the single
 * source). Pulses mean LIVE data — a non-live element never pulses.
 */
import * as React from "react";
import { cn } from "@/lib/utils";
import { REGION_ACCENT_RGB, getRegion, type RegionId } from "@/lib/regions";
import { type NxStatus } from "../kpi/nx-kpi";

export interface NxRegionPulseProps extends React.HTMLAttributes<HTMLSpanElement> {
  regionId: RegionId;
  /** Live telemetry flowing — only then does the halo breathe. */
  live?: boolean;
  size?: number;
}

/** NxRegionPulse — the sector heartbeat halo. */
export const NxRegionPulse = React.forwardRef<HTMLSpanElement, NxRegionPulseProps>(
  ({ className, regionId, live = false, size = 40, ...props }, ref) => {
    const rgb = REGION_ACCENT_RGB[regionId];
    const region = getRegion(regionId);
    return (
      <span
        ref={ref}
        role="img"
        aria-label={`${region.shortAr}${live ? " — مباشر" : ""}`}
        data-region={regionId}
        data-live={live || undefined}
        className={cn("relative inline-flex items-center justify-center", className)}
        style={{ width: size, height: size }}
        {...props}
      >
        <span
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{
            boxShadow: `0 0 ${size * 0.8}px rgb(${rgb} / 0.3)`,
            border: `2px solid rgb(${rgb} / 0.6)`,
            animation: live
              ? `nx-breathe var(--nx-loop-pulse-sector) var(--nx-ease-inout) infinite`
              : undefined,
          }}
        />
        <span
          aria-hidden
          className="size-2 rounded-full"
          style={{ backgroundColor: `rgb(${rgb})` }}
        />
      </span>
    );
  },
);
NxRegionPulse.displayName = "NxRegionPulse";

export interface NxTwinLinkProps extends Omit<React.SVGAttributes<SVGSVGElement>, "from" | "to"> {
  from: { x: number; y: number };
  to: { x: number; y: number };
  /** Data flowing — dash-drift runs only while true (energy-flow license). */
  active?: boolean;
  width: number;
  height: number;
}

/** NxTwinLink — a connection line between twin assets with licensed flow. */
export function NxTwinLink({
  from,
  to,
  active = false,
  width,
  height,
  className,
  ...props
}: NxTwinLinkProps) {
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={cn("text-nx-layer-twin/60 overflow-visible", className)}
      {...props}
    >
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke="currentColor"
        strokeWidth={1.5}
        strokeDasharray={active ? "6 6" : undefined}
        style={active ? { animation: "nx-dash-drift 3s linear infinite" } : undefined}
      />
      {/* keyframes nx-dash-drift are local to this component's usage */}
      <style>{`@keyframes nx-dash-drift { to { stroke-dashoffset: -12; } }`}</style>
    </svg>
  );
}

export interface NxTwinNodeProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  status: NxStatus;
  /** Status change flashes once via key remount — no standing animation. */
}

const NODE_RING: Record<NxStatus, string> = {
  success: "border-nx-success/70",
  warning: "border-nx-warning/70",
  critical: "border-nx-critical/70",
  info: "border-nx-info/70",
};

const NODE_WORD: Record<NxStatus, string> = {
  success: "سليم",
  warning: "تحذير",
  critical: "حرج",
  info: "معلومة",
};

/** NxTwinNode — an asset marker with triple-coded status. */
export const NxTwinNode = React.forwardRef<HTMLDivElement, NxTwinNodeProps>(
  ({ className, name, status, ...props }, ref) => (
    <div
      ref={ref}
      data-status={status}
      className={cn("inline-flex flex-col items-center gap-1", className)}
      {...props}
    >
      <span
        className={cn(
          "size-6 rounded-full border-2 bg-nx-ink transition-[border-color] duration-[var(--nx-anim-slow)] ease-[var(--nx-ease-out)]",
          NODE_RING[status],
        )}
        aria-hidden
      />
      <span className="text-[11px] text-nx-pearl/72">{name}</span>
      <span className="sr-only">{NODE_WORD[status]}</span>
    </div>
  ),
);
NxTwinNode.displayName = "NxTwinNode";
