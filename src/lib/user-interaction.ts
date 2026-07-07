/**
 * Tracks whether the user has interacted with the document in this session.
 * Used to decide whether autoplay-with-sound is likely to succeed.
 */
const KEY = "nexios-user-interacted";

export function hasPriorInteraction(): boolean {
  try {
    return window.sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function markInteracted(): void {
  try {
    window.sessionStorage.setItem(KEY, "1");
  } catch {
    /* ignore */
  }
}

let installed = false;
export function installInteractionTracker(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const handler = () => {
    markInteracted();
    window.removeEventListener("pointerdown", handler);
    window.removeEventListener("keydown", handler);
    window.removeEventListener("touchstart", handler);
  };
  window.addEventListener("pointerdown", handler, { once: true, passive: true });
  window.addEventListener("keydown", handler, { once: true });
  window.addEventListener("touchstart", handler, { once: true, passive: true });
}
