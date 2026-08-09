import { describe, expect, it } from "vitest";
import { shouldSpeakSadeedReply, toSadeedSpeechText } from "./reply-modality";

describe("SADEED reply modality", () => {
  it("speaks every reply while conversation mode is on (voice OR typed)", () => {
    expect(shouldSpeakSadeedReply({ conversationMode: true, fromVoice: true })).toBe(true);
    expect(shouldSpeakSadeedReply({ conversationMode: true, fromVoice: false })).toBe(true);
    expect(shouldSpeakSadeedReply({ conversationMode: true })).toBe(true);
    expect(shouldSpeakSadeedReply({ conversationMode: false, fromVoice: true })).toBe(false);
    expect(shouldSpeakSadeedReply({ conversationMode: false, fromVoice: false })).toBe(false);
  });

  it("removes visual markup, raw links and citation tags from spoken replies", () => {
    expect(
      toSadeedSpeechText(
        "## النتيجة\n- راجع [المرجع](https://example.com) [KB:سياسة] ثم افتح https://example.com/x.",
      ),
    ).toBe("النتيجة راجع المرجع ثم افتح");
  });

  it("does not read fenced code aloud", () => {
    expect(toSadeedSpeechText("تم التنفيذ.\n```ts\nsecret()\n```\nبنجاح.")).toBe(
      "تم التنفيذ. بنجاح.",
    );
  });
});
