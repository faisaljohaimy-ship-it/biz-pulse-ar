import { act, cleanup, fireEvent, render, within } from "@testing-library/react";
import { axe } from "jest-axe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n";
import { TwinFilmPlayer } from "./TwinFilmPlayer";

class Observer {
  static all: Observer[] = [];
  constructor(readonly callback: IntersectionObserverCallback) {
    Observer.all.push(this);
  }
  observe() {}
  disconnect() {}
  unobserve() {}
  static show(visible: boolean) {
    for (const observer of Observer.all)
      observer.callback(
        [
          {
            isIntersecting: visible,
            intersectionRatio: visible ? 1 : 0,
          } as IntersectionObserverEntry,
        ],
        observer as unknown as IntersectionObserver,
      );
  }
}
type Media = { paused: boolean; ended: boolean; time: number };
let states: WeakMap<HTMLMediaElement, Media>;
const state = (video: HTMLMediaElement) => {
  let value = states.get(video);
  if (!value) {
    value = { paused: true, ended: false, time: 0 };
    states.set(video, value);
  }
  return value;
};
const start = (video: HTMLMediaElement) => {
  state(video).paused = false;
  state(video).ended = false;
  video.dispatchEvent(new Event("play"));
  video.dispatchEvent(new Event("playing"));
};
type Pending = { video: HTMLMediaElement; resolve: () => void; reject: () => void };
let pending: Pending[];
let delayed: boolean;
let reduced: boolean;
let hidden: boolean;
let play: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  states = new WeakMap();
  pending = [];
  delayed = false;
  reduced = false;
  hidden = false;
  Observer.all = [];
  localStorage.clear();
  localStorage.setItem("locale", "en");
  vi.stubGlobal("IntersectionObserver", Observer);
  vi.spyOn(document, "visibilityState", "get").mockImplementation(() =>
    hidden ? "hidden" : "visible",
  );
  vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
    matches: query.includes("prefers-reduced-motion") && reduced,
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    onchange: null,
    dispatchEvent: () => false,
  }));
  vi.spyOn(HTMLMediaElement.prototype, "paused", "get").mockImplementation(function (
    this: HTMLMediaElement,
  ) {
    return state(this).paused;
  });
  vi.spyOn(HTMLMediaElement.prototype, "ended", "get").mockImplementation(function (
    this: HTMLMediaElement,
  ) {
    return state(this).ended;
  });
  // The mocked play/playing events represent a decoded frame; axe must not wait
  // for jsdom's permanently-unloaded native media implementation.
  vi.spyOn(HTMLMediaElement.prototype, "readyState", "get").mockReturnValue(4);
  vi.spyOn(HTMLMediaElement.prototype, "duration", "get").mockImplementation(function (
    this: HTMLMediaElement,
  ) {
    const src = this.querySelector("source")?.getAttribute("src") ?? "";
    return src.includes("/brand/") ? 26 : src.includes("/refinery/") ? 15 : 56;
  });
  vi.spyOn(HTMLMediaElement.prototype, "currentTime", "get").mockImplementation(function (
    this: HTMLMediaElement,
  ) {
    return state(this).time;
  });
  vi.spyOn(HTMLMediaElement.prototype, "currentTime", "set").mockImplementation(function (
    this: HTMLMediaElement,
    time,
  ) {
    state(this).time = time;
  });
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(function (
    this: HTMLMediaElement,
  ) {
    if (state(this).paused) return;
    state(this).paused = true;
    this.dispatchEvent(new Event("pause"));
  });
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(function (
    this: HTMLMediaElement,
  ) {
    state(this).paused = true;
  });
  play = vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (
    this: HTMLMediaElement,
  ) {
    if (!delayed) {
      start(this);
      return Promise.resolve();
    }
    return new Promise<void>((resolve, reject) =>
      pending.push({
        video: this,
        resolve: () => {
          start(this);
          resolve();
        },
        reject: () => reject(new DOMException("Playback denied", "NotAllowedError")),
      }),
    );
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
});

async function gallery() {
  const view = render(
    <I18nProvider>
      <TwinFilmPlayer film="opening" manual />
      <TwinFilmPlayer film="twin" manual />
    </I18nProvider>,
  );
  await act(async () => {
    Observer.show(true);
  });
  const opening = view.container.querySelector<HTMLElement>('[data-film="opening"]')!;
  const twin = view.container.querySelector<HTMLElement>('[data-film="twin"]')!;
  return { ...view, opening, twin };
}
const toggle = (figure: HTMLElement) =>
  figure.querySelector<HTMLButtonElement>(".twin-film-toggle")!;
const videoOf = (figure: HTMLElement) => figure.querySelector<HTMLVideoElement>("video")!;
const click = async (button: HTMLElement) => {
  await act(async () => {
    fireEvent.click(button);
  });
};

describe("two original films — intentional source requests and exclusive playback", () => {
  it("defers the single-source reference film until its own action and shares ownership across all three profiles", async () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    const view = render(
      <I18nProvider>
        <TwinFilmPlayer film="opening" manual />
        <TwinFilmPlayer film="twin" manual />
        <TwinFilmPlayer film="reference" manual />
      </I18nProvider>,
    );
    await act(async () => Observer.show(true));
    expect(view.container.querySelector("video,source")).toBeNull();
    const figures = ["opening", "twin", "reference"].map((id) =>
      view.container.querySelector<HTMLElement>(`[data-film="${id}"]`)!,
    );
    const [openingFigure, twinFigure, referenceFigure] = figures;
    await click(toggle(referenceFigure));
    const reference = videoOf(referenceFigure);
    expect(videoOf(openingFigure)).toBeNull();
    expect(videoOf(twinFigure)).toBeNull();
    expect(reference.preload).toBe("none");
    expect(reference.querySelectorAll("source")).toHaveLength(1);
    expect(reference.querySelector("source")).toHaveAttribute(
      "src",
      "/media/refinery/refinery-illustrative.mp4",
    );
    expect(reference.querySelector("source")).toHaveAttribute("type", "video/mp4");
    expect(referenceFigure.querySelector('[type="video/webm"]')).toBeNull();
    expect(reference.playbackRate).toBe(1);
    expect(reference.defaultPlaybackRate).toBe(1);
    expect(reference.muted).toBe(false);
    reference.currentTime = 7.5;
    fireEvent(reference, new Event("timeupdate"));
    expect(
      referenceFigure
        .querySelector<HTMLElement>(".twin-film-bar")!
        .style.getPropertyValue("--twin-progress"),
    ).toBe("0.5");
    for (const figure of [openingFigure, twinFigure, referenceFigure]) {
      await click(toggle(figure));
      expect(videoOf(figure).paused).toBe(false);
      expect(figures.map(videoOf).filter((video) => video && !video.paused)).toHaveLength(1);
    }
    expect(videoOf(referenceFigure)).toBe(reference);
    expect(videoOf(openingFigure).playbackRate).toBe(0.5);
    expect(videoOf(twinFigure).playbackRate).toBe(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(["ar", "en"] as const)(
    "identifies the new %s film as fictional authored motion, with known duration and no operational claim",
    async (locale) => {
      localStorage.setItem("locale", locale);
      const view = render(
        <I18nProvider>
          <TwinFilmPlayer film="reference" manual />
        </I18nProvider>,
      );
      const caption = view.container.querySelector("figcaption")!;
      expect(caption.textContent).toContain("15");
      for (const term of locale === "ar"
        ? ["خيالي", "حركة مصممة", "ليس بثًا حيًا", "تمثيلًا هندسيًا", "بيانات تشغيلية"]
        : [
            "fictional",
            "authored motion",
            "not a live feed",
            "engineering model",
            "operational data",
          ])
        expect(caption.textContent).toContain(term);
      expect(view.container.querySelector("video,source")).toBeNull();
    },
  );

  it("scopes the additional gallery controls to manual players without changing the cinematic player", () => {
    const view = render(
      <I18nProvider>
        <TwinFilmPlayer film="opening" manual />
        <TwinFilmPlayer />
      </I18nProvider>,
    );
    const figures = view.container.querySelectorAll("figure");
    expect(figures[0]).toHaveAttribute("data-manual", "true");
    expect(within(figures[0]).getByRole("button", { name: "Reset film" })).toBeVisible();
    expect(figures[1]).not.toHaveAttribute("data-manual");
    expect(within(figures[1]).queryByRole("button", { name: "Reset film" })).toBeNull();
  });

  it("keeps both visible films source-free until their own action, with original frames, audio and rates", async () => {
    const view = await gallery();
    expect(view.container.querySelector("video,source")).toBeNull();
    expect(play).not.toHaveBeenCalled();
    expect(view.opening.querySelector("img")?.getAttribute("src")).toBe(
      "/home/brand/sadeed-banner-clean-1600.webp",
    );
    expect(view.twin.querySelector("img")?.getAttribute("src")).toBe(
      "/media/twin/sadeed-twin-poster.webp",
    );
    expect((view.opening.querySelector(".twin-film-frame") as HTMLElement).style.aspectRatio).toBe(
      "3 / 1",
    );
    expect((view.twin.querySelector(".twin-film-frame") as HTMLElement).style.aspectRatio).toBe(
      "16 / 9",
    );
    await click(toggle(view.opening));
    const opening = videoOf(view.opening);
    expect(videoOf(view.twin)).toBeNull();
    expect(opening.preload).toBe("none");
    expect(opening.muted).toBe(false);
    expect(opening.playbackRate).toBe(0.5);
    expect(opening.defaultPlaybackRate).toBe(0.5);
    expect(opening.querySelector("source")?.getAttribute("src")).toMatch(
      /^\/media\/brand\/sadeed-film-(804|1608)\.mp4\?v=/,
    );
    expect(opening.querySelectorAll("source")).toHaveLength(2);
    await act(async () => {
      opening.playbackRate = 1;
      fireEvent(opening, new Event("ratechange"));
    });
    expect(opening.playbackRate).toBe(0.5);
    await click(toggle(view.twin));
    expect(opening.paused).toBe(true);
    expect(opening.muted).toBe(true);
    const twin = videoOf(view.twin);
    expect(twin.preload).toBe("none");
    expect(twin.muted).toBe(false);
    expect(twin.playbackRate).toBe(1);
    expect(twin.querySelector("source")?.getAttribute("src")).toMatch(
      /^\/media\/twin\/sadeed-twin-(640|1280)\.mp4$/,
    );
    await click(toggle(view.opening));
    expect(videoOf(view.opening)).toBe(opening);
    expect(opening.paused).toBe(false);
    expect(twin.paused).toBe(true);
  });

  it.each(["resolve", "reject"] as const)(
    "invalidates a pending %s on user pause instead of restarting it",
    async (outcome) => {
      delayed = true;
      const view = await gallery();
      await click(toggle(view.opening));
      await click(toggle(view.opening));
      await act(async () => {
        pending[0][outcome]();
      });
      expect(play).toHaveBeenCalledTimes(1);
      expect(videoOf(view.opening).paused).toBe(true);
      expect(videoOf(view.opening).muted).toBe(true);
      expect(toggle(view.opening)).toHaveAttribute("data-action", "resume");
    },
  );

  it.each(["resolve", "reject"] as const)(
    "keeps newer A ownership after old A's %s and B's late resolution in A→B→A",
    async (outcome) => {
      delayed = true;
      const view = await gallery();
      await click(toggle(view.opening));
      const opening = videoOf(view.opening);
      await click(toggle(view.twin));
      const twin = videoOf(view.twin);
      await click(toggle(view.opening));
      expect(videoOf(view.opening)).toBe(opening);
      await act(async () => {
        pending[0][outcome]();
        pending[1].resolve();
        pending[2].resolve();
      });
      expect(opening.paused).toBe(false);
      expect(opening.muted).toBe(false);
      expect(twin.paused).toBe(true);
      expect(twin.muted).toBe(true);
      expect(play).toHaveBeenCalledTimes(3);
    },
  );

  it.each(["resolve", "reject"] as const)(
    "stops a late %s after navigation/unmount and releases its sources",
    async (outcome) => {
      delayed = true;
      const view = await gallery();
      await click(toggle(view.opening));
      const video = videoOf(view.opening);
      view.unmount();
      expect(video.querySelector("source")).toBeNull();
      expect(video.hasAttribute("src")).toBe(false);
      await act(async () => {
        pending[0][outcome]();
      });
      expect(video.paused).toBe(true);
      expect(video.muted).toBe(true);
      expect(play).toHaveBeenCalledTimes(1);
    },
  );

  it("ignores an old queued pause event after A→B→A has already resumed A", async () => {
    const view = await gallery();
    await click(toggle(view.opening));
    const opening = videoOf(view.opening);
    await click(toggle(view.twin));
    await click(toggle(view.opening));
    // Native pause events are queued tasks: B stopped A earlier, but A is now
    // playing again when that earlier event reaches its React listener.
    await act(async () => {
      fireEvent(opening, new Event("pause"));
    });
    expect(opening.paused).toBe(false);
    expect(toggle(view.opening)).toHaveAttribute("data-action", "pause");
    expect(videoOf(view.twin).paused).toBe(true);
    expect(play).toHaveBeenCalledTimes(3);
  });

  it("invalidates a pending start when hidden and requires an intentional resume", async () => {
    delayed = true;
    const view = await gallery();
    await click(toggle(view.twin));
    await act(async () => {
      hidden = true;
      document.dispatchEvent(new Event("visibilitychange"));
      pending[0].resolve();
    });
    expect(videoOf(view.twin).paused).toBe(true);
    await act(async () => {
      hidden = false;
      document.dispatchEvent(new Event("visibilitychange"));
      Observer.show(true);
    });
    expect(play).toHaveBeenCalledTimes(1);
    await click(toggle(view.twin));
    await act(async () => {
      pending[1].resolve();
    });
    expect(videoOf(view.twin).paused).toBe(false);
  });

  it.each(["resolve", "reject"] as const)(
    "invalidates a pending %s when the frame leaves view",
    async (outcome) => {
      delayed = true;
      const view = await gallery();
      await click(toggle(view.opening));
      await act(async () => {
        Observer.show(false);
        pending[0][outcome]();
      });
      expect(videoOf(view.opening).paused).toBe(true);
      expect(videoOf(view.opening).muted).toBe(true);
      expect(toggle(view.opening)).toHaveAttribute("data-action", "resume");
      await act(async () => {
        Observer.show(true);
      });
      expect(play).toHaveBeenCalledTimes(1);
    },
  );

  it("reset clears consent and progress, and stale fulfillment cannot restart the discarded element", async () => {
    delayed = true;
    const view = await gallery();
    await click(toggle(view.opening));
    const old = videoOf(view.opening);
    old.currentTime = 12;
    await click(within(view.opening).getByRole("button", { name: "Reset film" }));
    expect(videoOf(view.opening)).toBeNull();
    expect(view.opening.querySelector("source")).toBeNull();
    expect(old.currentTime).toBe(0);
    await act(async () => {
      pending[0].resolve();
      Observer.show(true);
    });
    expect(old.paused).toBe(true);
    expect(play).toHaveBeenCalledTimes(1);
    await click(toggle(view.opening));
    expect(videoOf(view.opening)).not.toBe(old);
    expect(play).toHaveBeenCalledTimes(2);
  });

  it("does not replay a finished film when the gallery returns to view", async () => {
    const view = await gallery();
    await click(toggle(view.twin));
    const video = videoOf(view.twin);
    await act(async () => {
      state(video).paused = true;
      state(video).ended = true;
      state(video).time = 56;
      fireEvent(video, new Event("ended"));
      Observer.show(false);
      Observer.show(true);
    });
    expect(toggle(view.twin)).toHaveAttribute("data-action", "replay");
    expect(play).toHaveBeenCalledTimes(1);
  });

  it("keeps reduced-motion viewing intentional and both idle/active controls accessible", async () => {
    reduced = true;
    const view = await gallery();
    expect(view.container.querySelector("video,source")).toBeNull();
    expect(await axe(view.container)).toHaveNoViolations();
    await click(toggle(view.opening));
    expect(videoOf(view.opening).paused).toBe(false);
    expect(videoOf(view.twin)).toBeNull();
    expect(await axe(view.container)).toHaveNoViolations();
  });
});
