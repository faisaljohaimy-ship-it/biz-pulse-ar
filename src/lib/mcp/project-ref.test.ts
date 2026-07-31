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
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  BUILTIN_PROJECT_REF,
  UNRESOLVED_PROJECT_REF,
  isIssuerResolved,
  resolveIssuer,
  resolveProjectRef,
} from "./project-ref";

const LIVE = "jhutlofapjfjjeajawie";

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

describe("the repo agrees with itself about which project this is", () => {
  // Four Supabase project refs have appeared in this repository's history, and
  // every disagreement cost real debugging: one made `supabase link` target the
  // wrong project; another shipped an OAuth issuer no client could resolve.
  //
  // The three copies must agree, and config.toml is the fixed point they are
  // compared against — but config.toml is NOT the source of truth about which
  // project this is. That authority lives in production: the deployed
  // /.well-known/oauth-protected-resource document, and the manifest the build
  // plugin regenerates from the real Supabase binding. This distinction is not
  // pedantic. The ref was changed three times in one session from memory and
  // from the owner's personal Supabase dashboard, and each time this repo's
  // files were made consistently WRONG — consistency is not correctness. The
  // live endpoint settled it by advertising the original value.
  //
  // So: this test stops the three copies from drifting apart. It cannot tell
  // you the ref is right. Only production can, and Article 4 says so.
  const ref = (s: string) => s.match(/[a-z0-9]{20}/)?.[0];
  const declared = () => ref(readFileSync("supabase/config.toml", "utf8"));

  it("config.toml declares a well-formed project ref", () => {
    expect(declared()).toMatch(/^[a-z0-9]{20}$/);
  });

  it("the baked-in MCP fallback matches the declared project", () => {
    // If these drift, /mcp advertises an auth server for a different project
    // and every token is rejected with nothing in the response explaining why.
    expect(BUILTIN_PROJECT_REF).toBe(declared());
    expect(BUILTIN_PROJECT_REF).not.toBe(UNRESOLVED_PROJECT_REF);
  });

  it("the committed MCP manifest matches the declared project", () => {
    // The manifest is regenerated by the build plugin and has silently reverted
    // to a retired ref more than once in this repo's history.
    const manifest = ref(
      JSON.parse(readFileSync(".lovable/mcp/manifest.json", "utf8")).auth.issuer as string,
    );
    expect(manifest).toBe(declared());
  });

  it("the ref this suite asserts against is the declared one", () => {
    expect(declared()).toBe(LIVE);
  });
});
