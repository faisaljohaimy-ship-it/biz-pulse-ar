import { describe, expect, it } from "vitest";
import { readPublicResult } from "./public-result";

describe("public lookup failures never masquerade as missing records", () => {
  it("keeps an explicit 404 as not found", async () => {
    expect(await readPublicResult(Response.json({ ok: false }, { status: 404 }))).toBeNull();
  });
  it("rejects a 500 instead of returning not found", async () => {
    await expect(
      readPublicResult(Response.json({ error: "server_error" }, { status: 500 })),
    ).rejects.toThrow();
  });
  it("rejects a rate limit instead of invalidating the link", async () => {
    await expect(readPublicResult(Response.json({}, { status: 429 }))).rejects.toThrow();
  });
  it("returns a successful result", async () => {
    expect(await readPublicResult(Response.json({ valid: true }))).toEqual({ valid: true });
  });
  it("rejects malformed success data", async () => {
    await expect(readPublicResult(new Response("invalid"))).rejects.toThrow();
  });
});
