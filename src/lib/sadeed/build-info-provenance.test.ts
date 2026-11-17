import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const script = resolve(process.cwd(), "scripts/write-build-info.mjs");
const githubSha = "a".repeat(40);
const vercelSha = "b".repeat(40);
const overrideSha = "c".repeat(40);

function buildInfo(env: Record<string, string>) {
  const cwd = mkdtempSync(join(tmpdir(), "sadeed-build-info-"));
  try {
    const child = spawnSync(process.execPath, [script], {
      cwd,
      encoding: "utf8",
      timeout: 10_000,
      // No inherited provider or production credentials in the isolated fixture.
      env: { PATH: process.env.PATH ?? "", ...env },
    });
    expect(child.error).toBeUndefined();
    expect(child.status).toBe(0);
    return JSON.parse(readFileSync(join(cwd, "public/build-info.json"), "utf8")) as {
      sha: string;
      ref: string;
      source: string;
    };
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

describe("build-info provider provenance", () => {
  it("prefers the Vercel commit and branch over inherited GitHub metadata", () => {
    expect(
      buildInfo({
        VERCEL: "1",
        GITHUB_SHA: githubSha,
        GITHUB_REF_NAME: "unrelated-ci-branch",
        VERCEL_GIT_COMMIT_SHA: vercelSha,
        VERCEL_GIT_COMMIT_REF: "main",
      }),
    ).toMatchObject({
      sha: vercelSha,
      ref: "main",
      source: "VERCEL_GIT_COMMIT_SHA",
    });
  });

  it("preserves GitHub Actions provenance outside Vercel", () => {
    expect(
      buildInfo({
        GITHUB_SHA: githubSha,
        GITHUB_REF_NAME: "ci-branch",
        VERCEL_GIT_COMMIT_SHA: vercelSha,
        VERCEL_GIT_COMMIT_REF: "main",
      }),
    ).toMatchObject({ sha: githubSha, ref: "ci-branch", source: "GITHUB_SHA" });
  });

  it("preserves explicit owner build overrides", () => {
    expect(
      buildInfo({
        VERCEL: "1",
        SADEED_BUILD_SHA: overrideSha,
        SADEED_BUILD_REF: "approved-ref",
        GITHUB_SHA: githubSha,
        VERCEL_GIT_COMMIT_SHA: vercelSha,
      }),
    ).toMatchObject({
      sha: overrideSha,
      ref: "approved-ref",
      source: "SADEED_BUILD_SHA",
    });
  });

  it("falls back to a validated GitHub SHA if Vercel metadata is invalid", () => {
    expect(
      buildInfo({
        VERCEL: "1",
        VERCEL_GIT_COMMIT_SHA: "not-a-sha",
        VERCEL_GIT_COMMIT_REF: "main",
        GITHUB_SHA: githubSha,
        GITHUB_REF_NAME: "main",
      }),
    ).toMatchObject({ sha: githubSha, ref: "main", source: "GITHUB_SHA" });
  });

  it("does not inherit an invalid Vercel SHA's ref for a valid GitHub fallback", () => {
    expect(
      buildInfo({
        VERCEL: "1",
        VERCEL_GIT_COMMIT_SHA: "not-a-sha",
        VERCEL_GIT_COMMIT_REF: "main",
        GITHUB_SHA: githubSha,
      }),
    ).toMatchObject({ sha: githubSha, ref: "unknown", source: "GITHUB_SHA" });
  });
});
