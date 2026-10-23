import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: session } }));
import { sadeedAuthedFetch } from "./sadeed-service";

describe("assistant request cancellation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    session.getSession.mockReset();
    session.getSession.mockResolvedValue({ data: { session: null } });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("ok")),
    );
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("Stop rejects during hanging session lookup without sending a request", async () => {
    session.getSession.mockReturnValue(new Promise(() => {}));
    const stop = new AbortController();
    const request = sadeedAuthedFetch("/api/chat", { signal: stop.signal });
    const rejected = expect(request).rejects.toMatchObject({ name: "AbortError" });
    stop.abort();
    await rejected;
    expect(fetch).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("hanging session lookup uses the existing five-second guest boundary", async () => {
    session.getSession.mockReturnValue(new Promise(() => {}));
    const request = sadeedAuthedFetch("/api/chat");
    await vi.advanceTimersByTimeAsync(4_999);
    expect(fetch).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect((await request).status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("the thirty-second deadline still aborts with an SDK signal", async () => {
    vi.spyOn(AbortSignal, "any").mockImplementation(() => {
      throw new Error("must not require AbortSignal.any");
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_input: unknown, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener("abort", () => reject(init.signal?.reason), {
              once: true,
            });
          }),
      ),
    );
    const request = sadeedAuthedFetch("/api/chat", { signal: new AbortController().signal });
    const rejected = expect(request).rejects.toMatchObject({ name: "AbortError" });
    await vi.advanceTimersByTimeAsync(29_999);
    await vi.advanceTimersByTimeAsync(1);
    await rejected;
    expect(vi.getTimerCount()).toBe(0);
  });

  it("successful session lookup leaves no deadline timers behind", async () => {
    await sadeedAuthedFetch("/api/chat");
    expect(vi.getTimerCount()).toBe(0);
  });
});
