/**
 * Adaptive Agent Layout — Phase 9 (Unified Multi-Device).
 *
 * The same agent ecosystem renders on every device, only the presentation
 * adapts:
 *   • Desktop / Laptop  → full circular ring around ARIA
 *   • Tablet            → tightened ring (auto radius)
 *   • Mobile portrait   → swipeable executive carousel below the ARIA stage
 *
 * No feature disappears at any breakpoint — every agent is reachable and
 * the spotlight, click handler, and ARIA stage are preserved end-to-end.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { BridgeAgent } from "@/lib/exec/bridge.functions";
import { AgentNode } from "./AgentNode";

interface Props {
  agents: BridgeAgent[];
  ar: boolean;
  /** Preferred outer ring radius. Auto-fits to container on smaller screens. */
  radius?: number;
  /** Diameter of the central reserved area for ARIA. */
  centerSize?: number;
  spotlightId?: string | null;
  children?: React.ReactNode;
  onAgentClick?: (agent: BridgeAgent) => void;
}

const NODE_WIDTH = 140; // approximate AgentNode width (used for clearance math)
const CAROUSEL_BREAKPOINT = 560; // px — below this we drop the ring

export function AgentRing({
  agents,
  ar,
  radius: preferredRadius = 240,
  centerSize: preferredCenter = 280,
  spotlightId,
  children,
  onAgentClick,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [containerW, setContainerW] = useState<number>(0);

  useLayoutEffect(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current;
    const measure = () => setContainerW(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Compute the largest radius that fits the container with node clearance.
  // Falls back to a sane default before the first measurement.
  const { radius, centerSize, mode } = useMemo(() => {
    if (containerW === 0) {
      return { radius: preferredRadius, centerSize: preferredCenter, mode: "ring" as const };
    }
    if (containerW < CAROUSEL_BREAKPOINT) {
      return {
        radius: 0,
        centerSize: Math.min(preferredCenter, containerW - 32),
        mode: "carousel" as const,
      };
    }
    // Ring needs: container width >= 2*radius + NODE_WIDTH + padding(40)
    const fitted = Math.floor((containerW - NODE_WIDTH - 40) / 2);
    const r = Math.max(150, Math.min(preferredRadius, fitted));
    const c = Math.max(180, Math.min(preferredCenter, r * 1.25));
    return { radius: r, centerSize: c, mode: "ring" as const };
  }, [containerW, preferredRadius, preferredCenter]);

  // CAROUSEL MODE — phones. ARIA stage on top, scrollable agent rail below.
  if (mode === "carousel") {
    return (
      <div ref={wrapRef} className="relative mx-auto w-full">
        <div className="mx-auto" style={{ width: centerSize, height: centerSize }}>
          {children}
        </div>
        <CarouselRail
          agents={agents}
          ar={ar}
          spotlightId={spotlightId}
          onAgentClick={onAgentClick}
        />
      </div>
    );
  }

  // RING MODE — laptop/desktop/tablet.
  const positions = agents.map((a, i) => {
    const n = Math.max(1, agents.length);
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return { agent: a, angle, x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  });

  return (
    <div ref={wrapRef} className="relative mx-auto w-full">
      <div
        className="relative mx-auto"
        style={{ width: radius * 2 + NODE_WIDTH + 40, height: radius * 2 + 160, maxWidth: "100%" }}
      >
        {/* Ambient ring guides */}
        <div
          aria-hidden
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/10"
          style={{ width: radius * 2, height: radius * 2 }}
        />
        <div
          aria-hidden
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/5"
          style={{ width: radius * 2 + 80, height: radius * 2 + 80 }}
        />

        {/* Center stage (ARIA / children) */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ width: centerSize, height: centerSize }}
        >
          {children}
        </div>

        {/* Agent nodes — active speaker glides ~22px toward ARIA */}
        {positions.map(({ agent, x, y, angle }) => {
          const isSpot = spotlightId === agent.id;
          const push = isSpot ? 22 : 0;
          const fx = x - Math.cos(angle) * push;
          const fy = y - Math.sin(angle) * push;
          return (
            <div
              key={agent.id}
              className="absolute left-1/2 top-1/2 transition-transform duration-700 ease-out"
              style={{ transform: `translate(calc(-50% + ${fx}px), calc(-50% + ${fy}px))` }}
            >
              <AgentNode
                agent={agent}
                ar={ar}
                spotlight={isSpot}
                onClick={() => onAgentClick?.(agent)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────── Swipeable executive carousel (mobile portrait) ─────────── */

function CarouselRail({
  agents,
  ar,
  spotlightId,
  onAgentClick,
}: {
  agents: BridgeAgent[];
  ar: boolean;
  spotlightId?: string | null;
  onAgentClick?: (agent: BridgeAgent) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  // When the spotlighted speaker changes, scroll it into view smoothly.
  useEffect(() => {
    if (!spotlightId || !scrollerRef.current) return;
    const node = scrollerRef.current.querySelector(
      `[data-agent-id="${spotlightId}"]`,
    ) as HTMLElement | null;
    node?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [spotlightId]);

  return (
    <div className="relative mt-3">
      <div className="pointer-events-none absolute inset-y-0 start-0 w-6 z-10 bg-gradient-to-e from-[#04111f] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 end-0 w-6 z-10 bg-gradient-to-w from-[#04111f] to-transparent" />
      <div
        ref={scrollerRef}
        dir={ar ? "rtl" : "ltr"}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-3 pb-2 scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {agents.map((agent) => {
          const isSpot = spotlightId === agent.id;
          return (
            <div
              key={agent.id}
              data-agent-id={agent.id}
              className={`snap-center shrink-0 transition-transform duration-500 ${isSpot ? "scale-105" : ""}`}
            >
              <AgentNode
                agent={agent}
                ar={ar}
                spotlight={isSpot}
                onClick={() => onAgentClick?.(agent)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
