import { describe, expect, it } from "vitest";
import { shouldSpeakAriaReply } from "./reply-modality";

describe("ARIA reply modality", () => {
  it("keeps keyboard questions text-only", () => {
    expect(shouldSpeakAriaReply({ conversationMode: true, fromVoice: false })).toBe(false);
  });

  it("keeps microphone input silent outside Conversation Mode", () => {
    expect(shouldSpeakAriaReply({ conversationMode: false, fromVoice: true })).toBe(false);
  });

  it("speaks replies to voice turns inside Conversation Mode", () => {
    expect(shouldSpeakAriaReply({ conversationMode: true, fromVoice: true })).toBe(true);
  });
});
