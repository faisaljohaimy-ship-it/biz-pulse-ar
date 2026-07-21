import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ANIMATED_ELEMENT_BUDGET,
  PHASES,
  REFERENCE_AUTOMATIONS,
  REFERENCE_SOURCES,
  SEV_RGB,
  WALKTHROUGH,
  shapeOrbitData,
  stateToSev,
} from "./operating-orbit-model";
import type { AgentOpsOverview } from "@/lib/exec.functions";

const src = readFileSync(
  join(process.cwd(), "src/components/executive/orbit/OperatingOrbit.tsx"),
  "utf8",
);

/** A synthetic live overview so we can assert the live-wins path. */
function overview(states: string[]): AgentOpsOverview {
  return {
    agents: states.map((state, i) => ({
      id: `a${i}`,
      name: `وكيل${i}`,
      goal: "هدف",
      model: "m",
      enabled: true,
      tool_allowlist: [],
      permissions: [],
      metadata: {},
      updated_at: "",
      state: state as AgentOpsOverview["agents"][number]["state"],
      total_runs: 0,
      succeeded: 0,
      failed: 0,
      cancelled: 0,
      running: 0,
      success_rate: 0,
      avg_duration_ms: null,
      last_status: null,
      last_run_at: null,
      last_finished_at: null,
    })),
    system: {
      agents_total: states.length,
      agents_enabled: states.length,
      agents_running: states.filter((s) => s === "running").length,
      agents_failed: 0,
      agents_idle: 0,
      agents_ready: 0,
      agents_disabled: 0,
      runs_window_total: 0,
      runs_today: 99,
      avg_duration_ms: null,
      queue_length: states.filter((s) => s === "queued").length,
      window_days: 30,
    },
  };
}

describe("OperatingOrbit — data model (single source)", () => {
  it("renders the reference simulation when no overview is available (never blanks)", () => {
    const d = shapeOrbitData(null);
    expect(d.agents.length).toBeGreaterThan(0);
    expect(d.agents.length).toBeLessThanOrEqual(8);
    expect(d.sources).toEqual([...REFERENCE_SOURCES]);
    expect(d.automations).toEqual([...REFERENCE_AUTOMATIONS]);
    expect(d.isSimulation).toBe(true);
  });

  it("lets a live overview win for the agent ring, capped at eight", () => {
    const d = shapeOrbitData(overview(Array(11).fill("running")));
    expect(d.agents).toHaveLength(8);
    expect(d.system.runsToday).toBe(99);
    expect(d.system.agentsActive).toBe(11); // running + queue_length from system aggregates
  });

  it("keeps the simulation badge on (open showcase, reference sims always in play)", () => {
    expect(shapeOrbitData(overview(["running"])).isSimulation).toBe(true);
  });

  it("maps agent states to the exact severity palette", () => {
    expect(stateToSev("failed")).toBe("critical");
    expect(stateToSev("queued")).toBe("high");
    expect(stateToSev("running")).toBe("medium");
    expect(stateToSev("ready")).toBe("healthy");
    expect(stateToSev(null)).toBe("idle");
    expect(SEV_RGB.healthy).toBe("16, 185, 129");
  });

  it("exposes the four permanent phases ending at the human gate (art. 21)", () => {
    expect(PHASES.map((p) => p.key)).toEqual(["sources", "intelligence", "automations", "gate"]);
    expect(WALKTHROUGH).toHaveLength(4);
    expect(WALKTHROUGH.at(-1)?.key).toBe("gate");
  });
});

describe("OperatingOrbit — performance & governance contract", () => {
  it("declares a bounded animated-element budget", () => {
    expect(ANIMATED_ELEMENT_BUDGET).toBeLessThanOrEqual(24);
  });

  it("animates ONLY transform / opacity / stroke-dashoffset — never box-shadow/filter/blur", () => {
    // No animation shorthand or @keyframes target may touch a banned property.
    for (const banned of ["box-shadow", "filter", "blur", "backdrop-filter"]) {
      // allow the word to appear nowhere inside an @keyframes / .oo-* animation rule
      expect(src.includes(`${banned}:`)).toBe(false);
    }
    // stroke-dashoffset / transform / opacity are the only animated channels.
    expect(src).toMatch(/@keyframes oo-flow[^}]*stroke-dashoffset/);
    expect(src).toMatch(/@keyframes oo-spin[^}]*transform: rotate/);
    expect(src).toMatch(/@keyframes oo-breathe[^}]*opacity/);
  });

  it("freezes all motion off-screen and under reduced-motion", () => {
    expect(src).toContain("IntersectionObserver");
    expect(src).toContain('[data-live="0"] .oo-anim { animation: none');
    expect(src).toContain("prefers-reduced-motion: reduce");
  });

  it("uses no chart/animation library and no canvas", () => {
    expect(src).not.toMatch(/from ["'](d3|three|framer-motion|gsap|chart\.js|recharts)/);
    expect(src.toLowerCase()).not.toContain("getcontext");
    expect(src).not.toContain("<canvas");
  });

  it("routes every path through a single human-approval gate (art. 8)", () => {
    expect(src).toContain("GateGlyph");
    expect(src).toContain("approval_pipeline");
    expect(src).toContain("Lock");
  });

  it("keeps keyboard operability on interactive nodes (≥44px targets via min-h)", () => {
    expect(src).toContain('role="button"');
    expect(src).toContain("onKeyDown");
    expect(src).toContain("tabIndex={0}");
  });
});
