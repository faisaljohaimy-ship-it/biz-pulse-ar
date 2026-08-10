/**
 * مصدر أرقام الفيلم — لا رقم مؤلَّف (المادة ٢٧).
 *
 * المناطق تُقرأ من `src/lib/regions.ts` **حصرًا**: الأسماء العربية
 * والألوان الإقليمية معًا. ونِسَب الامتثال ومتوسّطها تُستدعى من
 * `buildCommandCenterSimulation` — وهو المولّد نفسه الذي تعرضه صفحة
 * التوأم حين لا تصل صفوف القاعدة الحيّة. فما يظهر على الشاشة في الفيلم
 * هو ما يظهر في المنتج، لا نسخة مكتوبة بيدٍ ثانية تنحرف عنه بصمت.
 *
 * وكلّه موسوم محاكاةً على الشاشة: الشارة «بيانات محاكاة مرجعية» ظاهرة
 * في كل إطار، تمامًا كما في الصفحة الحيّة.
 */
import { REGIONS, REGION_ACCENT_HEX, type RegionId } from "@/lib/regions";
import { buildCommandCenterSimulation } from "@/lib/exec/showcase-simulation.server";

/** لحظة ثابتة — التصيير يجب أن يُخرج الملفّ نفسه في كل مرّة. */
const FIXED_EPOCH = Date.UTC(2026, 7, 9, 6, 0, 0);

const state = buildCommandCenterSimulation(FIXED_EPOCH);

const pctById = new Map<string, number>(
  state.regions.map((r) => [r.region_id, r.compliance_pct] as const),
);

export interface TwinRegion {
  id: RegionId;
  /** الاسم العربي المختصر كما في `regions.ts`. */
  nameAr: string;
  accent: string;
  /** نسبة الامتثال — أو `null` إن لم تُقَس، فلا يُعرض عمود ولا رقم. */
  pct: number | null;
  /** موضع المنصّة على الأرض (وحدات عالم). */
  pos: { x: number; y: number };
}

/** المعين حول القلب — الوسطى شمالًا، الشرقية شرقًا، الجنوبية جنوبًا،
 *  الغربية غربًا: التوزيع نفسه المعتمد في `PADS` بالصفحة الحيّة. */
const PAD_RADIUS = 3.25;
const PAD_ANGLE: Record<RegionId, number> = {
  central: Math.PI / 2,
  eastern: 0,
  southern: -Math.PI / 2,
  western: Math.PI,
};

export const TWIN_REGIONS: TwinRegion[] = REGIONS.map((region) => {
  const a = PAD_ANGLE[region.id];
  const pct = pctById.get(region.id);
  return {
    id: region.id,
    nameAr: region.shortAr,
    accent: REGION_ACCENT_HEX[region.id],
    pct: typeof pct === "number" && pct > 0 ? pct : null,
    pos: { x: Math.cos(a) * PAD_RADIUS, y: Math.sin(a) * PAD_RADIUS },
  };
});

/** متوسّط الامتثال — مشتقٌّ من صفوف المناطق نفسها المعروضة، لا رقمًا
 *  مستقلًّا قد يكذّب الأعمدة تحته. */
export const COMPLIANCE_AVG: number | null =
  state.counters.compliance_avg && state.counters.compliance_avg > 0
    ? state.counters.compliance_avg
    : null;

/** ارتفاع العمود = النسبة، من الصفر — لا محور مبتور يضخّم الفروق. */
export const MAX_TOWER = 3.9;
export const towerHeight = (pct: number): number => (pct / 100) * MAX_TOWER;
