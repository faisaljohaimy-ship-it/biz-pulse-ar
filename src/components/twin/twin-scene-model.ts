/**
 * التوأم السينمائي — **الهندسة والمعنى، بلا رسم**.
 *
 * كل ما في هذا الملف دوالٌّ خالصة: مواضع المنصّات، ارتفاع العمود من النسبة،
 * مسار الكاميرا، ونبض القلب. فُصلت عن المشهد لأنّ ما يُكسر هنا لا يظهر في
 * لقطة شاشة ولا يلتقطه tsc: منطقةٌ تُكتب يدويًّا فتنفصل عن `regions.ts`،
 * صفرٌ يحلّ محلّ غياب فيرتفع لها عمود لم تُقَس (المادة ٢٧)، أو كاميرا تظلّ
 * تتحرّك تحت `prefers-reduced-motion` (WCAG 2.2.2). كلّها قابلة للفحص
 * حسابيًّا **قبل** أن يُرسم إطارٌ واحد — وهذا ما يفحصه عقد المشهد.
 */
import { REGIONS, REGION_ACCENT_HEX, type RegionId } from "@/lib/regions";

/** قراءة منطقة واحدة. `pct === null` ⇒ **لم تُقَس** — لا عمود ولا رقم. */
export interface TwinReading {
  readonly id: RegionId;
  readonly pct: number | null;
}

/** صفّ الامتثال كما يصل من `getCommandCenterState`. */
interface ComplianceRow {
  readonly region_id: RegionId;
  readonly compliance_pct: number;
}

/**
 * تحويل صفوف الخادم إلى قراءات المشهد — **بترتيب `regions.ts` دائمًا**.
 *
 * عقد `compliance_pct` القائم مع كل مستهلكيه: الصفر من الخادم = «لا قراءة»
 * لا «امتثال معدوم». فيُحوَّل هنا إلى `null` مرّة واحدة، فلا يتسرّب صفرٌ
 * إلى الارتفاع ولا إلى الرقم المعروض.
 */
export function toTwinReadings(rows: readonly ComplianceRow[] | undefined): TwinReading[] {
  const measured = new Map<RegionId, number>();
  for (const row of rows ?? []) {
    if (row.compliance_pct > 0) measured.set(row.region_id, row.compliance_pct);
  }
  return REGIONS.map((region) => ({
    id: region.id,
    pct: measured.get(region.id) ?? null,
  }));
}

/** نصف قطر المعين الذي تقف عليه المنصّات — وحدات المشهد. */
export const PAD_RADIUS = 3.45;

/**
 * موضع المنصّة على المستوى (x, z) — **مشتقّ من ترتيب `regions.ts`**.
 *
 * لا جدول مواضع مكتوب لكل منطقة: إضافة منطقة خامسة إلى المرجع الجغرافي
 * توزّع الخمس على المحيط من تلقائها. الجدول اليدوي كان سيترك الخامسة بلا
 * موضع، ولا يسقط بذلك بناءٌ ولا فحص نوع.
 */
export function padPosition(index: number, count: number): readonly [number, number] {
  const angle = (index / Math.max(count, 1)) * Math.PI * 2;
  return [Math.sin(angle) * PAD_RADIUS, Math.cos(angle) * PAD_RADIUS] as const;
}

/** مواضع المناطق الأربع، بالترتيب المعتمد في `regions.ts`. */
export const TWIN_PADS: Record<RegionId, readonly [number, number]> = Object.fromEntries(
  REGIONS.map((region, index) => [region.id, padPosition(index, REGIONS.length)]),
) as Record<RegionId, readonly [number, number]>;

/** لكنة المنطقة — من المرجع الجغرافي وحده، لا من لوحٍ محلّي. */
export function padAccent(id: RegionId): string {
  return REGION_ACCENT_HEX[id];
}

/** أدنى ارتفاعٍ يُرى، وأقصاه عند ١٠٠٪. */
export const TOWER_MIN_H = 0.55;
export const TOWER_MAX_H = 3.15;

/**
 * ارتفاع عمود الضوء من النسبة — و`null` تبقى `null`.
 *
 * **المادة ٢٧ في سطر واحد.** لو أعاد صفرًا لغياب القياس لظهرت للمنطقة
 * قاعدةُ عمودٍ مسطّحة تُقرأ «قيست فكانت صفرًا»، والفرق بين «صفر» و«لم
 * يُقَس» هو كل الفرق. الغياب يعني: **لا شكل أصلًا**.
 */
export function towerHeight(pct: number | null): number | null {
  if (pct === null || !Number.isFinite(pct)) return null;
  const clamped = Math.min(Math.max(pct, 0), 100);
  return TOWER_MIN_H + (clamped / 100) * (TOWER_MAX_H - TOWER_MIN_H);
}

/** وضعية الكاميرا: موضعها وما تنظر إليه. */
export interface CameraPose {
  readonly position: readonly [number, number, number];
  readonly target: readonly [number, number, number];
}

/** الوضعية الساكنة — إطار العرض المعتمد حين تُمنع الحركة. */
const REST = { azimuth: Math.PI * 0.19, radius: 9.4, height: 4.05 } as const;
const LOOK_AT: readonly [number, number, number] = [0, 1.05, 0];

function poseAt(azimuth: number, radius: number, height: number): CameraPose {
  return {
    position: [Math.sin(azimuth) * radius, height, Math.cos(azimuth) * radius],
    target: LOOK_AT,
  };
}

/**
 * مسار الكاميرا البطيء — مدارٌ ودولّي متداخلان بدورات غير متوافقة، فلا
 * يعود المشهد إلى إطارٍ سابق فيُقرأ حلقةً مكرّرة.
 *
 * **و`reduced` تُسكِّن المسار عند وضعيةٍ مؤلَّفة لا عند العدم**: الكاميرا
 * تقف على إطار العرض نفسه، فمن منع الحركة يرى المشهد كاملًا ساكنًا لا
 * زاوية عشوائية.
 */
export function cameraPose(seconds: number, reduced: boolean): CameraPose {
  if (reduced) return poseAt(REST.azimuth, REST.radius, REST.height);
  const t = Number.isFinite(seconds) ? seconds : 0;
  return poseAt(
    REST.azimuth + Math.sin((t / 64) * Math.PI * 2) * 0.44,
    REST.radius + Math.sin((t / 37) * Math.PI * 2) * 0.8,
    REST.height + Math.sin((t / 23) * Math.PI * 2) * 0.45,
  );
}

/** نبض القلب — معامل قياسٍ حول ١. ساكنٌ تمامًا حين تُمنع الحركة. */
export function hubPulse(seconds: number, reduced: boolean): number {
  if (reduced) return 1;
  const t = Number.isFinite(seconds) ? seconds : 0;
  return 1 + Math.sin(t * 1.35) * 0.085;
}

/**
 * موضع حبّة الضوء على الأنبوب: `0` عند القلب و`1` عند المنصّة.
 *
 * الذهاب توجيهٌ والإياب إفادة — نفس معنى `nx-tw-pulse` في المشهد المرسوم،
 * منقولًا لا مُستغنى عنه. وتحت منع الحركة تسكن الحبّة في منتصف الأنبوب:
 * الخط يبقى مقروءًا وصلةً بين طرفين بلا وميضٍ يتحرّك.
 */
export function beadOffset(
  seconds: number,
  index: number,
  back: boolean,
  reduced: boolean,
): number {
  if (reduced) return 0.5;
  const t = Number.isFinite(seconds) ? seconds : 0;
  const period = back ? 3.6 : 2.6;
  const phase = ((t + index * 0.9) % period) / period;
  return back ? 1 - phase : phase;
}
