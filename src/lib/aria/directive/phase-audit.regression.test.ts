/**
 * NEXIOS FINAL QUALITY DIRECTIVE — regression guard.
 *
 * Enforces `deferredPhaseSensors: 0` from
 * `.lovable/memory/constraints/nexios-final-quality-directive.md`. Any
 * phase in 4/6/7/8/9 reverting to `deferred` fails the test → blocks
 * deploy.
 */
import { describe, expect, it } from "vitest";
import { runDirectiveAudit } from "@/lib/aria/directive/phase-audit.server";

describe("NEXIOS Final Quality Directive — live phase sensors", () => {
  const report = runDirectiveAudit();

  it.each([4, 6, 7, 8, 9])("phase %i is not deferred", (n) => {
    const phase = report.phases.find((p) => p.n === n);
    expect(phase, `phase ${n} missing from audit`).toBeDefined();
    expect(phase!.status).not.toBe("deferred");
    for (const probe of phase!.probes) {
      expect(
        probe.status,
        `phase ${n} probe ${probe.module} is deferred`,
      ).not.toBe("deferred");
    }
  });

  it("overall audit is not red", () => {
    expect(report.overall).not.toBe("red");
  });
});
