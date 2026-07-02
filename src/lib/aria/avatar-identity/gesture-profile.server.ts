// Gesture profile — canonical gesture rules with the welcoming hand default.
import { getAriaIdentity } from "./identity.server";
import type { AvatarPose, GestureRule } from "./types";

export function getGesture(pose: AvatarPose): GestureRule {
  const id = getAriaIdentity();
  const found = id.gestures.find((g) => g.id === pose);
  if (found) return found;
  return id.gestures[0];
}

export function getDefaultGesture(): GestureRule {
  return getGesture("welcoming_hand");
}

export function listGestures(): readonly GestureRule[] {
  return getAriaIdentity().gestures;
}
