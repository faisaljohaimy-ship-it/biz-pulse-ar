// @vitest-environment node
/** موجز البحث: كلمات ورموز بلا الجملة، بلا PII، بسقوفه، وفارغٌ ⇒ null (لا نداء). */
import { describe, expect, it } from "vitest";
import { ilikeTerms } from "@/lib/retrieval/ilike-terms.server";
import { isHcisReferenceQuery } from "@/lib/sadeed/hcis-reference";
import { buildBrief, BRIEF_INPUT_MAX_CHARS, foldForMatch, sadeedModeFor } from "./brief.server";
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

describe("وضع سَدِيد: الأطر الحاكمة في المادة ٩ كلها تبحث في regulatory (مراجعة التكامل ٢٠٢٦/١٠/٣٠)", () => {
  // المادة ٩: PDPL وZATCA وNCA إطارٌ حاكم والمصادر غير الرسمية للوائح محظورة. كان المختار يعرف HCIS وحدها، فسؤالٌ
  // عن PDPL يبحث في general (Brave وويكيبيديا ومضيفات غير gov.sa) والتطبيق يحكم على المضيف في regulatory وحدها.
  const FRAMES = [
    "ما هي متطلبات نظام حماية البيانات الشخصية PDPL؟",
    "ما هي عقوبة تسريب بيانات شخصية بحسب نظام حماية البيانات الشخصية",
    "What does the NCA ECC-1:2018 require for access control?",
    "ما هي ضوابط الأمن السيبراني للأنظمة التشغيلية",
    "ما هي الضوابط الأساسية للأمن السيبراني ECC",
    "ما هي غرامة مخالفة ZATCA للفاتورة الإلكترونية؟",
    "متى يلزم التسجيل في هيئة الزكاة والضريبة والجمارك",
    "ما هي مرحلة الفوترة الإلكترونية الحالية",
    "ما هي لائحة نظام العمل السعودي للإجازات؟",
    "Saudi labor law notice period for resignation",
    "ما دور سدايا في تنظيم الذكاء الاصطناعي",
    "What is the SDAIA position on data transfer",
    // الاسم مفصولٌ بحرف خفي أو مكتوب بعرض كامل: يُوحَّد النصّ قبل المطابقة.
    "ما هو P\u200bDPL",
    "ما هو ＰＤＰＬ",
    "للـNCA ضوابط",
  ];
  const GENERAL = [
    "ما أفضل وقت لزيارة الرياض",
    "how do I install react 19",
    "ما هي عاصمة اليابان",
    "NCAA basketball scores",
    "الفرق بين الحاسوب والهاتف",
  ];

  it.each(FRAMES)("إطار تنظيمي ⇒ regulatory: %s", (q) => {
    expect(sadeedModeFor(q)).toBe("regulatory");
  });

  it("المختار القديم (HCIS وحدها) لا يرى هذه الأطر (الحارس ليس فارغًا)", () => {
    const missed = FRAMES.filter((q) => !isHcisReferenceQuery(q));
    expect(missed.length).toBe(FRAMES.length);
  });

  it.each(GENERAL)("سؤال عام ⇒ general: %s", (q) => {
    expect(sadeedModeFor(q)).toBe("general");
  });

  it("ما ليس نصًّا ⇒ general ولا يرمي", () => {
    expect(sadeedModeFor(undefined as unknown as string)).toBe("general");
    expect(sadeedModeFor("")).toBe("general");
  });
});

describe("وضع سَدِيد يقرأ النصّ الموحَّد: كتابةٌ أخرى للإطار نفسه لا تُخرجه من regulatory (مراجعة الإصلاح ٢٠٢٦/١٠/٣٠، المادة ٩)", () => {
  // المصنِّف يطوي الهمزات والتاء المربوطة والتشكيل ويقبل السؤال، فيجب أن يطويها المختار؛ وإلا بحث سؤالٌ عن نظامٍ
  // في Brave وويكيبيديا وOpenAlex وWikidata وقال الكتلة إنها تدعم «نظامًا».
  const FOLDED_FRAMES = [
    // التاء المربوطة هاءً، وبلا همزة، وبتشكيل
    "ثغره جديده في نظام حمايه البيانات الشخصيه",
    "اخبار الفوتره الالكترونيه للمنشآت",
    "ما هي ضوابط الامن السيبراني الجديده",
    "حِمَايَةِ الْبَيَانَاتِ الشَّخْصِيَّةِ أخبار",
    "حـمـايـة البيانات الشخصية",
    // أسماء إنجليزية بلا اختصار
    "latest news on the Saudi personal data protection law amendments for security patrols",
    "latest news National Cybersecurity Authority controls",
    "news about Zakat, Tax and Customs Authority e-invoicing phase for security patrols",
    "question about e-invoicing deadlines",
    "What are the Essential Cybersecurity Controls requirements",
    "Saudi Data and AI Authority guidance",
    "Saudi Data & Artificial Intelligence Authority policy",
    // الكود والمواصفات السعودية الحكومية (نصٌّ إلزامي)
    "ما متطلبات كود البناء السعودي SBC 801 للحماية من الحريق؟",
    "ما المتطلبات الحالية في المواصفة القياسية السعودية للحريق؟",
    "اشتراطات الهيئة السعودية للمواصفات والمقاييس والجودة",
    "اشتراطات الهيئه السعوديه للمواصفات",
    "ما الكود السعودي للحريق",
    "Saudi Building Code fire requirements",
    "SBC-801 egress width",
    "SASO technical regulation for fire extinguishers",
    "اسم الهيئه العليا للامن الصناعي بلا همزة",
  ];
  // سقف الإفراط: معايير دولية وأسئلة بلا إطار تبقى general (الخطأ بالزيادة يُسكت نتائج مشروعة).
  const STAY_GENERAL = [
    "ما متطلبات معيار ISO 45001 للسلامة المهنية؟",
    "What are the clauses of IEC 62443-3-3?",
    "latest OSHA fall protection rule update",
    "NFPA 101 means of egress",
    "NCAA basketball scores",
    "personal data of a character in the novel",
    "ما هو الكود الدولي للمباني",
  ];

  it.each(FOLDED_FRAMES)("إطارٌ بكتابةٍ مطوية ⇒ regulatory: %s", (q) => {
    expect(sadeedModeFor(q)).toBe("regulatory");
  });

  it.each(STAY_GENERAL)("بلا إطارٍ ⇒ general: %s", (q) => {
    expect(sadeedModeFor(q)).toBe("general");
  });

  it("الحارس ليس على فراغ: المختار القديم (الحرفي وحده) كان يفوته معظم هذه الكتابات", () => {
    // نسخةٌ مزروعة من منطق ما قبل الإصلاح: بالنصّ الحرفي ومعجمٍ بكتابةٍ واحدة. تُدان بسؤالٍ بكتابةٍ مطوية.
    const legacyArabic = /حماية\s+البيانات\s+الشخصية|الأمن\s+السيبراني|الفوترة\s+الإلكترونية/;
    const legacyLatin = /\b(?:pdpl|zatca|nca|sdaia)\b/i;
    const legacy = (q: string) => legacyArabic.test(q) || legacyLatin.test(q);
    const missed = FOLDED_FRAMES.filter((q) => !legacy(q));
    expect(missed.length).toBeGreaterThanOrEqual(10);
    for (const q of missed) expect(sadeedModeFor(q), q).toBe("regulatory");
  });

  it("foldForMatch: مصدر واحد للمصنِّف والمختار (همزات · تاء مربوطة · تشكيل · تطويل · أرقام هندية · NFKC)", () => {
    expect(foldForMatch("أإآ ى ة")).toBe("ااا ي ه");
    expect(foldForMatch("٢٠٢٦ ۱۲")).toBe("2026 12");
    expect(foldForMatch("حِمَايَة")).toBe("حمايه");
    expect(foldForMatch("ＰＤＰＬ")).toBe("pdpl");
    expect(foldForMatch("x".repeat(BRIEF_INPUT_MAX_CHARS + 50)).length).toBe(BRIEF_INPUT_MAX_CHARS);
  });

  it("المختار والمصنِّف متفقان: كل سؤالٍ يقبله المصنِّف إطارًا تنظيميًّا يحمل وضع regulatory", async () => {
    const { classifyWebNeed } = await import("@/lib/sadeed/web-need.server");
    for (const q of FOLDED_FRAMES) {
      const need = classifyWebNeed(q);
      if (need.need && need.kind === "regulatory") expect(sadeedModeFor(q), q).toBe("regulatory");
    }
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

describe("معرّف UUID وSHA ملصوقان في السؤال لا تغادر شظاياهما (دمج ٢٠٢٦/١٠/٣٠)", () => {
  const UUID = "123e4567-e89b-42d3-a456-426614174000";
  const SHA = "d807f638e93f5aa9f54d513f0c4c426478fee6d1";
  const FRAGMENTS = [
    "123e4567",
    "e89b",
    "42d3",
    "a456",
    "d807f638",
    "e93f5aa9",
    "fee6d1",
    "426614174000",
  ];
  const surfaces = [
    ["sadeed", { surface: "sadeed" as const }],
    ["fnn", { surface: "fnn" as const }],
  ] as const;

  it("المقطِّع وحده يفتّت المعرّف كلماتٍ (فالحارس ليس على فراغ: لولا النزع لخرجت الشظايا)", () => {
    const raw = ilikeTerms(`nfpa ${UUID}`);
    expect(raw).toEqual(expect.arrayContaining(["123e4567", "e89b", "42d3"]));
  });

  it.each(surfaces)(
    "%s: UUID بحالتَيه وبلا شرطات وSHA كاملة ⇒ لا شظية في الموجز، والكلمات الحقيقية باقية",
    (_n, opts) => {
      for (const q of [
        `ما متطلبات NFPA 101 للمخارج؟ المعرّف ${UUID}`,
        `${UUID.toUpperCase()} ما متطلبات NFPA 101 للمخارج؟`,
        `ما متطلبات NFPA 101 للمخارج؟ ${UUID.replace(/-/g, "")}`,
        `ما متطلبات NFPA 101 للمخارج؟ commit ${SHA}`,
      ]) {
        const brief = buildBrief(q, opts)!;
        const out = JSON.stringify(brief);
        for (const frag of FRAGMENTS) expect(out, `${q} ⇒ ${frag}`).not.toContain(frag);
        expect(brief.terms, q).toEqual(expect.arrayContaining(["nfpa", "مخارج"]));
      }
    },
  );

  it("معرّفٌ وحده بلا كلمات ⇒ null (لا بحث عن لا شيء)", () => {
    for (const q of [UUID, SHA, `${UUID} ${SHA}`]) {
      expect(buildBrief(q), q).toBeNull();
      expect(buildBrief(q, { surface: "fnn" }), q).toBeNull();
    }
  });

  it("ما دون 16 حرفًا سداسيًّا يبقى كلمةً (لا إفراط في الحجب): facade · decade · SHA قصيرة", () => {
    const out = buildBrief("facade decade deadbeef", { surface: "fnn" })!;
    expect(out.terms).toEqual(expect.arrayContaining(["facade", "decade", "deadbeef"]));
  });

  it("لا يمسّ ما احتفظ به سطح FNN: CVE والإصدار الثلاثي باقيان بجوار المعرّف", () => {
    const b = buildBrief(`CVE-2026-12345 node 22.22.0 build ${UUID} ${SHA}`, { surface: "fnn" })!;
    expect(b.codes).toContain("CVE-2026-12345");
    expect(b.terms).toContain("22.22.0");
    expect(JSON.stringify(b)).not.toMatch(/e89b|d807f638/);
  });
});

describe("معرّفات بحدودٍ غير نظيفة وأسرارٌ بالسياق (مراجعة الإصلاح ٢٠٢٦/١٠/٣٠)", () => {
  const surfaces = [
    ["sadeed", { surface: "sadeed" as const }],
    ["fnn", { surface: "fnn" as const }],
  ] as const;
  const UUID = "123e4567-e89b-42d3-a456-426614174000";
  const Q = "ما متطلبات NFPA 101 للمخارج؟";
  /** كل ما يخرج في الموجز مجموعًا، بحروفٍ صغيرة. */
  const out = (q: string, opts?: { surface: "sadeed" | "fnn" }) =>
    JSON.stringify(buildBrief(q, opts)).toLowerCase();

  it.each(surfaces)(
    "%s: UUID ملصوقٌ بكلمةٍ أو بشرطةٍ سفلية أو مفصولٌ بشرطاتٍ سفلية ⇒ لا شظية (كان `\\b` يفشل عند `_`)",
    (_n, opts) => {
      for (const glued of [
        `id_${UUID}`,
        `uid${UUID}`,
        UUID.replace(/-/g, "_"),
        `user_${UUID.replace(/-/g, "_")}`,
      ]) {
        const o = out(`${Q} ${glued}`, opts);
        for (const frag of ["123e4567", "e89b", "42d3", "a456", "426614174000"]) {
          expect(o, `${glued} ⇒ ${frag}`).not.toContain(frag);
        }
        expect(JSON.parse(o).terms).toEqual(expect.arrayContaining(["nfpa", "مخارج"]));
      }
    },
  );

  it.each(surfaces)(
    "%s: سداسيٌّ من 8 أحرفٍ فأكثر يخلط رقمًا وحرفًا (12 حرفًا · SHA مختصرة بتسعة) ⇒ يسقط، والكلمات القصيرة تبقى",
    (_n, opts) => {
      for (const id of ["1c2d3e4f5a6b", "7c78dd480", "9f8e7d6c5b4a3", "id7c78dd480"]) {
        expect(out(`${Q} المستخدم ${id}`, opts), id).not.toContain(id.replace(/^id/, ""));
      }
      // أحرفٌ سداسية وحدها أو أرقام وحدها أو أقصر من ثمانية: كلماتٌ عادية (لا إفراط).
      const kept = JSON.parse(out("facade decade deadbeef dec2025 ISO 9001", opts)).terms;
      expect(kept).toEqual(expect.arrayContaining(["facade", "decade", "deadbeef", "dec2025"]));
    },
  );

  it.each(surfaces)(
    "%s: الرقم الوظيفي بأقل من خمس خانات بعد عبارته ⇒ يُنزع مع عبارته (والأرقام العامة تبقى)",
    (_n, opts) => {
      for (const phrase of [
        "الرقم الوظيفي 4567",
        "رقمي الوظيفي 4567",
        "رقم الموظف E4567",
        "employee id E4567",
        "Employee No. 4567",
        "emp id 4567",
        "badge number 4567",
      ]) {
        const o = out(`${Q} ${phrase}`, opts);
        expect(o, phrase).not.toContain("4567");
        expect(JSON.parse(o).terms, phrase).toEqual(expect.arrayContaining(["nfpa", "مخارج"]));
      }
      expect(JSON.parse(out("ISO 9001", opts)).terms).toEqual(
        expect.arrayContaining(["iso", "9001"]),
      );
      expect(JSON.parse(out("تقرير 2026 للأسوار", opts)).terms).toContain("2026");
    },
  );

  it.each(surfaces)(
    "%s: سرٌّ من أحرفٍ وحدها بعد Bearer أو token= أو password: ⇒ يُنزع، وكلمةٌ لاتينية طويلة بلا رقم (≥ 24) تسقط",
    (_n, opts) => {
      const letters = "abcdefghijklmnopqrstuvwxyzabcdefgh";
      for (const secret of [
        `Authorization: Bearer ${letters}`,
        // أقصر من 24 حرفًا: لا يلتقطه مرشّح الكلمة الطويلة، فيجب أن ينزعه السياق وحده (كانت `Bearer` وحدها تُستهلك).
        `Authorization: Bearer abcdefghijklmnopqrst`,
        `authorization = Basic dXNlcjpwYXNzd29yZA`,
        `Bearer ${letters}`,
        `token=abc123def456ghi789`,
        `api_key: ${letters}`,
        `password = hunter2hunter2`,
      ]) {
        const o = out(`${Q} ${secret}`, opts);
        for (const frag of [
          letters,
          "abc123def456",
          "hunter2",
          "abcdefghijklmnopqrst",
          "dxnlcjpwyxnzd29yzg",
        ]) {
          expect(o, `${secret} ⇒ ${frag}`).not.toContain(frag);
        }
        expect(JSON.parse(o).terms).toEqual(expect.arrayContaining(["nfpa", "مخارج"]));
      }
      // كلمةٌ لاتينية طويلة بلا إشارة سياق (≥ 24 حرفًا) شكلُ رمزٍ لا كلمة.
      expect(out(`${Q} ${letters}`, opts)).not.toContain(letters);
      // ولا إفراط: كلمة إنجليزية عادية طويلة (< 24) تبقى.
      expect(out(`${Q} internationalization`, opts)).toContain("internationalization");
    },
  );

  it("حدٌّ قائم موثَّق لا ثغرة مُغلقة: SHA بسبعة أحرف (اختصار git) تبقى كلمةً", () => {
    expect(buildBrief(`${Q} commit 7c78dd4`)!.terms).toContain("7c78dd4");
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
