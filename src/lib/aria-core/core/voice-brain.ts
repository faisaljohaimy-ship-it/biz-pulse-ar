/**
 * VoiceBrain — Phase 11 bridge between the ARIA voice pipeline (Phase 1)
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
import { useAriaStore } from "../state/aria-store";
import type { AriaVoiceState } from "../types/aria";

type Unsub = () => void;

class VoiceBrain {
  private unsub: Unsub | null = null;
  private analyser: AnalyserNode | null = null;
  private ampRaf: number | null = null;
  private ctx: AudioContext | null = null;
  private lastVoice: AriaVoiceState = "idle";

  start(): Unsub {
    if (this.unsub) return this.unsub;
    this.unsub = useAriaStore.subscribe((s, prev) => {
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
    // The AriaBackdrop reads presence state directly from `ariaState`.
  }

  detachStream(): void {
    // no-op — nothing to detach.
  }

  private handleVoiceChange(next: AriaVoiceState): void {
    if (next === this.lastVoice) return;
    this.lastVoice = next;
    switch (next) {
      case "listening":
        avatarBrain.onListeningStart();
        break;
      case "processing":
        avatarBrain.onThinking(useAriaStore.getState().activeEnvelope);
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
