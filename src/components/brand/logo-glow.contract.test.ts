/**
 * وهج شعار سَدِيد (أمر المالك ٢٠٢٦/١٠/١٨: «continuously luminous … slow continuous
 * illumination cycle, occasional subtle luminous sweep … Preserve the original artwork …
 * Use efficient animation properties … Provide a reduced-motion alternative»).
 *
 * ما يُحرس: الصورة لا تُمسّ؛ لا يتحرّك إلا `opacity` و`transform`؛ كل حركةٍ خلف تقليل
 * الحركة ومفتاح السكون معًا؛ والبديل هالةٌ ساكنة لا فراغ؛ وألوان النظام تُخفي الطبقتين.
 * والفحوص دوالّ تُجرَّب على المزروع (المادة ٣٠).
 */
import { readFileSync } from "node:fs";
import postcss, { type AtRule, type Rule } from "postcss";
import { describe, expect, it } from "vitest";

const CSS = readFileSync("src/styles/brand-plate.css", "utf8");
const TSX = readFileSync("src/components/brand/SadeedPlateLockup.tsx", "utf8");
const GATE = "prefers-reduced-motion: no-preference";
const SWITCH = 'html:not([data-nx-motion="off"])';
const KEYFRAMES = ["nx-plate-breathe", "nx-plate-sweep"];

const atChain = (n: postcss.Node) => {
  const out: string[] = [];
  for (let p = n.parent; p && p.type !== "root"; p = p.parent)
    if (p.type === "atrule") out.push(`@${(p as AtRule).name} ${(p as AtRule).params}`);
  return out;
};

/** خصائص تتحرّك في إطارات الوهج غير `opacity`/`transform`. */
function costlyFrames(css: string): string[] {
  const out: string[] = [];
  postcss.parse(css).walkAtRules("keyframes", (kf) => {
    if (!KEYFRAMES.includes(kf.params)) return;
    kf.walkDecls((d) => {
      if (d.prop !== "opacity" && d.prop !== "transform") out.push(`${kf.params}: ${d.prop}`);
    });
  });
  return out;
}

/** حركةٌ خارج بوابة التفضيل أو بلا مفتاح السكون. */
function ungated(css: string): string[] {
  const out: string[] = [];
  postcss.parse(css).walkDecls(/^animation/, (d) => {
    const rule = d.parent as Rule;
    if (
      !atChain(d).some((a) => a.includes(GATE)) ||
      !rule.selectors.every((s) => s.startsWith(SWITCH))
    )
      out.push(rule.selector);
  });
  return out;
}

/** ما يُكتب على الصورة نفسها من فلترٍ أو حركة. */
function touchesArtwork(css: string): string[] {
  const out: string[] = [];
  postcss.parse(css).walkRules((r) => {
    if (!r.selectors.some((s) => s.includes(".nx-plate-img"))) return;
    r.walkDecls((d) => {
      if (/^(filter|animation|mix-blend-mode|opacity)/.test(d.prop))
        out.push(`${r.selector} ${d.prop}`);
    });
  });
  return out;
}

describe("وهج الشعار — حول الصورة لا عليها، رخيصٌ ومحكوم", () => {
  it("الصورة كما هي: لا فلتر ولا حركة ولا مزج عليها", () => {
    expect(touchesArtwork(CSS)).toEqual([]);
    expect(touchesArtwork(CSS + "\n.nx-plate-img { filter: brightness(1.2); }")).toHaveLength(1);
  });

  it("الهالة والمسحة طبقتان: ::before تحت الصورة، وغلافٌ يقصّ المسحة على الزوايا", () => {
    expect(CSS).toMatch(/\.nx-plate-link::before \{[^}]*z-index: -1;[^}]*box-shadow:/);
    expect(CSS).toMatch(/\.nx-plate-sheen \{[^}]*overflow: hidden;[^}]*border-radius: inherit;/);
    expect(TSX).toContain('<span aria-hidden className="nx-plate-sheen" />');
  });

  it("لا يتحرّك إلا opacity وtransform — ويسقط على إطارٍ يحرّك الظلّ أو الفلتر", () => {
    expect(costlyFrames(CSS)).toEqual([]);
    const planted = CSS.replace("opacity: 0.95;", "opacity: 0.95;\n    box-shadow: 0 0 30px blue;");
    expect(planted).not.toBe(CSS);
    expect(costlyFrames(planted)).toEqual(["nx-plate-breathe: box-shadow"]);
  });

  it("كل حركةٍ خلف تقليل الحركة ومفتاح السكون — ويسقط على حركةٍ مكشوفة", () => {
    expect(ungated(CSS)).toEqual([]);
    const animated = postcss.parse(CSS);
    let n = 0;
    animated.walkDecls(/^animation/, () => void n++);
    expect(n).toBe(2);
    expect(
      ungated(CSS + "\n.nx-plate-link::before { animation: nx-plate-breathe 6s infinite; }"),
    ).toEqual([".nx-plate-link::before"]);
  });

  it("البديل الساكن هالةٌ مرئية لا فراغ، والتنفّس أبطأ من حدّ الوميض", () => {
    expect(CSS).toMatch(/\.nx-plate-link::before \{[^}]*opacity: 0\.6;/);
    expect(CSS).toContain("animation: nx-plate-breathe 6.5s ease-in-out infinite;");
    expect(CSS).toContain("animation: nx-plate-sweep 14s linear 3s infinite;");
  });

  it("ألوان النظام تُخفي الطبقتين وتُبقي حدّ الهدف", () => {
    const fc = CSS.slice(CSS.indexOf("@media (forced-colors: active)"));
    expect(fc).toMatch(/\.nx-plate-link::before,\s*\.nx-plate-sheen \{\s*display: none;/);
    expect(fc).toContain("outline: 1px solid CanvasText;");
  });
});
