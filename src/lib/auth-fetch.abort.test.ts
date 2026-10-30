// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth } }));
import { authenticatedFetch, AUTH_SESSION_DEADLINE_MS } from "./auth-fetch";

const guest = { data: { session: null }, error: null };
const http = vi.fn();
beforeEach(() => {
  vi.useFakeTimers();
  auth.getSession.mockReset().mockResolvedValue(guest);
  http.mockReset().mockResolvedValue(new Response("ok"));
  vi.stubGlobal("fetch", http);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("authenticated request session lifecycle", () => {
  it("does not start a pre-cancelled lookup or request", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(authenticatedFetch("/api/chat", { signal: controller.signal }))
      .rejects.toMatchObject({ name: "AbortError" });
    expect(auth.getSession).not.toHaveBeenCalled();
    expect(http).not.toHaveBeenCalled();
  });

  it("bounds a stalled lookup and does not send a late request", async () => {
    let resolve!: (value: typeof guest) => void;
    auth.getSession.mockReturnValue(new Promise((done) => { resolve = done; }));
    const pending = authenticatedFetch("/api/chat");
    const checked = expect(pending).rejects.toMatchObject({ name: "TimeoutError" });
    await vi.advanceTimersByTimeAsync(AUTH_SESSION_DEADLINE_MS);
    await checked;
    resolve(guest);
    await vi.advanceTimersByTimeAsync(0);
    expect(http).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("honors cancellation during a session lookup", async () => {
    auth.getSession.mockReturnValue(new Promise(() => undefined));
    const controller = new AbortController();
    const pending = authenticatedFetch("/api/finn/chat", { signal: controller.signal });
    const checked = expect(pending).rejects.toMatchObject({ name: "AbortError" });
    await vi.advanceTimersByTimeAsync(0);
    controller.abort();
    await checked;
    expect(http).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not downgrade a failed lookup into an anonymous request", async () => {
    auth.getSession.mockResolvedValue({ ...guest, error: { message: "private-detail" } });
    await expect(authenticatedFetch("/api/chat"))
      .rejects.toThrow("Authentication session unavailable.");
    expect(http).not.toHaveBeenCalled();
  });

  it("preserves valid guest access and Request headers", async () => {
    const request = new Request("https://example.invalid/chat", { headers: { "x-test": "kept" } });
    await authenticatedFetch(request);
    const options = http.mock.calls[0][1] as RequestInit;
    expect(new Headers(options.headers).get("x-test")).toBe("kept");
    expect(new Headers(options.headers).has("authorization")).toBe(false);
    expect(options.signal).toBe(request.signal);
    expect(vi.getTimerCount()).toBe(0);
  });
});
