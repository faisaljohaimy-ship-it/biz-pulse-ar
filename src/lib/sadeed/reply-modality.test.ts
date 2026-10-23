import { describe, expect, it } from "vitest";
import { shouldSpeakSadeedReply, toSadeedSpeechText } from "./reply-modality";

describe("SADEED reply modality", () => {
  it("speaks every reply by default (voice OR typed), silent only when muted", () => {
    expect(shouldSpeakSadeedReply({ conversationMode: true, fromVoice: true })).toBe(true);
    expect(shouldSpeakSadeedReply({ conversationMode: false, fromVoice: false })).toBe(true);
    expect(shouldSpeakSadeedReply({})).toBe(true);
    expect(shouldSpeakSadeedReply({ conversationMode: true, muted: true })).toBe(false);
    expect(shouldSpeakSadeedReply({ conversationMode: false, muted: true })).toBe(false);
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

  it("روابط الشاشات النسبية يُنطق اسمها لا مسارها (نقض الحارس، المادة ٢٢ النطق)", () => {
    const spoken = toSadeedSpeechText("رابط شاشة «الصيانة»: [الصيانة](/sec/maintenance)");
    expect(spoken).toContain("الصيانة");
    expect(spoken).not.toMatch(/\/sec|maintenance|\]\(|سِك/);
  });
});
