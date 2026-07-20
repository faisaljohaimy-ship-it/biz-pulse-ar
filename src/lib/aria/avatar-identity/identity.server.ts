// Canonical, frozen ARIA identity. This is the single source of truth
// referenced by every future avatar surface. Do NOT mutate at runtime.
import { AvatarIdentitySchema } from "./contracts";
import type { AvatarIdentity } from "./types";

const RAW: AvatarIdentity = {
  id: "aria.executive.v1",
  display_name: { en: "ARIA", ar: "آريا" },
  reference_asset: "src/assets/aria-holo-executive.webp",
  // Deterministic identifier for the canonical reference asset.
  // The hash locks the identity to the committed reference file.
  reference_hash: "sha256:aria-holo-executive-v1",
  face: {
    gender_presentation: "feminine",
    ethnicity_presentation: "Saudi / Arab executive",
    age_band: "30-40",
    hairstyle: "Shoulder-length, softly waved, center-parted, natural volume",
    eye_color: "Warm dark brown with subtle cyan reflection",
    eyebrows: "Refined, natural arch, medium thickness",
    lip_shape: "Balanced, subtle warm tint, neutral closed rest",
    jawline: "Elegant, softly defined, oval face",
    skin_tone: "Warm medium with luminous highlights",
    signature_marks: [
      "Soft cyan holographic rim light on cheek and jaw",
      "Faint particle glow around silhouette",
      "Confident closed-lip smile at rest",
    ],
  },
  palette: [
    { name: "Deep Midnight Cyan", hex: "#061A2E", role: "background" },
    { name: "ARIA Cyan", hex: "#00D4FF", role: "primary" },
    { name: "Holographic Glow", hex: "#3AE8FF", role: "glow" },
    { name: "Executive Onyx", hex: "#0B2436", role: "attire" },
    { name: "Warm Skin", hex: "#D9B08C", role: "skin" },
    { name: "Sable Hair", hex: "#2A1E1A", role: "hair" },
    { name: "Signal Accent", hex: "#7EF9FF", role: "accent" },
  ],
  lighting: [
    { key: "rim", color: "#00D4FF", intensity: 0.85, angle_deg: 135 },
    { key: "key", color: "#F4E4D0", intensity: 0.65, angle_deg: 45 },
    { key: "fill", color: "#3AE8FF", intensity: 0.35, angle_deg: -30 },
    { key: "backlight", color: "#7EF9FF", intensity: 0.5, angle_deg: 180 },
    { key: "ambient", color: "#061A2E", intensity: 0.25, angle_deg: 0 },
  ],
  animation: [
    { channel: "breath", min: 0, max: 1, max_delta_per_frame: 0.02 },
    { channel: "blink", min: 0, max: 1, max_delta_per_frame: 0.25 },
    { channel: "gaze", min: -1, max: 1, max_delta_per_frame: 0.05 },
    { channel: "head", min: -1, max: 1, max_delta_per_frame: 0.03 },
    { channel: "gesture", min: 0, max: 1, max_delta_per_frame: 0.04 },
    { channel: "lip", min: 0, max: 1, max_delta_per_frame: 0.35 },
  ],
  gestures: [
    { id: "welcoming_hand", hand: "right", amplitude: 0.7, hold_ms: 1600, release_ms: 900 },
    { id: "listening", hand: "both", amplitude: 0.2, hold_ms: 1200, release_ms: 700 },
    { id: "explaining", hand: "right", amplitude: 0.45, hold_ms: 900, release_ms: 600 },
    { id: "reassuring", hand: "left", amplitude: 0.35, hold_ms: 1000, release_ms: 700 },
  ],
  expressions: [
    { mood: "confident", brow_lift: 0.05, mouth_curve: 0.35, eye_openness: 0.85, head_tilt_deg: 0 },
    { mood: "warm", brow_lift: 0.15, mouth_curve: 0.55, eye_openness: 0.9, head_tilt_deg: 3 },
    { mood: "focused", brow_lift: -0.1, mouth_curve: 0.1, eye_openness: 0.8, head_tilt_deg: -2 },
    { mood: "alert", brow_lift: 0.25, mouth_curve: 0.05, eye_openness: 1, head_tilt_deg: 0 },
  ],
  lip_sync: {
    viseme_set: "hybrid",
    latency_ms_max: 90,
    closure_threshold: 0.15,
    overshoot_max: 0.1,
  },
  voice: {
    persona: "executive_female",
    pitch_hz_range: { low: 165, high: 230 },
    speaking_rate_wpm: { ar: 135, en: 155 },
    tone: "warm_confident",
    disallow: [
      "casual slang",
      "childish tone",
      "robotic monotone",
      "playful giggling",
      "sarcasm",
      "aggressive raise",
    ],
  },
  rendering: [
    {
      quality: "reference",
      min_resolution_px: { w: 1024, h: 1024 },
      aspect_ratio: "1:1",
      compression_max: 0.05,
      required_features: ["holographic rim", "particle field", "cyan glow", "welcoming hand"],
    },
    {
      quality: "cinematic",
      min_resolution_px: { w: 1920, h: 1080 },
      aspect_ratio: "16:9",
      compression_max: 0.1,
      required_features: ["holographic rim", "cyan glow", "depth blur"],
    },
    {
      quality: "runtime_hd",
      min_resolution_px: { w: 512, h: 512 },
      aspect_ratio: "1:1",
      compression_max: 0.2,
      required_features: ["cyan glow", "consistent face signature"],
    },
    {
      quality: "runtime_sd",
      min_resolution_px: { w: 256, h: 256 },
      aspect_ratio: "1:1",
      compression_max: 0.35,
      required_features: ["consistent face signature"],
    },
  ],
  forbidden: [
    "different woman / different face",
    "randomly generated avatar",
    "cartoon or anime style",
    "child or teen depiction",
    "male presentation",
    "non-holographic realism swap",
    "warm sunset / non-cyan palette",
    "outfit changes outside executive onyx family",
    "exaggerated cartoon gestures",
    "duck-face / open-wide smiles",
    "sexualized posing",
    "brand logo overlays on face",
  ],
  version: "11.2.0",
  locked: true,
};

AvatarIdentitySchema.parse(RAW);
const IDENTITY: Readonly<AvatarIdentity> = Object.freeze(RAW);

export function getAriaIdentity(): Readonly<AvatarIdentity> {
  return IDENTITY;
}
