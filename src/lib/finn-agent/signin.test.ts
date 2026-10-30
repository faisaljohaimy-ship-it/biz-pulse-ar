import { describe, expect, it, vi } from "vitest";
import { probeFinnGoogleProvider } from "./signin";

const config = { publicUrl: "https://fixture.supabase.co", publicKey: "public-fixture" };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("FNN native provider discovery", () => {
  it("checks the browser's configured project without sending a key in the URL", async () => {
    const fetcher = vi.fn(async () => reply({ external: { google: true } }));
    expect(await probeFinnGoogleProvider(fetcher, config)).toBe("enabled");
    expect(fetcher).toHaveBeenCalledWith("https://fixture.supabase.co/auth/v1/settings", {
      method: "GET",
      cache: "no-store",
      redirect: "error",
      signal: expect.any(AbortSignal),
      headers: { apikey: "public-fixture" },
    });
  });
  it.each([
    [{ external: { google: false } }, "disabled"],
    [{ external: { google: "true" } }, "unknown"],
    [{ external: {} }, "unknown"],
    [null, "unknown"],
  ])("classifies only explicit native capability booleans: %j", async (body, expected) => {
    expect(await probeFinnGoogleProvider(async () => reply(body), config)).toBe(expected);
  });
  it("uses public relay only when browser config is absent", async () => {
    const fetcher = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>(async () =>
      reply({ checked: true, googleEnabled: true }),
    );
    expect(await probeFinnGoogleProvider(fetcher)).toBe("enabled");
    expect(fetcher.mock.calls[0][0]).toBe("/api/fnn/auth-health");
  });
  it("does not interpret a failed relay as a disabled provider", async () => {
    expect(
      await probeFinnGoogleProvider(async () => reply({ checked: false, googleEnabled: false })),
    ).toBe("unknown");
    expect(await probeFinnGoogleProvider(async () => reply({}, 503), config)).toBe("unknown");
  });
  it("bounds a body that ignores cancellation", async () => {
    const response = { ok: true, json: () => new Promise(() => {}) } as unknown as Response;
    expect(await probeFinnGoogleProvider(async () => response, { ...config, timeoutMs: 10 })).toBe(
      "unknown",
    );
  });
  it("does not start a request after cancellation", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetcher = vi.fn();
    expect(await probeFinnGoogleProvider(fetcher, { ...config, signal: controller.signal })).toBe(
      "unknown",
    );
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each(["http://remote.example", "https://user:password@fixture.supabase.co", "not-a-url"])(
    "rejects unsafe public configuration: %s",
    async (publicUrl) => {
      const fetcher = vi.fn();
      expect(await probeFinnGoogleProvider(fetcher, { ...config, publicUrl })).toBe("unknown");
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
});
