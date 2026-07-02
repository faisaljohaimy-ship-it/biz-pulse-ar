import { useEffect, useState } from "react";

const KEY = "nx.exec.powerup.v1";

/**
 * Command Room power-up overlay. Plays once per session on first /exec entry.
 * Skippable via any tap/key. Additive — sits above content, non-blocking.
 */
export function CommandRoomPowerUp() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let played = false;
    try {
      played = sessionStorage.getItem(KEY) === "1";
    } catch {}
    if (played) return;
    setVisible(true);
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {}

    const dismiss = () => setVisible(false);
    const t = window.setTimeout(dismiss, 2200);
    window.addEventListener("pointerdown", dismiss, { once: true });
    window.addEventListener("keydown", dismiss, { once: true });
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("keydown", dismiss);
    };
  }, []);

  if (!visible) return null;
  return (
    <div className="nx-powerup" aria-hidden>
      <div className="nx-powerup-vignette" />
      <div className="nx-powerup-scan" />
    </div>
  );
}
