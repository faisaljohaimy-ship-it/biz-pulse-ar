import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const budgetScript = resolve(process.cwd(), "scripts/check-performance-budget.mjs");

function checkIsolatedBuild(assets: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), "sadeed-performance-budget-"));
  try {
    const out = join(root, "dist", "client");
    mkdirSync(out, { recursive: true });
    for (const [name, content] of Object.entries(assets)) {
      const file = join(out, name);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, content);
    }

    const result = spawnSync(process.execPath, [budgetScript], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, VERCEL: "" },
    });
    if (result.error) throw result.error;
    return {
      status: result.status,
      output: result.stdout + result.stderr,
    };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe("production performance budget build evidence", () => {
  it("rejects an existing but empty client output instead of passing zero-size budgets", () => {
    const result = checkIsolatedBuild({});
    expect(result.status).not.toBe(0);
    expect(result.output).toContain("contains no JavaScript assets");
  });

  it("rejects CSS-only output even when every size budget is under its cap", () => {
    const result = checkIsolatedBuild({ "assets/app.css": "body { color: black; }" });
    expect(result.status).not.toBe(0);
    expect(result.output).toContain("contains no JavaScript assets");
  });

  it("accepts a real small JavaScript asset within all existing budget caps", () => {
    const result = checkIsolatedBuild({ "assets/app.js": "console.log('SADEED');" });
    expect(result.status).toBe(0);
    expect(result.output).toContain("remain inside every release ceiling");
  });
});
