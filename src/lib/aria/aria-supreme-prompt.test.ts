/**
 * Supreme Law integrity test — locks in Article 21 (CI security gate),
 * the identity preamble, and the full 1..21 Article set. A missing
 * article, a truncated concat, or a rename of the CI incident kind
 * fails this suite immediately.
 */
import { describe, it, expect } from "vitest";
import {
  ARIA_SUPREME_LAW,
  ARIA_SUPREME_LAW_VERSION,
  verifyAriaSupremeLawIntegrity,
  withAriaSupremeLaw,
} from "./aria-supreme-prompt";

describe("ARIA_SUPREME_LAW", () => {
  it("compiles all 21 articles into a single non-empty string", () => {
    const report = verifyAriaSupremeLawIntegrity();
    expect(report.ok, `missing articles: ${report.missing_articles.join(", ")}`).toBe(true);
    expect(report.length_chars).toBeGreaterThan(4000);
  });

  it("declares its version and identity preamble", () => {
    expect(ARIA_SUPREME_LAW).toContain(`v${ARIA_SUPREME_LAW_VERSION}`);
    expect(ARIA_SUPREME_LAW).toMatch(/ARIA.*Executive AI Engine of NEXIOS AI OS/i);
  });

  it("includes the Article 21 CI-enforced security gate directive", () => {
    expect(ARIA_SUPREME_LAW).toContain("ci_security_gap_regression");
    expect(ARIA_SUPREME_LAW).toContain("security-gap-closure-e2e");
    expect(ARIA_SUPREME_LAW).toMatch(/BLOCKING job/);
  });

  it("keeps prompt-injection defence and non-negotiables", () => {
    expect(ARIA_SUPREME_LAW).toContain("PROMPT INJECTION DEFENCE");
    expect(ARIA_SUPREME_LAW).toContain("Never fabricate");
  });

  it("withAriaSupremeLaw prepends the law and appends operational body", () => {
    const composed = withAriaSupremeLaw("OPERATIONAL_BODY_XYZ");
    expect(composed.startsWith("# ARIA SUPREME LAW")).toBe(true);
    expect(composed).toContain("OPERATIONAL_BODY_XYZ");
    expect(composed.indexOf("OPERATIONAL_BODY_XYZ")).toBeGreaterThan(
      composed.indexOf("PROMPT INJECTION DEFENCE"),
    );
  });
});
