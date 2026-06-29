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
    // Start at top (-PI/2) and distribute evenly.
    return agents.map((a, i) => {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      return { agent: a, x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
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

      {/* Agent nodes */}
      {positions.map(({ agent, x, y }) => (
        <div
          key={agent.id}
          className="absolute left-1/2 top-1/2"
          style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
        >
          <AgentNode
            agent={agent}
            ar={ar}
            spotlight={spotlightId === agent.id}
            onClick={() => onAgentClick?.(agent)}
          />
        </div>
      ))}
    </div>
  );
}
