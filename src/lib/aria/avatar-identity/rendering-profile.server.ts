// Rendering profile — resolves the right quality preset for a surface.
import { getAriaIdentity } from "./identity.server";
import type { RenderQuality, RenderingRule } from "./types";

export function getRenderingProfile(quality: RenderQuality): RenderingRule {
  const id = getAriaIdentity();
  const found = id.rendering.find((r) => r.quality === quality);
  if (found) return found;
  return id.rendering[0];
}

export function listRenderingProfiles(): readonly RenderingRule[] {
  return getAriaIdentity().rendering;
}

export function assertRenderingCompliant(
  quality: RenderQuality,
  input: { readonly w: number; readonly h: number; readonly compression: number },
): { ok: boolean; issues: readonly string[] } {
  const rule = getRenderingProfile(quality);
  const issues: string[] = [];
  if (input.w < rule.min_resolution_px.w || input.h < rule.min_resolution_px.h) {
    issues.push(
      `resolution ${input.w}x${input.h} below minimum ${rule.min_resolution_px.w}x${rule.min_resolution_px.h}`,
    );
  }
  if (input.compression > rule.compression_max) {
    issues.push(`compression ${input.compression} exceeds max ${rule.compression_max}`);
  }
  return { ok: issues.length === 0, issues };
}
