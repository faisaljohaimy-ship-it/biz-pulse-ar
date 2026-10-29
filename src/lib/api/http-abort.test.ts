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
