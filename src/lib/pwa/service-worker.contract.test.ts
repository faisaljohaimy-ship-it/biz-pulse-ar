/**
 * عامل الخدمة — حارس ضدّ «النظام القديم يعود».
 *
 * ## العطل المُبلَّغ
 *
 * المالك يفتح النظام فيرى واجهةً **لا وجود لها في المستودع**: علامة سابقة،
 * وأزرار حُذفت منذ أسابيع (المرفق IMG_9413). وأوّل تشخيصين في هذه الجلسة
 * كانا خاطئين، فالمكتوب هنا ما أثبته الدليل وحده:
 *
 *   • نصّ تلك الواجهة غير موجود في `src/` إطلاقًا — فُحص بالبحث المباشر.
 *     أي: البناء الحالي لا يستطيع رسمها. هي نسخةٌ **مخدومة** لا مكتوبة.
 *   • وعامل الخدمة كان يخدم `js` و`css` بقاعدة `cached ?? network` — أي
 *     الذاكرة أوّلًا. فما دخل الذاكرة مرّة يُخدَم إلى الأبد ما دام مساره
 *     ثابتًا، بصرف النظر عن عمره.
 *
 * البصمة في اسم الملف تحمي عادةً — لكن بالمصادفة لا بالتصميم: أصلٌ واحد غير
 * مبصوم يكفي لتثبيت جيلٍ كامل. فالحارس يُثبِّت التصميم نفسه.
 *
 * ## لماذا حارسٌ على المصدر
 *
 * عامل الخدمة لا يعمل في jsdom، ولا يظهر الفرق بين الاستراتيجيتين إلا على
 * متصفّح حقيقي فيه نسخةٌ مخزَّنة سابقة — وهو ما لا يُنشأ في اختبار. المُلزِم
 * هنا **أيّ الاستراتيجيتين كُتب**، وهذا يُقرأ من الملف.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";

const SW = readFileSync("public/sw.js", "utf8");
/** التعليقات تشرح العطل وتقتبس السطر القديم — الحارس يفحص الكود وحده. */
const CODE = SW.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");

describe("عامل الخدمة — الكود من الشبكة لا من الذاكرة", () => {
  it("actually read the worker", () => {
    // حارس صامت يمرّ إلى الأبد لو انتقل الملف. يفشل أوّلًا ويقول السبب.
    expect(SW).toContain("addEventListener");
    expect(SW).toContain("CACHE_NAME");
  });

  it("يفرّق بين الكود والوسائط بدل استراتيجية واحدة للجميع", () => {
    expect(CODE).toMatch(/isCode/);
    expect(CODE).toMatch(/\\\.\(\?:css\|js\)\$/);
  });

  it("لا يعود إلى «الذاكرة أوّلًا» للسكربتات والأنماط", () => {
    // هذا هو السطر الذي سمح بخدمة جيلٍ قديم إلى الأبد.
    const codeBranch = CODE.slice(CODE.indexOf("if (isCode)"));
    expect(codeBranch).toContain("fromNetwork()");
    // الذاكرة تُستشار في `catch` وحده — أي بعد فشل الشبكة، لا قبلها.
    expect(codeBranch).toMatch(/fromNetwork\(\)\s*\.catch/);
  });

  it("الوسائط تبقى من الذاكرة أوّلًا — وهي كامل فائدة العامل", () => {
    expect(CODE).toMatch(
      /caches\.match\(request\)\.then\(\(cached\) => cached \?\? fromNetwork\(\)\)/,
    );
  });

  it("لا يمرّر فراغًا إلى respondWith حين لا شبكة ولا نسخة", () => {
    // `caches.match` تعيد undefined، و`respondWith(undefined)` خطأ تشغيل.
    expect(CODE).toMatch(/cached \?\? Response\.error\(\)/);
  });

  it("المفتاح رُفع مع تغيّر الاستراتيجية فتُطرح نسخ القاعدة السابقة", () => {
    // v10 (٢٠٢٦/٠٨/٠٩): رُفع لأن **عضوية قائمة التخزين المسبق** تغيّرت —
    // `/sadeed-portrait.png` (١٫٩٢ ميغابايت) حُذف من `public/` بعد أن ثبت
    // أنه نسخة مطابقة بايتًا ببايت من `src/assets/`، ولا يرسمه أي مكوّن.
    // والرفع هنا ليس تجميلًا: `activate` يحذف كل مفتاح **سوى** الحالي، فلو
    // بقي v9 لبقيت النسخة الثقيلة مخزَّنة على كل جهاز مثبَّت إلى الأبد.
    expect(CODE).toMatch(/CACHE_NAME = "sadeed-static-v10/);
    // والتفعيل يحذف كل مفتاح سواه — وإلا بقيت v9 مؤهَّلة للخدمة.
    expect(CODE).toMatch(/key !== CACHE_NAME/);
  });

  it("لا يخزّن مسبقًا أصلًا محذوفًا — `addAll` ترفض الدفعة كاملة عند 404", () => {
    // `cache.addAll` ذرّية: أي مسار يعيد 404 يُفشل **تثبيت العامل كله**، لا
    // ذلك المدخل وحده. فكل مسار في القائمة يجب أن يقابله ملف قائم فعلًا.
    const precache = CODE.match(/const PRECACHE = \[([^\]]*)\]/);
    expect(precache).not.toBeNull();
    const paths = [...precache![1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    expect(paths.length).toBeGreaterThan(0);
    for (const p of paths) {
      expect(existsSync(`public${p}`), `${p} مذكور في PRECACHE ولا وجود له`).toBe(true);
    }
  });

  it("لا يخزّن تنقّلًا ولا نداء API — هذه ثوابت قائمة تُصان", () => {
    expect(CODE).toMatch(/request\.mode === "navigate"/);
    expect(CODE).toMatch(/startsWith\("\/api\/"\)/);
  });
});
