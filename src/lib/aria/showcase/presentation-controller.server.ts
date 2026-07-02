import type { ShowcaseMode, ShowcasePhase, ShowcaseStep } from "./types";

interface ControllerRow {
  readonly instanceId: string;
  mode: ShowcaseMode;
  phase: ShowcasePhase;
  stepIndex: number;
  paused: boolean;
  interrupted: boolean;
  steps: readonly ShowcaseStep[];
  startedAt: number;
  updatedAt: number;
}

const R = new Map<string, ControllerRow>();

export function initController(instanceId: string, steps: readonly ShowcaseStep[], mode: ShowcaseMode = "presenter"): ControllerRow {
  const row: ControllerRow = {
    instanceId, mode, phase: steps[0]?.phase ?? "idle",
    stepIndex: 0, paused: false, interrupted: false,
    steps, startedAt: Date.now(), updatedAt: Date.now(),
  };
  R.set(instanceId, row);
  return row;
}

export function currentStep(instanceId: string): ShowcaseStep | null {
  const row = R.get(instanceId);
  if (!row) return null;
  return row.steps[row.stepIndex] ?? null;
}

export function advanceStep(instanceId: string): ShowcaseStep | null {
  const row = R.get(instanceId);
  if (!row) return null;
  if (row.stepIndex + 1 >= row.steps.length) return null;
  row.stepIndex += 1;
  row.phase = row.steps[row.stepIndex].phase;
  row.updatedAt = Date.now();
  R.set(instanceId, row);
  return row.steps[row.stepIndex];
}

export function pause(instanceId: string): void {
  const row = R.get(instanceId);
  if (!row) return;
  row.paused = true; row.updatedAt = Date.now(); R.set(instanceId, row);
}

export function resume(instanceId: string): void {
  const row = R.get(instanceId);
  if (!row) return;
  row.paused = false; row.interrupted = false; row.updatedAt = Date.now(); R.set(instanceId, row);
}

export function interrupt(instanceId: string): void {
  const row = R.get(instanceId);
  if (!row) return;
  row.interrupted = true; row.phase = "qa"; row.updatedAt = Date.now(); R.set(instanceId, row);
}

export function recover(instanceId: string): ShowcasePhase | null {
  const row = R.get(instanceId);
  if (!row) return null;
  row.interrupted = false;
  row.phase = row.steps[row.stepIndex]?.phase ?? "idle";
  row.updatedAt = Date.now();
  R.set(instanceId, row);
  return row.phase;
}

export function setMode(instanceId: string, mode: ShowcaseMode): void {
  const row = R.get(instanceId);
  if (!row) return;
  row.mode = mode; row.updatedAt = Date.now(); R.set(instanceId, row);
}

export interface ControllerSnapshot {
  readonly instanceId: string;
  readonly mode: ShowcaseMode;
  readonly phase: ShowcasePhase;
  readonly stepIndex: number;
  readonly step: ShowcaseStep | null;
  readonly totalSteps: number;
  readonly paused: boolean;
  readonly interrupted: boolean;
  readonly progress: number;
}

export function controllerSnapshot(instanceId: string): ControllerSnapshot | null {
  const row = R.get(instanceId);
  if (!row) return null;
  return {
    instanceId: row.instanceId,
    mode: row.mode,
    phase: row.phase,
    stepIndex: row.stepIndex,
    step: row.steps[row.stepIndex] ?? null,
    totalSteps: row.steps.length,
    paused: row.paused,
    interrupted: row.interrupted,
    progress: row.steps.length === 0 ? 0 : (row.stepIndex + 1) / row.steps.length,
  };
}

export function disposeController(instanceId: string): void { R.delete(instanceId); }
