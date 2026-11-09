import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeCatastrophicSsrResponse } from "./server";

const jsonResponse = (body: string, status = 500) =>
  new Response(body, { status, headers: { "content-type": "application/json; charset=utf-8" } });

afterEach(() => vi.restoreAllMocks());

describe("catastrophic SSR error normalization", () => {
  it("recognizes h3's equivalent pretty-printed and reordered JSON error", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const original = jsonResponse(JSON.stringify({ message: "HTTPError", unhandled: true }, null, 2));

    const response = await normalizeCatastrophicSsrResponse(original);

    expect(response.status).toBe(500);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(await response.text()).toContain("This page didn't load");
    expect(log).toHaveBeenCalledOnce();
    // Reading the clone must not consume the upstream response body.
    expect(await original.json()).toEqual({ message: "HTTPError", unhandled: true });
  });

  it("does not change other JSON errors or a string-valued unhandled flag", async () => {
    for (const body of [
      JSON.stringify({ message: "OtherError", unhandled: true }),
      JSON.stringify({ message: "HTTPError", unhandled: "true" }),
      JSON.stringify({ message: "HTTPError", unhandled: false }),
      JSON.stringify(["HTTPError"]),
      "{ malformed JSON",
    ]) {
      const original = jsonResponse(body);
      expect(await normalizeCatastrophicSsrResponse(original)).toBe(original);
    }
  });

  it("preserves non-server failures and non-JSON 500 responses", async () => {
    const nonServer = jsonResponse('{"unhandled":true,"message":"HTTPError"}', 400);
    expect(await normalizeCatastrophicSsrResponse(nonServer)).toBe(nonServer);
    const html = new Response("<h1>error</h1>", {
      status: 500,
      headers: { "content-type": "text/html" },
    });
    expect(await normalizeCatastrophicSsrResponse(html)).toBe(html);
  });
});
