// Nexios Guided Tour — bottom overlay bar with controls.
import { useTour } from "@/lib/simulation/tour/tour-controller";
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, X, Languages } from "lucide-react";

export function TourOverlay() {
  const t = useTour();
  const active = t.state !== "idle";
  if (!active) return null;

  const step = t.step;
  if (!step) return null;

  const total = t.steps.length;
  const progress = ((t.stepIndex + 1) / total) * 100;
  const isPaused = t.state === "paused";
  const isRTL = t.lang === "ar";

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[70] pointer-events-none"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="mx-auto w-full max-w-4xl px-3 pb-4">
        <div className="pointer-events-auto rounded-2xl border border-primary/25 bg-background/85 backdrop-blur-xl shadow-[0_8px_40px_-8px_hsl(var(--primary)/0.35)]">
          {/* progress */}
          <div className="h-1 w-full overflow-hidden rounded-t-2xl bg-primary/10">
            <div
              className="h-full bg-primary transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {isRTL ? `الخطوة ${t.stepIndex + 1} / ${total}` : `Step ${t.stepIndex + 1} / ${total}`}
              </div>
              <div className="mt-0.5 truncate text-sm font-semibold text-foreground">
                {isRTL ? step.titleAr : step.titleEn}
              </div>
              <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {isRTL ? step.titleEn : step.titleAr}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <IconBtn label={isRTL ? "السابق" : "Previous"} onClick={t.prev}>
                <SkipBack className="h-4 w-4" />
              </IconBtn>
              {isPaused ? (
                <IconBtn label={isRTL ? "استئناف" : "Resume"} onClick={t.resume} primary>
                  <Play className="h-4 w-4" />
                </IconBtn>
              ) : (
                <IconBtn label={isRTL ? "إيقاف مؤقت" : "Pause"} onClick={t.pause} primary>
                  <Pause className="h-4 w-4" />
                </IconBtn>
              )}
              <IconBtn label={isRTL ? "التالي" : "Next"} onClick={t.next}>
                <SkipForward className="h-4 w-4" />
              </IconBtn>
              <div className="mx-1 h-6 w-px bg-border" />
              <IconBtn
                label={t.muted ? (isRTL ? "تشغيل الصوت" : "Unmute") : (isRTL ? "كتم الصوت" : "Mute")}
                onClick={t.toggleMute}
              >
                {t.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </IconBtn>
              <IconBtn
                label={isRTL ? "English" : "العربية"}
                onClick={() => t.setLang(isRTL ? "en" : "ar")}
              >
                <span className="flex items-center gap-1 text-[11px] font-semibold">
                  <Languages className="h-3.5 w-3.5" />
                  {isRTL ? "EN" : "ع"}
                </span>
              </IconBtn>
              <IconBtn label={isRTL ? "إنهاء" : "Exit"} onClick={t.exit} danger>
                <X className="h-4 w-4" />
              </IconBtn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IconBtn({
  children, onClick, label, primary, danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  primary?: boolean;
  danger?: boolean;
}) {
  const cls = primary
    ? "bg-primary text-primary-foreground hover:bg-primary/90"
    : danger
    ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
    : "bg-muted/50 text-foreground hover:bg-muted";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 transition-colors ${cls}`}
    >
      {children}
    </button>
  );
}
