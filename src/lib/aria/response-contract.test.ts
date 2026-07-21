import { describe, expect, it } from "vitest";
import {
  ARIA_RESPONSE_CONTRACT,
  FORBIDDEN_FILLER,
  hasForbiddenFiller,
  isInScope,
  matchFastRecall,
  OUT_OF_SCOPE_REPLY,
  UNAVAILABLE_REPLY,
} from "./response-contract";

/**
 * Contract tests — constitution Article 22. These pin the ARIA response
 * contract so it can't silently regress:
 *   out-of-scope → the ONE fixed line · direct/recurring → fast recall ·
 *   unavailable → the honest line · zero forbidden filler anywhere.
 */
describe("Article 22 — scope lock", () => {
  it("blocks clear off-domain questions (sports, weather, cooking, code, politics)", () => {
    expect(isInScope("من فاز في مباراة كرة القدم أمس؟")).toBe(false);
    expect(isInScope("كيف الطقس اليوم في الرياض؟")).toBe(false);
    expect(isInScope("أعطني وصفة طبخ كبسة")).toBe(false);
    expect(isInScope("اكتب كود بايثون يطبع الأعداد")).toBe(false);
    expect(isInScope("من هو رئيس الوزراء؟")).toBe(false);
  });

  it("always admits the industrial-security domain, the platform, and greetings", () => {
    expect(isInScope("كم عدد توجيهات الهيئة؟")).toBe(true);
    expect(isInScope("ما حالة الامتثال لتوجيه SEC-18؟")).toBe(true);
    expect(isInScope("افتح تصريح عمل ساخن PTW")).toBe(true);
    expect(isInScope("سجّل بلاغ حادث في العملية")).toBe(true);
    expect(isInScope("من أنت؟")).toBe(true);
    expect(isInScope("مرحبا")).toBe(true);
    expect(isInScope("السلام عليكم")).toBe(true);
    expect(isInScope("")).toBe(true);
  });

  it("lets ambiguous text through to the model (high-precision blocking)", () => {
    // No off-domain signal, no in-domain keyword → pass to the model path.
    expect(isInScope("أعطني ملخص الوضع الحالي")).toBe(true);
  });

  it("out-of-scope reply is a single line with no apology or alternative", () => {
    expect(OUT_OF_SCOPE_REPLY).toBe("خارج نطاقي — أنا مساعد الأمن الصناعي في نكسيوس.");
    expect(OUT_OF_SCOPE_REPLY.split("\n")).toHaveLength(1);
    expect(hasForbiddenFiller(OUT_OF_SCOPE_REPLY)).toBe(false);
  });
});

describe("Article 22 — fast recall (recurring FAQs answer with no model)", () => {
  it("matches the four canonical recurring questions", () => {
    expect(matchFastRecall("كم عدد التوجيهات؟")?.source).toBe("hcis-directives");
    expect(matchFastRecall("ما هي الهيئة؟")?.source).toBe("hcis-authority");
    expect(matchFastRecall("ما مراحل دورة الاعتماد؟")?.source).toBe("hcis-approval-cycle");
    expect(matchFastRecall("من أنت؟")?.source).toBe("aria-identity");
  });

  it("returns null for a non-recurring question (falls through to the model)", () => {
    expect(matchFastRecall("ما حالة تصريح العمل رقم ٤٤٢؟")).toBeNull();
  });

  it("every fast-recall answer obeys brevity: one line, ≤25 words, zero filler", () => {
    for (const q of ["كم عدد التوجيهات؟", "ما الهيئة؟", "ما مراحل الاعتماد؟", "من أنت؟"]) {
      const hit = matchFastRecall(q);
      expect(hit).not.toBeNull();
      const a = hit!.answer;
      expect(a.split("\n")).toHaveLength(1);
      expect(a.trim().split(/\s+/).length).toBeLessThanOrEqual(25);
      expect(hasForbiddenFiller(a)).toBe(false);
    }
  });
});

describe("Article 22 — unavailability guard", () => {
  it("uses one honest line pointing to the official source", () => {
    expect(UNAVAILABLE_REPLY).toBe("غير متوفر لدي — المصدر الرسمي: hcis.gov.sa");
    expect(UNAVAILABLE_REPLY.split("\n")).toHaveLength(1);
    expect(hasForbiddenFiller(UNAVAILABLE_REPLY)).toBe(false);
  });
});

describe("Article 22 — forbidden filler", () => {
  it("flags a reply that opens with a banned preamble", () => {
    expect(hasForbiddenFiller("سؤال ممتاز! توجيهات الهيئة واحد وعشرون.")).toBe(true);
    expect(hasForbiddenFiller("بكل سرور، إليك الحالة.")).toBe(true);
    expect(hasForbiddenFiller("Great question — here is the count.")).toBe(true);
    expect(hasForbiddenFiller("دعني أوضح لك النقطة.")).toBe(true);
  });

  it("passes a clean answer that starts with the information itself", () => {
    expect(hasForbiddenFiller("توجيهات الهيئة واحد وعشرون توجيهًا.")).toBe(false);
    expect(hasForbiddenFiller("حالة الامتثال: مطابق.")).toBe(false);
  });

  it("keeps the filler list non-empty (the contract has teeth)", () => {
    expect(FORBIDDEN_FILLER.length).toBeGreaterThan(10);
  });
});

describe("Article 22 — system-prompt contract text", () => {
  it("carries the scope, brevity and truth clauses the model path must obey", () => {
    expect(ARIA_RESPONSE_CONTRACT).toContain(OUT_OF_SCOPE_REPLY);
    expect(ARIA_RESPONSE_CONTRACT).toContain(UNAVAILABLE_REPLY);
    expect(ARIA_RESPONSE_CONTRACT).toMatch(/max 25 words/i);
  });
});
