/**
 * Supreme Law integrity test — locks in Article 21 (CI security gate),
 * the identity preamble, and the full 1..21 Article set. A missing
 * article, a truncated concat, or a rename of the CI incident kind
 * fails this suite immediately.
 */
import { describe, it, expect } from "vitest";
import {
  FINN_SUPREME_LAW,
  FINN_SUPREME_LAW_VERSION,
  verifyFinnSupremeLawIntegrity,
  withFinnSupremeLaw,
} from "./finn-supreme-prompt";

describe("FINN_SUPREME_LAW", () => {
  it("compiles all 27 articles into a single non-empty string", () => {
    const report = verifyFinnSupremeLawIntegrity();
    expect(report.ok, `missing articles: ${report.missing_articles.join(", ")}`).toBe(true);
    expect(report.length_chars).toBeGreaterThan(4000);
  });

  it("declares its version and identity preamble", () => {
    expect(FINN_SUPREME_LAW).toContain(`v${FINN_SUPREME_LAW_VERSION}`);
    expect(FINN_SUPREME_LAW).toMatch(
      /FINN.*Executive AI Engine of the Industrial Security Platform/i,
    );
  });

  it("includes the Article 21 CI-enforced security gate directive", () => {
    expect(FINN_SUPREME_LAW).toContain("ci_security_gap_regression");
    expect(FINN_SUPREME_LAW).toContain("security-gap-closure-e2e");
    expect(FINN_SUPREME_LAW).toMatch(/BLOCKING job/);
  });

  it("keeps prompt-injection defence and non-negotiables", () => {
    expect(FINN_SUPREME_LAW).toContain("PROMPT INJECTION DEFENCE");
    expect(FINN_SUPREME_LAW).toContain("Never fabricate");
  });

  it("withFinnSupremeLaw prepends the law and appends operational body", () => {
    const composed = withFinnSupremeLaw("OPERATIONAL_BODY_XYZ");
    expect(composed.startsWith("# FINN SUPREME LAW")).toBe(true);
    expect(composed).toContain("OPERATIONAL_BODY_XYZ");
    expect(composed.indexOf("OPERATIONAL_BODY_XYZ")).toBeGreaterThan(
      composed.indexOf("PROMPT INJECTION DEFENCE"),
    );
  });
});
