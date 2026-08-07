/**
 * عقد طبقة Lottie (قرار المالك ٢٠٢٦/٠٨/٠٧).
 *
 * ════════════════════════════════════════════════════════════════════════
 * لماذا بعض البنود تُفحص على **المصدر** لا على السلوك
 * ════════════════════════════════════════════════════════════════════════
 *
 * jsdom يبني شجرةً ولا يحسب تخطيطًا ولا يطبّق تتابعًا. وثلاثة من أخطر
 * بنود هذا العقد لا أثر لها فيه إطلاقًا:
 *
 *   ١. **أنّ القاعدة تغلب سمة العرض.** هذا حكمٌ في الترتيب التتابعي
 *      (سمة العرض تسبق تصريحات المؤلّف)، و`getComputedStyle` في jsdom لا
 *      يعرف `fill` ولا يحلّ `currentColor`. المقياس الحقيقي جرى على
 *      كروميوم: السمة تتنقّل `rgb(127,0,127)` ← `rgb(21,0,233)` والمحسوب
 *      مسمَّرٌ على `rgb(0,128,255)`. فما يُفحص هنا هو ما **يمكن** فحصه
 *      بصدق: أنّ المحدِّد يصيب ما يجب ويُخطئ ما يجب — بـ`Element.matches`
 *      على شجرةٍ مبنيّة كما يبنيها المشغّل حرفًا بحرف. وأنّ نصّ القاعدة
 *      المنشور بلا `!important` وبلا لونٍ حرفيّ.
 *   ٢. **أنّ الغلاف لا يُنشئ containing block.** لا `position: fixed` في
 *      jsdom أصلًا. فيُفحص المنع نصًّا: لا `filter` ولا `will-change` ولا
 *      `contain` ولا `content-visibility` في الكود.
 *   ٣. **أنّ الحلقة ترتدّ ولا تقفز.** الارتداد سلوك زمنيّ عبر عشرات
 *      الإطارات. المُلزِم الذي يُفحص: `loop: false` في إعداد المشغّل +
 *      عكس الاتجاه عند `complete` — وهو الحدث الذي لا يقع أبدًا مع
 *      `loop: true`، فوجود أحدهما بلا الآخر عطلٌ صامت.
 *
 * وما عدا ذلك يُفحص سلوكًا حقيقيًّا: الكسل، والتطبيع، والمفاتيح الأربعة،
 * والسقوط إلى الساكن، والتفكيك — كلّها تُشغَّل على مكوّن مركَّب فعلًا
 * بمشغّل مُقنَّع يحاكي شجرة `lottie_light` ودورة أحداثها.
 *
 * والتعليقات تُنزع قبل الفحص النصّي: الرأس يشرح المحظور ويسمّيه، ولو
 * فُحص النصّ خامًا لمرّ العطل لأنّ اسمه مذكورٌ في شرحه.
 */
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LOTTIE_ART_CLASS,
  LOTTIE_COLOR_CSS,
  LOTTIE_FILL_SELECTOR,
  LOTTIE_STATE_ATTR,
  LOTTIE_STATIC_CLASS,
  LOTTIE_STROKE_SELECTOR,
  LottieIcon,
  normalizeLottieColors,
  __resetLottieWarnings,
  type LottieIconProps,
} from "@/components/icons/LottieIcon";

const SRC = readFileSync("src/components/icons/LottieIcon.tsx", "utf8");
/** الرأس يسمّي كل محظور — فالفحص النصّي على الكود وحده. */
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");

const SVG_NS = "http://www.w3.org/2000/svg";

/* ═══════════════════════════════════════════════════════════════════════
   مشغّل مُقنَّع — يحاكي ما قيس على `lottie_light@5.13.0` لا ما يُظنّ به:
   شجرة `svg > defs + g`، ألوانٌ **سماتُ عرض** لا أسلوبًا مضمّنًا، وقناعٌ
   داخل `defs` بأبيضَ دلاليّ.
   ═══════════════════════════════════════════════════════════════════════ */

type Listener = (arg?: unknown) => void;

type FakeAnim = {
  config: { container: Element; loop: boolean; autoplay: boolean; rendererSettings: unknown };
  log: string[];
  listeners: Map<string, Set<Listener>>;
  emit: (name: string, arg?: unknown) => void;
  paint: () => void;
  addEventListener: (name: string, cb: Listener) => void;
  removeEventListener: (name: string, cb?: Listener) => void;
  destroy: () => void;
  play: () => void;
  pause: () => void;
  setSpeed: (value: number) => void;
  setDirection: (value: number) => void;
};

const H = vi.hoisted(() => ({
  state: {
    /** كل نسخة حُمِّلت في هذا الاختبار. */
    loaded: [] as unknown[],
    /** حين يُرفع: `loadAnimation` يرمي — مسار «تعذّر التصيير». */
    throwOnLoad: false,
  },
}));

vi.mock("lottie-web/build/player/lottie_light", () => ({
  default: {
    loadAnimation(config: FakeAnim["config"]) {
      if (H.state.throwOnLoad) throw new Error("تعذّر بناء المشغّل");
      const listeners = new Map<string, Set<Listener>>();
      const log: string[] = [];
      const anim: FakeAnim = {
        config,
        log,
        listeners,
        emit(name, arg) {
          for (const cb of listeners.get(name) ?? []) cb(arg);
        },
        paint() {
          buildPlayerTree(config.container);
        },
        addEventListener(name, cb) {
          log.push(`add:${name}`);
          const set = listeners.get(name) ?? new Set<Listener>();
          set.add(cb);
          listeners.set(name, set);
        },
        removeEventListener(name, cb) {
          log.push(`remove:${name}`);
          if (cb) listeners.get(name)?.delete(cb);
          else listeners.delete(name);
        },
        destroy() {
          log.push("destroy");
          listeners.clear();
          config.container.innerHTML = "";
        },
        play() {
          log.push("play");
        },
        pause() {
          log.push("pause");
        },
        setSpeed(value) {
          log.push(`speed:${value}`);
        },
        setDirection(value) {
          log.push(`direction:${value}`);
        },
      };
      H.state.loaded.push(anim);
      return anim;
    },
  },
}));

/** يبني شجرة المشغّل داخل حاويةٍ ما ويعيد عقدها المفصليّة. */
function buildPlayerTree(container: Element) {
  const svg = document.createElementNS(SVG_NS, "svg");

  // ── defs: القناع والتدرّج. كلاهما خارج نطاق القاعدة بنيويًّا.
  const defs = document.createElementNS(SVG_NS, "defs");
  const mask = document.createElementNS(SVG_NS, "mask");
  const maskPath = document.createElementNS(SVG_NS, "path");
  maskPath.setAttribute("fill", "#ffffff"); // أبيضُ دلالة لا لون
  mask.appendChild(maskPath);
  const gradient = document.createElementNS(SVG_NS, "linearGradient");
  const stop = document.createElementNS(SVG_NS, "stop");
  stop.setAttribute("stop-color", "rgb(0,128,255)");
  gradient.appendChild(stop);
  defs.append(mask, gradient);

  // ── g: الفنّ المرئي، وطبقاته متداخلة كما يبنيها المشغّل.
  const group = document.createElementNS(SVG_NS, "g");
  const layer = document.createElementNS(SVG_NS, "g");
  const fillPath = document.createElementNS(SVG_NS, "path");
  fillPath.setAttribute("fill", "rgb(255,0,255)");
  fillPath.setAttribute("fill-opacity", "1");
  const strokePath = document.createElementNS(SVG_NS, "path");
  strokePath.setAttribute("stroke", "rgb(255,0,0)");
  strokePath.setAttribute("stroke-width", "2");
  strokePath.setAttribute("fill-opacity", "0"); // يضعها المشغّل مرّة عند البناء
  const gradientPath = document.createElementNS(SVG_NS, "path");
  gradientPath.setAttribute("fill", "url(#__lottie_element_18)");
  const hollowPath = document.createElementNS(SVG_NS, "path");
  hollowPath.setAttribute("fill", "none");
  layer.append(fillPath, strokePath, gradientPath, hollowPath);
  group.appendChild(layer);

  svg.append(defs, group);
  container.appendChild(svg);
  return { svg, group, fillPath, strokePath, gradientPath, hollowPath, maskPath, stop };
}

/* ═══════════════════════════════════════════════════════════════════════
   أدوات التركيب
   ═══════════════════════════════════════════════════════════════════════ */

function mountIcon(props: Partial<LottieIconProps> = {}) {
  return render(
    createElement(LottieIcon, {
      src: "/lottie/radar.json",
      size: 24,
      ...props,
      children: createElement("svg", {
        "data-testid": "static",
        className: "lucide lucide-radar",
      }),
    }),
  );
}

/** يمرّر مهلة الخمول الساقطة ثم يفرغ طابور الاستيراد الكسول. */
async function settle(ms = 500) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
  await act(async () => {
    const settled = (vi as unknown as { dynamicImportSettled?: () => Promise<void> })
      .dynamicImportSettled;
    if (settled) await settled.call(vi);
    for (let i = 0; i < 8; i += 1) await Promise.resolve();
  });
}

function lastAnim(): FakeAnim {
  const anim = H.state.loaded.at(-1) as FakeAnim | undefined;
  if (!anim) throw new Error("لم يُحمَّل مشغّل");
  return anim;
}

/** يمرّر الإطار الأول: يرسم الشجرة ثم يبثّ `DOMLoaded` كما يفعل المشغّل. */
async function domLoaded(anim: FakeAnim) {
  await act(async () => {
    anim.paint();
    anim.emit("DOMLoaded");
  });
}

type MediaSwitch = "reduce" | "forced" | null;

function stubMatchMedia(active: MediaSwitch) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches:
        (active === "reduce" && query.includes("reduced-motion")) ||
        (active === "forced" && query.includes("forced-colors")),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.useFakeTimers();
  // المسار المقيس في jsdom هو الساقط (`setTimeout`) — والمسار الآخر
  // (`requestIdleCallback`) يُفحص على المصدر لأنه لا وجود له هنا.
  delete (window as unknown as { requestIdleCallback?: unknown }).requestIdleCallback;
  H.state.loaded = [];
  H.state.throwOnLoad = false;
  __resetLottieWarnings();
  document.documentElement.removeAttribute("data-nx-motion");
  document.documentElement.classList.remove("safe-mode");
  document.getElementById("nx-lottie-color-sync")?.remove();
  stubMatchMedia(null);
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  warnSpy.mockRestore();
  vi.useRealTimers();
  delete (globalThis as unknown as { IntersectionObserver?: unknown }).IntersectionObserver;
});

/* ═══════════════════════════════════════════════════════════════════════
   ① الكسل
   ═══════════════════════════════════════════════════════════════════════ */

describe("الكسل — ١٦٨ كيلوبايت لا تُزاحم الترطيب", () => {
  it("لا استيراد ساكن للمشغّل — النوع فقط", () => {
    // `import type` يُمحى عند البناء؛ أي استيراد قيمة يجرّ المقطع إلى
    // الحزمة الحرجة، والحارس يحسب المقاطع الكسولة والحرجة سواءً.
    expect(SRC).toMatch(/import type \{[^}]*AnimationItem[^}]*\} from "lottie-web"/);
    expect(CODE).not.toMatch(/^import (?!type)[^;]*from "lottie-web/m);
  });

  it("التحميل ديناميكي وعلى البناء الخفيف حصرًا", () => {
    expect(CODE).toContain('await import("lottie-web/build/player/lottie_light")');
    // البناء الكامل يزيد ٢٫٥×، ويحمل مؤثّرات تكتب `stroke="#fff"` داخل
    // الطبقة المرئية — أي لونًا لا تبلغه قاعدتنا.
    expect(CODE).not.toContain('import("lottie-web")');
  });

  it("ينتظر خلوّ الخيط: خمول ثم سقوط إلى مؤقّت", () => {
    expect(CODE).toContain("requestIdleCallback");
    expect(CODE).toContain("cancelIdleCallback");
    expect(CODE).toMatch(/setTimeout\(\(\) => void boot\(\), \d+\)/);
  });

  it("لا يُحمَّل المشغّل قبل انقضاء المهلة، ويُحمَّل بعدها مرّة واحدة", async () => {
    mountIcon();
    // الرمز الساكن موجودٌ من أول رسم، والمشغّل لم يُلمس بعد.
    expect(H.state.loaded).toHaveLength(0);
    await settle();
    expect(H.state.loaded).toHaveLength(1);
    const anim = lastAnim();
    expect(anim.config.autoplay).toBe(false);
    expect(anim.config.container.classList.contains(LOTTIE_ART_CLASS)).toBe(true);
  });

  it("لا يُبنى الشجر على دفعات — `DOMLoaded` يجب أن يرى الشجرة كاملة", async () => {
    mountIcon();
    await settle();
    const settings = lastAnim().config.rendererSettings as { progressiveLoad: boolean };
    expect(settings.progressiveLoad).toBe(false);
    expect(CODE).not.toContain("progressiveLoad: true");
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   ② مزامنة اللون
   ═══════════════════════════════════════════════════════════════════════ */

describe("مزامنة اللون — القاعدة تغلب السمة", () => {
  it("لا لون حرفيّ ولا `!important` في القاعدة المنشورة", () => {
    expect(LOTTIE_COLOR_CSS).toContain("fill:currentColor");
    expect(LOTTIE_COLOR_CSS).toContain("stroke:currentColor");
    // `!important` هنا اعترافٌ بأنّ الحكم غير مفهوم: سمة العرض تُغلب
    // بالمرتبة لا بالقوّة.
    expect(LOTTIE_COLOR_CSS).not.toContain("!important");
    // ولا لونٍ حرفيّ في الملف كلّه — اللون من طبقة الرموز عبر `currentColor`.
    expect(CODE).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(CODE).not.toMatch(/\brgba?\(/);
  });

  it("القاعدة تصيب المسار المطليّ", () => {
    const host = document.createElement("div");
    host.className = LOTTIE_ART_CLASS;
    document.body.appendChild(host);
    const { fillPath, strokePath } = buildPlayerTree(host);

    expect(fillPath.matches(LOTTIE_FILL_SELECTOR)).toBe(true);
    expect(strokePath.matches(LOTTIE_STROKE_SELECTOR)).toBe(true);
    host.remove();
  });

  it("وتُخطئ ما يجب أن تُخطئه: التدرّج، والقناع، والفراغ، والحدّ الوهمي", () => {
    const host = document.createElement("div");
    host.className = LOTTIE_ART_CLASS;
    document.body.appendChild(host);
    const { fillPath, strokePath, gradientPath, hollowPath, maskPath } = buildPlayerTree(host);

    // التدرّج: قاعدةٌ شاملة تقتله (قيس على كروميوم).
    expect(gradientPath.matches(LOTTIE_FILL_SELECTOR)).toBe(false);
    // القناع: أبيضه دلالةٌ لا لون، وهو في `defs` شقيقةِ `g` لا ابنتها.
    expect(maskPath.matches(LOTTIE_FILL_SELECTOR)).toBe(false);
    // `fill="none"`: شكلٌ مجوّف — ملؤه رسمٌ آخر.
    expect(hollowPath.matches(LOTTIE_FILL_SELECTOR)).toBe(false);
    // مسار التعبئة لا `stroke` له: قاعدةُ حدٍّ شاملة تُثخن الفنّ بحدٍّ
    // لم يطلبه أحد. ولذلك الشرط `[stroke]` لا `*`.
    expect(fillPath.matches(LOTTIE_STROKE_SELECTOR)).toBe(false);
    expect(strokePath.matches(LOTTIE_FILL_SELECTOR)).toBe(false);
    host.remove();
  });

  it("إعادة كتابة المشغّل لا تُفلت المسار من القاعدة", () => {
    // هذا جوهر اختيار المسار: المشغّل يعيد كتابة اللون كل إطارٍ متغيّر،
    // وكل دورة تكرار، وكل نقطة تدخل فيها طبقةٌ مداها. المحدِّد مبنيّ على
    // **وجود** السمة لا على قيمتها، فالكتابة الجديدة تظلّ محكومة.
    const host = document.createElement("div");
    host.className = LOTTIE_ART_CLASS;
    document.body.appendChild(host);
    const { fillPath } = buildPlayerTree(host);

    normalizeLottieColors(host);
    expect(fillPath.getAttribute("fill")).toBe("currentColor");
    // ثم يكتب المشغّل قيمة الإطار التالي فوقها:
    fillPath.setAttribute("fill", "rgb(21,0,233)");
    expect(fillPath.matches(LOTTIE_FILL_SELECTOR)).toBe(true);
    host.remove();
  });

  it("المشية الواحدة تُحوّل الصريح وتُبقي المؤلَّف", () => {
    const host = document.createElement("div");
    host.className = LOTTIE_ART_CLASS;
    document.body.appendChild(host);
    const { fillPath, strokePath, gradientPath, hollowPath, maskPath, stop } =
      buildPlayerTree(host);

    const audit = normalizeLottieColors(host);

    expect(fillPath.getAttribute("fill")).toBe("currentColor");
    expect(strokePath.getAttribute("stroke")).toBe("currentColor");
    // التدرّج يُحصى ولا يُمسّ، ومواقفه تبقى بألوانها.
    expect(gradientPath.getAttribute("fill")).toBe("url(#__lottie_element_18)");
    expect(stop.getAttribute("stop-color")).toBe("rgb(0,128,255)");
    expect(audit.gradients).toBe(1);
    // القناع لا يُمسّ — تغييره يمحو القناع.
    expect(maskPath.getAttribute("fill")).toBe("#ffffff");
    expect(hollowPath.getAttribute("fill")).toBe("none");
    expect(audit.painted).toBe(2);
    host.remove();
  });

  it("لا يُعلَّق التصحيح على إطارٍ — `enterFrame` خطّاف خاطئ و`drawnFrame` كلفة", () => {
    // `enterFrame` يقع **قبل** التصيير فيقرأ قيم الإطار السابق (مقيس).
    // و`drawnFrame` صحيحٌ زمنيًّا لكنّه مشيٌ على كل المسارات كل إطار —
    // وهو ما يمنعه رأس `icon-motion.css` صراحةً.
    expect(CODE).not.toContain("enterFrame");
    expect(CODE).not.toContain("drawnFrame");
  });

  it("القاعدة تُنشر مرّة واحدة وقبل أوّل رسم", async () => {
    expect(document.getElementById("nx-lottie-color-sync")).toBeNull();
    const first = mountIcon();
    await settle();
    const style = document.getElementById("nx-lottie-color-sync");
    expect(style?.textContent).toBe(LOTTIE_COLOR_CSS);

    const second = mountIcon({ src: "/lottie/other.json" });
    await settle();
    expect(document.querySelectorAll("#nx-lottie-color-sync")).toHaveLength(1);
    first.unmount();
    second.unmount();
  });

  it("الوضع القسري يُسقط الفنّ ويعيد الرمز الساكن", () => {
    // فنٌّ ملوّن بقيمٍ نهائية يبقى ظاهرًا بلونٍ مستعار لا يعني شيئًا.
    expect(LOTTIE_COLOR_CSS).toContain("@media (forced-colors:active)");
    expect(LOTTIE_COLOR_CSS).toContain(`.${LOTTIE_ART_CLASS}{display:none}`);
    expect(LOTTIE_COLOR_CSS).toContain(`.${LOTTIE_STATIC_CLASS}{opacity:1}`);
  });

  it("حالة العرض في الترميز هي نفسها التي يقرؤها المحدِّد", () => {
    expect(LOTTIE_STATE_ATTR).toBe("data-nx-lottie");
    expect(CODE).toContain('data-nx-lottie={playing ? "playing" : "static"}');
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   ③ المفاتيح
   ═══════════════════════════════════════════════════════════════════════ */

describe("المفاتيح — عند السكون لا يُحمَّل المشغّل أصلًا", () => {
  it("الأربعة تُقرأ، وتُراقَب حيًّا لا مرّة", () => {
    expect(CODE).toContain('root.getAttribute("data-nx-motion") === "off"');
    expect(CODE).toContain('root.classList.contains("safe-mode")');
    expect(CODE).toContain('"(prefers-reduced-motion: reduce)"');
    expect(CODE).toContain('"(forced-colors: active)"');
    expect(CODE).toContain("MutationObserver");
    // `class` في المرشِّح شرطُ التقاط `safe-mode` — بدونها يمرّ كاسر
    // دورة الأعطال بلا أثر.
    expect(CODE).toMatch(/attributeFilter: \["data-nx-motion", "class"\]/);
    expect(CODE).toContain('addEventListener?.("change", sync)');
    // البوّابة قبل كل شيء: لا تحميل ولا حاوية.
    expect(CODE).toMatch(/if \(still\) return;/);
  });

  it.each([
    ["data-nx-motion=off", () => document.documentElement.setAttribute("data-nx-motion", "off")],
    ["html.safe-mode", () => document.documentElement.classList.add("safe-mode")],
    ["prefers-reduced-motion", () => stubMatchMedia("reduce")],
    ["forced-colors", () => stubMatchMedia("forced")],
  ])("%s: رمزٌ ساكن بلا حاوية ولا مشغّل", async (_name, activate) => {
    activate();
    const { container, getByTestId } = mountIcon();
    await settle();

    expect(getByTestId("static")).toBeInTheDocument();
    expect(container.querySelector(`.${LOTTIE_ART_CLASS}`)).toBeNull();
    expect(H.state.loaded).toHaveLength(0);
    expect(container.querySelector(`[${LOTTIE_STATE_ATTR}="static"]`)).not.toBeNull();
  });

  it("رفع المفتاح في أثناء التشغيل يهدم المشغّل فورًا", async () => {
    const { container } = mountIcon();
    await settle();
    const anim = lastAnim();
    await domLoaded(anim);
    expect(container.querySelector(`[${LOTTIE_STATE_ATTR}="playing"]`)).not.toBeNull();

    await act(async () => {
      document.documentElement.setAttribute("data-nx-motion", "off");
    });

    expect(anim.log).toContain("destroy");
    expect(container.querySelector(`.${LOTTIE_ART_CLASS}`)).toBeNull();
    expect(container.querySelector(`[${LOTTIE_STATE_ATTR}="static"]`)).not.toBeNull();
  });

  it("خفض المفتاح يعيد التشغيل بلا إعادة تحميل الصفحة", async () => {
    document.documentElement.setAttribute("data-nx-motion", "off");
    mountIcon();
    await settle();
    expect(H.state.loaded).toHaveLength(0);

    await act(async () => {
      document.documentElement.removeAttribute("data-nx-motion");
    });
    await settle();
    expect(H.state.loaded).toHaveLength(1);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   ④ الحلقة والرؤية
   ═══════════════════════════════════════════════════════════════════════ */

describe("الحلقة ترتدّ، والرسم يتوقّف خارج الشاشة", () => {
  it("لا `loop: true` — التكرار ارتدادٌ عند `complete`", async () => {
    expect(CODE).toContain("loop: false");
    expect(CODE).not.toMatch(/\bloop: true\b/);
    expect(CODE).toContain('anim.addEventListener("complete", onComplete)');
    expect(CODE).toContain("anim.setDirection(direction)");

    mountIcon();
    await settle();
    const anim = lastAnim();
    await domLoaded(anim);

    expect(anim.config.loop).toBe(false);
    await act(async () => anim.emit("complete"));
    expect(anim.log).toContain("direction:-1");
    await act(async () => anim.emit("complete"));
    expect(anim.log).toContain("direction:1");
  });

  it("`bounce: false` يعرضها مرّة ولا يعلّق شيئًا على `complete`", async () => {
    mountIcon({ bounce: false });
    await settle();
    const anim = lastAnim();
    expect(anim.log).not.toContain("add:complete");
  });

  it("يتوقّف عند الخروج ويعود عند الدخول", async () => {
    const instances: { cb: IntersectionObserverCallback; disconnected: boolean }[] = [];
    class IOStub {
      cb: IntersectionObserverCallback;
      disconnected = false;
      constructor(cb: IntersectionObserverCallback) {
        this.cb = cb;
        instances.push(this);
      }
      observe() {}
      unobserve() {}
      disconnect() {
        this.disconnected = true;
      }
      takeRecords() {
        return [];
      }
    }
    (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = IOStub;

    const view = mountIcon();
    await settle();
    const anim = lastAnim();
    await domLoaded(anim);
    expect(instances).toHaveLength(1);

    const fire = (isIntersecting: boolean) =>
      act(async () => {
        instances[0].cb(
          [{ isIntersecting } as IntersectionObserverEntry],
          null as unknown as IntersectionObserver,
        );
      });

    await fire(true);
    expect(anim.log.filter((entry) => entry === "play")).toHaveLength(1);
    await fire(false);
    expect(anim.log).toContain("pause");

    view.unmount();
    expect(instances[0].disconnected).toBe(true);
  });

  it("بلا `IntersectionObserver` يعمل ولا يتعطّل", async () => {
    mountIcon();
    await settle();
    const anim = lastAnim();
    await domLoaded(anim);
    // لا مراقب في jsdom افتراضًا ⇒ المسار الساقط يشغّل مباشرة.
    expect(anim.log).toContain("play");
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   ⑤ السقوط إلى الساكن
   ═══════════════════════════════════════════════════════════════════════ */

describe("يفشل إلى الساكن — لا شاشة فارغة أبدًا", () => {
  it("الرمز الساكن مُصيَّر من أول رسم، قبل أي مؤثّر", () => {
    const { getByTestId, container } = mountIcon();
    expect(getByTestId("static")).toBeInTheDocument();
    expect(container.querySelector(`.${LOTTIE_STATIC_CLASS}`)).not.toBeNull();
    // والمقاس محجوز قبل أن يوجد المشغّل — فلا انزياح عند وصوله.
    const wrap = container.querySelector<HTMLElement>(`[${LOTTIE_STATE_ATTR}]`);
    expect(wrap?.style.width).toBe("24px");
    expect(wrap?.style.height).toBe("24px");
  });

  it("عطلٌ في بناء المشغّل: يبقى الساكن ويُسجَّل التحذير مرّة", async () => {
    H.state.throwOnLoad = true;
    const { getByTestId, container } = mountIcon();
    await settle();

    expect(getByTestId("static")).toBeInTheDocument();
    expect(container.querySelector(`[${LOTTIE_STATE_ATTR}="static"]`)).not.toBeNull();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0]?.[0])).toContain("تعذّر تشغيل");

    // نسخةٌ ثانية بالمصدر نفسه لا تُكرّر الضجيج.
    mountIcon();
    await settle();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it("`data_failed` من المشغّل: لا انتقال إلى حالة التشغيل", async () => {
    const { container } = mountIcon();
    await settle();
    const anim = lastAnim();
    await act(async () => anim.emit("data_failed"));

    expect(container.querySelector(`[${LOTTIE_STATE_ATTR}="static"]`)).not.toBeNull();
    expect(anim.log).toContain("pause");
    expect(warnSpy).toHaveBeenCalled();
  });

  it("بلا مصدر: رمزٌ ساكن ولا تحميل", async () => {
    mountIcon({ src: undefined });
    await settle();
    expect(H.state.loaded).toHaveLength(0);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   ⑥ التفكيك
   ═══════════════════════════════════════════════════════════════════════ */

describe("بلا تسريب", () => {
  it("التفكيك ينزع المستمعين ثم يهدم — بهذا الترتيب", async () => {
    const view = mountIcon();
    await settle();
    const anim = lastAnim();
    await domLoaded(anim);

    view.unmount();

    // `destroy()` يجعل `_cbs = null`؛ أي نزعٍ بعده يقرأ من `null` فيرمي.
    const removals = anim.log.filter((entry) => entry.startsWith("remove:"));
    expect(removals).toContain("remove:DOMLoaded");
    expect(removals).toContain("remove:data_failed");
    expect(anim.log.indexOf("destroy")).toBeGreaterThan(anim.log.lastIndexOf("remove:complete"));
    expect(anim.log).toContain("destroy");
    expect(anim.listeners.size).toBe(0);
  });

  it("العنصر يُلتقط عند التركيب لا من `ref.current` في التنظيف", () => {
    // React تنزع العقدة قبل أن يمرّ المؤثّر المؤجَّل، فقراءة `ref.current`
    // في التنظيف تعطي `null` ولا يُهدم المشغّل — تسريبُ إطاراتٍ صامت.
    expect(CODE).toMatch(/const host = hostRef\.current;/);
    // قراءةٌ واحدة في الملف كلّه، وهي التقاطُ التركيب. أي قراءة ثانية
    // إمّا في التنظيف وإمّا في معالجٍ متأخّر — وكلاهما يقرأ `null`.
    expect(CODE.match(/hostRef\.current/g) ?? []).toHaveLength(1);
  });

  it("التفكيك يوقف كل مؤقّت ومراقب", () => {
    expect(CODE).toContain("observer.disconnect()");
    expect(CODE).toContain("watcher?.disconnect()");
    expect(CODE).toContain("clearTimeout(timerId)");
    expect(CODE).toContain("window.cancelIdleCallback(idleId)");
    expect(CODE).toContain('query.removeEventListener?.("change", sync)');
  });

  it("بثٌّ متأخّر بعد التفكيك لا يُحرّك ساكنًا", async () => {
    const view = mountIcon();
    await settle();
    const anim = lastAnim();
    await domLoaded(anim);

    view.unmount();
    const after = anim.log.length;
    await act(async () => anim.emit("complete"));
    expect(anim.log.length).toBe(after);
  });

  it("التفكيك قبل انقضاء المهلة لا يُحمِّل المقطع أصلًا", async () => {
    // ٣١ أيقونة تدخل الشاشة وتخرج منها في تمريرة تنقّل واحدة؛ لو لم
    // يُلغَ المؤقّت لجُرّت ٣١ نسخة مشغّل إلى عقدٍ منزوعة.
    const view = mountIcon();
    view.unmount();
    await settle();
    expect(H.state.loaded).toHaveLength(0);
  });

  it("استيرادٌ يعود بعد التفكيك لا يبني مشغّلًا — الحارس `cancelled`", () => {
    /* هذا البند يُفحص نصًّا عن اضطرار لا عن كسل: المشغّل المُقنَّع يعود في
       دفعة المهام الدقيقة نفسها التي يفرغها `act`، فلا سبيل إلى تفكيكٍ
       يقع **بين** بدء الاستيراد وعودته داخل jsdom. والسباق حقيقيّ على
       الشبكة: ١٦٨ كيلوبايت تصل بعد أن يكون المستخدم قد غادر الصفحة،
       فتُبنى نسخة مشغّل داخل عقدةٍ منزوعة لا يهدمها أحد.
       المُلزِم إذًا: أن يلي الانتظارَ حارسٌ مباشرةً. */
    expect(CODE).toMatch(
      /await import\("lottie-web\/build\/player\/lottie_light"\);\s*if \(cancelled\) return;/,
    );
    expect(CODE).toContain("cancelled = true;");
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   ⑦ الحدود البنيوية — SSR والغلاف
   ═══════════════════════════════════════════════════════════════════════ */

describe("الحدود البنيوية", () => {
  it("لا `window` ولا `document` ولا `navigator` خارج المؤثّرات", () => {
    // واحدةٌ منها في جسم المكوّن تُسقط الصفحة بـ500 على الخادم.
    const body = CODE.slice(CODE.indexOf("export function LottieIcon("));
    const beforeFirstEffect = body.slice(0, body.indexOf("useEffect("));
    expect(beforeFirstEffect).not.toMatch(/\b(window|document|navigator)\b/);
    // والحالة تبدأ ساكنة: أوّل رسمٍ على العميل يطابق ما أرسله الخادم.
    expect(CODE).toContain("useState(true)");
  });

  it("الغلاف لا يُنشئ containing block", () => {
    // كلٌّ من هذه يكسر كل `position: fixed` تحته — عطلٌ وقع وأُصلح.
    expect(CODE).not.toMatch(/willChange/);
    expect(CODE).not.toMatch(/\bfilter:/);
    expect(CODE).not.toMatch(/\bcontain:/);
    expect(CODE).not.toMatch(/contentVisibility/);
    expect(LOTTIE_COLOR_CSS).not.toMatch(/will-change|filter:|contain:|content-visibility/);
  });

  it("الأيقونة زخرفية ما لم تُوصف، فلا تُسمع مرّتين", () => {
    const decorative = mountIcon();
    const wrap = decorative.container.querySelector(`[${LOTTIE_STATE_ATTR}]`);
    expect(wrap?.getAttribute("aria-hidden")).toBe("true");
    expect(wrap?.getAttribute("role")).toBeNull();
    decorative.unmount();

    const described = mountIcon({ label: "رادار المراقبة" });
    const labelled = described.container.querySelector(`[${LOTTIE_STATE_ATTR}]`);
    expect(labelled?.getAttribute("role")).toBe("img");
    expect(labelled?.getAttribute("aria-label")).toBe("رادار المراقبة");
    expect(labelled?.getAttribute("aria-hidden")).toBeNull();
  });
});
