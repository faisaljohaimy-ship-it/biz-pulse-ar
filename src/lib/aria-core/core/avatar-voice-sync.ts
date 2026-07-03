/**
 * AvatarVoiceSync — bridges any speech source (real MediaStream via
 * VoiceBrain, or the browser SpeechSynthesis fallback used in Phase 1)
 * into the LipSyncEngine.
 *
 * Two modes:
 *   • attachStream(stream) — analyser-driven amplitudes (delegates to
 *     voiceBrain.attachStream).
 *   • startSynthetic(turnId) — when no audio stream exists (e.g. Web
 *     SpeechSynthesisUtterance whose output isn't exposed), we drive
 *     the lip channel with a bounded envelope so the mouth still moves
 *     in sync with the speaking state. Stops on `stop()`.
 *
 * Never runs unless the avatar is in the "speaking" state.
 */
import { avatarStateManager } from "./avatar-state-manager";
import { avatarScheduler } from "./avatar-scheduler";
import { lipSyncEngine } from "./lip-sync-engine";
import { voiceBrain } from "./voice-brain";
import { avatarBrain } from "./avatar-brain";

class AvatarVoiceSync {
  private synthDispose: (() => void) | null = null;
  private currentTurn: string | null = null;

  attachStream(stream: MediaStream): void {
    this.stopSynthetic();
    voiceBrain.attachStream(stream);
  }

  detachStream(): void { voiceBrain.detachStream(); }

  startSynthetic(turnId: string): void {
    this.stopSynthetic();
    this.currentTurn = turnId;
    lipSyncEngine.begin(turnId);
    let t0 = 0;
    this.synthDispose = avatarScheduler.subscribe((now) => {
      if (avatarStateManager.getState() !== "speaking") { this.stopSynthetic(); return; }
      if (t0 === 0) t0 = now;
      const dt = (now - t0) / 1000;
      // Layered envelope: syllable-rate carrier + slower amplitude drift.
      const carrier = 0.5 + 0.5 * Math.sin(dt * 12.5);
      const drift = 0.65 + 0.35 * Math.sin(dt * 1.9 + 0.7);
      avatarBrain.pushLipAmplitude(Math.min(1, carrier * drift * 0.85));
    }, 33);
  }

  stopSynthetic(): void {
    if (this.synthDispose) { this.synthDispose(); this.synthDispose = null; }
    if (this.currentTurn) { lipSyncEngine.end(this.currentTurn); this.currentTurn = null; }
    else lipSyncEngine.end();
  }

  stop(): void { this.stopSynthetic(); this.detachStream(); }
}

export const avatarVoiceSync = new AvatarVoiceSync();
