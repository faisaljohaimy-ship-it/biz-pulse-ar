import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./voice-timeline", () => ({ VoiceTimeline: { push: vi.fn() } }));
vi.mock("@/lib/sadeed-core/state/voice-mute", () => ({
  isSadeedVoiceMuted: () => false,
  subscribeSadeedVoiceMute: () => () => {},
}));

import { SadeedAudioBus } from "./audio-bus";

beforeEach(() => {
  SadeedAudioBus.unlock();
});

afterEach(() => {
  SadeedAudioBus.stopAll();
});

describe("SADEED audio bus synchronous stop callbacks", () => {
  it("emits exactly one stopped/end when a preempted owner releases itself", () => {
    const events: string[] = [];
    const unsubscribe = SadeedAudioBus.subscribe(({ kind, source }) => {
      events.push(`${kind}:${source}`);
    });
    SadeedAudioBus.unlock();
    expect(SadeedAudioBus.acquire("agent-tts", () => SadeedAudioBus.release("agent-tts"))).toBe(
      true,
    );
    SadeedAudioBus.notifyPlaying("agent-tts", {} as HTMLMediaElement);
    expect(SadeedAudioBus.acquire("chat-tts", () => {})).toBe(true);
    expect(SadeedAudioBus.currentSource()).toBe("chat-tts");
    expect(events).toEqual([
      "start:agent-tts",
      "playing:agent-tts",
      "stopped:agent-tts",
      "end:agent-tts",
      "start:chat-tts",
    ]);
    unsubscribe();
  });

  it("does not double-fire end when stopAll invokes a releasing stop callback", () => {
    const events: string[] = [];
    const unsubscribe = SadeedAudioBus.subscribe(({ kind, source }) => {
      events.push(`${kind}:${source}`);
    });
    expect(SadeedAudioBus.acquire("agent-tts", () => SadeedAudioBus.release("agent-tts"))).toBe(
      true,
    );
    SadeedAudioBus.stopAll();
    expect(SadeedAudioBus.currentSource()).toBeNull();
    expect(events).toEqual(["start:agent-tts", "end:agent-tts"]);
    unsubscribe();
  });

  it("rejects a reentrant acquire during stop instead of losing the next owner", () => {
    let nestedResult: boolean | null = null;
    expect(
      SadeedAudioBus.acquire("agent-tts", () => {
        nestedResult = SadeedAudioBus.acquire("chat-tts", () => {});
      }),
    ).toBe(true);
    expect(SadeedAudioBus.acquire("chat-tts", () => {})).toBe(true);
    expect(nestedResult).toBe(false);
    expect(SadeedAudioBus.currentSource()).toBe("chat-tts");
  });

  it("does not grant audio playback after a start observer immediately stops it", () => {
    const stop = vi.fn();
    const unsubscribe = SadeedAudioBus.subscribe(({ kind, source }) => {
      if (kind === "start" && source === "agent-tts") SadeedAudioBus.stopAll();
    });
    try {
      // Before the fix acquire() returned true despite no remaining owner.
      expect(SadeedAudioBus.acquire("agent-tts", stop)).toBe(false);
      expect(stop).toHaveBeenCalledTimes(1);
      expect(SadeedAudioBus.currentSource()).toBeNull();
    } finally {
      unsubscribe();
    }
  });

  it("rejects a stale start grant when a listener preempts it with a stronger voice", () => {
    const stop = vi.fn();
    let nextGranted = false;
    const unsubscribe = SadeedAudioBus.subscribe(({ kind, source }) => {
      if (kind === "start" && source === "agent-tts") {
        nextGranted = SadeedAudioBus.acquire("chat-tts", () => {});
      }
    });
    try {
      expect(SadeedAudioBus.acquire("agent-tts", stop)).toBe(false);
      expect(nextGranted).toBe(true);
      expect(stop).toHaveBeenCalledTimes(1);
      expect(SadeedAudioBus.currentSource()).toBe("chat-tts");
    } finally {
      unsubscribe();
    }
  });

  it("retains an owner acquired by a normal release end listener", () => {
    const unsubscribe = SadeedAudioBus.subscribe(({ kind, source }) => {
      if (kind === "end" && source === "agent-tts") {
        SadeedAudioBus.acquire("chat-tts", () => {});
      }
    });
    expect(SadeedAudioBus.acquire("agent-tts", () => {})).toBe(true);
    SadeedAudioBus.release("agent-tts");
    expect(SadeedAudioBus.currentSource()).toBe("chat-tts");
    unsubscribe();
  });
});
