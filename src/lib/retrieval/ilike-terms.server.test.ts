// @vitest-environment node
/**
 * كلمات المحتوى بعد نقلها إلى نواة الاسترجاع: السلوك نفسه، ومن المكان القديم الدالّة نفسها (===)،
 * فلا يتغيّر استيراد أحد ولا تُوجد نسخة ثانية من المقطِّع.
 */
import { describe, expect, it } from "vitest";
import { ilikeTerms as viaArm } from "@/lib/sadeed/rag/lexical-arms.server";
import { foldDigits, ILIKE_MAX_TERMS, ilikeTerms } from "./ilike-terms.server";

describe("ilikeTerms بعد النقل", () => {
  it("المكان القديم يعيد تصدير الدالّة نفسها", () => {
    expect(viaArm).toBe(ilikeTerms);
  });

  it("السقف 6، والأطول أولًا ثم الأبجدي، بلا تكرار", () => {
    expect(ILIKE_MAX_TERMS).toBe(6);
    const t = ilikeTerms("أسوار أسوار كهرباء محطات توليد مراقبة حرارية كاميرات متطلبات");
    expect(t).toHaveLength(6);
    expect(new Set(t).size).toBe(6);
    for (let i = 1; i < t.length; i++) expect(t[i - 1].length).toBeGreaterThanOrEqual(t[i].length);
  });

  it("أداة التعريف وحروف الجرّ الملتصقة تُنزع، وكلمات الوصل تسقط", () => {
    const t = ilikeTerms("ما هي متطلبات الأسوار للمحطات والكهرباء");
    expect(t).toEqual(expect.arrayContaining(["متطلبات", "أسوار", "محطات", "كهرباء"]));
    expect(t).not.toContain("ما");
    expect(t).not.toContain("هي");
  });

  it("الأرقام الهندية والفارسية تُطوى إلى ASCII، وحروفٌ وأرقام فقط", () => {
    expect(foldDigits("٢٠٢٦ ۱۲۳")).toBe("2026 123");
    const t = ilikeTerms("تقرير ٢٠٢٦ والمرحلة ۱۲۳ (أمنية),'x'");
    expect(t).toEqual(expect.arrayContaining(["2026", "123"]));
    for (const w of t) expect(w).not.toMatch(/[,()'٠-٩۰-۹]/);
  });

  it("فراغ وكلمات وصل فقط ⇒ []", () => {
    expect(ilikeTerms("")).toEqual([]);
    expect(ilikeTerms("ما هي؟")).toEqual([]);
  });
});
