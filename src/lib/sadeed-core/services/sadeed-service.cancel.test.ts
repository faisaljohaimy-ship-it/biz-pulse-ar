import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: session } }));
import { CHAT_TIMEOUT_CODE } from "./chat-error-text";
import {
  CHAT_DEADLINE_DEEP_MS,
  CHAT_DEADLINE_MS,
  sadeedAuthedFetch,
  setPendingReplyMode,
} from "./sadeed-service";

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

  // المهلة مشتقّة من سقف الخادم (45 ث + ≈5 ث بوّابات + 5 ث هامش = 55 ث؛ العميق
  // 75 + 5 + 5 = 85 ث). كانت 30 ث فيُجهَض كل دورٍ بين 30 و45 ث في العميل،
  // وكانت تُرمى `AbortError` فتعاملها حزمة `ai` إيقافًا هادئًا (status=ready).
  // الأرقام هنا حرفيّة عمدًا: من يغيّر الثوابت يرى هذا الملف يحمرّ.
  /** fetch لا يردّ أبدًا إلا بإجهاضٍ يرفضه بسبب الإشارة — كما يفعل المتصفح. */
  const hangingFetch = () =>
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

  it("المهلة 55 ث (لا 30) وتُرمى TimeoutError برمز يُترجَم عربيًّا — لا AbortError", async () => {
    vi.spyOn(AbortSignal, "any").mockImplementation(() => {
      throw new Error("must not require AbortSignal.any");
    });
    hangingFetch();
    const request = sadeedAuthedFetch("/api/chat", {
      method: "POST",
      signal: new AbortController().signal,
    });
    const rejected = expect(request).rejects.toMatchObject({
      name: "TimeoutError",
      message: CHAT_TIMEOUT_CODE,
    });
    // ما بعد 30 ث القديمة وقبل 55: الطلب ما زال حيًّا.
    await vi.advanceTimersByTimeAsync(30_000);
    await vi.advanceTimersByTimeAsync(24_999);
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    await vi.advanceTimersByTimeAsync(1);
    await rejected;
    expect(CHAT_DEADLINE_MS).toBe(55_000);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("دور عميق: المهلة 85 ث تغطّي سقف الخادم 75 ث", async () => {
    hangingFetch();
    setPendingReplyMode("deep");
    try {
      const request = sadeedAuthedFetch("/api/chat", { method: "POST" });
      const rejected = expect(request).rejects.toMatchObject({ name: "TimeoutError" });
      await vi.advanceTimersByTimeAsync(84_999);
      expect(vi.getTimerCount()).toBeGreaterThan(0);
      await vi.advanceTimersByTimeAsync(1);
      await rejected;
      expect(CHAT_DEADLINE_DEEP_MS).toBe(85_000);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      setPendingReplyMode("text");
    }
  });

  it("Stop أثناء الطلب يبقى AbortError — إيقافًا هادئًا لا مهلة", async () => {
    hangingFetch();
    const stop = new AbortController();
    const request = sadeedAuthedFetch("/api/chat", { method: "POST", signal: stop.signal });
    const rejected = expect(request).rejects.toMatchObject({ name: "AbortError" });
    await vi.advanceTimersByTimeAsync(10_000);
    stop.abort();
    await rejected;
    expect(vi.getTimerCount()).toBe(0);
  });

  it("Stop قبل المهلة بلحظة يبقى إيقافًا، ولا تقلبه المهلة المتأخرة", async () => {
    hangingFetch();
    const stop = new AbortController();
    const request = sadeedAuthedFetch("/api/chat", { method: "POST", signal: stop.signal });
    const rejected = expect(request).rejects.toMatchObject({ name: "AbortError" });
    await vi.advanceTimersByTimeAsync(CHAT_DEADLINE_MS - 1);
    stop.abort();
    await rejected;
    // لا مؤقّت متبقٍّ يُطلق مهلةً متأخرة على طلبٍ أُوقف.
    await vi.advanceTimersByTimeAsync(CHAT_DEADLINE_MS);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("successful session lookup leaves no deadline timers behind", async () => {
    await sadeedAuthedFetch("/api/chat");
    expect(vi.getTimerCount()).toBe(0);
  });
});
