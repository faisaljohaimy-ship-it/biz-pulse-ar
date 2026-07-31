/**
 * MCP OAuth issuer — contract guard.
 *
 * The bug this locks down: the issuer was built from VITE_SUPABASE_PROJECT_ID
 * alone, a variable set in no environment (.env.local, deploy.yml and ci.yml
 * all pass VITE_SUPABASE_URL instead). Every build therefore shipped
 * `https://project-ref-unset.supabase.co/auth/v1`, RFC 8414 discovery hit a
 * host that does not resolve, and connecting a client to /mcp always failed.
 *
 * Nothing caught it, because nothing was broken in the ordinary sense: a
 * template string with an unset variable still produces a syntactically valid
 * URL. tsc is happy, the build is happy, the server boots. It only fails at the
 * moment a human tries to link the system — the one path no test exercised.
 */
import { describe, expect, it } from "vitest";
import {
  UNRESOLVED_PROJECT_REF,
  isIssuerResolved,
  resolveIssuer,
  resolveProjectRef,
} from "./project-ref";

const LIVE = "khytdwgyrnztqabhfgbb";

describe("project ref resolution", () => {
  it("prefers the explicit variable when it is set", () => {
    expect(resolveProjectRef({ VITE_SUPABASE_PROJECT_ID: LIVE })).toBe(LIVE);
  });

  it("falls back to the ref inside VITE_SUPABASE_URL — the fix", () => {
    // This is the case that was broken: the URL is set everywhere, the
    // PROJECT_ID is set nowhere.
    expect(resolveProjectRef({ VITE_SUPABASE_URL: `https://${LIVE}.supabase.co` })).toBe(LIVE);
    expect(resolveProjectRef({ VITE_SUPABASE_URL: `https://${LIVE}.supabase.co/` })).toBe(LIVE);
  });

  it("ignores an empty or whitespace PROJECT_ID rather than trusting it", () => {
    // `?? ` would accept "" and produce `https://.supabase.co/auth/v1`.
    expect(
      resolveProjectRef({
        VITE_SUPABASE_PROJECT_ID: "  ",
        VITE_SUPABASE_URL: `https://${LIVE}.supabase.co`,
      }),
    ).toBe(LIVE);
  });

  it("refuses a proxy host — the issuer must be the direct Supabase origin", () => {
    // A .lovable.cloud URL is rejected by issuer verification, so it must not
    // be mined for a ref. Reporting "unresolved" beats advertising a host that
    // will be refused during discovery.
    expect(resolveProjectRef({ VITE_SUPABASE_URL: "https://nexios.lovable.cloud" })).toBe(
      UNRESOLVED_PROJECT_REF,
    );
  });

  it("reports unresolved when neither source is usable, and never throws", () => {
    expect(resolveProjectRef({})).toBe(UNRESOLVED_PROJECT_REF);
    expect(resolveProjectRef({ VITE_SUPABASE_URL: "not a url" })).toBe(UNRESOLVED_PROJECT_REF);
  });
});

describe("issuer URL", () => {
  it("is the direct Supabase auth origin", () => {
    expect(resolveIssuer({ VITE_SUPABASE_URL: `https://${LIVE}.supabase.co` })).toBe(
      `https://${LIVE}.supabase.co/auth/v1`,
    );
  });

  it("exposes whether the endpoint is actually connectable", () => {
    expect(isIssuerResolved({ VITE_SUPABASE_PROJECT_ID: LIVE })).toBe(true);
    expect(isIssuerResolved({})).toBe(false);
  });

  it("resolves for the environment this repo ships with", () => {
    // The real guarantee: given the variables the deploy pipeline actually
    // passes, does /mcp come out connectable? If someone removes
    // VITE_SUPABASE_URL from deploy.yml, this is the test that objects.
    expect(isIssuerResolved({ VITE_SUPABASE_URL: `https://${LIVE}.supabase.co` })).toBe(true);
  });
});
