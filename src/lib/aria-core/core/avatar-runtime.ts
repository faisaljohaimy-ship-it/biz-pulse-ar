/**
 * AvatarRuntime — Phase 11 lifecycle controller for the Avatar Brain.
 *
 * Single entry point that boots every Phase 11 subsystem (voice brain,
 * realtime animation, live emotion, conversation/thinking/execution
 * animators, executive presence). Idempotent; safe to call from
 * <AriaProvider> mount and from HMR.
 *
 * Rules:
 *   • No LLM calls, no business logic, no UI code.
 *   • Purely wires singletons — never instantiates a second brain/renderer.
 *   • Reads only from the ARIA store; writes only through avatarBrain.
 */
import { avatarBrain } from "./avatar-brain";
import { avatarHealthMonitor } from "./avatar-health-monitor";
import { avatarPerformanceEngine } from "./avatar-performance-engine";
import { conversationAnimation } from "./conversation-animation";
import { executionAnimation } from "./execution-animation";
import { executivePresence } from "./executive-presence";
import { liveEmotion } from "./live-emotion";
import { realtimeAnimation } from "./realtime-animation";
import { thinkingAnimation } from "./thinking-animation";
import { voiceBrain } from "./voice-brain";

class AvatarRuntime {
  private started = false;
  private disposers: Array<() => void> = [];

  start(): void {
    if (this.started) return;
    this.started = true;
    avatarBrain.init();
    this.disposers.push(realtimeAnimation.start());
    this.disposers.push(liveEmotion.start());
    this.disposers.push(conversationAnimation.start());
    this.disposers.push(thinkingAnimation.start());
    this.disposers.push(executionAnimation.start());
    this.disposers.push(executivePresence.start());
    this.disposers.push(voiceBrain.start());
    this.disposers.push(avatarPerformanceEngine.start());
    this.disposers.push(avatarHealthMonitor.start());
  }

  stop(): void {
    if (!this.started) return;
    this.disposers.splice(0).forEach((d) => { try { d(); } catch { /* isolate */ } });
    voiceBrain.stop();
    avatarBrain.shutdown();
    this.started = false;
  }

  isRunning(): boolean { return this.started; }
}

export const avatarRuntime = new AvatarRuntime();
