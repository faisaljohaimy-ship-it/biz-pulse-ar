import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { CHAT_WINDOW_MESSAGES, windowChatMessages } from "./chat-window";

const text = (role: "user" | "assistant", t: string) => ({
  id: `${role}-${t}`,
  role,
  parts: [{ type: "text", text: t }],
});
const withFile = (t: string) => ({
  id: `user-${t}`,
  role: "user" as const,
  parts: [
    { type: "text", text: t },
    {
      type: "file",
      filename: "report.pdf",
      mediaType: "application/pdf",
      url: "data:application/pdf;base64,AAAA",
    },
  ],
});

describe("windowChatMessages — نافذة المحادثة", () => {
  it("تبقى تحت سقف الخادم (24) مهما طالت المحادثة", () => {
    const serverMax = Number(
      /const MAX_MESSAGES = (\d+);/.exec(
        readFileSync("src/routes/api/-chat-guard.ts", "utf8"),
      )?.[1],
    );
    expect(serverMax).toBe(24);
    expect(CHAT_WINDOW_MESSAGES).toBeLessThan(serverMax);
    const long = Array.from({ length: 61 }, (_, i) => text(i % 2 ? "assistant" : "user", `m${i}`));
    const out = windowChatMessages(long);
    expect(out).toHaveLength(CHAT_WINDOW_MESSAGES);
    expect(out.at(-1)).toBe(long.at(-1)); // آخر رسالة لا تُمسّ
  });

  it("المحادثة القصيرة تمرّ كما هي (المرجع نفسه)", () => {
    const short = [text("user", "a"), text("assistant", "b")];
    const out = windowChatMessages(short);
    expect(out).toEqual(short);
    expect(out[0]).toBe(short[0]);
  });

  it("مرفقات الرسائل السابقة تصير سطرًا وصفيًّا — لا تُعاد رفعًا", () => {
    const msgs = [withFile("old"), text("assistant", "ok"), withFile("new")];
    const out = windowChatMessages(msgs);
    const oldParts = out[0].parts as Array<Record<string, unknown>>;
    expect(oldParts.some((p) => p.type === "file")).toBe(false);
    expect(oldParts[1]).toEqual({
      type: "text",
      text: "[Attachment metadata: report.pdf; application/pdf]",
    });
    // آخر رسالة مستخدم تحتفظ بملفها كاملًا
    expect((out[2].parts as Array<Record<string, unknown>>)[1].type).toBe("file");
    // المدخلات لم تُعدَّل
    expect((msgs[0].parts[1] as Record<string, unknown>).type).toBe("file");
  });

  it("صيغة السطر الوصفي مطابقة لما يكتبه الخادم نفسه", () => {
    const guard = readFileSync("src/routes/api/-chat-guard.ts", "utf8");
    expect(guard).toContain("[Attachment metadata: ${part.filename}; ${part.mediaType}]");
  });
});
