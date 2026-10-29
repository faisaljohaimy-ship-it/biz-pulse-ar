/**
 * الذراع المعجمية فوق المتن المضمّن — الفهرس من البيانات المصدَّرة، المجموعة
 * الموسومة بمراجع ملف:سطر تُفتح فعلًا، وشكل النتيجة (المادة ٢٧: «مطابقة
 * نصّية» لا نسبة)، والحالات المزروعة (المادة ٣٠) — ومنها فهرسُ عناوينٍ وحدها
 * يجيب الأسئلة الخمسة الأولى ويخفق في سؤالَي المحتوى.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GOLDEN_ANCHORS } from "@/lib/rag/evaluation";
import { SADEED_SAFE_REFERENCE_CORPUS } from "@/lib/sadeed/seed-corpus.data";
import { buildBm25Index, searchBm25, tokenize } from "../bm25.server";
import { LABELLED_QUESTIONS } from "../eval/labelled-set.server";
import {
  EXCERPT_MAX_CHARS,
  excerptOf,
  HCIS_FAMILY_AR,
  listSeedCorpusEntries,
  searchSeedCorpus,
  seedCorpusArm,
} from "./seed-corpus.server";

const CTX = { orgId: null, audience: "anonymous" as const };

describe("الفهرس من البيانات المصدَّرة لا من نصّ منسوخ", () => {
  const entries = listSeedCorpusEntries();

  it("47 = 6 مداخل بذرة + 41 اسم HCIS، بمعرّفات فريدة", () => {
    expect(entries).toHaveLength(SADEED_SAFE_REFERENCE_CORPUS.length + GOLDEN_ANCHORS.length);
    expect(entries.filter((e) => e.source === "seed")).toHaveLength(6);
    expect(entries.filter((e) => e.source === "hcis")).toHaveLength(41);
    expect(new Set(entries.map((e) => e.id)).size).toBe(entries.length);
  });

  it("نصّ البذرة هو العنوان والمحتوى المصدَّران حرفيًّا", () => {
    const first = SADEED_SAFE_REFERENCE_CORPUS[0];
    const entry = entries.find((e) => e.id === first.source)!;
    expect(entry.text).toBe(`${first.title}\n${first.content}`);
  });

  it("مدخل HCIS فئةٌ ورمز واسم — بلا نصّ نطاق — وجدول بذرته وفئته بحسب البادئة", () => {
    const byId = new Map(entries.map((e) => [e.id, e]));
    expect(byId.get("SEC-02")?.text).toBe("توجيه SEC-02 الأسوار الأمنية");
    expect(byId.get("STAGE-04")?.text).toBe("مرحلة STAGE-04 التصميم التفصيلي 60%");
    expect(byId.get("SECTOR-04")?.text).toBe("قطاع SECTOR-04 الغاز");
    expect(byId.get("SEC-02")?.table).toBe("hcis_directives");
    expect(byId.get("SAF-GEN")?.table).toBe("hcis_directives");
    expect(byId.get("STAGE-01")?.table).toBe("hcis_approval_stages");
    expect(byId.get("SECTOR-01")?.table).toBe("hcis_sectors");
    // كلمة الفئة من اسم الجدول (`HCIS_FAMILY_AR`) ثم الرمز ثم الاسم حرفيًّا — لا كلمة من البذرة.
    for (const e of entries.filter((x) => x.source === "hcis")) {
      expect(e.text, e.id).toBe(`${HCIS_FAMILY_AR[e.table!]} ${e.docId} ${e.title}`);
    }
  });

  it("المقتطف يتخطّى التنبيه المشترك ولا يتجاوز سقفه", () => {
    for (const e of entries.filter((x) => x.source === "seed")) {
      const ex = excerptOf(e);
      expect(ex.length).toBeLessThanOrEqual(EXCERPT_MAX_CHARS);
      expect(ex.startsWith("مرجع عام داخل المنصة")).toBe(false);
      expect(ex.startsWith("General platform reference")).toBe(false);
    }
    expect(excerptOf(entries.find((e) => e.id === "SEC-02")!)).toBe("SEC-02 — الأسوار الأمنية");
  });
});

describe("المجموعة الموسومة — سبعة أسئلة بمراجع تُفتح", () => {
  const entries = listSeedCorpusEntries();
  const byId = new Map(entries.map((e) => [e.id, e]));
  const titleTokens = new Set(entries.flatMap((e) => tokenize(e.title)));
  const contentOnly = LABELLED_QUESTIONS.filter((q) => q.evidenceAr);

  it("سبعة أسئلة بمعرّفات فريدة", () => {
    expect(LABELLED_QUESTIONS).toHaveLength(7);
    expect(new Set(LABELLED_QUESTIONS.map((q) => q.id)).size).toBe(7);
  });

  it.each(LABELLED_QUESTIONS)("$id: السطر $answerRef يحمل $expectId", (q) => {
    const [path, line] = q.answerRef.split(":");
    const text = readFileSync(path, "utf8").split("\n")[Number(line) - 1];
    expect(text, q.answerRef).toContain(q.expectId);
  });

  it.each(LABELLED_QUESTIONS)("$id: الجواب المتوقَّع ضمن الخمسة الأولى", (q) => {
    const top5 = searchSeedCorpus(q.questionAr, 5);
    expect(top5.map((h) => h.id)).toContain(q.expectId);
    const hit = top5.find((h) => h.id === q.expectId)!;
    expect(hit.source).toBe(q.expectSource);
  });

  it("سؤالان على الأقل من المحتوى وحده: لا مقطع مشترك مع أي عنوان، ودليلهما في متن الجواب لا في عنوان", () => {
    expect(contentOnly.length).toBeGreaterThanOrEqual(2);
    for (const q of contentOnly) {
      const shared = tokenize(q.questionAr).filter((t) => titleTokens.has(t));
      expect(shared, q.id).toEqual([]);
      const entry = byId.get(q.expectId)!;
      expect(entry.text, q.id).toContain(q.evidenceAr!);
      for (const e of entries) expect(e.title, `${q.id} ↔ ${e.id}`).not.toContain(q.evidenceAr!);
    }
  });

  it("مزروع: فهرسٌ من العناوين وحدها يجيب الأسئلة الخمسة الأولى ولا يصل سؤالَي المحتوى", () => {
    const titleIndex = buildBm25Index(entries.map((e) => ({ id: e.id, text: e.title })));
    for (const q of LABELLED_QUESTIONS) {
      const ids = searchBm25(titleIndex, q.questionAr, 5).map((h) => h.id);
      if (q.evidenceAr) expect(ids, q.id).not.toContain(q.expectId);
      else expect(ids, q.id).toContain(q.expectId);
    }
  });

  it("مزروع: سؤال خارج المتن لا يُلصَق به جواب", () => {
    const hits = searchSeedCorpus("ما سعر صرف الريال أمام الين الياباني اليوم؟", 5);
    expect(hits).toEqual([]);
  });
});

describe("مطابقة على رقم الرمز وحده ليست إصابة — ما قاسه المراجع ٢٠٢٦/١٠/٢٩", () => {
  const entries = listSeedCorpusEntries();

  it("«٤ كاميرات» و«4 كاميرات» و«10%» لا تعيد أي مدخل HCIS — كان قطاع الغاز يعود «مطابقة نصّية» قابلة للاستشهاد", () => {
    for (const q of ["٤ كاميرات", "4 كاميرات", "10%"]) {
      const hcisHits = searchSeedCorpus(q, 5).filter((h) => h.source === "hcis");
      expect(hcisHits, q).toEqual([]);
    }
  });

  it("مزروع: الفهرس الخام بلا التصفية يعيد SECTOR-04 لـ«٤ كاميرات» على «4» وحده — فالكاشف يرى ما أُغلق", () => {
    const raw = buildBm25Index(entries.map((e) => ({ id: e.id, text: e.text })));
    const hits = searchBm25(raw, "٤ كاميرات", 5);
    expect(hits.map((h) => h.id)).toContain("SECTOR-04");
    expect(hits.find((h) => h.id === "SECTOR-04")!.matched).toEqual(["4"]);
    expect(searchSeedCorpus("٤ كاميرات", 5).map((h) => h.id)).not.toContain("SECTOR-04");
  });

  it("«المرحلة 4» و«المرحلة ٤» تصلان STAGE-04 أولًا بكلمة الفئة — وبلا قطاع الغاز ولا SEC-04", () => {
    for (const q of ["المرحلة 4", "المرحلة ٤"]) {
      const ids = searchSeedCorpus(q, 5).map((h) => h.id);
      expect(ids[0], q).toBe("STAGE-04");
      expect(ids, q).not.toContain("SECTOR-04");
      expect(ids, q).not.toContain("SEC-04");
    }
  });

  it("الرمز بحروفه مطابقةٌ صالحة: «SEC-02» أولًا، ولا SECTOR-02/STAGE-02 على «2» وحدها، والعدد خمسة لا أقل", () => {
    const hits = searchSeedCorpus("SEC-02", 5);
    const ids = hits.map((h) => h.id);
    expect(ids[0]).toBe("SEC-02");
    expect(ids).not.toContain("SECTOR-02");
    expect(ids).not.toContain("STAGE-02");
    // التصفية بعد طلب الفهرس كلّه: القصّ إلى 5 ثم إسقاط اثنين كان يعطي 3.
    expect(hits).toHaveLength(5);
    hits.forEach((h, i) => expect(h.rank).toBe(i + 1));
  });

  it("limit غير الصحيح يُرفض هنا أيضًا — لا فراغ صامت", () => {
    expect(() => searchSeedCorpus("الأسوار", Number.NaN)).toThrow(RangeError);
    expect(() => searchSeedCorpus("الأسوار", 2.5)).toThrow(RangeError);
  });
});

describe("شكل النتيجة", () => {
  it("كل نتيجة تحمل مصدرها ووسم «مطابقة نصّية» ورتبتها ومقتطفًا محدودًا", () => {
    const hits = searchSeedCorpus("الأسوار الأمنية");
    expect(hits.length).toBeGreaterThan(0);
    hits.forEach((h, i) => {
      expect(h.rank).toBe(i + 1);
      expect(h.provenance.label).toBe("مطابقة نصّية");
      expect(h.provenance.citable).toBe(true);
      expect(h.provenance.docId).toBe(h.id);
      expect(h.excerpt.length).toBeLessThanOrEqual(EXCERPT_MAX_CHARS);
      expect(h.score).toBeGreaterThan(0);
    });
  });

  it("لا نسبة مئوية مختلَقة في المقتطف أو العنوان لنتيجة معجمية", () => {
    const hits = searchSeedCorpus("تحليل الحوادث");
    expect(hits.length).toBeGreaterThan(0);
    for (const h of hits) {
      expect(h.excerpt).not.toMatch(/sim\s*\d|تشابه\s*\d+\s*%/);
      expect(h.title).not.toMatch(/sim\s*\d|تشابه\s*\d+\s*%/);
    }
  });

  it("استعلام فارغ ⇐ [] بلا رمي", () => {
    expect(searchSeedCorpus("")).toEqual([]);
    expect(searchSeedCorpus("في من عن")).toEqual([]);
  });

  it("«للوائح» يصل مدخل «اللوائح» — ما كان يعود [] قبل تجريد «لل» بمرشّحَين", () => {
    expect(searchSeedCorpus("للوائح").map((h) => h.id)).toContain(
      "platform-reference/sadeed-grounding-contract-ar",
    );
  });
});

describe("الذراع", () => {
  it("تخدم بلا مزوّد وبلا قاعدة وتقيس كمونها", async () => {
    const r = await seedCorpusArm.run("ما متطلبات الأسوار الأمنية؟", CTX, 1_500);
    expect(r.arm).toBe("seed-corpus-lexical");
    expect(r.served).toBe(true);
    expect(r.reason).toBeNull();
    expect(r.hits.length).toBeLessThanOrEqual(5);
    expect(r.hits[0]?.id).toBe("SEC-02");
    expect(r.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("الفراغ مع served: true نتيجة صادقة لا عطل", async () => {
    const r = await seedCorpusArm.run("", CTX, 1_500);
    expect(r.served).toBe(true);
    expect(r.hits).toEqual([]);
  });

  it("موعدٌ غير موجب يُردّ بسبب صريح قبل العمل", async () => {
    const r = await seedCorpusArm.run("الأسوار", CTX, 0);
    expect(r.served).toBe(false);
    expect(r.reason).toBe("deadline");
    expect(r.hits).toEqual([]);
  });
});
