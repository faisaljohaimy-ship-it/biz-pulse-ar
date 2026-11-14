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

  it("never narrates code inside tilde-fenced Markdown blocks", () => {
    expect(toSadeedSpeechText("قبل\n~~~ts\nconst DO_NOT_NARRATE = true;\n~~~\nبعد")).toBe(
      "قبل بعد",
    );
  });

  it.each([
    ["backtick", "```ts"],
    ["tilde", "~~~ts"],
  ])("does not narrate truncated %s fenced code", (_kind, fence) => {
    expect(toSadeedSpeechText(`قبل\n${fence}\nconst PRIVATE_CODE = true;`)).toBe("قبل");
  });

  it("speaks Markdown anchor and relative-link labels without raw link syntax", () => {
    expect(toSadeedSpeechText("راجع [التنبيهات](#alerts) ثم [التقرير](./report)")).toBe(
      "راجع التنبيهات ثم التقرير",
    );
  });

  it("روابط الشاشات النسبية يُنطق اسمها لا مسارها (نقض الحارس، المادة ٢٢ النطق)", () => {
    const spoken = toSadeedSpeechText("رابط شاشة «الصيانة»: [الصيانة](/sec/maintenance)");
    expect(spoken).toContain("الصيانة");
    expect(spoken).not.toMatch(/\/sec|maintenance|\]\(|سِك/);
  });
});
