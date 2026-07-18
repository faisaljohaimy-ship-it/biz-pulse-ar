import { afterEach, describe, expect, it, vi } from "vitest";
import { AriaAudioBus } from "./audio-bus";

describe("ARIA conversation audio ownership", () => {
  afterEach(() => AriaAudioBus.stopAll());

  it("allows the mobile conversation greeting to own the channel", () => {
    AriaAudioBus.unlock();
    expect(AriaAudioBus.acquire("conversation-greeting", () => undefined)).toBe(
      true,
    );
    expect(AriaAudioBus.currentSource()).toBe("conversation-greeting");
    AriaAudioBus.release("conversation-greeting");
    expect(AriaAudioBus.currentSource()).toBeNull();
  });

  it("lets a reply preempt the greeting without overlapping audio", () => {
    const stopGreeting = vi.fn();
    AriaAudioBus.unlock();
    AriaAudioBus.acquire("conversation-greeting", stopGreeting);
    expect(AriaAudioBus.acquire("chat-tts", () => undefined)).toBe(true);
    expect(stopGreeting).toHaveBeenCalledOnce();
    expect(AriaAudioBus.currentSource()).toBe("chat-tts");
  });
});
