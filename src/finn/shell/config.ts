/**
 * SADEED FINN Shell — configuration (single typed source).
 *
 * Mirrors the reviewed shell.config contract. `toolCallsEnabled` stays false
 * until a real connector is implemented and tested; every capability therefore
 * runs advisory-only. The three adaptive parameters are bounded — the adapt
 * layer may only move them inside [min,max]; anything structural is a proposal.
 */
import type { GatedAction } from "./types";

export interface BoundedParam {
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly default: number;
}

export const SHELL_CONFIG = {
  pack: "nexios-finn-shell",
  version: "1.0.0",
  layer: "shell",
  language: "ar-first",
  selection: {
    topK: { value: 3, min: 1, max: 5, default: 3 } as BoundedParam,
    confidenceThreshold: { value: 0.62, min: 0.5, max: 0.85, default: 0.62 } as BoundedParam,
    maxCatalogSize: 40,
    onLowConfidence: "ask_one_clarifying_question",
  },
  response: {
    maxTokens: { value: 900, min: 300, max: 1600, default: 900 } as BoundedParam,
    citationsRequired: true,
  },
  safety: {
    failClosed: true,
    toolCallsEnabled: false,
    coreWriteFromShell: "forbidden",
    humanGateRequiredFor: [
      "write",
      "delete",
      "deploy",
      "broadcast",
      "ptw_issue",
      "ptw_suspend",
      "pii_access",
    ] satisfies GatedAction[],
  },
  performance: {
    maxAnimatedElements: 24,
    minTouchTargetPx: 44,
  },
  adaptation: {
    enabled: true,
    scope: ["selection.topK", "selection.confidenceThreshold", "response.maxTokens"],
    requireEvalBefore: true,
    requireEvalAfter: true,
    autoRevertOnRegression: true,
    structuralChanges: "proposal_only",
  },
} as const;

/** The set of actions that force a human confirmation gate. */
export const HUMAN_GATE_ACTIONS: ReadonlySet<GatedAction> = new Set(
  SHELL_CONFIG.safety.humanGateRequiredFor,
);
