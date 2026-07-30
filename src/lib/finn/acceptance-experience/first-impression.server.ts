// First impression — 2-second elegant reveal, single fire.
import type { FirstImpressionStage } from "./types";

interface Impression {
  readonly startedAt: number;
  stage: FirstImpressionStage;
  greeted: boolean;
}

const IMPRESSIONS = new Map<string, Impression>();

export function beginFirstImpression(instanceId: string): FirstImpressionStage {
  if (IMPRESSIONS.has(instanceId)) return IMPRESSIONS.get(instanceId)!.stage;
  IMPRESSIONS.set(instanceId, { startedAt: Date.now(), stage: "cold", greeted: false });
  return "cold";
}

export function advanceFirstImpression(instanceId: string, now = Date.now()): FirstImpressionStage {
  const imp = IMPRESSIONS.get(instanceId);
  if (!imp) return "cold";
  const elapsed = now - imp.startedAt;
  // Deterministic timeline: 0..600ms fade_in, 600..2000ms settled, then greeted after greeting fires.
  if (elapsed < 600) imp.stage = "fade_in";
  else if (elapsed < 2000) imp.stage = "settled";
  else if (imp.greeted) imp.stage = "greeted";
  else imp.stage = "settled";
  return imp.stage;
}

export function markGreeted(instanceId: string): void {
  const imp = IMPRESSIONS.get(instanceId);
  if (!imp) return;
  imp.greeted = true;
  imp.stage = "greeted";
}

export function firstImpressionReady(instanceId: string): boolean {
  const imp = IMPRESSIONS.get(instanceId);
  if (!imp) return false;
  return Date.now() - imp.startedAt >= 600;
}

export function resetFirstImpression(instanceId: string): void {
  IMPRESSIONS.delete(instanceId);
}
