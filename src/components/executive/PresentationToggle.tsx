/**
 * PresentationToggle — turns the current dashboard into a room-readable
 * executive display (constitution art. 15). One button enters "presentation
 * mode": navigation chrome hides, the type scale grows (see html.nx-presenting
 * in styles.css), and — where the platform allows — the page requests native
 * fullscreen. A floating EXIT affordance and the Esc key both leave it.
 *
 * Graceful degradation: iOS Safari blocks element fullscreen, so there the
 * class-only mode still delivers the enlarged, chrome-free display. No new
 * dependency; state lives on the document root so any page can host the button.
 */
import { useCallback, useEffect, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

const ROOT_CLASS = "nx-presenting";

export function PresentationToggle({ ar = true }: { ar?: boolean }) {
  const [presenting, setPresenting] = useState(false);

  const enter = useCallback(() => {
    document.documentElement.classList.add(ROOT_CLASS);
    setPresenting(true);
    // Native fullscreen is a best-effort bonus; the class-only mode is the
    // real guarantee (iOS Safari rejects element fullscreen).
    const el = document.documentElement as HTMLElement & {
      requestFullscreen?: () => Promise<void>;
      webkitRequestFullscreen?: () => void;
    };
    try {
      if (el.requestFullscreen) void el.requestFullscreen().catch(() => {});
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    } catch {
      /* fullscreen denied — class-only presentation still applies */
    }
  }, []);

  const exit = useCallback(() => {
    document.documentElement.classList.remove(ROOT_CLASS);
    setPresenting(false);
    const doc = document as Document & {
      webkitExitFullscreen?: () => void;
      webkitFullscreenElement?: Element | null;
    };
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        void document.exitFullscreen().catch(() => {});
      } else if (doc.webkitFullscreenElement && doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      }
    } catch {
      /* already out of fullscreen */
    }
  }, []);

  // Keep local state in sync when the user leaves fullscreen via Esc or the
  // browser UI, so the class is cleared and the toggle label is correct.
  useEffect(() => {
    const onFsChange = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element | null };
      const inFs = Boolean(document.fullscreenElement || doc.webkitFullscreenElement);
      if (!inFs && document.documentElement.classList.contains(ROOT_CLASS)) {
        document.documentElement.classList.remove(ROOT_CLASS);
        setPresenting(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && document.documentElement.classList.contains(ROOT_CLASS)) exit();
    };
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange as EventListener);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange as EventListener);
      window.removeEventListener("keydown", onKey);
      // Never leave the root stuck in presentation mode on unmount.
      document.documentElement.classList.remove(ROOT_CLASS);
    };
  }, [exit]);

  if (presenting) {
    return (
      <button
        type="button"
        onClick={exit}
        aria-label={ar ? "إنهاء وضع العرض" : "Exit presentation mode"}
        className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] end-4 z-[120] inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/25 bg-black/70 px-4 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur"
      >
        <Minimize2 className="h-4 w-4" aria-hidden />
        {ar ? "إنهاء العرض" : "Exit"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={enter}
      aria-label={ar ? "وضع العرض التنفيذي" : "Presentation mode"}
      className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#3AE8FF]/45 bg-[#3AE8FF]/10 px-4 py-2 text-sm font-semibold text-[#8ff0ff] transition hover:bg-[#3AE8FF]/20"
    >
      <Maximize2 className="h-4 w-4" aria-hidden />
      {ar ? "وضع العرض" : "Present"}
    </button>
  );
}

export default PresentationToggle;
