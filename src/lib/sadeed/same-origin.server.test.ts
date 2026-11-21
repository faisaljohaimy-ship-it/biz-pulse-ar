import { describe, expect, it } from "vitest";
import { isSameOrigin } from "./same-origin.server";

const target = "https://example.test/api/sadeed/chat";

function request(origin?: string) {
  return new Request(target, {
    method: "POST",
    ...(origin ? { headers: { origin } } : {}),
  });
}

describe("SADEED same-origin guard", () => {
  it("accepts a canonical HTTPS origin", () => {
    expect(isSameOrigin(request("https://example.test"))).toBe(true);
  });

  it("rejects the same host over HTTP (scheme is part of the origin)", () => {
    expect(isSameOrigin(request("http://example.test"))).toBe(false);
  });

  it("rejects the same host on a different port", () => {
    expect(isSameOrigin(request("https://example.test:8443"))).toBe(false);
  });

  it("rejects a different host", () => {
    expect(isSameOrigin(request("https://attacker.test"))).toBe(false);
  });

  it("rejects opaque, malformed and non-canonical Origin values", () => {
    for (const origin of ["null", "not a URL", "https://example.test/path", "https://user@example.test"]) {
      expect(isSameOrigin(request(origin)), origin).toBe(false);
    }
  });

  it("keeps server-to-server calls without Origin compatible", () => {
    expect(isSameOrigin(request())).toBe(true);
  });
});
