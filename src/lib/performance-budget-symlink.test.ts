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

function checkFixture(prepare: (root: string, output: string) => void, vercel = "") {
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
      env: { ...process.env, VERCEL: vercel },
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

  it("rejects a linked output root even when its assets are small", () => {
    const result = checkFixture((root, output) => {
      const foreign = join(root, "foreign-build");
      mkdirSync(foreign);
      writeFileSync(join(foreign, "main.js"), "export {};\n");
      rmSync(output, { recursive: true, force: true });
      symlinkSync(foreign, output, "dir");
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Unverified symlink in production output path: dist/client");
  });

  it("rejects a linked output parent before traversing its assets", () => {
    const result = checkFixture((root) => {
      const foreign = join(root, "foreign-dist");
      mkdirSync(join(foreign, "client"), { recursive: true });
      writeFileSync(join(foreign, "client", "main.js"), "export {};\n");
      rmSync(join(root, "dist"), { recursive: true, force: true });
      symlinkSync(foreign, join(root, "dist"), "dir");
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Unverified symlink in production output path: dist");
  });

  it("rejects a linked Vercel static output root", () => {
    const result = checkFixture((root) => {
      const output = join(root, ".vercel", "output", "static");
      mkdirSync(join(root, ".vercel", "output"), { recursive: true });
      const foreign = join(root, "foreign-static");
      mkdirSync(foreign);
      writeFileSync(join(foreign, "main.js"), "export {};\\n");
      symlinkSync(foreign, output, "dir");
    }, "1");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "Unverified symlink in production output path: .vercel/output/static",
    );
  });

  it("rejects a linked Vercel output parent before walking the static directory", () => {
    const result = checkFixture((root) => {
      const vercelDir = join(root, ".vercel");
      mkdirSync(vercelDir);
      const foreign = join(root, "foreign-output");
      mkdirSync(join(foreign, "static"), { recursive: true });
      writeFileSync(join(foreign, "static", "main.js"), "export {};\\n");
      symlinkSync(foreign, join(vercelDir, "output"), "dir");
    }, "1");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "Unverified symlink in production output path: .vercel/output",
    );
  });

  it("does not certify an oversized external media asset hidden behind a file symlink", () => {
    const result = checkFixture((root, output) => {
      const media = join(root, "oversized.mp4");
      writeFileSync(media, "");
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
      writeFileSync(join(external, "oversized.js"), "");
      truncateSync(join(external, "oversized.js"), 11 * 1024 * 1024);
      symlinkSync(external, join(output, "assets"), "dir");
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Unverified symlink in production output: assets");
  });
});
