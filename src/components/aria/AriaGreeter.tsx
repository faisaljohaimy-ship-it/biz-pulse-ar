/**
 * AriaGreeter — director-demo voice greeting.
 *
 * Fires ONCE per session (sessionStorage flag `aria-demo-greeted`) on the
 * FIRST user tap anywhere. Uses the existing `useAriaSpeech` path
 * (ElevenLabs → browser ar-SA fallback) through the `AriaAudioBus`
 * arbiter, so chat replies interrupt it instantly and the mute toggle is
 * respected. Any TTS failure = silent skip; never surfaced to the user.
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

    // Skip if already greeted in this session.
    try {
      if (window.sessionStorage.getItem(SESSION_FLAG) === "1") return;
    } catch {
      /* sessionStorage unavailable — best-effort continue once */
    }

    let done = false;

    const onFirstGesture = () => {
      if (done) return;
      done = true;
      cleanup();

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
