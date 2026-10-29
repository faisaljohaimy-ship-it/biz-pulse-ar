/**
 * BM25 الذاكري — سلامة الترتيب على جمل عربية، كلمات الوصل (قائمة صريحة لا
 * توليدية)، أداة التعريف إلى نقطة الثبات، «لل» الملتبسة (بنسبتها المقيسة)،
 * الأرقام بكل خطوطها، حدّ الحرف/الرقم، الفراغ، السقف، سقف الاستعلام،
 * والحالات المزروعة (المادة ٣٠): إشارة k1، تجريدٌ بمرّة واحدة يفرّق الكلمة عن
 * نفسها، مطابقة كلمات الوصل بالطيّ الصارم تُسقط «آلي»، صنف أرقام ASCII يُسقط
 * «٤»، القاعدة التوليدية تُسقط «فلم» و«بهو» و«فقد»، سالبٌ في `maxDocChars`
 * يقصّ الذيل بصمت، إصدار «ل»+الباقي عند كل تجريد «لل» يعطي 3,999 مرشّحًا لمقطع
 * من لامات، و`NaN` في `limit` يُفرغ النتائج بصمت.
 */
import { describe, expect, it } from "vitest";
import {
  ARABIC_STOPWORDS,
  articleCandidates,
  BM25_B,
  BM25_K1,
  bm25TermScore,
  buildBm25Index,
  QUERY_MAX_CHARS,
  searchBm25,
  tokenize,
} from "./bm25.server";
import { normalizeArLight, normalizeArStrict } from "./normalize-ar.server";
import { listSeedCorpusEntries } from "./sources/seed-corpus.server";

const DOCS = [
  { id: "fence", text: "الأسوار الأمنية حول المنشأة الصناعية ومتطلبات ارتفاعها" },
  { id: "gate", text: "البوابات الأمنية ونقاط الدخول والتحقق من الهوية" },
  { id: "light", text: "الإنارة الأمنية للمحيط والممرات ليلًا" },
  { id: "rail", text: "عمليات السكك الحديدية داخل المنشآت الصناعية" },
  { id: "noise", text: "في من عن على إلى" },
];

describe("tokenize — الطيّ والوصل وأداة التعريف", () => {
  it("يسقط كلمات الوصل ويبقي المقاطع ذات المعنى", () => {
    expect(tokenize("ما هي متطلبات الأسوار الأمنية؟")).toEqual(["متطلبات", "اسوار", "امنيه"]);
  });

  it("التاء المربوطة والهمزة لا تفرّقان المقطع عن نفسه", () => {
    expect(tokenize("الإنارة الأمنيه")).toEqual(tokenize("الانارة الأمنية"));
    expect(tokenize("مسؤولية")).toEqual(tokenize("مسوولية"));
  });

  it("أداة التعريف تُجرَّد حين يبقى ثلاثة أحرف، وتبقى دونها؛ و«لل» تعطي مرشّحَين", () => {
    expect(tokenize("الأسوار أسوار بالأسوار للتوجيهات")).toEqual([
      "اسوار",
      "اسوار",
      "اسوار",
      // «للتوجيهات» ملتبسة بلا معجم: الجذع، ومعه «ل» + الباقي (الأندر فالأثقل — انظر «لل» أدناه).
      "توجيهات",
      "لتوجيهات",
    ]);
    // «الم» تبقى: بعد «ال» حرف واحد.
    expect(tokenize("الم")).toEqual(["الم"]);
  });

  it("الأرقام مقاطع مهما قصرت وتُقنَّن بحذف الأصفار البادئة", () => {
    expect(tokenize("SEC-02 والمرحلة ٦٠%")).toEqual(["sec", "2", "مرحله", "60"]);
    expect(tokenize("SEC-2")).toEqual(tokenize("SEC-02"));
    expect(tokenize("المرحلة 4")).toEqual(["مرحله", "4"]);
    expect(tokenize("0 00 100 010")).toEqual(["0", "0", "100", "10"]);
  });

  it("الرقم الهندي أو الفارسي المفرد مقطعٌ كالـASCII — «المرحلة ٤» = «المرحلة 4»", () => {
    expect(tokenize("٤")).toEqual(["4"]);
    expect(tokenize("٠")).toEqual(["0"]);
    expect(tokenize("۴")).toEqual(["4"]);
    expect(tokenize("المرحلة ٤")).toEqual(tokenize("المرحلة 4"));
    expect(tokenize("المرحلة ٥")).toEqual(["مرحله", "5"]);
    expect(tokenize("٠٢")).toEqual(["2"]);
  });

  it("مزروع: صنف أرقام ASCII (`\\d`) يرى «٤» حرفًا واحدًا قصيرًا فيُسقطه — و`\\p{Nd}` لا", () => {
    const asciiOnly = /^\d+$/;
    const longEnoughAscii = (t: string) => t.length >= 2 || asciiOnly.test(t);
    expect(longEnoughAscii("٤")).toBe(false);
    expect(longEnoughAscii("4")).toBe(true);
    expect(/^\p{Nd}+$/u.test("٤")).toBe(true);
    expect(tokenize("٤")).toHaveLength(1);
  });

  it("الحدّ بين حرف ورقم فاصل: «SEC02» و«sec2» و«STAGE04» = الصيغ المشرطة؛ و«٢٠٢٦م» تُسقط «م»", () => {
    expect(tokenize("SEC02")).toEqual(["sec", "2"]);
    expect(tokenize("sec2")).toEqual(["sec", "2"]);
    expect(tokenize("STAGE04")).toEqual(["stage", "4"]);
    expect(tokenize("SEC02")).toEqual(tokenize("SEC-02"));
    expect(tokenize("STAGE04")).toEqual(tokenize("stage 4"));
    expect(tokenize("٢٠٢٦م")).toEqual(["2026"]);
  });

  it("كلمات الوصل مطبَّعة بالطيّ الخفيف لا الصارم: «على» موقوفة و«علي» الاسم يبقى", () => {
    expect(ARABIC_STOPWORDS.has("على")).toBe(true);
    expect(ARABIC_STOPWORDS.has("علي")).toBe(false);
    expect(tokenize("على")).toEqual([]);
    expect(tokenize("علي")).toEqual(["علي"]);
    // الإملاء السريع بلا همزة مكتوب صراحةً في القائمة.
    expect(tokenize("الى او ان اي")).toEqual([]);
  });

  it("الإملاء بالياء والتاء المربوطة لكلمات الوصل مكتوب صراحةً: «الي» و«فى» و«التى» و«هذة» تسقط", () => {
    expect(ARABIC_STOPWORDS.has("الي")).toBe(true);
    expect(tokenize("الي إلي فى التى الذى أى اى هذة")).toEqual([]);
    // و«آلي» تبقى لأن الخفيف لا يطوي الهمزة: «آلي» ≠ «الي» عند المطابقة.
    expect(normalizeArLight("آلي")).not.toBe("الي");
    expect(tokenize("آلي")).toEqual(["الي"]);
  });

  it("«آلي» و«الآلي» مقطع واحد غير فارغ — لا يُسقَطان على «إلى»", () => {
    expect(tokenize("آلي")).toEqual(["الي"]);
    expect(tokenize("الآلي")).toEqual(["الي"]);
    expect(tokenize("نظام إطفاء آلي")).toEqual(["نظام", "اطفاء", "الي"]);
    expect(tokenize("إلى")).toEqual([]);
  });

  it("كلمة الوصل الملتصقة بحرف عطف أو جرّ أو بأداة التعريف تُسقَط — بصيغتها المدرجة صراحةً", () => {
    expect(tokenize("والتي بالتي والذي فمن لكل كما الكل البعض وبالتالي")).toEqual(["تالي"]);
    expect(tokenize("الآن الان والآن")).toEqual([]);
  });

  it("الأسماء الحقيقية التي كانت القاعدة التوليدية تُسقطها تبقى: بهو، فلم، فقد، كبل، فهم، الكم، البعد", () => {
    expect(tokenize("بهو المبنى")).toEqual(["بهو", "مبني"]);
    expect(tokenize("فلم التوعية")).toEqual(["فلم", "توعيه"]);
    expect(tokenize("فقد المفتاح")).toEqual(["فقد", "مفتاح"]);
    expect(tokenize("كبل الطاقة")).toEqual(["كبل", "طاقه"]);
    expect(tokenize("فهم المتطلبات")).toEqual(["فهم", "متطلبات"]);
    expect(tokenize("الكم والكيف")).toEqual(["الكم", "كيف"]);
    expect(tokenize("البعد الأمني")).toEqual(["بعد", "امني"]);
    expect(tokenize("وهم وهن")).toEqual(["وهم", "وهن"]);
  });

  it("مزروع: القاعدة التوليدية «حرف من و/ف/ب/ك/ل + كلمة وصل» تدين «فلم» و«بهو» و«فقد» — والقائمة الصريحة لا", () => {
    const generative = (w: string) =>
      ARABIC_STOPWORDS.has(w) ||
      (w.length >= 3 && /^[وفبكل]/.test(w) && ARABIC_STOPWORDS.has(w.slice(1))) ||
      (w.startsWith("ال") && ARABIC_STOPWORDS.has(w.slice(2)));
    for (const w of ["فلم", "بهو", "فقد", "كبل", "فهم", "البعد", "الكم"]) {
      expect(generative(w), w).toBe(true);
      expect(ARABIC_STOPWORDS.has(w), w).toBe(false);
    }
    // والصيغ الملتصقة الحقيقية مدرجة صراحةً فلا يُفقَد شيء بإزالة القاعدة.
    for (const w of ["والتي", "فمن", "لكل", "كما", "الكل", "البعض"]) {
      expect(ARABIC_STOPWORDS.has(w), w).toBe(true);
    }
  });

  it("مقطع من حرف واحد يسقط", () => {
    expect(tokenize("و ب أ")).toEqual([]);
  });

  it("«غير» ليست كلمة وصل: «غير مصرح» ≠ «مصرح» و«غير موثّق» يحمل «غير» — ولا/لم/ليس تسقط بخسارة معلَنة", () => {
    for (const w of ["غير", "وغير", "فغير", "بغير", "لغير"]) {
      expect(ARABIC_STOPWORDS.has(w), w).toBe(false);
    }
    expect(tokenize("دخول غير مصرح به")).toEqual(["دخول", "غير", "مصرح"]);
    expect(tokenize("غير موثّق")).toEqual(["غير", "موثق"]);
    expect(tokenize("غير مصرح")).not.toEqual(tokenize("مصرح"));
    // الصيغة الملتصقة تبقى كما هي — لا تجريد لحرف العطف (ترويسة الوحدة).
    expect(tokenize("وغير مطابق")).toEqual(["وغير", "مطابق"]);
    // الخسارة المعلَنة: أفعال النفي المستقلّة كلمات وصل، فـ«لا يجوز» = «يجوز» معجميًّا.
    expect(tokenize("لا يجوز")).toEqual(tokenize("يجوز"));
    expect(tokenize("ليس مطابقًا")).toEqual(tokenize("مطابقًا"));
  });

  it("null ⇐ [] بلا رمي", () => {
    expect(tokenize(null)).toEqual([]);
    expect(tokenize(undefined)).toEqual([]);
  });

  it("الطيّ الصارم مرّةً على النصّ كلّه يحاذي الطيّ لكل مقطع واحدًا بواحد — على المتن وعلى الحالات الحدّية", () => {
    const RUN = /\p{L}+|\p{N}+/gu;
    const perToken = (text: string) =>
      (normalizeArLight(text).match(RUN) ?? []).map((t) => normalizeArStrict(t));
    const whole = (text: string) => normalizeArStrict(normalizeArLight(text)).match(RUN) ?? [];
    const samples = [
      ...listSeedCorpusEntries().map((e) => e.text),
      "İstanbul Istanbul",
      "ﺃﺇﺁ ﻻ ٢٠٢٦ ۲۰۲۶ SEC-02",
      "می\u200Cخواهم \uFEFFنص\u200F الأمن\u061Cية",
      "مُحَمَّدٌ رحمٰن ن\u08F0ص",
      "ＡＢＣ ﬁ ½ ①",
    ];
    for (const s of samples) expect(whole(s), s).toEqual(perToken(s));
  });
});

describe("أداة التعريف إلى نقطة الثبات — ما قاسه المراجع", () => {
  it.each([
    ["إلزامية", "الإلزامية"],
    ["إلزامي", "الإلزامي"],
    ["التزام", "الالتزام"],
    ["إلكتروني", "الإلكتروني"],
    ["إلكترونية", "الإلكترونية"],
    ["آليات", "الآليات"],
    ["إلغاء", "الإلغاء"],
    ["ألمنيوم", "الألمنيوم"],
    ["منشأة", "وبالمنشأة"],
    ["منشأة", "فبالمنشأة"],
    ["منشأة", "وكالمنشأة"],
  ])("%s و%s مقطع واحد", (bare, withArticle) => {
    expect(tokenize(bare)).toEqual(tokenize(withArticle));
  });

  it.each([
    ["لوائح", "للوائح"],
    ["اللوائح", "للوائح"],
    ["لوحة", "للوحة"],
    ["لحام", "للحام"],
    ["منشأة", "للمنشأة"],
    ["منشأة", "وللمنشأة"],
    ["منشأة", "فللمنشأة"],
  ])("«لل»: %s تشترك مع %s في مقطع", (bare, withLam) => {
    const shared = tokenize(bare).filter((t) => tokenize(withLam).includes(t));
    expect(shared.length).toBeGreaterThan(0);
  });

  it("سلوك موثَّق: مرشّح «ل»+الباقي أندر فأثقل — وثيقة الصيغة السطحية تفوز بنسبة ≈2.3× (مقيس)", () => {
    const index = buildBm25Index([
      { id: "surface", text: "للمنشأة الصناعية" },
      { id: "bare", text: "المنشأة الصناعية" },
      { id: "x", text: "البوابات الأمنية" },
      { id: "y", text: "الإنارة الليلية" },
    ]);
    const hits = searchBm25(index, "للمنشأة");
    expect(hits.map((h) => h.id)).toEqual(["surface", "bare"]);
    expect(hits[0]!.matched).toEqual(["منشاه", "لمنشاه"]);
    expect(hits[1]!.matched).toEqual(["منشاه"]);
    // df(لمنشاه) = 1 < df(منشاه) = 2 ⇐ idf أعلى للمرشّح «الإضافي»، لا أدنى.
    expect(index.postings.get("لمنشاه")!.size).toBeLessThan(index.postings.get("منشاه")!.size);
    expect(hits[0]!.score).toBeCloseTo(1.6695, 3);
    expect(hits[1]!.score).toBeCloseTo(0.7262, 3);
    expect(hits[0]!.score / hits[1]!.score).toBeCloseTo(2.3, 1);
  });

  it("مزروع: تجريدٌ بمرّة واحدة يفرّق «الإلزامية» عن «إلزامية» — والثبات يوحّدهما", () => {
    const singlePass = (word: string) => {
      const t = normalizeArStrict(word);
      return t.startsWith("ال") && t.length - 2 >= 3 ? t.slice(2) : t;
    };
    expect(singlePass("الإلزامية")).not.toBe(singlePass("إلزامية"));
    expect(articleCandidates(normalizeArStrict("الإلزامية"))[0]).toBe(
      articleCandidates(normalizeArStrict("إلزامية"))[0],
    );
  });

  it("مزروع: مطابقة كلمات الوصل بالطيّ الصارم تُسقط «آلي» — والخفيف يبقيه", () => {
    const strictStop = new Set(["إلى"].map(normalizeArStrict));
    expect(strictStop.has(normalizeArStrict("آلي"))).toBe(true);
    expect(tokenize("آلي")).toHaveLength(1);
  });

  it("مزروع: سلسلة لامات بطول السقف تعطي مرشّحَين لا 3,999 — وإصدار «ل»+الباقي عند كل تجريد كان O(L²)", () => {
    const lam = "لل".repeat(4_000);
    expect(lam).toHaveLength(8_000);
    expect(articleCandidates(lam).length).toBeLessThanOrEqual(2);
    // القاعدة القديمة على المقطع نفسه (ما قاسه المراجع: 3,999 مرشّحًا بمجموع 16 مليون حرف).
    const everyStrip = (token: string) => {
      let t = token;
      const extra: string[] = [];
      for (;;) {
        const p = ["ال", "لل"].find((x) => t.startsWith(x) && t.length - x.length >= 3);
        if (!p) break;
        const rest = t.slice(p.length);
        if (p.endsWith("لل")) extra.push(`ل${rest}`);
        t = rest;
      }
      return [t, ...extra];
    };
    expect(everyStrip(lam)).toHaveLength(3_999);
    // الفهرس من عشر وثائق منها يحمل مقطعين لا 3,999 (كان +328 ميغابايت على جهاز التنفيذ).
    const index = buildBm25Index(
      Array.from({ length: 10 }, (_, i) => ({ id: `l${i}`, text: lam })),
    );
    expect(index.postings.size).toBeLessThanOrEqual(2);
    // والكلمات الحقيقية لا تتأثّر: «للمنشأة» و«وللمنشأة» ما زالتا مرشّحَين.
    expect(articleCandidates(normalizeArStrict("للمنشأة"))).toEqual(["منشاه", "لمنشاه"]);
    expect(articleCandidates(normalizeArStrict("وللمنشأة"))).toEqual(["منشاه", "لمنشاه"]);
    expect(articleCandidates(normalizeArStrict("للوائح"))).toEqual(["وايح", "لوايح"]);
  });
});

describe("searchBm25 — سلامة الترتيب", () => {
  const index = buildBm25Index(DOCS);

  it("سؤال عن الأسوار يعيد وثيقة الأسوار أولًا ولو اختلفت الهمزة والتاء", () => {
    const hits = searchBm25(index, "ما متطلبات الاسوار الامنيه؟");
    expect(hits[0]?.id).toBe("fence");
    expect(hits[0]?.matched).toContain("اسوار");
  });

  it("المقطع النادر يرجّح وثيقته على المقطع الشائع", () => {
    // «امنيه» في ثلاث وثائق، «سكك» في واحدة.
    const hits = searchBm25(index, "السكك الأمنية");
    expect(hits[0]?.id).toBe("rail");
  });

  it("«SEC-2» و«SEC-02» و«SEC02» و«sec2» ترتّب SEC-02 أولًا وحدها؛ و«STAGE02» ترتّب STAGE-02", () => {
    const codes = buildBm25Index([
      { id: "SEC-02", text: "SEC-02 الأسوار الأمنية" },
      { id: "SEC-03", text: "SEC-03 البوابات الأمنية" },
      { id: "SEC-12", text: "SEC-12 بطاقات التعريف" },
      { id: "STAGE-02", text: "STAGE-02 التصميم المفاهيمي 10%" },
    ]);
    for (const q of ["SEC-2", "SEC-02", "SEC02", "sec2", "sec 2"]) {
      const hits = searchBm25(codes, q);
      expect(hits[0]?.id, q).toBe("SEC-02");
      expect(hits[0]!.score, q).toBeGreaterThan(hits[1]!.score);
    }
    for (const q of ["STAGE02", "stage2", "STAGE-02"]) {
      expect(searchBm25(codes, q)[0]?.id, q).toBe("STAGE-02");
    }
  });

  it("استعلام فارغ أو من كلمات وصل فقط ⇐ [] بلا رمي", () => {
    expect(searchBm25(index, "")).toEqual([]);
    expect(searchBm25(index, "   ")).toEqual([]);
    expect(searchBm25(index, "في من عن")).toEqual([]);
    expect(searchBm25(index, "؟؟!!")).toEqual([]);
  });

  it("وثيقة من كلمات وصل فقط تُفهرس فارغة وتُعدّ في stats.empty ولا تُسترجع", () => {
    expect(index.stats.empty).toBe(1);
    expect(searchBm25(index, "في من").map((h) => h.id)).not.toContain("noise");
  });

  it("الترتيب حتمي: التعادل يُحسم بالمعرّف تصاعديًّا", () => {
    const tie = buildBm25Index([
      { id: "b", text: "كلمة" },
      { id: "a", text: "كلمة" },
      { id: "c", text: "كلمة" },
    ]);
    expect(searchBm25(tie, "كلمة").map((h) => h.id)).toEqual(["a", "b", "c"]);
    expect(searchBm25(tie, "كلمة")).toEqual(searchBm25(tie, "كلمة"));
  });

  it("limit يُحترم و0 يعيد فراغًا", () => {
    // «امنيه» في ثلاث وثائق.
    expect(searchBm25(index, "الأمنية")).toHaveLength(3);
    expect(searchBm25(index, "الأمنية", 2)).toHaveLength(2);
    expect(searchBm25(index, "الأمنية", 0)).toEqual([]);
  });

  it("limit غير الصحيح أو السالب يُرفض — ومزروع: NaN كان يُفرغ الذراع بصمت عبر slice(0, NaN)", () => {
    for (const bad of [Number.NaN, 2.5, -1, Number.POSITIVE_INFINITY]) {
      expect(() => searchBm25(index, "الأمنية", bad), String(bad)).toThrow(RangeError);
    }
    // ما كان يقع: `Math.max(0, NaN)` = NaN و`slice(0, NaN)` = [] — فراغٌ يُقرأ «لا نتائج» لا «حدّ غير صالح».
    expect([1, 2, 3].slice(0, Math.max(0, Number.NaN))).toEqual([]);
    expect([1, 2, 3].slice(0, 2.5)).toHaveLength(2);
    expect(searchBm25(index, "الأمنية")).toHaveLength(3);
  });

  it("الاستعلام مقصوص عند QUERY_MAX_CHARS: ما بعد السقف لا يُطابَق — ومزروع: التقطيع بلا سقف يراه", () => {
    expect(QUERY_MAX_CHARS).toBe(2_000);
    const two = buildBm25Index([
      { id: "k", text: "كلمة" },
      { id: "n", text: "نادر" },
    ]);
    // مليونا حرف من «كلمة » ثم «نادر» بعد السقف بكثير.
    const huge = `${"كلمة ".repeat(400_000)} نادر`;
    expect(huge.length).toBeGreaterThan(2_000_000);
    const hits = searchBm25(two, huge);
    expect(hits.map((h) => h.id)).toEqual(["k"]);
    expect(hits[0]!.matched).toEqual(["كلمه"]);
    // الدالّة نفسها بلا السقف كانت ستطابق «نادر» (ومعه كلفة التقطيع كاملة).
    expect(tokenize(huge)).toContain("نادر");
    // وما داخل السقف يُطابَق كاملًا (المقطعان متعادلان في الدرجة فالتعادل بالمعرّف: k قبل n).
    expect(searchBm25(two, `نادر ${"كلمة ".repeat(10)}`).map((h) => h.id)).toEqual(["k", "n"]);
  });
});

describe("السقف والذاكرة", () => {
  it("maxDocs يُسقط ما بعده ويبلّغ عنه، وmaxDocChars يقصّ ويبلّغ", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ id: `d${i}`, text: `وثيقة رقم ${i}` }));
    const index = buildBm25Index(many, { maxDocs: 5, maxDocChars: 6 });
    expect(index.stats.indexed).toBe(5);
    expect(index.stats.dropped).toBe(7);
    expect(index.stats.truncated).toBe(5);
    expect(index.docLengths.size).toBe(5);
  });

  it("نصّ null يُفهرس فارغًا ويُعدّ في stats.empty — لا يُسقط بناء الفهرس كلّه", () => {
    const index = buildBm25Index([
      { id: "n", text: null },
      { id: "t", text: "الأسوار الأمنية" },
    ]);
    expect(index.stats.indexed).toBe(2);
    expect(index.stats.empty).toBe(1);
    expect(index.docLengths.get("n")).toBe(0);
    expect(searchBm25(index, "الأسوار").map((h) => h.id)).toEqual(["t"]);
  });

  it("معرّف مكرّر يُرفض — نسختان من وثيقة تفسدان التردد", () => {
    expect(() =>
      buildBm25Index([
        { id: "x", text: "أ" },
        { id: "x", text: "ب" },
      ]),
    ).toThrow(/مكرّر/);
  });

  it("المكرّر بعد السقف يُرفض أيضًا — لا يختبئ في stats.dropped", () => {
    expect(() =>
      buildBm25Index(
        [
          { id: "x", text: "أ" },
          { id: "x", text: "ب" },
        ],
        { maxDocs: 1 },
      ),
    ).toThrow(/مكرّر/);
  });

  it("maxDocChars غير الصحيح الموجب يُرفض — ومزروع: السالب كان يقصّ ذيل الوثيقة بصمت", () => {
    expect(() => buildBm25Index(DOCS, { maxDocChars: -3 })).toThrow(RangeError);
    expect(() => buildBm25Index(DOCS, { maxDocChars: 0 })).toThrow(RangeError);
    expect(() => buildBm25Index(DOCS, { maxDocChars: 2.5 })).toThrow(RangeError);
    expect(() => buildBm25Index(DOCS, { maxDocChars: Number.NaN })).toThrow(RangeError);
    // ما كان يقع بلا الفحص: `slice(0, -3)` يُسقط آخر ثلاثة أحرف — «منشأة» من آخر الجملة.
    const tail = "الأسوار الأمنية حول المنشأة";
    expect(tokenize(tail.slice(0, -3))).not.toContain("منشاه");
    expect(tokenize(tail)).toContain("منشاه");
  });

  it("الافتراضيان موثّقان: k1 = 1.2 · b = 0.75", () => {
    expect(BM25_K1).toBe(1.2);
    expect(BM25_B).toBe(0.75);
    expect(buildBm25Index([]).k1).toBe(1.2);
  });
});

describe("مزروع (المادة ٣٠): إشارة k1", () => {
  it("مع k1 الموجب التردد الأعلى يرفع الدرجة؛ ومع إشارة مقلوبة ينخفض — فالكاشف يراها", () => {
    const good = [1, 2, 3].map((tf) => bm25TermScore(tf, 1, 10, 5, 5, BM25_K1, BM25_B));
    expect(good[0]).toBeLessThan(good[1]);
    expect(good[1]).toBeLessThan(good[2]);
    const planted = [1, 2, 3].map((tf) => bm25TermScore(tf, 1, 10, 5, 5, -BM25_K1, BM25_B));
    expect(planted[0]).toBeGreaterThan(planted[1]);
  });

  it("الباني يرفض k1 السالب وb خارج [0,1] قبل أن تقلب الترتيب بصمت", () => {
    expect(() => buildBm25Index(DOCS, { k1: -1.2 })).toThrow(RangeError);
    expect(() => buildBm25Index(DOCS, { k1: 0 })).toThrow(RangeError);
    expect(() => buildBm25Index(DOCS, { b: 1.5 })).toThrow(RangeError);
    expect(() => buildBm25Index(DOCS, { b: -0.1 })).toThrow(RangeError);
  });
});
