/**
 * WelcomeThenGenesis — the SINGLE pre-system intro gate. Shows the ARIA
 * welcome video once per browser session, then unmounts and reveals the
 * app. Legacy Genesis / HeroZero / AriaCinematic intros are retired.
 */
import { useEffect, useState } from "react";
import { AriaWelcomeVideo } from "./AriaWelcomeVideo";

const INTRO_SESSION_KEY = "nexios-welcome";
const INTRO_COMPLETE_VALUE = "complete:v4";
const INTRO_SHOWING_VALUE = "showing:v4";

function setIntroSessionValue(value: string) {
  try {
    window.sessionStorage.setItem(INTRO_SESSION_KEY, value);
  } catch {
    /* private-mode / disabled storage → rely on mounted state */
  }
}

export function WelcomeThenGenesis() {
  const [decided, setDecided] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    // Constitution: the guard is complete-only. Older value "1" and any
    // interrupted "showing" state must replay, because a previous shell bug
    // could set the key before the cinematic surface actually reached screen.
    let skip = false;
    try {
      const ss = window.sessionStorage;
      if (ss.getItem(INTRO_SESSION_KEY) === INTRO_COMPLETE_VALUE) {
        skip = true;
      } else {
        ss.setItem(INTRO_SESSION_KEY, INTRO_SHOWING_VALUE);
      }
    } catch {
      /* private-mode / disabled storage → show once, then rely on state */
    }
    setShowWelcome(!skip);
    setDecided(true);
  }, []);

  const completeWelcome = () => {
    setIntroSessionValue(INTRO_COMPLETE_VALUE);
    setShowWelcome(false);
  };

  if (!decided) return null;
  if (!showWelcome) return null;
  return <AriaWelcomeVideo onDone={completeWelcome} />;
}

export default WelcomeThenGenesis;
