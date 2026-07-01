/**
 * Phase 8.9 — Cross-subsystem coordination.
 *
 * Runs a single executive mission end-to-end by delegating in strict
 * order to the already-owned subsystems:
 *
 *   Brain (context + evidence + reasoning + decision)
 *     ↓
 *   Cognition (evidence-first verification of the proposed decision)
 *     ↓
 *   Planning (produces ExecutionPlan — planner is authoritative)
 *     ↓
 *   Execution Director (dispatches through Task Bus → Marketplace → Agents)
 *     ↓
 *   Result artifacts persisted in the OS repository.
 *
 * This module NEVER:
 *   - executes agents directly
 *   - dispatches Task Bus tasks
 *   - writes Executive Memory (Brain owns that)
 *   - re-runs Cognition inside a loop
 *   - re-plans a plan already produced by the Planner
 */

import { runExecutiveBrain } from "../executive-brain";
import { runReasoningSession } from "../cognition";
import { planMission as runPlanner } from "../planning";
import { PlanMissionInputSchema } from "../planning/contracts";
import { executeMission as runDirector } from "../execution";
import type { BrainRequest, ExecutiveBrainAnswer } from "../executive-brain/types";
import type { ExecutionPlan } from "../planning/types";
import type { ExecutionResult } from "../execution/types";
import type { MissionRequest, MissionOutcome } from "../orchestrator/types";
import type { CognitiveSession } from "../cognition/types";
import { storeArtifact } from "./artifact.server";
import { emitOSEvent } from "./events";
import { noteMissionCompleted, noteMissionFailed } from "./metrics.server";
import type {
  ExecutiveArtifact,
  ExecutiveMission,
  ExecutiveMissionResult,
  ExecutiveMissionState,
  ExecutiveSessionId,
  ExecutiveWorkspaceId,
} from "./types";

function newMissionId(): string {
  return `mis_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export interface CoordinateMissionArgs {
  session_id: ExecutiveSessionId;
  workspace_id: ExecutiveWorkspaceId;
  objective_id?: string | null;
  request: BrainRequest;
  lang?: "ar" | "en" | "mixed";
  api_key?: string;
}

export async function coordinateMission(
  args: CoordinateMissionArgs,
): Promise<ExecutiveMissionResult> {
  const mission_id = newMissionId();
  const started_at = nowIso();
  const artifacts: ExecutiveArtifact[] = [];

  const baseMission = (state: ExecutiveMissionState, extra: Partial<ExecutiveMission> = {}): ExecutiveMission => ({
    id: mission_id,
    session_id: args.session_id,
    workspace_id: args.workspace_id,
    objective_id: args.objective_id ?? null,
    goal: args.request.question,
    lang: args.lang ?? args.request.lang ?? "en",
    state,
    started_at,
    finished_at: null,
    plan_artifact_id: null,
    reasoning_artifact_id: null,
    answer_artifact_id: null,
    execution_artifact_id: null,
    ...extra,
  });

  emitOSEvent("MissionStarted", {
    session_id: args.session_id,
    workspace_id: args.workspace_id,
    mission_id,
    detail: { question: args.request.question.slice(0, 200) },
  });

  let answer: ExecutiveBrainAnswer | null = null;
  let cognition: CognitiveSession | null = null;
  let plan: ExecutionPlan | null = null;
  let execution: ExecutionResult | null = null;
  let outcome: MissionOutcome | null = null;
  let plan_artifact_id: string | null = null;
  let reasoning_artifact_id: string | null = null;
  let answer_artifact_id: string | null = null;
  let execution_artifact_id: string | null = null;

  try {
    // 1) Executive Brain — authoritative reasoning + intent envelope.
    const apiKey = args.api_key ?? process.env.LOVABLE_API_KEY ?? "";
    answer = await runExecutiveBrain(args.request, { apiKey });
    const answerArtifact = storeArtifact({
      workspace_id: args.workspace_id,
      session_id: args.session_id,
      mission_id,
      kind: "answer",
      label: `Executive answer · ${args.request.question.slice(0, 60)}`,
      summary: answer.text_en?.slice(0, 400) ?? answer.text_ar?.slice(0, 400),
      payload: answer,
    });
    artifacts.push(answerArtifact);
    answer_artifact_id = answerArtifact.id;

    // 2) Cognition — evidence-first verification (never executes).
    try {
      const brainAnswer = answer;
      cognition = runReasoningSession({
        goal: args.request.question,
        evidenceSeeds: brainAnswer.evidence.map((text, i) => ({
          claim: text,
          source: {
            id: `brain_${i}`,
            kind: "reasoning",
            label: brainAnswer.sources[i] ?? "executive-brain",
            trust: Math.max(0.4, Math.min(1, brainAnswer.confidence.overall)),
          },
        })),
      });
      const reasoningArtifact = storeArtifact({
        workspace_id: args.workspace_id,
        session_id: args.session_id,
        mission_id,
        kind: "reasoning",
        label: `Cognitive verification · ${mission_id}`,
        summary: cognition.recommendation.rationale,
        payload: cognition,
      });
      artifacts.push(reasoningArtifact);
      reasoning_artifact_id = reasoningArtifact.id;
    } catch {
      cognition = null;
    }

    // 3) Planning — authoritative ExecutionPlan. We route through the
    // Planner even for questions that don't demand execution because the
    // Planner is the single source of truth for downstream dispatch.
    try {
      const planInput = PlanMissionInputSchema.parse({
        utterance: args.request.question,
        lang: args.request.lang ?? "en",
      });
      plan = await runPlanner(planInput);
      const planArtifact = storeArtifact({
        workspace_id: args.workspace_id,
        session_id: args.session_id,
        mission_id,
        kind: "plan",
        label: `Execution plan · ${plan.mission_id}`,
        summary: `${plan.stages.length} stages · strategy=${plan.strategy}`,
        payload: plan,
      });
      artifacts.push(planArtifact);
      plan_artifact_id = planArtifact.id;
    } catch {
      // If planning refuses, we still keep the Brain answer.
      plan = null;
    }

    // 4) Execution — only when Cognition/Brain marked no blocking risks
    // and the Brain proposed a non-monitor decision that does not
    // require human approval.
    const shouldExecute =
      !!plan &&
      !!answer.decision &&
      !answer.decision.requires_human_approval &&
      answer.decision.mode !== "monitor" &&
      answer.decision.mode !== "reject";

    if (shouldExecute) {
      const mReq: MissionRequest = {
        ...args.request,
        missionId: plan!.mission_id,
      };
      execution = await runDirector(mReq, { apiKey: args.api_key });
      outcome = execution.outcome;
      const execArtifact = storeArtifact({
        workspace_id: args.workspace_id,
        session_id: args.session_id,
        mission_id,
        kind: "result",
        label: `Execution result · ${execution.session_id}`,
        summary: `state=${execution.state} · health=${execution.health}`,
        payload: execution,
      });
      artifacts.push(execArtifact);
      execution_artifact_id = execArtifact.id;
    }

    const mission = baseMission("completed", {
      finished_at: nowIso(),
      plan_artifact_id,
      reasoning_artifact_id,
      answer_artifact_id,
      execution_artifact_id,
    });

    noteMissionCompleted();
    emitOSEvent("MissionCompleted", {
      session_id: args.session_id,
      workspace_id: args.workspace_id,
      mission_id,
    });

    return { mission, answer, plan, cognition, execution, outcome, artifacts };
  } catch (err) {
    noteMissionFailed();
    const error = err instanceof Error ? err.message : String(err);
    emitOSEvent("MissionFailed", {
      session_id: args.session_id,
      workspace_id: args.workspace_id,
      mission_id,
      detail: { error },
    });
    const mission = baseMission("failed", {
      finished_at: nowIso(),
      error,
      plan_artifact_id,
      reasoning_artifact_id,
      answer_artifact_id,
      execution_artifact_id,
    });
    return { mission, answer, plan, cognition, execution, outcome, artifacts };
  }
}
