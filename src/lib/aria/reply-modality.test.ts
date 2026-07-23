import { describe, expect, it } from "vitest";
import { shouldSpeakFinnReply, toFinnSpeechText } from "./reply-modality";

describe("FINN reply modality", () => {
  it("speaks every reply while conversation mode is on (voice OR typed)", () => {
    expect(shouldSpeakFinnReply({ conversationMode: true, fromVoice: true })).toBe(true);
    expect(shouldSpeakFinnReply({ conversationMode: true, fromVoice: false })).toBe(true);
    expect(shouldSpeakFinnReply({ conversationMode: true })).toBe(true);
    expect(shouldSpeakFinnReply({ conversationMode: false, fromVoice: true })).toBe(false);
    expect(shouldSpeakFinnReply({ conversationMode: false, fromVoice: false })).toBe(false);
  });

  it("removes visual markup, raw links and citation tags from spoken replies", () => {
    expect(
      toFinnSpeechText(
        "## النتيجة\n- راجع [المرجع](https://example.com) [KB:سياسة] ثم افتح https://example.com/x.",
      ),
    ).toBe("النتيجة راجع المرجع ثم افتح");
  });

  it("does not read fenced code aloud", () => {
    expect(toFinnSpeechText("تم التنفيذ.\n```ts\nsecret()\n```\nبنجاح.")).toBe(
      "تم التنفيذ. بنجاح.",
    );
  });
});
