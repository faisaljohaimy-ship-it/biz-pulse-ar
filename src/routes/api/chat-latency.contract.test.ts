/**
 * زمن ردّ SADEED — حارس ضدّ عودة الانتظار إلى المسار الافتراضي.
 *
 * ## ما كان يقع
 *
 * المالك: «اجعل فن يردّ سريعًا كجمني بلا تأخير». وكان كل دور يمرّ بـ
 * **استدعاءَي نموذجٍ كاملين بالتسلسل**:
 *
 *   ١. `runAgentMission` — «مجلس العشرة»، بمهلة `50_000` مللي ثانية، ووكيله
 *      الرئيس معقودٌ على `estimated_latency_ms: 12_000` و`sequential`.
 *   ٢. ثم `generateText` للإجابة نفسها.
 *
 * ومخرَج الأوّل **لا يصل المستخدم**: يُحقن في `systemPrompt` وسمًا
 * `<council-advisory>` موصوفًا في موضعه بأنه «UNTRUSTED … NOT EVIDENCE»
 * ولا يجوز الاستشهاد به. أي: ثمنٌ بنموذجٍ كامل مقابل مشورةٍ لا تُرى. وكان
 * يعمل للزائر غير المصادَق أيضًا.
 *
 * ## ما يحرسه هذا الملف
 *
 * أن المجلس **اختياريّ صريح** لا افتراضيّ، وأن الاختيار **قابل للتحقّق
 * فعلًا** — وهذه النقطة الثانية هي الأهمّ: أوّل صياغة للإصلاح اشترطت
 * `replyMode === "deep"` بينما مخطّط التحقّق لا يقبل إلا `text` و`voice`،
 * فكانت ستُسقط المجلس **إلى الأبد** بدل أن تجعله طلبًا. الشرط الذي لا
 * يتحقّق ليس بوّابةً، بل حذفٌ صامت.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const CHAT = readFileSync("src/routes/api/chat.ts", "utf8");
const GUARD = readFileSync("src/routes/api/-chat-guard.ts", "utf8");
/** التعليقات تشرح العطل وتقتبس ما نُقض — الحارس يفحص الكود وحده. */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
const CHAT_CODE = strip(CHAT);
const GUARD_CODE = strip(GUARD);

describe("المجلس خارج المسار الافتراضي", () => {
  it("actually read both files", () => {
    // حارس صامت يمرّ إلى الأبد لو انتقل أيّهما.
    expect(CHAT_CODE).toContain("runAgentMission");
    expect(GUARD_CODE).toContain("replyMode");
  });

  it("لا يُستدعى إلا بطلبٍ صريح", () => {
    // الشرط الذي كان `if (lastUserText)` وحده. وخلف Gemini وحده (٢٠٢٦/١٠/١٨):
    // المجلس يبني نموذجه من مفتاح Gemini لا من خطة المحرّك — فلا يُنفق على مورّدٍ
    // لم يُختر حين يكون المختار المحوّل الاختياري.
    expect(CHAT_CODE).toMatch(
      /if \(lastUserText && replyMode === "deep" && plan\.selected === "gemini"\)/,
    );
  });

  it("والطلب الصريح **ممكن** — وإلّا فهو حذفٌ صامت لا بوّابة", () => {
    // هذا هو الفحص الذي كان سيمسك أوّل صياغة للإصلاح.
    expect(GUARD_CODE).toMatch(/"deep"/);
    expect(GUARD_CODE).toMatch(/replyMode\?: "text" \| "voice" \| "deep"/);
    // ولا يُرفض في التحقّق.
    const modes = GUARD_CODE.match(/REPLY_MODES = \[([^\]]*)\]/)?.[1] ?? "";
    expect(modes).toContain("deep");
  });
});

describe("لا انتظار لما لا يراه المستخدم", () => {
  it("كتابة التفضيلات لا تسبق الردّ", () => {
    // كانت `await persistAdaptivePreferences(...)` — رحلة شبكة قبل أن يرى
    // المستخدم حرفًا واحدًا، على شيء لا يخصّ هذا الدور أصلًا.
    expect(CHAT_CODE).not.toMatch(/await persistAdaptivePreferences/);
    expect(CHAT_CODE).toMatch(/void persistAdaptivePreferences/);
  });

  it("الفشل يُبلَّغ ولا يُبتلع", () => {
    // عملٌ لا يُنتظر لا يعني عملًا بلا رقيب.
    const at = CHAT_CODE.indexOf("void persistAdaptivePreferences");
    expect(CHAT_CODE.slice(at, at + 320)).toMatch(/\.catch\(/);
  });
});

describe("الإجابة الفورية من بيانات النظام — ٢٠٢٦/٠٩/٠٢ ثم ٢٠٢٦/٠٩/٠٣", () => {
  /**
   * «اجعل سَدِيد يجاوب فورًا... كعدد المشاريع والصيانة والبلاغات»: طبقة
   * `matchInstantDataAnswer` تجيب العدّ الصرف وسجلّ المرجع قبل النموذج.
   * وُلدت خلف بوابة `userId` تحفّظًا، **ثم نسخ المالك البوابة بأمر
   * ٢٠٢٦/٠٩/٠٣** («البيانات الإنتاجية وليست المحاكاة، مع إزالة المحاكاة
   * كاملًا») — والمجموعات نفسها معروضة للزائر في شاشات العرض المفتوحة،
   * فالطبقة تُستشار لكل نداءٍ اجتاز حارس النطاق.
   */
  it("الطبقة تُستشار لكل نداء، بعد المسار الفوري القائم وبلا بوابة هوية", () => {
    const fastAt = CHAT_CODE.indexOf("matchFastRecall(lastUserText)");
    const instantAt = CHAT_CODE.indexOf("matchInstantDataAnswer");
    expect(fastAt).toBeGreaterThan(-1);
    expect(instantAt, "طبقة الإجابة الفورية غائبة").toBeGreaterThan(fastAt);
    const gated = /if \(userId\) \{\s*const \{ matchInstantDataAnswer \}/.test(CHAT_CODE);
    expect(gated, "بوابة userId عادت بعد أن نسخها المالك — الزائر يعود للنموذج البطيء").toBe(false);
  });

  it("وتُبثّ بوسم مصدرها عبر القمع نفسه", () => {
    expect(CHAT_CODE).toMatch(/streamFixed\(instant\.answer, "instant-data"\)/);
  });
});

describe("لقطة السياق لا تنتظر قاعدةً معلّقة — ٢٠٢٦/٠٩/٠٢", () => {
  const CTX = strip(readFileSync("src/lib/sadeed-context.server.ts", "utf8"));

  it("استعلامات اللقطة تحت سقفٍ زمني يسبق أول حرف", () => {
    expect(CTX).toMatch(/SNAPSHOT_DB_DEADLINE_MS = 2_500/);
    expect(CTX).toMatch(/Promise\.race\(\[\s*queriesPromise/);
  });

  it("وتجاوز السقف أو فراغ القاعدة يسقط إلى مجموعات التصدير لا إلى «لا بيانات»", () => {
    // كان الفراغ الكلي يعيد NO_INDUSTRIAL_SECURITY_DATA_AVAILABLE فيسقط
    // المصادَق إلى محاكاة الزائر عن بياناتٍ إنتاجية تعرضها شاشته.
    expect(CTX).toMatch(/buildProductionDatasetsSnapshot\(question, observedAt, "db-timeout"\)/);
    expect(CTX).toMatch(/buildProductionDatasetsSnapshot\(question, observedAt, "db-empty"\)/);
    expect(CTX).not.toContain("NO_INDUSTRIAL_SECURITY_DATA_AVAILABLE");
  });
});

describe("وقت تشغيل الوكلاء يقرأ البيانات الكنسية — ٢٠٢٦/٠٩/٠٢", () => {
  const RUNTIME = strip(readFileSync("src/lib/exec/agent-runtime.server.ts", "utf8"));

  it("كتلة المعرفة تُحقن في نظام‑التوجيه ويُشغَّل النموذج بها", () => {
    // «تجاوب الوكلاء فوري»: بدونها يجيب الوكيل أسئلة البيانات بجولات
    // أدوات على جداول sec_* الفارغة — بطيئًا ثم «لا بيانات».
    // (٢٠٢٦/٠٩/٠٣ — سقط وسيط orgId مع إزالة بوابة المحاكاة من الكتلة.)
    expect(RUNTIME).toMatch(/buildEnterpriseKnowledgeBlock\(goal\)/);
    expect(RUNTIME).toMatch(/system: systemPromptWithData/);
    expect(RUNTIME).not.toMatch(/system: systemPrompt,/);
  });
});

describe("الثوابت التي لا يجوز أن يمسّها التسريع", () => {
  it("غياب المزوّد يُبَثّ ردًّا، لا يُرَدّ خطأً", () => {
    // الصياغة الأولى هنا كانت `expect(CHAT_CODE).not.toMatch(/status:\s*503/)`
    // ووُصفت بأنها «لا 503 أبدًا». وهي **تمرّ بلا معنى** من وجهين: الملفّ
    // يردّ 503 فعلًا حين تنقص إعدادات القاعدة، وتُكتب `jsonError(msg, 503,
    // id)` — أي أن النمط المفحوص لا يوجد في الملفّ بأيّ حال. حارسٌ لا
    // يستطيع أن يسقط لا يحرس شيئًا.
    //
    // والمحروس فعلًا شرطٌ أضيق وأصدق: **فرع غياب المزوّد** يبثّ نصًّا،
    // ولا يردّ رمز خطأ. أمّا 503 عند نقص الإعدادات فحالةٌ أخرى — عطلُ
    // تهيئةٍ لا انقطاعُ ذكاء — ولا يشملها هذا العهد.
    //
    // **وصار الفرع «الوضع الحتمي بلا تكلفة» (٢٠٢٦/١٠/١٨):** كان `if (!googleKey)`
    // في رأس المعالج يعيد سطرًا ثابتًا قبل كل طبقة. الآن يُقرَّر بخطة المحرّك،
    // ويأتي **بعد** الطبقات الحتمية و**قبل** الحصّة والنموذج — فلا يُنفق شيئًا.
    const at = CHAT_CODE.indexOf('if (plan.mode === "zero_cost")');
    const end = CHAT_CODE.indexOf("enforceAiQuota(", at);
    expect(at, "لم يُعثر على فرع غياب المزوّد").toBeGreaterThan(-1);
    expect(end, "لم يُعثر على نهاية الفرع").toBeGreaterThan(at);
    expect(
      CHAT_CODE.indexOf("deterministicReply(gateMode)"),
      "الفرع يسبق الطبقات الحتمية",
    ).toBeLessThan(at);
    expect(at, "الفرع بعد نداء النموذج").toBeLessThan(CHAT_CODE.indexOf("generateText("));
    expect(CHAT_CODE, "السطر الثابت المبكّر عاد قبل الطبقات").not.toContain("if (!googleKey)");
    const branch = CHAT_CODE.slice(at, CHAT_CODE.indexOf("const primary", at));
    // البثّ صار في دالةٍ مشتركة (٢٠٢٦/١٠/١٦): الفرع يناديها، وهي تبثّ.
    expect(branch).toContain("localGuaranteedReply(");
    expect(branch).toContain("zeroCostUnsupportedReply(");
    expect(branch).not.toMatch(/jsonError\(/);
    const fnAt = CHAT_CODE.indexOf("function localGuaranteedReply(");
    expect(fnAt, "لم يُعثر على الدالة المشتركة").toBeGreaterThan(-1);
    const fn = CHAT_CODE.slice(fnAt, CHAT_CODE.indexOf("\n}\n", fnAt));
    expect(fn).toContain("createUIMessageStreamResponse");
    expect(fn).not.toMatch(/jsonError\(|status:\s*5\d\d/);
  });

  it("النصّ المعروض يمرّ بالتصفية قبل الإرسال", () => {
    expect(CHAT_CODE).toContain("safeDisplayText");
  });
});

describe("الصفر تكلفة أوّلًا — ترتيب المسار (أمر المالك ٢٠٢٦/١٠/١٨)", () => {
  it("الطبقات الحتمية تسبق الحصّة اليومية — الجواب الذي لا يُنفق لا يستهلكها", () => {
    const detAt = CHAT_CODE.indexOf("deterministicReply(gateMode)");
    const quotaAt = CHAT_CODE.indexOf("enforceAiQuota(");
    const rateAt = CHAT_CODE.indexOf("enforceRateLimit(");
    expect(detAt, "الطبقات الحتمية غائبة").toBeGreaterThan(-1);
    expect(rateAt, "حدّ الدقيقة يسبق الطبقات الحتمية").toBeLessThan(detAt);
    expect(detAt, "الحصّة تُفحص قبل الجواب الحتمي").toBeLessThan(quotaAt);
  });

  it("البوّابة المغلقة تجرّب الحتميّ قبل ردّها المحلّي، ولا تُسقطه", () => {
    // الردّ المغلق نفسه يجرّب الطبقات الحتمية موسومةً `closed` قبل سطره المحلّي (DEF-10)،
    // ومساراه (المعدّل والحصّة) يمرّان به.
    expect(CHAT_CODE).toMatch(
      /const closedPolicyReply = async[\s\S]{0,400}\(await deterministicReply\("closed"\)\) \?\?\s*localGuaranteedReply\(/,
    );
    expect(CHAT_CODE).toContain(
      'if (gateDegradedMode() === "closed") return closedPolicyReply("rate");',
    );
    expect(CHAT_CODE).toContain(
      'if (gateDegradedMode() === "closed") return closedPolicyReply("quota");',
    );
  });

  it("معرفة المستأجر المسترجعة لا تسقط حين يُرفع علم البيانات الحيّة في فرع المجموعات", () => {
    expect(CHAT_CODE).toContain("if (ragContext && !ragIncluded)");
    expect(CHAT_CODE).not.toContain("if (ragContext && !liveDataAvailable)");
  });

  it("دور النموذج تحت سقفٍ زمني يجمع إلغاء الطلب والمهلة", () => {
    expect(CHAT_CODE).toMatch(/MODEL_TURN_DEADLINE_MS = 45_000/);
    expect(CHAT_CODE).toMatch(/MODEL_TURN_DEADLINE_DEEP_MS = 75_000/);
    expect(CHAT_CODE).toMatch(
      /AbortSignal\.any\(\[request\.signal, AbortSignal\.timeout\(turnDeadlineMs\)\]\)/,
    );
    expect(CHAT_CODE).toMatch(/abortSignal: turnSignal/);
    expect(CHAT_CODE).toMatch(/name === "TimeoutError" \|\| name === "AbortError"/);
  });
});
