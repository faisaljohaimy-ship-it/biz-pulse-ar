/**
 * من طرف إلى طرف: الناقل الحقيقي (`createSadeedTransport`) ⇐ الجسم المرسَل
 * فعلًا ⇐ حارس الخادم الحقيقي (`validateChatRequest`). يثبت السلوك لا نصّ
 * المصدر: لو عُطّلت النافذة لرُفضت المحادثة الطويلة 400 كما كانت.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: vi.fn(async () => ({ data: { session: null } })) } },
  isSupabaseConfigured: true,
}));

import { createSadeedTransport } from "./sadeed-service";
import { validateChatRequest } from "@/routes/api/-chat-guard";

type Msg = { id: string; role: "user" | "assistant"; parts: Array<Record<string, unknown>> };
const text = (i: number): Msg => ({
  id: `m${i}`,
  role: i % 2 ? "assistant" : "user",
  parts: [{ type: "text", text: `رسالة ${i}` }],
});

async function sentBody(messages: Msg[]): Promise<string> {
  let captured = "";
  const realFetch = global.fetch;
  global.fetch = vi.fn(async (_url: unknown, init?: RequestInit) => {
    captured = String(init?.body ?? "");
    return new Response("data: [DONE]\n\n", {
      status: 200,
      headers: { "content-type": "text/event-stream" },
    });
  }) as unknown as typeof fetch;
  try {
    const transport = createSadeedTransport();
    await transport
      .sendMessages({
        chatId: "sadeed-singleton",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messages: messages as any,
        abortSignal: undefined,
        trigger: "submit-message",
        messageId: undefined,
      })
      .catch(() => undefined);
  } finally {
    global.fetch = realFetch;
  }
  return captured;
}

const guard = (body: string) =>
  validateChatRequest(
    new Request("http://local/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    }),
  );

describe("نافذة المحادثة — الناقل الحقيقي مقابل حارس الخادم", () => {
  afterEach(() => vi.restoreAllMocks());

  it("محادثة من 31 رسالة يقبلها الخادم (كانت تُرفض 400)", async () => {
    const long = Array.from({ length: 31 }, (_, i) => text(i));
    // الشاهد على العطل: السجلّ كاملًا يرفضه الحارس نفسه.
    const raw = await guard(JSON.stringify({ messages: long }));
    expect(raw.ok).toBe(false);

    const body = await sentBody(long);
    expect(body.length).toBeGreaterThan(0);
    const res = await guard(body);
    expect(res.ok).toBe(true);
    const sent = JSON.parse(body) as { messages: Msg[]; replyMode?: string };
    expect(sent.messages.length).toBeLessThanOrEqual(20);
    expect(sent.messages.at(-1)?.id).toBe("m30");
    expect(sent.replyMode).toBeDefined();
  });

  it("المرفق القديم لا يُعاد رفعه، ومرفق الدور الحالي يصل كاملًا", async () => {
    const bytes = "A".repeat(4 * 200_000); // ~600KB
    const file = (name: string) => ({
      type: "file",
      filename: name,
      mediaType: "application/pdf",
      url: `data:application/pdf;base64,${bytes}`,
    });
    const msgs: Msg[] = [
      { id: "u1", role: "user", parts: [{ type: "text", text: "قديم" }, file("old.pdf")] },
      { id: "a1", role: "assistant", parts: [{ type: "text", text: "تم" }] },
      { id: "u2", role: "user", parts: [{ type: "text", text: "جديد" }, file("new.pdf")] },
    ];
    const body = await sentBody(msgs);
    expect((await guard(body)).ok).toBe(true);
    expect(body).not.toContain('"filename":"old.pdf"');
    expect(body).toContain("[Attachment metadata: old.pdf; application/pdf]");
    expect(body).toContain('"filename":"new.pdf"');
    expect(body.length).toBeLessThan(bytes.length * 1.2); // ملفٌّ واحد لا ملفّان
  });
});
