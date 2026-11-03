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
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  BUILTIN_PROJECT_REF,
  UNRESOLVED_PROJECT_REF,
  isIssuerResolved,
  resolveIssuer,
  resolveProjectRef,
} from "./project-ref";

const LIVE = "cnaevysaoimzusnvpazr";

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
  //
  // 2026-11-03: all copies moved together to cnaevysaoimzusnvpazr, the
  // independent production project (the frozen Lovable Cloud copy
  // jhutlofapjfjjeajawie rejects writes since 2026-10-22). The evidence was
  // production's own binding, not memory — docs/operations/LOVABLE_DETACH_2026-11-03.md.
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

  // The fifth copy. vite.config.ts bakes the project URL and id into the client
  // bundle as a last-resort fallback; before 2026-11-03 it silently kept naming
  // the frozen Lovable Cloud copy while everything else was meant to agree.
  const fallbackRefs = (src: string) => [
    ...[...src.matchAll(/"https:\/\/([a-z0-9]{20})\.supabase\.co"/g)].map((m) => m[1]),
    ...[...src.matchAll(/SUPABASE_PROJECT_ID\s*\|\|\s*"([a-z0-9]{20})"/g)].map((m) => m[1]),
  ];

  it("the vite.config.ts build-time fallbacks (URL and id) name the declared project", () => {
    const refs = fallbackRefs(readFileSync("vite.config.ts", "utf8"));
    expect(refs).toHaveLength(2);
    expect(new Set(refs)).toEqual(new Set([declared()]));
  });

  it("the fallback guard goes red when one literal drifts to another project (planted)", () => {
    const drifted = readFileSync("vite.config.ts", "utf8").replace(
      `"https://${declared()}.supabase.co"`,
      '"https://jhutlofapjfjjeajawie.supabase.co"',
    );
    expect(drifted).not.toBe(readFileSync("vite.config.ts", "utf8"));
    expect(new Set(fallbackRefs(drifted))).not.toEqual(new Set([declared()]));
  });
});

describe("the publishable key baked into vite.config.ts (the third literal)", () => {
  // The URL and the id are checked above, but a project ref says nothing about
  // the key: a publishable key is an opaque token, and nothing inside it names
  // the project that issued it. 2026-11-03 review: swapping the literal for the
  // frozen Lovable Cloud project's key left every guard above green, while a
  // build without VITE_SUPABASE_* would have paired the production host with
  // that key and answered every call with "invalid API key". A build that sets
  // its own variables never reads the literal, so the fault would surface only
  // in a preview, a CI build or a local run — exactly where nobody looks.
  // The pattern stops at the closing parenthesis on purpose: were the literal
  // deleted, a looser pattern would run on into the next entry (the project id)
  // and report that as the key.
  //
  // What this CAN prove: the literal exists, has the publishable shape, and is
  // not the one key known to belong to the wrong project. What it CANNOT prove
  // is that it is the production key — no file can. That was checked once, by
  // hand, against Supabase's get_publishable_keys for the project, and is
  // recorded in docs/operations/LOVABLE_DETACH_2026-11-03.md (A-6).
  const SHAPE = /^sb_publishable_[A-Za-z0-9_-]{20,}$/;

  // Prefix only, on purpose: it is enough to recognise the key and keeps the
  // whole token out of the test. The key itself still sits in the migration
  // below, which is why this list can be anchored to something real.
  const FROZEN_PROJECT_KEY_PREFIX = "sb_publishable_8Mvuk";

  // The last `|| "<literal>"` of the VITE_SUPABASE_PUBLISHABLE_KEY entry: the
  // value that fills the gap when no variable is set.
  const keyLiterals = (src: string) =>
    [
      ...src.matchAll(
        /"import\.meta\.env\.VITE_SUPABASE_PUBLISHABLE_KEY":\s*JSON\.stringify\([^)]*?\|\|\s*"([^"]*)"\s*,?\s*\)/g,
      ),
    ].map((m) => m[1]);

  const sourceOf = () => readFileSync("vite.config.ts", "utf8");

  it("is present exactly once and has the sb_publishable_ shape", () => {
    const found = keyLiterals(sourceOf());
    expect(found).toHaveLength(1);
    expect(found[0]).toMatch(SHAPE);
  });

  it("is not the frozen Lovable Cloud project's key — anywhere in the file", () => {
    expect(keyLiterals(sourceOf())[0].startsWith(FROZEN_PROJECT_KEY_PREFIX)).toBe(false);
    expect(sourceOf()).not.toContain(FROZEN_PROJECT_KEY_PREFIX);
  });

  it("the deny-list prefix is real: the frozen key is still in the 2026-07-07 migration", () => {
    // Without this a mistyped prefix would make the deny-list vacuous and the
    // planted test below would still pass, because it reuses the same prefix.
    const dir = "supabase/migrations";
    const file = readdirSync(dir).find((f) => f.startsWith("20260707220839_"));
    expect(file).toBeDefined();
    expect(readFileSync(`${dir}/${file}`, "utf8")).toContain(FROZEN_PROJECT_KEY_PREFIX);
  });

  it("the key guards go red on planted violations", () => {
    const original = sourceOf();
    const current = keyLiterals(original)[0];
    const plant = (literal: string) => original.replace(`"${current}"`, `"${literal}"`);
    expect(plant("sb_publishable_x")).not.toBe(original);

    // 1. The frozen project's key: well-formed, so the shape check alone is
    //    blind to it — the deny-list is what catches it.
    const frozen = plant(FROZEN_PROJECT_KEY_PREFIX + "x".repeat(26));
    expect(keyLiterals(frozen)[0]).toMatch(SHAPE);
    expect(frozen).toContain(FROZEN_PROJECT_KEY_PREFIX);

    // 2. A legacy JWT anon key, a truncated key and an empty literal all fail
    //    the shape check.
    for (const bad of ["eyJhbGciOiJIUzI1NiJ9." + "a".repeat(30), "sb_publishable_short", ""]) {
      expect(keyLiterals(plant(bad))[0]).not.toMatch(SHAPE);
    }

    // 3. Removing the literal altogether leaves no key to check.
    const removed = original.replace(/\|\|\s*"sb_publishable_[^"]*"/, "");
    expect(removed).not.toBe(original);
    expect(keyLiterals(removed)).toHaveLength(0);
  });
});
