import { afterEach, describe, expect, it } from "vitest";
import { cleanup, renderHook } from "@testing-library/react";
import type { TwinSignals } from "@/lib/intelligence.functions";
import { unmeasuredLabel } from "@/lib/evidence/evidence";
import { useLiveTwinNodes } from "./twin-live-nodes";

const nodes = [
  { id: "know", value: "reference documents" },
  { id: "exec", value: "reference speed" },
  { id: "data", value: "reference events" },
  { id: "custom", value: "unchanged" },
];

const baseSignals: TwinSignals = {
  departments: 12,
  events: 42,
  agents: 47,
  integrations: 63,
  automations: 9,
  documents: null,
  criticalRisks: 2,
  boardActions: 5,
  intelligenceSignals: 318,
  executionVelocity: null,
  generatedAt: "2026-11-05T00:00:00.000Z",
};

const valueOf = (values: typeof nodes, id: string) => values.find((n) => n.id === id)?.value;

afterEach(cleanup);

describe("digital twin signal memo — locale regression", () => {
  it("updates missing labels immediately on Arabic/English switch with identical signals", () => {
    const { result, rerender } = renderHook(({ ar }) => useLiveTwinNodes(nodes, baseSignals, ar), {
      initialProps: { ar: true },
    });
    expect(valueOf(result.current, "know")).toBe(unmeasuredLabel(true));
    expect(valueOf(result.current, "exec")).toBe(unmeasuredLabel(true));
    expect(valueOf(result.current, "data")).toBe("42");

    rerender({ ar: false });
    expect(valueOf(result.current, "know")).toBe(unmeasuredLabel(false));
    expect(valueOf(result.current, "exec")).toBe(unmeasuredLabel(false));
    expect(valueOf(result.current, "data")).toBe("42");

    rerender({ ar: true });
    expect(valueOf(result.current, "know")).toBe(unmeasuredLabel(true));
    expect(valueOf(result.current, "custom")).toBe("unchanged");
  });

  it("preserves measured zeroes and accepts updated signals without a language switch", () => {
    const { result, rerender } = renderHook(
      ({ signals }) => useLiveTwinNodes(nodes, signals, false),
      { initialProps: { signals: baseSignals } },
    );
    rerender({ signals: { ...baseSignals, documents: 0, executionVelocity: 0, events: 0 } });
    expect(valueOf(result.current, "know")).toBe("0");
    expect(valueOf(result.current, "exec")).toBe("0%");
    expect(valueOf(result.current, "data")).toBe("0");
  });

  it("renders measured zero for departments, agents and integrations instead of reference counts", () => {
    const referenceNodes = [
      { id: "depts", value: "12 reference departments" },
      { id: "agents", value: "47 reference agents" },
      { id: "integ", value: "63 reference integrations" },
    ];
    const { result, rerender } = renderHook(
      ({ signals }) => useLiveTwinNodes(referenceNodes, signals, false),
      { initialProps: { signals: baseSignals } },
    );
    expect(result.current.map((node) => node.value)).toEqual(["12", "47", "63"]);

    rerender({
      signals: { ...baseSignals, departments: 0, agents: 0, integrations: 0 },
    });
    expect(result.current.map((node) => node.value)).toEqual(["0", "0", "0"]);
  });

  it("labels all non-finite live counters as unmeasured in both locales", () => {
    const allNodes = [
      "depts",
      "data",
      "agents",
      "integ",
      "flows",
      "know",
      "risk",
      "board",
      "intel",
      "exec",
    ].map((id) => ({ id, value: "reference" }));
    const invalid: TwinSignals = {
      ...baseSignals,
      departments: Infinity,
      events: NaN,
      agents: NaN,
      integrations: -Infinity,
      automations: Infinity,
      documents: NaN,
      criticalRisks: Infinity,
      boardActions: NaN,
      intelligenceSignals: -Infinity,
      executionVelocity: Infinity,
    };
    const { result, rerender } = renderHook(
      ({ ar, signals }) => useLiveTwinNodes(allNodes, signals, ar),
      { initialProps: { ar: true, signals: invalid } },
    );
    for (const ar of [true, false]) {
      rerender({ ar, signals: invalid });
      expect(result.current.map((node) => node.value)).toEqual(
        allNodes.map(() => unmeasuredLabel(ar)),
      );
    }
  });

  it("does not present negative live counts as measured events in either locale", () => {
    const countIds = [
      "depts",
      "data",
      "agents",
      "integ",
      "flows",
      "know",
      "risk",
      "board",
      "intel",
    ];
    const allNodes = [...countIds, "exec"].map((id) => ({ id, value: "reference" }));
    const corrupt: TwinSignals = {
      ...baseSignals,
      departments: -1,
      events: -7,
      agents: -3,
      integrations: -4,
      automations: -2,
      documents: -6,
      criticalRisks: -1,
      boardActions: -1,
      intelligenceSignals: -5,
      executionVelocity: -12,
    };
    const { result, rerender } = renderHook(({ ar }) => useLiveTwinNodes(allNodes, corrupt, ar), {
      initialProps: { ar: true },
    });
    for (const ar of [true, false]) {
      rerender({ ar });
      expect(result.current.slice(0, countIds.length).map((node) => node.value)).toEqual(
        countIds.map(() => unmeasuredLabel(ar)),
      );
      expect(result.current.at(-1)?.value).toBe("-12%");
    }
  });

  it("keeps null optional-node reference fallbacks and measured zero counts", () => {
    const allNodes = ["depts", "agents", "integ", "flows", "risk", "board", "intel"].map((id) => ({
      id,
      value: "reference",
    }));
    const { result } = renderHook(() =>
      useLiveTwinNodes(
        allNodes,
        {
          ...baseSignals,
          departments: null as unknown as number,
          agents: null as unknown as number,
          integrations: null as unknown as number,
          automations: 0,
          criticalRisks: 0,
          boardActions: 0,
          intelligenceSignals: 0,
        },
        false,
      ),
    );
    expect(result.current.map((node) => node.value)).toEqual([
      "reference",
      "reference",
      "reference",
      "0",
      "0",
      "0",
      "0",
    ]);
  });

  it("leaves built-in reference nodes alone before live signals arrive", () => {
    const { result } = renderHook(() => useLiveTwinNodes(nodes, undefined, true));
    expect(result.current).toBe(nodes);
  });
});
