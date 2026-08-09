// Bridge to Phase 11.4 live-voice engine.
// Never fakes voice — asks live-voice for real capability, propagates UNKNOWN.
import { detectVoiceProvider } from "../live-voice/voice-provider.server";
import { setHeroAudio, updateHero, getHero } from "./hero-state.server";
import { emitHeroEvent } from "./hero-events.server";
import type { AudioState } from "../live-voice/types";

export interface HeroVoiceReadiness {
  readonly stt: boolean;
  readonly tts: boolean;
  readonly reason?: string;
}

export function heroVoiceReadiness(): HeroVoiceReadiness {
  const caps = detectVoiceProvider();
  return { stt: caps.stt, tts: caps.tts, reason: caps.reason };
}

export function heroBeginListening(instanceId: string): { ok: boolean; reason?: string } {
  const caps = detectVoiceProvider();
  if (!caps.stt) {
    setHeroAudio(instanceId, "error");
    emitHeroEvent(instanceId, "error", { where: "listening", reason: caps.reason });
    updateHero(instanceId, {
      lastError: { code: "voice_unavailable", message: caps.reason ?? "stt off", ts: Date.now() },
    });
    return { ok: false, reason: caps.reason ?? "stt unavailable" };
  }
  setHeroAudio(instanceId, "listening");
  emitHeroEvent(instanceId, "voice_result", { stage: "listening_started" });
  return { ok: true };
}

export function heroMirrorAudio(instanceId: string, next: AudioState): void {
  const cur = getHero(instanceId);
  if (!cur) return;
  setHeroAudio(instanceId, next);
}
