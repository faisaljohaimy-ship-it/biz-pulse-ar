/**
 * عقد الانتقال بين الشاشات (قرار المالك ٢٠٢٦/٠٨/٠٦).
 *
 * كل بند هنا يحرس عطلًا لا يكسر بناءً ولا يُرى في jsdom: حركةٌ تتجاهل
 * مفتاح السكون، أو تُحرَّك عند أول رسمٍ فتُزيح التخطيط، أو تُحرِّك خاصية
 * تُعيد التخطيط في كل إطار.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { routeFamily } from "@/components/motion/RouteTransition";

const SRC = readFileSync("src/components/motion/RouteTransition.tsx", "utf8");
const ROOT = readFileSync("src/routes/__root.tsx", "utf8");
/** التعليق يشرح المحظور ويسمّيه — الحارس يفحص الكود وحده. */
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");

/** عقد السكون: بعد التركيب، والغلاف حاضر، والمفتاح ثابتٌ فيه، والمتغيّرات ساكنة. */
function stillContract(code: string): string[] {
  const out: string[] = [];
  if (!/const still = mounted && \(switchedOff \|\| systemReduced === true\);/.test(code))
    out.push("mounted");
  if (/return <>\{children\}<\/>/.test(code)) out.push("wrapper");
  if (!/if \(!still\) setMotionKey\(pathname\);/.test(code)) out.push("key");
  if (!/const variants = still \? STILL_VARIANTS :/.test(code)) out.push("variants");
  return out;
}

describe("تنويع الحركة — لكل عائلة شاشات حركتها", () => {
  it("كل عائلة تُصنَّف بالبادئة فلا تُنسى شاشة جديدة", () => {
    expect(routeFamily("/")).toBe("home");
    expect(routeFamily("/blueprint")).toBe("home");
    expect(routeFamily("/mission-control")).toBe("command");
    expect(routeFamily("/situation-room")).toBe("command");
    // كان هنا `/hcis/directive/SEC-18`؛ حُذفت شاشة الامتثال ومسارها بأمر
    // المالك ٢٠٢٦/٠٨/٠٩، فالعيّنة استُبدلت بشاشة أمنية حيّة — والقاعدة
    // المحروسة (التصنيف بالبادئة) لم تتغيّر.
    expect(routeFamily("/governance")).toBe("security");
    expect(routeFamily("/sec/permits")).toBe("security");
    expect(routeFamily("/agents")).toBe("intelligence");
    expect(routeFamily("/sadeed-analytics")).toBe("intelligence");
    expect(routeFamily("/observability")).toBe("analytics");
    expect(routeFamily("/settings")).toBe("default");
  });

  it("الحركات خمسٌ مختلفة فعلًا لا اسمًا", () => {
    // خمس حالات في `buildVariants` + الافتراضية.
    for (const family of ["command", "security", "intelligence", "analytics", "home"]) {
      expect(CODE, `العائلة ${family} بلا حركة خاصة`).toContain(`case "${family}":`);
    }
  });

  it("لا تصنيف يُخطئ عائلةً بعائلة", () => {
    // `/risk` أمنٌ لا تحليل، و`/rag-search` ذكاءٌ لا أمن.
    expect(routeFamily("/risk")).toBe("security");
    expect(routeFamily("/rag-search")).toBe("intelligence");
  });
});

describe("قيود الأداء والوصول", () => {
  it("لا تُحرَّك خاصية تُعيد التخطيط", () => {
    // `width`/`height`/`top`/`left` تُعيد حساب التخطيط في كل إطار.
    for (const prop of ["width:", "height:", "top:", "left:", "marginTop"]) {
      expect(CODE, `خاصية ${prop} داخل متغيّرات الحركة`).not.toContain(prop);
    }
  });

  it("مفتاح الحركة الواحد يُسكِتها — ويُراقَب لا يُقرأ مرّة", () => {
    // من أطفأ الحركة على صفحة يجدها مطفأة على كل صفحة، وفورًا لا بعد
    // إعادة تحميل — ولذلك مراقبٌ على السمة لا قراءةٌ عند التركيب.
    expect(CODE).toContain("data-nx-motion");
    expect(CODE).toContain("MutationObserver");
    expect(CODE).toContain("useReducedMotion");
    // والسكون يُقرَّر **بعد التركيب** والغلاف لا يغيب (عطل الترطيب #418، ٢٠٢٦/١٠/١٨): الإرجاع
    // المبكّر بالأبناء وحدهم كان يرسم على العميل تحت تقليل الحركة شجرةً غير شجرة الخادم على كل
    // مسار. والمفتاح لا يتقدّم في السكون — فلا خروج ولا انتظار، كما كان الإرجاع المبكّر يضمن.
    expect(stillContract(CODE)).toEqual([]);
  });

  it("المزروع: سكونٌ في أول رسم بإرجاعٍ مبكّر، أو مفتاحٌ يتقدّم في السكون — يُلتقطان (المادة ٣٠)", () => {
    const early = CODE.replace(
      /const still = [^;]+;/,
      "const still = switchedOff || systemReduced;\n  if (still) {\n    return <>{children}</>;\n  }",
    );
    expect(stillContract(early)).toEqual(expect.arrayContaining(["mounted", "wrapper"]));
    const keyed = CODE.replace("if (!still) setMotionKey(pathname);", "setMotionKey(pathname);");
    expect(stillContract(keyed)).toEqual(["key"]);
  });

  it("أول رسم لا يتحرّك (لا وميضة ولا إزاحة تخطيط)", () => {
    expect(CODE).toContain("initial={false}");
  });

  it("الخروج يسبق الدخول ولا يتراكبان", () => {
    expect(CODE).toContain('mode="wait"');
  });

  it("الخروج أقصر من الدخول — الاستجابة قبل السلاسة", () => {
    const enter = Number(CODE.match(/const enter = \{ duration: lowEnd \? [\d.]+ : ([\d.]+)/)![1]);
    const leave = Number(CODE.match(/const leave = \{ duration: lowEnd \? [\d.]+ : ([\d.]+)/)![1]);
    expect(leave).toBeLessThan(enter);
    expect(leave).toBeLessThanOrEqual(0.2);
  });

  it("الاتجاه يتبع لغة الوثيقة لا يُفترض", () => {
    // في العربية يمضي الانتقال في اتجاه القراءة لا عكسه.
    expect(CODE).toMatch(/locale === "ar" \? -1 : 1/);
  });

  it("الأجهزة الضعيفة تُختصر لها المدد", () => {
    expect(CODE).toContain("deviceMemory");
  });

  /**
   * كان هنا شرطٌ بأن تُلغى الضبابة على الأجهزة الضعيفة — أي أنها تبقى على
   * القويّة. صار الشرط أقوى: **لا ضبابة على أي جهاز**، لأن العلّة ليست
   * الكلفة بل الصحّة (انظر الوصف في المكوّن): مرشّحٌ على هذا الغلاف يكسر
   * كل `position: fixed` في النظام.
   */
  it("لا مرشّح في أي عائلة — الغلاف سلفٌ لكل عنصر ثابت", () => {
    expect(CODE).not.toMatch(/filter:\s*"blur/);
    expect(CODE).not.toMatch(/\bfilter:\s*"/);
  });
});

describe("التركيب في الجذر", () => {
  it("يلفّ `Outlet` فيشمل كل شاشة", () => {
    expect(ROOT).toMatch(/<RouteTransition>\s*<Outlet \/>\s*<\/RouteTransition>/);
  });
});

/**
 * الغلاف لا يجوز أن يُنشئ containing block دائمًا.
 *
 * ## العطل الذي أنشأ هذا الحارس
 *
 * كان الغلاف يحمل `willChange: "transform, opacity"` **دائمة** — لا أثناء
 * الحركة وحدها. و`will-change: transform` تُنشئ containing block تمامًا كما
 * يفعل `transform`. ولأن هذا الغلاف يلفّ `<Outlet/>` — أي **كل شاشة** —
 * فقد صار كل عنصر `position: fixed` في النظام ثابتًا بالنسبة إليه لا إلى
 * الشاشة، وارتفاعه ارتفاع المستند. أي: يمشي مع السحب.
 *
 * أوّل ضحاياه فيلم الرئيسية. وبلّغ المالك العطل بعبارة تحدّد زمنه بدقّة:
 * «اجعلها ثابتة كما كانت في أوّل عمل» — كانت ثابتة فعلًا، حتى أُدخل انتقال
 * المسارات فوقها.
 *
 * ## لماذا حارسٌ على المصدر
 *
 * الأثر لا يظهر إلا على متصفّح حقيقي، في صفحة أطول من الشاشة، بعد سحبها.
 * jsdom لا يحسب تخطيطًا ولا يعرف containing blocks. وقياسه الحيّ كان:
 * مع الخاصيّة ٣٩٠×٢٥٠٠ وtop ينتقل إلى −٦٠٠؛ وبدونها ٣٩٠×٨٤٤ وtop يبقى ٠.
 * فالمُلزِم هنا **أنّها لا تُكتب**، وهذا يُقرأ من الملف.
 */
describe("الغلاف لا يكسر `position: fixed` في النظام", () => {
  it("لا `will-change` دائمة على غلاف الانتقال", () => {
    // هذا هو السطر الذي كسر كل خلفية ثابتة. عودته تعيده.
    expect(CODE).not.toMatch(/willChange/);
  });

  it("لا `transform` مكتوبة في النمط الساكن", () => {
    // `transformOrigin` مسموحة — لا تُنشئ containing block. أمّا `transform`
    // نفسها في `style` الثابت فتفعل، وأثرها أثر `will-change` سواءً بسواء.
    const styleProp = CODE.match(/style=\{\{[^}]*\}\}/s)?.[0] ?? "";
    expect(styleProp).toContain("transformOrigin");
    expect(styleProp).not.toMatch(/[^-]\btransform:/);
  });
});
