// Executive Demo — Hero launcher button
// Phase 4.1 · Executive Demo Mode Foundation

import * as React from "react";
import { Clapperboard } from "lucide-react";
import { useDemoMode } from "@/lib/demo/demo-controller";
import { useI18n } from "@/lib/i18n";

export function DemoModeLauncher({ className = "" }: { className?: string }) {
  const demo = useDemoMode();
  const { locale } = useI18n();
  const ar = locale === "ar";

  const label = ar ? "العرض التنفيذي" : "Executive Demo";
  const sub   = ar ? "بث تنفيذي حي 12 ساعة" : "12-hour synchronized broadcast";

  return (
    <button
      type="button"
      onClick={() => (demo.isActive ? demo.exit() : demo.start())}
      aria-pressed={demo.isActive}
      className={`inline-flex items-center gap-2 rounded-full border border-[#3AE8FF]/60 bg-[#3AE8FF]/15 px-4 py-2 text-xs font-semibold text-white shadow-[0_0_24px_rgba(58,232,255,0.4)] transition hover:-translate-y-0.5 hover:bg-[#3AE8FF]/25 sm:text-sm ${className}`}
      title={sub}
    >
      <Clapperboard className="h-4 w-4" />
      <span>{demo.isActive ? (ar ? "إنهاء العرض" : "End Demo") : label}</span>
    </button>
  );
}
