/**
 * قشرة الأعلى — حارس العقد، **في فصله الثالث.**
 *
 * ## ثلاثة فصول، وذكرُها هو ما يمنع دورانها
 *
 *   ① **البناء** (٢٠٢٦/٠٨/٢٧ → ٠٨/٣٠): أربعة أزرار تراكمت بأوامر
 *      متتابعة — زوج الهوم/الرجوع مثبّتًا، والجرس والمبدّل مقيَّدَين
 *      بالرئيسية. كل أمرٍ أضاف طبقة: تثبيتًا، ثم إعفاءً من حركة الدخول،
 *      ثم نزعَ توهّج، ثم ترتيبَ طبقات فوق لوحة سَدِيد.
 *   ② **الإزالة** (٢٠٢٦/٠٩/١٠): «أزل … من النظام كاملًا». فسقطت الأربعة،
 *      وانقلب هذا الملفّ حارسَ **غياب**.
 *   ③ **العودة المحدَّدة** (٢٠٢٦/٠٩/١١): «أضف أيقونة زر تغيير الوضعية
 *      ثابتة في أعلى الصفحة الرئيسية + أيقونة الهوم في أعلى صفحات النظام
 *      التي تحتاج إلى زر الهوم + أيقونة الرجوع … جميعها ثابتة».
 *
 * **والفصل الثالث ليس نسخًا للثاني إلى الوراء.** ثلاثة عادت بنطاقات
 * مكتوبة في الأمر، ورابعها — الجرس — **لم يُذكر فلم يعُد**. فالبند الأخير
 * أدناه يحرس ذلك تحديدًا: عودةٌ جزئية يسهل أن تُقرأ لاحقًا «رجّع القشرة»
 * فيعود معها ما لم يُطلب.
 *
 * ## وما تعلّمه الفصل الأول يُحرَس هنا، لا يُعاد اكتشافه
 *
 * الطبقات الأربع التي وُلدت من شكاوى مقيسة — تثبيتٌ لا يتبع حالة DOM،
 * وسكونٌ تامّ للرمز، وطبقةٌ تعلو لوحة سَدِيد، ومنعُ الارتداد المطّاطي —
 * كلُّها شروطٌ هنا. إسقاطُ أيّها يُعيد عطلًا سبق أن قِيس بالبكسل.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HIDDEN_ROUTES } from "@/lib/nav/hidden-routes";
import { resolveChromeSlots } from "./TopChrome";

const root = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
/** المصدر منزوع التعليقات: تعليقٌ يشرح ما أُزيل لا يُقرأ عودةً له. */
const code = (p: string) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const CSS = read("src/styles.css").replace(/\/\*[\s\S]*?\*\//g, "");
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

describe("② التركيب — مثبَّتٌ واحد في الجذر، وبصمةٌ تتبعه", () => {
  it("الجذر يركّبه خارج انتقال المسارات", () => {
    const src = code("src/routes/__root.tsx");
    expect(src, "سقط تركيب قشرة الأعلى").toMatch(/<TopChrome\s*\/>/);
    // داخل `RouteTransition` يتحرّك مع كل انتقال — وهو «المتحرك» الممنوع.
    const pin = src.indexOf("<TopChrome");
    const trans = src.indexOf("<RouteTransition");
    expect(pin).toBeGreaterThan(-1);
    expect(trans).toBeGreaterThan(-1);
    expect(pin, "دخل المثبَّت داخل RouteTransition فصار يتحرك").toBeLessThan(trans);
  });

  it("ولا شرطَ مسارٍ في الجذر — النطاق يملكه المكوّن وحده", () => {
    // بعثرةُ النطاق بين الجذر والمكوّن هي ما أنتجت مبدّلَين متراكبَين
    // على الرئيسية (فارق 8px، قِيس فعلًا).
    const src = code("src/routes/__root.tsx");
    expect(src).not.toMatch(/pathname\s*===\s*"\/"\s*&&\s*<TopChrome/);
    expect(src).not.toMatch(/showUtilityBar/);
  });

  it("والبصمة تقرأ قرار النطاق نفسه لا عرضًا ثابتًا", () => {
    // البصمة تحجز ممرّ الأزرار في صفّ ترويسة الجوال؛ عرضٌ ثابت يترك
    // فراغًا بعرض 52px حين يغيب الرجوع، ويحجب الشعار حين يغيب كلاهما.
    const chrome = code("src/components/nav/TopChrome.tsx");
    expect(chrome).toMatch(/export function TopChromeSpacer/);
    expect(chrome, "البصمة تحسب نطاقها بنفسها فتنفصل عن المثبَّت").toMatch(
      /TopChromeSpacer[\s\S]{0,200}useChromeSlots\(\)/,
    );
    expect(code("src/components/app-shell.tsx")).toMatch(/<TopChromeSpacer\s*\/>/);
  });

  it("والبصمة صمّاء — لا زرَّي «رئيسية» لقارئ الشاشة", () => {
    const chrome = read("src/components/nav/TopChrome.tsx");
    const spacer = chrome.slice(
      chrome.indexOf("export function TopChromeSpacer"),
      chrome.indexOf("export function TopChrome("),
    );
    expect(spacer).toContain('aria-hidden="true"');
    expect(spacer).toContain("invisible pointer-events-none");
    expect(spacer, "البصمة صارت أزرارًا حقيقية — نسخةٌ ثانية تتبادل مع المثبَّت").not.toContain(
      "<button",
    );
  });
});

describe("③ «ثابتة» — الموضع من الرموز وحدها", () => {
  const pinRule = () => {
    const at = CSS.indexOf(".nx-chrome-pin {");
    return CSS.slice(at, CSS.indexOf("}", at) + 1);
  };

  it("مثبَّتٌ بإحداثيات مشتقّة من الرموز لا من حالة DOM", () => {
    const rule = pinRule();
    expect(rule).toMatch(/position:\s*fixed/);
    expect(rule).toMatch(/var\(--nx-header-h\)/);
    expect(rule).toMatch(/var\(--nx-clockbar-h\)/);
    expect(rule).toMatch(/var\(--nx-orb-size\)/);
    // الحدّ السفلي للشريط جزءٌ من ارتفاعه المشغول — إغفاله أزاحه بكسلًا.
    expect(rule).toMatch(/var\(--nx-hairline-w\)/);
  });

  it("ولا `:has()` على إحداثياته أبدًا — مصدر قفزة 68px→272px", () => {
    // الشرط لا يصدق إلا بعد تركيب القشرة (`ssr:false`)، فالإحداثي كان
    // يتبع حالة DOM ويقفز بعد ~٢٫٥ث من كل فتح مباشر.
    // **اللاحقة تدخل النمط عمدًا (`[\w-]*`):** أوّل صياغةٍ لهذا البند
    // بحثت عن `.nx-chrome-pin` متبوعًا بـ`{` وحده، فمرّت من تحتها حقنةُ
    // `body:has(.nexus-sidebar) .nx-chrome-pin--nav` — وهي عين العطل
    // المحروس. أمسكها اختبارُ الحقن لا القراءة.
    //
    // والتمييز موضوعُ المحدِّد لا وجود `:has()` فيه: المنهيّ عنه أن يكون
    // **المثبَّت** موضوعَ محدِّدٍ فيه `:has()` (فيتبع موضعُه حالةَ DOM)،
    // والمسموح عكسه: `body:has(.nx-chrome-pin--nav) .nexus-sidebar` يقرأ
    // المثبَّت ويحرّك غيره.
    expect(CSS, "موضع المثبَّت صار يتبع حالة DOM").not.toMatch(
      /:has\([^)]*\)[^{,]*\.nx-chrome-pin[\w-]*\s*[,{]/,
    );
    expect(pinRule()).not.toMatch(/:has\(/);
  });

  it("ولا يُنشئ كتلة احتواء تُبطل تثبيته", () => {
    // `transform`/`filter`/`perspective` على المثبَّت تكسر `fixed` على
    // أسلافه وتُفرغ الزجاج من محتواه.
    for (const sel of [".nx-chrome-pin {", ".nx-chrome-pin--nav {", ".nx-chrome-pin--pref {"]) {
      const at = CSS.indexOf(sel);
      expect(at, `${sel} مفقود`).toBeGreaterThan(-1);
      const rule = CSS.slice(at, CSS.indexOf("}", at) + 1);
      expect(rule, `${sel} اكتسب تحويلًا`).not.toMatch(/(^|[^-])(transform|perspective|filter):/);
      expect(rule).not.toMatch(/will-change/);
    }
  });

  it("والطرفان على محورٍ أفقيّ واحد — بالمتغيّرات نفسها لا بالتقريب", () => {
    // `top` مشتركة في `.nx-chrome-pin`، فلا يمكن أن يفترقا رأسيًّا أصلًا.
    const nav = CSS.slice(CSS.indexOf(".nx-chrome-pin--nav {"));
    const pref = CSS.slice(CSS.indexOf(".nx-chrome-pin--pref {"));
    expect(nav.slice(0, nav.indexOf("}") + 1), "المثبَّت الملاحي كرّر top بقيمة أخرى").not.toMatch(
      /top:/,
    );
    expect(pref.slice(0, pref.indexOf("}") + 1)).not.toMatch(/top:/);
    expect(nav).toMatch(/inset-inline-start/);
    expect(pref).toMatch(/inset-inline-end/);
  });

  it("والارتداد المطّاطي ممنوع — «سحب الشاشة» يزيح كل مثبَّت على اللمس", () => {
    // السكرول العادي لا يحرّكه (قِيس)، لكن السحب بعد نهاية الصفحة يزيح
    // إطار العرض نفسه فيتحرّك معه كل `position: fixed`.
    expect(CSS).toMatch(/html,\s*body\s*\{[^}]*overscroll-behavior-block:\s*none/);
  });
});

describe("④ يعلو ما يُرسم فوق الصفحة — وإلا زرٌّ يُرسم ولا يُنقر", () => {
  it("طبقته فوق أعلى طبقات لوحة سَدِيد", () => {
    // العطل المقيس على `/assistant`: المثبَّت عند 70 وحاجب اللوحة 105
    // وصندوقها 110 — `elementFromPoint` على مركز الزرّ أعاد الحاجب،
    // و`locator.click` سقط بمهلة 3000ms بينما `dispatchEvent` نجح.
    const at = CSS.indexOf(".nx-chrome-pin {");
    const rule = CSS.slice(at, CSS.indexOf("}", at) + 1);
    const z = Number(/z-index:\s*(\d+)/.exec(rule)?.[1] ?? NaN);
    expect(Number.isFinite(z), "المثبَّت بلا طبقة معلنة").toBe(true);

    const copilot = code("src/components/sadeed-core/SadeedCopilot.tsx");
    const layers = [...copilot.matchAll(/\bz-\[(\d+)\]/g)].map((m) => Number(m[1]));
    expect(layers.length, "لم تُقرأ طبقات اللوحة — تبدّلت صيغتها").toBeGreaterThan(0);
    const highest = Math.max(...layers);
    expect(z, `المثبَّت ${z} تحت طبقة اللوحة ${highest} — الزرّ يُرسم ولا يُنقر`).toBeGreaterThan(
      highest,
    );
  });
});

describe("⑤ الرمز ساكن — ثلاث قواعد هولو تفرض عليه التوهّج بـ!important", () => {
  const quiet = () => {
    const at = CSS.indexOf(".nx-chrome-btn.nx-chrome-btn > svg");
    return at === -1 ? "" : CSS.slice(at, CSS.indexOf("}", at) + 1);
  };

  it("قاعدة التسكين قائمة وتغلب الهولو بـ!important", () => {
    // `button > svg` في طبقة الهولو (‏4235 · 4394 · 4504) تفرض
    // `drop-shadow` مزدوجًا و`hx-halo-breathe` لانهائية بـ`!important`.
    // وقاعدةٌ بـ`!important` لا يغلبها إلا `!important` أعلى نوعيةً.
    const rule = quiet();
    expect(rule, "سقطت قاعدة تسكين رمز قشرة الأعلى").not.toBe("");
    expect(rule, "التوهّج يعود بلا !important").toMatch(/filter:\s*none\s*!important/);
    expect(rule, "النبضة تعود بلا !important").toMatch(/animation:\s*none\s*!important/);
    // والتكبير عند التمرير (`button:hover svg { transform: scale(1.04) }`).
    expect(rule).toMatch(/transform:\s*none\s*!important/);
  });

  it("والنوعية مضاعفة نصًّا لا اعتمادًا على ترتيب الاستيراد", () => {
    expect(quiet()).toMatch(/\.nx-chrome-btn\.nx-chrome-btn/);
  });

  it("ولا حركة دخول عليه — لا «يظهر وينهض» بعد كل تحميل", () => {
    // `nx-ico-rise` تلبس `.nx-orb`/`.nx-module-icon` (icon-motion.css)
    // بحالةٍ أولى opacity:0 + scale:0.92 + translate 4px — قِيس نهوضًا
    // 5.76px على الجرس حين ورثها. والقشرة لا تلبس الصنفين أصلًا، فالإعفاء
    // بنيويٌّ لا بقاعدةٍ تُنسى: هذا البند يحرس بقاءه كذلك.
    const chrome = code("src/components/nav/TopChrome.tsx");
    expect(chrome, "قشرة الأعلى لبست nx-orb فورثت حركة النهوض").not.toMatch(
      /className="[^"]*\bnx-orb\b/,
    );
  });
});

describe("⑥ الشكل — قرصٌ واحد بهدف لمسٍ مقبول ومن طبقة الرموز", () => {
  const btnRule = () => {
    const at = CSS.indexOf(".nx-chrome-btn {");
    return CSS.slice(at, CSS.indexOf("}", at) + 1);
  };

  it("‏44×44 — أدنى هدف لمس مقبول (WCAG 2.5.8) ومقاس المدار المجاور", () => {
    const rule = btnRule();
    // من الرمز نفسه الذي يقيس `NexusOrb`: زرٌّ بمقاسٍ آخر يُقرأ صفًّا ثانيًا.
    expect(rule).toMatch(/inline-size:\s*var\(--nx-orb-size\)/);
    expect(rule).toMatch(/block-size:\s*var\(--nx-orb-size\)/);
    expect(CSS).toMatch(/--nx-orb-size:\s*2\.75rem/);
  });

  it("ودائريّ لا مربّعًا مستديرًا — وإلّا خرجت حلقته عن حدّه", () => {
    expect(btnRule()).toMatch(/border-radius:\s*999px/);
  });

  it("وسطحه من طبقة الرموز فينقلب مع الوضعين بلا قاعدةٍ ثانية", () => {
    // المادة ٣٣: لا لون خارج طبقة الرموز. وقيمةٌ نهائية هنا تعني زرًّا
    // يبقى داكنًا في الوضع الفاتح.
    const rule = btnRule();
    expect(rule).toMatch(/var\(--hairline\)/);
    expect(rule).toMatch(/var\(--chip\)/);
    expect(rule).toMatch(/var\(--ink-2\)/);
    expect(rule, "لونٌ نهائي مكتوب في سطح القشرة").not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it("وأيقونتا المبدّل تتبعان صنف الجذر لا حالة React — فلا وميضة", () => {
    // الحالة تبدأ داكنة دائمًا لتطابق الخادم؛ الرسم منها يُظهر أيقونة
    // الوضع الخطأ حتى يكتمل الترطيب لمن اختار الفاتح.
    expect(CSS).toContain(".dark .nx-chrome-ico--moon");
    expect(CSS).toContain(".light .nx-chrome-ico--sun");
  });

  it("وله حالة تركيزٍ ظاهرة — لا زرٌّ يُبلغ بلوحة المفاتيح بلا أثر", () => {
    expect(CSS).toMatch(/\.nx-chrome-btn:focus-visible\s*\{[^}]*outline:/);
  });
});

describe("⑦ ما لم يُطلب لم يعُد — الجرس", () => {
  it("لا ملفّ شريط أدوات ولا جرس في أي سطح", () => {
    // الأمر عدّ ثلاثة ولم يعدّ الجرس. وعودةٌ جزئية يسهل أن تُقرأ لاحقًا
    // «رجّع القشرة» فيعود معها ما لم يُطلب — وهذا البند يمنعها.
    expect(existsSync(join(root, "src/components/nav/TopUtilityBar.tsx"))).toBe(false);
    for (const p of [
      "src/components/nav/TopChrome.tsx",
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
