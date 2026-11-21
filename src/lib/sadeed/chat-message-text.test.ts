import { describe, expect, it } from "vitest";
import { extractMessageText } from "./chat-message-text";

describe("extractMessageText", () => {
  it("preserves word boundaries when an attachment separates text parts", () => {
    const text = extractMessageText([
      { type: "text", text: "ما الأوامر" },
      { type: "file", filename: "guide.pdf" },
      { type: "text", text: "المدعومة؟" },
    ]);

    expect(text).toBe("ما الأوامر المدعومة؟");
  });

  it("does not insert spaces between adjacent text chunks", () => {
    expect(
      extractMessageText([
        { type: "text", text: "SA" },
        { type: "text", text: "DEED" },
      ]),
    ).toBe("SADEED");
  });

  it("adds at most one separator when an existing segment already has whitespace", () => {
    expect(
      extractMessageText([
        { type: "text", text: "كم عدد " },
        { type: "file", filename: "incident.pdf" },
        { type: "text", text: "البلاغات؟" },
      ]),
    ).toBe("كم عدد البلاغات؟");
  });

  it("ignores non-text-only parts and safely handles empty input", () => {
    expect(extractMessageText([{ type: "file", filename: "guide.pdf" }])).toBe("");
    expect(extractMessageText(undefined)).toBe("");
  });
});
