/**
 * زمن ردّ FINN — حارس ضدّ عودة الانتظار إلى المسار الافتراضي.
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
    // الشرط الذي كان `if (lastUserText)` وحده.
    expect(CHAT_CODE).toMatch(/if \(lastUserText && replyMode === "deep"\)/);
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
    const at = CHAT_CODE.indexOf("if (!googleKey)");
    const end = CHAT_CODE.indexOf("validateChatRequest", at);
    expect(at, "لم يُعثر على فرع غياب المزوّد").toBeGreaterThan(-1);
    expect(end, "لم يُعثر على نهاية الفرع").toBeGreaterThan(at);
    const branch = CHAT_CODE.slice(at, end);
    expect(branch).toContain("createUIMessageStreamResponse");
    expect(branch).not.toMatch(/jsonError\(/);
  });

  it("النصّ المعروض يمرّ بالتصفية قبل الإرسال", () => {
    expect(CHAT_CODE).toContain("safeDisplayText");
  });
});
