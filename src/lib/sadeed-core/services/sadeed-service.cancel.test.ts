import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: session } }));
import { CHAT_TIMEOUT_CODE } from "./chat-error-text";
import { CHAT_DEADLINE_MS, pingChat, sadeedAuthedFetch } from "./sadeed-service";

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

  // المهلة مشتقّة من سقف الخادم (45 ث + ≈5 ث بوّابات + 5 ث هامش = 55 ث). كانت 30 ث
  // فيُجهَض كل دورٍ بين 30 و45 ث في العميل، وكانت تُرمى `AbortError` فتعاملها حزمة
  // `ai` إيقافًا هادئًا (status=ready). الدور «العميق» (75 ث في الخادم) حُذف فرعه من
  // العميل: لا مستدعيَ له. الأرقام هنا حرفيّة عمدًا: من يغيّر الثوابت يرى هذا الملف يحمرّ.
  /** fetch لا يردّ أبدًا إلا بإجهاضٍ يرفضه بسبب الإشارة — كما يفعل Chrome/Firefox. */
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
  /** كما يفعل WebKit (Safari وiOS): يرفض بـ`AbortError` عامة أيًّا كان سبب الإجهاض. */
  const webkitHangingFetch = () =>
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_input: unknown, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener(
              "abort",
              () => reject(new DOMException("Fetch is aborted", "AbortError")),
              { once: true },
            );
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

  it("WebKit: المهلة تُرمى TimeoutError برمز الدردشة حتى لو رفض fetch بـAbortError عامة", async () => {
    webkitHangingFetch();
    const request = sadeedAuthedFetch("/api/chat", { method: "POST" });
    const rejected = expect(request).rejects.toMatchObject({
      name: "TimeoutError",
      message: CHAT_TIMEOUT_CODE,
    });
    await vi.advanceTimersByTimeAsync(CHAT_DEADLINE_MS - 1);
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    await vi.advanceTimersByTimeAsync(1);
    await rejected;
    expect(vi.getTimerCount()).toBe(0);
  });

  it("WebKit: Stop يبقى AbortError الأصلية (لا تُقلب مهلةً)، ولو قبل المهلة بلحظة", async () => {
    webkitHangingFetch();
    const stop = new AbortController();
    const request = sadeedAuthedFetch("/api/chat", { method: "POST", signal: stop.signal });
    const rejected = expect(request).rejects.toMatchObject({
      name: "AbortError",
      message: "Fetch is aborted",
    });
    await vi.advanceTimersByTimeAsync(CHAT_DEADLINE_MS - 1);
    stop.abort();
    await rejected;
    await vi.advanceTimersByTimeAsync(CHAT_DEADLINE_MS);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("خطأ شبكة بلا إجهاض يبقى كما جاء — لا يُقلب مهلة", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    await expect(sadeedAuthedFetch("/api/chat", { method: "POST" })).rejects.toMatchObject({
      name: "TypeError",
      message: "Failed to fetch",
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("المهلة معاملٌ لكل نداء: فحص الصحّة 8 ث لا 55 ث، والمهلة الافتراضية لم تتغيّر", async () => {
    hangingFetch();
    const request = sadeedAuthedFetch("/api/chat/health", { method: "GET" }, 8_000);
    const rejected = expect(request).rejects.toMatchObject({
      name: "TimeoutError",
      message: CHAT_TIMEOUT_CODE,
    });
    await vi.advanceTimersByTimeAsync(7_999);
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    await vi.advanceTimersByTimeAsync(1);
    await rejected;
    expect(vi.getTimerCount()).toBe(0);
  });

  it("pingChat: الخادم المعلّق يحسم {ok:false} عند 8 ث لا بعد دقيقة", async () => {
    hangingFetch();
    let result: unknown = "pending";
    void pingChat().then((r) => {
      result = r;
    });
    await vi.advanceTimersByTimeAsync(7_999);
    expect(result).toBe("pending");
    await vi.advanceTimersByTimeAsync(1);
    expect(result).toEqual({ ok: false });
    expect(vi.getTimerCount()).toBe(0);
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
