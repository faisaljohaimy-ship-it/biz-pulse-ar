/**
 * عقد فيديو ترحيب سَدِيد — حارس `SadeedWelcomeVideo`.
 *
 * المرجع: عقد الوكلاء المشترك (BRIEF) — الاختبار مكتوب على العقد لا على
 * تنفيذٍ بعينه، والمكوّن يُكتب بالتوازي في جلسة أخرى.
 *
 * البنود العشرة:
 *  ① `preload="none"` — الفيديو ~12MiB؛ تحميله مع الصفحة يكسر ميزانية
 *    الأداء التي بُنيت فتحة `sadeed-assistant-slot` لتجنّبها (انظر تعليق
 *    الفتحة في `-blueprint-page.tsx`: لا وحدة ثقيلة تُجرّ إلى مسار الدخول).
 *  ② لا `autoPlay` إطلاقًا — الصوت خلف نقرة المستخدم حصرًا.
 *  ③ الملصق زر `<button>` بـ`aria-label` عربي وصورته `/sadeed-stage-poster.webp`.
 *  ④ زر «تخطّي» ظاهر أثناء التشغيل.
 *  ⑤ `playsInline` — بدونه iOS يفتح ملء الشاشة.
 *  ⑥ رفض `play()` ممسوك (NotAllowedError وأشباهه) — لا رفض غير معالج.
 *  ⑦ لا `speechSynthesis` ولا استيراد وحدات صوت/كوبايلوت.
 *  ⑧ الأصلان `public/sadeed-welcome.mp4` (≤ 12MiB) و
 *    `public/sadeed-stage-poster.webp` (≤ 500KB) موجودان فعلًا.
 *  ⑨ `public/sw.js` لا يخزّن الفيديو مسبقًا — 12MiB في `cache.addAll`
 *    الذرّية يعطّل التثبيت كلّه على كل زيارة.
 *  ⑩ المكوّن مركّب أوّل عنصر داخل `SadeedStagePresence` قبل بقية المحتوى.
 *
 * منهج الفحص النصّي: التعليقات تُنزع قبل أي بحث — التعليق ليس قاعدة،
 * وذِكر `autoPlay` أو اسم الفيديو في تعليقٍ ليس مخالفة.
 *
 * `SADEED_WELCOME_FIXTURE_DIR` (بيئة): لإثبات الإسقاط المصطنع فقط —
 * يعاد توجيه القراءة إلى نسخة مكسورة في ‎/tmp‎ دون لمس ملفات الوكلاء
 * الآخرين. لا يُضبط في CI؛ غيابه = فحص ملفات المستودع الحقيقية.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { createElement, type ComponentType } from "react";

const ROOT = process.cwd();
const FIXTURE_DIR = process.env.SADEED_WELCOME_FIXTURE_DIR;

const REAL = {
  component: join(ROOT, "src/components/sadeed/SadeedWelcomeVideo.tsx"),
  stage: join(ROOT, "src/components/sadeed/SadeedStagePresence.tsx"),
  sw: join(ROOT, "public/sw.js"),
  mp4: join(ROOT, "public/sadeed-welcome.mp4"),
  poster: join(ROOT, "public/sadeed-stage-poster.webp"),
} as const;

const FIXTURE_NAMES: Record<keyof typeof REAL, string> = {
  component: "SadeedWelcomeVideo.tsx",
  stage: "SadeedStagePresence.tsx",
  sw: "sw.js",
  mp4: "sadeed-welcome.mp4",
  poster: "sadeed-stage-poster.webp",
};

/**
 * المسار الفعلي للفحص. حين يُضبط `SADEED_WELCOME_FIXTURE_DIR` يكون مجلد
 * الـfixture سلطةً كاملة — لا سقوط إلى ملفات المستودع، وإلا لأنقذ الملفُ
 * الحقيقي نسخةَ الإسقاط المصطنع من الفشل الذي وُجدت لإثباته.
 */
function target(name: keyof typeof REAL): string {
  return FIXTURE_DIR ? join(FIXTURE_DIR, FIXTURE_NAMES[name]) : REAL[name];
}

const MSG_COMPONENT_MISSING =
  "وكيل المكوّن لم يسلّم src/components/sadeed/SadeedWelcomeVideo.tsx بعد";
const MSG_MP4_MISSING = "وكيل الوسائط لم يسلّم public/sadeed-welcome.mp4 بعد";
const MSG_POSTER_MISSING = "وكيل الوسائط لم يسلّم public/sadeed-stage-poster.webp بعد";

/**
 * نزع التعليقات قبل الفحص النصّي — الكتلية (ومنها تعليقات JSX)
 * والسطرية `//` (مع إبقاء `https://` ونحوها داخل النصوص).
 */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:"'`\\])\/\/[^\n]*/gm, "$1");
}

function componentSource(): string {
  const p = target("component");
  expect(existsSync(p), MSG_COMPONENT_MISSING).toBe(true);
  return stripComments(readFileSync(p, "utf8"));
}

/** إزالة التشكيل والتطويل لمطابقة «تخطّي» بأي رسم. */
function stripDiacritics(s: string): string {
  return s.replace(/[ً-ْـ]/g, "");
}

const ARABIC = /[؀-ۿ]/;

// jsdom لا ينفّذ التشغيل الإعلامي — نثبّت play/pause/load ونراقب play:
// «الصوت خلف نقرة المستخدم حصرًا» يعني صفر نداءات play قبل النقرة.
//
// بديل play دالة عادية عمدًا لا `vi.fn`: tinyspy (قلب `vi.fn`) يعلّق
// معالِجات على الوعد المعاد ليسجّل settledResults، فيتبنّى الرفض بصمت
// ولا يصل `unhandledRejection` أبدًا — وبذلك يمرّ تنفيذٌ بلا catch.
// (أُثبت بالإسقاط المصطنع V06b قبل هذا الإصلاح.)
const playState = {
  calls: 0,
  impl: (() => Promise.resolve()) as () => Promise<void>,
};

beforeAll(() => {
  for (const [key, value] of Object.entries({
    play(this: HTMLMediaElement) {
      playState.calls += 1;
      return playState.impl();
    },
    pause() {},
    load() {},
  })) {
    Object.defineProperty(HTMLMediaElement.prototype, key, {
      configurable: true,
      writable: true,
      value,
    });
  }
});

beforeEach(() => {
  playState.calls = 0;
  playState.impl = () => Promise.resolve();
});

async function loadWelcome(): Promise<ComponentType> {
  // نسخة الإسقاط المصطنع تعيش خارج جذر vite (حيث يمنع fs.allow القراءة)،
  // فتُحمَّل بمحمّل node المباشر: ملف ‎.cjs‎ بلا JSX، بينما ملف ‎.tsx‎ في
  // الـfixture يبقى هدف الفحص النصّي وحده.
  const fixture = FIXTURE_DIR ? join(FIXTURE_DIR, "SadeedWelcomeVideo.fixture.cjs") : null;
  const mod =
    fixture && existsSync(fixture)
      ? (createRequire(import.meta.url)(fixture) as Record<string, unknown>)
      : ((await import("./SadeedWelcomeVideo")) as Record<string, unknown>);
  const Comp = (mod.SadeedWelcomeVideo ?? mod.default) as ComponentType | undefined;
  expect(Comp, "الملف لا يصدّر SadeedWelcomeVideo (لا تصديرًا مسمًّى ولا default)").toBeTruthy();
  return Comp as ComponentType;
}

// الجذر هو حاوية التصيير لا عنصر الـtestid: العقد لا يحدّد أين يجلس
// data-testid داخل شجرة المكوّن (على الجذر أو على <video> نفسه)، والكتابة
// على العقد تعني قبول الموضعين — والتحقق من وجوده بعد بدء التشغيل.
async function renderWelcome() {
  const Comp = await loadWelcome();
  const utils = render(createElement(Comp));
  return { ...utils, root: utils.container as HTMLElement };
}

function posterButton(root: HTMLElement): HTMLButtonElement {
  const buttons = Array.from(root.querySelectorAll("button"));
  const arabicLabelled = buttons.filter((b) => ARABIC.test(b.getAttribute("aria-label") ?? ""));
  expect(arabicLabelled.length, "لا يوجد <button> بـaria-label عربي يعمل ملصقًا").toBeGreaterThan(
    0,
  );
  return (
    arabicLabelled.find((b) => b.innerHTML.includes("sadeed-stage-poster")) ?? arabicLabelled[0]
  );
}

function findSkipButton(root: HTMLElement): HTMLButtonElement | null {
  return (
    Array.from(root.querySelectorAll("button")).find((b) =>
      /تخط/.test(stripDiacritics(`${b.textContent ?? ""} ${b.getAttribute("aria-label") ?? ""}`)),
    ) ?? null
  );
}

/** نقرة الملصق ثم انتظار ظهور `<video>` — الإيماءة قبل أي تشغيل. */
async function startPlayback(root: HTMLElement): Promise<HTMLVideoElement> {
  const btn = posterButton(root);
  fireEvent.pointerDown(btn);
  fireEvent.click(btn);
  return await waitFor(() => {
    const v = root.querySelector("video");
    expect(v, "لا <video> بعد نقرة الملصق").not.toBeNull();
    return v as HTMLVideoElement;
  });
}

/* ────────────────────────── ① preload="none" ────────────────────────── */

describe("① preload='none' — الفيديو لا يُحمَّل مع الصفحة", () => {
  it("المصدر يكتب preload بقيمة none ولا يكتب أي قيمة أخرى", () => {
    const src = componentSource();
    expect(
      /preload\s*=\s*\{?\s*["'`]none["'`]\s*\}?/.test(src),
      'لا preload="none" في مصدر المكوّن — 12MiB ستُجلب مع الصفحة',
    ).toBe(true);
    expect(
      /preload\s*=\s*(?:\{\s*)?["'`](?!none["'`])/.test(src),
      "قيمة preload غير none موجودة في المصدر",
    ).toBe(false);
  });

  it("عنصر الفيديو المُصيَّر يحمل preload='none' فعلًا", async () => {
    const { root } = await renderWelcome();
    const before = root.querySelector("video");
    if (before) {
      expect(before.getAttribute("preload")).toBe("none");
    }
    const video = await startPlayback(root);
    expect(video.getAttribute("preload")).toBe("none");
  });
});

/* ─────────────────────────── ② لا autoPlay ─────────────────────────── */

describe("② لا autoPlay — الصوت خلف نقرة المستخدم حصرًا", () => {
  it("المصدر (بعد نزع التعليقات) خالٍ من autoPlay/autoplay", () => {
    const src = componentSource();
    expect(/\bauto[Pp]lay\b/.test(src), "autoPlay موجود في مصدر المكوّن").toBe(false);
  });

  it("لا نداء play() قبل النقرة، ونداء واحد على الأقل بعدها", async () => {
    const { root } = await renderWelcome();
    await new Promise((r) => setTimeout(r, 20));
    expect(playState.calls, "play() نُودي قبل أي إيماءة مستخدم — تشغيل تلقائي مقنَّع").toBe(0);

    const video = await startPlayback(root);
    expect(video.hasAttribute("autoplay")).toBe(false);
    await waitFor(() => {
      expect(
        playState.calls,
        "النقرة لم تشغّل الفيديو — العقد: النقر يشغّل بالصوت",
      ).toBeGreaterThan(0);
    });
  });
});

/* ───────────────── ③ الملصق زر بـaria-label عربي ───────────────── */

describe("③ الملصق سطح نقر: <button> بوصف عربي وصورة الملصق", () => {
  it("زر حقيقي بـaria-label عربي، والملصق /sadeed-stage-poster.webp حاضر", async () => {
    const { root } = await renderWelcome();
    const btn = posterButton(root);
    expect(btn.tagName).toBe("BUTTON");
    expect(ARABIC.test(btn.getAttribute("aria-label") ?? "")).toBe(true);
    expect(
      root.innerHTML.includes("sadeed-stage-poster.webp"),
      "صورة الملصق /sadeed-stage-poster.webp غير مستعملة في حالة الملصق",
    ).toBe(true);
  });

  it("المصدر يشير إلى /sadeed-welcome.mp4 و/sadeed-stage-poster.webp", () => {
    const src = componentSource();
    expect(src).toContain("/sadeed-welcome.mp4");
    expect(src).toContain("/sadeed-stage-poster.webp");
  });

  it("data-testid='sadeed-welcome-video' حاضر بعد بدء التشغيل", async () => {
    const { root } = await renderWelcome();
    await startPlayback(root);
    expect(
      root.querySelector('[data-testid="sadeed-welcome-video"]'),
      "معرّف الاختبار المتّفق عليه في BRIEF غائب",
    ).not.toBeNull();
  });
});

/* ──────────────────── ④ زر «تخطّي» أثناء التشغيل ──────────────────── */

describe("④ زر تخطّي ظاهر في حالة التشغيل", () => {
  it("بعد نقرة الملصق يوجد <button> نصّه أو وصفه «تخطّي»", async () => {
    const { root } = await renderWelcome();
    await startPlayback(root);
    const skip = findSkipButton(root);
    expect(skip, "لا زر «تخطّي» أثناء التشغيل").not.toBeNull();
    expect((skip as HTMLButtonElement).tagName).toBe("BUTTON");
  });
});

/* ─────────────────────────── ⑤ playsInline ─────────────────────────── */

describe("⑤ playsInline — iOS لا يُقذف إلى ملء الشاشة", () => {
  it("المصدر يحمل playsInline", () => {
    expect(/\bplaysInline\b/.test(componentSource()), "playsInline غائب عن مصدر المكوّن").toBe(
      true,
    );
  });

  it("عنصر الفيديو المُصيَّر يحمل السمة playsinline", async () => {
    const { root } = await renderWelcome();
    const video = await startPlayback(root);
    expect(video.hasAttribute("playsinline")).toBe(true);
  });
});

/* ─────────────────────── ⑥ رفض play() ممسوك ─────────────────────── */

describe("⑥ رفض play() ممسوك — NotAllowedError لا يكسر شيئًا", () => {
  it("كل نداء .play( في المصدر داخل نافذة فيها catch", () => {
    const src = componentSource();
    const indices: number[] = [];
    for (let i = src.indexOf(".play("); i !== -1; i = src.indexOf(".play(", i + 1)) {
      indices.push(i);
    }
    expect(indices.length, "لا نداء .play( في المصدر إطلاقًا").toBeGreaterThan(0);
    for (const i of indices) {
      const windowTxt = src.slice(Math.max(0, i - 300), i + 300);
      expect(
        /\bcatch\b/.test(windowTxt),
        "نداء .play( بلا catch في جواره — رفض التشغيل سيتسرّب",
      ).toBe(true);
    }
  });

  it("رفضٌ فعلي من play() لا يولّد رفضًا غير معالج", async () => {
    const rejections: unknown[] = [];
    const onRejection = (reason: unknown) => {
      rejections.push(reason);
    };
    process.on("unhandledRejection", onRejection);
    try {
      playState.impl = () => Promise.reject(new Error("NotAllowedError"));
      const { root } = await renderWelcome();
      const btn = posterButton(root);
      fireEvent.pointerDown(btn);
      fireEvent.click(btn);
      // مهلتان لتفريغ صفَّي الوعود قبل الحكم.
      await new Promise((r) => setTimeout(r, 30));
      await new Promise((r) => setTimeout(r, 0));
      expect(rejections, "رفض play() تسرّب رفضًا غير معالج — لا catch على مسار التشغيل").toEqual(
        [],
      );
    } finally {
      process.off("unhandledRejection", onRejection);
    }
  });
});

/* ──────────── ⑦ لا speechSynthesis ولا وحدات صوت/كوبايلوت ──────────── */

describe("⑦ عزل المكوّن: لا صوت متصفّح ولا كوبايلوت", () => {
  it("لا speechSynthesis في المصدر (بعد نزع التعليقات)", () => {
    expect(/speechSynthesis|SpeechSynthesisUtterance/.test(componentSource())).toBe(false);
  });

  it("لا استيراد لوحدات صوت/كوبايلوت — الاستيراد يجرّها إلى مسار الدخول", () => {
    const src = componentSource();
    const specifiers: string[] = [];
    const patterns = [
      /import\s[^"'\n]*["']([^"']+)["']/g,
      /import\(\s*["']([^"']+)["']\s*\)/g,
      /require\(\s*["']([^"']+)["']\s*\)/g,
    ];
    for (const re of patterns) {
      for (let m = re.exec(src); m; m = re.exec(src)) {
        specifiers.push(m[1]);
      }
    }
    const forbidden = specifiers.filter((s) =>
      /(copilot|audio|voice|tts|speech|eleven|sadeed-core)/i.test(s),
    );
    expect(forbidden, `استيراد محظور في مكوّن الترحيب: ${forbidden.join(", ")}`).toEqual([]);
  });
});

/* ──────────────────────── ⑧ الأصلان موجودان ──────────────────────── */

describe("⑧ أصلا الوسائط مسلَّمان داخل public/", () => {
  it(`الفيديو موجود و≤ 12MiB — ${MSG_MP4_MISSING}`, () => {
    const p = target("mp4");
    expect(existsSync(p), MSG_MP4_MISSING).toBe(true);
    expect(
      statSync(p).size,
      "sadeed-welcome.mp4 يتجاوز سقف 12MiB المتّفق عليه",
    ).toBeLessThanOrEqual(12 * 1024 * 1024);
  });

  it(`الملصق موجود و≤ 500KB — ${MSG_POSTER_MISSING}`, () => {
    const p = target("poster");
    expect(existsSync(p), MSG_POSTER_MISSING).toBe(true);
    expect(
      statSync(p).size,
      "sadeed-stage-poster.webp يتجاوز سقف 500KB المتّفق عليه",
    ).toBeLessThanOrEqual(500 * 1024);
  });
});

/* ─────────────── ⑨ sw.js لا يخزّن الفيديو مسبقًا ─────────────── */

describe("⑨ خدمة العامل لا تسحب 12MiB على كل تثبيت", () => {
  it("PRECACHE لا يتضمّن sadeed-welcome.mp4، ولا أي addAll حرفي", () => {
    const sw = stripComments(readFileSync(target("sw"), "utf8"));
    const precache = /\bPRECACHE\s*=\s*\[([\s\S]*?)\]/.exec(sw);
    expect(
      precache,
      "قائمة PRECACHE غير موجودة في sw.js — تغيّر الشكل، حدّث الحارس",
    ).not.toBeNull();
    expect(
      (precache as RegExpExecArray)[1].includes("sadeed-welcome"),
      "sadeed-welcome.mp4 داخل PRECACHE — cache.addAll ذرّية و12MiB تعطّل التثبيت",
    ).toBe(false);
    expect(
      /addAll\s*\(\s*\[[^\]]*sadeed-welcome/.test(sw),
      "sadeed-welcome.mp4 داخل نداء addAll حرفي في sw.js",
    ).toBe(false);
  });
});

/* ─────────── ⑩ التركيب داخل SadeedStagePresence أولًا ─────────── */

describe("⑩ مركّب أوّل عنصر داخل SadeedStagePresence", () => {
  it("SadeedStagePresence يستورد المكوّن ويصيّره قبل بقية المحتوى", () => {
    const stage = stripComments(readFileSync(target("stage"), "utf8"));
    expect(
      /import\s[^\n]*SadeedWelcomeVideo/.test(stage),
      "SadeedStagePresence لا يستورد SadeedWelcomeVideo — لم يُركَّب بعد",
    ).toBe(true);
    const mountIdx = stage.indexOf("<SadeedWelcomeVideo");
    expect(mountIdx, "لا <SadeedWelcomeVideo داخل JSX للـSadeedStagePresence").toBeGreaterThan(-1);
    for (const marker of ["<SadeedVideoAvatar", "<h2"]) {
      const idx = stage.indexOf(marker);
      if (idx !== -1) {
        expect(
          mountIdx,
          `SadeedWelcomeVideo مركّب بعد ${marker} — العقد: أوّل عنصر قبل بقية المحتوى`,
        ).toBeLessThan(idx);
      }
    }
  });
});
