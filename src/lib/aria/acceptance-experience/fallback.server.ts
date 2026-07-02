// Acceptance-level fallback — bilingual, never fabricates success.
import { detectVoiceProvider } from "../live-voice/voice-provider.server";

export type AcceptanceFallbackKind =
  | "ok"
  | "voice_unavailable"
  | "microphone_missing"
  | "data_unavailable"
  | "network_slow"
  | "unknown";

export interface AcceptanceFallbackInput {
  readonly hasMicrophone?: boolean;
  readonly dataAvailable?: boolean;
  readonly networkLatencyMs?: number;
}

export interface AcceptanceFallbackDecision {
  readonly kind: AcceptanceFallbackKind;
  readonly message_ar: string;
  readonly message_en: string;
  readonly allowTextInput: boolean;
  readonly reason?: string;
}

export function decideAcceptanceFallback(input: AcceptanceFallbackInput = {}): AcceptanceFallbackDecision {
  const caps = detectVoiceProvider();
  if (!caps.stt || !caps.tts) {
    return {
      kind: "voice_unavailable",
      message_ar: "الصوت غير متاح حالياً. يمكنك المتابعة كتابياً.",
      message_en: "Voice is unavailable. You can continue by text.",
      allowTextInput: true,
      reason: caps.reason,
    };
  }
  if (input.hasMicrophone === false) {
    return {
      kind: "microphone_missing",
      message_ar: "لا يمكن الوصول إلى المايكروفون.",
      message_en: "Microphone not available.",
      allowTextInput: true,
    };
  }
  if (input.dataAvailable === false) {
    return {
      kind: "data_unavailable",
      message_ar: "البيانات المطلوبة غير متاحة حالياً.",
      message_en: "The requested data is not available right now.",
      allowTextInput: true,
    };
  }
  if (typeof input.networkLatencyMs === "number" && input.networkLatencyMs > 4000) {
    return {
      kind: "network_slow",
      message_ar: "الشبكة بطيئة. سأكتفي بإجابات موجزة.",
      message_en: "Network is slow. I'll keep answers brief.",
      allowTextInput: true,
    };
  }
  return {
    kind: "ok",
    message_ar: "جاهزة.",
    message_en: "Ready.",
    allowTextInput: true,
  };
}
