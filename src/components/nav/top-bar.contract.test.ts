/**
 * الشريط العلوي — حارس العقد، **في فصله الرابع.**
 *
 * ## أربعة فصول، وذكرُها هو ما يمنع دورانها
 *
 *   ① **البناء** (٢٠٢٦/٠٨/٢٧ → ٠٨/٣٠): أربعة أزرار تراكمت بأوامر
 *      متتابعة — زوج الهوم/الرجوع مثبّتًا، والجرس والمبدّل مقيَّدَين
 *      بالرئيسية. كل أمرٍ أضاف طبقة: تثبيتًا، ثم إعفاءً من حركة الدخول،
 *      ثم نزعَ توهّج، ثم ترتيبَ طبقات فوق لوحة سَدِيد.
 *   ② **الإزالة** (٢٠٢٦/٠٩/١٠): «أزل … من النظام كاملًا». فسقطت الأربعة،
 *      وانقلب هذا الملفّ حارسَ **غياب**.
 *   ③ **العودة المحدَّدة** (٢٠٢٦/٠٩/١١): ثلاثةٌ عادت بنطاقات مكتوبة في
 *      الأمر، ورابعها — الجرس — **لم يُذكر فلم يعُد**.
 *   ④ **نزولها من الطفو** (٢٠٢٦/٠٩/١٢): «اجعل الأيقونات ثابتة في الخلفية
 *      أو قم بتغييرها واستبدالها بأيقونات ثابتة في أعلى صفحات النظام».
 *
 * ## والفصل الرابع درسٌ في **ما لا تقيسه الأداة**
 *
 * الشكوى تكرّرت ثلاثًا، وقِيست في كل مرّة بـ`getBoundingClientRect`: ٢٦
 * عيّنة من أول إطار، وسكرول برمجيّ، وسحب لمسيّ عشر خطوات بعد نهاية
 * الصفحة. وأعطت الثلاثة حالةً واحدة لا تتبدّل — فالطبقة العائمة كانت
 * **ثابتةً فعلًا**، والقياس صحيحًا والسؤال خطأ.
 *
 * ثم كشفت اللقطة ما لا يظهر في رقم: الأقراص زجاجٌ شفّاف، والشريط تحتها
 * ليس لاصقًا فعلًا (سلفه `overflow-x: hidden` فيصير حاوية السكرول). فبعد
 * أول تمريرة لا يبقى خلفها شيء، ويمرّ عنوان البطاقة **من خلال الزرّ**.
 * الحركة المرئية كانت حركة المحتوى عبر الزرّ لا حركة الزرّ.
 *
 * **فالبند المكتسَب (⑧ أدناه): لا طبقة عائمة أصلًا.** الأزرار أعضاء في
 * صفّ الشريط، والشريط سطحٌ مرسوم يمرّ المحتوى خلفه. وحارسٌ يقيس الإحداثية
 * وحدها كان سيمرّ على هذا العطل ثلاث مرّات — كما مرّ.
 *
 * وما تعلّمه الفصل الأول يبقى محروسًا هنا: سكونُ الرمز أمام ثلاث قواعد
 * هولو، ومنعُ الارتداد المطّاطي، والشكل، والنطاقات الثلاثة.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HIDDEN_ROUTES } from "@/lib/nav/hidden-routes";
import { resolveChromeSlots } from "./TopBar";

const root = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
/** المصدر منزوع التعليقات: تعليقٌ يشرح ما أُزيل لا يُقرأ عودةً له. */
const code = (p: string) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const CSS = read("src/styles.css").replace(/\/\*[\s\S]*?\*\//g, "");
/** جسم قاعدةٍ بمحدِّدها الحرفيّ — أوّل مطابقة. */
const rule = (selector: string) => {
  const at = CSS.indexOf(selector);
  return at === -1 ? "" : CSS.slice(at, CSS.indexOf("}", at) + 1);
};
/** قيمة متغيّرٍ في `:root` بالـrem رقمًا. */
const remVar = (name: string) => {
  const m = new RegExp(`${name}:\\s*([\\d.]+)rem`).exec(CSS);
  return m ? Number(m[1]) : NaN;
};

/** مُسيّرٌ مصطنع: هذه المسارات «موجودة»، وما عداها لا. */
const exists = (p: string) =>
  ["/sec", "/sec/access", "/settings", "/assistant", "/files"].includes(p);
const isHidden = (p: string) => HIDDEN_ROUTES.has(p);
const slots = (path: string) => resolveChromeSlots(path, exists, isHidden);

describe("① النطاقات الثلاثة — كلٌّ بعبارة الأمر لا بتعميم", () => {
  it("المبدّل على الرئيسية وحدها — وبمسارَيها لأنها صفحةٌ واحدة", () => {
    // `/` و`/blueprint` يصيّران `BlueprintPage` نفسه؛ نطاقٌ بالعنوان
    // يُظهره على أحدهما ويُخفيه عن الآخر وهما شاشةٌ واحدة أمام المستخدم.
    expect(slots("/").showTheme).toBe(true);
    expect(slots("/blueprint").showTheme).toBe(true);
    for (const p of ["/sec", "/sec/access", "/files", "/settings"]) {
      expect(slots(p).showTheme, `${p} عرض المبدّل خارج الرئيسية`).toBe(false);
    }
  });

  it("والهوم على كل صفحةٍ ليست الرئيسية — وليس على الرئيسية نفسها", () => {
    // «الصفحات التي تحتاج إلى زر الهوم»: الحاجة مقيسة — لا مدخل للرئيسية
    // في الشريط الجانبي (أمر ٢٠٢٦/٠٨/٢٠)، ولا الشعار رابط، ولوحة الأوامر
    // بلا زرٍّ ظاهر فلا تُفتح باللمس.
    expect(slots("/").showHome).toBe(false);
    expect(slots("/blueprint").showHome).toBe(false);
    for (const p of ["/sec", "/sec/access", "/sec/contractors", "/files"]) {
      expect(slots(p).showHome, `${p} بلا مخرجٍ إلى الرئيسية`).toBe(true);
    }
  });

  it("والرجوع لما له أبٌ يختلف عن الهوم — لا زرَّان بفعلٍ واحد", () => {
    // نهيٌ صريح من المالك (فقرة ١١٧٥): «الرجوع الذي يفعل فعل الهوم تكرارٌ
    // يُكتفى عنه بالهوم». فشاشةُ المستوى الأوّل بلا رجوع، والتفصيلية به.
    expect(slots("/").backTarget).toBeNull();
    expect(slots("/sec").backTarget, "شاشة مستوًى أوّل نالت رجوعًا يكرّر الهوم").toBeNull();
    expect(slots("/sec/contractors").backTarget).toBe("/sec/access");
    expect(slots("/assistant/abc123").backTarget).toBe("/assistant");
  });

  it("ولا يقصد الرجوعُ 404 ولا شاشةً محجوبة", () => {
    // الاشتقاق النصّي وحده يفتح البابين؛ الشرطان يُحقنان من المكوّن.
    expect(slots("/files/unknown-child").backTarget).toBe("/files");
    expect(slots("/sec/nope/deeper").backTarget, "رجوعٌ إلى مسارٍ غير مسجّل").toBeNull();
  });
});

describe("② التركيب — شريطٌ واحد في الجذر، خارج انتقال المسارات", () => {
  it("الجذر يركّبه خارج `RouteTransition`", () => {
    const src = code("src/routes/__root.tsx");
    expect(src, "سقط تركيب الشريط العلوي").toMatch(/<TopBar\b/);
    // داخل `RouteTransition` يتحرّك مع كل انتقال — وهو «المتحرك» الممنوع.
    const bar = src.indexOf("<TopBar");
    const trans = src.indexOf("<RouteTransition");
    expect(bar).toBeGreaterThan(-1);
    expect(trans).toBeGreaterThan(-1);
    expect(bar, "دخل الشريط داخل RouteTransition فصار يتحرك").toBeLessThan(trans);
  });

  it("ولا شرطَ مسارٍ في الجذر — النطاق يملكه المكوّن وحده", () => {
    // بعثرةُ النطاق بين الجذر والمكوّن هي ما أنتجت مبدّلَين متراكبَين
    // على الرئيسية (فارق 8px، قِيس فعلًا).
    const src = code("src/routes/__root.tsx");
    expect(src).not.toMatch(/pathname\s*===\s*"\/"\s*&&\s*<TopBar/);
    expect(src).not.toMatch(/showUtilityBar/);
  });

  it("وشريطٌ واحد لا شريطان متراكبان", () => {
    // كان `HeaderClockBar` شريطًا و`TopChrome` طبقةً فوقه: اثنان في أعلى
    // كل صفحة، أحدهما يمضي مع السكرول والآخر يبقى. الدمج هو الإصلاح،
    // فبقاءُ أيٍّ من الاثنين يُعيد التراكب نفسه.
    expect(existsSync(join(root, "src/components/executive/HeaderClockBar.tsx"))).toBe(false);
    expect(existsSync(join(root, "src/components/nav/TopChrome.tsx"))).toBe(false);
    expect(CSS, "بقيت طبقة الأقراص العائمة في الأنماط").not.toContain(".nx-chrome-pin");
  });

  it("والساعة والأزرار في صفٍّ واحد — مصدرٌ واحد لا مكوّنان", () => {
    const bar = code("src/components/nav/TopBar.tsx");
    expect(bar).toMatch(/<LiveClock\b/);
    expect(bar).toMatch(/nx-topbar-slot/);
  });
});

describe("③ «ثابتة» — شريطٌ مثبَّت بسندٍ يحجز مكانه", () => {
  it("الشريط `fixed` من أعلى الصفحة لا `sticky` يكذب", () => {
    // `sticky` كان يمضي مع الصفحة لأن سلفه (`overflow-x: hidden`) هو
    // حاوية السكرول لا إطار العرض. و`fixed` لا يسأل عن السلف.
    const bar = rule(".nx-topbar {");
    expect(bar, "سقطت قاعدة تثبيت الشريط").not.toBe("");
    expect(bar).toMatch(/position:\s*fixed/);
    expect(bar).toMatch(/top:\s*0/);
    expect(bar).toMatch(/inset-inline:\s*0/);
    expect(code("src/components/nav/TopBar.tsx"), "عاد الشريط لاصقًا").not.toMatch(
      /className="[^"]*\bsticky\b/,
    );
  });

  it("وله سندٌ يحجز ارتفاعه بالرموز الثلاثة نفسها", () => {
    // بغير السند يُغطّى أعلى كل صفحة؛ وبرقمٍ ثانٍ مكتوب يدويًّا يفترق
    // السند عن الشريط يومًا بصمت فينكشف خطٌّ فارغ أو تختفي أول السطور.
    const spacer = rule(".nx-topbar-spacer {");
    expect(spacer, "سقط سند الشريط").not.toBe("");
    expect(spacer).toMatch(/env\(safe-area-inset-top\)/);
    expect(spacer).toMatch(/var\(--nx-clockbar-h\)/);
    expect(spacer).toMatch(/var\(--nx-hairline-w\)/);
    expect(code("src/components/nav/TopBar.tsx")).toMatch(/nx-topbar-spacer/);
    // وارتفاع الصفّ من الرمز نفسه الذي يقرؤه السند.
    expect(rule(".nx-clock-row {")).toMatch(/block-size:\s*var\(--nx-clockbar-h\)/);
  });

  it("ولا `:has()` على إحداثياته — مصدر قفزة 68px→272px سابقًا", () => {
    // الشرط لا يصدق إلا بعد تركيب القشرة (`ssr:false`)، فالإحداثي كان
    // يتبع حالة DOM ويقفز بعد ~٢٫٥ث من كل فتح مباشر.
    expect(CSS, "موضع الشريط صار يتبع حالة DOM").not.toMatch(
      /:has\([^)]*\)[^{,]*\.nx-topbar[\w-]*\s*[,{]/,
    );
    expect(rule(".nx-topbar {")).not.toMatch(/:has\(/);
  });

  it("ولا يُنشئ كتلة احتواء تُبطل تثبيته", () => {
    // `transform`/`filter`/`perspective` على المثبَّت أو سلفه تكسر `fixed`.
    const bar = rule(".nx-topbar {");
    expect(bar, "الشريط اكتسب تحويلًا").not.toMatch(/(^|[^-])(transform|perspective|filter):/);
    expect(bar).not.toMatch(/will-change/);
  });

  it("والارتداد المطّاطي ممنوع — «سحب الشاشة» يزيح كل مثبَّت على اللمس", () => {
    // السكرول العادي لا يحرّكه (قِيس على جهازٍ باللمس بسحبٍ عشر خطوات
    // بعد نهاية الصفحة)، لكن الارتداد يزيح إطار العرض نفسه.
    expect(CSS).toMatch(/html,\s*body\s*\{[^}]*overscroll-behavior-block:\s*none/);
  });
});

describe("④ الطبقات — يعلو القشرة ويبقى دون لوحة سَدِيد", () => {
  const z = () => Number(/z-index:\s*(\d+)/.exec(rule(".nx-topbar {"))?.[1] ?? NaN);

  it("فوق ترويسة الجوال — وإلا اختفى الشريط خلفها", () => {
    const header = /nexus-mobile-header[^"]*\bz-(\d+)\b/.exec(code("src/components/app-shell.tsx"));
    expect(header, "لم تُقرأ طبقة ترويسة الجوال — تبدّلت صيغتها").not.toBeNull();
    expect(z()).toBeGreaterThan(Number(header![1]));
  });

  it("بين حاجب لوحة سَدِيد وصندوقها — والطرفان مقيسان لا مقدَّران", () => {
    // **فوق الحاجب:** `/assistant` تفتح اللوحة بنفسها، فالحاجب قائمٌ
    // دائمًا عليها. قِيس عند الطبقة 50: `elementFromPoint` على مركز زرّ
    // الهوم أعاد الحاجب لا الزرّ — زرٌّ يُرسم ولا يُنقر.
    // **ودون الصندوق:** شريطٌ يعبر الشاشة فوق 110 يقطع رأس اللوحة.
    const layers = [
      ...code("src/components/sadeed-core/SadeedCopilot.tsx").matchAll(/\bz-\[(\d+)\]/g),
    ].map((m) => Number(m[1]));
    expect(layers.length, "لم تُقرأ طبقات اللوحة — تبدّلت صيغتها").toBeGreaterThan(1);
    expect(
      z(),
      `الشريط ${z()} تحت حاجب اللوحة ${Math.min(...layers)} — الزرّ لا يُنقر`,
    ).toBeGreaterThan(Math.min(...layers));
    expect(z(), `الشريط ${z()} يعلو صندوق اللوحة ${Math.max(...layers)} — يقطع رأسها`).toBeLessThan(
      Math.max(...layers),
    );
  });
});

describe("⑤ الرمز ساكن — ثلاث قواعد هولو تفرض عليه التوهّج بـ!important", () => {
  const quiet = () => rule(".nx-chrome-btn.nx-chrome-btn > svg");

  it("قاعدة التسكين قائمة وتغلب الهولو بـ!important", () => {
    // `button > svg` في طبقة الهولو (‏4235 · 4394 · 4504) تفرض
    // `drop-shadow` مزدوجًا و`hx-halo-breathe` لانهائية بـ`!important`.
    // وقاعدةٌ بـ`!important` لا يغلبها إلا `!important` أعلى نوعيةً.
    expect(quiet(), "سقطت قاعدة تسكين رمز الشريط").not.toBe("");
    expect(quiet(), "التوهّج يعود بلا !important").toMatch(/filter:\s*none\s*!important/);
    expect(quiet(), "النبضة تعود بلا !important").toMatch(/animation:\s*none\s*!important/);
    // والتكبير عند التمرير (`button:hover svg { transform: scale(1.04) }`).
    expect(quiet()).toMatch(/transform:\s*none\s*!important/);
  });

  it("والنوعية مضاعفة نصًّا لا اعتمادًا على ترتيب الاستيراد", () => {
    expect(quiet()).toMatch(/\.nx-chrome-btn\.nx-chrome-btn/);
  });

  it("ولا حركة دخول عليه — لا «يظهر وينهض» بعد كل تحميل", () => {
    // `nx-ico-rise` تلبس `.nx-orb`/`.nx-module-icon` (icon-motion.css)
    // بحالةٍ أولى opacity:0 + scale:0.92 + translate 4px — قِيس نهوضًا
    // 5.76px على الجرس حين ورثها. والشريط لا يلبس الصنفين أصلًا، فالإعفاء
    // بنيويٌّ لا بقاعدةٍ تُنسى: هذا البند يحرس بقاءه كذلك.
    expect(code("src/components/nav/TopBar.tsx"), "الشريط لبس nx-orb فورث النهوض").not.toMatch(
      /className="[^"]*\bnx-orb\b/,
    );
  });
});

describe("⑥ الشكل — قرصٌ يسع الصفّ ولا يفيض عنه", () => {
  const btn = () => rule(".nx-chrome-btn {");

  it("القرص أضيق من الصفّ — وإلا قصّه `overflow: hidden` من طرفيه", () => {
    // الشريط `overflow-hidden`، فقرصٌ بارتفاع الصفّ أو أكثر يُقصّ.
    const size = remVar("--nx-chrome-btn-size");
    const row = remVar("--nx-clockbar-h");
    expect(Number.isFinite(size), "قرص الشريط بلا مقاس معلن").toBe(true);
    expect(Number.isFinite(row), "صفّ الشريط بلا ارتفاع معلن").toBe(true);
    expect(size, `القرص ${size}rem يفيض عن صفٍّ ${row}rem`).toBeLessThan(row);
    expect(btn()).toMatch(/inline-size:\s*var\(--nx-chrome-btn-size\)/);
    expect(btn()).toMatch(/block-size:\s*var\(--nx-chrome-btn-size\)/);
  });

  it("وأرضيّته من الرمز نفسه — وإلا كبّرته طبقة الأزرار العامّة بصمت", () => {
    // `min-width/height: 40px` في طبقة الأزرار العامّة تغلب `inline-size`
    // وحدها: قِيس القرص 40 بينما الرمز يقول 36، فقصّ الشريطُ حلقةَ
    // التركيز وصار حساب هذا الحارس يقيس رقمًا لا يراه المتصفّح.
    expect(btn()).toMatch(/min-inline-size:\s*var\(--nx-chrome-btn-size\)/);
    expect(btn()).toMatch(/min-block-size:\s*var\(--nx-chrome-btn-size\)/);
  });

  it("ويبلغ أرضية اللمس التي يفرضها المشروع على نفسه — لا أرضية WCAG وحدها", () => {
    // **درسٌ من عطلٍ بلغ الإنتاج (٢٠٢٦/٠٩/١٣).** كان هذا البند يقيس
    // ‏WCAG 2.5.8 (‏24px) — وهي أدنى مما يفرضه `scripts/ui-audit.mjs`:
    // ‏44px على أجهزة اللمس. فمرّ قرصٌ 40px، ومرّ على المكتب وسقط على
    // الجوال، ولم يُكتشف إلا حين شُغِّل فحص الإنتاج أوّل مرّة فأعطى
    // `target 40×40 (min 44)`.
    //
    // والأرضية تُقرأ من الفاحص نفسه لا تُكتب رقمًا ثانيًا هنا: رقمان
    // لنفس القاعدة يفترقان يومًا، ويسبق الحارسُ الفاحصَ إلى الخطأ.
    const audit = readFileSync("scripts/ui-audit.mjs", "utf8");
    const floor = Number(/MIN_TARGET_TOUCH\s*=\s*(\d+)/.exec(audit)?.[1] ?? NaN);
    expect(Number.isFinite(floor), "لم تُقرأ أرضية اللمس — تبدّلت صيغتها").toBe(true);
    expect(remVar("--nx-chrome-btn-size") * 16).toBeGreaterThanOrEqual(floor);
  });

  it("ودائريّ لا مربّعًا مستديرًا — وإلّا خرجت حلقته عن حدّه", () => {
    expect(btn()).toMatch(/border-radius:\s*999px/);
  });

  it("وسطحه يتبع حبر الشريط — لا لونًا نهائيًّا يبقى داكنًا في الفاتح", () => {
    // المادة ٣٣: لا لون خارج طبقة الرموز. و`.nx-clock-bar *` تفرض حبر
    // الشريط على كل سليل بـ`!important` في الوضعين، فالسطح من
    // `currentColor` ينقلب معه بلا قاعدةٍ ثانية.
    expect(btn()).toMatch(/currentColor/);
    expect(btn(), "لونٌ نهائي مكتوب في سطح الشريط").not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it("وأيقونتا المبدّل تتبعان صنف الجذر لا حالة React — فلا وميضة", () => {
    // الحالة تبدأ داكنة دائمًا لتطابق الخادم؛ الرسم منها يُظهر أيقونة
    // الوضع الخطأ حتى يكتمل الترطيب لمن اختار الفاتح.
    expect(CSS).toContain(".dark .nx-chrome-ico--moon");
    expect(CSS).toContain(".light .nx-chrome-ico--sun");
  });

  it("وله حالة تركيزٍ ظاهرة غير مقصوصة", () => {
    const focus = rule(".nx-chrome-btn:focus-visible {");
    expect(focus).toMatch(/outline:/);
    // الحلقة + إزاحتها يجب أن تبقى داخل الصفّ، وإلا قصّها الشريط.
    const offset = Number(/outline-offset:\s*([\d.]+)px/.exec(focus)?.[1] ?? 0);
    const width = Number(/outline:\s*([\d.]+)px/.exec(focus)?.[1] ?? 0);
    const outer = remVar("--nx-chrome-btn-size") * 16 + 2 * (offset + width);
    expect(outer, "حلقة التركيز تفيض عن الصفّ فتُقصّ").toBeLessThanOrEqual(
      remVar("--nx-clockbar-h") * 16,
    );
  });
});

describe("⑦ ما لم يُطلب لم يعُد — الجرس", () => {
  it("لا ملفّ شريط أدوات ولا جرس في أي سطح", () => {
    // الأمر عدّ ثلاثة ولم يعدّ الجرس. وعودةٌ جزئية يسهل أن تُقرأ لاحقًا
    // «رجّع القشرة» فيعود معها ما لم يُطلب — وهذا البند يمنعها.
    expect(existsSync(join(root, "src/components/nav/TopUtilityBar.tsx"))).toBe(false);
    for (const p of [
      "src/components/nav/TopBar.tsx",
      "src/routes/__root.tsx",
      "src/components/app-shell.tsx",
      "src/components/cockpit/header.tsx",
    ]) {
      const src = code(p);
      expect(src, `${p} أعاد الجرس`).not.toMatch(/<Bell[\s/>]/);
      expect(src, `${p} يستورد Bell`).not.toMatch(/\bBell\b[^"]*from "lucide-react"/);
    }
  });

  it("ولا درج إشعارات في ترويسة القمرة", () => {
    expect(code("src/components/cockpit/header.tsx")).not.toMatch(
      /data-action="notifications\.open"/,
    );
  });
});

describe("⑧ لا طفو — البند الذي وُلد من ثلاث قياساتٍ صحيحة لسؤالٍ خطأ", () => {
  it("الأزرار أعضاء في الصفّ لا طبقةٌ فوقه", () => {
    // الفرق كلّه هنا: عضوٌ في `flex` يأخذ عرضه فيبقى للساعة ما بقي،
    // وطافٍ فوق الصفّ يمرّ المحتوى من خلاله فيُرى متحرّكًا وهو ساكن.
    const slot = rule(".nx-topbar-slot {");
    expect(slot, "سقطت خانة الأزرار في الصفّ").not.toBe("");
    expect(slot).toMatch(/flex:\s*0\s+0\s+auto/);
    expect(slot, "خانة الأزرار عادت تطفو").not.toMatch(/position:\s*(fixed|absolute)/);
  });

  it("وسطح الشريط معتمٌ تمامًا في الوضعين — لا أشباح نصٍّ تحته", () => {
    // شريطٌ بـ0.9 شفافية يمضي مع الصفحة لا يقف عليه شيء؛ أمّا المثبَّت
    // فيمرّ المحتوى خلفه دائمًا، فالعُشر الباقي يُظهر النصّ من تحته —
    // وهو العطل المُبلَّغ نفسه، أخفَّ لا أقلّ.
    for (const sel of ["html .nx-topbar.nx-clock-bar {", "html.light .nx-topbar.nx-clock-bar {"]) {
      const r = rule(sel);
      expect(r, `${sel} مفقودة — عاد السطح شبه شفّاف`).not.toBe("");
      const bg = /background:\s*([^;]+);/.exec(r)?.[1] ?? "";
      expect(bg, `${sel} سطحٌ بشفافية`).toMatch(/^#[0-9a-f]{6}\s*!important$/i);
    }
  });

  it("وخانة الساعة تأخذ الباقي فلا تُقصّ — قرار ٢٠٢٦/٠٨/٠٦", () => {
    // يومها كان الزوج يطفو داخل الشريط فيقصّ التاريخ (المرفق IMG_9412).
    // وعودتهما إلى الصفّ ليست نقضًا: `flex: 1 1 auto` تُبقي للساعة ما بقي.
    expect(rule(".nx-clock-slot {")).toMatch(/flex:\s*1\s+1\s+auto/);
  });

  it("والدرجة المضغوطة رقميّة — «19 Sept 2026» لا تسع عند 375", () => {
    // سقطت هذه على الموقع الحيّ لا في اختبار: فحص الإنتاج على
    // `neexios.com` أعطى «clipped 27px» عند 375 و12 عند 390. والسبب أنّ
    // رفع قرص اللمس 40 ← 44 أخذ من خانة الساعة ثمانية بكسلات — إصلاحٌ في
    // طرف الصفّ كسر قاعدةً في طرفه الآخر.
    //
    // فيُحرَس **الشكل** لا الرقم: `month: "short"` يعطي حروفًا عرضُها
    // يتبع اللغة والخطّ، و`2-digit` يعطي عرضًا ثابتًا مع `tabular-nums`.
    const clock = code("src/components/LiveClock.tsx");
    const short = /const gregDateShortEn[\s\S]*?\}\);/.exec(clock)?.[0] ?? "";
    expect(short, "gregDateShortEn غير موجودة — أُعيدت تسميتها؟").not.toBe("");
    expect(short).toMatch(/month:\s*"2-digit"/);
    expect(short, "الشهر بالحروف لا يسع الخانة عند 375").not.toMatch(/month:\s*"short"/);
    // والسنة تبقى: حذفها يوفّر عرضًا ويُفقد ما لا يُستنتج من شريطٍ علويّ.
    expect(short).toMatch(/year:\s*"numeric"/);
  });

  it("وفجوة الشريحة أضيق دون sm — الصيغة وحدها تركت الفائض صفرًا", () => {
    // الرقمية وحدها أعطت عند 360 بكسل فائضًا **صفرًا بالضبط**، وصفرٌ حدٌّ
    // يقلبه أيّ تقريبٍ أو خطٍّ بديل لا هامشَ نجاح. فالفجوتان معًا شرطُ
    // الصمود، وإسقاط إحداهما يُعيد القصّ بصمت.
    const clock = code("src/components/LiveClock.tsx");
    expect(clock).toMatch(/items-center gap-1 rounded-full/);
    expect(clock).toMatch(/sm:gap-2/);
  });

  it("ولا زرّ خارج الشريط — لا ورثةَ للطبقة العائمة", () => {
    // أي `.nx-chrome-btn` في مكوّنٍ غير الشريط يعني قرصًا يطفو من جديد.
    const bar = "src/components/nav/TopBar.tsx";
    for (const p of ["src/routes/__root.tsx", "src/components/app-shell.tsx"]) {
      expect(code(p), `${p} أعاد قرصًا خارج الشريط`).not.toContain("nx-chrome-btn");
    }
    expect(code(bar)).toContain("nx-chrome-btn");
  });
});
