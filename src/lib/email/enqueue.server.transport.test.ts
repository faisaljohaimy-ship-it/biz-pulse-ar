// @vitest-environment node
/**
 * `enqueueTemplateEmail` لا تُدرج في طابورٍ لا مستهلك له (المادة ٢٧).
 *
 * `enqueue_email` تُنشئ الطابور وتنجح مهما كان؛ فبلا `LOVABLE_API_KEY` (فلا معالج يُفرغه)
 * كان كل إدراجٍ «ينجح» ويترك صفًّا `pending` في `email_send_log` ورسالةً يتيمة في `pgmq`.
 * الحارس هنا يثبت أنّ الغياب يعيد خطأً مسمّى **قبل أيّ لمسٍ للقاعدة**، وأنّ الحضور يُدرج كالمعتاد.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      insert: async (row: unknown) => {
        h.from(table, row);
        return { error: null };
      },
    }),
    rpc: async (name: string, args: unknown) => {
      h.rpc(name, args);
      return { error: null };
    },
  },
}));
vi.mock("@/lib/email-templates/registry", () => ({
  // مستلِمٌ ثابت ⇒ يتخطّى فحص القمع ورمز إلغاء الاشتراك فلا حاجة لسلسلة استعلامات.
  TEMPLATES: { probe: { component: () => null, subject: "probe", to: "ops@example.test" } },
}));
vi.mock("react-email", () => ({ render: async () => "<p>probe</p>" }));

import { enqueueTemplateEmail } from "./enqueue.server";
import { EMAIL_TRANSPORT_NOT_CONFIGURED, emailTransportConfigured } from "./transport.server";

describe("enqueueTemplateEmail: لا إدراج بلا ناقل", () => {
  const saved = { ...process.env };
  beforeEach(() => {
    h.from.mockReset();
    h.rpc.mockReset();
    delete process.env.LOVABLE_API_KEY;
  });
  afterEach(() => {
    process.env = { ...saved };
  });

  it("بلا المفتاح: خطأٌ مسمّى، ولا سجلّ ولا إدراج في الطابور", async () => {
    const res = await enqueueTemplateEmail({ templateName: "probe" });

    expect(res).toEqual({ ok: false, error: "email_transport_not_configured" });
    expect(res.error).toBe(EMAIL_TRANSPORT_NOT_CONFIGURED);
    expect(h.from).not.toHaveBeenCalled();
    expect(h.rpc).not.toHaveBeenCalled();
  });

  it("مع المفتاح: سجلّ pending ثم enqueue_email", async () => {
    process.env.LOVABLE_API_KEY = "lovable-key-stub-not-a-secret";

    const res = await enqueueTemplateEmail({ templateName: "probe" });

    expect(res.ok).toBe(true);
    expect(h.from).toHaveBeenCalledWith(
      "email_send_log",
      expect.objectContaining({ status: "pending" }),
    );
    expect(h.rpc).toHaveBeenCalledWith(
      "enqueue_email",
      expect.objectContaining({ queue_name: "transactional_emails" }),
    );
  });

  it("emailTransportConfigured: وجودٌ فقط — الفراغ والمسافات غياب", () => {
    expect(emailTransportConfigured({})).toBe(false);
    expect(emailTransportConfigured({ LOVABLE_API_KEY: "" })).toBe(false);
    expect(emailTransportConfigured({ LOVABLE_API_KEY: "  \t" })).toBe(false);
    expect(emailTransportConfigured({ LOVABLE_API_KEY: "k" })).toBe(true);
  });
});
