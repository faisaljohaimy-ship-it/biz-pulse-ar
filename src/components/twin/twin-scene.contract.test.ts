/**
 * عقد التوأم السينمائي.
 *
 * ## لماذا عقدٌ لا لقطة شاشة
 *
 * ما ينكسر في مشهدٍ ثلاثي لا تلتقطه لقطة واحدة ولا يشكو منه `tsc`: كاميرا
 * تظلّ تدور تحت `prefers-reduced-motion` (خرق WCAG 2.2.2 لا يراه من لم
 * يُفعّل التفضيل)، لونٌ يُكتب نهائيًّا في مادّة فيتجمّد على وضعٍ واحد، صفرٌ
 * يحلّ محلّ غياب فيرتفع عمودٌ لمنطقة لم تُقَس، أو WebGL يسقط فيبقى مربّع
 * أسود مكان المشهد. أربعتها قابلة للفحص **قبل الرسم**: ثلاثةٌ منها على
 * دوالّ خالصة، والرابعة على تركيبٍ فعليّ في jsdom (حيث لا WebGL أصلًا).
 *
 * وكل تأكيد هنا أُسقط بكسرٍ مصطنع قبل اعتماده — التأكيد الذي يمرّ في كل
 * الأحوال ليس حارسًا بل زينة.
 */
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { render, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { REGIONS, REGION_ACCENT_HEX, type RegionId } from "@/lib/regions";
import {
  TOWER_MAX_H,
  TOWER_MIN_H,
  TWIN_PADS,
  beadOffset,
  cameraPose,
  hubPulse,
  padAccent,
  toTwinReadings,
  towerHeight,
} from "./twin-scene-model";
import { REDUCED_MOTION_QUERY, useReducedMotion } from "./twin-scene-env";
import { TwinStage } from "./TwinStage";

const read = (p: string) => readFileSync(p, "utf8");

const SCENE_SRC = read("src/components/twin/TwinScene3D.tsx");
const STAGE_SRC = read("src/components/twin/TwinStage.tsx");
const FALLBACK_SRC = read("src/components/twin/TwinFallbackScene.tsx");
const MODEL_SRC = read("src/components/twin/twin-scene-model.ts");
const ENV_SRC = read("src/components/twin/twin-scene-env.ts");

/** التعليقات تشرح الأعطال وتقتبس ما نُقض — الحارس يفحص الكود وحده. */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");

const SCENE = stripComments(SCENE_SRC);
const STAGE = stripComments(STAGE_SRC);
const FALLBACK = stripComments(FALLBACK_SRC);
const MODEL = stripComments(MODEL_SRC);

const SOURCES = [
  ["TwinScene3D", SCENE],
  ["TwinStage", STAGE],
  ["TwinFallbackScene", FALLBACK],
  ["twin-scene-model", MODEL],
] as const;

const READINGS = REGIONS.map((r, i) => ({ id: r.id, pct: i === 0 ? null : 40 + i * 15 }));

afterEach(() => vi.unstubAllGlobals());

/* ═════════════════════════════════════════════════════════════════════════
   ① تخفيف الحركة — WCAG 2.2.2
   ═════════════════════════════════════════════════════════════════════════ */

describe("التوأم — تخفيف الحركة يُسكِّن المشهد فعلًا", () => {
  it("الكاميرا تقف: وضعية واحدة مهما مضى الزمن", () => {
    // العطل الذي يحرسه: `reduced` تُمرَّر ولا تُستعمل، فيمرّ كل فحص نصّي
    // بينما الكاميرا تدور. القياس على الناتج لا على ذكر الاسم.
    const rest = cameraPose(0, true);
    for (const t of [0.4, 7.3, 19, 61.5, 240]) {
      expect(cameraPose(t, true)).toEqual(rest);
    }
  });

  it("ولولا التخفيف لتحرّكت — فالسكون قرارٌ لا جمود", () => {
    // بغير هذا البند يمرّ مشهدٌ ساكن دائمًا: «يحترم التخفيف» لأنه لا يتحرّك.
    const moving = [7.3, 19, 61.5].map((t) => JSON.stringify(cameraPose(t, false)));
    expect(new Set(moving).size).toBe(3);
    expect(moving[0]).not.toEqual(JSON.stringify(cameraPose(7.3, true)));
  });

  it("النبض يثبت عند ١ والحبّات تسكن في منتصف الأنبوب", () => {
    for (const t of [0, 2.2, 9.9, 130]) {
      expect(hubPulse(t, true)).toBe(1);
      expect(beadOffset(t, 0, false, true)).toBe(0.5);
      expect(beadOffset(t, 3, true, true)).toBe(0.5);
    }
    // وبلا تخفيف يتحرّك الاثنان — وإلا كان البند أعلاه بلا موضوع.
    expect(new Set([0.7, 1.9, 3.1].map((t) => hubPulse(t, false))).size).toBe(3);
    expect(new Set([0.7, 1.9, 3.1].map((t) => beadOffset(t, 0, false, false))).size).toBe(3);
  });

  it("الاستعلام نصٌّ واحد لا ينحرف نسخةً عن نسخة", () => {
    expect(REDUCED_MOTION_QUERY).toBe("(prefers-reduced-motion: reduce)");
    // ولا استعلام ثانٍ مكتوب في مكوّن: مصدر واحد يُغيَّر مرّة.
    for (const [name, src] of SOURCES) {
      expect(src, `${name} يكتب استعلام الحركة بنفسه`).not.toContain("prefers-reduced-motion");
    }
  });

  it("الخطّاف يقرأ تفضيل النظام حيًّا", () => {
    const listeners = new Set<(e: MediaQueryListEvent) => void>();
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === REDUCED_MOTION_QUERY,
      media: query,
      addEventListener: (_: string, fn: (e: MediaQueryListEvent) => void) => listeners.add(fn),
      removeEventListener: (_: string, fn: (e: MediaQueryListEvent) => void) =>
        listeners.delete(fn),
    }));
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
    expect(listeners.size).toBeGreaterThan(0);
  });

  it("كل حركة دائمة في المشهد تمرّ ببوّابة `reduced`", () => {
    // الدوران المكتوب مباشرة على `rotation` لا يمرّ بدوالّ النموذج، فلا
    // يحرسه أي بند أعلاه. البوّابتان الوحيدتان المسموح بهما مُعدّدتان هنا:
    // إضافة دوران ثالث بلا حارس تُسقط العدّ.
    const spins = SCENE.match(/rotation\.[xyz]\s*\+=/g) ?? [];
    expect(spins.length, "دورانٌ مباشر جديد بلا حارس").toBe(2);
    expect(SCENE).toMatch(/!reduced\)\s*orbit\.current\.rotation\.z/);
    expect(SCENE).toMatch(/if \(reduced\) return;/);
    // ونهوض العمود يبدأ عند ارتفاعه النهائي لا عند العدم حين تُمنع الحركة.
    expect(SCENE).toMatch(/raised\.current = reduced \? 1 :/);
  });
});

/* ═════════════════════════════════════════════════════════════════════════
   ② المادة ٣٣ — لا لون نهائي خارج طبقة الرموز
   ═════════════════════════════════════════════════════════════════════════ */

describe("التوأم — الألوان من الرموز لا من الكود", () => {
  it("لا لون سداسي مكتوب في أي ملف من ملفّات المشهد", () => {
    for (const [name, src] of SOURCES) {
      expect(src.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [], `${name} يكتب لونًا نهائيًّا`).toEqual([]);
    }
  });

  it("لا `rgb()/hsl()` ولا تعبئة بيضاء مكتوبة", () => {
    for (const [name, src] of SOURCES) {
      expect(src, `${name} يكتب لونًا وظيفيًّا`).not.toMatch(/\b(?:rgba?|hsla?)\(\s*\d/);
      expect(src, `${name} يكتب تعبئة بيضاء`).not.toMatch(
        /(?:fill|color)=["'](?:white|black|#f{3}|#f{6})["']/i,
      );
    }
  });

  it("`THREE.Color` لا تُبنى من نصّ مكتوب — بل من رمزٍ مقيس أو من regions.ts", () => {
    // `new THREE.Color("#22d3ee")` يتجاوز كل قاعدة أعلاه ولا يقلبه الوضع.
    expect(SCENE).not.toMatch(/new THREE\.Color\(\s*["'`#]/);
    expect((SCENE.match(/new THREE\.Color\(\)\.setStyle\(/g) ?? []).length).toBeGreaterThan(3);
  });

  it("خصائص اللون في JSX تُمرَّر تعبيرًا لا نصًّا", () => {
    // `color="cyan"` أو `emissive="#0ff"` يُفلت من كل ما سبق.
    expect(SCENE).not.toMatch(/\s(?:color|emissive|attach="background")=["']/);
  });

  it("الأسلوب المضمّن يمرّر متغيّرات لا قيمًا نهائية", () => {
    for (const [name, src] of SOURCES) {
      for (const inline of src.match(/style=\{\{[^}]*\}\}/g) ?? []) {
        expect(inline, `${name}: أسلوب مضمّن يحمل قيمة نهائية`).toMatch(/--[a-z0-9-]+/);
      }
    }
  });

  it("ألوان المشهد تُقاس من الصفحة، فتتبع قلب الوضع", () => {
    // المسبار هو ما يحلّ `var()` و`color-mix()` — قراءة الخاصية المخصّصة
    // مباشرة تعيد النصّ غير المحلول فينكسر اللون بصمت.
    expect(ENV_SRC).toContain('probe.style.setProperty("color", `var(${name})`)');
    expect(ENV_SRC).toContain("getComputedStyle");
    // وإعادة القياس عند قلب الوضع: بغير مراقب يتجمّد المشهد على أول وضع.
    expect(ENV_SRC).toContain("MutationObserver");
    expect(ENV_SRC).toMatch(/attributeFilter: \["class", "style"\]/);
    // والوضع يُشتقّ من الإضاءة المقيسة لا من صنفٍ مقروء على الجذر.
    expect(ENV_SRC).toContain("luminanceOf");
  });
});

/* ═════════════════════════════════════════════════════════════════════════
   ③ `regions.ts` المرجع الجغرافي الوحيد
   ═════════════════════════════════════════════════════════════════════════ */

describe("التوأم — المناطق مشتقّة من regions.ts", () => {
  it("لكل منطقة موضع، ولا موضع لمنطقة لا وجود لها", () => {
    expect(Object.keys(TWIN_PADS).sort()).toEqual(REGIONS.map((r) => r.id).sort());
  });

  it("المواضع متمايزة — لا منطقتان فوق بعضهما", () => {
    const seen = new Set(
      Object.values(TWIN_PADS).map((p) => `${p[0].toFixed(4)}:${p[1].toFixed(4)}`),
    );
    expect(seen.size).toBe(REGIONS.length);
  });

  it("اللكنة من `REGION_ACCENT_HEX` لا من لوحٍ محلّي", () => {
    for (const region of REGIONS) {
      expect(padAccent(region.id)).toBe(REGION_ACCENT_HEX[region.id]);
    }
  });

  it("لا اسم منطقة ولا معرّفها مكتوب نصًّا في أي ملف مشهد", () => {
    for (const [name, src] of SOURCES) {
      expect(src, `${name} يكتب اسم منطقة`).not.toMatch(/"(الوسطى|الغربية|الشرقية|الجنوبية)"/);
      expect(src, `${name} يكتب معرّف منطقة`).not.toMatch(/"(central|western|eastern|southern)"/);
      expect(src).toContain('from "@/lib/regions"');
    }
  });

  it("المشهدان — الثلاثي والمرسوم — يضعان المنطقة في الموضع نفسه", () => {
    // مصدر تخطيط واحد: من سقط عنه التسريع لا تنتقل تحته الخريطة.
    expect(FALLBACK).toContain("TWIN_PADS");
    expect(SCENE).toContain("TWIN_PADS");
    expect(FALLBACK).not.toMatch(/const PADS(_|\s*[:=])/);
  });
});

/* ═════════════════════════════════════════════════════════════════════════
   ④ المادة ٢٧ — لا عمود ولا رقم لما لم يُقَس
   ═════════════════════════════════════════════════════════════════════════ */

describe("التوأم — الصدق العددي", () => {
  it("صفر الخادم يُقرأ «لا قراءة» لا «امتثال معدوم»", () => {
    const readings = toTwinReadings([
      { region_id: REGIONS[0].id, compliance_pct: 0 },
      { region_id: REGIONS[1].id, compliance_pct: 88 },
    ]);
    expect(readings.find((r) => r.id === REGIONS[0].id)?.pct).toBeNull();
    expect(readings.find((r) => r.id === REGIONS[1].id)?.pct).toBe(88);
    // والمنطقة الغائبة عن الصفوف غائبةٌ قياسًا، لا صفرًا.
    expect(readings.find((r) => r.id === REGIONS[2].id)?.pct).toBeNull();
    // والترتيب ترتيب المرجع الجغرافي دائمًا.
    expect(readings.map((r) => r.id)).toEqual(REGIONS.map((r) => r.id));
  });

  it("الغياب لا ارتفاع له أصلًا — لا صفرًا ولا حدًّا أدنى", () => {
    expect(towerHeight(null)).toBeNull();
    expect(towerHeight(Number.NaN)).toBeNull();
    // والقياس يُترجم إلى ارتفاع مقيَّد بين الحدّين.
    expect(towerHeight(0)).toBeCloseTo(TOWER_MIN_H, 6);
    expect(towerHeight(100)).toBeCloseTo(TOWER_MAX_H, 6);
    expect(towerHeight(50)!).toBeGreaterThan(towerHeight(20)!);
  });

  it("المشهد لا يركّب عمودًا بلا ارتفاع — في الأصل والانعكاس معًا", () => {
    // `height === null ? null :` مرّتان: العمود ونسخته المعكوسة. لو رُكّب
    // أحدهما بلا شرط لظهر انعكاسُ عمودٍ لا وجود له.
    expect((SCENE.match(/n\.height === null \? null :/g) ?? []).length).toBe(2);
    expect(SCENE).not.toMatch(/towerHeight\([^)]*\)\s*\?\?\s*0/);
    expect(SCENE).not.toMatch(/\bpct\s*\?\?\s*0\b/);
  });

  it("«لم يُقَس» مكتوبة نصًّا في المشهدين", () => {
    for (const [name, src] of [
      ["TwinScene3D", SCENE],
      ["TwinFallbackScene", FALLBACK],
    ] as const) {
      expect(src, `${name} لا يقول «لم يُقَس»`).toContain("لم يُقَس");
    }
  });

  it("اللافتة تُعرض في DOM لا في الكانفس — فالرقم مقروء آليًّا", () => {
    // نصٌّ مرسوم داخل WebGL لا تصله قارئة شاشة ولا بحثُ صفحة.
    expect(SCENE).toContain("LabelProjector");
    expect(SCENE).toMatch(/<Canvas\b[\s\S]{0,120}aria-hidden/);
  });
});

/* ═════════════════════════════════════════════════════════════════════════
   ⑤ «سَدِيد لا يتعطل» — البديل عند فشل WebGL
   ═════════════════════════════════════════════════════════════════════════ */

describe("التوأم — بديلٌ لا يتعطّل", () => {
  it("بلا WebGL يظهر المشهد المرسوم لا مربّع أسود", () => {
    // في jsdom `getContext` يعيد `null` (إعداد الاختبارات) — وهي حالة
    // متصفّح بلا تسريع حرفيًّا، لا محاكاةً لها.
    const { container } = render(
      createElement(TwinStage, { ar: true, readings: READINGS, activeRegionId: REGIONS[1].id }),
    );
    expect(container.querySelector("[data-twin-mode]")?.getAttribute("data-twin-mode")).toBe("svg");
    expect(container.querySelector("[data-twin-fallback]")).not.toBeNull();
    expect(container.querySelector("canvas")).toBeNull();
  });

  it("والبديل يحمل القراءات نفسها — بما فيها «لم يُقَس»", () => {
    const { container } = render(createElement(TwinStage, { ar: true, readings: READINGS }));
    const text = container.textContent ?? "";
    expect(text).toContain("لم يُقَس");
    for (const region of REGIONS) expect(text).toContain(region.shortAr);
    // ولا رقم للمنطقة غير المقيسة: أول قراءة `null` في `READINGS`.
    // والحدّ اليساري ضروري: `"70%"` **يحتوي** `"0%"` نصًّا، فالفحص الساذج
    // كان يسقط على قراءةٍ صحيحة ٧٠٪ ويقول إن الغياب رُسم صفرًا.
    expect(text).not.toMatch(/(?:^|[^0-9])0%/);
  });

  it("ثلاث بوّابات تسقط إلى البديل نفسه: قدرة، رموز، وسقوطٌ أثناء التشغيل", () => {
    expect(STAGE).toContain("useWebGLSupported");
    expect(STAGE).toMatch(/webglOk && tokens \? \(/);
    expect(STAGE).toContain("getDerivedStateFromError");
    expect(STAGE).toMatch(/<SceneBoundary fallback=\{fallback\}>/);
    // وحدّ التعليق بديلُه هو المشهد المرسوم نفسه لا هيكل تحميل فارغ.
    expect(STAGE).toMatch(/<Suspense fallback=\{fallback\}>/);
  });

  it("المسرح لا يستورد `three` — وإلّا لدخلت الحزمة الثقيلة مع الصفحة", () => {
    expect(STAGE).not.toMatch(/from "three"/);
    expect(STAGE).not.toMatch(/from "@react-three\//);
    expect(STAGE).toMatch(/import type \{ TwinScene3D as TwinScene3DT \}/);
    // والحمل كسولٌ وميتٌ على الخادم (نمط `theater.tsx` المعتمد).
    expect(STAGE).toContain("lazy(");
    expect(STAGE).toContain("import.meta.env.SSR");
  });
});

/* ═════════════════════════════════════════════════════════════════════════
   ⑥ سقوف الأداء
   ═════════════════════════════════════════════════════════════════════════ */

describe("التوأم — سقوف الأداء", () => {
  it("كثافة البكسل مقيَّدة بـ٢ عبر الأداة المشتركة", () => {
    expect(SCENE).toContain("cappedDpr(2)");
    expect(SCENE).not.toMatch(/dpr=\{\[1,\s*[3-9]/);
  });

  it("الحلقة تتوقّف حين تُخفى الصفحة أو تُمنع الحركة", () => {
    expect(SCENE).toMatch(/frameloop=\{animate \? "always" : "demand"\}/);
    expect(STAGE).toMatch(/animate=\{visible && !reduced\}/);
    expect(ENV_SRC).toContain("document.hidden");
    expect(ENV_SRC).toContain("visibilitychange");
  });

  it("لا بيئة تُجلب من الشبكة — الاستوديو إجرائي", () => {
    // `<Environment preset=…>` من drei يجلب ملفّ HDR من مضيف خارجي: يفشل
    // خلف أي حجب، ويُضيف مئات الكيلوبايتات لا يقيسها فاحص الحزمة.
    expect(SCENE).not.toContain("Environment preset");
    expect(SCENE).not.toMatch(/from "@react-three\/drei"/);
    expect(SCENE).toContain("PMREMGenerator");
  });

  it("كل مورد GPU مُنشأ بيدنا له تحرير", () => {
    // مادة/هندسة/نسيج بلا `dispose` تتسرّب عند كل قلب وضع (يُعاد البناء).
    const created = (
      SCENE.match(/new THREE\.(?:DataTexture|ShaderMaterial|BufferGeometry)\(/g) ?? []
    ).length;
    expect(created).toBeGreaterThan(0);
    expect((SCENE.match(/\.dispose\(\)/g) ?? []).length).toBeGreaterThanOrEqual(created);
  });
});

/* ═════════════════════════════════════════════════════════════════════════
   ⑦ الوضعان يعملان معًا
   ═════════════════════════════════════════════════════════════════════════ */

describe("التوأم — الوضعان الداكن والفاتح", () => {
  it("لكل قيمة بصرية حسّاسة للوضع فرعٌ صريح", () => {
    // الوضع الفاتح ليس قشرة: ضبابٌ ووهجٌ وشفافيةٌ مضبوطة على الداكن تُنتج
    // على الأبيض ضبابًا رماديًّا ووهجًا لا يُرى. الفروع تُعدّ ولا تُفترض.
    for (const key of ["fogExp2", "ambientLight", "Bloom", "Vignette"]) {
      // تُفحص **كل** المواضع لا أوّلها: `Bloom` و`Vignette` يردان أوّلًا في
      // سطر الاستيراد، فـ`indexOf` كان يقرأ الاستيراد ويحكم عليه بغياب
      // الفرع — والفرع موجودٌ في موضع الاستعمال بعده بسبعمئة سطر.
      const spots: number[] = [];
      for (let at = SCENE.indexOf(key); at > -1; at = SCENE.indexOf(key, at + 1)) spots.push(at);
      expect(spots.length, `${key} غير موجود`).toBeGreaterThan(0);
      const branched = spots.some((at) => SCENE.slice(at, at + 340).includes("tokens.light"));
      expect(branched, `${key} بلا فرع للوضع الفاتح في أي موضع استعمال`).toBe(true);
    }
  });

  it("الوضع يُقاس ولا يُمرَّر من سياق ثيم", () => {
    // بغير ذلك يلزم المشهدَ مزوّدٌ ليُركَّب، ويكذب داخل حاوية تعيد تعريف
    // الرموز محليًّا.
    for (const [name, src] of SOURCES) {
      expect(src, `${name} يقرأ الثيم من سياق`).not.toContain("useTheme");
    }
  });
});
