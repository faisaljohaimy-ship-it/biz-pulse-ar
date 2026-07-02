/**
 * PlatformCompatibility — mount once at the root. Additive.
 * Installs: global gesture-based audio unlock + keyboard viewport binding.
 */
import { useEffect } from "react";
import { installAudioGestureUnlock } from "@/lib/platform/audio-unlock";
import { installKeyboardViewportBinding } from "@/lib/platform/keyboard-viewport";

export function PlatformCompatibility() {
  useEffect(() => {
    const a = installAudioGestureUnlock();
    const k = installKeyboardViewportBinding();
    return () => { a(); k(); };
  }, []);
  return null;
}
