/**
 * Voice-Ready Agent Architecture (types only — no runtime).
 * Prepared for future TTS/voice integration. Do not implement speech here.
 */

export type AgentLocale = "ar" | "en";

export type AgentPersonality =
  | "executive"
  | "analytical"
  | "field"
  | "vigilant"
  | "advisory"
  | "narrative";

export interface VoiceProfile {
  /** Voice ID for the future TTS provider (e.g. ElevenLabs voice_id). */
  voiceId: string;
  /** Display name of the synthesized voice. */
  displayName: string;
  /** Speech rate, 0.5 - 2.0 (1.0 = normal). */
  rate: number;
  /** Pitch shift in semitones, -12 to +12. */
  pitch: number;
  /** Output language family. */
  language: AgentLocale;
}

export interface SpeechQueueItem {
  id: string;
  text_ar: string;
  text_en: string;
  createdAt: number;
  /** True once the future TTS layer has played it. */
  spoken: boolean;
}

export interface ConversationTurn {
  id: string;
  agentId: string;
  ts: number;
  text_ar: string;
  text_en: string;
  tone: "info" | "warn" | "critical" | "success";
}

export interface AgentRuntimeProfile {
  id: string;
  name_ar: string;
  name_en: string;
  personality: AgentPersonality;
  voiceProfile: VoiceProfile;
  language: AgentLocale; // primary
  voiceEnabled: boolean; // architectural flag; speech NOT implemented yet
  speechQueue: SpeechQueueItem[];
  conversationHistory: ConversationTurn[];
}

/**
 * Default voice profiles per agent — architectural placeholders.
 * Voice IDs are illustrative; real TTS wiring happens in a later phase.
 */
export const DEFAULT_VOICE_PROFILES: Record<string, { ar: VoiceProfile; en: VoiceProfile }> = {
  aria: {
    ar: {
      voiceId: "aria-ar-executive",
      displayName: "آريا التنفيذية",
      rate: 1.0,
      pitch: 0,
      language: "ar",
    },
    en: {
      voiceId: "aria-en-executive",
      displayName: "ARIA Executive",
      rate: 1.0,
      pitch: 0,
      language: "en",
    },
  },
  security: {
    ar: {
      voiceId: "ops-ar-vigilant",
      displayName: "وكيل الأمن",
      rate: 1.0,
      pitch: -1,
      language: "ar",
    },
    en: {
      voiceId: "ops-en-vigilant",
      displayName: "Security Agent",
      rate: 1.0,
      pitch: -1,
      language: "en",
    },
  },
  patrol: {
    ar: { voiceId: "field-ar", displayName: "وكيل الدوريات", rate: 1.05, pitch: 0, language: "ar" },
    en: { voiceId: "field-en", displayName: "Patrol Agent", rate: 1.05, pitch: 0, language: "en" },
  },
  risk: {
    ar: {
      voiceId: "risk-ar-analytical",
      displayName: "وكيل المخاطر",
      rate: 0.95,
      pitch: -2,
      language: "ar",
    },
    en: {
      voiceId: "risk-en-analytical",
      displayName: "Risk Agent",
      rate: 0.95,
      pitch: -2,
      language: "en",
    },
  },
  compliance: {
    ar: {
      voiceId: "comp-ar-advisory",
      displayName: "وكيل الامتثال",
      rate: 0.95,
      pitch: 0,
      language: "ar",
    },
    en: {
      voiceId: "comp-en-advisory",
      displayName: "Compliance Agent",
      rate: 0.95,
      pitch: 0,
      language: "en",
    },
  },
  reporting: {
    ar: {
      voiceId: "report-ar-narrative",
      displayName: "وكيل التقارير",
      rate: 1.0,
      pitch: 0,
      language: "ar",
    },
    en: {
      voiceId: "report-en-narrative",
      displayName: "Reporting Agent",
      rate: 1.0,
      pitch: 0,
      language: "en",
    },
  },
};
