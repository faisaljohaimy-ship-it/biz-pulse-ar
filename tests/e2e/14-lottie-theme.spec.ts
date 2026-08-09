/**
 * ١٤ — طبقة Lottie: تُصيَّر، وتتبع الوضعين، وتُطفأ، وتقف خارج الشاشة.
 *
 * ════════════════════════════════════════════════════════════════════════
 * لماذا هذا الملف موجود أصلًا
 * ════════════════════════════════════════════════════════════════════════
 *
 * أربع دعاوى في `LottieIcon.tsx` **لا يستطيع vitest إثباتها**، لأن كل
 * واحدة منها تُحسم في المتصفّح لا في الشجرة:
 *
 *   ١. أنّ المشغّل صيَّر شجرةً فعلًا — jsdom لا يملك تخطيطًا ولا
 *      `IntersectionObserver` عاملًا، فـ`DOMLoaded` لا يقع.
 *   ٢. أنّ اللون **يتبع الوضعين**. هذه هي الدعوى الحاكمة: bodymovin يخزّن
 *      `"c":{"k":[r,g,b,1]}` قيمةً نهائية، والجواب عليه أنّ القاعدة
 *      المحقونة `fill:currentColor` تغلب سمة العرض بالمرتبة. ولا شيء
 *      يُثبت «تغلب بالمرتبة» إلّا محرّك تتالٍ حقيقي.
 *   ٣. أنّ `data-nx-motion="off"` يطفئها — أي أنّ المشغّل **يُهدَم** لا
 *      يُبطَّأ.
 *   ٤. أنّ الخروج من الشاشة يوقف التشغيل فعلًا. الدعوى الوحيدة التي لا
 *      يقيسها إلّا الزمن: عيّنتان متباعدتان تتطابقان.
 *
 * ════════════════════════════════════════════════════════════════════════
 * كيف يُقاس اللون — ولماذا بهذه الصياغة تحديدًا
 * ════════════════════════════════════════════════════════════════════════
 *
 * `getComputedStyle(node).fill` يعيد اللون **المحلول** (`rgb(…)`) لا
 * الكلمة `currentColor`. فمقارنته بالوضع الآخر وحدها لا تُثبت السبب:
 * قد يتغيّر لأنّ أحدهم أعاد كتابة السمة، وقد لا يتغيّر لأنّ سطح العرض
 * نفسه لا يقلب لونه — والفشلان يُقرآن سواءً.
 *
 * فالفحص هنا ثلاثي على العقدة نفسها:
 *
 *   أ. `fill === color` في كل وضع — هذا **هو** عقد `currentColor`، ويثبت
 *      أنّ القاعدة هي الحاملة لا سمةٌ متجمّدة صادف أن وافقت.
 *   ب. `color` تغيّر بين الوضعين — شرطٌ مسبق على طبقة الرموز نفسها. لو
 *      سقط هذا فالعطل في السطح لا في Lottie، والرسالة تقول ذلك صراحةً.
 *   ج. `fill` تغيّر بين الوضعين — النتيجة المطلوبة.
 *
 * وبانفصال (ب) عن (ج) يصير الفشل تشخيصًا لا إنذارًا.
 *
 * ════════════════════════════════════════════════════════════════════════
 * التشغيل
 * ════════════════════════════════════════════════════════════════════════
 *
 *   npm run build
 *   npx wrangler dev --config .output/server/wrangler.json \
 *       --compatibility-date 2026-08-06 --port 4173 --local
 *
 *   PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173 \
 *   npx playwright test tests/e2e/14-lottie-theme.spec.ts --project=desktop
 *
 * ⚠︎ `--compatibility-date` ليس زينة: بدونه يرفض العامل الإقلاع، فتُقرأ
 *    كل التأكيدات فشلًا في Lottie وهي فشلٌ في تشغيل المعاينة.
 */
import { test, expect, type Locator, type Page } from "@playwright/test";

/**
 * المتصفّح مثبَّت بمساره: `devices["iPhone 13"]` نوعه الافتراضي webkit،
 * وطبقة Lottie تُقاس على كروميوم في الحالين — العرض ٣٩٠ متغيّر تخطيط لا
 * متغيّر محرّك.
 */
const CHROME = process.env.NX_CHROME ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

test.use({ browserName: "chromium", launchOptions: { executablePath: CHROME } });

/** التسمية من `ThemeToggle.tsx` حرفيًّا — لا نصًّا مُعادًا كتابته. */
const THEME_TOGGLE = 'button[aria-label="تبديل الوضع الفاتح/الداكن"]';

/** ثوابت العقد، مطابقة لما يُصدّره `LottieIcon.tsx`. */
const STATE_ATTR = "data-nx-lottie";
const ART_CLASS = "nx-lottie-art";
const STATIC_CLASS = "nx-lottie-static";

/** هامش `IntersectionObserver` في المكوّن. الخروج يجب أن يتجاوزه. */
const ROOT_MARGIN_PX = 96;

type Surface = {
  /** اسم عربي يظهر في تقرير الفشل. */
  name: string;
  url: string;
  /** غلاف `LottieIcon` — يُعرَّف بمحيطه لا بسمة زائدة تُضاف لأجل الفحص. */
  selector: string;
  /** هل يمكن إخراجه من الشاشة بالتمرير؟ الثابت (`fixed`) لا يخرج أبدًا. */
  scrollable: boolean;
};

/**
 * الأسطح المرشّحة. القائمة هي عقد التركيب نفسه: أي سطح يُضاف بلا سطر هنا
 * يمرّ بلا فحصٍ للون — وهو بالضبط الباب الذي دخل منه المنع الأصلي.
 */
/**
 * **الأسطح المقيسة — القائمة تُشتقّ من الواقع لا من النيّة.**
 *
 * كانت هنا ثلاثة محدِّدات (`.nexus-sidebar` · `.sadeed-launcher` ·
 * `.nx-module-icon`) لا وجود لأيٍّ منها في الشجرة: `LottieIcon` مركَّب في
 * `LiveClock` حصرًا. فتخطّى ٣٤ اختبارًا من ٣٦ بصمت، ولم تُفحص الدعوى التي
 * كُتب الملف لأجلها — أن اللون يتبع الوضعين — ولا مرّة واحدة.
 *
 * ومحدِّدٌ لا يطابق شيئًا **يتخطّى**، لا يفشل. وهذا أسوأ من الفشل: يُقرأ
 * تقرير التشغيل أخضرَ بينما لم يُقَس شيء.
 */
const SURFACES: readonly Surface[] = [
  {
    name: "مؤشّر «حيّ» — شريط الساعة",
    url: "/hcis",
    // الشريط لاصق أعلى كل صفحة، فالسطح حاضر بلا تمرير.
    selector: `.nx-clock-bar [${STATE_ATTR}]`,
    scrollable: false,
  },
];

/* ═══════════════════════════════════════════════════════════════════════
   أدوات القياس
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * يفتح الصفحة على وضعٍ معلوم **قبل أول رسم**.
 *
 * الكتابة في `localStorage` قبل التنقّل لا بعده: السكربت السابق للترطيب في
 * `__root.tsx` يقرؤه ويضع الصنف على `<html>`، فلا وميضة ولا سباق مع
 * `ThemeProvider`. والتبديل الحيّ يُفحص بالنقر لا بهذا (انظر `flipTheme`).
 */
async function openAt(page: Page, url: string, theme: "dark" | "light") {
  await page.addInitScript((value) => {
    try {
      window.localStorage.setItem("theme", value as string);
    } catch {
      /* تخزين محظور — يتكفّل `flipTheme` بالباقي. */
    }
  }, theme);
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveClass(new RegExp(`\\b${theme}\\b`));
}

/**
 * يقلب الوضع **بالمسار الحقيقي**: نقرٌ على المبدّل الذي يراه المستخدم.
 * قلبُه بكتابة الصنف مباشرةً كان سيُثبت أنّ CSS تعمل، لا أنّ الطريق إليها
 * موصول.
 */
async function flipTheme(page: Page, to: "dark" | "light") {
  const toggle = page.locator(THEME_TOGGLE).first();
  await expect(toggle, "مبدّل الوضع غير موجود على هذه الشاشة").toBeVisible();
  await toggle.click();
  await expect(page.locator("html")).toHaveClass(new RegExp(`\\b${to}\\b`));
}

/** ينتظر أن يُعلن الغلاف عن نفسه مشتغلًا — لا مجرّد موجود. */
async function waitForPlaying(wrapper: Locator, name: string) {
  await expect(wrapper, `${name}: الغلاف لم يظهر`).toBeAttached({ timeout: 15_000 });
  await expect(
    wrapper,
    `${name}: لم ينتقل إلى "playing" — راجع مسار الملف والتحميل الكسول`,
  ).toHaveAttribute(STATE_ATTR, "playing", { timeout: 15_000 });
}

type Paint = { fill: string | null; stroke: string | null; color: string; count: number };

/**
 * يقرأ الطلاء المحلول من **أوّل عقدة مطليّة** داخل شجرة المشغّل.
 *
 * النطاق `> svg > g` حصرًا — نفس نطاق القاعدة المحقونة. القراءة من خارجه
 * (من `defs` مثلًا) تعطي قيمًا لا تحكمها القاعدة، فتُقرأ عطلًا وهي خارج
 * العقد أصلًا.
 */
async function readPaint(wrapper: Locator, name: string): Promise<Paint> {
  const result = await wrapper.evaluate(
    (host, { artClass }) => {
      const art = host.querySelector(`.${artClass}`);
      const group = art?.querySelector(":scope > svg > g") ?? null;
      if (!group) return null;

      const painted = Array.from(group.querySelectorAll("[fill], [stroke]")).filter((node) => {
        for (const attr of ["fill", "stroke"]) {
          const value = node.getAttribute(attr);
          if (value && value !== "none" && !value.startsWith("url(")) return true;
        }
        return false;
      });
      if (painted.length === 0) return null;

      const node = painted[0];
      const cs = getComputedStyle(node);
      return {
        fill: cs.fill === "none" ? null : cs.fill,
        stroke: cs.stroke === "none" ? null : cs.stroke,
        color: cs.color,
        count: painted.length,
      };
    },
    { artClass: ART_CLASS },
  );

  expect(result, `${name}: لا عقدة مطليّة داخل ".${ART_CLASS} > svg > g"`).not.toBeNull();
  return result as Paint;
}

/**
 * عيّنتان من شجرة المشغّل تفصلهما مدّة.
 *
 * لماذا `innerHTML` لا لقطة شاشة: المشغّل يكتب `transform`/`opacity`/`d`
 * سماتٍ على العقد في كل إطار. فاختلاف النصّ = إطارٌ جديد رُسم، وتطابقه
 * على مدّةٍ تسع عشرات الإطارات = توقّفٌ فعلي. اللقطة تخلط هذا بتغيّرات
 * أخرى على الصفحة، والنصّ لا يخلط.
 */
async function sampleArt(page: Page, wrapper: Locator, ms: number): Promise<[string, string]> {
  const read = () =>
    wrapper.evaluate((host, { artClass }) => host.querySelector(`.${artClass}`)?.innerHTML ?? "", {
      artClass: ART_CLASS,
    });
  const first = await read();
  await page.waitForTimeout(ms);
  const second = await read();
  return [first, second];
}

/* ═══════════════════════════════════════════════════════════════════════
   ① التصيير — شجرة حقيقية داخل الحاوية
   ═══════════════════════════════════════════════════════════════════════ */

for (const surface of SURFACES) {
  test.describe(`Lottie · ${surface.name}`, () => {
    test("تُصيَّر شجرة svg داخل الحاوية، ويبقى الرمز الساكن في الشجرة", async ({ page }) => {
      await openAt(page, surface.url, "dark");
      const wrapper = page.locator(surface.selector).first();

      if ((await page.locator(surface.selector).count()) === 0) {
        test.skip(true, `${surface.name}: غير مركَّب على هذا العرض — لا سطح يُفحص`);
      }

      await waitForPlaying(wrapper, surface.name);

      // شجرة المشغّل موجودة فعلًا.
      const art = wrapper.locator(`.${ART_CLASS} > svg`);
      await expect(art, `${surface.name}: لم يُصيَّر svg داخل .${ART_CLASS}`).toHaveCount(1);

      // والرمز الساكن **لم يُنزع** — هو الأصل، والحركة فوقه. نزعه يعني أنّ
      // أي عطلٍ لاحق يترك فراغًا لا رمزًا.
      const still = wrapper.locator(`.${STATIC_CLASS}`);
      await expect(still, `${surface.name}: نُزع الرمز الساكن من الشجرة`).toHaveCount(1);
      await expect(still).toHaveCSS("opacity", "0");

      // الغلاف لا يُنشئ containing block — العطل الذي وقع فعلًا وأُصلح.
      const boxed = await wrapper.evaluate((host) => {
        const cs = getComputedStyle(host);
        return { filter: cs.filter, willChange: cs.willChange, contain: cs.contain };
      });
      expect(boxed.filter, `${surface.name}: مرشّح على غلاف Lottie يكسر كل position:fixed`).toBe(
        "none",
      );
      expect(boxed.willChange, `${surface.name}: will-change دائمة على غلاف Lottie`).toBe("auto");
    });

    /* ═══════════════════════════════════════════════════════════════════
       ② اللون يتبع الوضعين — الدعوى الحاكمة
       ═══════════════════════════════════════════════════════════════════ */

    test("اللون يتبع الوضعين: fill === currentColor، والاثنان ينقلبان", async ({ page }) => {
      await openAt(page, surface.url, "dark");
      const wrapper = page.locator(surface.selector).first();

      if ((await page.locator(surface.selector).count()) === 0) {
        test.skip(true, `${surface.name}: غير مركَّب على هذا العرض`);
      }

      await waitForPlaying(wrapper, surface.name);
      const dark = await readPaint(wrapper, surface.name);

      // (أ) عقد `currentColor` في الوضع الداكن.
      const darkPaint = dark.fill ?? dark.stroke;
      expect(
        darkPaint,
        `${surface.name}/داكن: العقدة المطليّة بلا fill ولا stroke محلولين`,
      ).not.toBeNull();
      expect(
        darkPaint,
        `${surface.name}/داكن: الطلاء ${darkPaint} لا يساوي currentColor ${dark.color} — ` +
          `القاعدة المحقونة لم تغلب سمة العرض. تحقّق من وجود <style id="nx-lottie-color-sync">.`,
      ).toBe(dark.color);

      // القلب بالمسار الحقيقي.
      await flipTheme(page, "light");
      await expect(wrapper).toHaveAttribute(STATE_ATTR, "playing");
      const light = await readPaint(wrapper, surface.name);
      const lightPaint = light.fill ?? light.stroke;

      // (ب) شرطٌ مسبق على طبقة الرموز: السطح نفسه يقلب لونه.
      expect(
        light.color,
        `${surface.name}: currentColor لم يتغيّر بين الوضعين (${dark.color}) — ` +
          `العطل في طبقة الرموز على هذا السطح لا في Lottie.`,
      ).not.toBe(dark.color);

      // (ج) النتيجة: الفنّ تبعه.
      expect(
        lightPaint,
        `${surface.name}/فاتح: الطلاء ${lightPaint} لا يساوي currentColor ${light.color}`,
      ).toBe(light.color);
      expect(
        lightPaint,
        `${surface.name}: لون Lottie لم ينقلب مع الوضع — ` +
          `داكن ${darkPaint} · فاتح ${lightPaint}. الأرجح مرجع تدرّج (url(#…)) ` +
          `تستثنيه القاعدة عمدًا، أو ملفٌ لونه داخل defs.`,
      ).not.toBe(darkPaint);
    });

    /* ═══════════════════════════════════════════════════════════════════
       ③ مفتاح الحركة — إطفاءٌ لا إبطاء
       ═══════════════════════════════════════════════════════════════════ */

    test('data-nx-motion="off" يهدم المشغّل ويعيد الرمز الساكن', async ({ page }) => {
      await openAt(page, surface.url, "dark");
      const wrapper = page.locator(surface.selector).first();

      if ((await page.locator(surface.selector).count()) === 0) {
        test.skip(true, `${surface.name}: غير مركَّب على هذا العرض`);
      }

      await waitForPlaying(wrapper, surface.name);

      await page.evaluate(() => document.documentElement.setAttribute("data-nx-motion", "off"));

      // المراقب يقرأ السمة حيًّا: لا إعادة تحميل بينهما.
      await expect(
        wrapper,
        `${surface.name}: بقي "playing" بعد إطفاء الحركة — MutationObserver لا يصل`,
      ).toHaveAttribute(STATE_ATTR, "static", { timeout: 5_000 });

      // الحاوية تُنزع من الشجرة كليًّا: هذا هو الفرق بين «لا تُركَّب آلة
      // الحركة» و«حركةٌ بمدّة صفر». الثانية تُبقي ١٦٨ كيلوبايت تعمل بلا أثر.
      await expect(
        wrapper.locator(`.${ART_CLASS}`),
        `${surface.name}: شجرة المشغّل باقية بعد الإطفاء`,
      ).toHaveCount(0);

      // والرمز الساكن يعود مرئيًّا — السكون لا يعني الاختفاء.
      await expect(wrapper.locator(`.${STATIC_CLASS}`)).toHaveCSS("opacity", "1");
    });

    test("prefers-reduced-motion: reduce يمنع تحميل المشغّل رأسًا", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await openAt(page, surface.url, "dark");
      const wrapper = page.locator(surface.selector).first();

      if ((await page.locator(surface.selector).count()) === 0) {
        test.skip(true, `${surface.name}: غير مركَّب على هذا العرض`);
      }

      await expect(wrapper).toBeAttached({ timeout: 15_000 });
      // مهلةٌ تتجاوز `requestIdleCallback({timeout: 2000})` بفارقٍ مريح:
      // لو كان سيُحمَّل لحُمِّل في هذه النافذة.
      await page.waitForTimeout(3_500);
      await expect(
        wrapper,
        `${surface.name}: حُمِّل المشغّل رغم تفضيل تقليل الحركة`,
      ).toHaveAttribute(STATE_ATTR, "static");
      await expect(wrapper.locator(`.${ART_CLASS}`)).toHaveCount(0);
    });

    /* ═══════════════════════════════════════════════════════════════════
       ④ الخروج من الشاشة يوقف التشغيل
       ═══════════════════════════════════════════════════════════════════ */

    test("الخروج من الشاشة يوقف الإطارات، والعودة تستأنفها", async ({ page }) => {
      test.skip(!surface.scrollable, `${surface.name}: ثابت على الشاشة — لا يخرج منها بالتمرير`);

      await openAt(page, surface.url, "dark");
      const wrapper = page.locator(surface.selector).first();

      if ((await page.locator(surface.selector).count()) === 0) {
        test.skip(true, `${surface.name}: غير مركَّب على هذا العرض`);
      }

      await waitForPlaying(wrapper, surface.name);

      // أ. داخل الشاشة: إطاران مختلفان خلال ٩٠٠ms.
      const [aIn, bIn] = await sampleArt(page, wrapper, 900);
      expect(
        aIn === bIn,
        `${surface.name}: الشجرة ساكنة وهي داخل الشاشة — ` +
          `إمّا أنّ الملف إطارٌ واحد أو أنّ المشغّل لم يبدأ`,
      ).toBe(false);

      /* ب. إخراجها. الحشوة تُلحق بآخر `<body>` — لا تلمس تخطيط الهدف ولا
         مقاسه، وإنما تمنح المستند مدى تمريرٍ يقينيًّا. بدونها يتوقّف الفحص
         على طول صفحةٍ قد يقصّرها تغيّر محتوى لا علاقة له بـLottie. */
      await page.evaluate((margin) => {
        const doc = document.documentElement;
        if (doc.scrollHeight < window.innerHeight + margin + 1200) {
          const spacer = document.createElement("div");
          spacer.id = "nx-lottie-test-spacer";
          spacer.style.height = `${window.innerHeight + margin + 1200}px`;
          spacer.setAttribute("aria-hidden", "true");
          document.body.appendChild(spacer);
        }
        window.scrollTo(0, doc.scrollHeight);
      }, ROOT_MARGIN_PX);

      // التأكّد أنّها تجاوزت الهامش فعلًا — لا نقيس على ظنّ.
      const outBy = await wrapper.evaluate((host) => host.getBoundingClientRect().bottom);
      expect(
        outBy,
        `${surface.name}: لم تخرج خلف هامش ${ROOT_MARGIN_PX}px (bottom=${outBy})`,
      ).toBeLessThan(-ROOT_MARGIN_PX);

      // مهلة تسليم للمراقب قبل أخذ العيّنة.
      await page.waitForTimeout(300);
      const [aOut, bOut] = await sampleArt(page, wrapper, 900);
      expect(
        aOut,
        `${surface.name}: المشغّل ما زال يرسم خارج الشاشة — IntersectionObserver لا يوقفه`,
      ).toBe(bOut);

      // ج. والعودة تستأنف: التوقّف لا يجوز أن يكون موتًا.
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(300);
      const [aBack, bBack] = await sampleArt(page, wrapper, 900);
      expect(
        aBack === bBack,
        `${surface.name}: لم تستأنف بعد العودة إلى الشاشة — التوقّف صار هدمًا`,
      ).toBe(false);
    });
  });
}

/* ═══════════════════════════════════════════════════════════════════════
   ⑤ منع التصادم — طبقة CSS تسكت حيث يعمل Lottie
   ═══════════════════════════════════════════════════════════════════════

   الفحص هنا يقرأ `animation-name` المحسوب لا نصّ الملف: الغرض إثبات أنّ
   القاعدة **فازت في التتالي**، لا أنّها مكتوبة. القاعدة المكتوبة التي
   تخسر أمام نوعيةٍ أعلى تمرّ في قراءة النصّ وتسقط على الشاشة. */

test.describe("Lottie · منع التصادم", () => {
  test("الرمز الساكن وكل ما تحته بلا حركة CSS أثناء التشغيل", async ({ page }) => {
    await openAt(page, "/hcis/directive/SEC-01", "dark");
    const wrapper = page.locator(`.nx-module-icon [${STATE_ATTR}]`).first();

    if ((await page.locator(`.nx-module-icon [${STATE_ATTR}]`).count()) === 0) {
      test.skip(true, "بلاطة توجيه HCIS غير مركَّبة");
    }

    await waitForPlaying(wrapper, "بلاطة توجيه HCIS");

    const names = await wrapper.evaluate(
      (host, { staticClass }) => {
        const still = host.querySelector(`.${staticClass}`);
        if (!still) return null;
        const nodes = [still, ...Array.from(still.querySelectorAll("*"))];
        return nodes.map((node) => getComputedStyle(node as Element).animationName);
      },
      { staticClass: STATIC_CLASS },
    );

    expect(names, "الرمز الساكن مفقود").not.toBeNull();
    for (const name of names as string[]) {
      expect(
        name,
        `حركة CSS "${name}" ما زالت تعمل تحت Lottie — ` +
          `اختصار animation يستبدل ولا يجمع، فالإسكات يلزم أن يكون animation:none بنوعية أعلى`,
      ).toBe("none");
    }
  });

  test("شجرة المشغّل بلا drop-shadow موروث من طبقة المدار", async ({ page }) => {
    await openAt(page, "/hcis/directive/SEC-01", "dark");
    const wrapper = page.locator(`.nx-module-icon [${STATE_ATTR}]`).first();

    if ((await page.locator(`.nx-module-icon [${STATE_ATTR}]`).count()) === 0) {
      test.skip(true, "بلاطة توجيه HCIS غير مركَّبة");
    }

    await waitForPlaying(wrapper, "بلاطة توجيه HCIS");

    /* `:is(.nx-orb,.nx-module-icon) svg` محدِّد **نسل** لا ابن، فهو يلتقط
       svg المولَّد أيضًا ويضع عليه `filter: drop-shadow(...)`. ومرشّحٌ على
       عنصرٍ يتغيّر محتواه كل إطار = إعادة ترشيح كل إطار — وهو بالضبط ما
       يمنعه رأس icon-motion.css. */
    const filter = await wrapper.evaluate(
      (host, { artClass }) => {
        const svg = host.querySelector(`.${artClass} > svg`);
        return svg ? getComputedStyle(svg).filter : null;
      },
      { artClass: ART_CLASS },
    );

    expect(filter, "لم يُصيَّر svg").not.toBeNull();
    expect(
      filter,
      "مرشّح على svg المولَّد: يُعاد ترشيحه كل إطار. أضف " +
        ":is(.nx-orb,.nx-module-icon) .nx-lottie-art svg { filter: none }",
    ).toBe("none");
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   ⑥ لا خطأ صامت
   ═══════════════════════════════════════════════════════════════════════ */

test("لا تحذير سقوطٍ من LottieIcon على أي سطح مركَّب", async ({ page }) => {
  const warnings: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "warning" && msg.text().includes("[LottieIcon]")) warnings.push(msg.text());
  });

  await openAt(page, "/hcis", "dark");
  await page.waitForTimeout(6_000);

  expect(warnings, `سقطت أيقونة إلى رمزها الساكن:\n${warnings.join("\n")}`).toEqual([]);
});
