// Executive Demo — ARIA Presenter (Phase 4.2)
// -----------------------------------------------------------------------------
// Big cinematic ARIA that fades in when Demo Mode starts. Reuses HologramFace
// for breathing / blink / lip-band / aura. Driven by useSpeechDirector for
// state + amplitude, and mounts the CameraDirector as a side-effect hook.

import * as React from "react";
import { useDemoMode } from "@/lib/demo/demo-controller";
import { useSpeechDirector } from "@/lib/demo/speech-director";
import { useCameraDirector } from "@/lib/demo/camera-director";
import { HologramFace } from "@/components/digital-humans/HologramFace";
import { useI18n } from "@/lib/i18n";

export function DemoAriaPresenter() {
  const demo = useDemoMode();
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { state, amp, currentText } = useSpeechDirector();
  useCameraDirector();

  // Responsive size.
  const [size, setSize] = React.useState<number>(280);
  React.useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      setSize(w < 640 ? 200 : w < 1024 ? 260 : 320);
    };
    compute();
    window.addEventListener("resize", compute, { passive: true });
    return () => window.removeEventListener("resize", compute);
  }, []);

  if (!demo.isActive) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-16 z-[85] flex flex-col items-center sm:top-20"
    >
      {/* ARIA — big, floating, breathing */}
      <div
        className="relative flex items-center justify-center animate-[fade-in_800ms_ease-out]"
        style={{ animation: "fade-in 800ms ease-out, aria-float 6s ease-in-out infinite" }}
      >
        <HologramFace state={state} amp={amp} size={size} ar={ar} />
      </div>

      {/* Speech caption bubble */}
      {currentText && (
        <div
          dir={ar ? "rtl" : "ltr"}
          className="mt-3 max-w-2xl rounded-2xl border border-[#3AE8FF]/40 bg-[#061A2E]/85 px-4 py-2.5 text-center text-sm text-white/90 shadow-[0_0_40px_rgba(58,232,255,0.25)] backdrop-blur-xl sm:text-base animate-[scale-in_400ms_ease-out]"
        >
          <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-[#3AE8FF] align-middle shadow-[0_0_8px_#3AE8FF]" />
          {currentText}
        </div>
      )}

      {/* Local keyframes for the gentle float — scoped, no globals */}
      <style>{`
        @keyframes aria-float {
          0%, 100% { transform: translateY(0) }
          50%      { transform: translateY(-8px) }
        }
      `}</style>
    </div>
  );
}
