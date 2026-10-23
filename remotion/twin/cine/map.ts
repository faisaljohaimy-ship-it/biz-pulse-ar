/**
 * هندسة المملكة للفيلم — من `arabia-geometry.ts` وحده (لا حدود مخترعة).
 * تُحوَّل من إطار الرسم (921×828) إلى فضاء العالم: X شرقًا، Y شمالًا،
 * والمملكة بعرض 24 وحدة تقريبًا حول الأصل.
 */
import {
  NEIGHBOUR_LAND_PATH,
  SAUDI_BORDER_PATH,
  SAUDI_PROVINCES,
} from "@/components/map/arabia-geometry";
import type { RegionId } from "@/lib/regions";

export interface Pt {
  x: number;
  y: number;
}

/** مركز الإطار الحدودي بوحدات الرسم، ومقياس التحويل إلى العالم. */
const CX = (53.5 + 744.5) / 2;
const CY = (67.6 + 633.5) / 2;
export const MAP_SCALE = 24 / (744.5 - 53.5);

export const toWorld = (vx: number, vy: number): Pt => ({
  x: (vx - CX) * MAP_SCALE,
  y: -(vy - CY) * MAP_SCALE,
});

function parse(d: string): [number, number][][] {
  return d
    .split("Z")
    .filter((s) => s.trim())
    .map((s) => {
      const n = s
        .replace("M", "")
        .trim()
        .split(/[\s,]+/)
        .map(Number);
      const pts: [number, number][] = [];
      for (let i = 0; i + 1 < n.length; i += 2) pts.push([n[i], n[i + 1]]);
      return pts;
    });
}

export type EdgeKind = "outer" | "region" | "inner";

export interface ProvinceGeo {
  id: string;
  region: RegionId;
  poly: Pt[];
  /** نوع الضلع i (بين poly[i] وpoly[i+1]). */
  edge: EdgeKind[];
}

const keyOf = (a: [number, number], b: [number, number]): string => {
  const ka = `${a[0].toFixed(1)},${a[1].toFixed(1)}`;
  const kb = `${b[0].toFixed(1)},${b[1].toFixed(1)}`;
  return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
};

function buildProvinces(): ProvinceGeo[] {
  const raw = SAUDI_PROVINCES.map((p) => ({ p, sp: parse(p.d)[0] }));
  const owners = new Map<string, RegionId[]>();
  for (const { p, sp } of raw) {
    for (let i = 0; i < sp.length; i += 1) {
      const k = keyOf(sp[i], sp[(i + 1) % sp.length]);
      const arr = owners.get(k) ?? [];
      arr.push(p.region);
      owners.set(k, arr);
    }
  }
  return raw.map(({ p, sp }) => ({
    id: p.id,
    region: p.region,
    poly: sp.map(([x, y]) => toWorld(x, y)),
    edge: sp.map((_, i) => {
      const arr = owners.get(keyOf(sp[i], sp[(i + 1) % sp.length])) ?? [];
      if (arr.length < 2) return "outer";
      return arr[0] === arr[1] ? "inner" : "region";
    }),
  }));
}

export const PROVINCES: ProvinceGeo[] = buildProvinces();

/** الحدّ الخارجي كخطٍّ مغلق واحد. */
export const BORDER: Pt[] = parse(SAUDI_BORDER_PATH)[0].map(([x, y]) => toWorld(x, y));

/** اليابسة المجاورة — خطوطٌ خافتة؛ تُسقَط الأضلاع الملتصقة بحافّة إطار الرسم. */
export const NEIGHBOURS: Pt[][] = (() => {
  const out: Pt[][] = [];
  for (const sp of parse(NEIGHBOUR_LAND_PATH)) {
    let cur: Pt[] = [];
    for (let i = 0; i < sp.length; i += 1) {
      const a = sp[i];
      const b = sp[(i + 1) % sp.length];
      const onFrame = (p: [number, number]) =>
        p[0] <= 0.6 || p[0] >= 920.4 || p[1] <= 0.6 || p[1] >= 827.4;
      if (onFrame(a) && onFrame(b)) {
        if (cur.length > 1) out.push(cur);
        cur = [];
        continue;
      }
      if (cur.length === 0) cur.push(toWorld(a[0], a[1]));
      cur.push(toWorld(b[0], b[1]));
    }
    if (cur.length > 1) out.push(cur);
  }
  return out;
})();

/**
 * مرساة كل منطقة: نقطة تسمية أبرز منطقة إدارية فيها (من الهندسة نفسها)
 * — وسطى = الرياض، غربية = المدينة المنورة، شرقية = الشرقية، جنوبية = عسير.
 */
const labelOf = (id: string): Pt => {
  const p = SAUDI_PROVINCES.find((s) => s.id === id);
  if (!p) throw new Error(`منطقة إدارية غائبة: ${id}`);
  return toWorld(p.label.x, p.label.y);
};

export const HUBS: Record<RegionId, Pt> = {
  central: labelOf("SA-01"),
  western: labelOf("SA-03"),
  eastern: labelOf("SA-04"),
  southern: labelOf("SA-14"),
};

export const REGION_ORDER: RegionId[] = ["central", "western", "eastern", "southern"];

/** نقطة داخل مضلّع (شعاع). */
export function inPoly(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x)
      inside = !inside;
  }
  return inside;
}
