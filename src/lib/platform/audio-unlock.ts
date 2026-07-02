/**
 * Global AudioContext + gesture-unlock singleton.
 * iOS Safari requires a user gesture to start audio; we listen once
 * globally and mark the context "unlocked" so any subsystem (TTS,
 * ambient hum, chime, briefing) can play without prompting again.
 *
 * Additive: no existing code path is required to use this.
 */
type AC = AudioContext;

interface AudioWin extends Window {
  webkitAudioContext?: typeof AudioContext;
  __nx_ac?: AC | null;
  __nx_ac_unlocked?: boolean;
  __nx_ac_listeners?: (() => void)[];
}

function getWin(): AudioWin | null {
  return typeof window === "undefined" ? null : (window as AudioWin);
}

export function getSharedAudioContext(): AC | null {
  const w = getWin();
  if (!w) return null;
  if (w.__nx_ac) return w.__nx_ac;
  try {
    const Ctor = (window.AudioContext ?? w.webkitAudioContext) as typeof AudioContext | undefined;
    if (!Ctor) return null;
    const ac = new Ctor();
    w.__nx_ac = ac;
    return ac;
  } catch { return null; }
}

export function isAudioUnlocked(): boolean {
  const w = getWin();
  if (!w) return false;
  const ac = w.__nx_ac;
  return !!w.__nx_ac_unlocked && !!ac && ac.state === "running";
}

export async function tryUnlockAudio(): Promise<boolean> {
  const w = getWin();
  if (!w) return false;
  const ac = getSharedAudioContext();
  if (!ac) return false;
  try {
    if (ac.state === "suspended") await ac.resume();
    // Play a 1-sample silent buffer — reliably flips iOS state to running.
    const buf = ac.createBuffer(1, 1, 22050);
    const src = ac.createBufferSource();
    src.buffer = buf; src.connect(ac.destination); src.start(0);
    w.__nx_ac_unlocked = ac.state === "running";
    if (w.__nx_ac_unlocked) w.__nx_ac_listeners?.splice(0).forEach((fn) => { try { fn(); } catch { /* ignore */ } });
    return w.__nx_ac_unlocked;
  } catch { return false; }
}

export function onAudioUnlock(fn: () => void): () => void {
  const w = getWin();
  if (!w) return () => {};
  if (isAudioUnlocked()) { fn(); return () => {}; }
  w.__nx_ac_listeners = w.__nx_ac_listeners ?? [];
  w.__nx_ac_listeners.push(fn);
  return () => {
    if (!w.__nx_ac_listeners) return;
    const i = w.__nx_ac_listeners.indexOf(fn);
    if (i >= 0) w.__nx_ac_listeners.splice(i, 1);
  };
}

/**
 * Install one-time global gesture listeners. Safe to call repeatedly.
 * Call from a top-level provider effect on mount.
 */
export function installAudioGestureUnlock(): () => void {
  const w = getWin();
  if (!w) return () => {};
  if ((w as AudioWin & { __nx_ac_gesture_installed?: boolean }).__nx_ac_gesture_installed) {
    return () => {};
  }
  (w as AudioWin & { __nx_ac_gesture_installed?: boolean }).__nx_ac_gesture_installed = true;

  const handler = () => { void tryUnlockAudio(); };
  const opts: AddEventListenerOptions = { once: true, passive: true, capture: true };
  ["pointerdown", "touchstart", "keydown", "mousedown"].forEach((ev) =>
    w.addEventListener(ev, handler, opts),
  );
  return () => {
    ["pointerdown", "touchstart", "keydown", "mousedown"].forEach((ev) =>
      w.removeEventListener(ev, handler, opts),
    );
  };
}
