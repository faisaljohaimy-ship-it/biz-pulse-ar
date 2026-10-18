/**
 * عقد هندسة شبه الجزيرة — الرسم يُقاس بمدنٍ معروفة لا بالعين.
 *
 * خطأ الإسقاط لا يكسر بناءً ولا اختبار عرض: تُرسم الخريطة جميلةً والنقاط
 * منزاحةً عن مدنها، ويُقرأ ذلك صحيحًا. فتُمرَّر هنا مدنٌ بإحداثياتها
 * الحقيقية عبر `projectArabia` وتُفحص داخل مضلّع منطقتها الإدارية نفسه.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { REGIONS } from "@/lib/regions";
import { REGION_MARKERS } from "@/components/executive/region-markers";
import { ARABIA_VIEWBOX, SAUDI_PROVINCES, projectArabia } from "@/components/map/arabia-geometry";

/** مسار "Mx y x y … Z" ← حلقات نقاط. */
function rings(d: string): Array<Array<[number, number]>> {
  return d
    .split("M")
    .filter(Boolean)
    .flatMap((chunk) => chunk.split("Z").filter((c) => c.trim()))
    .map((ring) => {
      const n = ring.trim().split(/\s+/).map(Number);
      const pts: Array<[number, number]> = [];
      for (let i = 0; i + 1 < n.length; i += 2) pts.push([n[i], n[i + 1]]);
      return pts;
    });
}

/** نقطة داخل مضلّع (قاعدة الزوجي–الفردي على كل الحلقات). */
function inside(x: number, y: number, d: string): boolean {
  let hit = false;
  for (const r of rings(d)) {
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const [xi, yi] = r[i];
      const [xj, yj] = r[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
    }
  }
  return hit;
}

const CITIES: Array<[string, number, number, string]> = [
  ["الرياض", 24.7136, 46.6753, "SA-01"],
  ["جدة", 21.4858, 39.1925, "SA-02"],
  ["المدينة المنورة", 24.4672, 39.6111, "SA-03"],
  ["الدمام", 26.4207, 50.0888, "SA-04"],
  ["أبها", 18.2465, 42.5117, "SA-14"],
  ["تبوك", 28.3835, 36.5662, "SA-07"],
  ["نجران", 17.4933, 44.1277, "SA-10"],
  ["بريدة", 26.3592, 43.9818, "SA-05"],
];

describe("الإسقاط يضع المدن في مناطقها", () => {
  for (const [name, lat, lng, id] of CITIES) {
    it(`${name} داخل ${id}`, () => {
      const p = projectArabia(lat, lng);
      const prov = SAUDI_PROVINCES.find((x) => x.id === id);
      expect(prov, `${id} غير موجودة`).toBeDefined();
      expect(inside(p.x, p.y, prov!.d), `${name} خارج منطقتها`).toBe(true);
    });
  }

  it("والفحص يحمرّ على مدينةٍ في غير منطقتها (المادة ٣٠)", () => {
    const riyadh = projectArabia(24.7136, 46.6753);
    const makkah = SAUDI_PROVINCES.find((x) => x.id === "SA-02")!;
    expect(inside(riyadh.x, riyadh.y, makkah.d)).toBe(false);
  });

  it("والنقاط كلّها داخل إطار الرسم", () => {
    for (const [, lat, lng] of CITIES) {
      const p = projectArabia(lat, lng);
      expect(p.x).toBeGreaterThan(0);
      expect(p.y).toBeGreaterThan(0);
      expect(p.x).toBeLessThan(ARABIA_VIEWBOX.width);
      expect(p.y).toBeLessThan(ARABIA_VIEWBOX.height);
    }
  });
});

describe("ضمّ المناطق الإدارية إلى المناطق الأربع", () => {
  it("ثلاث عشرة منطقة إدارية، وكل منطقةٍ من الأربع لها نصيب", () => {
    expect(SAUDI_PROVINCES).toHaveLength(13);
    for (const r of REGIONS) {
      expect(
        SAUDI_PROVINCES.some((p) => p.region === r.id),
        r.id,
      ).toBe(true);
    }
  });

  it("المرساة نفسها تقع في منطقةٍ إدارية من منطقتها — اللون والعدّ يتّفقان", () => {
    for (const m of REGION_MARKERS) {
      const p = projectArabia(m.lat, m.lng);
      const host = SAUDI_PROVINCES.find((x) => inside(p.x, p.y, x.d));
      expect(host, `مرساة ${m.ar} خارج المملكة`).toBeDefined();
      expect(host!.region, `مرساة ${m.ar} في منطقة ملوّنة بغيرها`).toBe(m.id);
    }
  });
});

describe("لا شيء فوق الخريطة يحجب المواقع", () => {
  const MAP = readFileSync("src/components/map/ArabianPeninsulaMap.tsx", "utf8");
  /** طبقةٌ مطلقةٌ داخل حاوية الرسم = لافتةٌ تطفو فوق النقاط. */
  const overlays = (src: string) => {
    const box = src.slice(src.indexOf("<svg"), src.indexOf("</svg>"));
    const after = src.slice(src.indexOf("</svg>"), src.indexOf("</svg>") + 400);
    return [...(box + after).matchAll(/className="[^"]*\babsolute\b[^"]*"/g)].map((m) => m[0]);
  };

  it("مفتاح المناطق تحت الرسم لا لافتاتٌ فوقه", () => {
    // قِيست اللافتات الطافية بالبكسل فتراكبت (16×17px عند 1280) وحجبت ٣ من ٤
    // مواقع، والحارس السابق قاس بوحدات الإطار فاخضرّ والتراكب واقع.
    expect(overlays(MAP)).toEqual([]);
    expect(MAP).not.toContain("nx-arabia-anchor");
    expect(MAP).not.toContain("REGION_LABEL_AT");
  });

  it("والفحص يحمرّ على لافتةٍ طافية (المادة ٣٠)", () => {
    const planted = '<svg></svg><ul className="pointer-events-none absolute inset-0">';
    expect(overlays(planted)).toHaveLength(1);
  });

  it("التحميل والخطأ يحلّان محلّ الامتثال كما يحلّان محلّ عدد المواقع", () => {
    expect(MAP).toMatch(/const complianceText =\s*pending \?\?/);
    expect(MAP).toMatch(/const sitesText = pending \?\?/);
  });
});

describe("المصدر وتسميته", () => {
  it("مولَّد من Natural Earth ويُعلن أنه ليس حدودًا رسمية", () => {
    const src = readFileSync("src/components/map/arabia-geometry.ts", "utf8");
    expect(src).toContain("Natural Earth");
    expect(src).toContain("ليست حدودًا رسمية");
    const map = readFileSync("src/components/map/ArabianPeninsulaMap.tsx", "utf8");
    expect(map).toContain("ليست حدودًا رسمية");
    expect(map).toContain("isInsideSaudi");
  });

  /**
   * **والمكوّن الثاني تبدّل (أمر المالك ٢٠٢٦/١٠/١٨ R4):** «انقل المستطيل الصغير
   * الذي يحتوي على العبارة … فالزاوية التي تعلو النافذة الجانبية». فخرجت لوحة الشعار
   * القديمة (`SadeedMark.tsx`) من الشجرة بلا مستورد، وحلّت محلّها `SadeedPlateLockup.tsx`
   * — والقاعدة نفسها عليها: لا لون سداسي ولا تعبئة بيضاء ولا أسلوبٌ مضمّن بقيمة نهائية.
   * والملفّ المحذوف لا يُقرأ (‏`readFileSync` يرمي)، ولا يعود إلى القائمة.
   */
  const colourViolations = (code: string): string[] => [
    ...(code.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []),
    ...(code.match(/fill=["'](?:white|#f{3}|#f{6})["']/gi) ?? []),
    ...(code.match(/style=\{\{[^}]*\}\}/g) ?? []).filter((inline) => !/--[a-z-]+/.test(inline)),
  ];

  it("لا لون سداسي ولا تعبئة بيضاء في المكوّنين", () => {
    for (const f of [
      "src/components/map/ArabianPeninsulaMap.tsx",
      "src/components/brand/SadeedPlateLockup.tsx",
    ]) {
      const code = readFileSync(f, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
        .replace(/(^|[^:])\/\/.*$/gm, "$1");
      expect(colourViolations(code), f).toEqual([]);
    }
    // يحمرّ على المزروع (المادة ٣٠): لونٌ سداسي، وتعبئةٌ بيضاء، وأسلوبٌ بقيمة نهائية.
    expect(colourViolations('const c = "#0A3D62";')).toEqual(["#0A3D62"]);
    expect(colourViolations('<path fill="white" />')).toEqual(['fill="white"']);
    expect(colourViolations('<div style={{ color: "red" }} />')).toHaveLength(1);
    expect(colourViolations('<div style={{ ["--tint" as string]: x }} />')).toEqual([]);
  });
});
