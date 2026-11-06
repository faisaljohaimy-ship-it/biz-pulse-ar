// @vitest-environment node
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, truncateSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

const script = resolve("scripts/check-performance-budget.mjs");
const dirs: string[] = [];
function fixture(path: string, bytes = 16) {
  const cwd = mkdtempSync(join(tmpdir(), "sadeed-budget-"));
  dirs.push(cwd);
  addAsset(cwd, path, bytes);
  return cwd;
}
function addAsset(cwd: string, path: string, bytes: number) {
  const dir = join(cwd, path, "assets");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, "app.js");
  writeFileSync(file, "");
  truncateSync(file, bytes);
}
function run(cwd: string, vercel = "") {
  return spawnSync(process.execPath, [script], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, VERCEL: vercel },
  });
}
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("performance budgets for standalone Vercel builds", () => {
  it("finds a Vercel-only build outside the hosting environment", () => {
    expect(run(fixture(".vercel/output/static")).status).toBe(0);
  });
  it("finds the explicit Vercel target", () => {
    expect(run(fixture(".vercel/output/static"), "1").status).toBe(0);
  });
  it("retains the existing JavaScript limit for Vercel output", () => {
    const r = run(fixture(".vercel/output/static", 2 * 1024 * 1024), "1");
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("1.40 MiB");
  });
  it("does not validate stale Cloudflare output instead of an oversized Vercel build", () => {
    const cwd = fixture("dist/client");
    addAsset(cwd, ".vercel/output/static", 2 * 1024 * 1024);
    expect(run(cwd, "1").status).toBe(1);
  });
  it("fails closed when an explicit Vercel build is missing even if another target exists", () => {
    expect(run(fixture("dist/client"), "1").status).toBe(1);
  });
  it("preserves the normal local/CI target", () => {
    expect(run(fixture("dist/client")).status).toBe(0);
  });
  it("preserves the legacy Nitro target", () => {
    expect(run(fixture(".output/public")).status).toBe(0);
  });
});
