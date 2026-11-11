import { afterEach, describe, expect, it } from "vitest";
import { cleanup, renderHook } from "@testing-library/react";
import type { TwinSignals } from "@/lib/intelligence.functions";
import { unmeasuredLabel } from "@/lib/evidence/evidence";
import { useLiveTwinNodes } from "./twin-live-nodes";

const nodes = [
  { id: "depts", value: "reference departments" },
  { id: "agents", value: "reference agents" },
  { id: "integ", value: "reference integrations" },
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

  it("shows measured zero rather than reference counts for departments, agents and integrations", () => {
    const zeroSignals = { ...baseSignals, departments: 0, agents: 0, integrations: 0 };
    const { result, rerender } = renderHook(
      ({ signals }) => useLiveTwinNodes(nodes, signals, true),
      { initialProps: { signals: zeroSignals } },
    );
    for (const id of ["depts", "agents", "integ"]) {
      expect(valueOf(result.current, id)).toBe("0");
    }
    rerender({ signals: { ...zeroSignals, departments: 3, agents: 2, integrations: 1 } });
    expect(valueOf(result.current, "depts")).toBe("3");
    expect(valueOf(result.current, "agents")).toBe("2");
    expect(valueOf(result.current, "integ")).toBe("1");
  });

  it("keeps reference fallback for non-finite counts instead of rendering NaN or Infinity", () => {
    const signals = {
      ...baseSignals,
      departments: Number.NaN,
      agents: Number.POSITIVE_INFINITY,
      integrations: Number.NEGATIVE_INFINITY,
    };
    const { result } = renderHook(() => useLiveTwinNodes(nodes, signals, false));
    expect(valueOf(result.current, "depts")).toBe("reference departments");
    expect(valueOf(result.current, "agents")).toBe("reference agents");
    expect(valueOf(result.current, "integ")).toBe("reference integrations");
  });

  it("leaves built-in reference nodes alone before live signals arrive", () => {
    const { result } = renderHook(() => useLiveTwinNodes(nodes, undefined, true));
    expect(result.current).toBe(nodes);
  });
});
