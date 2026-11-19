import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, truncateSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const budgetScript = resolve(process.cwd(), "scripts/check-performance-budget.mjs");

function checkIsolatedBuild(assets: Record<string, string | number>) {
  const root = mkdtempSync(join(tmpdir(), "sadeed-performance-budget-"));
  try {
    const out = join(root, "dist", "client");
    mkdirSync(out, { recursive: true });
    for (const [name, content] of Object.entries(assets)) {
      const file = join(out, name);
      mkdirSync(dirname(file), { recursive: true });
      if (typeof content === "number") {
        writeFileSync(file, "");
        truncateSync(file, content);
      } else {
        writeFileSync(file, content);
      }
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
  it("counts uppercase JavaScript assets against the unchanged total and per-file limits", () => {
    const result = checkIsolatedBuild({
      "assets/main.js": "console.log('ok');",
      "assets/vendor.JS": 11 * 1024 * 1024,
    });
    expect(result.status).toBe(1);
    expect(result.output).toContain("Total JavaScript");
    expect(result.output).toContain("exceeded by");
  });

  it("counts uppercase CSS assets against the existing CSS budget", () => {
    const result = checkIsolatedBuild({
      "assets/main.js": "console.log('ok');",
      "assets/theme.CSS": 1024 * 1024,
    });
    expect(result.status).toBe(1);
    expect(result.output).toContain("Total CSS");
    expect(result.output).toContain("exceeded by");
  });

  it("counts uppercase media assets against the existing single-media limit", () => {
    const result = checkIsolatedBuild({
      "assets/main.js": "console.log('ok');",
      "assets/film.MP4": 15 * 1024 * 1024,
    });
    expect(result.status).toBe(1);
    expect(result.output).toContain("Largest media asset");
    expect(result.output).toContain("exceeded by");
  });

});
