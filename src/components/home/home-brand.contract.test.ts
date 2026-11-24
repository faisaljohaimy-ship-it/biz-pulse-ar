/**
 * Owner acceptance, 2026-11-23: a full-frame static command-room image replaces
 * the former autoplay/jewel hero. Those presentation requirements are retired;
 * the original films, embedded soundtracks, byte limits and natural-speed contract
 * remain protected for their intentional-play home in the twin gallery.
 */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createElement, StrictMode } from "react";
import { renderToString } from "react-dom/server";
import postcss from "postcss";
import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n";
import {
  BRAND_RATIO,
  FILM_UPSCALE_LIMIT,
  HOME_BRAND,
  HOME_OPENING_IMAGE,
  HomeBrandRow,
} from "./HomeBrandRow";
import {
  FILM_EFFECTIVE_SECONDS,
  FILM_PLAYBACK_RATE,
  FILM_SOURCE_SECONDS,
  filmRateFor,
  holdFilmRate,
} from "./brand-film-playback";

// The existing ticker has its own unchanged contract. Isolate the hero from its
// read providers, timer and decorative assets; retain its place in the DOM.
vi.mock("./HomeTicker", () => ({
  HomeTicker: () => createElement("div", { "data-testid": "home-ticker" }),
}));

const CSS = readFileSync("src/styles/home/home-brand.css", "utf8");
const OWNER = {
  ar: "سديد",
  en: "SADEED",
  taglineAr: "مساعد ذكاء اصطناعي يعطي رؤية تنفيذية على الأمن الصناعي في جميع المناطق السعودية.",
  taglineEn:
    "An AI assistant giving executive insight into industrial security across all Saudi regions.",
};
const IMAGE_CEILING = 400 * 1024;
const OWNER_IMAGE_ARCHIVE = "docs/design/reference/command-room-owner-2026-11-23.jpg";
const OWNER_IMAGE_SHA256 = "1008e89f8ef301f286dd1448ecfd6bc1805e91547c66a491ee99626fab8b574a";
const OPENING_VARIANTS = [
  {
    file: "command-room-640.webp",
    width: 640,
    height: 349,
    bytes: 21112,
    sha256: "aac28d35a22b0110729dbc2ffa9e2e7d46a8b9827848538a95a0f06ec9fc555b",
  },
  {
    file: "command-room-1280.webp",
    width: 1280,
    height: 698,
    bytes: 54304,
    sha256: "b0d1b960aac5420d5f001f4fd98a5b3326b43539726f9aa244d6a5dc763db605",
  },
] as const;
const FILM_CEILING = { each: 4_500_000, phone: 2_000_000, total: 10_000_000 };
const ORIGINAL_FILMS = [
  {
    width: 804,
    format: "mp4",
    sha256: "58cdbf076feae53b3197e6c0b731e9ff44f4e0855425070d0fde14befa8889a5",
  },
  {
    width: 804,
    format: "webm",
    sha256: "5065df71ab2fa68f70441512399e7c149350954919f1a8b5b9a58d102abbe217",
  },
  {
    width: 1608,
    format: "mp4",
    sha256: "6abafc1f36f0d9e183a8562f37338e015f8ce8f0dc5dba5f12fc8b6346478fb1",
  },
  {
    width: 1608,
    format: "webm",
    sha256: "72930a0a19fa0410c2fb4ae99a57124f18a2f149f89295954815c93cf3b76265",
  },
] as const;

function walkBytes(dir: string): number {
  return readdirSync(dir).reduce((total, name) => {
    const path = join(dir, name);
    return total + (statSync(path).isDirectory() ? walkBytes(path) : statSync(path).size);
  }, 0);
}

function jpegSize(bytes: Buffer): { width: number; height: number } {
  if (bytes.readUInt16BE(0) !== 0xffd8) throw new Error("Not a JPEG");
  for (let at = 2; at + 8 < bytes.length;) {
    if (bytes[at] !== 0xff) throw new Error("Invalid JPEG segment");
    const marker = bytes[at + 1];
    if (
      [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(
        marker,
      )
    ) {
      return { width: bytes.readUInt16BE(at + 7), height: bytes.readUInt16BE(at + 5) };
    }
    at += 2 + bytes.readUInt16BE(at + 2);
  }
  throw new Error("JPEG dimensions missing");
}

function webpSize(bytes: Buffer): { width: number; height: number } {
  if (bytes.toString("latin1", 0, 4) !== "RIFF" || bytes.toString("latin1", 8, 12) !== "WEBP")
    throw new Error("Not a WebP");
  const chunk = bytes.toString("latin1", 12, 16);
  if (chunk === "VP8X")
    return { width: 1 + bytes.readUIntLE(24, 3), height: 1 + bytes.readUIntLE(27, 3) };
  if (chunk === "VP8L") {
    const bits = bytes.readUInt32LE(21);
    return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >>> 14) & 0x3fff) };
  }
  if (chunk !== "VP8 ") throw new Error("WebP image chunk missing");
  return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
}

/** Read actual container bytes, rather than accepting file extensions. */
function mp4Handlers(bytes: Buffer): string[] {
  const out: string[] = [];
  for (let i = bytes.indexOf("hdlr"); i !== -1; i = bytes.indexOf("hdlr", i + 4)) {
    if (i + 16 <= bytes.length) out.push(bytes.toString("latin1", i + 12, i + 16));
  }
  return out;
}

function mp4Seconds(bytes: Buffer): number {
  const at = bytes.indexOf("mvhd");
  if (at === -1) return Number.NaN;
  const v1 = bytes[at + 4] === 1;
  const scale = bytes.readUInt32BE(at + (v1 ? 24 : 16));
  const duration = v1 ? Number(bytes.readBigUInt64BE(at + 28)) : bytes.readUInt32BE(at + 20);
  return duration / scale;
}

function matroskaCodecs(bytes: Buffer): string[] {
  const out: string[] = [];
  for (let i = 0; i + 2 < bytes.length; i++) {
    if (bytes[i] !== 0x86 || (bytes[i + 1] & 0x80) === 0) continue;
    const length = bytes[i + 1] & 0x7f;
    if (length < 3 || length > 32 || i + 2 + length > bytes.length) continue;
    const id = bytes.toString("latin1", i + 2, i + 2 + length);
    if (/^[AVS]_[A-Z0-9_/]+$/.test(id)) out.push(id);
  }
  return out;
}

function filmTrackGaps(mp4: Buffer, webm: Buffer): string[] {
  const gaps: string[] = [];
  const handlers = mp4Handlers(mp4);
  if (
    !mp4.includes("ftyp") ||
    !mp4.includes("avc1") ||
    handlers.filter((h) => h === "vide").length !== 1
  )
    gaps.push("MP4/H.264 video");
  if (handlers.filter((h) => h === "soun").length !== 1 || !mp4.includes("mp4a"))
    gaps.push("one AAC soundtrack");
  if (!(Math.abs(mp4Seconds(mp4) - 26) <= 0.1)) gaps.push("26-second container");
  const codecs = matroskaCodecs(webm);
  if (codecs.filter((c) => c === "V_VP9").length !== 1) gaps.push("WebM/VP9 video");
  const audio = codecs.filter((c) => c.startsWith("A_"));
  if (audio.length !== 1 || audio[0] !== "A_OPUS") gaps.push("one Opus soundtrack");
  return gaps;
}

function heroMediaViolations(container: ParentNode): Element[] {
  return [
    ...container.querySelectorAll(
      "video, audio, iframe, canvas, [autoplay], a[href$='.mp4'], a[href$='.webm']",
    ),
  ];
}

function sceneStyleGaps(css: string): string[] {
  const gaps: string[] = [];
  const ast = postcss.parse(css);
  ast.walkAtRules("keyframes", () => {
    gaps.push("animated scene");
  });
  ast.walkDecls((decl) => {
    if (
      /^(?:animation(?:-.+)?|transform|scale|translate|rotate)$/.test(decl.prop) &&
      decl.value !== "none"
    )
      gaps.push("scene movement");
    if (decl.prop === "object-fit" && decl.value !== "contain") gaps.push("cropped scene");
    if (decl.prop === "position" && /absolute|fixed/.test(decl.value)) gaps.push("overlay");
    if (decl.prop === "opacity" && Number(decl.value) < 1) gaps.push("hidden content");
    if (/#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i.test(decl.value)) gaps.push("literal color");
  });
  return gaps;
}

function declarations(selector: string): Record<string, string> {
  const out: Record<string, string> = {};
  postcss.parse(CSS).walkRules(selector, (rule) => {
    rule.walkDecls((decl) => {
      out[decl.prop] = decl.value;
    });
  });
  return out;
}

class VisibilityObserver {
  static instances: VisibilityObserver[] = [];
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  constructor(readonly callback: IntersectionObserverCallback) {
    VisibilityObserver.instances.push(this);
  }
  show(visible: boolean) {
    this.callback(
      [{ isIntersecting: visible } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = "";
  delete document.documentElement.dataset.nxMotion;
  delete document.documentElement.dataset.nxMotionPaused;
  VisibilityObserver.instances = [];
  vi.stubGlobal("IntersectionObserver", VisibilityObserver);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
  document.documentElement.className = "";
  delete document.documentElement.dataset.nxMotion;
  delete document.documentElement.dataset.nxMotionPaused;
});

function mountHero(locale: "ar" | "en" = "ar") {
  localStorage.setItem("locale", locale);
  return render(
    createElement(StrictMode, null, createElement(I18nProvider, null, createElement(HomeBrandRow))),
  );
}

describe("static owner opening image", () => {
  it("archives the exact original owner JPEG without shipping another public copy", () => {
    const bytes = readFileSync(OWNER_IMAGE_ARCHIVE);
    expect(bytes.length).toBe(189560);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(OWNER_IMAGE_SHA256);
    expect(jpegSize(bytes)).toEqual({ width: 1280, height: 698 });
    expect(readdirSync("public/home/command-room").sort()).toEqual([
      "command-room-1280.webp",
      "command-room-640.webp",
      "manifest.json",
    ]);
  });

  it("keeps exactly two measured full-frame WebP derivatives and truthful manifest metadata", () => {
    const manifest = JSON.parse(readFileSync("public/home/command-room/manifest.json", "utf8"));
    expect(manifest.original).toBe(OWNER_IMAGE_ARCHIVE);
    expect(manifest.sha256).toBe(OWNER_IMAGE_SHA256);
    expect(manifest.originalBytes).toBe(189560);
    expect(manifest.variants).toEqual(OPENING_VARIANTS);
    for (const variant of OPENING_VARIANTS) {
      const bytes = readFileSync(`public/home/command-room/${variant.file}`);
      expect(bytes.length, variant.file).toBe(variant.bytes);
      expect(createHash("sha256").update(bytes).digest("hex"), variant.file).toBe(variant.sha256);
      expect(webpSize(bytes), variant.file).toEqual({
        width: variant.width,
        height: variant.height,
      });
      expect(variant.height).toBe(Math.round((variant.width * 698) / 1280));
    }
  });

  it("maps rendered source selection to the real derivative widths with the full-size fallback", () => {
    const view = mountHero();
    const image = view.getByTestId("home-opening-image").querySelector("img")!;
    const candidates = image
      .getAttribute("srcset")!
      .split(",")
      .map((entry) => {
        const match = /^(\S+)\s+(\d+)w$/.exec(entry.trim());
        expect(match, entry).not.toBeNull();
        return { src: match![1], width: Number(match![2]) };
      });
    expect(candidates).toEqual(
      OPENING_VARIANTS.map((variant) => ({
        src: `/home/command-room/${variant.file}${variant.width === 640 ? "?v=aac28d35a22b" : ""}`,
        width: variant.width,
      })),
    );
    expect(image).toHaveAttribute("src", "/home/command-room/command-room-1280.webp");
    expect(image.getAttribute("sizes")).toBe(HOME_OPENING_IMAGE.sizes);
    expect(image.getAttribute("sizes")).toMatch(/100vw/);
    view.unmount();
  });

  it.each(["ar", "en"] as const)(
    "preserves real owner text, localized alt and illustrative disclosure: %s",
    (locale) => {
      const view = mountHero(locale);
      const figure = view.getByTestId("home-opening-image");
      const caption = figure.querySelector("figcaption")!;
      const image = figure.querySelector("img")!;
      expect(HOME_BRAND.banner.title).toEqual({ ar: OWNER.ar, en: OWNER.en });
      expect(HOME_BRAND.banner.tagline).toEqual({ ar: OWNER.taglineAr, en: OWNER.taglineEn });
      expect(caption.querySelector('[lang="en"]')).toHaveTextContent(OWNER.en);
      expect(caption.querySelector('[lang="ar"]')).toHaveTextContent(OWNER.ar);
      expect(caption).toHaveTextContent(locale === "ar" ? OWNER.taglineAr : OWNER.taglineEn);
      expect(caption).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
      expect(image).toHaveAttribute("alt", HOME_OPENING_IMAGE.alt[locale]);
      const alt = image.getAttribute("alt")!.toLowerCase();
      const sceneDetails =
        locale === "ar"
          ? ["غرفة", "زرقاء", "خرائط", "مؤشرات", "مكاتب", "توضيحية"]
          : ["command room", "blue", "map", "dashboard", "desk", "illustrative"];
      for (const detail of sceneDetails) expect(alt).toContain(detail);
      expect(caption).toHaveTextContent(
        locale === "ar" ? /ليست بيانات تشغيلية حية/ : /not live operational data/i,
      );
      expect(figure.querySelectorAll("img")).toHaveLength(1);
      expect(heroMediaViolations(figure)).toEqual([]);
      expect(
        view.getByTestId("home-ticker").compareDocumentPosition(figure) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).not.toBe(0);
      view.unmount();
    },
  );

  it("prioritizes the exact attached image before the identity film before hydration effects", () => {
    const server = document.createElement("div");
    server.innerHTML = renderToString(
      createElement(I18nProvider, null, createElement(HomeBrandRow)),
    );
    const figure = server.querySelector('[data-testid="home-opening-image"]')!;
    const image = figure.querySelector("img")!;
    expect(
      figure.compareDocumentPosition(server.querySelector(".identity-film-hero")!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);
    expect(image).toHaveAttribute("loading", "eager");
    expect(image).toHaveAttribute("fetchpriority", "high");
    expect(image).toHaveAttribute("decoding", "async");
    expect(image).toHaveAttribute("width", "1280");
    expect(image).toHaveAttribute("height", "698");
    expect(BRAND_RATIO).toEqual({ width: 1280, height: 698 });
    expect(image.getAttribute("src")).toMatch(/\.webp$/);
    expect(image.getAttribute("srcset")).toBeTruthy();
    expect(image.getAttribute("sizes")).toBeTruthy();
    expect(image.getAttribute("alt")).not.toBe("");
    expect(heroMediaViolations(server)).toEqual([]);
  });

  it("keeps the original400KiB all-public/home guard unchanged", () => {
    expect(walkBytes("public/home")).toBeLessThanOrEqual(IMAGE_CEILING);
  });

  it("keeps a full-frame image and caption in normal flow without movement, cropping or overlays", () => {
    const poster = declarations(".nx-command-room-poster");
    expect(poster["inline-size"]).toBe("100%");
    expect(poster["block-size"]).toBe("auto");
    expect(poster["aspect-ratio"]).toBe("1280 / 698");
    expect(poster["object-fit"]).toBe("contain");
    expect(sceneStyleGaps(CSS)).toEqual([]);
  });

  it("rejects a seeded autoplay element and cropped/animated/overlay CSS", () => {
    const mutant = document.createElement("figure");
    mutant.innerHTML =
      '<img alt="illustrative command room"><video autoplay src="/media/brand/sadeed-film-804.mp4"></video>';
    expect(heroMediaViolations(mutant)).toHaveLength(1);
    expect(
      sceneStyleGaps(
        ".scene { object-fit: cover; position: absolute; opacity: .5; animation: reveal 1s; }",
      ),
    ).toEqual(["cropped scene", "overlay", "hidden content", "scene movement"]);
  });

  const preferences = [
    {
      label: "ordinary",
      reduced: false,
      saveData: false,
      safe: false,
      motionOff: false,
      cached: false,
    },
    {
      label: "cached image",
      reduced: false,
      saveData: false,
      safe: false,
      motionOff: false,
      cached: true,
    },
    {
      label: "reduced motion",
      reduced: true,
      saveData: false,
      safe: false,
      motionOff: false,
      cached: false,
    },
    {
      label: "save data",
      reduced: false,
      saveData: true,
      safe: false,
      motionOff: false,
      cached: false,
    },
    {
      label: "safe mode and motion off",
      reduced: true,
      saveData: true,
      safe: true,
      motionOff: true,
      cached: true,
    },
  ];
  it.each(preferences)(
    "never creates/plays/fetches media on mount, image load, gestures or navigation: $label",
    async (preference) => {
      vi.useFakeTimers();
      const connection = Object.getOwnPropertyDescriptor(navigator, "connection");
      Object.defineProperty(navigator, "connection", {
        configurable: true,
        value: { saveData: preference.saveData },
      });
      vi.stubGlobal(
        "matchMedia",
        vi.fn((query) => ({
          matches: preference.reduced,
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        })),
      );
      vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(preference.cached);
      if (preference.safe) document.documentElement.classList.add("safe-mode");
      if (preference.motionOff) document.documentElement.dataset.nxMotion = "off";
      localStorage.setItem("nx-brand-motion", "paused");
      localStorage.setItem("nx-brand-music", "on");
      const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
      const load = vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
      const listeners = vi.spyOn(HTMLMediaElement.prototype, "addEventListener");
      const create = vi.spyOn(document, "createElement");
      const dispatch = vi.spyOn(window, "dispatchEvent");
      const fetch = vi.fn().mockResolvedValue({ ok: true });
      const audio = vi.fn();
      vi.stubGlobal("fetch", fetch);
      vi.stubGlobal("Audio", audio);
      const xhr = vi.spyOn(XMLHttpRequest.prototype, "open").mockImplementation(() => {});
      let view: ReturnType<typeof mountHero> | undefined;
      try {
        view = mountHero();
        const image = view.getByTestId("home-opening-image").querySelector("img")!;
        await act(async () => {
          fireEvent.load(image);
          fireEvent.click(image);
          fireEvent.pointerDown(document.body);
          fireEvent.keyDown(document.body, { key: "Enter" });
          for (const observer of VisibilityObserver.instances) observer.show(false);
          for (const observer of VisibilityObserver.instances) observer.show(true);
          window.dispatchEvent(new Event("pageshow"));
          window.dispatchEvent(new PopStateEvent("popstate"));
          vi.advanceTimersByTime(60_000);
        });
        expect(heroMediaViolations(view.container)).toEqual([]);
        view.unmount();
        view = mountHero("en");
        await act(async () => {
          vi.advanceTimersByTime(60_000);
        });
        expect(heroMediaViolations(view.container)).toEqual([]);
        view.unmount();
        expect(create.mock.calls.filter(([tag]) => /^(?:video|audio)$/i.test(String(tag)))).toEqual(
          [],
        );
        expect(play).not.toHaveBeenCalled();
        expect(load).not.toHaveBeenCalled();
        expect(listeners).not.toHaveBeenCalled();
        expect(audio).not.toHaveBeenCalled();
        expect(fetch).not.toHaveBeenCalled();
        expect(xhr).not.toHaveBeenCalled();
        // The shared ticker/background pause interface is preserved; no new media
        // request/selection/play custom event may originate from the static hero.
        expect(
          dispatch.mock.calls.filter(
            ([event]) => event instanceof CustomEvent && event.type !== "nx:motion-pause",
          ),
        ).toEqual([]);
        expect(VisibilityObserver.instances.length).toBeGreaterThan(0);
        expect(
          VisibilityObserver.instances.every(
            (observer) => observer.disconnect.mock.calls.length > 0,
          ),
        ).toBe(true);
      } finally {
        view?.unmount();
        if (connection) Object.defineProperty(navigator, "connection", connection);
        else Reflect.deleteProperty(navigator, "connection");
      }
    },
  );
});

describe("original gallery media and embedded soundtracks remain unchanged", () => {
  it("preserves all four original hashes and the original per-file/aggregate ceilings", () => {
    expect(ORIGINAL_FILMS).toHaveLength(4);
    let total = 0;
    for (const film of ORIGINAL_FILMS) {
      const path = `public/media/brand/sadeed-film-${film.width}.${film.format}`;
      const bytes = readFileSync(path);
      expect(createHash("sha256").update(bytes).digest("hex"), path).toBe(film.sha256);
      expect(bytes.length, path).toBeLessThanOrEqual(
        film.width === 804 ? FILM_CEILING.phone : FILM_CEILING.each,
      );
      total += bytes.length;
    }
    expect(total).toBeLessThanOrEqual(FILM_CEILING.total);
    expect(
      readdirSync("public/media/brand").filter((name) => /^sadeed-film-score\./.test(name)),
    ).toEqual([]);
  });

  it.each([804, 1608])(
    "keeps one H.264/AAC and VP9/Opus track pair with the original26-second MP4 duration: %s",
    (width) => {
      expect(
        filmTrackGaps(
          readFileSync(`public/media/brand/sadeed-film-${width}.mp4`),
          readFileSync(`public/media/brand/sadeed-film-${width}.webm`),
        ),
      ).toEqual([]);
    },
  );

  it("the byte parser rejects a seeded missing soundtrack and wrong duration", () => {
    const mp4 = readFileSync("public/media/brand/sadeed-film-804.mp4");
    const webm = readFileSync("public/media/brand/sadeed-film-804.webm");
    const muted = Buffer.from(mp4);
    const handler = muted.indexOf("soun", muted.indexOf("hdlr"));
    expect(handler).toBeGreaterThan(0);
    muted.write("vide", handler, "latin1");
    expect(filmTrackGaps(muted, webm)).toContain("one AAC soundtrack");
    const shorter = Buffer.from(mp4);
    const mvhd = shorter.indexOf("mvhd");
    expect(mvhd).toBeGreaterThan(0);
    expect(shorter[mvhd + 4]).toBe(0);
    shorter.writeUInt32BE(shorter.readUInt32BE(mvhd + 16) * 13, mvhd + 20);
    expect(filmTrackGaps(shorter, webm)).toContain("26-second container");
  });
});

describe("shared original-film natural-speed contract", () => {
  it("keeps26 seconds of untouched source at1x for26 seconds, including the historical tier tolerance", () => {
    expect(FILM_PLAYBACK_RATE).toBe(1);
    expect(FILM_SOURCE_SECONDS).toBe(26);
    expect(FILM_EFFECTIVE_SECONDS).toBe(26);
    expect(FILM_UPSCALE_LIMIT).toBe(1.15);
  });

  it.each([
    [26, 1],
    [26.008, 1],
    [0, 1],
    [Number.NaN, 1],
    [Infinity, 1],
    [39, 1],
    [39.01, 1],
    [51.934, 1],
    [52, 1],
  ])("keeps natural playback for every container duration%s", (duration, expected) => {
    expect(filmRateFor(duration)).toBe(expected);
  });

  it("reapplies both rates on real media lifecycle events without starting or loading media", () => {
    const video = document.createElement("video");
    Object.defineProperty(video, "duration", { configurable: true, value: 26 });
    const play = vi.spyOn(video, "play");
    const load = vi.spyOn(video, "load");
    const release = holdFilmRate(video);
    expect(video.defaultPlaybackRate).toBe(1);
    expect(video.playbackRate).toBe(1);
    for (const event of ["loadstart", "loadedmetadata", "playing", "ratechange"]) {
      video.defaultPlaybackRate = 0.5;
      video.playbackRate = 0.5;
      video.dispatchEvent(new Event(event));
      expect(video.defaultPlaybackRate, event).toBe(1);
      expect(video.playbackRate, event).toBe(1);
    }
    Object.defineProperty(video, "duration", { configurable: true, value: 52 });
    video.dispatchEvent(new Event("loadedmetadata"));
    expect(video.defaultPlaybackRate).toBe(1);
    expect(video.playbackRate).toBe(1);
    expect(play).not.toHaveBeenCalled();
    expect(load).not.toHaveBeenCalled();
    release();
  });

  it("settles a synchronous ratechange after one corrective write and removes all listeners on release", () => {
    const video = document.createElement("video");
    Object.defineProperty(video, "duration", { configurable: true, value: 26 });
    let rate = 0.5;
    const writes: number[] = [];
    Object.defineProperty(video, "playbackRate", {
      configurable: true,
      get: () => rate,
      set: (value: number) => {
        writes.push(value);
        rate = value;
        video.dispatchEvent(new Event("ratechange"));
      },
    });
    const release = holdFilmRate(video);
    expect(writes).toEqual([1]);
    writes.length = 0;
    rate = 0.5;
    video.dispatchEvent(new Event("ratechange"));
    expect(writes).toEqual([1]);
    release();
    rate = 0.5;
    video.defaultPlaybackRate = 0.5;
    for (const event of ["loadstart", "loadedmetadata", "playing", "ratechange"])
      video.dispatchEvent(new Event(event));
    expect(rate).toBe(0.5);
    expect(video.defaultPlaybackRate).toBe(0.5);
    expect(writes).toEqual([1]);
  });
});
