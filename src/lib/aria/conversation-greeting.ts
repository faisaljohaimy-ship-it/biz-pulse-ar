export const ARIA_CONVERSATION_GREETING_AR = "مرحباً بك، أنا آريا. كيف يمكنني مساعدتك اليوم؟";

export function shouldContinueAfterAriaGreeting(input: {
  aborted: boolean;
  conversationModeActive: boolean;
}): boolean {
  return !input.aborted && input.conversationModeActive;
}
