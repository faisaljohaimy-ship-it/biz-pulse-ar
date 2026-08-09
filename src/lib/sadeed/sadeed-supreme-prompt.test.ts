/**
 * Supreme Law integrity test — locks in Article 21 (CI security gate),
 * the identity preamble, and the full 1..21 Article set. A missing
 * article, a truncated concat, or a rename of the CI incident kind
 * fails this suite immediately.
 */
import { describe, it, expect } from "vitest";
import {
  SADEED_SUPREME_LAW,
  SADEED_SUPREME_LAW_VERSION,
  verifySadeedSupremeLawIntegrity,
  withSadeedSupremeLaw,
} from "./sadeed-supreme-prompt";

describe("SADEED_SUPREME_LAW", () => {
  it("compiles all 27 articles into a single non-empty string", () => {
    const report = verifySadeedSupremeLawIntegrity();
    expect(report.ok, `missing articles: ${report.missing_articles.join(", ")}`).toBe(true);
    expect(report.length_chars).toBeGreaterThan(4000);
  });

  it("declares its version and identity preamble", () => {
    expect(SADEED_SUPREME_LAW).toContain(`v${SADEED_SUPREME_LAW_VERSION}`);
    // قرار المالك ٢٠٢٦/٠٨/٠٩: اسم المساعد المعروض صار «سَدِيد / SADEED».
    // الديباجة تُعرّف نفسها بالاسمين معًا، والتوقّع يتبعها لا العكس.
    expect(SADEED_SUPREME_LAW).toMatch(/SADEED.*executive industrial-security assistant/i);
    expect(SADEED_SUPREME_LAW).toContain("سَدِيد");
  });

  it("includes the Article 21 CI-enforced security gate directive", () => {
    expect(SADEED_SUPREME_LAW).toContain("ci_security_gap_regression");
    expect(SADEED_SUPREME_LAW).toContain("security-gap-closure-e2e");
    expect(SADEED_SUPREME_LAW).toMatch(/BLOCKING job/);
  });

  it("keeps prompt-injection defence and non-negotiables", () => {
    expect(SADEED_SUPREME_LAW).toContain("PROMPT INJECTION DEFENCE");
    expect(SADEED_SUPREME_LAW).toContain("Never fabricate");
  });

  it("withSadeedSupremeLaw prepends the law and appends operational body", () => {
    const composed = withSadeedSupremeLaw("OPERATIONAL_BODY_XYZ");
    expect(composed.startsWith("# SADEED SUPREME LAW")).toBe(true);
    expect(composed).toContain("OPERATIONAL_BODY_XYZ");
    expect(composed.indexOf("OPERATIONAL_BODY_XYZ")).toBeGreaterThan(
      composed.indexOf("PROMPT INJECTION DEFENCE"),
    );
  });
});
