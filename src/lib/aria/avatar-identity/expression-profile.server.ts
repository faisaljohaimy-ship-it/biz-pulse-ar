// Expression profile — resolves canonical facial pose for a mood.
import { getFinnIdentity } from "./identity.server";
import type { AvatarMood, ExpressionRule } from "./types";

export function getExpression(mood: AvatarMood): ExpressionRule {
  const id = getFinnIdentity();
  const found = id.expressions.find((e) => e.mood === mood);
  if (found) return found;
  const fallback = id.expressions[0];
  return fallback;
}

export function listExpressions(): readonly ExpressionRule[] {
  return getFinnIdentity().expressions;
}
