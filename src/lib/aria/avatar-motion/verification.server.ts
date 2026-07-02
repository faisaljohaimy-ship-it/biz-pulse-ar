// Verification — ensures a motion sample obeys the identity contract.
import { clampChannelDelta } from "../avatar-identity/animation-profile.server";
import { MotionSampleSchema } from "./contracts";
import type { MotionSample } from "./types";

export interface MotionVerification {
  readonly ok: boolean;
  readonly issues: readonly string[];
  readonly clampedDeltas: number;
}

export function verifySample(prev: MotionSample | null, next: unknown): MotionVerification {
  const parsed = MotionSampleSchema.safeParse(next);
  const issues: string[] = [];
  if (!parsed.success) {
    for (const i of parsed.error.issues) {
      issues.push(`${i.path.join(".") || "root"}: ${i.message}`);
    }
    return { ok: false, issues, clampedDeltas: 0 };
  }
  if (!prev) return { ok: true, issues, clampedDeltas: 0 };
  const s = parsed.data;
  let clamped = 0;
  const check = (ch: "breath" | "blink" | "gaze" | "head" | "gesture" | "lip", p: number, n: number) => {
    const c = clampChannelDelta(ch, p, n);
    if (Math.abs(c - n) > 1e-6) clamped++;
  };
  check("breath", prev.breath, s.breath);
  check("blink", prev.blink, s.blink);
  check("gaze", prev.gazeX, s.gazeX);
  check("gaze", prev.gazeY, s.gazeY);
  check("head", prev.headYaw, s.headYaw);
  check("head", prev.headPitch, s.headPitch);
  check("gesture", prev.gesture, s.gesture);
  check("lip", prev.lip, s.lip);
  return { ok: clamped === 0, issues, clampedDeltas: clamped };
}
