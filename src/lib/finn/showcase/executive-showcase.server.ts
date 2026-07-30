// Executive Showcase orchestrator — one-click premium demonstration flow.
import type {
  ExecutiveProfile,
  ShowcaseKpi,
  ShowcaseMode,
  ShowcasePhase,
  ShowcaseStep,
} from "./types";
import { buildCinematicIntro, type CinematicBeat } from "./cinematic-intro.server";
import { composeWelcome } from "./executive-welcome.server";
import { planGuidedDemo } from "./guided-demo.server";
import { presentKpis, type KpiSource } from "./live-kpi-presenter.server";
import { composeStory, type StoryInput } from "./executive-storytelling.server";
import { computeFocus } from "./dynamic-focus.server";
import { directVoice } from "./voice-director.server";
import {
  initController,
  controllerSnapshot,
  advanceStep,
  pause,
  resume,
  interrupt,
  recover,
  setMode,
  disposeController,
  currentStep,
  type ControllerSnapshot,
} from "./presentation-controller.server";
import { computeConfidence, type ConfidenceInput } from "./confidence-display.server";
import { logShowcase } from "./audit.server";
import {
  noteStart,
  noteCompletion,
  noteInterruption,
  noteRecovery,
  noteQa,
  noteStepDuration,
} from "./metrics.server";
import { recordQuestion, markAnswered, qaHistory } from "./executive-qa.server";

export interface StartShowcaseInput {
  readonly instanceId: string;
  readonly profile: ExecutiveProfile;
  readonly mode?: ShowcaseMode;
  readonly kpiSources?: readonly KpiSource[];
  readonly story?: StoryInput;
  readonly confidence?: ConfidenceInput;
  readonly includeQa?: boolean;
}

export interface ShowcasePlan {
  readonly instanceId: string;
  readonly mode: ShowcaseMode;
  readonly intro: readonly CinematicBeat[];
  readonly welcome: ReturnType<typeof composeWelcome>;
  readonly steps: readonly ShowcaseStep[];
  readonly kpis: readonly ShowcaseKpi[];
  readonly story: ReturnType<typeof composeStory>;
  readonly confidence: ReturnType<typeof computeConfidence>;
}

const LAST_STEP_AT = new Map<string, number>();

export function startExecutiveShowcase(input: StartShowcaseInput): ShowcasePlan {
  const mode = input.mode ?? "presenter";
  const steps = planGuidedDemo({ includeQa: input.includeQa });
  initController(input.instanceId, steps, mode);
  const plan: ShowcasePlan = {
    instanceId: input.instanceId,
    mode,
    intro: buildCinematicIntro(),
    welcome: composeWelcome(input.profile),
    steps,
    kpis: presentKpis(input.kpiSources ?? []),
    story: composeStory(input.story ?? {}),
    confidence: computeConfidence(input.confidence ?? { evidenceCount: 0 }),
  };
  noteStart();
  logShowcase(input.instanceId, "start", { mode, profileLang: input.profile.language });
  logShowcase(input.instanceId, "intro");
  logShowcase(input.instanceId, "welcome");
  LAST_STEP_AT.set(input.instanceId, Date.now());
  return plan;
}

export interface ShowcaseFrame {
  readonly snapshot: ControllerSnapshot;
  readonly focus: ReturnType<typeof computeFocus>;
  readonly narration: ReturnType<typeof directVoice> | null;
}

export function currentShowcaseFrame(
  instanceId: string,
  language: "ar" | "en",
): ShowcaseFrame | null {
  const snap = controllerSnapshot(instanceId);
  if (!snap) return null;
  const step = snap.step;
  const narration = step
    ? directVoice({
        phase: snap.phase,
        text: language === "ar" ? step.narration_ar : step.narration_en,
        language,
      })
    : null;
  return {
    snapshot: snap,
    focus: computeFocus({ phase: snap.phase, selector: step?.focusSelector }),
    narration,
  };
}

export function nextShowcaseStep(instanceId: string): ShowcaseStep | null {
  const prev = currentStep(instanceId);
  const last = LAST_STEP_AT.get(instanceId);
  if (prev && typeof last === "number") noteStepDuration(Date.now() - last);
  const next = advanceStep(instanceId);
  if (next) {
    logShowcase(instanceId, "step", { id: next.id, phase: next.phase });
    LAST_STEP_AT.set(instanceId, Date.now());
  } else {
    logShowcase(instanceId, "end");
    noteCompletion();
  }
  return next;
}

export function pauseShowcase(id: string): void {
  pause(id);
  logShowcase(id, "pause");
}
export function resumeShowcase(id: string): void {
  resume(id);
  logShowcase(id, "resume");
}
export function interruptShowcase(id: string): void {
  interrupt(id);
  noteInterruption();
  logShowcase(id, "interrupt");
}
export function recoverShowcase(id: string): ShowcasePhase | null {
  const p = recover(id);
  if (p) {
    noteRecovery();
    logShowcase(id, "recover", { phase: p });
  }
  return p;
}
export function switchShowcaseMode(id: string, mode: ShowcaseMode): void {
  setMode(id, mode);
  logShowcase(id, "mode_change", { mode });
}

export function askExecutiveQuestion(
  id: string,
  question: string,
  language: "ar" | "en",
): { turnId: string } {
  const turn = recordQuestion(id, question, language);
  noteQa();
  logShowcase(id, "qa", { turnId: turn.id, language });
  return { turnId: turn.id };
}

export function acknowledgeQaAnswer(id: string, turnId: string): void {
  markAnswered(id, turnId);
}

export function showcaseQaHistory(id: string, n?: number) {
  return qaHistory(id, n);
}

export function endExecutiveShowcase(instanceId: string): void {
  logShowcase(instanceId, "end");
  noteCompletion();
  disposeController(instanceId);
  LAST_STEP_AT.delete(instanceId);
}
