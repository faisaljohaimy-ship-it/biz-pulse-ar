import { describe, expect, it } from "vitest";
import { exportFilename, exportTitle, toPdfMessages } from "./chat-export";

describe("chat-export — ما يُصدَّر هو المعروض وحده", () => {
  it("يُسقط الفارغ وما ليس سؤالًا أو ردًّا، ويُبقي أسماء المرفقات", () => {
    const out = toPdfMessages([
      { role: "system", text: "تعليمات داخلية" },
      { role: "user", text: "سؤال", attachments: ["a.pdf"] },
      { role: "assistant", text: "   " },
      { role: "assistant", text: "رد" },
    ]);
    expect(out).toEqual([
      { role: "user", text: "سؤال", attachments: ["a.pdf"] },
      { role: "assistant", text: "رد" },
    ]);
  });

  it("اسم الملف مستقرّ من التاريخ", () => {
    expect(exportFilename("chat", new Date("2026-10-11T09:30:00Z"))).toBe(
      "sadeed-chat-2026-10-11-0930.pdf",
    );
  });

  it("العنوان من أوّل سؤال مختصرًا", () => {
    expect(exportTitle([{ role: "user", text: "ما   حالة الصيانة؟" }], "answer")).toBe(
      "رد سَدِيد: ما حالة الصيانة؟",
    );
    expect(exportTitle([{ role: "assistant", text: "x" }], "chat")).toBe("محادثة سَدِيد");
    expect(exportTitle([{ role: "user", text: "س".repeat(100) }], "chat")).toHaveLength(
      "محادثة سَدِيد: ".length + 71,
    );
  });
});
