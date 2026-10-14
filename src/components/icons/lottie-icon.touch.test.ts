/**
 * LottieIcon على اللمس — الإطار الأوّل وحده، ولا حلقة (P0 ٢٠٢٦/١٠/١٤).
 *
 * قِيس على محاكاة iPhone 14 Pro قبل الإصلاح: مؤشّر «حيّ» في الساعة وحده يطلب
 * ‎59.8‎ إطارًا/ث إلى الأبد من `lottie_light`، وكل إطار يكتب سمات SVG فيعيد
 * الأنماط والتخطيط. وعدّاد المشغّلات العاملة في `lottie_light`
 * (‏`playingAnimationsNum`) لا يرتفع إلا بـ`play()` — فـ«لا `play()` أبدًا» هو
 * بعينه «لا طلب إطار واحد». لذا يُحصى هنا `play()` على مشغّلٍ مُقنَّع.
 *
 * والعقد:
 *   ‑ تحت `(pointer: coarse)` يُبنى المشغّل ويُرسم إطاره ٠ ويُعرض الفنّ (الهويّة
 *     كما هي)، ثم **لا `play()` من أيّ باب**: لا من `DOMLoaded`، ولا من مراقب
 *     العبور، ولا من الارتداد عند `complete`.
 *   ‑ مفاتيح السكون الأربعة أشدّ من اللمس: معها لا مشغّل أصلًا.
 *   ‑ تبديل الجهاز في أثناء الجلسة يهدم المشغّل العامل ويبني الساكن.
 *
 * المادة ٣٠: أوّل بندٍ كاشفٌ يحمرّ — بلا لمس يُستدعى `play()` فعلًا، فلو
 * تعطّل المُقنَّع لما مرّت بنود «لا `play()`» أجوف. وقِيس احمرار بنود اللمس
 * الأربعة على المكوّن قبل الإصلاح (‏b996d1e)؛ والأخضر عليه ثلاثة مقصودة: الكاشف،
 * وبندا «المفتاح الأشدّ يغلب» (سلوكٌ قائم يُحرس من التراجع).
 */
import { createElement } from "react";
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LOTTIE_ART_CLASS,
  LOTTIE_STATE_ATTR,
  LottieIcon,
  __resetLottieWarnings,
  type LottieIconProps,
} from "@/components/icons/LottieIcon";

type Listener = (arg?: unknown) => void;

type FakeAnim = {
  config: { container: Element; loop: boolean; autoplay: boolean };
  log: string[];
  emit: (name: string, arg?: unknown) => void;
};

const H = vi.hoisted(() => ({ loaded: [] as unknown[] }));

vi.mock("lottie-web/build/player/lottie_light", () => ({
  default: {
    loadAnimation(config: FakeAnim["config"]) {
      const listeners = new Map<string, Set<Listener>>();
      const log: string[] = [];
      // `loadAnimation` يرسم الإطار ٠ متزامنًا مع `autoplay: false` — كما في
      // المشغّل الحقيقي (‏`gotoFrame()` في `checkLoaded`).
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "g"));
      config.container.appendChild(svg);
      log.push("frame:0");
      const anim = {
        config,
        log,
        emit(name: string, arg?: unknown) {
          for (const cb of [...(listeners.get(name) ?? [])]) cb(arg);
        },
        addEventListener(name: string, cb: Listener) {
          log.push(`add:${name}`);
          const set = listeners.get(name) ?? new Set<Listener>();
          set.add(cb);
          listeners.set(name, set);
        },
        removeEventListener(name: string, cb?: Listener) {
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
        goToAndStop(value: number) {
          log.push(`stop:${value}`);
        },
        setSpeed() {},
        setDirection(value: number) {
          log.push(`direction:${value}`);
        },
      };
      H.loaded.push(anim);
      return anim;
    },
  },
}));

/* ── التفضيلات: تُقرأ حيًّا وتُقلب بحدث `change` ─────────────────────── */

const active = new Set<string>();
const mqListeners = new Map<string, Set<() => void>>();

function installMatchMedia(): void {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => {
      const set = mqListeners.get(query) ?? new Set<() => void>();
      mqListeners.set(query, set);
      return {
        get matches() {
          return active.has(query);
        },
        media: query,
        onchange: null,
        addListener: (fn: () => void) => set.add(fn),
        removeListener: (fn: () => void) => set.delete(fn),
        addEventListener: (_: string, fn: () => void) => set.add(fn),
        removeEventListener: (_: string, fn: () => void) => set.delete(fn),
        dispatchEvent: () => false,
      };
    },
  });
}

async function setMedia(query: string, on: boolean): Promise<void> {
  if (on) active.add(query);
  else active.delete(query);
  await act(async () => {
    for (const fn of [...(mqListeners.get(query) ?? [])]) fn();
  });
}

/* ── مراقب العبور: يُحصى إنشاؤه ويُطلق دخولًا عند الطلب ──────────────── */

let observers: IntersectionObserverCallback[];

class IOStub {
  constructor(cb: IntersectionObserverCallback) {
    observers.push(cb);
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

async function enterViewport(): Promise<void> {
  await act(async () => {
    for (const cb of observers) {
      cb(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        null as unknown as IntersectionObserver,
      );
    }
  });
}

/* ── التركيب ─────────────────────────────────────────────────────────── */

function mountIcon(props: Partial<LottieIconProps> = {}) {
  return render(
    createElement(LottieIcon, {
      src: "/lottie/nx-pulse.json",
      size: 14,
      ...props,
      children: createElement("span", { "data-testid": "static" }),
    }),
  );
}

/** مهلة الخمول الساقطة ثم طابور الاستيراد الكسول. */
async function settle(ms = 500): Promise<void> {
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
  const anim = H.loaded.at(-1) as FakeAnim | undefined;
  if (!anim) throw new Error("لم يُحمَّل مشغّل");
  return anim;
}

async function domLoaded(anim: FakeAnim): Promise<void> {
  await act(async () => anim.emit("DOMLoaded"));
}

const plays = (anim: FakeAnim) => anim.log.filter((e) => e === "play").length;

beforeEach(() => {
  vi.useFakeTimers();
  delete (window as unknown as { requestIdleCallback?: unknown }).requestIdleCallback;
  H.loaded = [];
  observers = [];
  active.clear();
  mqListeners.clear();
  __resetLottieWarnings();
  document.documentElement.removeAttribute("data-nx-motion");
  document.documentElement.classList.remove("safe-mode");
  document.getElementById("nx-lottie-color-sync")?.remove();
  installMatchMedia();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  delete (globalThis as unknown as { IntersectionObserver?: unknown }).IntersectionObserver;
});

describe("LottieIcon على اللمس — الإطار الأوّل وحده، ولا حلقة", () => {
  it("الكاشف يحمرّ: بلا لمس يُستدعى `play()` ويُعلَّق الارتداد (المادة ٣٠)", async () => {
    mountIcon();
    await settle();
    const anim = lastAnim();
    await domLoaded(anim);
    expect(plays(anim)).toBeGreaterThan(0);
    expect(anim.log).toContain("add:complete");
  });

  it("اللمس: يُبنى المشغّل ويُرسم الإطار ٠ ويظهر الفنّ — ولا `play()` من `DOMLoaded`", async () => {
    active.add("(pointer: coarse)");
    const { container } = mountIcon();
    await settle();
    expect(H.loaded, "اللمس ليس سكونًا: الفنّ يُرسم").toHaveLength(1);
    const anim = lastAnim();
    expect(anim.config.autoplay).toBe(false);
    expect(anim.config.loop).toBe(false);
    expect(anim.log).toContain("frame:0");

    await domLoaded(anim);
    expect(plays(anim), "اللمس يشغّل الحلقة").toBe(0);
    // الفنّ هو الظاهر — الرمز الساكن مخفيّ تحته كما على سطح المكتب.
    expect(container.querySelector(`[${LOTTIE_STATE_ATTR}="playing"]`)).not.toBeNull();
    expect(container.querySelector(`.${LOTTIE_ART_CLASS} svg`)).not.toBeNull();
  });

  it("اللمس: لا مراقب عبور يوقظها عند الدخول إلى الشاشة", async () => {
    (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = IOStub;
    active.add("(pointer: coarse)");
    mountIcon();
    await settle();
    const anim = lastAnim();
    await domLoaded(anim);
    await enterViewport();
    expect(observers, "مراقب عبور على اللمس — سيشغّلها عند الدخول").toHaveLength(0);
    expect(plays(anim)).toBe(0);
  });

  it("اللمس: لا ارتداد — `complete` لا يُعيد `play()`", async () => {
    active.add("(pointer: coarse)");
    mountIcon();
    await settle();
    const anim = lastAnim();
    await domLoaded(anim);
    expect(anim.log, "الارتداد مُعلَّق على اللمس").not.toContain("add:complete");
    await act(async () => anim.emit("complete"));
    await settle(5000);
    expect(plays(anim)).toBe(0);
    expect(anim.log.filter((e) => e.startsWith("direction:"))).toEqual([]);
  });

  it.each([
    ["«قلّل الحركة»", () => active.add("(prefers-reduced-motion: reduce)")],
    ["الوضع الآمن", () => document.documentElement.classList.add("safe-mode")],
  ])("اللمس مع %s: المفتاح الأشدّ يغلب — لا مشغّل أصلًا", async (_name, activate) => {
    active.add("(pointer: coarse)");
    activate();
    const { getByTestId, container } = mountIcon();
    await settle();
    expect(H.loaded).toHaveLength(0);
    expect(getByTestId("static")).toBeInTheDocument();
    expect(container.querySelector(`.${LOTTIE_ART_CLASS}`)).toBeNull();
  });

  it("تبديل الجهاز إلى اللمس في أثناء التشغيل: يُهدم العامل ويُبنى الساكن", async () => {
    (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = IOStub;
    mountIcon();
    await settle();
    const playing = lastAnim();
    await domLoaded(playing);
    await enterViewport();
    expect(plays(playing)).toBeGreaterThan(0);

    await setMedia("(pointer: coarse)", true);
    expect(playing.log, "المشغّل العامل بقي حيًّا بعد التحوّل إلى اللمس").toContain("destroy");
    await settle();
    expect(H.loaded).toHaveLength(2);
    const frozen = lastAnim();
    await domLoaded(frozen);
    await enterViewport();
    expect(plays(frozen)).toBe(0);
  });
});
