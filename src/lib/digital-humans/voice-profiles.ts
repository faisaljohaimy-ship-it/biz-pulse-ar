/**
 * Free specialist voice profiles.
 *
 * ARIA is deliberately absent: she keeps her locked ElevenLabs identity.
 * Every specialist instead uses the browser/operating-system Web Speech
 * catalogue, so NEXIOS does not need a paid agent-TTS key. Names are ranked
 * preferences rather than assumptions because the catalogue differs across
 * iOS, Android, Windows, macOS, and installed language packs.
 */
export type VoiceLang = "ar" | "en";

export interface FreeVoicePreset {
  languageTag: string;
  preferredNames: readonly string[];
  rate: number;
  pitch: number;
  fallbackIndex: number;
  label: string;
}

interface FreeVoicePair {
  ar: FreeVoicePreset;
  en: FreeVoicePreset;
}

const preset = (
  languageTag: string,
  preferredNames: readonly string[],
  rate: number,
  pitch: number,
  fallbackIndex: number,
  label: string,
): FreeVoicePreset => ({ languageTag, preferredNames, rate, pitch, fallbackIndex, label });

/** Ten intentionally different, zero-API-cost specialist personalities. */
const VOICES: Record<string, FreeVoicePair> = {
  incident: {
    ar: preset("ar-SA", ["hamed", "tarik", "majed", "maged"], 1.03, 0.82, 0, "قيادي حازم"),
    en: preset("en-US", ["guy", "david", "mark", "alex"], 1.02, 0.82, 0, "decisive command"),
  },
  risk: {
    ar: preset("ar-SA", ["naayf", "fahd", "tarik", "majed"], 0.92, 0.94, 1, "تحليلي متزن"),
    en: preset("en-GB", ["daniel", "ryan", "george", "oliver"], 0.92, 0.94, 1, "measured analysis"),
  },
  compliance: {
    ar: preset("ar-SA", ["salma", "zariyah", "hoda", "laila"], 0.9, 1.04, 2, "استشاري رصين"),
    en: preset("en-GB", ["susan", "serena", "karen", "moira"], 0.9, 1.04, 2, "composed advisory"),
  },
  cctv: {
    ar: preset("ar-SA", ["tarik", "hamed", "maged", "majed"], 1.08, 0.78, 3, "مراقبة يقظة"),
    en: preset("en-US", ["alex", "fred", "david", "guy"], 1.08, 0.78, 3, "vigilant operations"),
  },
  patrol: {
    ar: preset("ar-SA", ["majed", "maged", "hamed", "tarik"], 1.06, 0.9, 4, "قائد ميداني"),
    en: preset("en-US", ["aaron", "tom", "matthew", "mark"], 1.06, 0.9, 4, "field commander"),
  },
  emergency: {
    ar: preset("ar-SA", ["hoda", "salma", "laila", "zariyah"], 1.1, 1, 5, "عاجل وهادئ"),
    en: preset("en-US", ["zira", "samantha", "victoria", "ava"], 1.1, 1, 5, "calm urgency"),
  },
  visitor: {
    ar: preset("ar-SA", ["laila", "mouna", "salma", "hoda"], 0.98, 1.12, 6, "ترحيبي واضح"),
    en: preset("en-US", ["samantha", "karen", "tessa", "fiona"], 0.98, 1.12, 6, "warm concierge"),
  },
  knowledge: {
    ar: preset("ar-SA", ["fahd", "naayf", "maged", "tarik"], 0.88, 0.96, 7, "معرفي تعليمي"),
    en: preset(
      "en-GB",
      ["george", "daniel", "arthur", "oliver"],
      0.88,
      0.96,
      7,
      "instructional knowledge",
    ),
  },
  reporting: {
    ar: preset("ar-SA", ["zariyah", "salma", "mouna", "laila"], 0.94, 1.06, 8, "موجز تنفيذي"),
    en: preset("en-GB", ["serena", "kate", "fiona", "susan"], 0.94, 1.06, 8, "executive briefing"),
  },
  twin: {
    ar: preset("ar-SA", ["maged", "naayf", "majed", "hamed"], 0.96, 0.86, 9, "تقني دقيق"),
    en: preset("en-US", ["fred", "alex", "tom", "david"], 0.96, 0.86, 9, "precise technical"),
  },
};

const DEFAULT: FreeVoicePair = VOICES.risk;

export function resolveVoice(profileId: string | undefined, lang: VoiceLang): FreeVoicePreset {
  const pair = (profileId && VOICES[profileId]) || DEFAULT;
  return pair[lang];
}

export interface SelectedSystemVoice extends FreeVoicePreset {
  voice: SpeechSynthesisVoice | null;
  voiceName: string;
  local: boolean;
}

function sameLanguage(voice: SpeechSynthesisVoice, languageTag: string): boolean {
  const wanted = languageTag.toLowerCase().split("-")[0];
  return voice.lang.toLowerCase().split("-")[0] === wanted;
}

/**
 * Picks the best installed free voice. A named local match wins, then any
 * named match, then a deterministic local voice, then any same-language
 * voice. If the list is still loading, a null voice lets the browser choose
 * its default for the requested BCP-47 language.
 */
export function selectSystemVoice(
  profileId: string | undefined,
  lang: VoiceLang,
  voices: readonly SpeechSynthesisVoice[],
): SelectedSystemVoice {
  const profile = resolveVoice(profileId, lang);
  const matching = voices.filter((voice) => sameLanguage(voice, profile.languageTag));
  const byPreference = profile.preferredNames
    .map(
      (name) =>
        matching.find(
          (voice) => voice.localService && voice.name.toLowerCase().includes(name.toLowerCase()),
        ) ?? matching.find((voice) => voice.name.toLowerCase().includes(name.toLowerCase())),
    )
    .find((voice): voice is SpeechSynthesisVoice => Boolean(voice));
  const local = matching.filter((voice) => voice.localService);
  const fallbackPool = local.length > 0 ? local : matching;
  const voice =
    byPreference ??
    (fallbackPool.length > 0 ? fallbackPool[profile.fallbackIndex % fallbackPool.length] : null);

  return {
    ...profile,
    voice,
    voiceName: voice?.name ?? `${profile.languageTag} system default`,
    local: voice?.localService ?? false,
  };
}

/**
 * Map a narrator-agent id (from `event-narrator.ts`) to a registry
 * Digital Human id. Keeps the narrator and the visual roster aligned
 * even when their naming differs slightly.
 */
export function narratorAgentToHumanId(agent: string): string {
  switch (agent) {
    case "risk_analyst":
      return "risk_intelligence";
    case "patrol_intelligence":
      return "patrol_commander";
    case "asset_intelligence":
      return "digital_twin";
    case "permit_authority":
      return "compliance_auditor";
    case "predictive_analytics":
      return "risk_intelligence";
    case "workflow_supervisor":
      return "aria";
    default:
      return agent;
  }
}
