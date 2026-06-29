/**
 * ConnectionLines — animated SVG beams from each ring-positioned agent
 * to the central ARIA stage. Highlights the active speaker and tints
 * lines by status (speaking=cyan, thinking=amber, working=violet).
 *
 * Positions are recomputed with the same trig used by AgentRing
 * (top of the circle, clockwise) so beams land on each agent node.
 */
import { useMemo } from "react";
import type { BridgeAgent, BridgeAgentStatus } from "@/lib/exec/bridge.functions";

interface Props {
  agents: BridgeAgent[];
  radius: number;
  /** id of the agent currently speaking; null when ARIA holds the floor. */
  speakerId: string | null;
  /** container size in px (square). */
  size: number;
}

const STATUS_COLOR: Record<BridgeAgentStatus, string> = {
  offline: "rgba(255,255,255,0.06)",
  monitoring: "rgba(0,212,255,0.18)",
  thinking: "rgba(251,191,36,0.55)",
  speaking: "rgba(0,212,255,0.85)",
  working: "rgba(167,139,250,0.55)",
  completed: "rgba(52,211,153,0.45)",
  failed: "rgba(244,114,182,0.55)",
  waiting_approval: "rgba(251,191,36,0.55)",
};

const ACTIVE: BridgeAgentStatus[] = ["thinking", "speaking", "working", "waiting_approval"];

export function ConnectionLines({ agents, radius, speakerId, size }: Props) {
  const beams = useMemo(() => {
    const cx = size / 2;
    const cy = size / 2;
    const n = agents.length;
    if (n === 0) return [];
    return agents.map((a, i) => {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      const isSpeaker = speakerId === a.id;
      const isActive = isSpeaker || ACTIVE.includes(a.status);
      return {
        id: a.id,
        x1: x,
        y1: y,
        x2: cx,
        y2: cy,
        color: isSpeaker ? "rgba(0,212,255,0.95)" : STATUS_COLOR[a.status] ?? "rgba(255,255,255,0.08)",
        active: isActive,
        speaker: isSpeaker,
      };
    });
  }, [agents, radius, speakerId, size]);

  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
    >
      <defs>
        <radialGradient id="theaterCoreGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(0,212,255,0.35)" />
          <stop offset="60%" stopColor="rgba(0,212,255,0.05)" />
          <stop offset="100%" stopColor="rgba(0,212,255,0)" />
        </radialGradient>
      </defs>

      {/* core halo behind ARIA */}
      <circle cx={size / 2} cy={size / 2} r={radius * 0.55} fill="url(#theaterCoreGlow)" />

      {beams.map((b) => (
        <g key={b.id}>
          <line
            x1={b.x1}
            y1={b.y1}
            x2={b.x2}
            y2={b.y2}
            stroke={b.color}
            strokeWidth={b.speaker ? 2 : 1}
            strokeDasharray={b.active ? "6 8" : "2 10"}
            opacity={b.active ? 1 : 0.55}
            style={
              b.active
                ? { animation: "theaterDash 1.8s linear infinite" }
                : undefined
            }
          />
          {b.speaker && (
            <circle cx={b.x1} cy={b.y1} r={6} fill="rgba(0,212,255,0.85)">
              <animate attributeName="r" values="4;9;4" dur="1.6s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.9;0.3;0.9" dur="1.6s" repeatCount="indefinite" />
            </circle>
          )}
        </g>
      ))}

      <style>{`@keyframes theaterDash { to { stroke-dashoffset: -56; } }`}</style>
    </svg>
  );
}
