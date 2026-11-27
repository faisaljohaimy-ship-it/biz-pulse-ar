import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

// Exercise the exact package resolved by express-rate-limit, rather than adding
// a direct application dependency or probing a real network address.
const require = createRequire(import.meta.url);
const rateLimitRequire = createRequire(require.resolve("express-rate-limit"));
const { Address6 } = rateLimitRequire("ip-address") as {
  Address6: new (address: string) => { isLinkLocal(): boolean };
};

describe("dependency security behavior", () => {
  it("recognizes the entire IPv6 fe80::/10 link-local range", () => {
    for (const address of ["fe80::1", "fe90::1", "fea0::1", "febf::1"]) {
      expect(new Address6(address).isLinkLocal(), address).toBe(true);
    }
    for (const address of ["2001:db8::1", "fec0::1", "::1"]) {
      expect(new Address6(address).isLinkLocal(), address).toBe(false);
    }
  });
});
