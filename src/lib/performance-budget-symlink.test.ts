// @vitest-environment node
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, truncateSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SCRIPT = fileURLToPath(
  new URL("../../scripts/check-performance-budget.mjs", import.meta.url),
);

function checkFixture(prepare: (root: string, output: string) => void) {
  const root = mkdtempSync(join(tmpdir(), "sadeed-perf-symlink-"));
  try {
    const output = join(root, "dist", "client");
    mkdirSync(output, { recursive: true });
    writeFileSync(join(output, "main.js"), "console.log('ok');\n");
    prepare(root, output);
    const result = spawnSync(process.execPath, [SCRIPT], {
      cwd: root,
      encoding: "utf8",
      timeout: 10_000,
      env: { ...process.env, VERCEL: "" },
    });
    expect(result.error).toBeUndefined();
    return result;
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe("production performance budget symlink integrity", () => {
  it("accepts an ordinary small JavaScript build", () => {
    const result = checkFixture(() => {});
    expect(result.status, result.stderr).toBe(0);
  });

  it("does not certify an oversized external media asset hidden behind a file symlink", () => {
    const result = checkFixture((root, output) => {
      const media = join(root, "oversized.mp4");
      truncateSync(media, 15 * 1024 * 1024);
      symlinkSync(media, join(output, "film.mp4"));
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Unverified symlink in production output: film.mp4");
  });

  it("does not skip an entire linked asset directory", () => {
    const result = checkFixture((root, output) => {
      const external = join(root, "external-assets");
      mkdirSync(external);
      truncateSync(join(external, "oversized.js"), 11 * 1024 * 1024);
      symlinkSync(external, join(output, "assets"), "dir");
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Unverified symlink in production output: assets");
  });
});
