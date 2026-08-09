/**
 * Dual Arabic pattern (constitution): `AR` is the clean display form,
 * `AR_TTS` is the fully diacritized form sent to the Layan voice so the
 * spoken greeting is pronounced precisely.
 */
export const FINN_CONVERSATION_GREETING_AR =
  "أهلاً بك، أنا سَدِيد — شبكة الذكاء العصبي السريعة. الأرقام حاضرة، والقرار ينتظر إشارتك.";
export const FINN_CONVERSATION_GREETING_AR_TTS =
  "أَهْلًا بِكَ، أَنَا سَدِيدٌ — شَبَكَةُ الذَّكَاءِ الْعَصَبِيِّ السَّرِيعَةِ. الْأَرْقَامُ حَاضِرَةٌ، وَالْقَرَارُ يَنْتَظِرُ إِشَارَتَكَ.";

export function shouldContinueAfterFinnGreeting(input: {
  aborted: boolean;
  conversationModeActive: boolean;
}): boolean {
  return !input.aborted && input.conversationModeActive;
}
