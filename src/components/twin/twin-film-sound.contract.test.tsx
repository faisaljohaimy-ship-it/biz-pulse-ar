/**
 * عقد صوت «فيلم التوأم الرقمي» — الراية مقلوبة `true` عمدًا (الملفّات الحاليّة بلا صوت؛ هذا الاختبار
 * يحرس سلوك المشغّل يوم يُركَّب الفيلم ذو الصوت). المحرّك مزيّف كما في عقد المشغّل.
 *
 * ما يكسره التعديل ولا يراه tsc:
 *   • فيلمٌ يبدأ صامتًا رغم أن المتصفّح يسمح بصوته (التشغيل التلقائي «بصوته» أمر المالك)؛
 *   • فيلمٌ منعه المتصفّح فلا يعود صامتًا (إطارٌ أسود) أو يُفرَض عليه صوتٌ يمنعه؛
 *   • فيلمٌ يتكلّم فوق سَدِيد أو لوحته، أو لا يعود صوته بزوال السبب؛
 *   • زرّ صوتٍ بلا حالٍ (`aria-pressed`) أو لا يحفظ اختيار الزائر، أو يظهر قبل وجود صوتٍ يُتحكَّم به.
 */
import { createElement, type ReactNode } from "react";
import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n";
import { TwinFilmPlayer } from "@/components/twin/TwinFilmPlayer";
import { SOUND_PREF_KEY } from "@/components/twin/twin-film-sound-pref";
import { sadeedState } from "@/lib/sadeed/sadeed-state";

vi.mock("@/components/twin/twin-film-model", async (orig) => ({
  ...(await orig<typeof import("@/components/twin/twin-film-model")>()),
  TWIN_FILM_HAS_AUDIO: true,
}));

type MediaState = { paused: boolean; ended: boolean };
const states = new WeakMap<HTMLMediaElement, MediaState>();
const st = (el: HTMLMediaElement): MediaState => {
  let s = states.get(el);
  if (!s) states.set(el, (s = { paused: true, ended: false }));
  return s;
};

/** سياسة المتصفّح: `true` ⇒ يرفض `play()` بصوتٍ (`NotAllowedError`) ويقبله صامتًا. */
let blockAudible = false;
const mutedAtPlay: boolean[] = [];

const play = vi.fn(function (this: HTMLMediaElement) {
  mutedAtPlay.push(this.muted);
  if (blockAudible && !this.muted) {
    return Promise.reject(new DOMException("blocked", "NotAllowedError"));
  }
  st(this).paused = false;
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
  def("seekable", { get: () => ({ length: 1, start: () => 0, end: () => 56 }) });
  def("duration", { get: () => 56 });
  def("play", { value: play });
  def("pause", { value: pause });
  def("load", { value: vi.fn() });
});

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

beforeEach(() => {
  FakeObserver.all = [];
  blockAudible = false;
  mutedAtPlay.length = 0;
  play.mockClear();
  vi.stubGlobal("IntersectionObserver", FakeObserver);
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  const root = document.documentElement;
  for (const a of ["data-nx-motion", "data-nx-motion-paused", "data-sadeed-panel"]) {
    root.removeAttribute(a);
  }
  localStorage.removeItem(SOUND_PREF_KEY);
  localStorage.removeItem("locale");
});

const withI18n = (ui: ReactNode) => createElement(I18nProvider, null, ui);

async function mountVisible() {
  const view = render(withI18n(createElement(TwinFilmPlayer, { priority: true })));
  await act(async () => {});
  await act(async () => {
    FakeObserver.show(true);
  });
  return view;
}

const videoOf = (c: HTMLElement) => c.querySelector<HTMLVideoElement>("video")!;

describe("صوت فيلم التوأم", () => {
  it("لا زرّ صوتٍ قبل أن يوجد فيديو يُتحكَّم بصوته", async () => {
    const view = render(withI18n(createElement(TwinFilmPlayer)));
    await act(async () => {});
    expect(view.queryByRole("button", { name: "الصوت" })).toBeNull();
    view.unmount();
  });

  it("يبدأ بصوته حين يسمح المتصفّح، والزرّ مضغوطٌ «يعمل»", async () => {
    const view = await mountVisible();
    expect(mutedAtPlay, "محاولة التشغيل الأولى بصوت").toEqual([false]);
    expect(videoOf(view.container).muted).toBe(false);
    expect(view.getByRole("button", { name: "الصوت" }).getAttribute("aria-pressed")).toBe("true");
    expect(view.queryByText(/منع المتصفّح الصوت التلقائي/)).toBeNull();
    view.unmount();
  });

  it("منعه المتصفّح ⇒ يعود صامتًا ويعمل (لا إطار أسود)، ويشرح السبب، وأوّل لمسةٍ تفتح الصوت", async () => {
    blockAudible = true;
    const view = await mountVisible();
    const video = videoOf(view.container);
    expect(mutedAtPlay, "بصوتٍ فمرفوض ثم صامتًا").toEqual([false, true]);
    expect(video.muted).toBe(true);
    expect(st(video).paused, "الفيلم يعمل صامتًا").toBe(false);
    expect(view.getByRole("button", { name: "الصوت" }).getAttribute("aria-pressed")).toBe("false");
    view.getByText(/منع المتصفّح الصوت التلقائي/);
    await act(async () => {
      fireEvent.click(document.body);
    });
    expect(video.muted, "اللمسة تفتح الصوت").toBe(false);
    expect(view.getByRole("button", { name: "الصوت" }).getAttribute("aria-pressed")).toBe("true");
    view.unmount();
  });

  it("زرّ الصوت يكتم ويحفظ الاختيار، ومن كتمه لا يبدأ له فيلمٌ بصوته لاحقًا", async () => {
    const view = await mountVisible();
    const button = view.getByRole("button", { name: "الصوت" });
    await act(async () => {
      fireEvent.click(button);
    });
    expect(videoOf(view.container).muted).toBe(true);
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(localStorage.getItem(SOUND_PREF_KEY)).toBe("off");
    view.unmount();

    mutedAtPlay.length = 0;
    const again = await mountVisible();
    expect(mutedAtPlay, "تفضيل الكتم يُحترم من أوّل تشغيل").toEqual([true]);
    expect(videoOf(again.container).muted).toBe(true);
    // ويعيده الزرّ: يُحفَظ «مرغوب» بحذف المفتاح.
    await act(async () => {
      fireEvent.click(again.getByRole("button", { name: "الصوت" }));
    });
    expect(videoOf(again.container).muted).toBe(false);
    expect(localStorage.getItem(SOUND_PREF_KEY)).toBeNull();
    again.unmount();
  });

  it("لوحة سَدِيد مفتوحة ⇒ لا يبدأ بصوته، وحين تُغلق يعود صوته (يُسكت ولا يوقف)", async () => {
    document.documentElement.setAttribute("data-sadeed-panel", "open");
    const view = await mountVisible();
    const video = videoOf(view.container);
    expect(mutedAtPlay).toEqual([true]);
    expect(st(video).paused, "يعمل صامتًا لا موقوفًا").toBe(false);
    view.getByText(/الصوت موقوف مؤقتًا/);

    await act(async () => {
      document.documentElement.removeAttribute("data-sadeed-panel");
      await Promise.resolve();
    });
    // لم يسبق نجاحُ تشغيلٍ بصوتٍ ولا لمسة ⇒ ينتظر الإذن لا يفرض نفسه.
    expect(video.muted).toBe(true);
    await act(async () => {
      fireEvent.click(document.body);
    });
    expect(video.muted).toBe(false);
    view.unmount();
  });

  it("سَدِيد ينطق في أثناء الفيلم ⇒ يُسكت الفيلم فورًا ثم يعود بانتهاء كلامه", async () => {
    const view = await mountVisible();
    const video = videoOf(view.container);
    expect(video.muted).toBe(false);
    await act(async () => {
      sadeedState.set("speaking");
    });
    expect(video.muted, "فيلمٌ يتكلّم فوق سَدِيد").toBe(true);
    expect(st(video).paused, "يُسكَت ولا يوقَف").toBe(false);
    await act(async () => {
      sadeedState.set("idle");
    });
    expect(video.muted, "عاد صوته بزوال السبب (كان مفتوحًا قبله)").toBe(false);
    view.unmount();
  });

  it("لمسة الإصبع (`click` بنوع «touch») تفتح الصوت، و`pointerdown` اللمسيّ وTab لا يفتحانه", async () => {
    blockAudible = true;
    const view = await mountVisible();
    const video = videoOf(view.container);
    expect(video.muted).toBe(true);
    // Tab ليس قبولًا بالصوت.
    await act(async () => {
      fireEvent.keyDown(document.body, { key: "Tab" });
    });
    expect(video.muted, "ضغطة مفتاحٍ فتحت الصوت").toBe(true);
    // `pointerdown` لمسيٌّ ليس إيماءة تنشيط.
    await act(async () => {
      const down = new Event("pointerdown", { bubbles: true });
      Object.defineProperty(down, "pointerType", { value: "touch" });
      document.body.dispatchEvent(down);
    });
    expect(video.muted, "pointerdown لمسيّ فتح الصوت").toBe(true);
    // أمّا `click` الناتج عن الإصبع فيحمل `pointerType` «touch» وهو الإيماءة الحقيقية.
    await act(async () => {
      const click = new Event("click", { bubbles: true });
      Object.defineProperty(click, "pointerType", { value: "touch" });
      document.body.dispatchEvent(click);
    });
    expect(video.muted, "نقرة الإصبع لم تفتح الصوت").toBe(false);
    view.unmount();
  });

  it("خارج الشاشة لا يُسمَع الفيلم أبدًا، ويعود صوته بعودته", async () => {
    const view = await mountVisible();
    const video = videoOf(view.container);
    expect(video.muted).toBe(false);
    await act(async () => {
      FakeObserver.show(false);
    });
    expect(st(video).paused, "خرج من الشاشة فوقف").toBe(true);
    expect(video.muted, "فيلمٌ يتكلّم وهو خارج الشاشة").toBe(true);
    await act(async () => {
      FakeObserver.show(true);
    });
    expect(st(video).paused).toBe(false);
    expect(video.muted).toBe(false);
    view.unmount();
  });

  it("استئنافٌ لا يمرّ بفحص الظهور (لوحة سَدِيد) لا يُسمِع فيلمًا خارج الشاشة", async () => {
    const view = await mountVisible();
    const video = videoOf(view.container);
    document.documentElement.setAttribute("data-sadeed-panel", "open");
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      FakeObserver.show(false);
    });
    await act(async () => {
      document.documentElement.removeAttribute("data-sadeed-panel");
      await Promise.resolve();
    });
    expect(video.muted, "عاد الصوت والإطار خارج الشاشة").toBe(true);
    view.unmount();
  });

  it("رُفض الصوت مرّةً ثم جاءت لمسة: المحاولة التالية (إعادة عرض) بصوتٍ من جديد", async () => {
    blockAudible = true;
    const view = await mountVisible();
    expect(mutedAtPlay).toEqual([false, true]);
    blockAudible = false;
    await act(async () => {
      fireEvent.click(document.body);
    });
    mutedAtPlay.length = 0;
    await act(async () => {
      fireEvent.click(view.container.querySelector(".twin-film-toggle")!);
    });
    expect(videoOf(view.container).muted).toBe(false);
    view.unmount();
  });
});
