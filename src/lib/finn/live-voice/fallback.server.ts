// Fallback engine — decides degraded modes without ever fabricating success.
import { detectVoiceProvider } from "./voice-provider.server";
import type { VoiceLang } from "./types";

export type VoiceFallbackKind =
  | "voice_ok"
  | "text_fallback_no_provider"
  | "text_fallback_no_microphone"
  | "text_fallback_stt_failed"
  | "text_fallback_tts_failed"
  | "clarify"
  | "unknown";

export interface VoiceFallbackDecision {
  readonly kind: VoiceFallbackKind;
  readonly message_ar: string;
  readonly message_en: string;
  readonly allow_text_input: boolean;
}

export interface FallbackInput {
  readonly hasMicrophone: boolean;
  readonly sttOk?: boolean;
  readonly ttsOk?: boolean;
  readonly userText?: string;
  readonly lang?: VoiceLang;
}

export function decideVoiceFallback(input: FallbackInput): VoiceFallbackDecision {
  const caps = detectVoiceProvider();
  if (!caps.stt || !caps.tts) {
    return {
      kind: "text_fallback_no_provider",
      message_ar: "الميزة الصوتية غير متاحة حالياً. يمكنك المتابعة بالكتابة.",
      message_en: "Voice is currently unavailable. You can continue by typing.",
      allow_text_input: true,
    };
  }
  if (!input.hasMicrophone) {
    return {
      kind: "text_fallback_no_microphone",
      message_ar: "لا يمكن الوصول إلى المايكروفون. الكتابة متاحة.",
      message_en: "Microphone unavailable. Text input is available.",
      allow_text_input: true,
    };
  }
  if (input.sttOk === false) {
    return {
      kind: "text_fallback_stt_failed",
      message_ar: "تعذّر تحويل الصوت إلى نص. حاول مجدداً أو اكتب طلبك.",
      message_en: "Could not transcribe audio. Try again or type your request.",
      allow_text_input: true,
    };
  }
  if (input.ttsOk === false) {
    return {
      kind: "text_fallback_tts_failed",
      message_ar: "تعذّر تشغيل الصوت. ستُعرض الإجابة نصياً.",
      message_en: "Audio playback unavailable. Answer will be shown as text.",
      allow_text_input: true,
    };
  }
  if (input.userText !== undefined && input.userText.trim().length < 2) {
    return {
      kind: "clarify",
      message_ar: "أحتاج توضيحاً موجزاً.",
      message_en: "I need a short clarification.",
      allow_text_input: true,
    };
  }
  return {
    kind: "voice_ok",
    message_ar: "الصوت جاهز.",
    message_en: "Voice ready.",
    allow_text_input: true,
  };
}
