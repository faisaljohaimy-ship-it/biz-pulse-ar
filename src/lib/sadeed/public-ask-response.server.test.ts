import { describe, expect, it } from "vitest";
import { extractPublicAskAnswer, sanitizePublicAskMetadata } from "./public-ask-response.server";

describe("public SADEED AI response boundary", () => {
  it("preserves well-formed bilingual JSON and optional executive fields", () => {
    const result = extractPublicAskAnswer(
      '```json\n{"text_ar":"أهلًا","text_en":"Hello","confidence":1.2,"evidence":["[DOC:1]"]}\n```',
    );
    expect(result.ar).toBe("أهلًا");
    expect(result.en).toBe("Hello");
    expect(result.confidence).toBe(1);
    expect(result.evidence).toEqual(["[DOC:1]"]);
  });

  it("accepts a provider prose reply instead of falsely returning empty_response", () => {
    expect(extractPublicAskAnswer("  Patrols are active.  ").ar).toBe("Patrols are active.");
    expect(extractPublicAskAnswer('"جاهز"').ar).toBe("جاهز");
    expect(extractPublicAskAnswer('{"text_ar":').ar).toBe("");
  });

  it("never throws for null, arrays or wrongly typed fields", () => {
    expect(extractPublicAskAnswer("null").ar).toBe("");
    expect(extractPublicAskAnswer("[]").ar).toBe("");
    const result = extractPublicAskAnswer(
      '{"text_ar":42,"text_en":"Operational","confidence":"0.8"}',
    );
    expect(result.ar).toBe("");
    expect(result.en).toBe("Operational");
    expect(result.confidence).toBe(0);
    expect(extractPublicAskAnswer('{"text_ar":{"unexpected":true}}').ar).toBe("");
  });

  it("projects evidence through the gateway rather than leaking PII or secrets", () => {
    const input = extractPublicAskAnswer(
      JSON.stringify({
        text_ar: "تم",
        evidence: ["Contact analyst@example.com", "sk-abcdefghijklmnopqrstuvwx", "[DOC:12]"],
      }),
    );
    expect(sanitizePublicAskMetadata(input).evidence).toEqual(["Contact [بريد محجوب]", "[DOC:12]"]);
  });

  it("recursively filters unsafe next_action text and prototype keys", () => {
    const input = extractPublicAskAnswer(
      '{"text_en":"OK","next_action":{"details":["user@example.com","sk-abcdefghijklmnopqrstuvwx"],"__proto__":{"polluted":true},"name":"Inspect"}}',
    );
    const safe = sanitizePublicAskMetadata(input);
    expect(safe.next_action).toMatchObject({
      name: "Inspect",
      details: ["[بريد محجوب]"],
    });
    expect(safe.next_action).not.toHaveProperty("__proto__");
    expect(safe.next_action).not.toHaveProperty("polluted");
  });
});
