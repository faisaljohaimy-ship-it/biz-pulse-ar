// @vitest-environment node
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SCRIPT = fileURLToPath(new URL("../../scripts/write-build-info.mjs", import.meta.url));
const DEPLOY_SHA = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const STALE_SHA = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

function runBuildInfo(vars: Record<string, string>) {
  const cwd = mkdtempSync(join(tmpdir(), "sadeed-build-info-"));
  try {
    const child = spawnSync(process.execPath, [SCRIPT], {
      cwd,
      encoding: "utf8",
      env: { PATH: process.env.PATH ?? "", ...vars },
    });
    expect(child.status, child.stderr).toBe(0);
    return JSON.parse(readFileSync(join(cwd, "public", "build-info.json"), "utf8")) as {
      sha: string;
      ref: string;
      source: string;
    };
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

describe("build-info deployment provenance", () => {
  it("uses Vercel's actual Git SHA and branch over stale optional overrides", () => {
    const info = runBuildInfo({
      VERCEL: "1",
      VERCEL_GIT_COMMIT_SHA: DEPLOY_SHA,
      VERCEL_GIT_COMMIT_REF: "main",
      SADEED_BUILD_SHA: STALE_SHA,
      SADEED_BUILD_REF: "old-release",
      GITHUB_SHA: STALE_SHA,
    });
    expect(info).toMatchObject({
      sha: DEPLOY_SHA,
      ref: "main",
      source: "VERCEL_GIT_COMMIT_SHA",
    });
  });

  it("preserves explicit override semantics outside Vercel", () => {
    const info = runBuildInfo({
      VERCEL: "0",
      GITHUB_SHA: DEPLOY_SHA,
      SADEED_BUILD_SHA: STALE_SHA,
      SADEED_BUILD_REF: "release-test",
    });
    expect(info).toMatchObject({
      sha: STALE_SHA,
      ref: "release-test",
      source: "SADEED_BUILD_SHA",
    });
  });

  it("falls back safely when Vercel does not supply a Git SHA", () => {
    const info = runBuildInfo({
      VERCEL: "1",
      SADEED_BUILD_SHA: STALE_SHA,
      SADEED_BUILD_REF: "fallback",
    });
    expect(info).toMatchObject({
      sha: STALE_SHA,
      ref: "fallback",
      source: "SADEED_BUILD_SHA",
    });
  });

  it("ignores malformed platform SHAs instead of claiming them", () => {
    const info = runBuildInfo({
      VERCEL: "true",
      VERCEL_GIT_COMMIT_SHA: "not-a-commit",
      SADEED_BUILD_SHA: STALE_SHA,
    });
    expect(info.sha).toBe(STALE_SHA);
    expect(info.source).toBe("SADEED_BUILD_SHA");
  });
});
