/**
 * Executive Storyboard — converts the live narrator feed into a fixed
 * 9-stage operational lifecycle so executives can see, at a glance,
 * how far the latest event has progressed:
 *
 *   Detection → Verification → Evidence → Risk → Compliance →
 *   Recommendation → Approval → Execution → Closure
 *
 * Stages are derived deterministically from event topic + status.
 * No fabrication — if a stage hasn't been observed in the current
 * correlation window it renders as "pending".
 */
import { useMemo } from "react";
import {
  Eye,
  ShieldQuestion,
  FileSearch,
  AlertTriangle,
  BookOpenCheck,
  Sparkles,
  CheckCheck,
  PlayCircle,
  Flag,
} from "lucide-react";
import type { NarratorLine } from "@/lib/narrator/event-narrator";
import { cn } from "@/lib/utils";

type StageKey =
  | "detection"
  | "verification"
  | "evidence"
  | "risk"
  | "compliance"
  | "recommendation"
  | "approval"
  | "execution"
  | "closure";

const STAGES: { key: StageKey; ar: string; en: string; icon: typeof Eye }[] = [
  { key: "detection", ar: "الاكتشاف", en: "Detection", icon: Eye },
  { key: "verification", ar: "التحقق", en: "Verification", icon: ShieldQuestion },
  { key: "evidence", ar: "الأدلة", en: "Evidence", icon: FileSearch },
  { key: "risk", ar: "تقييم المخاطر", en: "Risk", icon: AlertTriangle },
  { key: "compliance", ar: "الامتثال", en: "Compliance", icon: BookOpenCheck },
  { key: "recommendation", ar: "التوصية", en: "Recommendation", icon: Sparkles },
  { key: "approval", ar: "الاعتماد", en: "Approval", icon: CheckCheck },
  { key: "execution", ar: "التنفيذ", en: "Execution", icon: PlayCircle },
  { key: "closure", ar: "الإغلاق", en: "Closure", icon: Flag },
];

/**
 * Maps a narrator line to one of the nine stages using topic + status.
 * Returns null when the event isn't part of an operational lifecycle
 * (e.g. system heartbeats).
 */
function classify(line: NarratorLine): StageKey | null {
  const t = (line.topic ?? "").toLowerCase();
  const s = (line.status ?? "").toLowerCase();

  if (s === "closed" || s === "resolved") return "closure";
  if (s === "completed" || s === "executed" || t.includes("work_order.completed"))
    return "execution";
  if (s === "approved" || t.includes("approval") || t.includes("permit.approved"))
    return "approval";

  if (t.includes("compliance") || t.includes("policy")) return "compliance";
  if (t.includes("risk") || t.includes("forecast")) return "risk";
  if (t.includes("evidence") || t.includes("cctv") || t.includes("sensor")) return "evidence";

  if (t.includes("recommendation") || t.includes("briefing")) return "recommendation";
  if (t.includes("verify") || t.includes("verification") || s === "investigating")
    return "verification";

  if (t.includes("incident") || t.includes("alert") || s === "new" || s === "open")
    return "detection";
  if (t.includes("agent.run") && s === "running") return "verification";
  if (t.includes("agent.run") && s === "completed") return "recommendation";
  return null;
}

interface Props {
  lines: NarratorLine[];
  ar: boolean;
  /** Optional correlation id to constrain the storyboard to one incident. */
  correlationId?: string | null;
}

export function Storyboard({ lines, ar, correlationId }: Props) {
  const { reached, latest } = useMemo(() => {
    const scoped = correlationId ? lines.filter((l) => l.correlation_id === correlationId) : lines;
    const reached = new Set<StageKey>();
    let latest: StageKey | null = null;
    let latestTs = 0;
    for (const l of scoped) {
      const k = classify(l);
      if (!k) continue;
      reached.add(k);
      if (l.ts > latestTs) {
        latestTs = l.ts;
        latest = k;
      }
    }
    return { reached, latest };
  }, [lines, correlationId]);

  const latestIdx = latest ? STAGES.findIndex((s) => s.key === latest) : -1;

  return (
    <div className="rounded-2xl border border-cyan-400/15 bg-white/[0.02] backdrop-blur-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-300/80">
          {ar ? "مسار القصة التنفيذية" : "Executive Storyboard"}
        </div>
        <div className="text-[10px] text-white/45 uppercase tracking-wider">
          {ar
            ? `${reached.size}/${STAGES.length} مراحل مكتملة`
            : `${reached.size}/${STAGES.length} stages observed`}
        </div>
      </div>

      <ol className="grid grid-cols-3 md:grid-cols-9 gap-2">
        {STAGES.map((stage, i) => {
          const done = reached.has(stage.key);
          const active = i === latestIdx;
          const Icon = stage.icon;
          return (
            <li
              key={stage.key}
              className={cn(
                "relative flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-center transition",
                done ? "border-cyan-400/40 bg-cyan-400/[0.06]" : "border-white/8 bg-white/[0.015]",
                active && "ring-1 ring-cyan-300/70 shadow-[0_0_20px_rgba(0,212,255,0.25)]",
              )}
            >
              <div
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-full border",
                  done
                    ? "border-cyan-300/60 text-cyan-100 bg-cyan-400/15"
                    : "border-white/15 text-white/40",
                  active && "animate-pulse",
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div
                className={cn(
                  "text-[10px] uppercase tracking-wider",
                  done ? "text-cyan-100/90" : "text-white/45",
                )}
              >
                {ar ? stage.ar : stage.en}
              </div>
              <div className="text-[9px] text-white/35">{i + 1}</div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
