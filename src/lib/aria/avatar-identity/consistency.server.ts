// Consistency checker — validates any candidate avatar descriptor against
// the frozen identity. Never mutates; returns issues + verdict.
import { getAriaIdentity } from "./identity.server";

export interface CandidateAvatarDescriptor {
  readonly asset_path?: string;
  readonly asset_hash?: string;
  readonly palette_hex?: readonly string[];
  readonly gender_presentation?: string;
  readonly age_band?: string;
  readonly pose?: string;
  readonly style?: string;
  readonly features?: readonly string[];
}

export interface ConsistencyResult {
  readonly ok: boolean;
  readonly score: number;
  readonly issues: readonly string[];
  readonly matched: readonly string[];
}

const REQUIRED_FEATURES = ["holographic", "cyan"];

export function checkConsistency(input: CandidateAvatarDescriptor): ConsistencyResult {
  const id = getAriaIdentity();
  const issues: string[] = [];
  const matched: string[] = [];

  if (input.gender_presentation && input.gender_presentation !== id.face.gender_presentation) {
    issues.push(`gender_presentation must be ${id.face.gender_presentation}`);
  } else if (input.gender_presentation) matched.push("gender_presentation");

  if (input.age_band && input.age_band !== id.face.age_band) {
    issues.push(`age_band must be ${id.face.age_band}`);
  } else if (input.age_band) matched.push("age_band");

  if (input.style && /(cartoon|anime|child|toon)/i.test(input.style)) {
    issues.push("style violates identity (no cartoon/anime/child)");
  }

  if (input.asset_hash && input.asset_hash !== id.reference_hash) {
    // Non-canonical assets are allowed for downstream renders, but note it.
    matched.push("asset_hash_variant");
  } else if (input.asset_hash) matched.push("asset_hash_exact");

  if (input.palette_hex && input.palette_hex.length) {
    const allowed = new Set(id.palette.map((c) => c.hex.toLowerCase()));
    const off = input.palette_hex.filter((h) => !allowed.has(h.toLowerCase()));
    if (off.length > Math.floor(input.palette_hex.length / 2)) {
      issues.push(`palette drifts from canonical (off: ${off.slice(0, 3).join(", ")})`);
    } else matched.push("palette_aligned");
  }

  if (input.features && input.features.length) {
    const flat = input.features.join(" ").toLowerCase();
    for (const req of REQUIRED_FEATURES) {
      if (!flat.includes(req)) issues.push(`missing feature: ${req}`);
      else matched.push(`feature:${req}`);
    }
  }

  if (input.pose) {
    const known = id.gestures.map((g) => g.id) as string[];
    if (!known.includes(input.pose)) issues.push(`pose "${input.pose}" not in canonical set`);
    else matched.push("pose_canonical");
  }

  const total = matched.length + issues.length;
  const score = total === 0 ? 0 : Math.round((matched.length / total) * 100) / 100;
  return { ok: issues.length === 0, score, issues, matched };
}
