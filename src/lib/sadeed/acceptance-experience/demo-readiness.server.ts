// Demo readiness — real capability check across engines, no fake OK.
import type { DemoReadiness } from "./types";
import { detectVoiceProvider } from "../live-voice/voice-provider.server";

export interface DemoReadinessInput {
  readonly hasHero?: boolean;
  readonly hasIdentity?: boolean;
  readonly hasConversation?: boolean;
  readonly hasMotion?: boolean;
}

export function assessDemoReadiness(input: DemoReadinessInput = {}): DemoReadiness {
  const reasons: string[] = [];
  const caps = detectVoiceProvider();
  if (!caps.stt) reasons.push("stt disabled");
  if (!caps.tts) reasons.push("tts disabled");
  if (input.hasHero === false) reasons.push("hero not mounted");
  if (input.hasIdentity === false) reasons.push("identity not loaded");
  if (input.hasConversation === false) reasons.push("conversation engine off");
  if (input.hasMotion === false) reasons.push("motion runtime off");
  const missing = reasons.length;
  const confidence: DemoReadiness["confidence"] =
    missing === 0 ? "high" : missing <= 1 ? "medium" : missing <= 3 ? "low" : "unknown";
  return { ok: missing === 0, reasons, confidence };
}
