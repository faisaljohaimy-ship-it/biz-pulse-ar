/**
 * عقد قسم فيلم التوأم في أسفل الرئيسية مُصيَّرًا (jsdom) — **تعذّر حزمة المشغّل لا يهدم الصفحة.**
 *
 * المقيس ٢٠٢٦/١٠/٢٩ قبل الإصلاح (Playwright، قطع طلب حزمة `TwinFilmPlayer` وردّ 404 عليه):
 * بعد التمرير إلى القسم زالت `main` والصفوف والخاتمة والإفصاح كلّها، وحلّت شاشة «حدث خطأ —
 * جارٍ الاستعادة» برسالة `Failed to fetch dynamically imported module` الإنجليزية الخام —
 * لأن `lazy()` بلا التقاط يرفع الرفض إلى حدّ خطأ الجذر. في `/sec/twin` كان المشغّل ساكنًا فلم
 * يكن للعطل وجود؛ النقل أحدثه.
 *
 * ما يكسره التعديل ولا يراه tsc ولا البناء:
 *   • إزالة `.catch` من الاستيراد الكسول، أو بديلٌ يرمي بدوره؛
 *   • بديلٌ بلا الملصق أو بلا التعليق (يقفز الارتفاع ويضيع الإفصاح)؛
 *   • طلبُ الحزمة قبل الاقتراب (المراقب مزيّف هنا والاختبار يقرّر الظهور).
 *
 * الحزمة تُزيَّف على مستوى السجلّ: `vi.doMock` بمصنعٍ يرمي ⇐ `import()` يرفض كما يرفض المتصفّح،
 * و`vi.resetModules` يعطي كلَّ حالةٍ `lazy()` جديدًا (الرفض والنجاح يُحفظان داخله).
 * **زُرع الانتهاك فعلًا** (المادة ٣٠): بإزالة `.catch` من المكوّن تحمرّ حالة التعذّر —
 * `render` يرمي الخطأ نفسه ويسجّل React استعادة الشجرة من حدّ الخطأ.
 */
import { createElement, type ReactNode } from "react";
import { act, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const PLAYER_MODULE = "@/components/twin/TwinFilmPlayer";
const CHUNK_ERROR =
  "Failed to fetch dynamically imported module: /src/components/twin/TwinFilmPlayer.tsx";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...rest }: { children?: ReactNode; to: string }) =>
    createElement("a", { href: to, ...rest }, children),
}));

/** مراقب اقترابٍ مزيّف — الاختبار يقرّر الاقتراب. */
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
  static approach() {
    for (const o of [...FakeObserver.all]) {
      o.cb(
        [{ isIntersecting: true, intersectionRatio: 1 } as IntersectionObserverEntry],
        o as unknown as IntersectionObserver,
      );
    }
  }
}

/** يحمّل القسم ومزوّد اللغة من سجلّ وحداتٍ جديد، والمشغّل إمّا يُرفض استيراده أو يصل. */
async function load(player: "rejects" | "arrives") {
  vi.resetModules();
  if (player === "rejects") {
    vi.doMock(PLAYER_MODULE, () => {
      throw new TypeError(CHUNK_ERROR);
    });
  } else {
    vi.doUnmock(PLAYER_MODULE);
  }
  const [{ HomeTwinSection }, { I18nProvider }] = await Promise.all([
    import("@/components/home/HomeTwinSection"),
    import("@/lib/i18n"),
  ]);
  return { HomeTwinSection, I18nProvider };
}

/** الصفحة مختزلة: القسم ثم الإفصاح بعده — كما في `-blueprint-page.tsx`. */
async function mountPage(player: "rejects" | "arrives") {
  const { HomeTwinSection, I18nProvider } = await load(player);
  const view = render(
    createElement(
      I18nProvider,
      null,
      createElement(
        "div",
        null,
        createElement(HomeTwinSection),
        createElement(
          "footer",
          { className: "nx-bp-stage" },
          createElement("p", { className: "nx-bp-note" }, "سطر الإفصاح"),
        ),
      ),
    ),
  );
  await act(async () => {});
  return view;
}

const sectionOf = (c: HTMLElement) => c.querySelector("section.nx-home-twin");
/** بديل الانتظار (مساحة `Suspense`) — قبل الاقتراب وريثما تصل الحزمة. */
const pendingOf = (c: HTMLElement) => c.querySelector('.twin-film[data-placeholder="pending"]');
/** بديل التعذّر — المكوّن الذي حلّ محلّ المشغّل بعد رفض الحزمة. */
const unavailableOf = (c: HTMLElement) =>
  c.querySelector('.twin-film[data-placeholder="unavailable"]');
const playerOf = (c: HTMLElement) => c.querySelector("figure.twin-film");

/**
 * ينتظر استقرار `Suspense` على ما يُنتظر (بديل التعذّر أو المشغّل) — الرفض والوصول الحقيقيان
 * يأخذان مهامّ كبرى لا مهامّ دقيقة وحدها. بلا هذا الانتظار يمرّ فحص التعذّر على مساحة
 * `Suspense` قبل أن يُعالَج الرفض أصلًا.
 */
async function settle(container: HTMLElement, expected: "unavailable" | "player") {
  await waitFor(() => {
    const found = expected === "player" ? playerOf(container) : unavailableOf(container);
    expect(found, expected === "player" ? "المشغّل لم يصل" : "بديل التعذّر لم يحلّ").not.toBeNull();
  });
  await act(async () => {});
}

beforeEach(() => {
  FakeObserver.all = [];
  vi.stubGlobal("IntersectionObserver", FakeObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.doUnmock(PLAYER_MODULE);
  localStorage.removeItem("locale");
});

describe("الرئيسية — قسم فيلم التوأم حين تتعذّر حزمة المشغّل", () => {
  it("قبل الاقتراب: البديل وحده (ملصقٌ وتعليق)، ولا تُطلب الحزمة", async () => {
    const importSpy = vi.fn();
    vi.doMock(PLAYER_MODULE, () => {
      importSpy();
      throw new TypeError(CHUNK_ERROR);
    });
    const view = await mountPage("rejects");
    expect(sectionOf(view.container)).not.toBeNull();
    expect(pendingOf(view.container), "البديل غائب قبل الاقتراب").not.toBeNull();
    expect(playerOf(view.container)).toBeNull();
    expect(importSpy, "طُلبت الحزمة قبل الاقتراب").not.toHaveBeenCalled();
    expect(FakeObserver.all.length, "لا مراقب اقتراب").toBeGreaterThan(0);
    view.unmount();
  });

  it("الاقتراب ثم رفض الحزمة: القسم والعنوان والرابط والبديل والإفصاح باقية، ولا خطأ يصعد", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const view = await mountPage("rejects");
    await act(async () => {
      FakeObserver.approach();
    });
    await settle(view.container, "unavailable");
    const { container } = view;
    expect(sectionOf(container), "القسم زال").not.toBeNull();
    expect(container.querySelector("#nx-home-twin-title")!.textContent).toBe(
      "التوأم الرقمي السينمائي",
    );
    expect(container.querySelector('a[href="/cinematic"]')!.textContent).toBe(
      "فتح التجربة السينمائية",
    );
    expect(playerOf(container), "مشغّلٌ ظهر من حزمةٍ مرفوضة").toBeNull();
    expect(pendingOf(container), "بديل الانتظار بقي مع بديل التعذّر").toBeNull();
    const placeholder = unavailableOf(container);
    expect(placeholder, "البديل زال بعد الرفض").not.toBeNull();
    expect(placeholder!.querySelector("img.twin-film-poster")).not.toBeNull();
    expect(placeholder!.querySelector(".twin-film-caption")!.textContent).toMatch(
      /ليس بثًّا حيًّا/,
    );
    expect(container.querySelector("footer.nx-bp-stage .nx-bp-note")!.textContent).toBe(
      "سطر الإفصاح",
    );
    // لا رسالة إنجليزية خام ولا شاشة خطأ.
    expect(container.textContent).not.toMatch(/Failed to fetch|حدث خطأ/);
    const logged = consoleError.mock.calls.flat().map(String).join("\n");
    expect(logged, "React استعاد الشجرة من حدّ خطأ").not.toMatch(
      /recreate this component tree|Failed to fetch/,
    );
    view.unmount();
  });

  it("والإنجليزية: البديل بلغة الواجهة بعد الرفض", async () => {
    localStorage.setItem("locale", "en");
    const view = await mountPage("rejects");
    await act(async () => {
      FakeObserver.approach();
    });
    await settle(view.container, "unavailable");
    expect(unavailableOf(view.container)!.querySelector(".twin-film-caption")!.textContent).toMatch(
      /not a live feed/,
    );
    view.unmount();
  });

  it("وحين تصل الحزمة: يحلّ المشغّل محلّ البديل (الالتقاط لا يبتلع النجاح)", async () => {
    const view = await mountPage("arrives");
    expect(playerOf(view.container)).toBeNull();
    await act(async () => {
      FakeObserver.approach();
    });
    await settle(view.container, "player");
    expect(pendingOf(view.container), "بديل الانتظار بقي مع المشغّل").toBeNull();
    expect(unavailableOf(view.container), "بديل التعذّر ظهر والحزمة وصلت").toBeNull();
    expect(sectionOf(view.container)).not.toBeNull();
    view.unmount();
  });
});
