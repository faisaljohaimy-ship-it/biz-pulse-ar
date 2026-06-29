/**
 * Voice Profiles — deterministic mapping from a Digital Human's
 * `voiceProfileId` to a concrete OpenAI gpt-4o-mini-tts voice for each
 * language. Pure data; safe on client and server.
 *
 * Voices are intentionally distinct per persona so executives can
 * recognize who is speaking without looking at the dock. Both AR and EN
 * are mapped to voices the model supports for both languages.
 *
 * If a future provider (Azure / HeyGen / D-ID) is wired in, this map is
 * the only thing that changes — the avatar layer keeps consuming
 * amplitude from `aria-voice.ts`.
 */
export type VoiceLang = "ar" | "en";

interface VoicePair {
  ar: string;
  en: string;
  /** Optional natural-language steering for tone / cadence / accent. */
  instructions?: string;
}

// Curated to keep each persona acoustically unique. All voices are valid
// names accepted by openai/gpt-4o-mini-tts.
const VOICES: Record<string, VoicePair> = {
  aria:        { ar: "shimmer", en: "nova",
                 instructions: "Calm, warm, executive female voice. Confident and precise." },
  incident:    { ar: "onyx",    en: "onyx",
                 instructions: "Decisive command voice. Clear, calm authority. Slightly clipped." },
  risk:        { ar: "echo",    en: "echo",
                 instructions: "Measured analytical male voice. Neutral, precise, slightly deliberate." },
  compliance:  { ar: "sage",    en: "sage",
                 instructions: "Advisory, composed, respectful tone with policy gravitas." },
  cctv:        { ar: "ash",     en: "ash",
                 instructions: "Vigilant operations voice. Crisp, observational, low pitch." },
  patrol:      { ar: "fable",   en: "fable",
                 instructions: "Field commander cadence. Steady, alert, slightly outdoor energy." },
  emergency:   { ar: "onyx",    en: "onyx",
                 instructions: "Crisis coordinator. Calm, urgent, no panic. Short clean phrases." },
  visitor:     { ar: "coral",   en: "coral",
                 instructions: "Welcoming corporate concierge tone. Polite, clear." },
  knowledge:   { ar: "echo",    en: "echo",
                 instructions: "Senior knowledge officer. Even, instructional, slightly thoughtful." },
  reporting:   { ar: "fable",   en: "fable",
                 instructions: "Executive briefing narrator. Polished, smooth, news-anchor pacing." },
  twin:        { ar: "ash",     en: "ash",
                 instructions: "Technical narrator for simulation results. Neutral, precise." },
};

const DEFAULT: VoicePair = VOICES.aria;

export function resolveVoice(profileId: string | undefined, lang: VoiceLang): { voice: string; instructions?: string } {
  const pair = (profileId && VOICES[profileId]) || DEFAULT;
  return { voice: lang === "ar" ? pair.ar : pair.en, instructions: pair.instructions };
}

/**
 * Map a narrator-agent id (from `event-narrator.ts`) to a registry
 * Digital Human id. Keeps the narrator and the visual roster aligned
 * even when their naming differs slightly.
 */
export function narratorAgentToHumanId(agent: string): string {
  switch (agent) {
    case "risk_analyst":          return "risk_intelligence";
    case "patrol_intelligence":   return "patrol_commander";
    case "asset_intelligence":    return "digital_twin";
    case "permit_authority":      return "compliance_auditor";
    case "predictive_analytics":  return "risk_intelligence";
    case "workflow_supervisor":   return "aria";
    default:                      return agent;
  }
}
