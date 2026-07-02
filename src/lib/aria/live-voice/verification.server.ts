// Verification — checks live-voice readiness. Unknown remains UNKNOWN.
import { detectVoiceProvider } from "./voice-provider.server";
import { getLiveVoiceSession } from "./voice-session.server";

export interface LiveVoiceVerification {
  readonly ok: boolean;
  readonly stt: boolean;
  readonly tts: boolean;
  readonly sessionActive: boolean;
  readonly issues: readonly string[];
  readonly confidence: "unknown" | "low" | "medium" | "high";
}

export function verifyLiveVoice(sessionId?: string): LiveVoiceVerification {
  const caps = detectVoiceProvider();
  const issues: string[] = [];
  if (!caps.stt) issues.push("stt disabled");
  if (!caps.tts) issues.push("tts disabled");
  let sessionActive = false;
  if (sessionId) {
    const s = getLiveVoiceSession(sessionId);
    sessionActive = !!s && !s.endedAt;
    if (!sessionActive) issues.push("session not active");
  }
  const confidence: LiveVoiceVerification["confidence"] =
    !caps.stt && !caps.tts ? "unknown" :
    !caps.stt || !caps.tts ? "low" :
    sessionActive ? "high" : "medium";
  return {
    ok: caps.stt && caps.tts && (!sessionId || sessionActive),
    stt: caps.stt,
    tts: caps.tts,
    sessionActive,
    issues,
    confidence,
  };
}
