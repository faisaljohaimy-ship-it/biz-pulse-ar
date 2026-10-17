/**
 * عقد «كل نصّ يكتبه الخادم للمستخدم يعبر القناع سليمًا».
 *
 * العطل الذي يحرسه: العميل يمسح أسماء المزوّدين قبل العرض (سياسة صحيحة)،
 * والخادم كان يكتب ردّه المضمون بتلك الأسماء — فيمسحها القناع وتصل جملةٌ
 * مكسورة إلى الشاشة:
 *
 *   الخام (بـcurl):  «محرك Gemini الخاص بـSADEED … فعّل GEMINI_API_KEY ثم أعد المحاولة»
 *   المعروض:          «محرك الخاص بSADEED … فعل ثم أعد المحاولة»
 *
 * لا اختبار خادم يراه — الاستجابة الخام سليمة تمامًا — ولا اختبار عرض في
 * jsdom يراه، لأنه لا يقع إلا بعد مرور النصّ على المُنقّي. قِيس في متصفّح
 * حقيقي: `hasGemini:false` و`hasKeyName:false` في DOM بينما هما في الشبكة.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { VENDOR_MASK_RE, isVendorSafe, vendorMatches } from "@/lib/sadeed/vendor-mask";

/** النصوص العربية الموجَّهة للمستخدم داخل مسارات الدردشة. */
function userFacingStrings(path: string): string[] {
  const src = readFileSync(path, "utf8");
  // سلاسل تحوي حرفًا عربيًّا — أي ما يُقرأ على الشاشة لا معرّفات الكود.
  return [...src.matchAll(/"([^"\\\n]*[؀-ۿ][^"\\\n]*)"/g)].map((m) => m[1]);
}

describe("قناع المزوّدين — مصدر واحد", () => {
  it("يلتقط اسم المزوّد ومفتاحه معًا", () => {
    // `gemini[\\w.-]*` يبتلع `_API_KEY` عمدًا فلا يتسرّب المفتاح للشاشة —
    // ولهذا بالذات لا يجوز أن يرد في جملة مُصاغة.
    expect(vendorMatches("فعّل GEMINI_API_KEY الآن")).toContain("GEMINI_API_KEY");
    expect(vendorMatches("محرك Gemini الخاص")).toContain("Gemini");
    expect(isVendorSafe("محرك التحليل غير متاح")).toBe(true);
  });

  it("العميل يستعمل القناع المشترك لا نسخةً خاصّة", () => {
    // نسختان تفترقان بصمت — وهو ما سمح بوصول الجملة المكسورة أصلًا.
    const copilot = readFileSync("src/components/sadeed-core/SadeedCopilot.tsx", "utf8");
    expect(copilot).toContain("VENDOR_MASK_RE");
    expect(copilot).not.toMatch(/\(openai\|anthropic\|google\|xai\|mistral/);
  });
});

describe("لا نصّ مستخدم يفقد حرفًا عند العرض", () => {
  for (const path of ["src/routes/api/chat.ts", "src/routes/api/sadeed/chat.ts"]) {
    it(`${path} — كل سلاسله العربية تعبر القناع سليمة`, () => {
      const offenders = userFacingStrings(path)
        .filter((s) => !isVendorSafe(s))
        .map((s) => `${s.slice(0, 60)} ← يُمسح منه: ${vendorMatches(s).join(", ")}`);
      expect(offenders, "نصٌّ سيصل الشاشة مكسورًا").toEqual([]);
    });
  }

  it("الردّ المضمون يخاطب مديرًا لا مشغّل نظام", () => {
    // «فعّل متغيّر البيئة» تعليمةُ نشرٍ لا جوابُ مساعد. والصدق يبقى شرطًا:
    // لا رقم بلا مصدر (المادة ٢٧).
    // النصّ صار ثابتًا مسمّى يشترك فيه كل ردٍّ مضمون (٢٠٢٦/١٠/١٦) — يُقرأ
    // باسمه، ومعه ردّ «الحصّة غير المتحقَّقة» بالشروط نفسها.
    const chat = readFileSync("src/routes/api/chat.ts", "utf8");
    for (const name of ["const LOCAL_NO_PROVIDER_AR", "const LOCAL_QUOTA_UNVERIFIED_AR"]) {
      const i = chat.indexOf(name);
      expect(i, `لم يُعثر على ${name}`).toBeGreaterThan(-1);
      const block = chat.slice(i, i + 420);
      expect(block).not.toMatch(/API_KEY|متغيّر البيئة|env\b/i);
      expect(block).toMatch(/لن أعرض أرقامًا|غير متحقّقة/);
    }
    // ويبقى مفيدًا: يعرض ما يستطيع فعله الآن لا مجرّد اعتذار.
    const i = chat.indexOf("const LOCAL_NO_PROVIDER_AR");
    expect(chat.slice(i, i + 420)).toMatch(/يمكنني/);
  });
});
