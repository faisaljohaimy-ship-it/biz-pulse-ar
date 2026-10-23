import { describe, expect, it } from "vitest";
import {
  SADEED_RESPONSE_CONTRACT,
  SADEED_LIVE_INTELLIGENCE_DOCTRINE,
  FINN_DISCLOSURE_REPLY,
  FORBIDDEN_FILLER,
  hasForbiddenFiller,
  isInScope,
  matchFastRecall,
  OUT_OF_SCOPE_REPLY,
  UNAVAILABLE_REPLY,
} from "./response-contract";

/**
 * Contract tests — constitution Article 22. These pin the SADEED response
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

  it("DEF-14: off-domain terms match whole tokens — «المدينة/مشعر/الرئيسية/سياسة» are domain words", () => {
    for (const q of [
      "كم عدد المشاريع في المدينة المنورة؟",
      "ما الوضع في مشعر منى؟",
      "اعرض الصفحة الرئيسية",
      "ما سياسة الشركة في الزيارات؟",
      "شعر الموظف بدوار أثناء المناوبة",
    ]) {
      expect(isInScope(q), q).toBe(true);
    }
    // controls: the unambiguous off-domain terms still refuse, with clitics too.
    expect(isInScope("وش رأيك في الدين؟")).toBe(false);
    expect(isInScope("اكتب قصيدة عن البحر")).toBe(false);
    expect(isInScope("من هو رئيس الوزراء؟")).toBe(false);
  });

  it("no generic noun opens the scope: an off-domain question that names a region/site/project still refuses (veto N1)", () => {
    // Each passed as in-scope when «منطقة/موقع/مشروع/الحج/project/site» were IN_SCOPE
    // terms: an in-scope hit returns before the off-domain check (planted, Article 30).
    for (const q of [
      "من فاز بمباراة كرة القدم في المنطقة الشرقية؟",
      "ما أفضل موقع لمشاهدة مباريات كرة القدم؟",
      "best football site?",
      "سعر بيتكوين في المنطقة الوسطى",
      "اكتب قصيدة عن مشروع الحج",
      "ما رأيك في الانتخابات في المنطقة؟",
      "نكتة عن موقع العمل",
      "joke about the project",
    ]) {
      expect(isInScope(q), q).toBe(false);
    }
  });

  it("lets ambiguous text through to the model (high-precision blocking)", () => {
    // No off-domain signal, no in-domain keyword → pass to the model path.
    expect(isInScope("أعطني ملخص الوضع الحالي")).toBe(true);
  });

  it("out-of-scope reply is a single line with no apology or alternative", () => {
    expect(OUT_OF_SCOPE_REPLY).toBe("خارج نطاقي — أنا سَدِيد، مساعد الأمن الصناعي.");
    expect(OUT_OF_SCOPE_REPLY.split("\n")).toHaveLength(1);
    expect(hasForbiddenFiller(OUT_OF_SCOPE_REPLY)).toBe(false);
  });
});

describe("Article 22 — fast recall (recurring FAQs answer with no model)", () => {
  it("answers identity locally but sends regulatory facts to grounded retrieval", () => {
    expect(matchFastRecall("من أنت؟")?.source).toBe("sadeed-identity");
    expect(matchFastRecall("كم عدد التوجيهات؟")).toBeNull();
    expect(matchFastRecall("ما هي الهيئة؟")).toBeNull();
    expect(matchFastRecall("ما مراحل دورة الاعتماد؟")).toBeNull();
  });

  it("returns null for a non-recurring question (falls through to the model)", () => {
    expect(matchFastRecall("ما حالة تصريح العمل رقم ٤٤٢؟")).toBeNull();
  });

  /**
   * The identity matcher READS USER INPUT, so its left-hand side must keep the
   * retired names for as long as a user can still type them — and users type
   * what the database still shows them («فِن التنفيذي» on the operations room,
   * until the un-applied rename migration runs). The 2026-08-09 sweep renamed
   * both sides of three matchers at once and every test stayed green; this lock
   * exists so the same sweep cannot silently empty this one (ROLLBACK.md).
   */
  it("answers SADEED identity questions — and ONLY those, not FINN's", () => {
    for (const q of ["من أنت؟", "من هو SADEED؟", "من هو سديد؟", "who are you"]) {
      expect(matchFastRecall(q)?.source).toBe("sadeed-identity");
    }
    expect(matchFastRecall("من أنت؟")!.answer).toBe("أنا سَدِيد — مساعد الأمن الصناعي التنفيذي.");
  });

  // W5 #19: «FINN/فِن» صار (٢٠٢٦/١٠/٢٣) اسم وكيل البرمجة والأتمتة المنفصل. كان هنا اسمًا مستعارًا
  // لسَدِيد فيُجاب «أنا سَدِيد» — والمالك الذي يسأل سَدِيد عن فِن يسمع أنهما كيان واحد.
  it("W5 #19: asking about FINN is never answered as SADEED — a short honest disclosure", () => {
    for (const q of [
      "من هو finn؟",
      "من هو فين؟",
      "من هو فِن؟",
      "ما هو FINN",
      "who is finn?",
      "مين فِنّ",
    ]) {
      const hit = matchFastRecall(q);
      expect(hit?.source, q).toBe("finn-disclosure");
      expect(hit?.answer, q).toBe(FINN_DISCLOSURE_REPLY);
      expect(hit?.answer, q).not.toBe("أنا سَدِيد — مساعد الأمن الصناعي التنفيذي.");
    }
    // الإفصاح: منفصل عن سَدِيد + برمجة وأتمتة + للمالك وحده.
    expect(FINN_DISCLOSURE_REPLY).toMatch(/برمجة/);
    expect(FINN_DISCLOSURE_REPLY).toMatch(/أتمتة/);
    expect(FINN_DISCLOSURE_REPLY).toMatch(/منفصل عن سَدِيد/);
    expect(FINN_DISCLOSURE_REPLY).toMatch(/للمالك وحده/);
    // المادة ٢٢: سطر واحد، ≤ 25 كلمة، بلا حشو.
    expect(FINN_DISCLOSURE_REPLY.split("\n")).toHaveLength(1);
    expect(FINN_DISCLOSURE_REPLY.trim().split(/\s+/).length).toBeLessThanOrEqual(25);
    expect(hasForbiddenFiller(FINN_DISCLOSURE_REPLY)).toBe(false);
  });

  it("W5 #19: the FINN matcher is whole-sentence — «فن» العارية وأسئلة أخرى لا تُلتقط", () => {
    for (const q of [
      "ما هو فن؟",
      "ما الفرق بين finn وسديد في الصيانة؟",
      "من هو فين المسؤول عن الوردية؟",
      "من هو finn؟\n\nنص مرفق: تقرير",
      "ما عدد الموظفين",
    ]) {
      expect(matchFastRecall(q)?.source, q).not.toBe("finn-disclosure");
    }
  });

  it("DEF-01: only a whole identity question is answered locally — not «انتهت/كانت/الموظفين»", () => {
    for (const q of [
      "ما التصاريح التي انتهت اليوم؟",
      "من كانت آخر زيارة للموقع؟",
      "ما عدد الموظفين في الوردية؟",
      "ما حالة الإنترنت في غرفة التحكم؟",
      "من أنت؟\n\nنص مرفق: تقرير طويل عن الحوادث",
    ]) {
      expect(matchFastRecall(q), q).toBeNull();
    }
    for (const q of ["من أنت يا سديد؟", "عرّف بنفسك", "مين انت"]) {
      expect(matchFastRecall(q)?.source, q).toBe("sadeed-identity");
    }
  });

  it("every fast-recall answer obeys brevity: one line, ≤25 words, zero filler", () => {
    for (const q of ["من أنت؟", "من هو SADEED؟"]) {
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
    expect(UNAVAILABLE_REPLY).toBe("غير متوفر في المصادر الموثوقة المتاحة.");
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
    expect(SADEED_RESPONSE_CONTRACT).toContain(OUT_OF_SCOPE_REPLY);
    expect(SADEED_RESPONSE_CONTRACT).toContain(UNAVAILABLE_REPLY);
    expect(SADEED_RESPONSE_CONTRACT).toMatch(/1–3 concise sentences/i);
    expect(SADEED_RESPONSE_CONTRACT).toMatch(/400–900 words/i);
    expect(SADEED_RESPONSE_CONTRACT).toMatch(/explicit report \/ executive brief/i);
    // أمر المالك ٢٠٢٦/٠٩/٠٣ («إزالة المحاكاة كاملًا»): بند المحاكاة
    // المرجعية أُزيل من العقد وحلّ محلّه بند الأصل الإنتاجي [PROD:*].
    expect(SADEED_RESPONSE_CONTRACT).not.toContain("REFERENCE_SIMULATION_ONLY");
    expect(SADEED_RESPONSE_CONTRACT).toContain("[PROD:*]");
  });
});

describe("SADEED live-intelligence doctrine", () => {
  it("codifies live error recovery, governed self-improvement, accuracy and a measured pace", () => {
    expect(SADEED_LIVE_INTELLIGENCE_DOCTRINE).toContain("منظومة سَدِيد");
    expect(SADEED_LIVE_INTELLIGENCE_DOCTRINE).toContain("معالجة الأخطاء لحظيًا");
    expect(SADEED_LIVE_INTELLIGENCE_DOCTRINE).toContain("تطوير مستمر منضبط");
    expect(SADEED_LIVE_INTELLIGENCE_DOCTRINE).toContain("الدقة المطلقة");
    expect(SADEED_LIVE_INTELLIGENCE_DOCTRINE).toContain("النطق الكامل ١٠٠٪ للأرقام والأيام");
    expect(SADEED_LIVE_INTELLIGENCE_DOCTRINE).toContain("تأنٍّ في النطق");
  });
});
