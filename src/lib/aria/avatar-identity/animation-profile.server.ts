// Animation profile — deterministic clamps for every animated channel.
import { getAriaIdentity } from "./identity.server";
import type { AnimationRule } from "./types";

export interface AnimationProfile {
  readonly channels: Record<AnimationRule["channel"], AnimationRule>;
  readonly target_fps: number;
  readonly reduced_motion_scale: number;
}

export function getAnimationProfile(): AnimationProfile {
  const id = getAriaIdentity();
  const channels = {} as Record<AnimationRule["channel"], AnimationRule>;
  for (const r of id.animation) channels[r.channel] = r;
  return { channels, target_fps: 60, reduced_motion_scale: 0.35 };
}

export function clampChannelDelta(
  channel: AnimationRule["channel"],
  prev: number,
  next: number,
): number {
  const rules = getAnimationProfile().channels[channel];
  if (!rules) return next;
  const maxStep = rules.max_delta_per_frame;
  const delta = next - prev;
  const clamped = delta > maxStep ? prev + maxStep : delta < -maxStep ? prev - maxStep : next;
  return Math.min(rules.max, Math.max(rules.min, clamped));
}
