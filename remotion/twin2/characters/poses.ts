/**
 * مكتبة الأوضاع وحركة المشي. الإطار المرجعيّ: الأصل فوق نقطة الأرض بارتفاع الحوض
 * الواقف (90)، فالأرض عند y=+90 والكاحل المرتكز عند y=+84. المشي بـIK: القدم
 * الدائسة تتراجع نسبةً للحوض بسرعة الجسم نفسها فلا انزلاق؛ والحوض يعلو ويهبط
 * بتردّد الخطوة المزدوج.
 */
import { clamp, easeInOut, lerp } from "../kit/ease";
import { DIM, STAND_ANKLE_Y, blendPose, standFront, standSide, type Pose, type V } from "./rig";

const TAU = Math.PI * 2;

export interface WalkOpts {
  /** سرعة الجسم بوحدات الشخصية المحلّية/ثانية. */
  speed: number;
  /** زمن الدورة الكاملة (خطوتان) بالثواني. */
  cycle?: number;
  armSwing?: number;
  /** معاملا تأرجح الذراعين (0 = ثابتة). */
  swingA?: number;
  swingB?: number;
  lean?: number;
  bob?: number;
}

interface FootState {
  x: number;
  lift: number;
  ang: number;
}

const footTrack = (phase: number, d: number, liftMax: number): FootState => {
  const st = 0.6;
  const p = ((phase % 1) + 1) % 1;
  if (p < st) {
    const u = p / st;
    const ang = u < 0.72 ? 0 : easeInOut((u - 0.72) / 0.28) * 32;
    return { x: d - 2 * d * u, lift: u > 0.88 ? ((u - 0.88) / 0.12) * 1.8 : 0, ang };
  }
  const u = (p - st) / (1 - st);
  const e = easeInOut(u);
  const ang = u < 0.5 ? lerp(32, -6, easeInOut(u / 0.5)) : lerp(-6, 4, (u - 0.5) / 0.5);
  return { x: -d + 2 * d * e, lift: 1.8 + Math.sin(Math.PI * u) * liftMax, ang };
};

export const walkPose = (tSec: number, o: WalkOpts): Pose => {
  const T = o.cycle ?? 1.1;
  const phase = tSec / T;
  const d = 0.3 * o.speed * T;
  const bobAmp = o.bob ?? 3.4;
  const fA = footTrack(phase, d, 9);
  const fB = footTrack(phase + 0.5, d, 9);
  const hMax = 87.5;
  const h = hMax - (bobAmp * (1 - Math.cos(2 * TAU * (phase - 0.3)))) / 2;
  const pelvisY = DIM.standPelvis - h;
  const lean = o.lean ?? 3;
  const lr = (lean * Math.PI) / 180;
  const shX = Math.sin(lr) * DIM.shoulderH;
  const shY = pelvisY - Math.cos(lr) * DIM.shoulderH;
  const sw = o.armSwing ?? 1;
  const mkHand = (s: number, k: number): V => {
    const ang = s * 26 * sw * k;
    const rad = 52 - Math.max(0, s) * 11 * k;
    const r = (ang * Math.PI) / 180;
    return [shX + Math.sin(r) * rad, shY + Math.cos(r) * rad];
  };
  // الذراع A عكس الساق A
  const aw = Math.sin(TAU * (phase + 0.5));
  const bw = Math.sin(TAU * phase);
  return {
    pelvisY,
    lean,
    headTilt: -lean * 0.6,
    ankleA: [fA.x, STAND_ANKLE_Y - fA.lift],
    ankleB: [fB.x, STAND_ANKLE_Y - fB.lift],
    footA: fA.ang,
    footB: fB.ang,
    handA: mkHand(aw, o.swingA ?? 1),
    handB: mkHand(bw, o.swingB ?? 1),
    gripA: 0,
    gripB: 0,
  };
};

/** يدٌ تُرفع إلى الفم (جهاز لاسلكي). */
export const radioToMouth = (base: Pose, which: "A" | "B", amount: number): Pose => {
  const target: Pose = { ...base, headTilt: 1 };
  const hand: V = [15.5, -DIM.shoulderH - 11];
  if (which === "A") target.handA = hand;
  else target.handB = hand;
  return blendPose(base, target, amount);
};

export const standPose = standSide;
export const standFrontPose = standFront;

/** ذراع ممدودة إلى نقطة (إشارة/فحص). */
export const reachTo = (base: Pose, which: "A" | "B", hand: V, amount: number, grip = 0): Pose => {
  const target: Pose = { ...base };
  if (which === "A") {
    target.handA = hand;
    target.gripA = grip;
  } else {
    target.handB = hand;
    target.gripB = grip;
  }
  return blendPose(base, target, clamp(amount));
};

/** وضع الانحناء للأمام (مرآة الفحص أسفل المركبة). */
export const mirrorCheck = (amount: number): Pose => {
  const crouch: Pose = {
    pelvisY: 12,
    lean: 20,
    headTilt: 10,
    ankleA: [22, STAND_ANKLE_Y],
    ankleB: [-14, STAND_ANKLE_Y],
    footA: 0,
    footB: 0,
    handA: [47, 42],
    handB: [24, 22],
    gripA: 38,
    gripB: 0,
  };
  return blendPose(standSide(), crouch, amount);
};
