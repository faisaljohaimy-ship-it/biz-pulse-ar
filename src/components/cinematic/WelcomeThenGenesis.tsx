/**
 * WelcomeThenGenesis — the SINGLE pre-system intro gate. Shows the ARIA
 * welcome video once per browser session, then unmounts and reveals the
 * app. Legacy Genesis / HeroZero / AriaCinematic intros are retired.
 */
import { useEffect, useState } from "react";
import { AriaWelcomeVideo } from "./AriaWelcomeVideo";

export function WelcomeThenGenesis() {
  const [decided, setDecided] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    // Read the guard, then IMMEDIATELY write it back before flipping state.
    // This makes React 19 Strict Mode's double-effect a no-op: the second
    // pass sees the key already set and never re-mounts the welcome video.
    let skip = false;
    try {
      const ss = window.sessionStorage;
      if (ss.getItem("nexios-welcome") === "1") {
        skip = true;
      } else {
        ss.setItem("nexios-welcome", "1");
      }
    } catch { /* private-mode / disabled storage → show once, then rely on state */ }
    setShowWelcome(!skip);
    setDecided(true);
  }, []);

  if (!decided) return null;
  if (!showWelcome) return null;
  return <AriaWelcomeVideo onDone={() => setShowWelcome(false)} />;
}


export default WelcomeThenGenesis;
