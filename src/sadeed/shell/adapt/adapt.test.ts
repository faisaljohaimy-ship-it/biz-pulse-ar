import { describe, expect, it } from "vitest";
import { SHELL_CONFIG } from "../config";
import {
  clampParam,
  decideAdaptation,
  isAdaptableScope,
  isRegression,
  type EvalMetrics,
} from "./index";

const GOOD: EvalMetrics = { accuracy: 0.93, hallucination: 0, gateCompliance: 1 };
const topK = SHELL_CONFIG.selection.topK;

describe("SADEED shell — bounded adaptation", () => {
  it("clamps candidates into [min,max]", () => {
    expect(clampParam(topK, 99)).toBe(topK.max);
    expect(clampParam(topK, -5)).toBe(topK.min);
    expect(clampParam(topK, 4)).toBe(4);
  });

  it("only the three scoped params are adaptable", () => {
    expect(isAdaptableScope("selection.topK")).toBe(true);
    expect(isAdaptableScope("response.maxTokens")).toBe(true);
    expect(isAdaptableScope("safety.toolCallsEnabled")).toBe(false);
  });

  it("accepts a within-bounds change when evals do not regress", () => {
    const d = decideAdaptation("selection.topK", topK, 4, GOOD, GOOD);
    expect(d.accepted).toBe(true);
    expect(d.value).toBe(4);
    expect(d.proposalRequired).toBe(false);
  });

  it("auto-reverts to default on an eval regression", () => {
    const worse: EvalMetrics = { accuracy: 0.8, hallucination: 0, gateCompliance: 1 };
    const d = decideAdaptation("selection.topK", topK, 5, GOOD, worse);
    expect(d.accepted).toBe(false);
    expect(d.value).toBe(topK.default);
    expect(isRegression(GOOD, worse)).toBe(true);
  });

  it("treats any hallucination or gate drop as a regression", () => {
    expect(isRegression(GOOD, { accuracy: 0.95, hallucination: 1, gateCompliance: 1 })).toBe(true);
    expect(isRegression(GOOD, { accuracy: 0.95, hallucination: 0, gateCompliance: 0.9 })).toBe(
      true,
    );
  });

  it("routes a structural change to a proposal instead of applying it", () => {
    const d = decideAdaptation("safety.toolCallsEnabled", topK, 1, GOOD, GOOD);
    expect(d.accepted).toBe(false);
    expect(d.proposalRequired).toBe(true);
  });
});
