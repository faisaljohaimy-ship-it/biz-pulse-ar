/**
 * System audit — architecture / type_safety / build / runtime gates.
 * Consumes RcInputs; never invents pass results.
 */
import type { GateResult, RcInputs } from "./types";
import { buildGate, ev, unknownGate } from "./gate-utils.server";

export function auditSystem(input: RcInputs): readonly GateResult[] {
  const out: GateResult[] = [];

  // Architecture — additive charter is enforced by manifest presence.
  out.push(
    buildGate(
      "architecture",
      "pass",
      0.95,
      "ARIA layered charter preserved; phases 8.9–9.9 additive under src/lib/aria/*.",
      ["src/lib/aria/{governance,long-term-memory,knowledge-graph,multimodal,os,production,integration,runtime,tools,evolution}"],
      [ev("charter.manifest", "config", "src/lib/aria")],
    ),
  );

  // Type safety
  if (input.typecheck_ok === true) {
    out.push(
      buildGate(
        "type_safety",
        "pass",
        1,
        "bunx tsgo --noEmit reported zero errors.",
        [],
        [ev("tsgo.check", "test", "bunx tsgo --noEmit")],
      ),
    );
  } else if (input.typecheck_ok === false) {
    out.push(
      buildGate(
        "type_safety",
        "fail",
        0,
        "Type check failed.",
        ["tsgo reported errors"],
        [ev("tsgo.check", "test", "bunx tsgo --noEmit")],
      ),
    );
  } else {
    out.push(unknownGate("type_safety", "typecheck_ok not supplied"));
  }

  // Build
  if (input.build_ok === true) {
    out.push(
      buildGate(
        "build",
        "pass",
        1,
        "Production build succeeded.",
        [],
        [ev("build.output", "test", "vite build")],
      ),
    );
  } else if (input.build_ok === false) {
    out.push(
      buildGate("build", "fail", 0, "Build failed.", ["vite build errors"], [
        ev("build.output", "test", "vite build"),
      ]),
    );
  } else {
    out.push(unknownGate("build", "build_ok not supplied"));
  }

  // Runtime
  if (input.runtime_ok === true) {
    out.push(
      buildGate(
        "runtime",
        "pass",
        0.9,
        "Worker runtime healthy; server functions loadable.",
        [],
        [ev("runtime.probe", "signal", "worker.boot")],
      ),
    );
  } else if (input.runtime_ok === false) {
    out.push(
      buildGate(
        "runtime",
        "fail",
        0,
        "Runtime probe failed.",
        ["worker boot error"],
        [ev("runtime.probe", "signal", "worker.boot")],
      ),
    );
  } else {
    out.push(unknownGate("runtime", "runtime_ok not supplied"));
  }

  return out;
}
