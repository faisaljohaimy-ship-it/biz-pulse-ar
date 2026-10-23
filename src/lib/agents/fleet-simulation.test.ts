import { describe, expect, it } from "vitest";
import {
  buildFleetFromLiveRows,
  buildFleetSimulation,
  type LiveAgentRow,
} from "./fleet-simulation";

describe("fleet-simulation — reference simulation builder", () => {
  it("builds a thirteen-agent simulation snapshot, tagged is_simulation", () => {
    const state = buildFleetSimulation();
    expect(state.source).toBe("simulation");
    expect(state.is_simulation).toBe(true);
    expect(state.agentCount).toBe(13);
    expect(state.agents).toHaveLength(13);
    expect(state.agents.every((a) => a.id.startsWith("nx_"))).toBe(true);
  });

  it("is deterministic — same seed → identical snapshot", () => {
    const a = buildFleetSimulation(0x1e5, 24);
    const b = buildFleetSimulation(0x1e5, 24);
    expect(a.agents.map((x) => `${x.id}:${x.phase}`)).toEqual(
      b.agents.map((x) => `${x.id}:${x.phase}`),
    );
    expect(a.events.map((e) => e.id)).toEqual(b.events.map((e) => e.id));
  });

  it("derives activeCount from non-idle agents", () => {
    const state = buildFleetSimulation();
    expect(state.activeCount).toBe(state.agents.filter((a) => a.phase !== "idle").length);
  });
});

describe("fleet-simulation — live-row projection (read-only)", () => {
  it("maps live rows into the fleet shape tagged as real, not simulation", () => {
    const rows: LiveAgentRow[] = [
      { id: "nx_hcis_compliance_lead", name: "قائد امتثال", goal: "فحص التوجيهات", enabled: true },
      { id: "nx_rag_knowledge_director", name: "مدير المعرفة", goal: "الاسترجاع", enabled: false },
    ];
    const state = buildFleetFromLiveRows(rows);
    expect(state.source).toBe("live");
    expect(state.is_simulation).toBe(false);
    expect(state.agentCount).toBe(2);
  });

  it("reports only what the rows prove — no invented runtime phase or stage", () => {
    // A definition row proves existence (and enabled), not that the agent is
    // running: enabled and disabled rows both rest in the neutral phase.
    const rows: LiveAgentRow[] = [
      { id: "a", name: "مفعّل", goal: "مهمة", enabled: true },
      { id: "b", name: "معطّل", goal: "مهمة", enabled: false },
      { id: "c", name: null, goal: null, enabled: null },
    ];
    const state = buildFleetFromLiveRows(rows);
    expect(state.agents.map((a) => a.phase)).toEqual(["idle", "idle", "idle"]);
    expect(state.agents.every((a) => a.cycles === 0)).toBe(true);
    expect(state.activeCount).toBe(0);
    expect(state.flowStage).toBe("request");
    expect(state.events).toEqual([]);
  });

  it("falls to an unknown category safely and never throws on nulls", () => {
    const state = buildFleetFromLiveRows([{ id: "x", name: null, goal: null, enabled: null }]);
    expect(state.agents[0].category).toBe("agent-platform");
    expect(state.agents[0].nameAr).toBe("x");
  });
});
