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
    let skip = false;
    try {
      if (window.sessionStorage.getItem("nexios-welcome") === "1") skip = true;
    } catch { /* ignore */ }
    setShowWelcome(!skip);
    setDecided(true);
  }, []);

  if (!decided) return null;
  if (!showWelcome) return null;
  return <AriaWelcomeVideo onDone={() => setShowWelcome(false)} />;
}

export default WelcomeThenGenesis;
