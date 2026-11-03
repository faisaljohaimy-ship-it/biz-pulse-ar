// @vitest-environment node
/**
 * صدق قناة بريد الزبائن (نموذج /request-demo) — اختبارٌ سلوكي بتشغيل `submitLead` نفسها.
 *
 * العطل: `enqueue_email` تُنشئ طابور `pgmq` عند غيابه وتعيد النجاح، ولا مستهلك للطابور بلا
 * `LOVABLE_API_KEY` (المعالج `/lovable/email/queue/process` يردّ 500). فكان المسار ينتهي إلى
 * `ok:true` ثم `email_delivered:true` ولا يصل بريد — فشلٌ صامت (المادة ٢٧).
 *
 * الإصلاح: بلا ناقل تُتخطّى القناة صراحةً بنتيجةٍ صادقة (`provider:"none"`) وبلا حلقة إعادة،
 * ويبقى جدول `leads` مصدر الحقيقة. وكل اختبارٍ هنا يحمرّ عند إزالة الإصلاح (المادة ٣٠).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  enqueue: vi.fn(),
  updates: [] as Array<{ metadata: Record<string, unknown> }>,
}));

vi.mock("@tanstack/react-start", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- محاكاة سلسلة createServerFn
  const chain: any = {
    middleware: () => chain,
    inputValidator: () => chain,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: (fn: any) => fn,
  };
  return { createServerFn: () => chain };
});
vi.mock("@tanstack/react-start/server", () => ({
  getRequest: () => ({ headers: new Headers({ "user-agent": "vitest" }) }),
  getRequestHeader: () => undefined,
  getRequestIP: () => "203.0.113.9",
}));
vi.mock("@/lib/governance/rate-limit.server", () => ({
  enforceRateLimit: async () => ({ allowed: true }),
}));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: () => ({
      insert: () => ({
        select: () => ({
          single: async () => ({
            data: {
              id: "lead-row-1",
              request_id: "REQ-TEST-1",
              created_at: "2026-11-03T00:00:00Z",
            },
            error: null,
          }),
        }),
      }),
      update: (patch: { metadata: Record<string, unknown> }) => ({
        eq: async () => {
          h.updates.push(patch);
          return { error: null };
        },
      }),
    }),
  },
}));
vi.mock("@/lib/email/enqueue.server", () => ({
  enqueueTemplateEmail: (...args: unknown[]) => h.enqueue(...args),
}));

import { submitLead } from "./leads.functions";

const LEAD_EMAIL = "visitor.private@example.test";
// المعالج بعد المحاكاة دالةٌ مباشرة (`handler: fn => fn`)، لا RPC.
const submit = () =>
  (
    submitLead as unknown as (args: { data: Record<string, unknown> }) => Promise<{
      ok: boolean;
      request_id: string;
      email_delivered: boolean;
    }>
  )({ data: { kind: "demo", name: "Visitor", email: LEAD_EMAIL } });
const delivery = () => h.updates.at(-1)?.metadata.email_delivery as Record<string, unknown>;

describe("submitLead: صدق قناة البريد", () => {
  const saved = { ...process.env };
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    h.enqueue.mockReset();
    h.updates.length = 0;
    delete process.env.LOVABLE_API_KEY;
    process.env.LEADS_NOTIFY_EMAIL = "ops@example.test";
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    process.env = { ...saved };
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("بلا LOVABLE_API_KEY: لا إدراج، ونتيجةٌ صادقة، والطلب نفسه محفوظ", async () => {
    const timeouts = vi.spyOn(globalThis, "setTimeout");

    const res = await submit();

    expect(h.enqueue).not.toHaveBeenCalled();
    expect(res).toMatchObject({ ok: true, request_id: "REQ-TEST-1", email_delivered: false });
    expect(delivery()).toEqual({
      provider: "none",
      internal_skipped: false,
      internal_ok: false,
      confirm_ok: false,
      error: "email_transport_not_configured",
      attempts: 0,
    });
    // بلا حلقة إعادة: لا نوم 400/800ms بين محاولاتٍ لا تُنشئ ناقلًا.
    expect(timeouts.mock.calls.filter(([, ms]) => typeof ms === "number" && ms >= 400)).toEqual([]);
  });

  it("المفتاح الفارغ أو المسافات يُعامل غيابًا", async () => {
    for (const blank of ["", "   "]) {
      h.enqueue.mockReset();
      process.env.LOVABLE_API_KEY = blank;
      const res = await submit();
      expect(h.enqueue, JSON.stringify(blank)).not.toHaveBeenCalled();
      expect(res.email_delivered).toBe(false);
    }
  });

  it("يسجّل خطأً واحدًا بالمعرّف وحده — لا بريد الزائر ولا اسمه", async () => {
    await submit();

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const [message, payload] = errorSpy.mock.calls[0] as [string, unknown];
    expect(message).toContain("email transport not configured");
    expect(payload).toEqual({ requestId: "REQ-TEST-1" });
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(LEAD_EMAIL);
  });

  it("مع المفتاح: يُدرج التأكيد والإشعار الداخلي ويبقى email_delivered صادقًا", async () => {
    process.env.LOVABLE_API_KEY = "lovable-key-stub-not-a-secret";
    h.enqueue.mockResolvedValue({ ok: true, message_id: "m1" });

    const res = await submit();

    expect(
      h.enqueue.mock.calls.map(([a]) => (a as { templateName: string }).templateName).sort(),
    ).toEqual(["demo-confirmation", "demo-internal"]);
    expect(res.email_delivered).toBe(true);
    expect(delivery()).toMatchObject({
      provider: "lovable-email",
      internal_ok: true,
      confirm_ok: true,
      attempts: 1,
    });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("مع المفتاح وفشل الإدراج فعلًا: حلقة الإعادة (٣ محاولات) باقية لم يبتلعها التخطّي", async () => {
    process.env.LOVABLE_API_KEY = "lovable-key-stub-not-a-secret";
    h.enqueue.mockResolvedValue({ ok: false, error: "db down" });
    vi.useFakeTimers({ toFake: ["setTimeout"] });

    const pending = submit();
    await vi.runAllTimersAsync();
    const res = await pending;

    expect(h.enqueue).toHaveBeenCalledTimes(6); // ٣ محاولات × (داخلي + تأكيد)
    expect(res.email_delivered).toBe(false);
    expect(delivery()).toMatchObject({ provider: "lovable-email", attempts: 3 });
    expect(errorSpy.mock.calls[0]?.[0]).toContain("partial/failed");
  });
});
