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

/** Evaluate the actual boolean guard, not a historical spelling of it. */
function guardAllows(condition: string, values: Record<string, unknown>) {
  return Boolean(
    Function(...Object.keys(values), `return (${condition});`)(...Object.values(values)),
  );
}

describe("المجلس خارج المسار الافتراضي", () => {
  it("actually read both files", () => {
    // حارس صامت يمرّ إلى الأبد لو انتقل أيّهما.
    expect(CHAT_CODE).toContain("runAgentMission");
    expect(GUARD_CODE).toContain("replyMode");
  });

  it("لا يُستدعى إلا بطلبٍ صريح", () => {
    const condition = CHAT_CODE.match(
      /if \(([^\n]+)\) \{\s*try \{\s*const \{ runAgentMission \}/,
    )?.[1];
    expect(condition, "بوابة المجلس غائبة").toBeTruthy();
    if (!condition) return;
    for (const replyMode of ["text", "voice", "deep"]) {
      for (const useOpenAi of [false, true]) {
        for (const lastUserText of ["", "سؤال"]) {
          expect(guardAllows(condition, { lastUserText, replyMode, useOpenAi })).toBe(
            Boolean(lastUserText) && replyMode === "deep" && !useOpenAi,
          );
        }
      }
    }
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
    const marker = CHAT_CODE.match(/if \(([^\n]+googleKey[^\n]+)\) \{/);
    const at = marker?.index ?? -1;
    const condition = marker?.[1];
    expect(condition).toBeTruthy();
    if (condition) {
      for (const googleKey of [undefined, "configured"]) {
        for (const openAiModel of [null, {}]) {
          expect(guardAllows(condition, { googleKey, openAiModel })).toBe(
            !googleKey && !openAiModel,
          );
        }
      }
    }
    const end = CHAT_CODE.indexOf("validateChatRequest", at);
    expect(at, "لم يُعثر على فرع غياب المزوّد").toBeGreaterThan(-1);
    expect(end, "لم يُعثر على نهاية الفرع").toBeGreaterThan(at);
    const branch = CHAT_CODE.slice(at, end);
    // البثّ صار في دالةٍ مشتركة (٢٠٢٦/١٠/١٦): الفرع يناديها، وهي تبثّ.
    expect(branch).toContain("localGuaranteedReply(");
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
