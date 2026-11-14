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

  it("leaves built-in reference nodes alone before live signals arrive", () => {
    const { result } = renderHook(() => useLiveTwinNodes(nodes, undefined, true));
    expect(result.current).toBe(nodes);
  });
});
