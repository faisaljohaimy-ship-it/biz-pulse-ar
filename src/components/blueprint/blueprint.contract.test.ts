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
  it("الخطورة غير المقيسة لا تُمنح براءة — ولا تحذيرًا", () => {
    // العطل الذي أُصلح: `toSeverity` كانت تكتب `score ?? 0` ثم تصنّف، فصفٌّ
    // بلا أولوية **وبلا درجة** يهبط إلى `low` ⇒ نغمة `success` ⇒ دائرة
    // خضراء وكلمة «سليم». حكمُ سلامةٍ مصنوعٌ من صفرٍ ملفَّق — وهو أخطر من
    // رقمٍ خاطئ لأنه يُقرأ طمأنينة.
    //
    // ولا يكفي رفعه إلى `medium`: الكهرماني حكمُ «تحذير»، وهو مصنوعٌ من
    // الغياب نفسه. فالغياب حالةٌ ثالثة تُقال: `unmeasured` بنغمة محايدة.
    const RISK = read("src/lib/exec/risk-board.functions.ts");
    const code = RISK.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
    expect(code, "درجة غائبة تُستبدل بصفر ثم تُصنَّف").not.toMatch(
      /score\s*(?:\?\?|:contentReference)\s*0|typeof score === "number" \? score : 0/,
    );
    expect(code, "الغياب لا يُعاد حالةً صريحة").toMatch(/return "unmeasured"/);

    // والنغمة محايدة لا خضراء ولا كهرمانية — وإلّا عاد الحكم من باب آخر.
    const tone = PAGE.match(/SEVERITY_TONE[^=]*=\s*\{([\s\S]*?)\}/)?.[1] ?? "";
    expect(tone, "لم تُقرأ خريطة النغمات — تغيّر شكلها فبطل الحارس").toContain("unmeasured");
    expect(tone).toMatch(/unmeasured:\s*"default"/);
    // ومعروضةٌ لا مطويّة: عددها خبرٌ عن جودة البيانات.
    expect(PAGE).toMatch(/SEVERITY_ORDER[^=]*=\s*\[[^\]]*"unmeasured"/);
  });

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

  // **حُذف بند «نسبة الشكل مشتقّة من الرقم المعروض»** ٢٠٢٦/٠٨/١١.
  // انتقل مرّتين تبعًا لموضوعه — من لوحات المؤشّرات إلى دائرة نبض المنطقة —
  // ثم حُذفت الدائرة من بطاقات المناطق بأمر المالك، ولم يبقَ **مستهلكٌ واحد**
  // يمرّر `ratio` في المشروع كلّه (`AgentPulseIcon` لا يمرّرها).
  //
  // والقاعدة نفسها **ليست بلا حارس**: هي مكتوبة داخل `PulseGlyph` ومحروسة
  // ببند «القوس لا يُرسم بلا قياس» أدناه — وذلك موضعها الصحيح، إذ تصحّ هناك
  // لكل سطحٍ يستوردها. وإبقاء بندٍ يفحص مستهلكًا لا وجود له يمرّ أخضر على
  // العدم، وهو أسوأ من غيابه.
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
    // كانت الوجهة القمرة الموحّدة (قرار ٢٠٢٦/٠٨/٠٤) حتى حُجبت /nx-cockpit
    // بأمر المالك ٢٠٢٦/٠٨/١٢ — فصارت مظلّة الأمن الصناعي، والاختيار العام
    // (`setRegion`) قبل الانتقال هو ما يفتح الشاشة على منطقة البطاقة.
    expect(PAGE).toContain('to="/sec"');
    expect(PAGE).toContain("search={{ region: region.id }}");
    expect(PAGE).toContain("onClick={() => setRegion(region.id)}");
    expect(PAGE).toMatch(/aria-label=\{ar \? `افتح معلومات /);
    // الصنف صار `.nx-home-region` والأرضية ٨٠px: البطاقة مستطيلة تحمل سطرين
    // وشارة حالة (أمر المالك ٢٠٢٦/٠٨/٠٩)، لا شريطًا بسطر واحد.
    expect(PAGE).toMatch(/nx-home-region[^"]*min-h-20/);
  });

  it("بطاقة المنطقة تحمل مدخلًا دائم الظهور إلى سجل المخاطر الأمنية (REQ-022)", () => {
    // أمر المالك الحرفي (فقرة 846): «حذف سجل المخاطر ووضع سهم في الكاردز
    // يوديه لسجل المخاطر الأمنية». الشقّ الثاني يُحرَس هنا بثلاثة قيود يسهل
    // خرقها بتعديل بريء لا يلتقطه tsc:
    // ① الرابط داخل حلقة بطاقات المناطق لا في موضع آخر من الصفحة.
    // ② لا <a> داخل <a>: البطاقة كلها رابط، فرابط السجل أخٌ له يُفتح بعد
    //    إغلاقه — تعشيشه يُخرج HTML غير صالح يفكّكه المتصفح بصمت.
    // ③ ظاهر دائمًا (قاعدة الجوال): أساسه شفافية 60٪ تشتد، لا إخفاء كامل
    //    يكشفه التمرير — ما يظهر بالتمرير وحده لا وجود له على اللمس.
    const at = PAGE.indexOf('to="/sec/risks"');
    expect(at, "لا رابط إلى سجل المخاطر الأمنية في بطاقات المناطق").toBeGreaterThan(-1);
    expect(at, "الرابط خارج حلقة بطاقات المناطق").toBeGreaterThan(PAGE.indexOf("REGIONS.map"));

    const block = PAGE.slice(at, at + 900);
    expect(block).toMatch(/aria-label=\{\s*ar\s*\?\s*`سجل المخاطر الأمنية — /);
    expect(block).toContain("ChevronLeft");
    expect(block).toContain("سجل المخاطر");
    expect(block, "أرضية اللمس مفقودة").toContain("min-h-11");
    expect(block, "لا حلقة تركيز ظاهرة").toContain("focus-visible:outline");
    expect(block, "السهم فقد ظهوره الدائم").toContain("opacity-60");
    expect(block, "السهم مخفيّ حتى التمرير — يغيب على اللمس").not.toContain("opacity-0");

    // رابط البطاقة (`to="/sec"`) يُغلق قبل أن يُفتح رابط السجل.
    const cardLink = PAGE.indexOf('to="/sec"');
    expect(cardLink, "رابط البطاقة نفسه غير موجود").toBeGreaterThan(-1);
    const cardLinkClose = PAGE.indexOf("</Link>", cardLink);
    expect(cardLinkClose, "رابط السجل معشَّش داخل رابط البطاقة").toBeLessThan(at);
  });

  it("الحالة النشطة لا تُقال باللون وحده", () => {
    // شارة نصّية تصحب التمييز اللوني — عمى الألوان لا يلغي القراءة.
    expect(PAGE).toMatch(/active && \(/);
    expect(PAGE).toContain('ar ? "الحالية" : "current"');
  });

  /**
   * المداخل — WCAG 2.2 §2.4.5، وهو البند الذي سقط فعلًا.
   *
   * الرئيسية خارج القشرة: لا شريط جانبي لها، وشريطها العلوي محذوف بأمر
   * المالك. وقشرة الأعلى المثبَّتة تحمل مبدّل الوضع وحده هنا (٢٠٢٦/٠٩/١١)
   * — تفضيلٌ لا مدخلَ تنقّل. فلا يبقى مدخلًا إلا ما تكتبه الصفحة نفسها. والعطل الذي
   * يحرسه هذا البند ليس «صفر روابط» — كانت اثني عشر — بل أن **كلّها**
   * كانت إمّا إلى أسطح خارج القشرة (`/nx-*`) أو مشروطةً ببيانات (بطاقات
   * الشذوذ تنطوي حين لا انحراف). فالحارس على الطبقة **غير المشروطة**.
   */
  it("مدخل الرئيسية الباقي مرساةٌ فعليّة لا سطحٌ صامت", () => {
    // **لم تبقَ للرئيسية إلا طبقة مداخل واحدة.** سقطت الطبقتان الأخريان
    // بأمرَي المالك في يومين: «لوحة المؤشرات التنفيذية» (٢٠٢٦/٠٨/١٠) ثم
    // «مداخل النظام» في التذييل (٢٠٢٦/٠٨/١١) — وهذه كانت الوحيدة التي **لا
    // تسقط ببيانات**. فالبند لم يعد يفحص «تعدّد الطرق» من هذه الصفحة، إذ لا
    // تعدّد فيها؛ ويُسجَّل ذلك ولا يُداوى بإضافةٍ لم تُطلَب.
    //
    // وما بقي يُحرَس: الطريق الوحيد **مرساةٌ** (`<Link>`) لا `<div onClick>`.
    // والفرق ليس تجميليًّا: غير المرساة لا يبلغها التبويب ولا قارئ الشاشة،
    // فيصير الطريق الوحيد بلا وجود لمن لا يستعمل فأرة.
    const regionAt = PAGE.indexOf("nx-home-region flex");
    expect(regionAt, "بطاقة المنطقة غير موجودة — لم يبقَ مدخل").toBeGreaterThan(-1);
    expect(
      PAGE.slice(Math.max(0, regionAt - 700), regionAt),
      "بطاقة المنطقة لم تعد رابطًا — سقط آخر مدخل",
    ).toContain("<Link");
    // ولا مدخل مبنيّ على عنصر غير تفاعلي في الصفحة كلّها.
    expect(PAGE).not.toMatch(/<div[^>]*onClick=/);
  });

  it("كل رابط على الصفحة يبلغ أرضية اللمس وله حلقة تركيز ظاهرة", () => {
    // الضامن الحقيقي أن المداخل مراسٍ لا أن صنفًا يفرض ارتفاعًا: طبقة
    // الأرضيات تعطي كل `a[href]` ٤٤px على المؤشّر الخشن و٤٠px على الدقيق،
    // وهما أرضيتا `ui-audit` نفسها، والقاعدتان خارج الطبقات فتعلوان أدوات
    // Tailwind.
    expect(CSS).toMatch(/@media \(pointer: coarse\)[\s\S]{0,300}?min-block-size:\s*44px/);
    expect(CSS).toMatch(/@media \(pointer: fine\)[\s\S]{0,200}?min-block-size:\s*40px/);

    // والرقاقات — إن وُجدت — تحمل الأرضية صراحةً كذلك: حزامٌ فوق حمّالة.
    // (كانت ثمانيَ رقاقة تذييل + رقاقة سجلّ المخاطر؛ ثم حُذفت الأخيرة مع
    // لوحة «سجل المخاطر» بأمر المالك V4 — فقرة 846 — ٢٠٢٦/٠٨/٢٤، فلم تبقَ
    // على الصفحة رقاقة. شرطُ العدد أُسقط لزوال موضوعه لا تخفيفًا: الحلقة
    // باقية تُلزم أول رقاقة تعود، والأرضية غير المشروطة تحرسها قاعدتا
    // المؤشّر أعلاه وأرضية سهم REQ-022 (`min-h-11`) في بنده.
    const chips = [...PAGE.matchAll(/className="nx-bp-card inline-flex ([^"]*)"/g)].map(
      (m) => m[1],
    );
    for (const cls of chips) {
      expect(cls).toContain("min-h-[44px]");
      expect(cls).toContain("focus-visible:outline");
    }
    expect(PAGE).not.toContain("focus:outline-none");
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
    // **ولم تعد الرئيسية مستهلكًا**: حُذفت دوائر بطاقات الوكلاء ٢٠٢٦/٠٨/٠٩
    // ودوائر المناطق ٢٠٢٦/٠٨/١١، كلاهما بأمر المالك. فالقاعدة تُفحص على
    // المستهلكين الباقين — والمقصود بها ألّا تُنسَخ الدائرة يدويًّا في سطحٍ
    // جديد بدل استيراد المصدر.
    const consumers = ["src/components/digital-humans/AgentPulseIcon.tsx"];
    for (const f of consumers) {
      expect(read(f), `${f} لا يستورد مصدر الرسم`).toContain("@/components/pulse/PulseGlyph");
    }
  });

  it("القوس لا يُرسم بلا قياس (المادة ٢٧)", () => {
    // دائرة تنبض ⇐ «حيّة». قوس مرسوم ⇐ «قِيست وبلغت كذا». قوسٌ كامل مكان
    // الغياب أسوأ من صفرٍ مكانه: يُقرأ اكتمالًا لم يحدث.
    // القاعدة **داخل المكوّن** لا في مستهلكيه: هناك تُكتب مرّة وتصحّ لكل
    // سطحٍ يستوردها. (وكان البند يفحص مستهلكًا على الرئيسية، فسقط بحذفه —
    // وموضعُه الصحيح هو المصدر.)
    expect(PULSE).toMatch(/const measured = ratio !== null/);
    expect(PULSE).toMatch(/\{measured && \(/);
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
    // إيقاع واحد على عدّة عناصر = وميض متزامن يقرأه المستخدم إنذارًا.
    //
    // **انقلب هذا البند ثلاث مرّات**، وكلّها لأن حامله كان يُحذف: أرقامٌ
    // مصرَّحة في ثلاث لوحات مؤشّرات، ثم إيقاعٌ مشتقٌّ من ترتيب بطاقات
    // المناطق (`0.86 + i * 0.11`)، وقد حُذفت الدوائر منها ٢٠٢٦/٠٨/١١ بأمر
    // المالك. والحامل الباقي `BEAT_SECONDS` في أيقونة الوكيل: خريطةُ حالات،
    // فالإيقاع يتبع **الحالة** لا الترتيب.
    //
    // والقاعدة لم تتغيّر: حالتان متجاورتان لا تخفقان معًا. وهنا `thinking`
    // و`searching` تتعمّدان التساوي (حالتان لا تظهران معًا)، فالشرط أن
    // **يبقى في الخريطة تفاوتٌ حقيقي** لا أن تتساوى كلّها عند رقم واحد.
    const icon = read("src/components/digital-humans/AgentPulseIcon.tsx");
    const at = icon.indexOf("const BEAT_SECONDS");
    expect(at, "خريطة الإيقاعات غير موجودة — تغيّر شكلها فبطل الحارس").toBeGreaterThan(-1);
    const beats = [...icon.slice(at, icon.indexOf("};", at)).matchAll(/:\s*([\d.]+)/g)].map((m) =>
      Number(m[1]),
    );
    expect(beats.length, "لا إيقاع مقروء").toBeGreaterThan(2);
    expect(new Set(beats).size, `كل الحالات على إيقاع واحد: ${beats.join(" · ")}`).toBeGreaterThan(
      1,
    );
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

  it("ترتيب DOM هو ترتيب العرض: المناطق ← سَدِيد ← توصياته", () => {
    // العمود واحد دون `lg`، فالتكديس هو ترتيب DOM نفسه. لو رُتّبت الأعمدة
    // بـ`order` لانقلب الترتيب على الجوال بلا أن يسقط شيء.
    //
    // **والترتيب نفسه هو موضع الأمر:** «سَدِيد في المنتصف، وتوصياته على
    // يسار بطاقته» (المالك ٢٠٢٦/٠٨/١٠). وفي `rtl` الأسبق في DOM يُرسم
    // أيمن — فوقوع التوصيات **بعد** المساعد هو معنى «يساره»، لا تفصيلًا
    // تقنيًّا. ولو انعكس السطران لانقلب الجانبان بلا أن يسقط tsc ولا
    // eslint ولا أيّ فحصٍ آخر.
    //
    // وخرج من السلسلة حاملان: «كشف الشذوذ» بتعديل المالك عبر Lovable،
    // و«تحليلات الاستخدام» بأمره — وغيابهما يحرسه البند التالي صراحةً.
    const regions = PAGE.indexOf("nx-home-region");
    const stage = PAGE.indexOf("<SadeedStagePresence");
    const advisories = PAGE.indexOf('id="nx-rec-heading"');
    for (const [name, at] of [
      ["بطاقات المناطق", regions],
      ["SadeedStagePresence", stage],
      ["توصيات سَدِيد", advisories],
    ] as const) {
      expect(at, `${name} غير مركَّب على الرئيسية`).toBeGreaterThan(-1);
    }
    expect(regions, "المناطق ليست أيمن الثلاثة").toBeLessThan(stage);
    expect(stage, "التوصيات يمين المساعد لا يساره").toBeLessThan(advisories);
    // والتوصيات **داخل** الصدر الثلاثي لا قسمًا مستقلًّا تحته: خروجها منه
    // يُعيدها شريطًا عرضيًّا ويترك العمود الأيسر فارغًا بلا أن يسقط شيء.
    const triad = PAGE.indexOf('className="nx-home-triad');
    const triadEnd = PAGE.indexOf("\n        </section>", triad);
    expect(triad, "الصدر الثلاثي غير موجود").toBeGreaterThan(-1);
    expect(advisories, "التوصيات خارج الصدر الثلاثي").toBeLessThan(triadEnd);
    expect(PAGE, "أداة `order-*` تفصل ترتيب العرض عن ترتيب DOM").not.toMatch(
      /(?:^|[\s"'`])(?:sm:|md:|lg:)?order-\d/m,
    );
  });

  it("الشذوذ ولوحات المؤشّرات الثلاث محذوفة من الرئيسية بلا تركة", () => {
    // أمر المالك ٢٠٢٦/٠٨/١٠: حذف أيقونة وبطاقات كشف الشذوذ وبطاقة الوكلاء
    // النشطين من الصفحة الرئيسية. والحذف يُحرَس كما تُحرَس الإضافة: استيرادٌ
    // باقٍ أو تركيبٌ باقٍ يعيدان السطح بأول لصقٍ لاحق — وقد عاد فعلًا مرةً
    // بعد دمجٍ على `main` لم يُلحِظ الحذف.
    // القياس على الكود **منزوعَ التعليقات**: توثيقُ الحذف نفسه يذكر الاسمين،
    // فمطابقة النصّ الخام تُسقط الحارس على شرحٍ لا على سطح.
    const code = PAGE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    expect(code).not.toContain("SadeedAnomalyStrip");
    expect(code, "عادت تحليلات الاستخدام إلى الرئيسية").not.toContain("SadeedUsageAnalytics");
    // اللوحات الثلاث: «الوكلاء النشطون» ثم «بانتظار الاعتماد» و«منجز اليوم».
    // ومعها `InstrumentPanel` نفسه — مكوّنٌ مستورَدٌ بلا مستهلك يُعاد تركيبه
    // لأنه «موجود».
    expect(code).not.toMatch(/agents_active|الوكلاء النشطون/);
    expect(code).not.toMatch(/proposals_pending|بانتظار الاعتماد/);
    expect(code).not.toMatch(/done_today|منجز اليوم/);
    expect(code).not.toContain("InstrumentPanel");
    // الحذف حذفُ عرضٍ من الرئيسية لا إلغاءُ سطح: المكوّنان يبقيان حيَّين في
    // صفحة تحليلات سَدِيد، وعدّاد الوكلاء في `/nx-ops` و`/nx-flow`.
    expect(read("src/routes/_authenticated/sadeed-analytics.tsx")).toContain("<SadeedAnomalyStrip");
  });

  it("المخاطر على الرئيسية بطاقةٌ واحدة بسهم — لا لوحة ولا بطاقات مجمّعة (V5)", () => {
    // الشقّ الأول (أمر المالك V4 · فقرة 846): الجدول التفصيلي وترويسته وزرّ
    // «افتح سجل المخاطر الكامل» وسطر المخاطر بلا إسناد — محذوفة بلا تركة.
    // الشقّ الثاني (**جولة V5** · مراجعة العميل): حُذفت معها البطاقات الأربع
    // «حسب الشدّة» وشبكة «حسب المنطقة»، وحلّ محلّها مدخلٌ واحد إلى
    // `/sec/risks`. القياس على الكود منزوعَ التعليقات: توثيق الحذف يذكر
    // الأسماء، فمطابقة النصّ الخام تُسقط الحارس على شرحٍ لا على سطح.
    const code = PAGE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    expect(code, "عاد زرّ السجل الكامل").not.toContain("افتح سجل المخاطر الكامل");
    expect(code).not.toContain("Open the full risk register");
    expect(code, "عاد رابط /risk من الرئيسية").not.toContain('to="/risk"');
    expect(code, "عاد جدول السجل أو حاويته").not.toMatch(/nx-risk-(table|scroll|ref|title)/);
    expect(code).not.toContain("sortedRiskRows");
    expect(code, "عادت ملاحظة المخاطر بلا إسناد").not.toContain("بلا إسناد لمنطقة في المصدر");
    // البطاقات المجمّعة المحذوفة بلا تركة: لا شبكة ولا العدّادات التي كانت
    // تغذّيها — دالّةٌ باقية بلا مستهلك تُعاد إلى الشاشة لأنها «موجودة».
    expect(code, "عادت بطاقات «حسب الشدّة»").not.toContain("حسب الشدّة");
    expect(code, "عادت شبكة «حسب المنطقة»").not.toContain("حسب المنطقة");
    expect(code).not.toMatch(/nx-risk-(card|region)/);
    expect(code).not.toContain("countBySeverity");
    expect(code).not.toContain("countByRegion");
    // والبديل المعتمد حاضر: بطاقةٌ واحدة تحمل الإجمالي وسهمًا إلى السجل.
    expect(code, "سقط مدخل سجل المخاطر").toContain('to="/sec/risks"');
    expect(code).toContain("riskRows.length");
    // والحذف حذفُ عرضٍ لا إلغاءُ مصدر: التوصيات تقرأ `getRiskBoard` نفسه.
    expect(code).toContain("getRiskBoard");
    expect(code).toContain("recommendations");
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
