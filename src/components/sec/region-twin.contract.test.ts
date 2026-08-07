/**
 * التوأم الرقمي المرسوم — عهود المشهد.
 *
 * ## ما يستحيل أن تراه لقطةٌ واحدة
 *
 * أربعة مشاهد × وضعان = ثماني لقطات، ولن تُلتقط كلّها عند كل تغيير. وما
 * ينكسر بصمت هنا صنفٌ بعينه: بنيةٌ تطفو فوق الأرض أو تخرج من الإطار،
 * ومنطقتان تتشابهان فيصير «توأمٌ لكل منطقة» أربع صور لمكانٍ واحد، ولونٌ
 * يُكتب في الترميز فيتجمّد على وضعٍ واحد.
 *
 * وهذه كلّها قابلة للفحص حسابيًّا على البيانات نفسها — قبل الرسم.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { REGIONS } from "@/lib/regions";
import {
  HORIZON_Y,
  SCENE_H,
  SCENE_W,
  TWIN_PROFILES,
  allStructures,
  anchorPoints,
} from "./region-twin-profiles";

const SCENE_SRC = readFileSync("src/components/sec/RegionTwinScene.tsx", "utf8");
/** التعليقات هنا تشرح الأعطال وتقتبس ما نُقض — الحارس يفحص الكود وحده. */
const SCENE_CODE = SCENE_SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");

describe("لكل منطقة مشهدها", () => {
  it("actually loaded the profiles and the source", () => {
    // حارس صامت: لو نُقل أيّهما لَمرّ الملف كلّه بلا معنى.
    expect(Object.keys(TWIN_PROFILES).length).toBeGreaterThan(0);
    expect(SCENE_CODE).toContain("RegionTwinScene");
  });

  it("كل منطقة في `regions.ts` لها ملفّ — ولا ملفّ لمنطقة لا وجود لها", () => {
    // `regions.ts` المرجع الجغرافي الوحيد؛ قائمةٌ ثانية هنا تتفرّع عنه بصمت.
    const declared = REGIONS.map((r) => r.id).sort();
    expect(Object.keys(TWIN_PROFILES).sort()).toEqual(declared);
  });

  it("المشاهد الأربعة متمايزة فعلًا", () => {
    // أربع نسخ من مشهدٍ واحد تمرّ كل فحصٍ آخر في هذا الملف، وتُفرغ الميزة
    // من معناها: «ارسم التوأم **لكل منطقة**».
    const signature = (id: keyof typeof TWIN_PROFILES) => {
      const p = TWIN_PROFILES[id];
      return JSON.stringify([p.ridge, p.water, allStructures(p)]);
    };
    const ids = Object.keys(TWIN_PROFILES) as (keyof typeof TWIN_PROFILES)[];
    const seen = new Map<string, string>();
    for (const id of ids) {
      const sig = signature(id);
      const twin = seen.get(sig);
      expect(twin, `${id} و${twin} مشهدهما متطابق`).toBeUndefined();
      seen.set(sig, id);
    }
    // ولا تكفي المغايرة الحرفيّة: النصوص الوصفيّة أيضًا تختلف.
    const captions = new Set(ids.map((id) => TWIN_PROFILES[id].captionAr));
    expect(captions.size).toBe(ids.length);
  });
});

describe("الهندسة تقف على الأرض وداخل الإطار", () => {
  for (const region of REGIONS) {
    const profile = TWIN_PROFILES[region.id];

    it(`${region.shortAr} — لا بنية تخرج من الإطار أفقيًّا`, () => {
      const escaping = allStructures(profile)
        .filter((s) => s.x < 0 || s.x + s.w + (s.depth ?? 0) > SCENE_W)
        .map((s) => `${s.kind}@${s.x}+${s.w}`);
      expect(escaping, `بنى خارج العرض ${SCENE_W}: ${escaping.join(", ")}`).toEqual([]);
    });

    it(`${region.shortAr} — لا بنية تخترق أعلى الإطار`, () => {
      // الارتفاع يُقاس صعودًا من خطّ الأفق؛ ما تجاوزه يُقصّ رأسه بصمت.
      const tall = allStructures(profile)
        .filter((s) => HORIZON_Y - s.h < 0)
        .map((s) => `${s.kind}@h=${s.h}`);
      expect(tall, `بنى أطول من ${HORIZON_Y}: ${tall.join(", ")}`).toEqual([]);
    });

    it(`${region.shortAr} — كل بنية لها ارتفاع وعرض موجبان`, () => {
      // بنيةٌ بارتفاع صفر تُرسم خطًّا: لا تُرى، ولا يُفهم غيابها.
      const degenerate = allStructures(profile).filter((s) => s.w <= 0 || s.h <= 0);
      expect(degenerate).toEqual([]);
    });

    it(`${region.shortAr} — خطّ التضاريس يبدأ وينتهي عند الأفق`, () => {
      // مسارٌ لا يُغلق على الأفق يترك فجوةً تُرى منها السماء تحت الأرض.
      expect(profile.ridge.startsWith(`M0 ${HORIZON_Y}`)).toBe(true);
      expect(profile.ridge.trimEnd().endsWith(`L${SCENE_W} ${HORIZON_Y} Z`)).toBe(true);
    });

    it(`${region.shortAr} — للمقدّمة بنى، وإلّا فالمشهد خلفيّة لا توأم`, () => {
      expect(profile.near.length).toBeGreaterThanOrEqual(3);
    });
  }
});

describe("مرابط الأصول حتميّة ومحصورة", () => {
  it("النداء نفسه يعطي المواضع نفسها", () => {
    // موضعٌ يتبدّل بين رسمتين يجعل الكاميرا تقفز، ويستحيل معه أن يقول
    // العارض «تلك الكاميرا» ويشير.
    const a = anchorPoints(TWIN_PROFILES.eastern, 9);
    const b = anchorPoints(TWIN_PROFILES.eastern, 9);
    expect(a).toEqual(b);
  });

  it("كل مربط داخل الإطار في كل منطقة", () => {
    for (const region of REGIONS) {
      // ٢٤ أكثر ممّا تعرضه الصفحة (١٤) — الحدّ يُفحص فوق حاجته لا عنده.
      for (const p of anchorPoints(TWIN_PROFILES[region.id], 24)) {
        expect(p.x, `${region.id}: x=${p.x}`).toBeGreaterThanOrEqual(0);
        expect(p.x, `${region.id}: x=${p.x}`).toBeLessThanOrEqual(SCENE_W);
        expect(p.y, `${region.id}: y=${p.y}`).toBeGreaterThanOrEqual(0);
        expect(p.y, `${region.id}: y=${p.y}`).toBeLessThanOrEqual(SCENE_H);
      }
    }
  });

  it("لا أصول ⇐ لا مرابط، والمشهد يبقى", () => {
    expect(anchorPoints(TWIN_PROFILES.central, 0)).toEqual([]);
  });
});

describe("الوضعان واللون", () => {
  it("لا لون ثابت في الترميز — كله رموز", () => {
    // اللون المكتوب في JSX يتجمّد على وضعٍ واحد ولا يُنقذه أي تبديل ثيم.
    // الاستثناء الوحيد لهجة المنطقة، ومصدرها `regions.ts` لا قيمة هنا.
    const literals = SCENE_CODE.match(/#[0-9a-fA-F]{3,8}\b|\brgba?\(/g) ?? [];
    expect(literals, `ألوان مكتوبة: ${literals.join(", ")}`).toEqual([]);
    expect(SCENE_CODE).toContain("REGION_ACCENT_HEX");
  });

  it('`fill="white"` ممنوع (المادة ٣٣)', () => {
    expect(SCENE_CODE).not.toMatch(/fill="white"/);
  });

  it("رموز المشهد معرَّفة في الوضعين كليهما", () => {
    // رمزٌ يُعرَّف في وضعٍ واحد يسقط إلى `transparent` في الآخر — فيختفي
    // الجسم بلا خطأ في أي أداة.
    const css = readFileSync("src/styles.css", "utf8");
    const used = new Set(SCENE_CODE.match(/--twin-[a-z0-9-]+/g) ?? []);
    expect(used.size, "لم يُعثر على أي رمز مشهد").toBeGreaterThan(8);

    const block = (selector: string) => {
      const at = css.indexOf(`${selector} {\n  --twin-sky-1`);
      return at === -1 ? "" : css.slice(at, css.indexOf("\n}", at));
    };
    const dark = block(":root");
    const light = block("html.light");
    expect(dark, "كتلة الوضع الداكن مفقودة").not.toBe("");
    expect(light, "كتلة الوضع الفاتح مفقودة").not.toBe("");

    const missingDark = [...used].filter((t) => !dark.includes(`${t}:`));
    const missingLight = [...used].filter((t) => !light.includes(`${t}:`));
    expect(missingDark, `غير معرَّفة في الداكن: ${missingDark.join(", ")}`).toEqual([]);
    expect(missingLight, `غير معرَّفة في الفاتح: ${missingLight.join(", ")}`).toEqual([]);
  });
});

describe("فخّ الكتلة الحاوية (كسر خلفيّة الرئيسية ثلاث مرّات)", () => {
  it("لا `filter` ولا `transform` ولا `will-change` على غلاف HTML", () => {
    // `<filter>` داخل `<svg>` مسموح — لا يُنشئ كتلةً حاوية لعناصر HTML.
    // المحظور خصائص CSS على الـ`<div>` اللافّ: أيٌّ منها يُسقط كل
    // `position: fixed` في الشجرة إلى نفسه.
    const wrapper = SCENE_CODE.slice(
      SCENE_CODE.indexOf("<div className={className}"),
      SCENE_CODE.indexOf("<svg"),
    );
    expect(wrapper, "لم يُعثر على الغلاف").not.toBe("");
    expect(wrapper).not.toMatch(/\b(filter|transform|willChange|backdropFilter|contain)\b/);
  });
});
