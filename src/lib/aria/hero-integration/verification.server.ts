// Verification — checks hero readiness. UNKNOWN remains UNKNOWN.
import { getHero } from "./hero-state.server";
import { heroVoiceReadiness } from "./hero-voice-bridge.server";
import { HERO_ACTIONS } from "./hero-actions.server";

export interface HeroVerification {
  readonly ok: boolean;
  readonly instanceActive: boolean;
  readonly voice: { stt: boolean; tts: boolean; reason?: string };
  readonly buttonsWired: number;
  readonly buttonsExpected: number;
  readonly issues: readonly string[];
  readonly confidence: "unknown" | "low" | "medium" | "high";
}

export function verifyHero(instanceId?: string): HeroVerification {
  const issues: string[] = [];
  const voice = heroVoiceReadiness();
  const buttonsExpected = 6;
  const buttonsWired = Object.keys(HERO_ACTIONS).length;
  if (buttonsWired !== buttonsExpected) issues.push("button catalog mismatch");

  let instanceActive = false;
  if (instanceId) {
    const s = getHero(instanceId);
    instanceActive = !!s;
    if (!instanceActive) issues.push("hero instance not found");
  }

  if (!voice.stt || !voice.tts) issues.push("voice degraded");

  const confidence: HeroVerification["confidence"] =
    !voice.stt && !voice.tts ? "unknown" :
    !voice.stt || !voice.tts ? "low" :
    instanceActive ? "high" : "medium";

  return {
    ok: buttonsWired === buttonsExpected && (!instanceId || instanceActive),
    instanceActive,
    voice,
    buttonsWired,
    buttonsExpected,
    issues,
    confidence,
  };
}
