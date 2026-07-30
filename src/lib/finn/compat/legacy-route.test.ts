/**
 * Legacy API-path compatibility — contract guard.
 *
 * The rename of `/api/…/aria-*` to `/api/…/finn-*` is only outage-free because
 * of these redirects. That makes them load-bearing, and a load-bearing thing
 * with no test is a thing that breaks quietly: a beacon that 404s reports
 * nothing, and a dropped incident looks exactly like a system with no
 * incidents. So the redirect is asserted, not assumed.
 */
import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LEGACY_HANDLERS, finnPathFor, redirectToFinn } from "./legacy-route";

const call = (url: string) => redirectToFinn({ request: new Request(url) });

describe("legacy path mapping", () => {
  it("maps every retired path to its canonical FINN twin", () => {
    expect(finnPathFor("/api/aria/tts")).toBe("/api/finn/tts");
    expect(finnPathFor("/api/aria/providers/status")).toBe("/api/finn/providers/status");
    expect(finnPathFor("/api/public/aria-presence")).toBe("/api/public/finn-presence");
    expect(finnPathFor("/api/public/hooks/aria-incident")).toBe("/api/public/hooks/finn-incident");
    expect(finnPathFor("/api/learn/aria-teach")).toBe("/api/learn/finn-teach");
  });

  it("rewrites only the LAST path segment, never a parent directory", () => {
    // `/api/public/hooks/aria-incident` must not become `/api/public/finn-hooks/…`.
    // A greedy first-match rewrite would do exactly that and produce a 404 that
    // looks like a routing bug rather than a rename bug.
    expect(finnPathFor("/api/public/hooks/aria-docs-ingest")).toBe(
      "/api/public/hooks/finn-docs-ingest",
    );
  });

  it("returns null for a path with nothing to rewrite", () => {
    expect(finnPathFor("/api/chat")).toBeNull();
  });
});

describe("legacy redirect response", () => {
  it("is 308 — the only redirect that must preserve method and body", () => {
    // 301/302 permit a client to turn POST into GET. An incident beacon that
    // arrives as a bodiless GET is a lost report, so the status code matters.
    const res = call("https://x.test/api/public/hooks/aria-incident");
    expect(res.status).toBe(308);
    expect(res.headers.get("Location")).toBe("/api/public/hooks/finn-incident");
  });

  it("carries the query string across the hop", () => {
    // Presence identifies the session with ?sid=. Dropping it would silently
    // start a new conversation instead of continuing one.
    const res = call("https://x.test/api/public/aria-presence?sid=abc123&x=1");
    expect(res.headers.get("Location")).toBe("/api/public/finn-presence?sid=abc123&x=1");
  });

  it("never caches, so the alias can be withdrawn without stale clients", () => {
    expect(call("https://x.test/api/aria/tts").headers.get("Cache-Control")).toBe("no-store");
  });

  it("404s rather than redirecting somewhere invented", () => {
    expect(call("https://x.test/api/chat").status).toBe(404);
  });

  it("redirects every method a caller might use", () => {
    expect(Object.keys(LEGACY_HANDLERS).sort()).toEqual(["DELETE", "GET", "PATCH", "POST", "PUT"]);
  });
});

describe("both halves of every alias exist on disk", () => {
  // The pair is the invariant: a canonical route with no legacy twin breaks old
  // clients; a legacy twin with no canonical target redirects into a 404.
  const routes = globSync("src/routes/api/**/*.ts");
  const legacy = routes.filter((p) =>
    /(^|\/)(aria-|aria\/)/.test(p.replace("src/routes/api/", "")),
  );

  it("found the legacy routes (a silent empty scan would pass vacuously)", () => {
    expect(legacy.length).toBe(15);
  });

  it("pairs each legacy route with a real canonical file", () => {
    const missing = legacy.filter((p) => {
      const twin = p.includes("/api/aria/")
        ? p.replace("/api/aria/", "/api/finn/")
        : p.replace(/\/aria-([^/]+)$/, "/finn-$1");
      return !routes.includes(twin);
    });
    expect(missing).toEqual([]);
  });

  it("keeps every legacy route a pure redirect — no duplicated logic", () => {
    // If someone "fixes" a legacy route by pasting the handler back in, the two
    // copies drift and the bug lands on whichever path that client happens to use.
    const fat = legacy.filter((p) => !readFileSync(p, "utf8").includes("LEGACY_HANDLERS"));
    expect(fat).toEqual([]);
  });
});
