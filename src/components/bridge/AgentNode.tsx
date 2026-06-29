/**
 * Executive Command Bridge — single agent node on the circular table.
 * Pure presentation. All data flows from `BridgeAgent` (real run history
 * + status). Status pill, halo animation, confidence ring.
 */
import { cn } from "@/lib/utils";
import type { BridgeAgent, BridgeAgentStatus } from "@/lib/exec/bridge.functions";
import { findHuman } from "@/lib/digital-humans/registry";
import { DigitalHumanAvatar } from "@/components/digital-humans/DigitalHumanAvatar";
import {
  Brain, Mic, CheckCircle2, AlertTriangle, Circle, Power, Eye, Hourglass,
  Search, Activity, Users2, Rocket, ShieldAlert, AlertOctagon, LifeBuoy,
} from "lucide-react";

const STATUS_RING: Record<BridgeAgentStatus, string> = {
  offline:    "ring-white/5 shadow-none opacity-60",
  idle:       "ring-cyan-400/20 shadow-[0_0_0_1px_rgba(0,212,255,0.10)]",
  monitoring: "ring-cyan-300/40 shadow-[0_0_18px_rgba(0,212,255,0.25)]",
  waiting:    "ring-white/15 shadow-[0_0_12px_rgba(255,255,255,0.08)]",
  thinking:   "ring-cyan-300/60 shadow-[0_0_28px_rgba(0,212,255,0.45)] animate-pulse",
  searching:  "ring-sky-300/50 shadow-[0_0_22px_rgba(125,211,252,0.35)] animate-pulse",
  analyzing:  "ring-violet-300/60 shadow-[0_0_26px_rgba(167,139,250,0.40)] animate-pulse",
  consulting: "ring-indigo-300/60 shadow-[0_0_24px_rgba(129,140,248,0.40)]",
  executing:  "ring-amber-300/60 shadow-[0_0_26px_rgba(252,211,77,0.40)]",
  speaking:   "ring-emerald-300/70 shadow-[0_0_32px_rgba(52,211,153,0.50)]",
  completed:  "ring-emerald-400/50 shadow-[0_0_18px_rgba(52,211,153,0.30)]",
  escalated:  "ring-rose-300/70 shadow-[0_0_30px_rgba(251,113,133,0.45)] animate-pulse",
  warning:    "ring-amber-400/60 shadow-[0_0_22px_rgba(251,191,36,0.40)]",
  error:      "ring-rose-400/70 shadow-[0_0_24px_rgba(251,113,133,0.50)]",
  recovery:   "ring-cyan-200/60 shadow-[0_0_20px_rgba(165,243,252,0.35)]",
};

const STATUS_LABEL: Record<BridgeAgentStatus, { ar: string; en: string; Icon: typeof Brain }> = {
  offline:    { ar: "غير متصل",  en: "Offline",    Icon: Power },
  idle:       { ar: "جاهز",       en: "Standby",    Icon: Circle },
  monitoring: { ar: "يراقب",      en: "Monitoring", Icon: Eye },
  waiting:    { ar: "بالانتظار",  en: "Waiting",    Icon: Hourglass },
  thinking:   { ar: "يفكّر",       en: "Thinking",   Icon: Brain },
  searching:  { ar: "يبحث",       en: "Searching",  Icon: Search },
  analyzing:  { ar: "يحلّل",       en: "Analyzing",  Icon: Activity },
  consulting: { ar: "يتشاور",     en: "Consulting", Icon: Users2 },
  executing:  { ar: "ينفّذ",        en: "Executing",  Icon: Rocket },
  speaking:   { ar: "يتحدّث",      en: "Speaking",   Icon: Mic },
  completed:  { ar: "اكتمل",      en: "Completed",  Icon: CheckCircle2 },
  escalated:  { ar: "تصعيد",      en: "Escalated",  Icon: ShieldAlert },
  warning:    { ar: "تحذير",      en: "Warning",    Icon: AlertOctagon },
  error:      { ar: "تعذّر",       en: "Error",      Icon: AlertTriangle },
  recovery:   { ar: "استرداد",    en: "Recovery",   Icon: LifeBuoy },
};

interface Props {
  agent: BridgeAgent;
  ar: boolean;
  size?: number;
  spotlight?: boolean;
  onClick?: () => void;
}

/** Heuristic map from agent_definitions.name → digital-human persona id. */
function pickPersona(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("incident")) return "incident_commander";
  if (n.includes("risk")) return "risk_intelligence";
  if (n.includes("compliance") || n.includes("audit")) return "compliance_auditor";
  if (n.includes("cctv") || n.includes("camera")) return "cctv_intelligence";
  if (n.includes("patrol")) return "patrol_intelligence";
  if (n.includes("emergency")) return "emergency_coordinator";
  if (n.includes("visitor")) return "visitor_intelligence";
  if (n.includes("knowledge") || n.includes("kb")) return "knowledge_ai";
  if (n.includes("report") || n.includes("brief")) return "executive_reporter";
  if (n.includes("twin") || n.includes("asset")) return "digital_twin";
  return "risk_intelligence";
}

export function AgentNode({ agent, ar, size = 96, spotlight, onClick }: Props) {
  const persona = findHuman(pickPersona(agent.name)) ?? findHuman("risk_intelligence")!;
  const status = STATUS_LABEL[agent.status];
  const pct = Math.round(agent.confidence * 100);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex flex-col items-center gap-2 text-center transition-transform",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 rounded-2xl p-2",
        spotlight && "scale-110",
      )}
      style={{ width: size + 24 }}
    >
      <div
        className={cn(
          "relative rounded-full ring-2 transition-all duration-500",
          STATUS_RING[agent.status],
          spotlight && "ring-cyan-200/80 shadow-[0_0_56px_rgba(0,212,255,0.65)]",
        )}
      >
        <DigitalHumanAvatar
          spec={persona}
          state={agent.status === "thinking" ? "thinking" : agent.status === "speaking" ? "speaking" : agent.status === "completed" ? "completed" : agent.status === "error" ? "error" : "idle"}
          size={size}
          ambient={spotlight || agent.status === "speaking" || agent.status === "thinking"}
        />
        {/* Confidence arc */}
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 h-full w-full -rotate-90"
          aria-hidden
        >
          <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
          <circle
            cx="50" cy="50" r="46" fill="none"
            stroke="currentColor"
            className={cn(
              agent.confidence >= 0.85 ? "text-emerald-300" : agent.confidence >= 0.6 ? "text-cyan-300" : "text-amber-300",
            )}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${(agent.confidence * 289).toFixed(1)} 289`}
          />
        </svg>
      </div>

      <div className="min-w-0 max-w-[12rem]">
        <div className="truncate text-[13px] font-semibold text-white">{agent.name}</div>
        <div className="mt-0.5 flex items-center justify-center gap-1.5 text-[11px] text-cyan-200/90">
          <status.Icon className="h-3 w-3" />
          <span>{ar ? status.ar : status.en}</span>
          <span className="text-white/30">·</span>
          <span className="tabular-nums">{pct}%</span>
        </div>
        {agent.current_task && (
          <div className="mt-1 line-clamp-2 text-[10.5px] leading-tight text-white/55">
            {agent.current_task}
          </div>
        )}
      </div>
    </button>
  );
}
