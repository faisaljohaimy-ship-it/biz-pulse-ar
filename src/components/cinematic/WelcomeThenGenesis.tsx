/**
 * WelcomeThenGenesis — sequences the ARIA welcome video → Genesis intro.
 * Once per session (sessionStorage "nexios-welcome").
 */
import { useEffect, useState } from "react";
import { AriaWelcomeVideo } from "./AriaWelcomeVideo";
import { GenesisIntro } from "./GenesisIntro";

export function WelcomeThenGenesis() {
  const [decided, setDecided] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeDone, setWelcomeDone] = useState(false);

  useEffect(() => {
    let skip = false;
    try {
      if (window.sessionStorage.getItem("nexios-welcome") === "1") skip = true;
    } catch { /* ignore */ }
    setShowWelcome(!skip);
    if (skip) setWelcomeDone(true);
    setDecided(true);
  }, []);

  if (!decided) return null;
  return (
    <>
      {showWelcome && !welcomeDone && (
        <AriaWelcomeVideo onDone={() => setWelcomeDone(true)} />
      )}
      {welcomeDone && <GenesisIntro />}
    </>
  );
}

export default WelcomeThenGenesis;
