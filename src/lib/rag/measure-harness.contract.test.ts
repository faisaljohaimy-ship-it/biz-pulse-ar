/**
 * عقد مقياس الاسترجاع — «الرقم لا يُقال عاريًا».
 *
 * المادة ٢٧ تمنع الرقم المختلَق. وهذا الملف يحرس ما هو أدقّ وأخطر: الرقم
 * **الصحيح** المقتطَع من سياقه. أول تشغيل للمقياس أعطى ١٫٠٠٠٠ في الذراعين،
 * وهو رقمٌ صحيح حسابيًّا ومضلِّل تمامًا لو قيل وحده — لأن المجسّ نصٌّ فرعيّ
 * من هدفه: نموّ المتن يُدرج `scope_ar` داخل متن الوثيقة، فالبحث بوصف
 * النطاق يجد الوثيقة التي تحوي ذلك الوصف حرفيًّا.
 *
 * فالحارس يشترط أن يخرج القياس **ومعه حدوده دائمًا**، وألّا يدّعي فتح
 * البوابة، وألّا يُقارن بعتبتَي الدستور.
 */
import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LABELLED_QUESTIONS } from "@/lib/retrieval/eval/labelled-set.server";
import { ARM_NAMES } from "@/lib/retrieval/aggregate.server";
import {
  assertProbesAreNotTitles,
  formatAggregatorMeasureAr,
  formatOfflineMeasureAr,
  runAggregatorOfflineMeasure,
  runOfflineMeasure,
} from "@/lib/retrieval/eval/offline-measure.server";
import { normalizeArStrict } from "@/lib/retrieval/normalize-ar.server";
import { listSeedCorpusEntries } from "@/lib/retrieval/sources/seed-corpus.server";
import { evaluateLabelledRuns, evaluateRetrieval } from "./evaluation";

const SQL = readFileSync("supabase/preflight/rag_measure.sql", "utf8");
const SH = readFileSync("scripts/rag-measure.sh", "utf8");
const OFFLINE_SRC = readFileSync("src/lib/retrieval/eval/offline-measure.server.ts", "utf8");

describe("المقياس لا يمسّ الإنتاج", () => {
  it("عنقودٌ مؤقّت يُنشأ ويُهدَم — لا اتصال بقاعدة حيّة", () => {
    expect(SH).toContain("initdb");
    expect(SH).toContain("pg_ctl");
    expect(SH).toMatch(/rm -rf/);
    // لا مفاتيح ولا مضيف إنتاج.
    expect(SH).not.toMatch(/SUPABASE_URL|SERVICE_ROLE|https:\/\//);
  });

  it("يتخطّى بلا فشل حين لا يوجد Postgres — لا يُسقِط بوابة", () => {
    expect(SH).toMatch(/exit 0/);
  });
});

describe("المقياس لا يؤلّف سؤالًا", () => {
  it("المجسّات مشتقّة من صفوف القاعدة لا مكتوبة في الملف", () => {
    // قائمة أسئلة مكتوبة هنا = تأليف، وهو ممنوع صراحةً.
    expect(SQL).toMatch(/d\.title as probe/);
    expect(SQL).toMatch(/h\.scope_ar as probe/);
    // ولا نسخة ثانية من المرساة: لا قائمة رموز مكتوبة يدويًّا.
    expect(SQL).not.toMatch(/'SEC-0\d'\s*,\s*'SEC-0\d'/);
  });

  it("السقالة تُقرأ من ملف واحد يشاركه فحص ما قبل التطبيق", () => {
    expect(existsSync("supabase/preflight/_scaffold.sql")).toBe(true);
    expect(SQL).toContain(":scaffold_file");
  });
});

describe("الرقم يخرج ومعه حدوده", () => {
  it("كل تشغيل يُصدِر تفسيرًا يمنع اقتطاع الرقم", () => {
    expect(SQL).toContain("'interpretation'");
    expect(SQL).toMatch(/لا يعني «الاسترجاع ممتاز»/);
  });

  it("يُعلن صراحةً أن الذراع المتّجهية غير مقيسة", () => {
    expect(SQL).toMatch(/الذراع المتّجهية غير مقيسة/);
  });

  it("لا يدّعي فتح البوابة ولا يقارن بعتبتَي الدستور", () => {
    expect(SQL).toMatch(/لا يفتح rag_enabled/);
    expect(SQL).toMatch(/0\.85.*0\.95|0\.95.*0\.85/s);
  });

  it("القسمة على صفر تعطي NULL لا صفرًا (المادة ٢٧)", () => {
    // «لم يُقَس» ليست «صفر». أول تشغيل أعاد null فعلًا حين كان المتن فارغًا.
    expect(SQL).toMatch(/nullif\(count\(\*\), 0\)/);
  });
});

/**
 * الذراع غير المتّصلة (O6، ٢٠٢٦/١٠/٢٩): مقياسٌ واحد بذراع ثانية لا مقياس ثانٍ
 * (المادة ٣١ — السطح الثاني). القاعدة نفسها: الرقم ومعه حدوده، لا ادّعاء فتح
 * البوابة، `null` ⇐ «لم يُقَس»، والسؤال ليس عنوانًا.
 */
describe("الذراع غير المتّصلة — رقمٌ مع حدوده بلا قاعدة ولا مزوّد", () => {
  // بيئة فارغة عمدًا: لا راية ولا مفتاح — الحالة التي يعمل بها CI.
  const m = runOfflineMeasure({});

  it("تعمل فورًا وN = حجم المجموعة الموسومة، والمقام = N، والفهرس من المحتوى المصدَّر", () => {
    expect(m.n).toBe(LABELLED_QUESTIONS.length);
    expect(m.scored).toBe(m.n);
    expect(m.perQuestion).toHaveLength(m.n);
    expect(m.index.docs).toBe(listSeedCorpusEntries().length);
    expect(m.index.docs).toBe(m.index.seed + m.index.hcisNoScope);
    expect(formatOfflineMeasureAr(m)).toContain(`(${m.n} في المقام)`);
  });

  it("المجمِّع الموسوم يقبل معرّف بذرة؛ ومزروع: مجمِّع المراسي يُسقطه من المقام فيصغر الرقم بصمت", () => {
    const run = {
      code: "platform-reference/incident-analysis-ar",
      rankedCodes: ["platform-reference/incident-analysis-ar"],
      insufficient: false,
    };
    expect(evaluateLabelledRuns([run]).scored).toBe(1);
    expect(evaluateLabelledRuns([run]).hitAt5).toBe(1);
    // لو استُبدل `evaluateRetrieval` بالمجمِّع الموسوم (تصفية على المراسي) لصار المقام 0
    // على أسئلة البذرة — وهذا ما يرميه runOfflineMeasure بدل أن يطبعه.
    const planted = evaluateRetrieval([run]);
    expect(planted.scored).toBe(0);
    expect(planted.hitAt5).toBeNull();
  });

  it("نصّ الحدود يحمل عباراته الثلاث ويُطبع مع الرقم في الجدول", () => {
    expect(m.limits).toContain(`مجموعة موسومة ${m.n} سؤالًا من كاتب الاختبار`);
    expect(m.limits).toContain("ليست استدعاء@5 على متن موثّق");
    expect(m.limits).toContain("لا تُستعمل لرفع rag_enabled");
    const table = formatOfflineMeasureAr(m);
    expect(table).toContain("hit@5 = ");
    expect(table).toContain(m.limits);
    expect(table).toContain("بلا نصّ نطاق");
  });

  it("hit@5 رقم مقيس في [0,1] لأن N > 0 — لا null حين قِيس فعلًا", () => {
    expect(typeof m.hitAt5).toBe("number");
    expect(m.hitAt5).toBeGreaterThanOrEqual(0);
    expect(m.hitAt5).toBeLessThanOrEqual(1);
    expect(typeof m.mrr).toBe("number");
  });

  it("الذراع المتّجهية وأذرع القاعدة «لم يُقَس» لا صفر؛ والمخدوم 0 ببيئة بلا راية", () => {
    expect(m.vector.hitAt5).toBeNull();
    expect(m.vector.text).toBe("لم يُقَس");
    expect(m.vector.served).toBe(0);
    expect(m.vector.basis).toContain("ببناء الكود");
    expect(m.dbLexical.hitAt5).toBeNull();
    expect(m.dbLexical.text).toBe("لم يُقَس");
    const table = formatOfflineMeasureAr(m);
    expect(table).toMatch(/الذراع المتّجهية: hit@5 لم يُقَس/);
    expect(table).toMatch(/أذرع القاعدة: hit@5 لم يُقَس/);
  });

  it("براية ومفتاح حاضرين: المخدوم null («لم يُقَس») لا 0 — لم تُنفَّذ هنا", () => {
    const withVector = runOfflineMeasure({
      SADEED_GEMINI_RAG_READY: "true",
      GEMINI_API_KEY: "present",
    });
    expect(withVector.vector.served).toBeNull();
    expect(formatOfflineMeasureAr(withVector)).toMatch(/مخدوم لم يُقَس/);
  });

  it("scored = 0 ⇐ كل المقاييس null (المادة ٢٧)", () => {
    const empty = evaluateLabelledRuns([]);
    expect(empty.scored).toBe(0);
    expect(empty.hitAt5).toBeNull();
    expect(empty.hitAt1).toBeNull();
    expect(empty.mrr).toBeNull();
  });

  it("لا جسر إلى سجلّ التقييم ولا إلى الراية", () => {
    expect(OFFLINE_SRC).not.toMatch(/toEvalRunRow|decideAutoEnable|rag_enabled\s*[:=]/);
    // ولا مقارنة بعتبتَي الدستور.
    expect(OFFLINE_SRC).not.toMatch(/0\.85|0\.95/);
  });

  it("السؤال ليس عنوانًا — ومزروع: العنوان بعلامة أو كلمة وصل أو رمز يُرفض كما العنوان نفسه", () => {
    const entries = listSeedCorpusEntries();
    expect(() => assertProbesAreNotTitles(LABELLED_QUESTIONS, entries)).not.toThrow();
    for (const questionAr of [
      "الأسوار الأمنيه",
      "الأسوار الأمنية؟",
      "ما الأسوار الأمنية",
      "SEC-02 الأسوار الأمنية",
      "SEC-02",
    ]) {
      const planted = [{ ...LABELLED_QUESTIONS[0], id: "planted", questionAr }];
      expect(() => assertProbesAreNotTitles(planted, entries), questionAr).toThrow(/مجسّ عنوان/);
    }
  });

  it("مزروع: حارسٌ يقارن النصّ المطويّ وحده يمرّر العنوان بعلامة أو كلمة وصل أو رمز — وحارس المقاطع يرفضه", () => {
    const entries = listSeedCorpusEntries();
    // الحارس القديم المزروع: مطابقة نصّية على العنوان المطويّ — يرى العنوان الحرفي فقط.
    const byText = new Set(entries.map((e) => normalizeArStrict(e.title)));
    const textOnlyGuard = (questionAr: string) => {
      if (byText.has(normalizeArStrict(questionAr))) throw new Error("مجسّ عنوان (نصّ)");
    };
    // يرى الحرفي والمطويّ…
    expect(() => textOnlyGuard("الأسوار الأمنية")).toThrow(/مجسّ عنوان/);
    expect(() => textOnlyGuard("الأسوار الأمنيه")).toThrow(/مجسّ عنوان/);
    // …ويمرّر الثلاثة التي ليست إلا العنوان بزيادة — وهي ما يرفضه حارس المقاطع.
    for (const questionAr of ["الأسوار الأمنية؟", "ما الأسوار الأمنية", "SEC-02 الأسوار الأمنية"]) {
      expect(() => textOnlyGuard(questionAr), questionAr).not.toThrow();
      const planted = [{ ...LABELLED_QUESTIONS[0], id: "planted", questionAr }];
      expect(() => assertProbesAreNotTitles(planted, entries), questionAr).toThrow(/مجسّ عنوان/);
    }
  });

  it("السكربت يشغّل الذراع غير المتّصلة قبل Postgres ويبقى متخطّيًا بلا Postgres", () => {
    const offlineAt = SH.indexOf("offline-measure.main.server.ts");
    const pgAt = SH.indexOf("initdb");
    expect(offlineAt).toBeGreaterThan(-1);
    expect(offlineAt).toBeLessThan(pgAt);
    expect(SH).toContain("esbuild");
    expect(SH).toMatch(/exit 0/);
  });
});

/**
 * مقياس مجمِّع الخطوة ٢ (الضابط الرابع، ٢٠٢٦/١٠/٢٩): المقياس نفسه بذراع ثالثة
 * لا مقياس ثانٍ — يشغّل `runArms` الحقيقي بتشكيلة أذرع مسار الإجابة بأسمائها،
 * والقاعدية والمتّجهية «لم يُقَس» لأنها لا تُنفَّذ هنا.
 */
describe("مقياس المجمِّع غير المتّصل — المسار الموصول في وضع صفر مزوّد", () => {
  it("N = المجموعة الموسومة، المقام = N، والداخلية وحدها تخدم كل الأسئلة", async () => {
    const m = await runAggregatorOfflineMeasure({});
    expect(m.mode).toBe("aggregator-offline");
    expect(m.n).toBe(LABELLED_QUESTIONS.length);
    expect(m.scored).toBe(m.n);
    expect(m.arms[ARM_NAMES.seed]).toMatchObject({ served: m.n, of: m.n, text: null });
    for (const name of [
      ARM_NAMES.hcisLive,
      ARM_NAMES.finnKnowledge,
      ARM_NAMES.secKnowledge,
      ARM_NAMES.documentChunks,
    ])
      expect(m.arms[name], name).toMatchObject({
        served: 0,
        of: m.n,
        reason: "offline_no_db",
        text: "لم يُقَس",
      });
    expect(m.arms[ARM_NAMES.vector]).toMatchObject({
      served: 0,
      reason: "flag_off",
      text: "لم يُقَس",
    });
    expect(typeof m.hitAt5).toBe("number");
    expect(typeof m.p95LatencyMs).toBe("number");
    expect(m.latenciesMs).toHaveLength(m.n);
  });

  it("الراية مرفوعة بلا مفتاح ⇐ سبب المتّجهية embed_unavailable؛ ومع المفتاح not_run_offline — لا تُنفَّذ هنا", async () => {
    const noKey = await runAggregatorOfflineMeasure({ SADEED_GEMINI_RAG_READY: "true" });
    expect(noKey.arms[ARM_NAMES.vector].reason).toBe("embed_unavailable");
    const withKey = await runAggregatorOfflineMeasure({
      SADEED_GEMINI_RAG_READY: "true",
      GEMINI_API_KEY: "present",
    });
    expect(withKey.arms[ARM_NAMES.vector].reason).toBe("not_run_offline");
    expect(withKey.arms[ARM_NAMES.vector].text).toBe("لم يُقَس");
  });

  it("الجدول يطبع الحدود والأساس و«لم يُقَس» للأذرع غير المنفَّذة، ولا يقارن بعتبتَي الدستور", async () => {
    const m = await runAggregatorOfflineMeasure({});
    const table = formatAggregatorMeasureAr(m);
    expect(table).toContain(m.limits);
    expect(table).toContain("ليست استدعاء@5 على متن موثّق");
    expect(table).toContain("لم يُقَس");
    expect(table).toContain("p95 = ");
    expect(table).not.toMatch(/0\.85|0\.95/);
  });

  it("مزروع: تشكيلة بلا الذراع الداخلية تُفرغ النتائج — فالرقم يشهد للمسار الموصول لا لذراعٍ بعينها", async () => {
    const { runArms } = await import("@/lib/retrieval/aggregate.server");
    const out = await runArms([], LABELLED_QUESTIONS[0].questionAr, {
      orgId: null,
      audience: "anonymous",
    });
    expect(out.fused).toEqual([]);
    const m = await runAggregatorOfflineMeasure({});
    expect(m.perQuestion.every((p) => p.rank !== null)).toBe(true);
  });
});
