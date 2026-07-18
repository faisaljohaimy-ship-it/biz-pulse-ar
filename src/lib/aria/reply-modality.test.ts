import { describe, expect, it } from "vitest";
import { shouldSpeakAriaReply, toAriaSpeechText } from "./reply-modality";

describe("ARIA reply modality", () => {
  it("speaks only replies to voice turns inside conversation mode", () => {
    expect(shouldSpeakAriaReply({ conversationMode: true, fromVoice: true })).toBe(true);
    expect(shouldSpeakAriaReply({ conversationMode: true, fromVoice: false })).toBe(false);
    expect(shouldSpeakAriaReply({ conversationMode: false, fromVoice: true })).toBe(false);
  });

  it("removes visual markup, raw links and citation tags from spoken replies", () => {
    expect(
      toAriaSpeechText(
        "## النتيجة\n- راجع [المرجع](https://example.com) [KB:سياسة] ثم افتح https://example.com/x.",
      ),
    ).toBe("النتيجة راجع المرجع ثم افتح");
  });

  it("does not read fenced code aloud", () => {
    expect(toAriaSpeechText("تم التنفيذ.\n```ts\nsecret()\n```\nبنجاح.")).toBe(
      "تم التنفيذ. بنجاح.",
    );
  });
});
