// @vitest-environment node
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SCRIPT = fileURLToPath(new URL("../../scripts/write-build-info.mjs", import.meta.url));
const PLATFORM_SHA = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const OVERRIDE_SHA = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

function runBuildInfo(vars: Record<string, string>) {
  const cwd = mkdtempSync(join(tmpdir(), "sadeed-build-info-"));
  try {
    const child = spawnSync(process.execPath, [SCRIPT], {
      cwd,
      encoding: "utf8",
      timeout: 10_000,
      env: { PATH: process.env.PATH ?? "", ...vars },
    });
    expect(child.error).toBeUndefined();
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

describe("build-info ref and SHA provenance must agree", () => {
  it("does not attach an orphaned manual ref to an actual Vercel commit", () => {
    const info = runBuildInfo({
      VERCEL: "1",
      VERCEL_GIT_COMMIT_SHA: PLATFORM_SHA,
      VERCEL_GIT_COMMIT_REF: "main",
      SADEED_BUILD_REF: "stale-release",
    });
    expect(info).toMatchObject({
      sha: PLATFORM_SHA,
      ref: "main",
      source: "VERCEL_GIT_COMMIT_SHA",
    });
  });

  it("does not attach an orphaned manual ref to a GitHub Actions commit", () => {
    const info = runBuildInfo({
      GITHUB_SHA: PLATFORM_SHA,
      GITHUB_REF_NAME: "ci-branch",
      SADEED_BUILD_REF: "stale-release",
    });
    expect(info).toMatchObject({
      sha: PLATFORM_SHA,
      ref: "ci-branch",
      source: "GITHUB_SHA",
    });
  });

  it("preserves an explicit, paired owner SHA and ref override on Vercel", () => {
    const info = runBuildInfo({
      VERCEL: "1",
      VERCEL_GIT_COMMIT_SHA: PLATFORM_SHA,
      VERCEL_GIT_COMMIT_REF: "main",
      SADEED_BUILD_SHA: OVERRIDE_SHA,
      SADEED_BUILD_REF: "approved-ref",
    });
    expect(info).toMatchObject({
      sha: OVERRIDE_SHA,
      ref: "approved-ref",
      source: "SADEED_BUILD_SHA",
    });
  });

  it("ignores a stale ref when the manual SHA override is malformed", () => {
    const info = runBuildInfo({
      VERCEL: "true",
      VERCEL_GIT_COMMIT_SHA: PLATFORM_SHA,
      VERCEL_GIT_COMMIT_REF: "main",
      SADEED_BUILD_SHA: "not-a-sha",
      SADEED_BUILD_REF: "stale-release",
    });
    expect(info).toMatchObject({
      sha: PLATFORM_SHA,
      ref: "main",
      source: "VERCEL_GIT_COMMIT_SHA",
    });
  });

  it("keeps an unpaired manual SHA override's ref unknown", () => {
    const info = runBuildInfo({
      VERCEL: "1",
      VERCEL_GIT_COMMIT_SHA: PLATFORM_SHA,
      VERCEL_GIT_COMMIT_REF: "main",
      SADEED_BUILD_SHA: OVERRIDE_SHA,
    });
    expect(info).toMatchObject({ sha: OVERRIDE_SHA, source: "SADEED_BUILD_SHA", ref: "unknown" });
  });

  it("does not borrow GitHub CI metadata when a Vercel build has no platform SHA", () => {
    const info = runBuildInfo({
      VERCEL: "1",
      GITHUB_SHA: PLATFORM_SHA,
      GITHUB_REF_NAME: "unrelated-ci-branch",
    });
    expect(info).toMatchObject({ sha: "unknown", source: "none", ref: "unknown" });
  });

  it("does not borrow Cloudflare or generic SHA metadata on Vercel", () => {
    const info = runBuildInfo({
      VERCEL: "true",
      CF_PAGES_COMMIT_SHA: PLATFORM_SHA,
      CF_PAGES_BRANCH: "unrelated-cloudflare-branch",
      COMMIT_SHA: OVERRIDE_SHA,
    });
    expect(info).toMatchObject({ sha: "unknown", source: "none", ref: "unknown" });
  });

  it("still uses GitHub CI provenance outside Vercel", () => {
    const info = runBuildInfo({ GITHUB_SHA: PLATFORM_SHA, GITHUB_REF_NAME: "ci-main" });
    expect(info).toMatchObject({ sha: PLATFORM_SHA, source: "GITHUB_SHA", ref: "ci-main" });
  });

  it("does not borrow a GitHub ref for a Vercel SHA", () => {
    const info = runBuildInfo({
      VERCEL: "1",
      VERCEL_GIT_COMMIT_SHA: PLATFORM_SHA,
      GITHUB_REF_NAME: "unrelated-ci-branch",
    });
    expect(info).toMatchObject({
      sha: PLATFORM_SHA,
      source: "VERCEL_GIT_COMMIT_SHA",
      ref: "unknown",
    });
  });

  it("does not borrow a Cloudflare ref for a GitHub SHA", () => {
    const info = runBuildInfo({
      GITHUB_SHA: PLATFORM_SHA,
      CF_PAGES_BRANCH: "unrelated-cloudflare-branch",
    });
    expect(info).toMatchObject({ sha: PLATFORM_SHA, source: "GITHUB_SHA", ref: "unknown" });
  });

  it("does not label a generic SHA with an unrelated provider ref", () => {
    const info = runBuildInfo({
      COMMIT_SHA: OVERRIDE_SHA,
      GITHUB_REF_NAME: "unrelated-ci-branch",
    });
    expect(info).toMatchObject({ sha: OVERRIDE_SHA, source: "COMMIT_SHA", ref: "unknown" });
  });
});
