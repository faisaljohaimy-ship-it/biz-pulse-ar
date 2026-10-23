/**
 * هيكل الشخصية — مفاصل ثنائيّة الأبعاد مع IK لعظمتين (ساق/ذراع).
 * الإحداثيات محلّية: الأصل عند الحوض، y لأسفل، +x هو «الأمام» في المنظر الجانبي
 * (والانقلاب الأفقيّ يتولّاه المكوّن). الوحدة بكسل بمقياس 1 (قامة الواقف ≈ 178).
 */
import { clamp, lerp } from "../kit/ease";

export type V = [number, number];
export type View = "side" | "front" | "back";

export const DIM = {
  thigh: 45,
  shin: 41,
  ankleH: 6,
  shoulderH: 47, // ارتفاع الكتف فوق الحوض
  neck: 6,
  headRx: 10.5,
  headRy: 12.6,
  upper: 31,
  fore: 27,
  standPelvis: 90, // ارتفاع الحوض عن الأرض واقفًا
} as const;

export interface Pose {
  /** إزاحة الحوض لأسفل (+) نسبةً للوقوف. */
  pelvisY: number;
  /** ميلان الجذع للأمام (درجات). */
  lean: number;
  /** ميلان الرأس الإضافي (درجات، + للأمام/لأسفل). */
  headTilt: number;
  /** الكاحلان نسبةً للحوض. A القريب/اليساري على الشاشة، B البعيد/اليميني. */
  ankleA: V;
  ankleB: V;
  /** زاوية القدم (درجات، + = الأصابع لأسفل). */
  footA: number;
  footB: number;
  /** اليدان نسبةً للحوض. */
  handA: V;
  handB: V;
  /** لفّ العنصر المحمول في اليد (درجات) إضافةً لاتجاه الساعد. */
  gripA: number;
  gripB: number;
}

export const STAND_ANKLE_Y = DIM.standPelvis - DIM.ankleH;

export const standSide = (): Pose => ({
  pelvisY: 0,
  lean: 1.5,
  headTilt: 0,
  ankleA: [2, STAND_ANKLE_Y],
  ankleB: [-4, STAND_ANKLE_Y],
  footA: 0,
  footB: 0,
  handA: [5, 56],
  handB: [-4, 56],
  gripA: 0,
  gripB: 0,
});

export const standFront = (): Pose => ({
  pelvisY: 0,
  lean: 0,
  headTilt: 0,
  ankleA: [-12, STAND_ANKLE_Y],
  ankleB: [12, STAND_ANKLE_Y],
  footA: 0,
  footB: 0,
  handA: [-25, 46],
  handB: [25, 46],
  gripA: 0,
  gripB: 0,
});

const lerpV = (a: V, b: V, t: number): V => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

/** مزج وضعين (للانتقال السلس بين الأوضاع). */
export const blendPose = (a: Pose, b: Pose, t: number): Pose => ({
  pelvisY: lerp(a.pelvisY, b.pelvisY, t),
  lean: lerp(a.lean, b.lean, t),
  headTilt: lerp(a.headTilt, b.headTilt, t),
  ankleA: lerpV(a.ankleA, b.ankleA, t),
  ankleB: lerpV(a.ankleB, b.ankleB, t),
  footA: lerp(a.footA, b.footA, t),
  footB: lerp(a.footB, b.footB, t),
  handA: lerpV(a.handA, b.handA, t),
  handB: lerpV(a.handB, b.handB, t),
  gripA: lerp(a.gripA, b.gripA, t),
  gripB: lerp(a.gripB, b.gripB, t),
});

/** IK لعظمتين. bend=±1 يختار أيّ الحلّين. يعيد [المفصل، النهاية بعد القصّ]. */
export const ik2 = (root: V, target: V, l1: number, l2: number, bend: 1 | -1): [V, V] => {
  const dx = target[0] - root[0];
  const dy = target[1] - root[1];
  const raw = Math.hypot(dx, dy) || 1e-6;
  const d = clamp(raw, Math.abs(l1 - l2) + 0.5, l1 + l2 - 0.15);
  const th = Math.atan2(dy, dx);
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const mx = root[0] + Math.cos(th) * a;
  const my = root[1] + Math.sin(th) * a;
  const joint: V = [mx + bend * h * -Math.sin(th), my + bend * h * Math.cos(th)];
  const end: V = [root[0] + Math.cos(th) * d, root[1] + Math.sin(th) * d];
  return [joint, end];
};

export interface Build {
  /** عرض الجسم (1 = عاديّ). */
  w: number;
}

export interface Joints {
  hipA: V;
  hipB: V;
  kneeA: V;
  kneeB: V;
  ankleA: V;
  ankleB: V;
  shA: V;
  shB: V;
  elbowA: V;
  elbowB: V;
  wristA: V;
  wristB: V;
  neckBase: V;
  neckTop: V;
  headC: V;
  lean: number;
  headAng: number;
}

const rot = (p: V, deg: number): V => {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [p[0] * c - p[1] * s, p[0] * s + p[1] * c];
};
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1]];

export const solveRig = (pose: Pose, view: View, build: Build): Joints => {
  const side = view === "side";
  const hw = side ? 0 : 7.5 * build.w;
  const sw = side ? 0 : 17 * build.w;
  const py = pose.pelvisY;
  const hipA: V = [-hw, py];
  const hipB: V = [hw, py];
  // الساقان: الركبة للأمام (+x) جانبيًّا، وللخارج أماميًّا.
  const legBendA: 1 | -1 = side ? -1 : 1;
  const legBendB: 1 | -1 = -1;
  const [kneeA, aA] = ik2(hipA, [pose.ankleA[0], pose.ankleA[1]], DIM.thigh, DIM.shin, legBendA);
  const [kneeB, aB] = ik2(
    hipB,
    [pose.ankleB[0], pose.ankleB[1]],
    DIM.thigh,
    DIM.shin,
    side ? -1 : legBendB,
  );
  // الجذع
  const up: V = rot([0, -DIM.shoulderH], pose.lean);
  const sideVec: V = rot([1, 0], pose.lean);
  const shC: V = add([0, py], up);
  const shA: V = [shC[0] - sideVec[0] * sw, shC[1] - sideVec[1] * sw];
  const shB: V = [shC[0] + sideVec[0] * sw, shC[1] + sideVec[1] * sw];
  const armBendA: 1 | -1 = side ? 1 : 1;
  const armBendB: 1 | -1 = side ? 1 : -1;
  const [elbowA, wristA] = ik2(shA, add([0, py], pose.handA), DIM.upper, DIM.fore, armBendA);
  const [elbowB, wristB] = ik2(shB, add([0, py], pose.handB), DIM.upper, DIM.fore, armBendB);
  const neckBase = shC;
  const neckTop = add(shC, rot([0, -DIM.neck], pose.lean));
  const headAng = pose.lean + pose.headTilt;
  const fwd = side ? 1.6 : 0;
  const headC = add(neckTop, rot([fwd, -DIM.headRy * 0.88], headAng));
  return {
    hipA,
    hipB,
    kneeA,
    kneeB,
    ankleA: aA,
    ankleB: aB,
    shA,
    shB,
    elbowA,
    elbowB,
    wristA,
    wristB,
    neckBase,
    neckTop,
    headC,
    lean: pose.lean,
    headAng,
  };
};
