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

describe("تنويع الحركة — لكل عائلة شاشات حركتها", () => {
  it("كل عائلة تُصنَّف بالبادئة فلا تُنسى شاشة جديدة", () => {
    expect(routeFamily("/")).toBe("home");
    expect(routeFamily("/blueprint")).toBe("home");
    expect(routeFamily("/mission-control")).toBe("command");
    expect(routeFamily("/situation-room")).toBe("command");
    expect(routeFamily("/hcis/directive/SEC-18")).toBe("security");
    expect(routeFamily("/sec/permits")).toBe("security");
    expect(routeFamily("/agents")).toBe("intelligence");
    expect(routeFamily("/finn-analytics")).toBe("intelligence");
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
    // وحين يُطلب السكون لا يبقى AnimatePresence: حضوره وحده يؤخّر التركيب.
    expect(CODE).toMatch(/if \(still\) \{\s*return <>\{children\}<\/>;/);
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

  it("الأجهزة الضعيفة تُختصر لها المدد وتُلغى الضبابة", () => {
    expect(CODE).toContain("deviceMemory");
    expect(CODE).toMatch(/lowEnd \? "blur\(0px\)"/);
  });
});

describe("التركيب في الجذر", () => {
  it("يلفّ `Outlet` فيشمل كل شاشة", () => {
    expect(ROOT).toMatch(/<RouteTransition>\s*<Outlet \/>\s*<\/RouteTransition>/);
  });
});
