/**
 * Circular Agent Table — positions BridgeAgents around a central
 * stage using trig so the count flexes from 4 to 12 without overlap.
 */
import { useMemo } from "react";
import type { BridgeAgent } from "@/lib/exec/bridge.functions";
import { AgentNode } from "./AgentNode";

interface Props {
  agents: BridgeAgent[];
  ar: boolean;
  /** Outer ring radius in px (relative to container center). */
  radius?: number;
  /** Diameter of the central reserved area for ARIA. */
  centerSize?: number;
  /** Optional id of the agent currently in the spotlight (during briefing). */
  spotlightId?: string | null;
  children?: React.ReactNode;
  onAgentClick?: (agent: BridgeAgent) => void;
}

export function AgentRing({
  agents,
  ar,
  radius = 260,
  centerSize = 280,
  spotlightId,
  children,
  onAgentClick,
}: Props) {
  const positions = useMemo(() => {
    const n = Math.max(1, agents.length);
    return agents.map((a, i) => {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      return {
        agent: a,
        angle,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      };
    });
  }, [agents, radius]);

  return (
    <div className="relative mx-auto" style={{ width: radius * 2 + 200, height: radius * 2 + 160 }}>
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
  );
}
