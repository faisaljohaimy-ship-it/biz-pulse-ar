import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(".github/workflows/ci.yml", "utf8");

describe("CI evidence policy", () => {
  it("dependency audit runs after failed tests, but not a failed installation", () => {
    const testJob = workflow.split("\n  test:")[1]?.split("\n  build:")[0] ?? "";
    expect(testJob).toMatch(/name: Install\n\s+id: install/);
    expect(testJob).toMatch(
      /name: Production dependency audit\n\s+if: always\(\) && steps\.install\.outcome == 'success'/,
    );
  });
  it("security E2E reports unavailable coverage even when upstream gates fail", () => {
    const job = workflow.split("\n  security-gap-closure-e2e:")[1]?.split("\n  deploy:")[0] ?? "";
    expect(job).toMatch(/if: always\(\)/);
    expect(job).toContain("NOT RUN");
    expect(job).toContain("$GITHUB_STEP_SUMMARY");
    expect(job).toContain("needs.static.result == 'success'");
    expect(job).toContain("steps.art19.outcome");
  });
});
