import { describe, expect, it } from "vitest";
import {
  createState,
  FLOW_STAGES,
  stepState,
  THIRTEEN_AGENTS,
  toSnapshot,
  type SimState,
} from "./engine";

function run(seed: number, steps: number): SimState {
  let s = createState(seed);
  for (let i = 0; i < steps; i += 1) s = stepState(s);
  return s;
}

describe("simulation engine — the thirteen agents", () => {
  it("has exactly thirteen agents with unique registry ids", () => {
    expect(THIRTEEN_AGENTS).toHaveLength(13);
    const ids = new Set(THIRTEEN_AGENTS.map((a) => a.id));
    expect(ids.size).toBe(13);
    expect(THIRTEEN_AGENTS.every((a) => a.id.startsWith("nx_"))).toBe(true);
  });

  it("starts every agent idle and the snapshot reports agentCount 13", () => {
    const snap = toSnapshot(createState());
    expect(snap.agentCount).toBe(13);
    expect(snap.agents.every((a) => a.phase === "idle")).toBe(true);
    expect(snap.is_simulation).toBe(true);
  });
});

describe("simulation engine — determinism (stable across sessions)", () => {
  it("same seed → identical event sequence", () => {
    const a = run(0x1e5, 40);
    const b = run(0x1e5, 40);
    expect(a.events.map((e) => e.id)).toEqual(b.events.map((e) => e.id));
    expect(a.events.map((e) => `${e.agentId}:${e.phase}`)).toEqual(
      b.events.map((e) => `${e.agentId}:${e.phase}`),
    );
  });

  it("different seeds → different sequences (RNG actually drives it)", () => {
    const a = run(1, 40);
    const b = run(999, 40);
    expect(a.events.map((e) => e.id)).not.toEqual(b.events.map((e) => e.id));
  });

  it("every emitted event is tagged is_simulation and bounded", () => {
    const s = run(7, 200);
    expect(s.events.length).toBeLessThanOrEqual(60);
    expect(s.events.every((e) => e.is_simulation === true)).toBe(true);
    expect(s.events.every((e) => THIRTEEN_AGENTS.some((a) => a.id === e.agentId))).toBe(true);
  });

  it("the seven-stage flow advances in lock-step with the tick", () => {
    let s = createState();
    for (let i = 0; i < FLOW_STAGES.length + 2; i += 1) {
      s = stepState(s);
      expect(s.flowStage).toBe(FLOW_STAGES[s.tick % FLOW_STAGES.length]);
    }
  });

  it("agents cycle idle → analyzing → executing → reporting and count cycles", () => {
    const s = run(0x1e5, 300);
    // At least one agent has completed a full reporting cycle.
    expect(s.agents.some((a) => a.cycles > 0)).toBe(true);
    expect(
      s.agents.every((a) => ["idle", "analyzing", "executing", "reporting"].includes(a.phase)),
    ).toBe(true);
  });
});
