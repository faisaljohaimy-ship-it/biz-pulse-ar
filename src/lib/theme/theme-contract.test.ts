/**
 * حارس الوضعين — المواد ٣٢·٣٣·٣٤ من الدستور.
 *
 * كل بند هنا يحرس عطلًا وقع فعلًا في هذا المستودع، لا احتمالًا نظريًّا:
 * لم يلتقطه tsc ولا eslint ولا أيٌّ من الألف اختبار القائمة، لأن أثره لا
 * يظهر إلا بعد إعادة رسم في متصفح حقيقي أو بعد قلب الوضع. الاختبار هو
 * الطريقة الوحيدة لمنع عودتها.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ROOT = readFileSync("src/routes/__root.tsx", "utf8");
const CSS = readFileSync("src/styles.css", "utf8");
const THEME = readFileSync("src/lib/theme.tsx", "utf8");

describe("عقد الوضعين — المادة ٣٢: الصنف ذو الكاتبين", () => {
  it("لا يكتب صنف ثيم على <html> في الترميز", () => {
    // العطل الأصلي: <html className="light"> يعيد فرض نفسه عند كل إعادة رسم
    // فيمحو `dark` الذي يضعه المزوّد — فيستحيل تثبيت الوضع الداكن.
    const htmlTag = ROOT.match(/<html[^>]*>/)?.[0] ?? "";
    expect(htmlTag).not.toMatch(/className\s*=\s*["'{][^}"']*\b(light|dark)\b/);
  });

  it("يضع الحالة الأولى بسكربت يسبق أول رسم", () => {
    // بغير هذا السكربت يومض النظام بالوضع الخطأ حتى يكتمل الترطيب.
    expect(ROOT).toMatch(/localStorage\.getItem\(['"]theme['"]\)/);
    expect(ROOT).toMatch(/classList\.add/);
  });

  it("المزوّد وحده يبدّل الصنف في وقت التشغيل", () => {
    expect(THEME).toMatch(/classList\.toggle\(["']dark["']/);
    expect(THEME).toMatch(/classList\.toggle\(["']light["']/);
  });
});

describe("عقد الوضعين — المادة ٣٤: لا لون صريح خارج طبقة الرموز", () => {
  it('لا fill="white" في أي مكوّن أو مسار', async () => {
    // العطل الأصلي: نسبة أداء المنطقة داخل حلقة SVG كانت fill="white" —
    // مقروءة على الكحلي، غائبة تمامًا على الأبيض.
    const { globSync } = await import("node:fs");
    const files = globSync("src/{components,routes}/**/*.tsx");
    const offenders = files.filter((f) => /fill="white"/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("رموز السطح والزجاج معرّفة للوضعين معًا", () => {
    for (const token of [
      "--ink",
      "--surface",
      "--chip",
      "--hairline",
      "--glass-fill",
      "--glass-sheen",
      "--glass-rim",
    ]) {
      // مرّة في الجذر (الداكن) ومرّة تحت .light — رمز يُعرَّف مرة واحدة
      // يعني وضعًا واحدًا يعمل.
      const occurrences = CSS.split(`${token}:`).length - 1;
      expect(occurrences, `${token} معرّف ${occurrences} مرة`).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("عقد الوضعين — الزجاج حالة ساكنة", () => {
  it("البريق مُعرَّف خارج :hover", () => {
    // ما يظهر بالتمرير وحده لا وجود له على الجوال إطلاقًا.
    const staticRule = CSS.match(/\.holo-card,\s*\n\s*\.nexus-card,\s*\n\s*\.nx-glass\s*\{[^}]*\}/);
    expect(staticRule, "قاعدة الزجاج الساكنة مفقودة").not.toBeNull();
    expect(staticRule![0]).toContain("--glass-sheen");
  });

  it("يحترم prefers-reduced-transparency و forced-colors", () => {
    expect(CSS).toContain("prefers-reduced-transparency");
    expect(CSS).toContain("forced-colors: active");
  });
});
