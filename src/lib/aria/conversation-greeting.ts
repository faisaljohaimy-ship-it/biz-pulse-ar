/**
 * Dual Arabic pattern (constitution): `AR` is the clean display form,
 * `AR_TTS` is the fully diacritized form sent to the Layan voice so the
 * spoken greeting is pronounced precisely.
 */
export const ARIA_CONVERSATION_GREETING_AR = "مرحباً بك، أنا آريا. كيف يمكنني مساعدتك اليوم؟";
export const ARIA_CONVERSATION_GREETING_AR_TTS =
  "مَرْحَبًا بِكَ، أَنَا آرِيَا. كَيْفَ يُمْكِنُنِي مُسَاعَدَتُكَ الْيَوْمَ؟";

export function shouldContinueAfterAriaGreeting(input: {
  aborted: boolean;
  conversationModeActive: boolean;
}): boolean {
  return !input.aborted && input.conversationModeActive;
}
