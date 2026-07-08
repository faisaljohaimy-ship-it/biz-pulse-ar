// Executive Demo — Global HUD
// -----------------------------------------------------------------------------
// Phase 4.1 · Executive Demo Mode Foundation
//
// Floating global controller UI. Renders only when demo is active. Reuses the
// existing HUD palette (cyan #00D4FF / #3AE8FF, dark bg) and semantic tokens.

import * as React from "react";
import { Play, Pause, SkipBack, SkipForward, RotateCcw, X, Radio } from "lucide-react";
import { useDemoMode } from "@/lib/demo/demo-controller";
import { useI18n } from "@/lib/i18n";

export function DemoModeHUD() {
  const demo = useDemoMode();
  const { locale } = useI18n();
  const ar = locale === "ar";

  if (!demo.isActive) return null;

  const step = demo.step;
  const title = step ? (ar ? step.title_ar : step.title_en) : "";
  const message = step ? (ar ? step.executiveMessage_ar : step.executiveMessage_en) : "";
  const narration = step ? (ar ? step.ariaNarration_ar : step.ariaNarration_en) : "";

  const progressPct =
    demo.totalSteps > 0 ? Math.round(((demo.stepIndex + 1) / demo.totalSteps) * 100) : 0;

  const t = {
    demo: ar ? "الوضع التنفيذي" : "Executive Demo",
    step: ar ? "الخطوة" : "Step",
    of: ar ? "من" : "of",
    play: ar ? "تشغيل" : "Play",
    pause: ar ? "إيقاف مؤقت" : "Pause",
    resume: ar ? "استئناف" : "Resume",
    prev: ar ? "السابقة" : "Previous",
    next: ar ? "التالية" : "Next",
    replay: ar ? "إعادة" : "Replay",
    exit: ar ? "خروج" : "Exit",
    live: ar ? "بث تنفيذي حي" : "Live executive broadcast",
    aria: ar ? "سرد أريا" : "ARIA narration",
    ended: ar ? "انتهى العرض" : "Demo ended",
    speed: ar ? "السرعة" : "Speed",
  };

  const speedOptions: Array<{ label: string; ms: number }> = [
    { label: "0.75×", ms: 8500 },
    { label: "1×", ms: 6500 },
    { label: "1.5×", ms: 4300 },
    { label: "2×", ms: 3200 },
  ];
  const currentSpeed = speedOptions.reduce(
    (best, o) =>
      Math.abs(o.ms - demo.stepDurationMs) < Math.abs(best.ms - demo.stepDurationMs) ? o : best,
    speedOptions[0]!,
  );

  return (
    <div
      role="region"
      aria-label={t.demo}
      dir={ar ? "rtl" : "ltr"}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[95] flex justify-center px-2 pb-2 sm:px-4 sm:pb-4"
    >
      <div className="pointer-events-auto w-full max-w-4xl rounded-2xl border border-[#3AE8FF]/40 bg-[#061A2E]/90 p-3 shadow-[0_0_60px_rgba(0,212,255,0.35)] backdrop-blur-xl sm:p-4">
        {/* Header row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3AE8FF]/60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#3AE8FF]" />
            </span>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.28em] text-[#3AE8FF]/80">
                {t.demo}
              </div>
              <div className="truncate text-sm font-semibold text-white">
                {step ? `${step.timestamp} · ${title}` : t.live}
              </div>
            </div>
          </div>
          <div className="hidden shrink-0 items-center gap-2 text-[11px] text-white/60 sm:flex">
            <Radio className="h-3.5 w-3.5 text-[#3AE8FF]" />
            <span>
              {t.step} {Math.max(1, demo.stepIndex + 1)} {t.of} {demo.totalSteps}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-[#00D4FF] to-[#3AE8FF] transition-[width] duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Executive message + narration */}
        {step && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <p className="text-sm leading-relaxed text-white/85">{message}</p>
            <p className="text-xs leading-relaxed text-[#3AE8FF]/80">
              <span className="mr-1 font-semibold uppercase tracking-[0.2em] text-[#3AE8FF]/60">
                {t.aria}:
              </span>
              {narration}
            </p>
          </div>
        )}

        {demo.status === "ended" && (
          <div className="mt-3 rounded-lg border border-[#3AE8FF]/30 bg-[#3AE8FF]/10 px-3 py-2 text-center text-xs text-white/85">
            {t.ended}
          </div>
        )}

        {/* Controls */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-between">
          <div className="flex items-center gap-1.5">
            <HudButton onClick={demo.prev} label={t.prev} disabled={demo.stepIndex <= 0}>
              <SkipBack className="h-4 w-4" />
            </HudButton>

            {demo.status === "playing" ? (
              <HudButton onClick={demo.pause} label={t.pause} primary>
                <Pause className="h-4 w-4" />
              </HudButton>
            ) : demo.status === "ended" ? (
              <HudButton onClick={demo.replay} label={t.replay} primary>
                <RotateCcw className="h-4 w-4" />
              </HudButton>
            ) : (
              <HudButton onClick={demo.resume} label={t.resume} primary>
                <Play className="h-4 w-4" />
              </HudButton>
            )}

            <HudButton
              onClick={demo.next}
              label={t.next}
              disabled={demo.stepIndex >= demo.totalSteps - 1}
            >
              <SkipForward className="h-4 w-4" />
            </HudButton>

            <HudButton onClick={demo.replay} label={t.replay}>
              <RotateCcw className="h-4 w-4" />
            </HudButton>
          </div>

          <HudButton onClick={demo.exit} label={t.exit} danger>
            <X className="h-4 w-4" />
            <span className="hidden sm:inline">{t.exit}</span>
          </HudButton>
        </div>

        {/* Speed selector */}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 text-[10px]">
          <span className="uppercase tracking-[0.24em] text-white/50">{t.speed}</span>
          {speedOptions.map((o) => {
            const active = o.ms === currentSpeed.ms;
            return (
              <button
                key={o.label}
                type="button"
                onClick={() => demo.setStepDurationMs(o.ms)}
                className={`rounded-full border px-2 py-0.5 font-semibold transition ${
                  active
                    ? "border-[#3AE8FF]/70 bg-[#3AE8FF]/15 text-white shadow-[0_0_14px_rgba(58,232,255,0.35)]"
                    : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function HudButton({
  children,
  onClick,
  label,
  primary,
  danger,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  primary?: boolean;
  danger?: boolean;
  disabled?: boolean;
}) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40";
  const style = primary
    ? "border border-[#3AE8FF]/60 bg-[#3AE8FF]/15 text-white shadow-[0_0_18px_rgba(58,232,255,0.4)] hover:bg-[#3AE8FF]/25"
    : danger
      ? "border border-red-400/40 bg-red-500/10 text-red-100 hover:bg-red-500/20"
      : "border border-white/15 bg-white/5 text-white/85 hover:bg-white/10";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      disabled={disabled}
      className={`${base} ${style}`}
    >
      {children}
    </button>
  );
}
