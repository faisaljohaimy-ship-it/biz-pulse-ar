/**
 * Emotion Director — meaning-driven emotion + semantic head gesture selection.
 *
 * Pure logic module (no DOM). Consumed by HologramFace / AriaCopilot.
 * Sprite generation degraded to procedural-only mode (no AriaAvatarV3 layered
 * rig with pre-baked viseme/emotion sprites exists in the repo); this module
 * still drives the full emotion + head-motion contract via procedural tints
 * and CSS transforms applied by the consumer.
 */

export type AriaEmotion = "warm" | "joy" | "attentive" | "thoughtful" | "concern";

export type AriaHeadGesture =
  | "none"
  | "nod-start" // sentence start subtle 1.5° down-up (350ms)
  | "nod-emphasis" // 1° quick nod on numbers/exclamations
  | "double-nod" // affirmations (نعم، بالتأكيد، تم)
  | "shake" // negations (لا، لم، ليس)
  | "question-tilt"; // 3° tilt for the whole question sentence

export type AriaConversationalState = "idle" | "listening" | "thinking" | "speaking";

// ---- Lexicons (Arabic + English) --------------------------------------------

const POSITIVE = [
  "نجاح",
  "ممتاز",
  "أعلى من الحد",
  "جاهزة",
  "جاهز",
  "تم بنجاح",
  "مطمئن",
  "success",
  "excellent",
  "ready",
  "great",
];
const RISK = [
  "تجاوز",
  "ارتفاع",
  "حرج",
  "خطر",
  "خرق",
  "انتهاك",
  "تأخر",
  "risk",
  "critical",
  "breach",
  "anomaly",
  "violation",
];
const AFFIRMATIONS = ["نعم", "بالتأكيد", "تم", "أكيد", "yes", "confirmed"];
const NEGATIONS = ["لا ", "لم ", "ليس", " لن ", "no ", "not "];

// numeric evidence marker
const NUMBER_RE = /(\d+([.,]\d+)?%?)/;

// question marks — Arabic ؟ + latin ?
const QUESTION_RE = /[؟?]\s*$/;

// emphasis markers — exclamations or explicit intensifiers
const EMPHASIS_RE = /[!！]|(مهم جدًا|عاجل|urgent|critical)/i;

function hit(text: string, list: string[]): boolean {
  const t = ` ${text} `;
  return list.some((w) => t.includes(w));
}

// ---- Emotion selection ------------------------------------------------------

/**
 * Derive emotion for a single spoken sentence.
 * Anomaly / risk sections ALWAYS render concern.
 */
export function emotionForSentence(sentence: string): AriaEmotion {
  const s = sentence.trim();
  if (!s) return "warm";
  if (hit(s, RISK)) return "concern";
  if (hit(s, POSITIVE)) return "joy";
  if (NUMBER_RE.test(s)) return "attentive";
  return "warm";
}

/**
 * Derive emotion from the current conversational state.
 * Speaking is modulated per-sentence; caller should re-invoke emotionForSentence.
 */
export function emotionForState(
  state: AriaConversationalState,
  opts?: { greeting?: boolean; anomaly?: boolean },
): AriaEmotion {
  if (opts?.anomaly) return "concern";
  switch (state) {
    case "listening":
      return "attentive";
    case "thinking":
      return "thoughtful";
    case "speaking":
      return opts?.greeting ? "joy" : "warm";
    default:
      return "warm";
  }
}

// ---- Head gesture selection -------------------------------------------------

/**
 * At most one semantic gesture per sentence.
 * Priority: question > affirmation/negation > emphasis > sentence-start nod.
 */
export function gestureForSentence(sentence: string): AriaHeadGesture {
  const s = sentence.trim();
  if (!s) return "none";
  if (QUESTION_RE.test(s)) return "question-tilt";
  if (hit(s, AFFIRMATIONS)) return "double-nod";
  if (hit(s, NEGATIONS)) return "shake";
  if (EMPHASIS_RE.test(s) || NUMBER_RE.test(s)) return "nod-emphasis";
  return "nod-start";
}

/**
 * Split a spoken chunk into sentences (Arabic + Latin punctuation).
 */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?؟。])\s+|\n+/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

// ---- Transform helpers ------------------------------------------------------

/**
 * CSS transform for a head gesture at progress p ∈ [0..1].
 * Damped springs, no snaps. Reduced-motion callers should skip.
 */
export function gestureTransform(g: AriaHeadGesture, p: number): string {
  const clamp = Math.max(0, Math.min(1, p));
  switch (g) {
    case "nod-start": {
      // subtle 1.5° down-up over the gesture window
      const a = Math.sin(clamp * Math.PI) * 1.5;
      return `rotateX(${a}deg)`;
    }
    case "nod-emphasis": {
      const a = Math.sin(clamp * Math.PI) * 1;
      return `rotateX(${a}deg)`;
    }
    case "double-nod": {
      const a = Math.sin(clamp * Math.PI * 2) * 1.4;
      return `rotateX(${a}deg)`;
    }
    case "shake": {
      const a = Math.sin(clamp * Math.PI * 2) * 2;
      return `rotateY(${a}deg)`;
    }
    case "question-tilt": {
      const a = Math.sin(clamp * Math.PI) * 3;
      return `rotateZ(${a}deg)`;
    }
    default:
      return "";
  }
}

/**
 * Emotion overlay tint (procedural fallback for missing sprite set).
 * Sits above the base portrait, below any viseme layer.
 */
export function emotionOverlay(e: AriaEmotion): {
  filter: string;
  glow: string;
  browLift: number; // px, applied to brow band
  mouthCurve: number; // 0..1, drives lip-band curvature
} {
  switch (e) {
    case "joy":
      return {
        filter: "brightness(1.06) saturate(1.14)",
        glow: "rgba(58,232,255,0.55)",
        browLift: -1,
        mouthCurve: 1,
      };
    case "attentive":
      return {
        filter: "brightness(1.02) saturate(1.05)",
        glow: "rgba(0,212,255,0.45)",
        browLift: -2,
        mouthCurve: 0.35,
      };
    case "thoughtful":
      return {
        filter: "brightness(0.97) saturate(0.95) hue-rotate(-4deg)",
        glow: "rgba(124,92,255,0.4)",
        browLift: 0,
        mouthCurve: 0.2,
      };
    case "concern":
      return {
        filter: "brightness(0.94) saturate(1.02) hue-rotate(4deg)",
        glow: "rgba(245,165,36,0.45)",
        browLift: 2,
        mouthCurve: -0.4,
      };
    case "warm":
    default:
      return {
        filter: "brightness(1.0) saturate(1.0)",
        glow: "rgba(0,212,255,0.4)",
        browLift: 0,
        mouthCurve: 0.6,
      };
  }
}

/**
 * Attention-shift yaw (2–3°) toward a highlighted UI region on screen side.
 */
export function attentionYaw(side: "left" | "right" | null): number {
  if (side === "left") return -2.5;
  if (side === "right") return 2.5;
  return 0;
}
