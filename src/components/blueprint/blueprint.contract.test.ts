/**
 * عقد المُخطَّط التنفيذي.
 *
 * كل بند هنا يحرس قاعدة يسهل خرقها بتعديل يبدو بريئًا ولا يلتقطه tsc ولا
 * eslint: لون يُكتب نهائيًّا فينجو من قلب الوضع، `transform` يمحو إزاحة،
 * صفر يحلّ محلّ غياب. الفحص يقرأ المصدر لأن أثر هذه الأخطاء لا يظهر إلا
 * بعد رسم في متصفح أو بعد قلب الثيم.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(p, "utf8");

const ROSETTE = read("src/components/blueprint/RegionRosette.tsx");
const PANELS = read("src/components/blueprint/InstrumentPanels.tsx");
const PAGE = read("src/routes/-blueprint-page.tsx");
const CSS = read("src/styles.css");

/** طبقة المُخطَّط وحدها من styles.css — لئلا تُقاس قواعد غيرها.
 * الحدّ الأعلى واجب لا ترف: الشريحة كانت مفتوحة النهاية حين كان المُخطَّط
 * آخر طبقة في الملف، فلمّا أُلحقت طبقات الاتجاهات بعده صارت المفتوحة تقيس
 * قواعد غيرها وتُسقط العقد بذنب لم يرتكبه. */
const LAYER_START = CSS.indexOf("المُخطَّط التنفيذي — السطح الهندسي");
const LAYER_END = CSS.indexOf("اتجاه أ — «مركز المهام»", LAYER_START);
const LAYER = CSS.slice(LAYER_START, LAYER_END === -1 ? undefined : LAYER_END);

describe("المُخطَّط — المادة ٣٣: لا لون نهائي خارج طبقة الرموز", () => {
  it("لا لون سداسي مكتوب في أي مكوّن", () => {
    // الاستثناء الوحيد المسموح: مثال في تعليق يشرح محوّل الثلاثي.
    for (const [name, src] of [
      ["RegionRosette", ROSETTE],
      ["InstrumentPanels", PANELS],
      ["blueprint-page", PAGE],
    ] as const) {
      const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      expect(code.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [], `${name} يكتب لونًا نهائيًّا`).toEqual([]);
    }
  });

  it("لهجات المناطق تأتي من regions.ts وحده", () => {
    expect(ROSETTE).toContain('from "@/lib/regions"');
    expect(PAGE).toContain("REGION_ACCENT_HEX");
    // لا اسم منطقة مكتوب نصًّا في الصفحة — الأسماء من المصدر الوحيد.
    expect(PAGE).not.toMatch(/"(الوسطى|الغربية|الشرقية|الجنوبية)"/);
  });

  it("الأسلوب المضمّن يمرّر متغيّرات لا قيمًا نهائية", () => {
    // `style={{ background: "#22D3EE" }}` يعفي حامله من كل قاعدة عامة بصمت.
    for (const src of [ROSETTE, PANELS, PAGE]) {
      for (const inline of src.match(/style=\{\{[^}]*\}\}/g) ?? []) {
        expect(inline, "أسلوب مضمّن يحمل قيمة نهائية").toMatch(/--[a-z-]+/);
      }
    }
  });

  it('لا fill="white" — الرسم يتبع الحبر', () => {
    for (const src of [ROSETTE, PANELS, PAGE]) {
      expect(src).not.toMatch(/fill="white"/);
    }
  });
});

describe("المُخطَّط — المادة ٣٢: الحركة بخصائص مستقلّة", () => {
  it("لا transform: scale/translate في طبقة المُخطَّط", () => {
    // `transform` يمحو أي إزاحة سابقة على العنصر نفسه؛ الخصائص المستقلّة
    // تتركّب معها. وهي قاعدة Remotion نفسها لمن يكتب حركة قابلة للتحرير.
    expect(LAYER).not.toMatch(/transform:\s*(scale|translate)/);
  });

  it("الدخول يستعمل منحنى النظام لا منحنى مرتجلًا", () => {
    expect(LAYER).toContain("var(--nx-ease-out)");
  });

  it("تقليل الحركة يوقفها عند حالتها النهائية لا عند العدم", () => {
    const block = LAYER.slice(LAYER.indexOf("prefers-reduced-motion"));
    expect(block).toContain("animation: none");
    // بغير هذه الثلاثة يبقى العنصر شفافًا أو مزاحًا أو غير مرسوم إلى الأبد.
    expect(block).toContain("opacity: 1");
    expect(block).toContain("translate: none");
    expect(block).toContain("stroke-dashoffset: 0");
  });
});

describe("المُخطَّط — الوضعان يعملان معًا", () => {
  it("للهجات المناطق نسخة فاتحة مقيّدة بالصنف لا بالجذر", () => {
    // `.light .nx-bp-region` نوعيّتها (0,2,0) فتعلو القاعدة العامة (0,1,0)
    // يقينًا. لو كُتبت على `:root` لتساوت النوعيّة وحكم الترتيب وحده.
    expect(LAYER).toMatch(/\.light\s+\.nx-bp-region\s*\{[^}]*--bp-accent-eff/);
    expect(LAYER).toMatch(/\.light\s+\.nx-bp-glyph-on\s*\{/);
  });

  it("الألوان القسرية والشفافية المخفَّضة محسوبتان", () => {
    expect(LAYER).toContain("forced-colors: active");
    expect(LAYER).toContain("prefers-reduced-transparency");
    // في الوضع القسري يُعاد الرسم إلى ألوان النظام بدل أن يختفي.
    expect(LAYER.slice(LAYER.indexOf("forced-colors: active"))).toContain("CanvasText");
  });
});

describe("المُخطَّط — المادة ٢٧: الصدق العددي", () => {
  it("الغياب يُقرأ نصًّا ولا يُستبدل بصفر", () => {
    expect(PAGE).toContain("لم يُقَس");
    expect(PANELS).toContain("notMeasured");
    // لا `?? 0` على أي عدّاد معروض: الصفر قياسٌ، والغياب ليس صفرًا.
    expect(PAGE).not.toMatch(/counters\?\.\w+\s*\?\?\s*0/);
  });

  it("القوس لا يُرسم لمنطقة لم تُقَس", () => {
    expect(ROSETTE).toMatch(/pct\s*!==\s*null\s*&&\s*pct\s*>\s*0\s*&&/);
  });

  it("نسبة الشكل مشتقّة من الرقم المعروض نفسه", () => {
    // لو حُسبت من مصدر ثانٍ لأمكن أن يمتلئ الشكل والرقم يقول «لم يُقَس».
    expect(PAGE).toMatch(/value === null \? null :/);
    expect(PAGE).toContain("gauge(panel.value, panel.ceiling)");
  });
});

describe("المُخطَّط — الوصول", () => {
  it("الرسوم مخفاة عن القارئات لأن أرقامها مكتوبة إلى جوارها", () => {
    expect(ROSETTE).toContain("aria-hidden");
    expect(PANELS.match(/aria-hidden/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  it("أزرار المناطق روابط لمعلومات كل منطقة وتبلغ أرضية اللمس", () => {
    // قرار المالك ٢٠٢٦/٠٨/٠٤: كل منطقة تفتح على معلوماتها في القمرة
    // الموحدة، مع اسم وصول صريح بدل حالة ضغط لم تعد موجودة.
    expect(PAGE).toContain('to="/nx-cockpit"');
    expect(PAGE).toContain("search={{ region: region.id }}");
    expect(PAGE).toMatch(/aria-label=\{ar \? `افتح معلومات /);
    expect(PAGE).toMatch(/nx-bp-region-btn[^"]*min-h-14/);
  });

  it("الحالة النشطة لا تُقال باللون وحده", () => {
    // شارة نصّية تصحب التمييز اللوني — عمى الألوان لا يلغي القراءة.
    expect(PAGE).toMatch(/active && \(/);
    expect(PAGE).toContain('ar ? "الحالية" : "current"');
  });
});

describe("المُخطَّط — الاقتطاع من حزمة الدخول", () => {
  it("ملف المسار لا يصدّر الصفحة", () => {
    // تصديرها من ملف المسار يُبطل اقتطاع الموجّه ويُعيدها إلى حزمة الدخول،
    // وميزانية الأداء تحت السقف بهامش ضيّق.
    const route = read("src/routes/blueprint.tsx");
    expect(route).toContain('from "./-blueprint-page"');
    expect(route).not.toMatch(/export\s+(function|const)\s+BlueprintPage/);
  });
});
