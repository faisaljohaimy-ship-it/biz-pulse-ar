// @vitest-environment node
/** موجز البحث: كلمات ورموز بلا الجملة، بلا PII، بسقوفه، وفارغٌ ⇒ null (لا نداء). */
import { describe, expect, it } from "vitest";
import { isHcisReferenceQuery } from "@/lib/sadeed/hcis-reference";
import { buildBrief, BRIEF_INPUT_MAX_CHARS, sadeedModeFor } from "./brief.server";
import { briefSchema } from "./schema";

const json = (q: string) => JSON.stringify(buildBrief(q));

describe("الاستخراج العربي", () => {
  it("سؤال تنظيمي: الرمز يُلتقط قياسيًّا، والكلمات بلا كلمات وصل ولا أداة التعريف ولا شظية الرمز", () => {
    const b = buildBrief("ما هي متطلبات SEC-18 للأسوار الأمنية في محطات الكهرباء؟");
    expect(b).not.toBeNull();
    expect(b!.codes).toEqual(["HCIS", "SEC-18"]);
    expect(b!.terms).toEqual(expect.arrayContaining(["متطلبات", "كهرباء", "أسوار", "أمنية"]));
    expect(b!.terms).not.toContain("sec");
    expect(b!.terms).not.toContain("18");
    expect(b!.terms).not.toContain("ما");
    expect(b!.terms).not.toContain("في");
    expect(b!.lang).toBe("ar");
    expect(briefSchema.safeParse(b).success).toBe(true);
  });

  it("الأرقام الهندية تُطوى: SEC-١٨ ⇒ SEC-18، و٢٠٢٦ ⇒ 2026", () => {
    expect(buildBrief("متطلبات SEC-١٨ في تقرير ٢٠٢٦")!.codes).toContain("SEC-18");
    expect(buildBrief("تقرير ٢٠٢٦ للأسوار")!.terms).toContain("2026");
  });

  it("الاسم العربي للهيئة يصير الرمز HCIS ولا يستهلك خانات الكلمات", () => {
    const b = buildBrief("ما هي مهام الهيئة العليا للأمن الصناعي في المطارات");
    expect(b!.codes).toEqual(["HCIS"]);
    expect(b!.terms).toEqual(expect.arrayContaining(["مهام", "مطارات"]));
    expect(b!.terms).not.toContain("هيئة");
    expect(b!.terms).not.toContain("عليا");
  });

  it("سؤال إنجليزي: اللغة en وكلمات الاستفهام الشائعة تسقط", () => {
    const b = buildBrief("how do I rotate the supabase key? what does it affect and why");
    expect(b!.lang).toBe("en");
    expect(b!.terms).toEqual(expect.arrayContaining(["supabase", "rotate", "key"]));
    for (const w of ["does", "why", "what"]) expect(b!.terms).not.toContain(w);
  });
});

describe("رموز التوجيهات", () => {
  it("صيغ الكتابة المختلفة تُوحَّد: SAF7 · saf-07 · SEC-4 ⇒ SAF-07 · SEC-04", () => {
    expect(buildBrief("SAF7 و saf-07 و SEC-4")!.codes).toEqual(["HCIS", "SAF-07", "SEC-04"]);
  });

  it("الحد الأقصى 4 رموز، كلٌّ ≤ 24 حرفًا", () => {
    const b = buildBrief("SEC-1 SEC-2 SEC-3 SEC-4 SEC-5 SAF-6");
    expect(b!.codes).toHaveLength(4);
    for (const c of b!.codes) expect(c.length).toBeLessThanOrEqual(24);
  });

  it("تطابق نمط الرمز مع isHcisReferenceQuery: كل رمز ملتقَط يجعل السؤال مرجعيًّا", () => {
    for (const q of ["SEC-18", "saf7", "ما هو SEC-02", "SAF-123 وSEC-1"]) {
      const b = buildBrief(q);
      expect(b!.codes.some((c) => /^(SEC|SAF)-\d{2,3}$/.test(c))).toBe(true);
      expect(isHcisReferenceQuery(q)).toBe(true);
    }
    // سؤالٌ بلا رمز لا يلتقط شيئًا ولا يُعدّ مرجعيًّا.
    expect(buildBrief("متطلبات الأسوار")!.codes).toEqual([]);
    expect(isHcisReferenceQuery("متطلبات الأسوار")).toBe(false);
  });

  it("وضع سَدِيد: regulatory للإطار التنظيمي وgeneral لغيره", () => {
    expect(sadeedModeFor("ما هو SEC-18")).toBe("regulatory");
    expect(sadeedModeFor("ما أفضل وقت لزيارة الرياض")).toBe("general");
  });
});

describe("الحجب: لا يغادر شيءٌ شخصي", () => {
  const q =
    "راسلني على ahmed.salem@example.com أو اتصل 055 123 4567 ورقم هويتي 1234567890 ورقمي الوظيفي 12345 عن أسوار المحطة";

  it("لا بريد ولا هاتف (بمقاطع أو متصلًا) ولا هوية ولا أرقام طويلة في الموجز", () => {
    const out = json(q);
    for (const leak of [
      "ahmed",
      "salem",
      "example",
      "055",
      "1234567",
      "1234567890",
      "12345",
      "محذوف",
      "@",
    ]) {
      expect(out, leak).not.toContain(leak);
    }
    expect(buildBrief(q)!.terms).toContain("أسوار");
  });

  it("الهاتف بأرقام هندية ومقاطع يُحجب أيضًا", () => {
    const out = json("اتصل على ٠٥٥ ١٢٣ ٤٥٦٧ بخصوص الأسوار");
    expect(out).not.toMatch(/\d{4}/);
    expect(out).not.toContain("٠٥٥");
  });

  it("الروابط بأنواعها تُحذف بأجزائها (مضيف · مسار · استعلام · رمز)", () => {
    const out = json(
      "انظر https://secret.internal-corp.example/path?token=abc123XYZ وwww.hidden.example/a/b عن الأسوار",
    );
    for (const leak of ["secret", "internal", "token", "abc123", "hidden", "path"]) {
      expect(out, leak).not.toContain(leak);
    }
  });

  it("أشكال الأسرار المعروفة وشظايا المفاتيح الطويلة تسقط", () => {
    // تُركَّب الأشكال وقت التشغيل: الحرفي منها يوقظ ماسح الأسرار في المستودع (وهذا من عمله).
    const openAiShape = ["sk", "abcdefghijklmnopqrstuvwxyz123456"].join("-");
    const githubShape = ["ghp", "a".repeat(36)].join("_");
    const out = json(
      `مفتاحي ${openAiShape} و ${githubShape} و a1b2c3d4e5f6g7h8i9j0k1l2 عن الأسوار`,
    );
    for (const leak of ["sk-", "abcdefghij", "ghp_", "a1b2c3d4", "محجوب"]) {
      expect(out, leak).not.toContain(leak);
    }
    expect(buildBrief(`مفتاحي ${openAiShape} عن الأسوار`)!.terms).toContain("أسوار");
  });
});

describe("لا يُرسَل نصّ السؤال: كلماتٌ مفردة بسقوفها", () => {
  const long =
    "أرغب في معرفة الضوابط التنظيمية الخاصة بتركيب كاميرات المراقبة الحرارية حول الأسوار الخارجية لمحطات توليد الكهرباء ومدى توافقها مع اشتراطات السلامة الصناعية المعتمدة حديثًا";

  it("حتى 6 كلمات، كلٌّ بلا فراغ وبطول ≤ 40، والجملة غائبة", () => {
    const b = buildBrief(long)!;
    expect(b.terms.length).toBeLessThanOrEqual(6);
    for (const t of b.terms) {
      expect(t).not.toMatch(/\s/);
      expect(t.length).toBeLessThanOrEqual(40);
    }
    const out = JSON.stringify(b);
    expect(out).not.toContain(long);
    expect(out).not.toContain("كاميرات المراقبة"); // لا عبارة من كلمتين متجاورتين
    expect(out.length).toBeLessThan(long.length);
  });

  it("كلمةٌ بطول > 40 تسقط", () => {
    const b = buildBrief(`${"ا".repeat(41)} أسوار`)!;
    expect(b.terms.every((t) => t.length <= 40)).toBe(true);
    expect(b.terms).toContain("أسوار");
  });

  it("المدخل الطويل جدًّا يُقصّ قبل المعالجة", () => {
    const huge = `أسوار ${"كلمة ".repeat(5_000)}`;
    expect(huge.length).toBeGreaterThan(BRIEF_INPUT_MAX_CHARS);
    expect(() => buildBrief(huge)).not.toThrow();
    expect(buildBrief(huge)!.terms.length).toBeLessThanOrEqual(6);
  });
});

describe("موجزٌ فارغ ⇒ null ⇒ لا نداء", () => {
  it.each([
    ["نصٌّ فارغ", ""],
    ["فراغات", "   \n\t "],
    ["كلمات وصل فقط", "ما هي؟ هل في"],
    ["رابط فقط", "https://example.com/a?b=c"],
    ["هاتف فقط", "0551234567"],
    ["أرقام طويلة فقط", "1234567890123"],
    ["علامات فقط", "؟!؟ ... ---"],
    ["بريد فقط", "ali@example.com"],
  ])("%s", (_name, q) => {
    expect(buildBrief(q)).toBeNull();
  });

  it("مدخلٌ ليس نصًّا ⇒ null بلا استثناء", () => {
    expect(buildBrief(undefined as unknown as string)).toBeNull();
    expect(buildBrief(42 as unknown as string)).toBeNull();
  });

  it("رمزٌ وحده يكفي موجزًا", () => {
    expect(buildBrief("SEC-18")).toEqual({ terms: [], codes: ["HCIS", "SEC-18"], lang: "ar" });
  });
});

// ── مراجعة P1 (٢٠٢٦/١٠/٣٠) ────────────────────────────────────────────────────

describe("رمز التوجيه بجوار سنة لا يضيع (الحجب يأتي بعد الالتقاط)", () => {
  it.each([
    ["SAF-03 2025", "SAF-03"],
    ["what does SEC-12 2024 say about hot work permits", "SEC-12"],
    ["ما هي متطلبات SEC-12-2024 للأعمال الساخنة", "SEC-12"],
    ["SEC-05 12345", "SEC-05"],
    ["تعديل 2025 على SAF-07 2026", "SAF-07"],
  ])("%s ⇒ الرمز %s", (q, code) => {
    const b = buildBrief(q)!;
    expect(b.codes).toEqual(["HCIS", code]);
    expect(b.terms).not.toContain("sec");
    expect(b.terms).not.toContain("saf");
    expect(JSON.stringify(b)).not.toMatch(/12345/);
  });

  it("السنة نفسها تبقى كلمةً حين تقلّ عن خمس خانات", () => {
    expect(buildBrief("SAF-03 2025")!.terms).toContain("2025");
  });
});

describe("الحجب لا يُخدع بما يفصل الخانات (مراجعة P1: تسرّب الهوية والجوال)", () => {
  /** لا يخرج من الموجز شيءٌ فيه ثلاث خانات متتالية: يكفي لكشف أي مقطعٍ من رقم. */
  const leaks = (q: string): string[] => {
    const b = buildBrief(q);
    return (b ? [...b.terms, ...b.codes] : []).filter((t) => /\d{3}/.test(t));
  };
  const ID = "1012345678";
  const MOBILE = "0551234567";
  const between = (c: string, digits: string) => digits.split("").join(c);

  // رموز التنسيق: تُنزع قبل الحجب فلا تفصل بين خانتين.
  const FORMAT_CHARS: Record<string, string> = {
    LRM: "‎",
    RLM: "‏",
    ZWSP: "​",
    ZWNJ: "‌",
    ZWJ: "‍",
    WJ: "⁠",
    SHY: "­",
    ALM: "؜",
    LRE: "‪",
    BOM: "﻿",
  };
  it.each(Object.entries(FORMAT_CHARS))("حرف تنسيق %s بين كل خانتين ⇒ محجوب", (_n, c) => {
    expect(leaks(`هويتي ${between(c, ID)} تصريح`)).toEqual([]);
    expect(leaks(`جوالي ${between(c, MOBILE)} تصريح`)).toEqual([]);
    expect(buildBrief(`هويتي ${between(c, ID)} تصريح`)!.terms).toEqual(["تصريح", "هويتي"]);
  });

  it("علامة اتجاه بين مقاطع الجوال والرقم الوظيفي (الشكل الشائع في النصّ المنسوخ)", () => {
    expect(leaks("جوالي 055‎123‎4567 تصريح")).toEqual([]);
    expect(buildBrief("الرقم الوظيفي 4001‎2 تصريح")!.terms).not.toContain("40012");
    expect(JSON.stringify(buildBrief("الرقم الوظيفي 4001‎2 تصريح"))).not.toMatch(/4001|40012/);
  });

  it.each([
    ["شرطة مائلة", "1012/345/678"],
    ["فاصلة", "055,123,4567"],
    ["فاصلة عربية", "٠٥٥،١٢٣،٤٥٦٧"],
    ["شرطة سفلية", "055_123_4567"],
    ["نقطتان", "055:123:4567"],
    ["فاصلة منقوطة", "055;123;4567"],
    ["شرطة رأسية", "055|123|4567"],
    ["نقطة وسطية", "055·123·4567"],
    ["فاصل مزدوج (فاصلة ومسافة)", "055, 123, 4567"],
    ["شرطة طويلة بمسافات", "1012 — 345 — 678"],
    ["أقواس", "(055) 123-4567"],
    ["تطويل", "055ـ123ـ4567"],
    ["أسطر", "1012\n345\n678"],
  ])("فاصل: %s ⇒ محجوب", (_n, num) => {
    expect(leaks(`رقمي ${num} تصريح`)).toEqual([]);
    expect(buildBrief(`رقمي ${num} تصريح`)!.terms).toEqual(["تصريح", "رقمي"]);
  });

  it.each([
    ["أرقام رياضية غليظة", "𝟎𝟓𝟓𝟏𝟐𝟑𝟒𝟓𝟔𝟕"],
    ["أرقام محاطة بدائرة", "⓪⑤⑤①②③④⑤⑥⑦"],
    ["أرقام مرفوعة", "⁰⁵⁵¹²³⁴⁵⁶⁷"],
    ["أرقام منخفضة", "₀₅₅₁₂₃₄₅₆₇"],
    ["أرقام عريضة", "０５５１２３４５６７"],
    ["أرقام ديفاناغارية", "०५५१२३४५६७"],
    ["أرقام دينغبات", "❶❷❸❹❺❻❼❽❾❿"],
    ["علامات دمج بعد كل خانة", "0́5́5́1́2́3́4́5́6́7́"],
  ])("كتابة الأرقام: %s ⇒ محجوب", (_n, num) => {
    expect(JSON.stringify(buildBrief(`جوالي ${num} تصريح`))).not.toContain(num);
    expect(buildBrief(`جوالي ${num} تصريح`)!.terms).toEqual(["تصريح", "جوالي"]);
  });

  it("الضوابط القديمة ما زالت محجوبة: متصل · مسافات · هندية · عريضة", () => {
    for (const num of [
      "1012345678",
      "1012 345 678",
      "١٠١٢٣٤٥٦٧٨",
      "１０１２３４５６７８",
      "1012.345.678",
    ]) {
      expect(buildBrief(`هويتي ${num} تصريح`)!.terms).toEqual(["تصريح", "هويتي"]);
    }
  });

  it("رقمٌ أقصر من خمس خانات لا يُحجب (السنوات وأرقام المواد تبقى)", () => {
    expect(buildBrief("المادة 12 من لائحة 2024")!.terms).toEqual(
      expect.arrayContaining(["2024", "لائحة"]),
    );
  });

  it("NFKC: رمز التوجيه والرابط بحروف عريضة يُلتقطان ويُحذفان كأنهما عاديان", () => {
    expect(buildBrief("ＳＥＣ－１８ للأسوار")!.codes).toEqual(["HCIS", "SEC-18"]);
    const out = JSON.stringify(buildBrief("انظر ｈｔｔｐｓ://secret.example/path للأسوار"));
    expect(out).not.toMatch(/secret|path/);
  });

  it("المدخل الطويل جدًّا بأحرف تنسيق لا يعطّل المعالجة", () => {
    const hostile = `أسوار ${"‎1".repeat(2_000)}`;
    expect(() => buildBrief(hostile)).not.toThrow();
  });
});

describe("سطح FNN: معرّف الثغرة والإصدار يبقيان، والحجب يبقى لما عداهما", () => {
  const fnn = { surface: "fnn" } as const;

  it("CVE يصير رمزًا في الموجز لا كلمةً ولا يُحجب رقمه", () => {
    const b = buildBrief("CVE-2026-12345 supabase auth", fnn)!;
    expect(b.codes).toEqual(["CVE-2026-12345"]);
    expect(b.terms).toEqual(expect.arrayContaining(["supabase", "auth"]));
    expect(b.terms).not.toContain("cve");
    expect(briefSchema.safeParse(b).success).toBe(true);
  });

  it("الإصدار الثلاثي يتقدّم الكلمات: 22.22.0 · 4.1.9 · v18.3.1", () => {
    expect(buildBrief("Node 22.22.0 fetch redirect error undici", fnn)!.terms[0]).toBe("22.22.0");
    expect(buildBrief("zod 4.1.9 strictObject error", fnn)!.terms[0]).toBe("4.1.9");
    expect(buildBrief("react v18.3.1 hooks", fnn)!.terms[0]).toBe("18.3.1");
    expect(buildBrief("upgrade 1.2.3 and 4.5.6 and 7.8.9", fnn)!.terms.slice(0, 2)).toEqual([
      "1.2.3",
      "4.5.6",
    ]);
  });

  it("ما يشبه الإصدار وليس به يُحجب: جوال · هوية · تاريخ · IP", () => {
    for (const num of [
      "055.123.4567",
      "1012.345.678",
      "2026.10.30",
      "192.168.100.200",
      "055.123.456",
    ]) {
      const out = JSON.stringify(buildBrief(`رقمي ${num} تصريح`, fnn));
      expect(out, num).not.toMatch(/\d{3}/);
    }
  });

  it("الهوية والجوال المموّهان بأحرف التنسيق يُحجبان في FNN أيضًا", () => {
    const out = JSON.stringify(buildBrief(`هويتي ${"1012345678".split("").join("‎")} تصريح`, fnn));
    expect(out).not.toMatch(/\d{3}/);
  });

  it("الافتراضي (سَدِيد) لا يحتفظ بالإصدار ولا CVE: الرقم يُحجب والرمز غائب", () => {
    expect(buildBrief("CVE-2026-12345 supabase auth")!.codes).toEqual([]);
    expect(JSON.stringify(buildBrief("Node 22.22.0 fetch redirect error undici"))).not.toContain(
      "22",
    );
    expect(buildBrief("CVE-2026-12345 supabase auth", { surface: "sadeed" })!.codes).toEqual([]);
  });

  it("الرموز التنظيمية تُلتقط في FNN كما في سَدِيد، وCVE بعدها وضمن سقف 4", () => {
    const b = buildBrief("SEC-18 CVE-2026-1111 CVE-2026-2222 CVE-2026-3333 CVE-2026-4444", fnn)!;
    expect(b.codes).toEqual(["HCIS", "SEC-18", "CVE-2026-1111", "CVE-2026-2222"]);
  });
});
