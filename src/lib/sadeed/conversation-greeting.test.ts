import { describe, expect, it } from "vitest";
import {
  SADEED_CONVERSATION_GREETING_AR,
  shouldContinueAfterSadeedGreeting,
} from "./conversation-greeting";

describe("SADEED conversation greeting", () => {
  it("welcomes the user and asks how SADEED can help", () => {
    expect(SADEED_CONVERSATION_GREETING_AR).toContain("أنا سَدِيد");
    expect(SADEED_CONVERSATION_GREETING_AR).toContain("الأرقام حاضرة");
  });

  it("opens the microphone only after a completed active greeting", () => {
    expect(
      shouldContinueAfterSadeedGreeting({
        aborted: false,
        conversationModeActive: true,
      }),
    ).toBe(true);
    expect(
      shouldContinueAfterSadeedGreeting({
        aborted: true,
        conversationModeActive: true,
      }),
    ).toBe(false);
    expect(
      shouldContinueAfterSadeedGreeting({
        aborted: false,
        conversationModeActive: false,
      }),
    ).toBe(false);
  });
});
