import { describe, expect, it } from "vitest";
import {
  ARIA_CONVERSATION_GREETING_AR,
  shouldContinueAfterAriaGreeting,
} from "./conversation-greeting";

describe("ARIA conversation greeting", () => {
  it("welcomes the user and asks how ARIA can help", () => {
    expect(ARIA_CONVERSATION_GREETING_AR).toContain("أنا آريا");
    expect(ARIA_CONVERSATION_GREETING_AR).toContain("كيف يمكنني مساعدتك");
  });

  it("opens the microphone only after a completed active greeting", () => {
    expect(
      shouldContinueAfterAriaGreeting({
        aborted: false,
        conversationModeActive: true,
      }),
    ).toBe(true);
    expect(
      shouldContinueAfterAriaGreeting({
        aborted: true,
        conversationModeActive: true,
      }),
    ).toBe(false);
    expect(
      shouldContinueAfterAriaGreeting({
        aborted: false,
        conversationModeActive: false,
      }),
    ).toBe(false);
  });
});
