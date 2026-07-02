// Phase 11.2 — ARIA Avatar Identity types.
// Strictly additive. No dependency on prior layers.

export type AvatarPose = "welcoming_hand" | "listening" | "explaining" | "reassuring";
export type AvatarMood = "confident" | "warm" | "focused" | "alert";
export type RenderQuality = "reference" | "cinematic" | "runtime_hd" | "runtime_sd";

export interface ColorSwatch {
  readonly name: string;
  readonly hex: string;
  readonly role: "primary" | "secondary" | "accent" | "skin" | "hair" | "attire" | "glow" | "background";
}

export interface FaceSignature {
  readonly gender_presentation: "feminine";
  readonly ethnicity_presentation: "Saudi / Arab executive";
  readonly age_band: "30-40";
  readonly hairstyle: string;
  readonly eye_color: string;
  readonly eyebrows: string;
  readonly lip_shape: string;
  readonly jawline: string;
  readonly skin_tone: string;
  readonly signature_marks: readonly string[];
}

export interface LightingRule {
  readonly key: "rim" | "key" | "fill" | "backlight" | "ambient";
  readonly color: string;
  readonly intensity: number;
  readonly angle_deg: number;
}

export interface AnimationRule {
  readonly channel: "breath" | "blink" | "gaze" | "head" | "gesture" | "lip";
  readonly min: number;
  readonly max: number;
  readonly max_delta_per_frame: number;
}

export interface GestureRule {
  readonly id: AvatarPose;
  readonly hand: "left" | "right" | "both";
  readonly amplitude: number;
  readonly hold_ms: number;
  readonly release_ms: number;
}

export interface ExpressionRule {
  readonly mood: AvatarMood;
  readonly brow_lift: number;
  readonly mouth_curve: number;
  readonly eye_openness: number;
  readonly head_tilt_deg: number;
}

export interface LipSyncRule {
  readonly viseme_set: "arpa_ar" | "ipa_en" | "hybrid";
  readonly latency_ms_max: number;
  readonly closure_threshold: number;
  readonly overshoot_max: number;
}

export interface VoicePersonalityRule {
  readonly persona: "executive_female";
  readonly pitch_hz_range: { readonly low: number; readonly high: number };
  readonly speaking_rate_wpm: { readonly ar: number; readonly en: number };
  readonly tone: "warm_confident";
  readonly disallow: readonly string[];
}

export interface RenderingRule {
  readonly quality: RenderQuality;
  readonly min_resolution_px: { readonly w: number; readonly h: number };
  readonly aspect_ratio: string;
  readonly compression_max: number;
  readonly required_features: readonly string[];
}

export interface AvatarIdentity {
  readonly id: "aria.executive.v1";
  readonly display_name: { readonly en: string; readonly ar: string };
  readonly reference_asset: string;
  readonly reference_hash: string;
  readonly face: FaceSignature;
  readonly palette: readonly ColorSwatch[];
  readonly lighting: readonly LightingRule[];
  readonly animation: readonly AnimationRule[];
  readonly gestures: readonly GestureRule[];
  readonly expressions: readonly ExpressionRule[];
  readonly lip_sync: LipSyncRule;
  readonly voice: VoicePersonalityRule;
  readonly rendering: readonly RenderingRule[];
  readonly forbidden: readonly string[];
  readonly version: string;
  readonly locked: true;
}
