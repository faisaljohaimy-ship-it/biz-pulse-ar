/**
 * NxPipelineFlow · مسار التشغيل — spec: docs/motion/05 §Pipeline +
 * docs/design/03 (single-gold law: the approval gate is the gold moment).
 *
 * The seven-stage advisory pipeline (request → … → result) as a CSS-only
 * RTL flow. The approval gate breathes ONLY while pending — the human
 * decision is the visual climax; execution never animates on its own
 * (advisory law: nothing executes without the approved gate).
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export type NxPipelineStage =
  | "request"
  | "analysis"
  | "retrieval"
  | "recommendation"
  | "approval"
  | "execution"
  | "result";

export const PIPELINE_STAGE_LABEL: Record<NxPipelineStage, string> = {
  request: "الطلب",
  analysis: "التحليل",
  retrieval: "الاسترجاع",
  recommendation: "التوصية",
  approval: "الاعتماد",
  execution: "التنفيذ",
  result: "النتيجة",
};

export const PIPELINE_STAGE_ORDER: readonly NxPipelineStage[] = [
  "request",
  "analysis",
  "retrieval",
  "recommendation",
  "approval",
  "execution",
  "result",
];

type StagePhase = "done" | "active" | "pending";

const PHASE_WORD: Record<StagePhase, string> = {
  done: "مكتملة",
  active: "جارية",
  pending: "قادمة",
};

export interface NxPipelineFlowProps extends React.HTMLAttributes<HTMLOListElement> {
  /** The stage currently carrying the request; null = idle pipeline. */
  activeStage?: NxPipelineStage | null;
  /** A recommendation awaits the human gate — the gold chip breathes. */
  approvalPending?: boolean;
  /** When provided, stage chips become real buttons (inspect a stage). */
  onSelectStage?: (stage: NxPipelineStage) => void;
}

export const NxPipelineFlow = React.forwardRef<HTMLOListElement, NxPipelineFlowProps>(
  ({ className, activeStage = null, approvalPending = false, onSelectStage, ...props }, ref) => {
    const activeIndex = activeStage ? PIPELINE_STAGE_ORDER.indexOf(activeStage) : -1;
    return (
      <ol
        ref={ref}
        aria-label="مسار التشغيل من الطلب إلى النتيجة"
        data-active-stage={activeStage ?? undefined}
        className={cn("flex flex-wrap items-center gap-1", className)}
        {...props}
      >
        {PIPELINE_STAGE_ORDER.map((stage, i) => {
          const phase: StagePhase =
            activeIndex === -1
              ? "pending"
              : i < activeIndex
                ? "done"
                : i === activeIndex
                  ? "active"
                  : "pending";
          const isGate = stage === "approval";
          const gateBreathing = isGate && approvalPending;
          const chipClass = cn(
            "rounded-nx-8 inline-flex items-center gap-1.5 border px-2.5 py-1 text-xs transition-[border-color,box-shadow,opacity] duration-[var(--nx-anim-base)] ease-[var(--nx-ease-out)]",
            phase === "done" && "border-nx-success/40 text-nx-pearl/72",
            phase === "active" &&
              !isGate &&
              "border-nx-layer-agent/70 text-nx-pearl shadow-[var(--nx-glow-agent)]",
            phase === "pending" && !gateBreathing && "border-white/10 text-nx-pearl/38",
            isGate &&
              (gateBreathing || phase === "active") &&
              "border-nx-gold/70 text-nx-gold shadow-[var(--nx-glow-authority)]",
            gateBreathing && "nx-anim-breathe",
            onSelectStage &&
              "min-h-11 cursor-pointer hover:border-current/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nx-cyan",
          );
          const content = (
            <>
              {phase === "done" ? (
                <span aria-hidden className="text-nx-success">
                  ✓
                </span>
              ) : null}
              {isGate ? <span aria-hidden>🔒</span> : null}
              {PIPELINE_STAGE_LABEL[stage]}
              <span className="sr-only">
                — {gateBreathing ? "بانتظار الاعتماد البشري" : PHASE_WORD[phase]}
              </span>
            </>
          );
          return (
            <li key={stage} className="flex items-center gap-1">
              {i > 0 ? <span aria-hidden className="h-px w-3 shrink-0 bg-nx-pearl/24" /> : null}
              {onSelectStage ? (
                <button
                  type="button"
                  data-stage={stage}
                  data-phase={phase}
                  data-action={`flow.${stage}.inspect`}
                  aria-current={phase === "active" ? "step" : undefined}
                  onClick={() => onSelectStage(stage)}
                  className={chipClass}
                >
                  {content}
                </button>
              ) : (
                <span
                  data-stage={stage}
                  data-phase={phase}
                  aria-current={phase === "active" ? "step" : undefined}
                  className={chipClass}
                >
                  {content}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    );
  },
);
NxPipelineFlow.displayName = "NxPipelineFlow";
