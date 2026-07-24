import { describe, expect, it } from "vitest";
// The guard is a dependency-free .mjs so it can run in CI without a build step;
// we import its exported pure functions to unit-test detection here.
// @ts-expect-error — plain .mjs module without a type declaration.
import { isForbiddenFile, scanText, shouldSkipContent } from "../../../scripts/check-secrets.mjs";

/**
 * Secret-leak guard tests (production-readiness §P3). Prove the guard CATCHES
 * real leaks and does NOT flag legitimate files — so a production secret can
 * never slip into the tree unnoticed.
 */
describe("secret guard — forbidden files", () => {
  it("blocks real env files and database dumps/backups", () => {
    expect(isForbiddenFile(".env")).toBe(true);
    expect(isForbiddenFile(".env.production")).toBe(true);
    expect(isForbiddenFile("config/.env.local")).toBe(true);
    expect(isForbiddenFile("backups/db-backup.sql")).toBe(true);
    expect(isForbiddenFile("snapshot.dump")).toBe(true);
    expect(isForbiddenFile("data/pg_dump-2026.sql.gz")).toBe(true);
  });

  it("allows example env files and legitimate migrations", () => {
    expect(isForbiddenFile(".env.example")).toBe(false);
    expect(isForbiddenFile(".env.sample")).toBe(false);
    expect(isForbiddenFile("supabase/migrations/20260716140000_hcis_compliance.sql")).toBe(false);
    expect(isForbiddenFile("src/lib/foo.ts")).toBe(false);
  });
});

describe("secret guard — credential content", () => {
  it("catches high-confidence credential shapes", () => {
    expect(scanText("a.ts", "-----BEGIN RSA PRIVATE KEY-----\nMIIE...")).toContain(
      "private key block",
    );
    expect(scanText("a.ts", "const k = 'sk-" + "A".repeat(40) + "'")).toContain(
      "OpenAI-style secret key (sk-…)",
    );
    expect(scanText("a.ts", "sk_live_" + "0".repeat(24))).toContain("Stripe live secret key");
    expect(scanText("a.ts", "ghp_" + "b".repeat(36))).toContain(
      "GitHub personal access token (ghp_…)",
    );
    expect(scanText("a.ts", "AKIA" + "ABCDEFGHIJKLMNOP")).toContain("AWS access key id (AKIA…)");
    expect(scanText("a.ts", "AIza" + "x".repeat(35))).toContain("Google API key (AIza…)");
    const jwt = "eyJ" + "a".repeat(20) + "." + "b".repeat(24) + "." + "c".repeat(24);
    expect(scanText("a.ts", jwt)).toContain("JWT / service-role-style token");
  });

  it("flags a pg_dump database dump inside a .sql file", () => {
    expect(
      scanText("x.sql", "-- PostgreSQL database dump\nCOPY public.users FROM stdin;"),
    ).toContain("database dump content");
  });

  it("does NOT flag ordinary source, prose, or a normal migration", () => {
    expect(scanText("src/app.ts", "const region = 'central'; // no secrets here")).toHaveLength(0);
    expect(
      scanText("README.md", "Set SUPABASE_URL in your environment (see .env.example)."),
    ).toHaveLength(0);
    expect(
      scanText("supabase/migrations/x.sql", "create table t (id uuid primary key);"),
    ).toHaveLength(0);
  });

  it("skips lockfiles, the guard itself, and binary assets", () => {
    expect(shouldSkipContent("package-lock.json")).toBe(true);
    expect(shouldSkipContent("scripts/check-secrets.mjs")).toBe(true);
    expect(shouldSkipContent("public/finn.webp")).toBe(true);
    expect(shouldSkipContent("src/lib/foo.ts")).toBe(false);
  });
});
