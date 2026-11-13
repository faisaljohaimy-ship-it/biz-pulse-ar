// @vitest-environment node
/**
 * `httpFetch` مع إشارة المستدعي (مراجعة الخطوة ٢، ٢٠٢٦/١٠/٢٩): الذراع المتّجهية
 * المهجورة عند موعدها (2 ث) كانت تترك نداء التضمين يكمل محاولاته الثلاث
 * (15 ث × 3 + تراجع ≈ 45 ث) — نداءٌ مدفوع يعمل بعد أن مضى الردّ. الإشارة
 * تُدمج بمؤقّت المحاولة **وتمنع أي محاولة تالية**. لكل قاعدة حالة حمراء
 * مزروعة (المادة ٣٠).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { httpFetch } from "./http.server";

const net = { calls: 0, hang: false };
const realFetch = globalThis.fetch;

beforeEach(() => {
  net.calls = 0;
  net.hang = false;
  globalThis.fetch = ((_: unknown, init?: RequestInit) =>
    new Promise<Response>((resolve, reject) => {
      net.calls += 1;
      const sig = init?.signal;
      if (sig?.aborted) {
        reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
        return;
      }
      sig?.addEventListener("abort", () =>
        reject(Object.assign(new Error("aborted"), { name: "AbortError" })),
      );
      if (!net.hang) resolve(new Response("{}", { status: 200 }));
    })) as typeof fetch;
});
afterEach(() => {
  globalThis.fetch = realFetch;
  vi.useRealTimers();
});

describe("إشارة المستدعي تهجر النداء ولا تعيده", () => {
  it("rejects late headers after cancellation and releases the unread body", async () => {
    const outer = new AbortController();
    let cancelled = false;
    let calls = 0;
    const body = new ReadableStream<Uint8Array>({
      cancel() {
        cancelled = true;
      },
    });
    globalThis.fetch = (async () => {
      calls++;
      outer.abort();
      return new Response(body, { status: 200 });
    }) as typeof fetch;

    await expect(
      httpFetch("https://example.invalid/late-headers", {
        signal: outer.signal,
        retries: 2,
      }),
    ).rejects.toMatchObject({ code: "upstream_timeout" });
    expect(calls).toBe(1);
    expect(cancelled).toBe(true);
  });

  it("إلغاءٌ أثناء محاولة معلّقة ⇐ رفضٌ فوري ومحاولة واحدة لا ثلاث", async () => {
    net.hang = true;
    const outer = new AbortController();
    const p = httpFetch("https://example.invalid/embed", {
      signal: outer.signal,
      retries: 2,
      timeoutMs: 15_000,
      label: "t",
    });
    const t0 = Date.now();
    setTimeout(() => outer.abort(), 20);
    await expect(p).rejects.toMatchObject({ code: "upstream_timeout" });
    expect(Date.now() - t0).toBeLessThan(1_000);
    expect(net.calls).toBe(1);
  });

  it("إشارةٌ مطلقة قبل النداء ⇐ لا نداء إطلاقًا", async () => {
    const outer = new AbortController();
    outer.abort();
    await expect(
      httpFetch("https://example.invalid/embed", { signal: outer.signal, retries: 2 }),
    ).rejects.toMatchObject({ code: "upstream_timeout" });
    expect(net.calls).toBe(0);
  });

  it("إلغاءٌ أثناء تراجع الإعادة (بعد 503) ⇐ لا محاولة ثانية", async () => {
    globalThis.fetch = (() => {
      net.calls += 1;
      return Promise.resolve(new Response("", { status: 503 }));
    }) as typeof fetch;
    const outer = new AbortController();
    const p = httpFetch("https://example.invalid/embed", {
      signal: outer.signal,
      retries: 2,
      retryBaseMs: 5_000,
    });
    setTimeout(() => outer.abort(), 20);
    await expect(p).rejects.toMatchObject({ code: "upstream_timeout" });
    expect(net.calls).toBe(1);
  });

  it("مزروع: مؤقّت المحاولة وحده (بلا إشارة) يعيد المحاولة بعد التراجع — السلوك القديم على الذراع المهجورة", async () => {
    vi.useFakeTimers();
    net.hang = true;
    const p = httpFetch("https://example.invalid/embed", {
      retries: 1,
      timeoutMs: 50,
      retryBaseMs: 10,
    }).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(50);
    await vi.advanceTimersByTimeAsync(200);
    await vi.advanceTimersByTimeAsync(50);
    const err = (await p) as { code?: string };
    expect(err.code).toBe("upstream_timeout");
    // محاولتان: المؤقّت الداخلي لا يعرف أن المستدعي مضى.
    expect(net.calls).toBe(2);
  });

  it("بلا إلغاء ⇐ النداء يمضي كما كان (200)", async () => {
    const outer = new AbortController();
    const res = await httpFetch("https://example.invalid/embed", { signal: outer.signal });
    expect(res.status).toBe(200);
    expect(net.calls).toBe(1);
  });
});

describe("upstream Retry-After wait budget", () => {
  it.each([
    { status: 429, retryAfter: "86400" },
    { status: 503, retryAfter: new Date(Date.now() + 3_600_000).toUTCString() },
  ])(
    "returns $status promptly instead of sleeping past the timeout budget",
    async ({ status, retryAfter }) => {
      let calls = 0;
      globalThis.fetch = (async () => {
        calls += 1;
        return new Response("busy", { status, headers: { "Retry-After": retryAfter } });
      }) as typeof fetch;

      const response = await httpFetch("https://example.invalid/upstream", {
        retries: 2,
        timeoutMs: 100,
        retryBaseMs: 0,
      });

      expect(response.status).toBe(status);
      expect(calls).toBe(1);
    },
  );

  it.each(["0x10", "1e2", "+500", "2099-01-01"])(
    "ignores non-HTTP Retry-After %s instead of suppressing a healthy retry",
    async (retryAfter) => {
      let calls = 0;
      globalThis.fetch = (async () => {
        calls += 1;
        return calls === 1
          ? new Response("busy", { status: 429, headers: { "Retry-After": retryAfter } })
          : new Response("ok", { status: 200 });
      }) as typeof fetch;

      const response = await httpFetch("https://example.invalid/invalid-retry-after", {
        retries: 1,
        timeoutMs: 100,
        retryBaseMs: 0,
      });

      expect(calls).toBe(2);
      expect(response.status).toBe(200);
    },
  );

  it("still retries a short Retry-After and returns a recovered response", async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return calls === 1
        ? new Response("busy", { status: 429, headers: { "Retry-After": "0" } })
        : new Response("ok", { status: 200 });
    }) as typeof fetch;

    const response = await httpFetch("https://example.invalid/upstream", {
      retries: 1,
      timeoutMs: 100,
      retryBaseMs: 0,
    });

    expect(response.status).toBe(200);
    expect(calls).toBe(2);
  });
});
