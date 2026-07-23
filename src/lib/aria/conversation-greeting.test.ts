import { describe, expect, it } from "vitest";
import {
  FINN_CONVERSATION_GREETING_AR,
  shouldContinueAfterFinnGreeting,
} from "./conversation-greeting";

describe("FINN conversation greeting", () => {
  it("welcomes the user and asks how FINN can help", () => {
    expect(FINN_CONVERSATION_GREETING_AR).toContain("أنا فِن");
    expect(FINN_CONVERSATION_GREETING_AR).toContain("الأرقام حاضرة");
  });

  it("opens the microphone only after a completed active greeting", () => {
    expect(
      shouldContinueAfterFinnGreeting({
        aborted: false,
        conversationModeActive: true,
      }),
    ).toBe(true);
    expect(
      shouldContinueAfterFinnGreeting({
        aborted: true,
        conversationModeActive: true,
      }),
    ).toBe(false);
    expect(
      shouldContinueAfterFinnGreeting({
        aborted: false,
        conversationModeActive: false,
      }),
    ).toBe(false);
  });
});
