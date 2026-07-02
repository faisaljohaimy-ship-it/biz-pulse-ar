// Zod contracts for the ARIA Avatar Identity.
import { z } from "zod";

export const ColorSwatchSchema = z.object({
  name: z.string().min(1),
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  role: z.enum(["primary", "secondary", "accent", "skin", "hair", "attire", "glow", "background"]),
});

export const FaceSignatureSchema = z.object({
  gender_presentation: z.literal("feminine"),
  ethnicity_presentation: z.string().min(1),
  age_band: z.string().min(1),
  hairstyle: z.string().min(1),
  eye_color: z.string().min(1),
  eyebrows: z.string().min(1),
  lip_shape: z.string().min(1),
  jawline: z.string().min(1),
  skin_tone: z.string().min(1),
  signature_marks: z.array(z.string()),
});

export const LightingRuleSchema = z.object({
  key: z.enum(["rim", "key", "fill", "backlight", "ambient"]),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  intensity: z.number().min(0).max(1),
  angle_deg: z.number().min(-360).max(360),
});

export const AnimationRuleSchema = z.object({
  channel: z.enum(["breath", "blink", "gaze", "head", "gesture", "lip"]),
  min: z.number(),
  max: z.number(),
  max_delta_per_frame: z.number().nonnegative(),
});

export const GestureRuleSchema = z.object({
  id: z.enum(["welcoming_hand", "listening", "explaining", "reassuring"]),
  hand: z.enum(["left", "right", "both"]),
  amplitude: z.number().min(0).max(1),
  hold_ms: z.number().int().nonnegative(),
  release_ms: z.number().int().nonnegative(),
});

export const ExpressionRuleSchema = z.object({
  mood: z.enum(["confident", "warm", "focused", "alert"]),
  brow_lift: z.number().min(-1).max(1),
  mouth_curve: z.number().min(-1).max(1),
  eye_openness: z.number().min(0).max(1),
  head_tilt_deg: z.number().min(-15).max(15),
});

export const LipSyncRuleSchema = z.object({
  viseme_set: z.enum(["arpa_ar", "ipa_en", "hybrid"]),
  latency_ms_max: z.number().int().positive(),
  closure_threshold: z.number().min(0).max(1),
  overshoot_max: z.number().min(0).max(1),
});

export const VoicePersonalityRuleSchema = z.object({
  persona: z.literal("executive_female"),
  pitch_hz_range: z.object({ low: z.number().positive(), high: z.number().positive() }),
  speaking_rate_wpm: z.object({ ar: z.number().positive(), en: z.number().positive() }),
  tone: z.literal("warm_confident"),
  disallow: z.array(z.string()),
});

export const RenderingRuleSchema = z.object({
  quality: z.enum(["reference", "cinematic", "runtime_hd", "runtime_sd"]),
  min_resolution_px: z.object({ w: z.number().int().positive(), h: z.number().int().positive() }),
  aspect_ratio: z.string().min(1),
  compression_max: z.number().min(0).max(1),
  required_features: z.array(z.string()),
});

export const AvatarIdentitySchema = z.object({
  id: z.literal("aria.executive.v1"),
  display_name: z.object({ en: z.string().min(1), ar: z.string().min(1) }),
  reference_asset: z.string().min(1),
  reference_hash: z.string().min(1),
  face: FaceSignatureSchema,
  palette: z.array(ColorSwatchSchema).min(4),
  lighting: z.array(LightingRuleSchema).min(2),
  animation: z.array(AnimationRuleSchema).min(4),
  gestures: z.array(GestureRuleSchema).min(1),
  expressions: z.array(ExpressionRuleSchema).min(2),
  lip_sync: LipSyncRuleSchema,
  voice: VoicePersonalityRuleSchema,
  rendering: z.array(RenderingRuleSchema).min(1),
  forbidden: z.array(z.string()).min(1),
  version: z.string().min(1),
  locked: z.literal(true),
});
