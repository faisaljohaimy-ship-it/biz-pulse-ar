/**
 * عقد سلوك «فيلم التوأم الرقمي» مُصيَّرًا (jsdom) — المشغّل المضمَّن وصفحة `/cinematic`.
 *
 * ما يكسره التعديل ولا يراه tsc ولا البناء:
 *   • فيلمٌ يُركَّب أو يُطلب ملفّه قبل أن يظهر إطاره، أو يبدأ لمن طلب تقليل الحركة أو توفير البيانات
 *     أو أوقف الحركة في النظام؛
 *   • زرٌّ يتغيّر عنصره عبر الحالات فيسقط التركيز عند الإعادة (WCAG 2.4.3)، أو يختفي (WCAG 2.2.2)؛
 *   • فيلمٌ انتهى فيُعاد وحده — بالعودة إلى الإطار أو بعودة بوّابة أو بإغلاق لوحة سَدِيد؛
 *   • تشغيلٌ ممنوع يترك الزرّ «يُشغّل» في الفراغ، أو تعذّرُ ملفٍّ يترك إطارًا أسود بدل الملصق؛
 *   • عنوانٌ داخل مساحة الفيديو، أو iframe، أو صورةٌ خارجية في /cinematic.
 *
 * المحرّك مزيّف على مستوى `HTMLMediaElement.prototype` لأن المشغّل يستدعي `play()` عند التركيب
 * (لا سمة `autoPlay`)، والمراقب مزيّف كذلك: jsdom بلا `IntersectionObserver`، والاختبار يقرّر الظهور.
 */
import { createElement, useRef, useState, type ReactNode } from "react";
import { act, fireEvent, render } from "@testing-library/react";
import { axe } from "jest-axe";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n";
import { TwinFilmPlayer, type TwinFilmHandle } from "@/components/twin/TwinFilmPlayer";
import type { FilmControl } from "@/components/twin/twin-film-model";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
  Link: ({ children, to, ...rest }: { children?: ReactNode; to: string }) =>
    createElement("a", { href: to, ...rest }, children),
}));

/* ── محرّك الوسائط المزيّف ─────────────────────────────────────────────── */

type MediaState = { paused: boolean; ended: boolean; time: number };
const states = new WeakMap<HTMLMediaElement, MediaState>();
const st = (el: HTMLMediaElement): MediaState => {
  let s = states.get(el);
  if (!s) {
    s = { paused: true, ended: false, time: 0 };
    states.set(el, s);
  }
  return s;
};

/** نهاية المدى القابل للقفز (ث)؛ 0 ⇒ لا مدى بعد. */
let seekableEnd = 30;

/**
 * اسم الاستثناء الذي يرفض به `play()` القادم، أو `null`. مرّةً واحدة ما لم يُرفع `refuseCount`:
 * فيلمٌ بصوته يُحاوَل بصوتٍ ثم صامتًا، فالمنع الكامل (توفير الطاقة) يرفض المحاولتين.
 */
let refuse: string | null = null;
let refuseCount = 1;

const play = vi.fn(function (this: HTMLMediaElement) {
  if (refuse) {
    const name = refuse;
    if (--refuseCount <= 0) {
      refuse = null;
      refuseCount = 1;
    }
    return Promise.reject(new DOMException("blocked", name));
  }
  const s = st(this);
  s.paused = false;
  s.ended = false;
  this.dispatchEvent(new Event("play"));
  this.dispatchEvent(new Event("playing"));
  return Promise.resolve();
});
const pause = vi.fn(function (this: HTMLMediaElement) {
  const s = st(this);
  if (s.paused) return;
  s.paused = true;
  this.dispatchEvent(new Event("pause"));
});
const load = vi.fn();

beforeAll(() => {
  const proto = HTMLMediaElement.prototype;
  const def = (name: string, descriptor: PropertyDescriptor) =>
    Object.defineProperty(proto, name, { configurable: true, ...descriptor });
  def("paused", {
    get(this: HTMLMediaElement) {
      return st(this).paused;
    },
  });
  def("ended", {
    get(this: HTMLMediaElement) {
      return st(this).ended;
    },
  });
  def("readyState", { get: () => 4 });
  // ما يُتاح القفز إليه: يتبدّل بقرار الاختبار (مضيفٌ بلا Range لا يتيح إلا ما حُمِّل).
  def("seekable", {
    get: () => ({ length: seekableEnd > 0 ? 1 : 0, start: () => 0, end: () => seekableEnd }),
  });
  def("duration", { get: () => 30 });
  def("currentTime", {
    get(this: HTMLMediaElement) {
      return st(this).time;
    },
    set(this: HTMLMediaElement, v: number) {
      const s = st(this);
      s.time = v;
      s.ended = false;
    },
  });
  def("play", { value: play });
  def("pause", { value: pause });
  def("load", { value: load });
});

/** يُنهي الفيلم طبيعيًّا: يقف على آخر إطار ثم يُطلق `pause` فـ`ended` كالمحرّك. */
async function finish(video: HTMLVideoElement) {
  const s = st(video);
  s.time = 30;
  s.paused = true;
  s.ended = true;
  await act(async () => {
    fireEvent(video, new Event("pause"));
    fireEvent(video, new Event("ended"));
  });
}

/** مراقب إطارٍ مزيّف — الاختبار يقرّر الظهور. */
class FakeObserver {
  static all: FakeObserver[] = [];
  constructor(readonly cb: IntersectionObserverCallback) {
    FakeObserver.all.push(this);
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
  /** سجلّاتٌ متراكمة تصل في استدعاءٍ واحد (الخيط مشغول) — الأقدم أوّلًا كما في المواصفة. */
  static batch(...seen: boolean[]) {
    for (const o of FakeObserver.all) {
      o.cb(
        seen.map(
          (visible) =>
            ({
              isIntersecting: visible,
              intersectionRatio: visible ? 1 : 0,
            }) as IntersectionObserverEntry,
        ),
        o as unknown as IntersectionObserver,
      );
    }
  }
  static show(visible: boolean) {
    for (const o of FakeObserver.all) {
      o.cb(
        [
          {
            isIntersecting: visible,
            intersectionRatio: visible ? 1 : 0,
          } as IntersectionObserverEntry,
        ],
        o as unknown as IntersectionObserver,
      );
    }
  }
}

function setMedia(opts: { reduce?: boolean; coarse?: boolean } = {}) {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches:
          (query.includes("prefers-reduced-motion") && opts.reduce === true) ||
          (query === "(pointer: coarse)" && opts.coarse === true),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );
}

function setConnection(value: { saveData?: boolean; effectiveType?: string } | null) {
  if (value === null) delete (navigator as unknown as { connection?: unknown }).connection;
  else Object.defineProperty(navigator, "connection", { configurable: true, value });
}

/** اتصالٌ حيّ: يُبدَّل في أثناء العرض ويبلغ المستمعين كحدث `change` الحقيقي. */
function liveConnection(initial: { saveData?: boolean; effectiveType?: string }) {
  const listeners = new Set<() => void>();
  const conn = {
    ...initial,
    addEventListener: (_type: string, l: () => void) => void listeners.add(l),
    removeEventListener: (_type: string, l: () => void) => void listeners.delete(l),
  };
  Object.defineProperty(navigator, "connection", { configurable: true, value: conn });
  return {
    set(next: { saveData?: boolean; effectiveType?: string }) {
      Object.assign(conn, next);
      listeners.forEach((l) => l());
    },
  };
}

/** `prefers-reduced-motion` حيّ: يُبدَّل في أثناء العرض ويبلغ مستمعي `change`. */
function liveReducedMotion() {
  const listeners = new Set<() => void>();
  let reduce = false;
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        get matches() {
          return query.includes("prefers-reduced-motion") && reduce;
        },
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: (_t: string, l: () => void) => void listeners.add(l),
        removeEventListener: (_t: string, l: () => void) => void listeners.delete(l),
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  );
  return {
    set(next: boolean) {
      reduce = next;
      listeners.forEach((l) => l());
    },
  };
}

/** عرض الإطار المرسوم يتبدّل بقرار الاختبار (jsdom بلا تخطيط) ومراقب أحجامٍ مزيّف يبلغ بالتبدّل. */
function liveFrame(initial: number) {
  let width = initial;
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    () =>
      ({ width, height: width * (9 / 16), top: 0, left: 0, right: width, bottom: 0 }) as DOMRect,
  );
  const watchers = new Set<() => void>();
  class FakeResize {
    constructor(cb: () => void) {
      watchers.add(cb);
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal("ResizeObserver", FakeResize);
  return {
    resize(next: number) {
      width = next;
      watchers.forEach((w) => w());
    },
  };
}

const ROOT_ATTRS = ["data-nx-motion", "data-nx-motion-paused", "data-sadeed-panel"];

beforeEach(() => {
  FakeObserver.all = [];
  vi.stubGlobal("IntersectionObserver", FakeObserver);
  play.mockClear();
  pause.mockClear();
  load.mockClear();
  refuse = null;
  seekableEnd = 30;
  setMedia();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  const root = document.documentElement;
  for (const a of ROOT_ATTRS) root.removeAttribute(a);
  root.classList.remove("safe-mode");
  setConnection(null);
  localStorage.removeItem("locale");
  localStorage.removeItem("nx-brand-motion");
  Reflect.deleteProperty(document, "fullscreenEnabled");
});

/* ── أدوات التركيب ─────────────────────────────────────────────────────── */

const withI18n = (ui: ReactNode) => createElement(I18nProvider, null, ui);

/** يركّب المشغّل، ويفرغ مهمّة البوّابة (أوّل effect). الإطار غير ظاهر بعد. */
async function mount(ui: ReactNode = createElement(TwinFilmPlayer, { priority: true })) {
  const view = render(withI18n(ui));
  await act(async () => {});
  return view;
}

/** يركّب المشغّل ويُظهر إطاره. */
async function mountVisible(ui?: ReactNode) {
  const view = await mount(ui);
  await act(async () => {
    FakeObserver.show(true);
  });
  return view;
}

const videoOf = (c: HTMLElement) => c.querySelector<HTMLVideoElement>("video");
/** زرّ التشغيل الواحد — ليس زرّ الصوت (الراية `TWIN_FILM_HAS_AUDIO` تضيف ثانيًا بجواره). */
const toggleOf = (c: HTMLElement) => c.querySelector<HTMLButtonElement>(".twin-film-toggle")!;

/* ════════════════════════════════════════════════════════════════════════ */

describe("المشغّل — الملصق أوّلًا، والفيلم بعد ظهور الإطار", () => {
  it("قبل الظهور: ملصقٌ فقط، لا عنصر فيديو ولا تشغيل، وأبعاد الملصق على الوسم", async () => {
    const view = await mount();
    expect(videoOf(view.container), "فيلمٌ قبل ظهور الإطار").toBeNull();
    expect(play).not.toHaveBeenCalled();
    const img = view.container.querySelector("img.twin-film-poster")!;
    expect(img.getAttribute("src")).toBe("/media/twin/sadeed-twin-poster.webp");
    expect(img.getAttribute("alt"), "الملصق زخرفةٌ — الوصف على المنطقة").toBe("");
    expect([img.getAttribute("width"), img.getAttribute("height")]).toEqual(["1280", "720"]);
    expect(img.getAttribute("fetchpriority")).toBe("high");
    expect(img.getAttribute("loading")).toBe("eager");
    view.getByRole("button", { name: "تشغيل الفيلم" });
    view.unmount();
  });

  it("وبلا priority الملصق كسول (تحت الطيّة في /sec/twin)", async () => {
    const view = await mount(createElement(TwinFilmPlayer));
    const img = view.container.querySelector("img.twin-film-poster")!;
    expect(img.getAttribute("loading")).toBe("lazy");
    expect(img.getAttribute("fetchpriority")).toBe("auto");
    view.unmount();
  });

  it("ظهور الإطار يركّب الفيلم ويشغّله: مضمَّنٌ بلا loop ولا controls ولا autoplay، بمصدرين", async () => {
    const view = await mountVisible();
    const video = videoOf(view.container)!;
    expect(video, "الفيلم لم يُركَّب بعد الظهور").not.toBeNull();
    expect(play).toHaveBeenCalledTimes(1);
    // الفيلم بصوته: يُحاوَل التشغيل بصوتٍ أوّلًا (سلوك الصوت في `twin-film-sound.contract.test.tsx`).
    expect(video.muted).toBe(false);
    expect(video.loop).toBe(false);
    for (const attr of ["controls", "autoplay", "loop", "poster"]) {
      expect(video.hasAttribute(attr), `سمة ${attr}`).toBe(false);
    }
    expect(video.hasAttribute("playsinline")).toBe(true);
    expect(video.getAttribute("aria-hidden")).toBe("true");
    expect(video.getAttribute("tabindex")).toBe("-1");
    expect(
      [...video.querySelectorAll("source")].map((s) => [
        s.getAttribute("src"),
        s.getAttribute("type"),
      ]),
    ).toEqual([
      ["/media/twin/sadeed-twin-1280.mp4", "video/mp4"],
      ["/media/twin/sadeed-twin-1280.webm", "video/webm"],
    ]);
    // ويظهر حين يُعرض إطاره فعلًا (حدث `playing`) — لا قبله.
    expect(video.hasAttribute("data-ready")).toBe(true);
    view.getByRole("button", { name: "إيقاف الفيلم مؤقتًا" });
    view.unmount();
  });

  it("يقف عند الخروج من الإطار ويستأنف بالعودة — لا ما أوقفه الزائر", async () => {
    const view = await mountVisible();
    await act(async () => {
      FakeObserver.show(false);
    });
    expect(pause, "الخروج لم يوقف الفيلم").toHaveBeenCalledTimes(1);
    view.getByRole("button", { name: "متابعة الفيلم" });
    await act(async () => {
      FakeObserver.show(true);
    });
    expect(play, "العودة لم تستأنف").toHaveBeenCalledTimes(2);
    view.getByRole("button", { name: "إيقاف الفيلم مؤقتًا" });
    // الزائر يوقفه بزرّه ⇒ لا يستأنفه الظهور.
    fireEvent.click(view.getByRole("button", { name: "إيقاف الفيلم مؤقتًا" }));
    view.getByRole("button", { name: "متابعة الفيلم" });
    await act(async () => {
      FakeObserver.show(false);
      FakeObserver.show(true);
    });
    expect(play, "الظهور أنقض إيقاف الزائر").toHaveBeenCalledTimes(2);
    fireEvent.click(view.getByRole("button", { name: "متابعة الفيلم" }));
    expect(play).toHaveBeenCalledTimes(3);
    view.getByRole("button", { name: "إيقاف الفيلم مؤقتًا" });
    view.unmount();
  });
});

describe("المشغّل — تعذّر الملصق نفسه", () => {
  it("حدث الخطأ: يزول الملصق فلا أيقونة صورةٍ مكسورة، ويبقى الإطار والزرّ", async () => {
    const view = await mount();
    const img = view.container.querySelector("img.twin-film-poster")!;
    await act(async () => {
      fireEvent.error(img);
    });
    expect(view.container.querySelector("img.twin-film-poster"), "ملصقٌ مكسور بقي").toBeNull();
    expect(view.container.querySelector(".twin-film-frame")).not.toBeNull();
    view.getByRole("button", { name: "تشغيل الفيلم" });
    view.unmount();
  });

  it("وفشلٌ سبق الترطيب (لا يصل حدثه إلى React) يُكتشف بحاله: مكتملٌ بلا عرض", async () => {
    vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(true);
    const view = await mount();
    expect(view.container.querySelector("img.twin-film-poster")).toBeNull();
    view.unmount();
  });

  it("وملصقٌ يُحمَّل (لم يكتمل بعد) يبقى", async () => {
    const view = await mount();
    expect(view.container.querySelector("img.twin-film-poster")).not.toBeNull();
    view.unmount();
  });
});

describe("المشغّل — مرّةً ثم يثبت، والإعادة بيد الزائر والزرّ هو نفسه", () => {
  it("سباق: يخرج الإطار فيقف الفيلم ثم تصل النهاية — العودة لا تستأنف المنتهي", async () => {
    const view = await mountVisible();
    const video = videoOf(view.container)!;
    await act(async () => {
      FakeObserver.show(false);
    });
    await finish(video);
    play.mockClear();
    await act(async () => {
      FakeObserver.show(true);
    });
    expect(play, "العودة استأنفت فيلمًا انتهى").not.toHaveBeenCalled();
    view.getByRole("button", { name: "إعادة عرض الفيلم" });
    view.unmount();
  });

  it("النهاية: الفيلم يبقى على آخر إطار، والعودة إلى الإطار لا تعيده", async () => {
    const view = await mountVisible();
    const video = videoOf(view.container)!;
    await finish(video);
    view.getByRole("button", { name: "إعادة عرض الفيلم" });
    expect(videoOf(view.container), "الفيلم زال بدل أن يثبت على آخر إطار").toBe(video);
    expect(video.loop).toBe(false);
    play.mockClear();
    await act(async () => {
      FakeObserver.show(false);
      FakeObserver.show(true);
    });
    expect(play, "الظهور أعاد فيلمًا انتهى").not.toHaveBeenCalled();
    view.unmount();
  });

  it("الإعادة: من الصفر، والزرّ عنصرٌ واحدٌ يحتفظ بالتركيز (WCAG 2.4.3)", async () => {
    const view = await mountVisible();
    const video = videoOf(view.container)!;
    const button = toggleOf(view.container);
    await finish(video);
    expect(toggleOf(view.container)).toBe(button);
    button.focus();
    play.mockClear();
    fireEvent.click(button);
    expect(play).toHaveBeenCalledTimes(1);
    expect(video.currentTime).toBe(0);
    const after = view.getByRole("button", { name: "إيقاف الفيلم مؤقتًا" });
    expect(after, "الزرّ تغيّر عنصره عند الإعادة").toBe(button);
    expect(document.activeElement, "سقط التركيز عن الزرّ").toBe(button);
    view.unmount();
  });

  it("وفيلمٌ انتهى لا يبدأ وحده إن عادت بوّابةٌ بعد زوالها — يعرض «إعادة عرض الفيلم»", async () => {
    const view = await mountVisible();
    await finish(videoOf(view.container)!);
    const root = document.documentElement;
    await act(async () => {
      root.setAttribute("data-nx-motion-paused", "1");
    });
    expect(videoOf(view.container), "الإيقاف لم يُسقط الفيلم").toBeNull();
    play.mockClear();
    await act(async () => {
      root.removeAttribute("data-nx-motion-paused");
    });
    // الفيلم يعود عنصرًا مركَّبًا (البوّابة مفتوحة) لكنّه لا يبدأ: انتهى قبل الإيقاف.
    expect(videoOf(view.container), "العنصر لم يعد بعد زوال البوّابة").not.toBeNull();
    expect(play, "عاد الفيلم المنتهي وحده بعد البوّابة").not.toHaveBeenCalled();
    await act(async () => {
      FakeObserver.show(true);
    });
    expect(play, "عاد الفيلم المنتهي وحده").not.toHaveBeenCalled();
    view.getByRole("button", { name: "إعادة عرض الفيلم" });
    // وبيد الزائر: الإعادة تشغّله.
    fireEvent.click(view.getByRole("button", { name: "إعادة عرض الفيلم" }));
    expect(videoOf(view.container)).not.toBeNull();
    expect(play).toHaveBeenCalledTimes(1);
    view.unmount();
  });
});

describe("البوابات — الفيلم اختيارٌ لا افتراض", () => {
  it("تقليل الحركة: ملصقٌ وزرّ تشغيل وتلميح، وبنقرة الزائر وحدها يبدأ", async () => {
    setMedia({ reduce: true });
    const view = await mountVisible();
    expect(videoOf(view.container), "فيلمٌ لمن طلب تقليل الحركة").toBeNull();
    expect(play).not.toHaveBeenCalled();
    expect(view.getByRole("status").textContent).toMatch(/تقليل الحركة/);
    fireEvent.click(view.getByRole("button", { name: "تشغيل الفيلم" }));
    expect(videoOf(view.container), "النقرة لم تشغّل").not.toBeNull();
    expect(play).toHaveBeenCalledTimes(1);
    view.getByRole("button", { name: "إيقاف الفيلم مؤقتًا" });
    expect(view.queryByRole("status")).toBeNull();
    view.unmount();
  });

  it.each([
    ["saveData", { saveData: true }],
    ["slow-2g", { effectiveType: "slow-2g" }],
    ["2g", { effectiveType: "2g" }],
    ["3g", { effectiveType: "3g" }],
  ])("توفير البيانات/اتصال بطيء (%s): ملصقٌ وزرّ تشغيل بلا بدءٍ تلقائي", async (_name, conn) => {
    setConnection(conn);
    const view = await mountVisible();
    expect(videoOf(view.container)).toBeNull();
    expect(view.getByRole("status").textContent).toMatch(/توفير البيانات/);
    fireEvent.click(view.getByRole("button", { name: "تشغيل الفيلم" }));
    expect(videoOf(view.container)).not.toBeNull();
    view.unmount();
  });

  it("اتصالٌ سريع (4g) لا يمنع البدء التلقائي", async () => {
    setConnection({ effectiveType: "4g", saveData: false });
    const view = await mountVisible();
    expect(videoOf(view.container)).not.toBeNull();
    view.unmount();
  });

  it.each([
    ["مفتاح النظام", () => document.documentElement.setAttribute("data-nx-motion", "off"), false],
    [
      "زرّ إيقاف الحركة",
      () => document.documentElement.setAttribute("data-nx-motion-paused", "1"),
      true,
    ],
    ["الوضع الآمن", () => document.documentElement.classList.add("safe-mode"), false],
  ])(
    "إيقاف الحركة في النظام (%s): ملصقٌ فقط والزرّ مُعلَّقٌ بسببه لا يُشغّل",
    async (_name, apply, homeButtonClearsIt) => {
      apply();
      const view = await mountVisible();
      expect(videoOf(view.container), "فيلمٌ والحركة موقوفة في النظام").toBeNull();
      const button = view.getByRole("button", { name: "تشغيل الفيلم" });
      expect(button.getAttribute("aria-disabled")).toBe("true");
      expect(button.getAttribute("aria-describedby")).toBe(view.getByRole("status").id);
      expect(view.getByRole("status").textContent).toMatch(/الحركة موقوفة في النظام/);
      // التلميح بالسبب (#13/#17): زرّ الرئيسية لا يُحيل إليه إلا حيث يزيل السببَ فعلًا.
      if (homeButtonClearsIt) {
        expect(view.getByRole("status").textContent).toMatch(
          /زرّ «إيقاف الحركة» في الصفحة الرئيسية/,
        );
      } else {
        expect(
          view.getByRole("status").textContent,
          "تلميحٌ يحيل إلى زرّ الرئيسية وهو لا يزيل هذا السبب",
        ).not.toMatch(/الصفحة الرئيسية|إيقاف الحركة/);
      }
      fireEvent.click(button);
      expect(videoOf(view.container), "النقرة شغّلت فيلمًا والحركة موقوفة").toBeNull();
      expect(play).not.toHaveBeenCalled();
      view.unmount();
    },
  );

  it("الوضع الآمن مع زرّ الإيقاف معًا: لا إحالة إلى زرّ الرئيسية (لن يزيل الوضع الآمن)", async () => {
    document.documentElement.setAttribute("data-nx-motion-paused", "1");
    document.documentElement.classList.add("safe-mode");
    const view = await mountVisible();
    expect(view.getByRole("status").textContent).not.toMatch(/الصفحة الرئيسية/);
    view.unmount();
  });

  it("الإنجليزية: الإحالة إلى زرّ الرئيسية للإيقاف بالزرّ وحده", async () => {
    localStorage.setItem("locale", "en");
    document.documentElement.classList.add("safe-mode");
    const safe = await mountVisible();
    expect(safe.getByRole("status").textContent).toMatch(/Motion is turned off/);
    expect(safe.getByRole("status").textContent).not.toMatch(/home page/i);
    safe.unmount();
    document.documentElement.classList.remove("safe-mode");
    document.documentElement.setAttribute("data-nx-motion-paused", "1");
    const paused = await mountVisible();
    expect(paused.getByRole("status").textContent).toMatch(/“Pause motion” on the home page/);
    paused.unmount();
  });

  it("إيقاف الحركة المحفوظ (nx-brand-motion) يُحترم عند التحميل المباشر دون سمة الرئيسية (#14)", async () => {
    localStorage.setItem("nx-brand-motion", "paused");
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const removeItem = vi.spyOn(Storage.prototype, "removeItem");
    const view = await mountVisible();
    expect(videoOf(view.container), "فيلمٌ والزائر أوقف الحركة وحفظ اختياره").toBeNull();
    expect(play).not.toHaveBeenCalled();
    const button = view.getByRole("button", { name: "تشغيل الفيلم" });
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(view.getByRole("status").textContent).toMatch(/زرّ «إيقاف الحركة» في الصفحة الرئيسية/);
    // قراءةٌ فقط: لا كتابة ولا حذف ولا سمة (كاتب السمة صفّ الرئيسية وحده).
    expect(setItem).not.toHaveBeenCalled();
    expect(removeItem).not.toHaveBeenCalled();
    expect(document.documentElement.hasAttribute("data-nx-motion-paused")).toBe(false);
    // والزائر يستأنف من الرئيسية: يزول المفتاح ويصل الحدث المشترك ⇒ يعود الفيلم.
    localStorage.removeItem("nx-brand-motion");
    await act(async () => {
      window.dispatchEvent(new CustomEvent("nx:motion-pause", { detail: { paused: false } }));
    });
    expect(videoOf(view.container), "الفيلم لم يعد بعد الاستئناف").not.toBeNull();
    view.unmount();
  });

  it("وقيمة مفتاحٍ غير «paused» أو تخزينٌ محجوب ⇒ لا اختيار محفوظ، والفيلم يبدأ", async () => {
    localStorage.setItem("nx-brand-motion", "playing");
    const other = await mountVisible();
    expect(videoOf(other.container)).not.toBeNull();
    other.unmount();
    localStorage.removeItem("nx-brand-motion");
    const real = Storage.prototype.getItem;
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(function (
      this: Storage,
      key: string,
    ) {
      if (key === "nx-brand-motion") throw new DOMException("blocked", "SecurityError");
      return real.call(this, key);
    });
    const blocked = await mountVisible();
    expect(videoOf(blocked.container)).not.toBeNull();
    blocked.unmount();
  });

  it("تبدّل البوّابة في أثناء العرض: إيقاف الحركة يُسقط الفيلم إلى الملصق، وزواله يعيده", async () => {
    const view = await mountVisible();
    expect(videoOf(view.container)).not.toBeNull();
    const root = document.documentElement;
    await act(async () => {
      root.setAttribute("data-nx-motion-paused", "1");
    });
    expect(videoOf(view.container), "الفيلم بقي بعد إيقاف الحركة").toBeNull();
    expect(load, "لم يُحرَّر المفكّك عند الفكّ").toHaveBeenCalled();
    expect(toggleOf(view.container).getAttribute("aria-disabled")).toBe("true");
    play.mockClear();
    await act(async () => {
      root.removeAttribute("data-nx-motion-paused");
    });
    expect(videoOf(view.container), "الفيلم لم يعد بعد استئناف الحركة").not.toBeNull();
    expect(play).toHaveBeenCalledTimes(1);
    view.unmount();
  });

  it("تحت لوحة سَدِيد على اللمس يقف الفيلم ويُستأنف بإغلاقها (الطبقة المشتركة)", async () => {
    setMedia({ coarse: true });
    const view = await mountVisible();
    const root = document.documentElement;
    await act(async () => {
      root.setAttribute("data-sadeed-panel", "open");
    });
    expect(pause, "اللوحة لم توقف الفيلم على اللمس").toHaveBeenCalled();
    view.getByRole("button", { name: "متابعة الفيلم" });
    await act(async () => {
      root.removeAttribute("data-sadeed-panel");
    });
    expect(play, "إغلاق اللوحة لم يستأنف الفيلم الجاري").toHaveBeenCalledTimes(2);
    view.unmount();
  });
});

describe("المشغّل — تبدّل الاتصال والظهور والإطار في أثناء الجلسة", () => {
  it("اتصالٌ يتذبذب 4g⇄3g والفيلم يعمل: لا يُفكّ ولا يُعاد من الصفر (#11)", async () => {
    const conn = liveConnection({ effectiveType: "4g" });
    const view = await mountVisible();
    const video = videoOf(view.container)!;
    expect(play).toHaveBeenCalledTimes(1);
    load.mockClear();
    await act(async () => conn.set({ effectiveType: "3g" }));
    expect(videoOf(view.container), "هبوط الاتصال فكّ فيلمًا يعمل").toBe(video);
    expect(load, "حُرّر المفكّك في منتصف العرض").not.toHaveBeenCalled();
    expect(view.queryByRole("status"), "تلميح «لا يبدأ وحده» فوق فيلمٍ يعمل").toBeNull();
    view.getByRole("button", { name: "إيقاف الفيلم مؤقتًا" });
    await act(async () => conn.set({ effectiveType: "4g" }));
    expect(videoOf(view.container)).toBe(video);
    expect(play, "عودة الاتصال أعادت الفيلم من الصفر").toHaveBeenCalledTimes(1);
    view.unmount();
  });

  it("وفيلمٌ انتهى يبقى على آخر إطار عبر تذبذب الاتصال — لا يُستبدل بالملصق (#11)", async () => {
    const conn = liveConnection({ effectiveType: "4g" });
    const view = await mountVisible();
    const video = videoOf(view.container)!;
    await finish(video);
    await act(async () => conn.set({ saveData: true }));
    await act(async () => conn.set({ saveData: false }));
    expect(videoOf(view.container), "الفيلم المنتهي فُكّ ثم رُكّب جديدًا بلا إطارٍ مرسوم").toBe(
      video,
    );
    expect(video.hasAttribute("data-ready")).toBe(true);
    view.getByRole("button", { name: "إعادة عرض الفيلم" });
    view.unmount();
  });

  it("وتقليل الحركة الذي يُفعَّل في أثناء العرض يُسقط الفيلم إلى الملصق (حارس: لا يعمّه الإصلاح)", async () => {
    const reduce = liveReducedMotion();
    const view = await mountVisible();
    expect(videoOf(view.container)).not.toBeNull();
    await act(async () => reduce.set(true));
    expect(videoOf(view.container), "تقليل الحركة لم يُسقط الفيلم").toBeNull();
    expect(view.getByRole("status").textContent).toMatch(/تقليل الحركة/);
    view.unmount();
  });

  it("وإيقاف الحركة في النظام يسحب «حقّ البقاء»: بعد زواله على اتصالٍ بطيء لا يبدأ وحده (#11)", async () => {
    const conn = liveConnection({ effectiveType: "4g" });
    const view = await mountVisible();
    await act(async () => conn.set({ effectiveType: "3g" }));
    expect(videoOf(view.container)).not.toBeNull();
    const root = document.documentElement;
    await act(async () => {
      root.setAttribute("data-nx-motion-paused", "1");
    });
    expect(videoOf(view.container), "الإيقاف لم يُسقط الفيلم").toBeNull();
    play.mockClear();
    await act(async () => {
      root.removeAttribute("data-nx-motion-paused");
    });
    expect(videoOf(view.container), "فيلمٌ بدأ وحده على اتصالٍ بطيء").toBeNull();
    expect(play).not.toHaveBeenCalled();
    view.getByRole("button", { name: "تشغيل الفيلم" });
    view.unmount();
  });

  it("سجلّاتٌ متراكمة في استدعاءٍ واحد: الأحدث يحكم لا الأقدم (#12)", async () => {
    // [دخل، خرج] ⇒ خارجٌ الآن: لا يُركَّب ولا يبدأ.
    const hidden = await mount();
    await act(async () => FakeObserver.batch(true, false));
    expect(videoOf(hidden.container), "فيلمٌ لإطارٍ غير ظاهر").toBeNull();
    expect(play).not.toHaveBeenCalled();
    // [خرج، دخل] ⇒ ظاهرٌ الآن: يبدأ.
    await act(async () => FakeObserver.batch(false, true));
    expect(videoOf(hidden.container)).not.toBeNull();
    expect(play).toHaveBeenCalledTimes(1);
    // [خرج، دخل] والفيلم يعمل ⇒ لا يقف (الأحدث ظاهر).
    pause.mockClear();
    await act(async () => FakeObserver.batch(false, true));
    expect(pause, "السجلّ الأقدم أوقف فيلمًا ظاهرًا").not.toHaveBeenCalled();
    // [دخل، خرج] والفيلم يعمل ⇒ يقف (الأحدث خارج).
    await act(async () => FakeObserver.batch(true, false));
    expect(pause, "السجلّ الأقدم أبقى فيلمًا يعمل خارج الإطار").toHaveBeenCalledTimes(1);
    hidden.unmount();
  });

  it("الدرجة تُرقّى ولا تُخفَّض: إطارٌ يكبر (تدوير/ملء الشاشة) يرفع 640 إلى 1280 (#15)", async () => {
    const frame = liveFrame(358);
    const view = await mountVisible();
    const sources = () =>
      [...videoOf(view.container)!.querySelectorAll("source")].map((s) => s.getAttribute("src"));
    expect(sources()[0]).toBe("/media/twin/sadeed-twin-640.mp4");
    // الفيلم يعمل ⇒ لا تبديل في أثناء العرض (وميض الملصق)؛ يُؤجَّل إلى أوّل توقف.
    load.mockClear();
    await act(async () => frame.resize(1200));
    expect(sources()[0], "بُدِّلت الدرجة في أثناء العرض").toBe("/media/twin/sadeed-twin-640.mp4");
    expect(load).not.toHaveBeenCalled();
    const video = videoOf(view.container)!;
    st(video).time = 12;
    // الزائر يوقف ⇒ تُطبَّق الترقية في موضعه: المصدران يتبدّلان وتُعاد القراءة ويُستعاد الزمن.
    fireEvent.click(view.getByRole("button", { name: "إيقاف الفيلم مؤقتًا" }));
    expect(sources()).toEqual([
      "/media/twin/sadeed-twin-1280.mp4",
      "/media/twin/sadeed-twin-1280.webm",
    ]);
    expect(videoOf(view.container), "الترقية استبدلت العنصر").toBe(video);
    expect(load, "لم تُعَد قراءة المصدر").toHaveBeenCalledTimes(1);
    st(video).time = 0; // المحرّك يصفّر الزمن عند `load()`
    await act(async () => {
      fireEvent(video, new Event("loadedmetadata"));
    });
    expect(video.currentTime, "ضاع موضع الفيلم عند الترقية").toBe(12);
    expect(video.paused, "الترقية استأنفت فيلمًا أوقفه الزائر").toBe(true);
    view.getByRole("button", { name: "متابعة الفيلم" });
    // ولا تخفيض: الإطار يصغر فتبقى الدرجة الكبرى.
    load.mockClear();
    await act(async () => frame.resize(300));
    expect(sources()[0]).toBe("/media/twin/sadeed-twin-1280.mp4");
    expect(load).not.toHaveBeenCalled();
    view.unmount();
  });

  it("مضيفٌ بلا Range: الموضع لا يُقفَز إليه قبل أن يُحمَّل — يُرجَأ ولا يعود الفيلم إلى 0 بصمت (#15)", async () => {
    const frame = liveFrame(358);
    const view = await mountVisible();
    const video = videoOf(view.container)!;
    await act(async () => frame.resize(1200));
    st(video).time = 12;
    fireEvent.click(view.getByRole("button", { name: "إيقاف الفيلم مؤقتًا" })); // ⇒ تُطبَّق الترقية
    st(video).time = 0;
    seekableEnd = 0; // لا مدى بعد على المصدر الجديد
    await act(async () => {
      fireEvent(video, new Event("loadedmetadata"));
    });
    expect(video.currentTime, "قفزٌ إلى موضعٍ غير محمَّل").toBe(0);
    seekableEnd = 8; // حُمِّل ما دون الموضع: ما زال أبعد منه
    await act(async () => {
      fireEvent(video, new Event("progress"));
    });
    expect(video.currentTime).toBe(0);
    seekableEnd = 30; // اكتمل
    await act(async () => {
      fireEvent(video, new Event("progress"));
    });
    expect(video.currentTime, "الموضع لم يُستعَد حين صار مقروءًا").toBe(12);
    // وبعد الاستعادة لا مستمعين: حدثٌ لاحق لا يعيد القفز.
    st(video).time = 20;
    await act(async () => {
      fireEvent(video, new Event("progress"));
    });
    expect(video.currentTime).toBe(20);
    view.unmount();
  });

  it("وإطارٌ يكبر قبل ظهور الفيلم أو بعد سقوطه إلى الملصق: الدرجة الكبرى مباشرةً بلا قراءةٍ ثانية (#15)", async () => {
    const frame = liveFrame(358);
    const view = await mount(); // لا فيديو بعد
    await act(async () => frame.resize(1200));
    await act(async () => {
      FakeObserver.show(true);
    });
    expect(videoOf(view.container)!.querySelector("source")!.getAttribute("src")).toBe(
      "/media/twin/sadeed-twin-1280.mp4",
    );
    expect(load).not.toHaveBeenCalled();
    view.unmount();
  });

  it("ترتيب النهاية: pause يسبق ended — الترقية لا تُطبَّق في pause وإلا ألغى load() حدث ended (#15)", async () => {
    const frame = liveFrame(358);
    const view = await mountVisible();
    const video = videoOf(view.container)!;
    await act(async () => frame.resize(1200)); // يعمل ⇒ مؤجَّلة
    const s = st(video);
    s.time = 30;
    s.paused = true;
    s.ended = true;
    await act(async () => {
      fireEvent(video, new Event("pause"));
    });
    // في المحرّك الحقيقي `load()` يزيل المهام المعلّقة من مصدر أحداث العنصر — ومنها `ended` التالي.
    if (load.mock.calls.length === 0) {
      await act(async () => {
        fireEvent(video, new Event("ended"));
      });
    }
    view.getByRole("button", { name: "إعادة عرض الفيلم" });
    expect(load, "الترقية لم تُطبَّق عند النهاية").toHaveBeenCalledTimes(1);
    view.unmount();
  });

  it("وفيلمٌ انتهى: تُطبَّق الترقية على إطاره الأخير فيبقى منتهيًا (#15)", async () => {
    const frame = liveFrame(358);
    const view = await mountVisible();
    const video = videoOf(view.container)!;
    await act(async () => frame.resize(1200)); // يعمل ⇒ مؤجَّلة
    expect(load).not.toHaveBeenCalled();
    await finish(video); // النهاية نقطة توقف ⇒ تُطبَّق
    expect(load).toHaveBeenCalledTimes(1);
    expect(video.querySelector("source")!.getAttribute("src")).toBe(
      "/media/twin/sadeed-twin-1280.mp4",
    );
    expect(videoOf(view.container)).toBe(video);
    view.getByRole("button", { name: "إعادة عرض الفيلم" });
    view.unmount();
  });
});

describe("السقوط إلى الملصق — تعذّر الفيلم أو منع المتصفّح له", () => {
  it("تعذّر الملفّ: يزول الفيلم ويبقى الملصق، والزرّ «إعادة محاولة» بتلميح، فيعود", async () => {
    const view = await mountVisible();
    const video = videoOf(view.container)!;
    await act(async () => {
      fireEvent.error(video);
    });
    expect(videoOf(view.container), "فيلمٌ معطوب بقي فوق الملصق").toBeNull();
    expect(view.container.querySelector("img.twin-film-poster")).not.toBeNull();
    expect(view.getByRole("status").textContent).toMatch(/تعذّر تحميل الفيلم/);
    play.mockClear();
    fireEvent.click(view.getByRole("button", { name: "إعادة محاولة تحميل الفيلم" }));
    expect(videoOf(view.container), "المحاولة لم تعد بالفيلم").not.toBeNull();
    expect(play).toHaveBeenCalledTimes(1);
    view.unmount();
  });

  it("خطأ `<source>` وحده ليس فشلًا (يُجرَّب المصدر الثاني)", async () => {
    const view = await mountVisible();
    const video = videoOf(view.container)!;
    await act(async () => {
      fireEvent.error(video.querySelector("source")!);
    });
    expect(videoOf(view.container), "خطأ مصدرٍ واحد أسقط الفيلم").toBe(video);
    view.unmount();
  });

  it("منعُ المتصفّح للتشغيل (توفير الطاقة): يبقى الملصق، والزرّ يشغّله من داخل النقرة", async () => {
    refuse = "NotAllowedError";
    refuseCount = 2; // بصوتٍ ثم صامتًا — المنع كاملٌ في الحالتين.
    const view = await mountVisible();
    const video = videoOf(view.container)!;
    expect(video.hasAttribute("data-ready"), "الفيلم ظهر وهو ممنوع").toBe(false);
    view.getByRole("button", { name: "متابعة الفيلم" });
    fireEvent.click(view.getByRole("button", { name: "متابعة الفيلم" }));
    expect(play).toHaveBeenCalledTimes(3);
    expect(video.hasAttribute("data-ready")).toBe(true);
    view.getByRole("button", { name: "إيقاف الفيلم مؤقتًا" });
    view.unmount();
  });
});

describe("اللغتان والإفصاح وإمكانية الوصول", () => {
  it("الإنجليزية: الأزرار والاسم والإفصاح بلغة الواجهة", async () => {
    localStorage.setItem("locale", "en");
    const view = await mountVisible();
    const button = view.getByRole("button", { name: "Pause film" });
    expect(button.textContent).toBe("Pause film");
    expect(view.getByRole("figure", { name: "Digital twin film" })).toBeInTheDocument();
    expect(view.container.querySelector("figcaption")!.textContent).toMatch(/pre-rendered/);
    fireEvent.click(button);
    view.getByRole("button", { name: "Resume film" });
    view.unmount();
  });

  it("المنطقة تحمل وصفًا صادقًا وإفصاحًا مرئيًّا: فيلمٌ مُصيَّر مسبقًا لا بثّ ولا بيانات تشغيلية", async () => {
    const view = await mountVisible();
    const figure = view.getByRole("figure", { name: "فيلم التوأم الرقمي" });
    const described = figure
      .getAttribute("aria-describedby")!
      .split(" ")
      .map((id) => document.getElementById(id)!.textContent)
      .join(" ");
    expect(described).toMatch(/مُصيَّر مسبقًا/);
    expect(described).toMatch(/بموسيقى ومؤثرات صوتية مولَّدة/);
    expect(described).toMatch(/56 ثانية/);
    expect(described).toMatch(/مرسومة وليست تصويرًا لمنشأة حقيقية/);
    expect(described).toMatch(/ليس بثًّا حيًّا ولا بيانات تشغيلية/);
    // الإفصاح مرئيٌّ (وليس لقارئ الشاشة وحده).
    expect(view.container.querySelector("figcaption")!.textContent).toMatch(/ليس بثًّا حيًّا/);
    view.unmount();
  });

  it("axe: لا مخالفات والفيلم مركَّب ولا والملصق وحده", async () => {
    const playing = await mountVisible();
    expect(await axe(playing.container)).toHaveNoViolations();
    playing.unmount();
    setMedia({ reduce: true });
    const still = await mountVisible();
    expect(await axe(still.container)).toHaveNoViolations();
    still.unmount();
  });
});

/* ── الصفحة الحاضنة: الزرّ المرآة وملء الشاشة ───────────────────────────── */

function Harness() {
  const ref = useRef<TwinFilmHandle>(null);
  const [control, setControl] = useState<FilmControl | null>(null);
  return createElement(
    "div",
    null,
    createElement(
      "button",
      { type: "button", "data-testid": "ext", onClick: () => ref.current?.toggle() },
      control?.label ?? "—",
    ),
    createElement(
      "button",
      { type: "button", "data-testid": "fs", onClick: () => ref.current?.toggleFullscreen() },
      "fs",
    ),
    createElement(TwinFilmPlayer, { ref, onControlChange: setControl }),
  );
}

describe("اليد الخارجية — زرّ المرآة وملء الشاشة", () => {
  it("الزرّ الخارجي يعكس الحال ويفعل فعل الزرّ الواحد", async () => {
    const view = await mountVisible(createElement(Harness));
    const ext = view.getByTestId("ext");
    expect(ext.textContent).toBe("إيقاف الفيلم مؤقتًا");
    fireEvent.click(ext);
    expect(pause).toHaveBeenCalledTimes(1);
    expect(ext.textContent).toBe("متابعة الفيلم");
    fireEvent.click(ext);
    expect(ext.textContent).toBe("إيقاف الفيلم مؤقتًا");
    await finish(videoOf(view.container)!);
    expect(ext.textContent).toBe("إعادة عرض الفيلم");
    view.unmount();
  });

  it("ملء الشاشة للمشغّل كلّه (الـ figure) لا للفيديو وحده", async () => {
    const calls: Element[] = [];
    Object.defineProperty(HTMLElement.prototype, "requestFullscreen", {
      configurable: true,
      value: vi.fn(function (this: Element) {
        calls.push(this);
        return Promise.resolve();
      }),
    });
    const view = await mountVisible(createElement(Harness));
    fireEvent.click(view.getByTestId("fs"));
    expect(calls).toHaveLength(1);
    expect(calls[0].tagName).toBe("FIGURE");
    expect(calls[0].classList.contains("twin-film")).toBe(true);
    view.unmount();
    Reflect.deleteProperty(HTMLElement.prototype, "requestFullscreen");
  });

  it("والزرّ الخارجي مُعلَّقٌ حين تُوقَف الحركة في النظام", async () => {
    document.documentElement.setAttribute("data-nx-motion-paused", "1");
    const view = await mountVisible(createElement(Harness));
    fireEvent.click(view.getByTestId("ext"));
    expect(videoOf(view.container)).toBeNull();
    expect(play).not.toHaveBeenCalled();
    view.unmount();
  });
});

/* ── صفحة /cinematic ───────────────────────────────────────────────────── */

type RouteStub = { options: { component: () => ReactNode; head: () => { meta: object[] } } };
async function loadCinematic(): Promise<RouteStub["options"]> {
  const mod = (await import("@/routes/cinematic")) as unknown as { Route: RouteStub };
  return mod.Route.options;
}

describe("/cinematic — العنوان خارج الفيديو، والمسرح هو المشغّل، والشريط مرآته", () => {
  it("عنوانٌ نصٌّ حقيقيّ قبل المشغّل وخارج إطاره، بلا iframe ولا صورة ولا رابط خارجي", async () => {
    const { component } = await loadCinematic();
    const view = await mountVisible(createElement(component));
    const h1 = view.container.querySelector("h1")!;
    expect(h1.textContent).toBe("التوأم الرقمي للأمن الصناعي");
    const frame = view.container.querySelector(".twin-film-frame")!;
    const figure = view.container.querySelector("figure.twin-film")!;
    expect(frame.contains(h1), "العنوان داخل مساحة الفيديو").toBe(false);
    expect(figure.contains(h1)).toBe(false);
    // العنوان يسبق المشغّل في الشجرة (فوقه على الجوال وسطح المكتب).
    expect(h1.compareDocumentPosition(figure) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(view.container.querySelector("iframe")).toBeNull();
    // الصورة الوحيدة هي ملصق الفيلم المحلي.
    expect([...view.container.querySelectorAll("img")].map((i) => i.getAttribute("src"))).toEqual([
      "/media/twin/sadeed-twin-poster.webp",
    ]);
    expect(view.container.querySelectorAll('[href^="http"], [src^="http"]')).toHaveLength(0);
    // لا شارة بثّ ولا عاجل ولا أرقام في الصفحة كلّها ما عدا مدّة الفيلم المعلنة في المشغّل.
    const text = view.container.textContent ?? "";
    expect(text).not.toMatch(/البث المباشر|عاجل|\bLIVE\b/);
    expect(text.replace(/56 ثانية/g, "")).not.toMatch(/[0-9٠-٩]/);
    view.unmount();
  });

  it("زرّ الشريط يعكس المشغّل ويحرّكه، ويُعلَّق مع إيقاف الحركة", async () => {
    const { component } = await loadCinematic();
    const view = await mountVisible(createElement(component));
    const toolbarButton = view.container.querySelector<HTMLButtonElement>(
      ".sd-cinema-actions .sd-cinema-control",
    )!;
    expect(toolbarButton.getAttribute("aria-label")).toBe("إيقاف الفيلم مؤقتًا");
    fireEvent.click(toolbarButton);
    expect(pause).toHaveBeenCalledTimes(1);
    expect(toolbarButton.getAttribute("aria-label")).toBe("متابعة الفيلم");
    fireEvent.click(toolbarButton);
    expect(toolbarButton.getAttribute("aria-label")).toBe("إيقاف الفيلم مؤقتًا");
    view.unmount();
  });

  it("زرّ ملء الشاشة لا يظهر حيث لا دعم (iPhone)، ويظهر ويعمل حيث الدعم", async () => {
    const { component } = await loadCinematic();
    const without = await mountVisible(createElement(component));
    expect(without.container.querySelectorAll(".sd-cinema-actions button")).toHaveLength(1);
    without.unmount();

    Object.defineProperty(document, "fullscreenEnabled", { configurable: true, value: true });
    const calls: Element[] = [];
    Object.defineProperty(HTMLElement.prototype, "requestFullscreen", {
      configurable: true,
      value: vi.fn(function (this: Element) {
        calls.push(this);
        return Promise.resolve();
      }),
    });
    const withFs = await mountVisible(createElement(component));
    const buttons = withFs.container.querySelectorAll<HTMLButtonElement>(
      ".sd-cinema-actions button",
    );
    expect(buttons).toHaveLength(2);
    expect(buttons[1].getAttribute("aria-label")).toBe("ملء الشاشة");
    fireEvent.click(buttons[1]);
    expect(calls.map((c) => c.tagName)).toEqual(["FIGURE"]);
    withFs.unmount();
    Reflect.deleteProperty(HTMLElement.prototype, "requestFullscreen");
  });

  it("الإنجليزية: الاتجاه والنصوص بلغة الواجهة", async () => {
    localStorage.setItem("locale", "en");
    const { component } = await loadCinematic();
    const view = await mountVisible(createElement(component));
    const main = view.container.querySelector("main")!;
    expect(main.getAttribute("dir")).toBe("ltr");
    expect(view.container.querySelector("h1")!.textContent).toBe(
      "The industrial-security digital twin",
    );
    expect(view.container.querySelector(".sd-cinema-back")!.textContent).toBe("Back to SADEED");
    view.unmount();
  });

  it("وصف الصفحة لا يدّعي تفاعلًا ولا بثًّا", async () => {
    const { head } = await loadCinematic();
    const description = JSON.stringify(head().meta);
    expect(description).toMatch(/مُصيَّر مسبقًا/);
    expect(description).not.toMatch(/تفاعلي|البث المباشر/);
  });
});
