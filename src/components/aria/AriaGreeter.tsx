/**
 * AriaGreeter — director-demo voice greeting.
 *
 * The SINGLE greeting trigger site-wide. Fires exactly ONCE per session on
 * the first user pointerdown. The one-shot flag lives at module scope in
 * `AriaAudioBus` (see `claimGreeting`) so it is immune to React remounts,
 * StrictMode double-invocation, and multiple listener registrations.
 *
 * On-demand replay lives on the hero chip («🔊 استمع للتعريف») and calls
 * `speak(..., 'panel-greeting')` directly, bypassing the flag but still
 * going through the audio bus.
 */
import { useEffect } from "react";
import { useAriaSpeech } from "@/hooks/useAriaSpeech";
import { AriaAudioBus } from "@/lib/aria/audio-bus";

const SESSION_FLAG = "aria-demo-greeted";

const GREETING_AR =
  "أَهْلًا بِك. أَنَا آرِيَا، الذَّكَاءُ التَّنْفِيذِيُّ لِمَنْصَةِ نِيكْسُوس — مَنْصَةٌ وَاحِدَةٌ تُوَحِّدُ الأَمْنَ الصِّنَاعِيَّ بِأَقْسَامِهِ: الصِّيَانَة، وَالمَشَارِيع، وَالبَطَاقَاتِ وَالتَّصَارِيح، وَالحَوَادِثِ الأَمْنِيَّة، عَبْرَ دَوَائِرِ المِنْطَقَةِ الغَرْبِيَّةِ وَتَبُوك. اسْأَلْنِي أَيَّ شَيْء — أَنَا فِي خِدْمَتِك.";

export function AriaGreeter() {
  const { speak } = useAriaSpeech();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Persisted-across-reload flag (best-effort).
    try {
      if (window.sessionStorage.getItem(SESSION_FLAG) === "1") {
        AriaAudioBus.forceReplayGreeting(); // sync module flag
        return;
      }
    } catch {
      /* sessionStorage unavailable — module flag still guards */
    }

    // If some other code already claimed the greeting this session, skip.
    if (AriaAudioBus.hasGreeted()) return;

    const onFirstGesture = () => {
      cleanup();
      // Atomic claim: only the FIRST caller wins.
      if (!AriaAudioBus.claimGreeting()) return;

      try {
        window.sessionStorage.setItem(SESSION_FLAG, "1");
      } catch {
        /* ignore */
      }

      AriaAudioBus.unlock();

      // Silent skip on any failure — never surface to the user.
      Promise.resolve()
        .then(() => speak(GREETING_AR, "panel-greeting"))
        .catch(() => {
          /* ignore */
        });
    };

    const cleanup = () => {
      window.removeEventListener("pointerdown", onFirstGesture, true);
      window.removeEventListener("touchstart", onFirstGesture, true);
      window.removeEventListener("keydown", onFirstGesture, true);
    };

    window.addEventListener("pointerdown", onFirstGesture, { capture: true, passive: true });
    window.addEventListener("touchstart", onFirstGesture, { capture: true, passive: true });
    window.addEventListener("keydown", onFirstGesture, true);

    return cleanup;
  }, [speak]);

  return null;
}

export default AriaGreeter;
