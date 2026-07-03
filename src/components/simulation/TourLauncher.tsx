// Nexios Guided Tour — launcher pill (bottom-left) + language picker.
import * as React from "react";
import { useTour } from "@/lib/simulation/tour/tour-controller";
import { Sparkles, X } from "lucide-react";

export function TourLauncher() {
  const t = useTour();
  const [open, setOpen] = React.useState(false);
  const active = t.state !== "idle" && t.state !== "ended";
  if (active) return null;

  const startWith = (lang: "ar" | "en") => {
    setOpen(false);
    t.start(lang);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-[65] pointer-events-auto inline-flex items-center gap-2 rounded-full border border-primary/40 bg-background/85 px-3.5 py-2 text-xs font-semibold text-foreground shadow-[0_6px_24px_-6px_hsl(var(--primary)/0.5)] backdrop-blur-xl transition-transform hover:scale-105 hover:border-primary/70"
        aria-label="Start guided tour"
      >
        <Sparkles className="h-4 w-4 text-primary" />
        <span>🎬 جولة تعريفية · Guided Tour</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-background/70 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="pointer-events-auto w-[90%] max-w-sm rounded-2xl border border-primary/30 bg-background p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  اختر لغة الجولة · Choose tour language
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  ستقدم أريا شرحاً تنفيذياً لكل وحدة. ARIA will narrate every module.
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => startWith("ar")}
                className="rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-primary/20"
              >
                🇸🇦 العربية
              </button>
              <button
                onClick={() => startWith("en")}
                className="rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-primary/20"
              >
                🌐 English
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
