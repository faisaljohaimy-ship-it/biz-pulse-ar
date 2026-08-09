/**
 * عقد المُخطَّط التنفيذي.
 *
 * كل بند هنا يحرس قاعدة يسهل خرقها بتعديل يبدو بريئًا ولا يلتقطه tsc ولا
 * eslint: لون يُكتب نهائيًّا فينجو من قلب الوضع، `transform` يمحو إزاحة،
 * صفر يحلّ محلّ غياب. الفحص يقرأ المصدر لأن أثر هذه الأخطاء لا يظهر إلا
 * بعد رسم في متصفح أو بعد قلب الثيم.
 */
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(p, "utf8");

const PANELS = read("src/components/blueprint/InstrumentPanels.tsx");
const PAGE = read("src/routes/-blueprint-page.tsx");
const PULSE = read("src/components/pulse/PulseGlyph.tsx");
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
      ["InstrumentPanels", PANELS],
      ["blueprint-page", PAGE],
    ] as const) {
      const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      expect(code.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [], `${name} يكتب لونًا نهائيًّا`).toEqual([]);
    }
  });

  it("لهجات المناطق تأتي من regions.ts وحده", () => {
    // كان الشطر الأول على `RegionRosette` — حُذفت ٢٠٢٦/٠٨/٠٩ بأمر المالك،
    // والقاعدة انتقلت إلى حاملها الجديد: بطاقات المناطق في الصفحة نفسها.
    expect(PAGE).toContain('from "@/lib/regions"');
    expect(PAGE).toContain("REGION_ACCENT_HEX");
    // لا اسم منطقة مكتوب نصًّا في الصفحة — الأسماء من المصدر الوحيد.
    expect(PAGE).not.toMatch(/"(الوسطى|الغربية|الشرقية|الجنوبية)"/);
  });

  it("الأسلوب المضمّن يمرّر متغيّرات لا قيمًا نهائية", () => {
    // `style={{ background: "#22D3EE" }}` يعفي حامله من كل قاعدة عامة بصمت.
    for (const src of [PANELS, PAGE]) {
      for (const inline of src.match(/style=\{\{[^}]*\}\}/g) ?? []) {
        expect(inline, "أسلوب مضمّن يحمل قيمة نهائية").toMatch(/--[a-z-]+/);
      }
    }
  });

  it("لا تعبئة بيضاء نهائية (white / #fff / #ffffff) — الرسم يتبع الحبر", () => {
    // النمط الحرفي `fill="white"` وحده كان يترك الصيغ السداسية تفلت.
    for (const src of [PANELS, PAGE]) {
      expect(src).not.toMatch(/fill=["'](?:white|#f{3}|#f{6})["']/i);
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
    // الالتقاط على **قاعدة الوسائط** لا على ذكر اسمها: أول ورودٍ للسلسلة في
    // الطبقة هو تعليقٌ في ترويستها، فالقطع عنده كان يُدخل نصَّ التعليقات في
    // المقيس — ويمرّ الشرط بكلمةٍ مكتوبة في شرحٍ لا بقاعدةٍ نافذة.
    // **وانقلب البند ثانيةً في اليوم نفسه.** كان يشترط وجود الكتلة مطلقًا،
    // ثم حُذف الشفق وخيطه وحزمتاه — آخرُ حركةٍ تلقائية في الطبقة — فصار
    // يشترط علاجًا لداءٍ زال، وسقط على غيابه. فيُفحص **الشرط لا السطر**: ما
    // دامت في الطبقة حركةٌ تلقائية مسمّاة وجب لها مخرج، ولا حركة ⇐ لا مخرج
    // مطلوبًا ولا كتلة فارغة تبقى إغراءً بإضافةٍ بلا مراجعة. وهو غير فارغ
    // المعنى: إعادة أيّ `animation: nxBp…` بلا كتلة تُسكِتها تُسقطه.
    const code = LAYER.replace(/\/\*[\s\S]*?\*\//g, "");
    const automatic = [...code.matchAll(/animation:\s*([A-Za-z][\w-]*)/g)]
      .map((m) => m[1])
      .filter((n) => n !== "none");
    const at = code.indexOf("@media (prefers-reduced-motion");
    if (automatic.length === 0) {
      expect(at, "كتلة تخفيف حركة بلا حركة تُسكِّنها").toBe(-1);
      return;
    }
    expect(at, `حركة تلقائية (${[...new Set(automatic)].join(", ")}) بلا مخرج`).toBeGreaterThan(-1);
    const block = code.slice(at);
    expect(block).toContain("animation: none");
    // **سقط من هذا البند ثلاثة شروط ٢٠٢٦/٠٨/٠٩، لا تخفيفًا بل لزوال موضوعها.**
    // كانت `opacity: 1` و`translate: none` و`stroke-dashoffset: 0` إنقاذًا
    // لقوس وردة المناطق: رسمٌ يبدأ شفافًا مزاحًا بـ`dashoffset` كامل، فإلغاء
    // حركته بلا إنقاذ يتركه غير مرسوم إلى الأبد. حُذفت الوردة بأمر المالك،
    // ولم يبقَ في الطبقة عنصرٌ تبدأ حالتُه الأولى من العدم — الشفق والخيط
    // والحزمتان كلّها مرئية قبل حركتها وبعدها، فتسكينها يكفي.
    // ويبقى الشرط الحيّ الوحيد أعلاه: حركةٌ دائمة بلا تسكين خرقٌ وصولي.
    expect(block).not.toContain("stroke-dashoffset");
  });

  it("بطاقات الرئيسية ساكنة: لا دخول متدرّج ولا طفو دائم (قرار المالك ٢٠٢٦/٠٨/٠٩)", () => {
    // الحارس على الإسناد لا على الاسم: ذكر `nxBpRise` في تعليق يشرح الإزالة
    // مسموح، وإعادته إلى `animation` هي العودة الممنوعة.
    expect(LAYER).not.toMatch(/animation:\s*nxBp(Rise|Float)\b/);
    expect(LAYER).not.toMatch(/@keyframes\s+nxBp(Rise|Float)\b/);
    // ولا لمعةَ عابرة دائمة على البطاقة نفسها — الطبقة الحاملة أُزيلت أصلًا.
    // المحدِّد يُقاس في أول سطره لا في أي موضع: ذِكره داخل تعليق ليس عودةً له.
    expect(LAYER).not.toMatch(/^\s*\.nx-bp-card::before/m);
    // والسكون لا يبلغ التغذية الراجعة: انتقال المقياس عند التمرير والضغط
    // استجابةٌ للمستخدم، وحذفه ضررٌ وصولي لا تحسين.
    const float = LAYER.slice(LAYER.indexOf(".nx-bp-float {"));
    expect(float.slice(0, float.indexOf("\n}"))).toContain("transition: scale");
    expect(LAYER).toContain(".nx-bp-float:hover");
    expect(LAYER).toContain(".nx-bp-float:active");
  });
});

describe("المُخطَّط — الوضعان يعملان معًا", () => {
  it("للهجات المناطق نسخة فاتحة مقيّدة بالصنف لا بالجذر", () => {
    // `.light .nx-home-region` نوعيّتها (0,2,0) فتعلو القاعدة العامة (0,1,0)
    // يقينًا. لو كُتبت على `:root` لتساوت النوعيّة وحكم الترتيب وحده.
    // (كانت على `.nx-bp-region` — مجموعة المنطقة داخل الوردة المحذوفة
    // ٢٠٢٦/٠٨/٠٩ — والقاعدة نفسها انتقلت إلى شعيرة البطاقة المستطيلة التي
    // ورثت حمل اللكنة، فلم يُفرَّغ الحارس بل تبع موضوعه.)
    expect(LAYER).toMatch(/\.light\s+\.nx-home-region\s*\{[^}]*--bp-accent-eff/);
    // أيقونات اللوحات والمناطق صارت دوائر نبض (٢٠٢٦/٠٨/٠٦)، وطبقتها في
    // آخر الملف لا داخل طبقة المُخطَّط — فيُفحص المصدر كلّه لا الشريحة.
    // نفس الدرس المسجَّل هنا لرسوم المُخطَّط: اللكنة تُمزج نحو الحبر على
    // الأبيض وإلا صارت حاضرة غير مقروءة.
    expect(CSS).toMatch(/\.light\s+\.nx-pulse-icon\s*\{[^}]*--pulse-ink/);
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

  it("حالة المنطقة تُقرأ من الخادم ولا تُشتقّ من رقم الامتثال", () => {
    // كان هنا حارسٌ على قوس الوردة («لا يُرسم لمنطقة لم تُقَس»). ذهبت
    // الوردة ٢٠٢٦/٠٨/٠٩، والقاعدة التي كان يخدمها — لا شكلَ لغياب — انتقلت
    // إلى بطاقات المناطق: قوس دائرة النبض محروس أدناه، والحالة النصّية
    // محروسة هنا.
    //
    // والخطر الجديد أن تُشتقّ الحالة من `compliance_pct` بعتبات مؤلَّفة
    // («فوق ٩٠ سليم») فتُعرض حكمًا كأنه قياس. المصدر الوحيد المسموح هو
    // `severity` القادم من الخادم، وغيابُ الصفّ يُقرأ «لم يُقَس» لا «سليم».
    expect(PAGE).toContain("REGION_SEVERITY_TONE");
    expect(PAGE).toMatch(/if \(!row\) return \{ tone: STAT_TONES\.default, label: notMeasured \}/);
    expect(PAGE).not.toMatch(/compliance_pct\s*[><]=?\s*\d+\s*\?\s*"/);
  });

  it("«منجز اليوم» لا يُختلق له صفر في المسار الحيّ", () => {
    // العطل: لا عمود في القاعدة يحمل عدد المنجز للوكيل، فكُتب `done_today: 0`
    // لكل وكيل ثم جُمعت الأصفار — فعُرض «0» قياسًا لم يقع، ورسم له قوسُ
    // الدائرة الجديد. الجمع صار عبر `sumMeasured`: لا قياس ⇐ null.
    const FN = read("src/lib/exec/command-center.functions.ts");
    expect(FN).not.toMatch(/done_today:\s*0\b/);
    expect(FN).toContain("sumMeasured");
    expect(FN).not.toMatch(/done_today:\s*agents\.reduce/);
  });

  it("نسبة الشكل مشتقّة من الرقم المعروض نفسه", () => {
    // لو حُسبت من مصدر ثانٍ لأمكن أن يمتلئ الشكل والرقم يقول «لم يُقَس».
    expect(PAGE).toMatch(/value === null \? null :/);
    expect(PAGE).toContain("gauge(panel.value, panel.ceiling)");
  });
});

describe("المُخطَّط — الوصول", () => {
  it("الرسوم مخفاة عن القارئات لأن أرقامها مكتوبة إلى جوارها", () => {
    expect(PANELS).toContain("aria-hidden");
    // دائرة النبض تُخفي نفسها ما لم تُعطَ وصفًا، ولا موضع على الرئيسية
    // يعطيها وصفًا — لأن الرقم والاسم إلى جوارها يقولان ما تقوله. العدّ
    // السابق لعلامات aria-hidden كان يقيس كم رسمًا في الملف لا أن كلًّا
    // منها مخفيّ، فسقط بحذف الرسوم الهندسية وهي لم تكن الضمانة.
    expect(PULSE).toMatch(/"aria-hidden": true/);
    for (const src of [PANELS, PAGE]) {
      expect(src).not.toMatch(/<PulseGlyph[^>]*\slabel=/);
    }
  });

  it("بطاقات المناطق روابط لمعلومات كل منطقة وتبلغ أرضية اللمس", () => {
    // قرار المالك ٢٠٢٦/٠٨/٠٤: كل منطقة تفتح على معلوماتها في القمرة
    // الموحدة، مع اسم وصول صريح بدل حالة ضغط لم تعد موجودة.
    expect(PAGE).toContain('to="/nx-cockpit"');
    expect(PAGE).toContain("search={{ region: region.id }}");
    expect(PAGE).toMatch(/aria-label=\{ar \? `افتح معلومات /);
    // الصنف صار `.nx-home-region` والأرضية ٨٠px: البطاقة مستطيلة تحمل سطرين
    // وشارة حالة (أمر المالك ٢٠٢٦/٠٨/٠٩)، لا شريطًا بسطر واحد.
    expect(PAGE).toMatch(/nx-home-region[^"]*min-h-20/);
  });

  it("الحالة النشطة لا تُقال باللون وحده", () => {
    // شارة نصّية تصحب التمييز اللوني — عمى الألوان لا يلغي القراءة.
    expect(PAGE).toMatch(/active && \(/);
    expect(PAGE).toContain('ar ? "الحالية" : "current"');
  });
});

/**
 * أيقونات الرئيسية — دوائر نبض (قرار المالك ٢٠٢٦/٠٨/٠٦).
 *
 * البنود هنا تحرس ما يسهل خسرانه في أول تعديل جمالي لاحق: أن القوس قياسٌ
 * لا زينة، وأن حالة الوكيل تُقرأ بلا لون، وأن للحركة الدائمة مفتاحًا.
 */
describe("المُخطَّط — أيقونات الرئيسية دوائر نبض", () => {
  it("كل أيقونة تأتي من مصدر الرسم الواحد", () => {
    // مصدر واحد لسطحين: الرئيسية ومركز القيادة. نسختان من نفس الشكل تعني
    // أن أول تعديل على إحداهما يفتح فجوة لا يراها أحد.
    expect(PANELS).toContain("PulseGlyph");
    // كانت الرئيسية تحمل رسمين: دوائر المناطق ودوائر بطاقات الوكلاء. أُزيلت
    // بطاقات «الوكلاء على المناوبة» ٢٠٢٦/٠٨/٠٩ بقرار المالك، فبقي مستهلك
    // واحد — والبند يحرس أن يبقى مستهلكًا للمصدر الواحد لا نسخةً منه.
    expect((PAGE.match(/<PulseGlyph/g) ?? []).length).toBeGreaterThanOrEqual(1);
    expect(read("src/components/digital-humans/AgentPulseIcon.tsx")).toContain(
      "@/components/pulse/PulseGlyph",
    );
  });

  it("القوس لا يُرسم بلا قياس (المادة ٢٧)", () => {
    // دائرة تنبض ⇐ «حيّة». قوس مرسوم ⇐ «قِيست وبلغت كذا». قوسٌ كامل مكان
    // الغياب أسوأ من صفرٍ مكانه: يُقرأ اكتمالًا لم يحدث.
    expect(PULSE).toMatch(/const measured = ratio !== null/);
    expect(PULSE).toMatch(/\{measured && \(/);
    expect(PAGE).toMatch(/ratio=\{pct === undefined \? null : pct \/ 100\}/);
  });

  it("حالة الوكيل تُقال بالشكل لا باللون وحده", () => {
    // كان الحارس على بطاقات «الوكلاء على المناوبة» في الرئيسية، وقد أُزيلت
    // ٢٠٢٦/٠٨/٠٩ بقرار المالك. القاعدة نفسها لم تُنسخ: هي مطبَّقة في مستهلك
    // الرسم الباقي — أيقونة الوكيل في مركز القيادة — فانتقل الحارس إليه بدل
    // أن يُفرَّغ. الحلقة المتقطّعة تقول ما لا يقوله اللون وحده (WCAG 1.4.1).
    expect(read("src/components/digital-humans/AgentPulseIcon.tsx")).toMatch(
      /dashedRing=\{state === "error"\}/,
    );
  });

  it("الإيقاعات متفاوتة فلا تخفق الأيقونات دفعةً واحدة", () => {
    // إيقاع واحد على أحد عشر عنصرًا = وميض متزامن يقرأه المستخدم إنذارًا.
    const beats = new Set(PAGE.match(/beatSeconds: [\d.]+/g) ?? []);
    expect(beats.size).toBeGreaterThanOrEqual(3);
    expect(PAGE).toContain("0.86 + i * 0.11");
  });

  it("النبض ذهابٌ وإياب — الضوء والهالة على إيقاع واحد", () => {
    // قرار المالك ٢٠٢٦/٠٨/٠٦. `alternate` وحدها لا تكفي: بغير `ease-in-out`
    // يرتدّ الضوء عند الطرف ارتدادًا حادًّا بدل أن يهدأ ويعود، وبغير توحيد
    // المنحنى والمدّة بين الطبقتين تُقرأ حركتان متجاورتان لا حركة واحدة.
    for (const name of ["nxPulseRun", "nxPulseHalo"]) {
      expect(CSS, `${name} لا تذهب وتعود`).toMatch(
        new RegExp(`animation: ${name} var\\(--pulse-beat[^;]*ease-in-out infinite alternate`),
      );
    }
    // ومع `alternate` تكون الإطارات طرفين لا ثلاثة: إطارٌ أخيرٌ مساوٍ
    // للأول يُنتج دورةً مزدوجة الطول نصفها ساكن.
    const halo = CSS.slice(CSS.indexOf("@keyframes nxPulseHalo"));
    expect(halo.slice(0, halo.indexOf("\n}"))).not.toContain("100%");
  });

  it("للحركة الدائمة الباقية مخرجٌ حيّ (WCAG 2.2.2)", () => {
    // **انقلب هذا الحارس بقرار المالك ٢٠٢٦/٠٨/٠٩.** كان يشترط زرّ إيقاف
    // الخلفية (`data-nx-motion` من `HoloVideoEngine`) مفتاحًا واحدًا يُسكِت
    // الصفحة كلّها. ثم أُمر بخلفية ساكنة داكنة وبحذف الزر، فذهب الفيلم
    // وذهب معه كاتبُ الراية — وبقي الحارس يطلب سطرًا نُقض قصدًا.
    //
    // والقاعدة التي وُجد لأجلها لم تسقط: **حركة دائمة بلا مخرج** خرقٌ
    // وصولي. فما زالت نبضات الأيقونات تعمل بلا توقّف، ومخرجها اليوم هو
    // تفضيل النظام. فيُفحص المخرج حيث صار، لا حيث كان.
    // **الكتلة بعينها لا بقيّة الملف.** في `styles.css` أربعون كتلة
    // `prefers-reduced-motion`؛ فقراءة ما بعد أولها تلتقط نبضةً تُسكَت في
    // كتلةٍ أخرى بعيدة، ويمرّ الفحص حتى لو نُزعت النبضة من كتلتها. جُرّب
    // ذلك فعلًا: نزعُ `.nx-pulse-halo` من كتلتها لم يُسقط الصيغة السابقة —
    // فأُعيدت بمطابقة أقواس تقرأ كل كتلة على حدة.
    const blocks: string[] = [];
    const OPEN = "@media (prefers-reduced-motion: reduce)";
    for (let i = CSS.indexOf(OPEN); i > -1; i = CSS.indexOf(OPEN, i + 1)) {
      let depth = 0;
      for (let j = CSS.indexOf("{", i); j < CSS.length; j++) {
        if (CSS[j] === "{") depth++;
        else if (CSS[j] === "}" && --depth === 0) {
          blocks.push(CSS.slice(i, j + 1));
          break;
        }
      }
    }
    expect(blocks.length, "لا كتلة تخفيف حركة أصلًا").toBeGreaterThan(0);
    // كتلةٌ واحدة على الأقل تُسكِت نبضة الهالة صراحةً داخل حدودها.
    const silenced = blocks.some((b) => /\.nx-pulse-halo[^{}]*\{[^{}]*animation:\s*none/.test(b));
    expect(silenced, "نبضة الهالة الدائمة بلا مخرج في أي كتلة تخفيف").toBe(true);
    // والسمة تبقى سطح تحكّم عاملًا لمن يكتبها برمجيًّا (إعدادات المستخدم
    // مثلًا) — القاعدة باقية وإن ذهب زرّها.
    expect(CSS).toContain('html[data-nx-motion="off"] .nx-pulse-spark');
  });

  it("سمة الحالة مُنَمذَجة فلا تصطدم بقاعدة عامة", () => {
    // `[data-state="active"]` قاعدة عامة لمؤشّر التبويب النشط ترسم
    // `box-shadow: inset 0 -2px 0` — وحالة الوكيل اسمها `active` أيضًا،
    // فمرّرها المكوّن أوّل مرة في `data-state` فظهر شريط سماوي تحت كل
    // أيقونة وكيل عامل. الاسم المُنَمذَج يُنهي التصادم من أصله.
    expect(PULSE).toContain("data-pulse-state={dataState}");
    expect(PULSE).not.toMatch(/\sdata-state=/);
    expect(CSS).toContain('.nx-pulse-icon[data-pulse-state="error"]');
    expect(CSS).not.toContain(".nx-pulse-icon[data-state=");
  });

  it("لكنة الأيقونة صريحة لا رمزًا لا يتبع الوضع", () => {
    // قياس حيّ: `var(--tone-cyan)` يعطي القيمة نفسها في الوضعين لأن كتلة
    // `:root, .light, .dark` تفرض درجات الوضع الفاتح على `.dark` أيضًا.
    // فلا يجوز تمرير `--tone-*` لكنةً للأيقونة: باهتة على الكحلي، ولو
    // صُحِّحت للأبيض فوق ذلك لهبطت كل اللكنات إلى ما يقارب الأسود معًا.
    // كان الحارس على ثلاثيّ `AGENT_PULSE_RGB` في بطاقات «الوكلاء على
    // المناوبة»، وقد أُزيلت هي وثلاثيّها ٢٠٢٦/٠٨/٠٩ بقرار المالك. القاعدة
    // أوسع من حاملها: أي لكنة تُمرَّر لدائرة نبض على هذه الصفحة تبقى ممنوعة
    // من رموز `--tone-*`، ولكنات المناطق تأتي قيمًا صريحة من regions.ts.
    expect(PAGE).not.toMatch(/accent=\{`?var\(--tone-/);
    // والعلاج يبقى واحدًا لكل اللكنات — لا استثناء يُفلت أيقونةً منه.
    expect(CSS).not.toContain("nx-pulse-icon--themed");
  });

  it("الوضع القسري يبلغ نسخ .light أيضًا", () => {
    // ثبت بالقياس الحيّ: كتلة forced-colors كانت تفرض لون النظام بنوعيّة
    // (0,1,0)، ونسخ `.light` نوعيّتها (0,2,0) فتعلوها مهما تأخّر ترتيب
    // المصدر — فبقي القوس أزرق في وضعٍ وُضع لإزالة الألوان. الإدراج الصريح
    // هو ما يغلقها، ولا يلتقط سقوطَه tsc ولا lint ولا لقطة شاشة عادية.
    const family = CSS.slice(CSS.indexOf(".nx-pulse-icon {"));
    const forced = family.slice(family.indexOf("forced-colors: active"));
    for (const sel of [".light .nx-pulse-arc", ".light .nx-pulse-spark", ".light .nx-pulse-disc"]) {
      expect(forced, `${sel} خارج كتلة الألوان القسرية`).toContain(sel);
    }
  });
});

/**
 * صدر الرئيسية — ثلاثة أعمدة (أمر المالك ٢٠٢٦/٠٨/٠٩).
 *
 * «اعد الصفحة الرئيسية للنظام بطاقات كما كانت مسبقاً واضف المناطق الاربع
 * فاليمين مستطيلة وسديد فالمنتصف وتحليلات سديد + التنبيهات فاليسار»، وسُئل
 * عن الوردة الدائرية فأجاب «تحذف».
 */
describe("الرئيسية — التخطيط الثلاثي", () => {
  it("الأعمدة منطقية لا فيزيائية، فلا ينقلب الترتيب على الإنجليزية", () => {
    // الصفحة `rtl`: «اليمين» هو `start` و«اليسار» هو `end`. كتابتهما
    // `left`/`right` تثبّت التخطيط على اتجاه واحد فينقلب المعنى في الاتجاه
    // الآخر — والخطأ لا يظهر إلا بعد قلب اللغة، ولا يلتقطه tsc ولا jsdom.
    // القياس على الطبقة **منزوعةَ التعليقات**: شرحُ القاعدة أطول منها، فنافذةٌ
    // بعدد أحرف تقع كلّها داخل التعليق وتُسقط قاعدةً سليمة — أو تُمرّر كلمةً
    // مكتوبة في شرحٍ لا في قاعدة نافذة. كلا الخطأين يقرأه المرء «فحصًا مرّ».
    const code = LAYER.replace(/\/\*[\s\S]*?\*\//g, "");
    const at = code.indexOf(".nx-home-triad {");
    expect(at, "شبكة التخطيط الثلاثي غير معرَّفة").toBeGreaterThan(-1);
    const grid = code.slice(at, at + 400);
    expect(grid).toContain("grid-template-columns");
    expect(grid).not.toMatch(/\b(left|right)\s*:/);
    // بغير `minmax(0, …)` يتمدّد العمود بمحتواه (جدول أو شريط منزلق) فيدفع
    // الصفحة إلى تمرير أفقي على ٣٩٠px — وهو ما يقيسه `ui-audit`.
    expect(grid).toMatch(/minmax\(0,/);
  });

  it("ترتيب DOM هو ترتيب العرض: المناطق ← سَدِيد ← التحليلات والتنبيهات", () => {
    // العمود واحد دون `lg`، فالتكديس هو ترتيب DOM نفسه. لو رُتّبت الأعمدة
    // بـ`order` لانقلب الترتيب على الجوال بلا أن يسقط شيء.
    const regions = PAGE.indexOf("nx-home-region");
    const stage = PAGE.indexOf("<SadeedStagePresence");
    const analytics = PAGE.indexOf("<SadeedUsageAnalytics");
    const anomalies = PAGE.indexOf("<SadeedAnomalyStrip");
    for (const [name, at] of [
      ["بطاقات المناطق", regions],
      ["SadeedStagePresence", stage],
      ["SadeedUsageAnalytics", analytics],
      ["SadeedAnomalyStrip", anomalies],
    ] as const) {
      expect(at, `${name} غير مركَّب على الرئيسية`).toBeGreaterThan(-1);
    }
    expect(regions).toBeLessThan(stage);
    expect(stage).toBeLessThan(analytics);
    expect(analytics).toBeLessThan(anomalies);
    expect(PAGE, "أداة `order-*` تفصل ترتيب العرض عن ترتيب DOM").not.toMatch(
      /(?:^|[\s"'`])(?:sm:|md:|lg:)?order-\d/m,
    );
  });

  it("الوردة وأثر الفرجار محذوفان بلا تركة", () => {
    // الحذف يُحرَس كما تُحرَس الإضافة: مكوّنٌ مُصدَّر بلا مستهلك يُعاد
    // استيراده لأنه «موجود»، وصنفٌ باقٍ في CSS بلا حاملٍ يعود سطحًا حيًّا
    // بأول لصقٍ لاحق.
    expect(existsSync("src/components/blueprint/RegionRosette.tsx")).toBe(false);
    expect(PAGE).not.toContain("RegionRosette");
    for (const sel of [
      ".nx-bp-rosette",
      ".nx-bp-region",
      ".nx-bp-region-btn",
      ".nx-bp-region-name",
      ".nx-bp-track",
      ".nx-bp-spoke",
      ".nx-bp-arc",
      ".nx-bp-arc-tip",
      ".nx-bp-hub",
      ".nx-bp-hub-ring",
      ".nx-bp-art",
      ".nx-bp-halo",
      ".nx-bp-orbit",
      ".nx-bp-sadeed-halo",
      ".nx-bp-sadeed-btn",
      ".nx-bp-compass",
      // وطبقة الفن التالية لها في الأمر نفسه (٢٠٢٦/٠٨/٠٩): الشفق المخروطي
      // وخيطه وحزمتا الضوء. أربع هالات تدور خلف السطح كانت تُقرأ بوصلةً
      // ثانية بعد حذف الأولى.
      ".nx-bp-aurora",
      ".nx-bp-ribbon",
      ".nx-bp-beam",
    ]) {
      expect(CSS.indexOf(`${sel} {`), `${sel} بقي في الأنماط بلا حامل`).toBe(-1);
    }
    // والإطارات معها: قاعدةٌ ذهبت وإطارها باقٍ تركةٌ تُغري بإعادتها.
    for (const kf of ["nxBpAurora", "nxBpRibbon", "nxBpBeam"]) {
      expect(CSS.indexOf(`@keyframes ${kf}`), `${kf} بقي بلا مستهلك`).toBe(-1);
    }
    // ولا حاملَ في الترميز: الصنف يعود سطحًا حيًّا بأول لصق.
    for (const cls of ["nx-bp-aurora", "nx-bp-ribbon", "nx-bp-beam", "nx-bp-compass"]) {
      expect(PAGE, `${cls} عاد إلى الصفحة`).not.toMatch(
        new RegExp(`className=["'\`][^"'\`]*\\b${cls}\\b`),
      );
    }
    // و«عبارتها» في الأمر نفسه: وصف الميتا كان يقول «على بوصلة واحدة …
    // والامتثال مقروءًا طولَ قوس» — يصف سطحًا لم يعد موجودًا.
    for (const route of ["src/routes/blueprint.tsx", "src/routes/index.tsx"]) {
      expect(read(route)).not.toContain("بوصلة");
    }
  });

  it("`nxBpSpin` باقٍ: مستهلكه خارج طبقة المُخطَّط", () => {
    // درسٌ من هذه الجلسة: الإطار كان يُشغّل هالة الوردة، وله مستهلك ثانٍ
    // في هالة قلب المسرح. حذفه مع حامله الأول يوقف حركةً حيّة في سطحٍ آخر
    // بلا أن يسقط بناءٌ ولا فحص — فالإطار المفقود لا يُخطئ، يُهمَل بصمت.
    expect(CSS).toContain("@keyframes nxBpSpin");
    expect(CSS).toMatch(/animation: nxBpSpin \d+s linear infinite;/);
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

describe("المُخطَّط — أرضيّتا القراءة واللمس", () => {
  /**
   * سقط رابط المسرح في فحص الإنتاج (`scripts/ui-audit.mjs`)، وقيس محليًّا في
   * متصفح حقيقي على ٣٧٥ و٣٩٠ و٧٦٨ و١٤٤٠ و١٩٢٠ قبل التصحيح: ١٤٦×٣٤.
   *
   * (كان هنا بندٌ ثانٍ يحرس لافتات العدّادات عند ١٢px — سقطت معها لأن شريط
   * `.nx-bp-counter` نفسه حُذف بقرار المالك ٢٠٢٦/٠٨/٠٩. البند أدناه يحرس
   * الحذف نفسه: أرضيةُ قراءةٍ لسطحٍ غير موجود حراسةٌ لفراغ.)
   *
   * الفحص هنا على النصّ لا على التخطيط — jsdom لا يقيس شيئًا من هذا،
   * وميدانُ القياس الحقيقي هو `ui-audit`. قيمته أنه يمنع العودة الصامتة
   * بين تشغيلين للفحص الميداني، لا أنه يُغني عنه.
   */
  const rule = (selector: string) => {
    const at = CSS.indexOf(`${selector} {`);
    expect(at, `القاعدة ${selector} غير موجودة`).toBeGreaterThan(-1);
    return CSS.slice(at, CSS.indexOf("\n}", at));
  };

  it("رابط المسرح ≥ ٤٤px — أرضية الإبهام والمؤشّر معًا", () => {
    const h = rule(".nx-bp-more").match(/min-block-size:\s*([\d.]+)px/);
    expect(h, "لا ارتفاع أدنى مصرَّح").not.toBeNull();
    expect(Number(h![1])).toBeGreaterThanOrEqual(44);
  });

  it("الفحص الميداني يقيس نصّ SVG بمقياس رسمه لا بوحدات viewBox", () => {
    // وردة المناطق viewBox 260 تُرسم في 343–430px، فـ 10.5px مصرَّحة تظهر
    // 13.85–17.37px. قراءة المصرَّح وحده كانت تُسقط أربع لافتات سليمة في كل
    // مقاس — وتُخفي في المقابل نصًّا صغيرًا حقيقيًّا داخل SVG مصغَّر.
    const audit = read("scripts/ui-audit.mjs");
    expect(audit).toContain("getScreenCTM");
    expect(audit).toMatch(/parseFloat\(cs\.fontSize\) \* scale/);
  });

  it("شريط العدّادات ومسطرة الوحدة محذوفان بلا تركة (قرار المالك ٢٠٢٦/٠٨/٠٩)", () => {
    // الحذف يُحرَس كما تُحرَس الإضافة: صنفٌ باقٍ في CSS بلا حاملٍ في الترميز
    // يعود سطحًا حيًّا بأول لصقٍ لاحق، ومكوّنٌ مُصدَّر بلا مستهلك يُعاد
    // استيراده لأنه «موجود». الأرقام نفسها تبقى في لوحات `.nx-bp-panel`.
    expect(PAGE).not.toContain("nx-bp-counters");
    expect(PAGE).not.toContain("nx-bp-counter");
    expect(PAGE).not.toContain("MeasureRail");
    expect(PANELS).not.toMatch(/export\s+function\s+MeasureRail/);
    for (const sel of [".nx-bp-counters", ".nx-bp-counter", ".nx-bp-rail"]) {
      expect(CSS.indexOf(`${sel} {`), `${sel} بقي في الأنماط بلا حامل`).toBe(-1);
    }
  });
});
