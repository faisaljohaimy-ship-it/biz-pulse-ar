// Acceptance runtime — coordinates first impression, greeting, presentation
// mode, engagement, trust, discipline, and fallback for the executive experience.
import {
  beginFirstImpression,
  advanceFirstImpression,
  firstImpressionReady,
  markGreeted,
} from "./first-impression.server";
import { composeExecutiveGreeting } from "./executive-greeting.server";
import {
  setPresentationMode,
  getPresentationMode,
  presentationProfile,
  type PresentationMode,
} from "./presentation-mode.server";
import {
  openEngagement,
  recordUserInteraction,
  tickEngagement,
  engagementLevel,
  closeEngagement,
} from "./engagement.server";
import { buildTrustChips } from "./trust-signals.server";
import { assessDemoReadiness } from "./demo-readiness.server";
import { decideAcceptanceFallback } from "./fallback.server";
import { discipline } from "./response-discipline.server";
import { scoreInteraction } from "./interaction-quality.server";
import { recordAcceptanceSignal, acceptanceScore } from "./acceptance-signals.server";
import {
  recordGreeting,
  recordStepCompleted,
  recordQuality,
  recordDisciplineTrim,
} from "./metrics.server";
import { logAcceptance } from "./audit.server";
import type { AcceptanceStep, ExecutiveGreetingInput } from "./types";

interface RuntimeRow {
  readonly instanceId: string;
  readonly startedAt: number;
  lang: "ar" | "en";
  step: AcceptanceStep;
  completed: AcceptanceStep[];
  greeted: boolean;
}

const RUNTIME = new Map<string, RuntimeRow>();

export function startAcceptanceRuntime(instanceId: string, lang: "ar" | "en"): RuntimeRow {
  const cur = RUNTIME.get(instanceId);
  if (cur) return cur;
  const row: RuntimeRow = {
    instanceId,
    startedAt: Date.now(),
    lang,
    step: "welcome",
    completed: [],
    greeted: false,
  };
  RUNTIME.set(instanceId, row);
  beginFirstImpression(instanceId);
  openEngagement(instanceId, lang);
  logAcceptance(instanceId, "first_impression", { stage: "cold" });
  return row;
}

export function deliverExecutiveGreeting(
  instanceId: string,
  input: ExecutiveGreetingInput,
): { text: string; delivered: boolean; reason?: string } {
  const row = RUNTIME.get(instanceId);
  if (!row) return { text: "", delivered: false, reason: "runtime not started" };
  if (row.greeted) return { text: "", delivered: false, reason: "already greeted" };
  advanceFirstImpression(instanceId);
  if (!firstImpressionReady(instanceId)) {
    return { text: "", delivered: false, reason: "impression not ready" };
  }
  const greeting = composeExecutiveGreeting(input);
  row.greeted = true;
  markGreeted(instanceId);
  recordGreeting();
  recordAcceptanceSignal(instanceId, "greeting_delivered", { lang: greeting.lang });
  logAcceptance(instanceId, "greeting", { lang: greeting.lang });
  RUNTIME.set(instanceId, row);
  return { text: greeting.text, delivered: true };
}

export function advanceAcceptanceStep(
  instanceId: string,
  next: AcceptanceStep,
): AcceptanceStep | null {
  const row = RUNTIME.get(instanceId);
  if (!row) return null;
  if (!row.completed.includes(row.step)) row.completed.push(row.step);
  row.step = next;
  recordStepCompleted();
  recordAcceptanceSignal(instanceId, "step_completed", { step: next });
  logAcceptance(instanceId, "flow_step", { step: next });
  RUNTIME.set(instanceId, row);
  return next;
}

export interface AcceptanceRuntimeSnapshot {
  readonly instanceId: string;
  readonly lang: "ar" | "en";
  readonly step: AcceptanceStep;
  readonly completed: readonly AcceptanceStep[];
  readonly greeted: boolean;
  readonly engagement: ReturnType<typeof engagementLevel>;
  readonly score: number;
  readonly presentation: ReturnType<typeof presentationProfile>;
  readonly demo: ReturnType<typeof assessDemoReadiness>;
  readonly fallback: ReturnType<typeof decideAcceptanceFallback>;
}

export function acceptanceRuntimeSnapshot(instanceId: string): AcceptanceRuntimeSnapshot | null {
  const row = RUNTIME.get(instanceId);
  if (!row) return null;
  tickEngagement(instanceId);
  return {
    instanceId,
    lang: row.lang,
    step: row.step,
    completed: [...row.completed],
    greeted: row.greeted,
    engagement: engagementLevel(instanceId),
    score: acceptanceScore(instanceId),
    presentation: presentationProfile(getPresentationMode(instanceId)),
    demo: assessDemoReadiness({}),
    fallback: decideAcceptanceFallback({}),
  };
}

export function recordUserTurn(instanceId: string, kind: "text" | "voice"): void {
  recordUserInteraction(instanceId, kind);
  recordAcceptanceSignal(instanceId, "user_response", { kind });
}

export function disciplineResponse(
  instanceId: string,
  draft: string,
  mode: "brief" | "detailed",
): {
  text: string;
  trimmed: boolean;
  quality: ReturnType<typeof scoreInteraction>;
} {
  const row = RUNTIME.get(instanceId);
  const lang = row?.lang ?? "ar";
  const d = discipline({ draft, mode, lang });
  if (d.trimmed) recordDisciplineTrim();
  logAcceptance(instanceId, "discipline", { trimmed: d.trimmed, notes: d.notes });
  const quality = scoreInteraction({ text: d.text, mode, lang });
  recordQuality(quality.language, quality.acceptable);
  logAcceptance(instanceId, "quality", {
    score: quality.composite,
    violations: quality.violations,
  });
  return { text: d.text, trimmed: d.trimmed, quality };
}

export { buildTrustChips, setPresentationMode, type PresentationMode, closeEngagement };
