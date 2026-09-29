/**
 * عقد لغة النبض — «ذهابٌ وإياب» على أيقونات النظام وشريط الإعلان السفلي
 * (قرار المالك ٢٠٢٦/٠٨/٠٦).
 *
 * المطلب هنا من النوع الذي لا يكسر شيئًا حين يسقط: احذف `alternate` من
 * إطارٍ واحد فتصير الحركة دورانًا يقفز إلى بدايته، ويمرّ tsc وeslint وكل
 * الاختبارات — ولا يُرى الفرق إلا بعين تراقب الشاشة ثانيةً كاملة. ولذلك
 * يُقرأ الملف نصًّا: هذه الخاصية لا يبلغها اختبارُ عرضٍ في jsdom، فـ
 * jsdom لا يحسب الأنماط المتحركة أصلًا.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const CSS = readFileSync("src/styles.css", "utf8");
const SHELL = readFileSync("src/components/app-shell.tsx", "utf8");
const BLOCK = (selector: string) => {
  const i = CSS.indexOf(selector);
  if (i === -1) return "";
  return CSS.slice(i, CSS.indexOf("\n}", i));
};

describe("لغة الدائرة المشعّة — نبضٌ يمضي ويعود", () => {
  it("كل حركة نابضة في الطبقة `alternate` بمنحنى `ease-in-out`", () => {
    // `alternate` وحدها هي التي تعكس الاتجاه؛ بدونها يقفز الضوء من نهاية
    // المسار إلى أوّله — وهو ما طُلب صراحةً ألّا يكون.
    //
    // **وسقط الضوءان الجوّالان من القائمة بأمر مالكٍ ناسخ ٢٠٢٦/٠٨/٢٠**
    // («إزالة الهايلايت انميشن … من جميع النظام»): `nxOrbRun` و`nxTickerSweep`
    // ضوءان يجوبان المسار — هايلايت بعينه — فأُوقفا. النبض (`Breathe`/`Beat`)
    // ليس هايلايت: لا يجوب، يتنفّس في مكانه، ويبقى على عقد ٢٠٢٦/٠٨/٠٦.
    for (const anim of ["nxOrbBreathe", "nxDecisionBeat"]) {
      const use = CSS.match(new RegExp(`animation:[^;]*${anim}[^;]*;`));
      expect(use, `الحركة ${anim} غير مستعملة`).not.toBeNull();
      expect(use![0], `${anim} بلا alternate — تقفز ولا تعود`).toContain("alternate");
      expect(use![0], `${anim} بلا ease-in-out — تعود بحدّة لا بنَفَس`).toContain("ease-in-out");
    }
    for (const anim of ["nxOrbRun", "nxTickerSweep"]) {
      expect(
        CSS.match(new RegExp(`animation:[^;]*${anim}[^;]*;`)),
        `${anim} عاد يعمل — الهايلايت الجوّال محذوف بأمر المالك ٢٠٢٦/٠٨/٢٠`,
      ).toBeNull();
    }
  });

  it("الضوء الجاري `rotate` مستقلّة لا `transform` (المادة ٣٢)", () => {
    // الإطارات باقية (خاملة) وإن أُوقف تشغيلها — فإن أُعيدت يومًا بأمر
    // جديد وجدت قاعدتها الصحيحة بانتظارها.
    const run = BLOCK("@keyframes nxOrbRun");
    expect(run).toContain("rotate:");
    expect(run).not.toContain("transform:");
  });

  it("اللون يُمرَّر متغيّرًا لا قيمةً نهائية (المادة ٣٤ بند ٣)", () => {
    // أسلوبٌ مضمّن بقيمة نهائية يُعفي حامله من كل قاعدة عامة بصمت.
    //
    // **وسقطت دوائر الشريط النابضة بأمر المالك ٢٠٢٦/٠٩/٢٩** — تصميم لوحة
    // القيادة الجديد أيقوناتٌ خطّية بلا دوائر، فذهبت `--orb-accent` ودورة
    // النبرات من الشريط. ولم تذهب القاعدة: الشريط الجديد يمرّ لون المنطقة
    // متغيّرًا (`--region-tint`) لا قيمةً نهائية، ويُفحص هو الآن. والدوائر
    // نفسها باقية حيث بقيت (`/guide`)، فقواعدها في الطبقة تُفحص أعلاه.
    const SIDEBAR = readFileSync("src/components/nav/SystemSidebar.tsx", "utf8");
    for (const [name, src] of [
      ["app-shell", SHELL],
      ["SystemSidebar", SIDEBAR],
    ] as const) {
      expect(src, `${name}: لونٌ نهائيّ في أسلوبٍ مضمّن`).not.toMatch(
        /style=\{\{\s*(background|color)\w*:\s*["'`]#/,
      );
    }
    expect(SIDEBAR).toContain('["--region-tint" as string]: REGION_ACCENT_HEX[r.id]');
    expect(SIDEBAR).toContain("bg-[color:var(--region-tint)]");
  });
});

describe("الشكل قبل الضوء — الأيقونة تُقرأ (WCAG 2.2 §1.4.11)", () => {
  it("لا خلفية ولا حدّ على الأيقونة نفسها", () => {
    // العطل: `.nx-icon-soft` كانت تُكتب على `<svg>` مباشرةً في الشريط
    // الجانبي وشاشات HCIS، فتُلبِس الرمزَ تدرّجًا أبيض ٩٠٪ وحدًّا ٢px —
    // فيصير كل رمز لطخةً داخل مربّع ولا يُفرَّق «الرئيسية» من «الخريطة».
    // لا tsc ولا lint ولا اختبار يراه؛ رُئي بلقطة ٣× وحدها.
    expect(CSS).toContain(":is(.nx-icon-soft, .nx-icon-pulse, [data-icon-tile]):not(svg)");
    expect(CSS).not.toMatch(/^\.nx-icon-soft,\n\.nx-icon-pulse,\n\[data-icon-tile\] \{/m);
  });

  it("هالة الدائرة حلقةٌ مركزها شفّاف لا قرصًا ممتلئًا", () => {
    // قرصٌ ممتلئ خلف أيقونة ٣٢px يبتلع خطوطها مهما خفّ لونه.
    const halo = BLOCK(":is(.nx-orb, .nx-module-icon)::before");
    expect(halo).toMatch(/radial-gradient\(\s*circle at 50% 50%,\s*transparent/);
  });

  it("توهّج الرمز ضيّق لا يذيب حدّه", () => {
    const glyph = BLOCK(":is(.nx-orb, .nx-module-icon) > svg");
    expect(glyph).toMatch(/drop-shadow\(0 0 [12]px/);
  });
});

describe("مفتاح الحركة الواحد يُسكِت الطبقة كلّها (WCAG 2.2.2)", () => {
  const OFF = CSS.slice(CSS.indexOf('html[data-nx-motion="off"] :is(.nx-orb'));

  it("زر إيقاف الخلفية يوقف الدوائر والشريط معًا", () => {
    // كان الزر يوقف الفيلم وحده فتبقى النبضات تعمل بعد أن يطلب المستخدم
    // السكون صراحةً — وهذا نقضٌ للوعد لا نقصٌ فيه.
    expect(OFF).toContain(".nx-op-ticker::after");
    expect(OFF).toContain(".nx-op-decision::before");
  });

  /**
   * الكتلة التي تحرس قاعدةً بعينها — لا «آخر كتلة في الملف».
   *
   * أول صياغة قرأت الأخيرة، فكسرت حين أُلحقت بالملف كتلةُ ألوانٍ قسرية
   * أحدث تخصّ مبدّل الوضع: الحارس صار يفحص طبقةً أخرى ويمرّ أو يسقط بلا
   * علاقة بما وُضع لأجله. الموضع في ملفٍ يُلحق به الجديد ليس هويّة.
   */
  const blockGuarding = (at: string, rule: string) => {
    for (let i = CSS.lastIndexOf(at); i !== -1; i = CSS.lastIndexOf(at, i - 1)) {
      const end = CSS.indexOf("\n}\n", i);
      const block = CSS.slice(i, end === -1 ? undefined : end);
      if (block.includes(rule)) return block;
    }
    return "";
  };

  it("تفضيل النظام يُسكِتها كذلك", () => {
    const reduced = blockGuarding("@media (prefers-reduced-motion: reduce)", "nx-op-ticker::after");
    expect(reduced, "لا كتلة `prefers-reduced-motion` تحرس الشريط").not.toBe("");
    expect(reduced).toContain("animation: none");
  });

  it("الألوان القسرية تُسقِط الزخرفة ولا تُبقيها بلونٍ مستعار", () => {
    const forced = blockGuarding("@media (forced-colors: active)", ".nx-op-ticker::after");
    expect(forced, "لا كتلة `forced-colors` تحرس الشريط").not.toBe("");
    expect(forced).toContain("display: none");
    expect(forced).toContain("CanvasText");
  });
});

describe("شريط الإعلان السفلي", () => {
  it("خيط الضوء داخل حدود الشريط لا خارجها", () => {
    // الشريط `overflow: hidden`؛ أي إزاحة سالبة تُقصّ فيختفي الخيط كلّه
    // دون أثرٍ في الملف يدلّ على السبب.
    const line = BLOCK(".nx-op-ticker::after");
    expect(line).toContain("inset-block-end: 0");
    expect(line).not.toContain("inset-block-end: -");
  });

  it("نقطة الخطورة تنبض بإيقاعٍ يتبع خطورتها لا بإيقاع واحد", () => {
    expect(BLOCK('.nx-op-decision[data-sev="critical"]::before')).toContain(
      "animation-duration: 0.72s",
    );
    expect(BLOCK('.nx-op-decision[data-sev="high"]::before')).toContain(
      "animation-duration: 0.95s",
    );
  });

  it("«حرج» و«عالٍ» يبقيان أحمر وكهرمانيًّا — لا يُوحَّدان", () => {
    expect(BLOCK('.nx-op-decision[data-sev="critical"]::before')).toContain("--tone-rose");
    expect(BLOCK('.nx-op-decision[data-sev="high"]::before')).toContain("--tone-amber");
  });
});
