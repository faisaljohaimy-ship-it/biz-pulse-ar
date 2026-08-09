/**
 * VoiceBrain — Phase 11 bridge between the SADEED voice pipeline (Phase 1)
 * and the Avatar Brain (Phase 10). Owns:
 *
 *   • Voice state → avatar state transitions (listening / thinking / speak)
 *   • Live lip-sync amplitude ingestion from a media stream
 *   • Voice enable/disable propagation
 *
 * No STT/TTS calls happen here — those stay in voiceManager and the
 * existing /api routes. This module is a coordinator, not a transport.
 */
import { avatarBrain } from "./avatar-brain";
import { lipSyncEngine } from "./lip-sync-engine";
import { useSadeedStore } from "../state/sadeed-store";
import type { SadeedVoiceState } from "../types/sadeed";

type Unsub = () => void;

class VoiceBrain {
  private unsub: Unsub | null = null;
  private analyser: AnalyserNode | null = null;
  private ampRaf: number | null = null;
  private ctx: AudioContext | null = null;
  private lastVoice: SadeedVoiceState = "idle";

  start(): Unsub {
    if (this.unsub) return this.unsub;
    this.unsub = useSadeedStore.subscribe((s, prev) => {
      if (s.voice !== prev.voice) this.handleVoiceChange(s.voice);
    });
    return () => this.stop();
  }

  stop(): void {
    if (this.unsub) {
      this.unsub();
      this.unsub = null;
    }
    this.detachStream();
  }

  /** Attach an audio stream (mic or TTS output) for real lip amplitudes. */
  attachStream(_stream: MediaStream): void {
    // AudioContext removed site-wide — lip-sync analyser disabled.
    // The SadeedBackdrop reads presence state directly from `sadeedState`.
  }

  detachStream(): void {
    // no-op — nothing to detach.
  }

  private handleVoiceChange(next: SadeedVoiceState): void {
    if (next === this.lastVoice) return;
    this.lastVoice = next;
    switch (next) {
      case "listening":
        avatarBrain.onListeningStart();
        break;
      case "processing":
        avatarBrain.onThinking(useSadeedStore.getState().activeEnvelope);
        break;
      case "speaking":
        /* handled by orchestrator.markStreaming */ break;
      case "unavailable":
        avatarBrain.onError();
        break;
      case "idle":
      default:
        lipSyncEngine.end();
        avatarBrain.onListeningEnd();
        break;
    }
  }
}

export const voiceBrain = new VoiceBrain();
