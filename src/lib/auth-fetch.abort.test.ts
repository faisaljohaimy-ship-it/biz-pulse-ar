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
    await expect(
      authenticatedFetch("/api/chat", { signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(auth.getSession).not.toHaveBeenCalled();
    expect(http).not.toHaveBeenCalled();
  });

  it("bounds a stalled lookup and does not send a late request", async () => {
    let resolve!: (value: typeof guest) => void;
    auth.getSession.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
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
    await expect(authenticatedFetch("/api/chat")).rejects.toThrow(
      "Authentication session unavailable.",
    );
    expect(http).not.toHaveBeenCalled();
  });

  it("drops stale authorization from a Request when the current session is guest", async () => {
    const request = new Request("https://example.invalid/chat", {
      headers: { Authorization: "Bearer stale-user-token", "x-test": "kept" },
    });
    await authenticatedFetch(request);
    const headers = new Headers((http.mock.calls[0][1] as RequestInit).headers);
    expect(headers.has("Authorization")).toBe(false);
    expect(headers.get("x-test")).toBe("kept");
  });

  it("never forwards caller authorization instead of the active session token", async () => {
    await authenticatedFetch("/api/chat", {
      headers: { Authorization: "Bearer stale-user-token" },
    });
    const guestHeaders = new Headers((http.mock.calls[0][1] as RequestInit).headers);
    expect(guestHeaders.has("Authorization")).toBe(false);

    auth.getSession.mockResolvedValueOnce({
      data: { session: { access_token: "current-session-token" } },
      error: null,
    });
    await authenticatedFetch("/api/chat", {
      headers: { Authorization: "Bearer stale-user-token" },
    });
    const activeHeaders = new Headers((http.mock.calls[1][1] as RequestInit).headers);
    expect(activeHeaders.get("Authorization")).toBe("Bearer current-session-token");
  });

  it("never forwards an active session bearer to an outside origin", async () => {
    auth.getSession.mockResolvedValue({
      data: { session: { access_token: "current-session-token" } },
      error: null,
    });
    vi.stubGlobal("location", { origin: "https://app.example", href: "https://app.example/" });

    await authenticatedFetch(
      new Request("https://outside.example/collect", {
        headers: { Authorization: "Bearer inherited-token" },
      }),
    );
    // A Request created in another JS realm need not pass instanceof Request.
    await authenticatedFetch({ url: "https://outside.example/collect" } as Request);
    await authenticatedFetch("//outside.example/collect");
    await authenticatedFetch("/\\outside.example/collect");

    expect(http).toHaveBeenCalledTimes(4);
    for (const [, options] of http.mock.calls) {
      expect(new Headers((options as RequestInit).headers).has("authorization")).toBe(false);
    }
  });

  it("allows the active bearer for an absolute URL on the same application origin", async () => {
    auth.getSession.mockResolvedValue({
      data: { session: { access_token: "current-session-token" } },
      error: null,
    });
    vi.stubGlobal("location", { origin: "https://app.example", href: "https://app.example/" });
    await authenticatedFetch("https://app.example/api/chat");
    expect(new Headers((http.mock.calls[0][1] as RequestInit).headers).get("authorization")).toBe(
      "Bearer current-session-token",
    );
  });

  it("does not trust absolute URLs without a known application origin", async () => {
    auth.getSession.mockResolvedValue({
      data: { session: { access_token: "current-session-token" } },
      error: null,
    });
    await authenticatedFetch("https://outside.example/collect");
    expect(new Headers((http.mock.calls[0][1] as RequestInit).headers).has("authorization")).toBe(
      false,
    );
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
