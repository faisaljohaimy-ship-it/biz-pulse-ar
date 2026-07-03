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
    if (this.unsub) { this.unsub(); this.unsub = null; }
    this.detachStream();
  }

  /** Attach an audio stream (mic or TTS output) for real lip amplitudes. */
  attachStream(stream: MediaStream): void {
    if (typeof window === "undefined") return;
    this.detachStream();
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      const src = this.ctx.createMediaStreamSource(stream);
      const analyser = this.ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.6;
      src.connect(analyser);
      this.analyser = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!this.analyser) return;
        this.analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        avatarBrain.pushLipAmplitude(Math.min(1, rms * 3.2));
        this.ampRaf = window.requestAnimationFrame(tick);
      };
      this.ampRaf = window.requestAnimationFrame(tick);
    } catch {
      this.detachStream();
    }
  }

  detachStream(): void {
    if (this.ampRaf !== null && typeof window !== "undefined") {
      window.cancelAnimationFrame(this.ampRaf);
    }
    this.ampRaf = null;
    this.analyser = null;
    if (this.ctx) { this.ctx.close().catch(() => {}); this.ctx = null; }
  }

  private handleVoiceChange(next: AriaVoiceState): void {
    if (next === this.lastVoice) return;
    this.lastVoice = next;
    switch (next) {
      case "listening":  avatarBrain.onListeningStart(); break;
      case "transcribing":
      case "thinking":   avatarBrain.onThinking(useAriaStore.getState().activeEnvelope); break;
      case "speaking":   /* handled by orchestrator.markStreaming */ break;
      case "error":      avatarBrain.onError(); break;
      case "idle":
      default:
        lipSyncEngine.end();
        avatarBrain.onListeningEnd();
        break;
    }
  }
}

export const voiceBrain = new VoiceBrain();
