/**
 * زر الرجوع لا يغادر النظام — حارس انحدار.
 *
 * العطل المُبلَّغ (٢٠٢٦/٠٨/٠٦): «تعود الصفحة إلى الشكل القديم». لم يكن ارتدادًا
 * في البناء — كان الزر ينفّذ `window.history.back()` بشرط
 * `window.history.length > 1`، وهذا الطول يَعُدّ **تاريخ التبويب كله** لا تاريخ
 * التطبيق. فأي صفحة سبق أن فتحها المستخدم في التبويب نفسه — بما فيها نسخة
 * قديمة من الموقع — تبقى مُدخلة صالحة، ويعيدها المتصفح من ذاكرة التنقّل
 * (bfcache) بهيئتها القديمة كاملةً.
 *
 * لماذا حارسٌ على المصدر لا اختبار سلوك: الفرق بين الشرطين لا يظهر في تصيير
 * المكوّن ولا في نقرة واحدة — يظهر فقط في تبويب له تاريخ سابق، وهو ما لا
 * يُنشأ في jsdom. المُلزِم هنا هو **أي الاثنين كُتب**.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const SRC = readFileSync("src/components/layout/GlobalBackButton.tsx", "utf8");
/** التعليق يشرح العطل ويذكر السطر القديم — الحارس يفحص الكود وحده. */
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");

describe("GlobalBackButton — الرجوع محبوس داخل مكدّس التطبيق", () => {
  it("actually read the component", () => {
    // حارس صامت يمرّ إلى الأبد. لو انتقل الملف تفشل هذه أولًا وتقول السبب.
    expect(SRC).toContain("export function GlobalBackButton");
  });

  it("يبنيَ القرار على مكدّس المسيّر لا على طول تاريخ التبويب", () => {
    expect(SRC).toContain("useCanGoBack");
    expect(SRC).toMatch(/if \(canGoBack\)/);
  });

  it("لا يفحص window.history.length إطلاقًا", () => {
    // هذا هو السطر الذي سبّب العطل. عودته تعيده.
    expect(CODE).not.toMatch(/history\.length/);
  });

  it("يسقط إلى الرئيسية حين لا يملك التطبيق مُدخلة يرجع إليها", () => {
    expect(SRC).toMatch(/navigate\(\{ to: "\/" \}\)/);
  });
});
