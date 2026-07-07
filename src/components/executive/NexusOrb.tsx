/**
 * NexusOrb — Command Node
 *
 * A cinematic HUD-style circular trigger that replaces the traditional
 * hamburger icon in the top-end of the NEXUS AI OS header. Idle state shows
 * a 2×3 dot matrix (a smarter "grid of windows" metaphor) inside a glass
 * disc wrapped in a breathing halo, with a live status pip. On open it
 * morphs to a compass/close cross and swaps the halo hue. Pure presentation
 * — behavior stays with the parent (Sheet/Drawer controller).
 */
import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

type Props = {
  isOpen: boolean;
  onClick: () => void;
  controls?: string;
  className?: string;
};

export const NexusOrb = forwardRef<HTMLButtonElement, Props>(function NexusOrb(
  { isOpen, onClick, controls, className },
  ref,
) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const label = isOpen
    ? ar
      ? "إغلاق لوحة النوافذ"
      : "Close command panel"
    : ar
      ? "افتح لوحة النوافذ · مصفوفة الوحدات"
      : "Open command panel · module matrix";
  const tooltip = ar ? "لوحة النوافذ" : "Command Panel";

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-expanded={isOpen}
      aria-controls={controls}
      title={tooltip}
      data-open={isOpen ? "true" : "false"}
      className={cn(
        "nexus-orb group relative inline-flex h-11 w-11 shrink-0 items-center justify-center",
        "rounded-full outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "md:h-12 md:w-12",
        className,
      )}
    >
      {/* Breathing halo */}
      <span
        aria-hidden
        className="nexus-orb-halo pointer-events-none absolute inset-[-6px] rounded-full"
      />
      {/* Shimmer sweep ring */}
      <span
        aria-hidden
        className="nexus-orb-shimmer pointer-events-none absolute inset-0 overflow-hidden rounded-full"
      />
      {/* Glass disc */}
      <span
        aria-hidden
        className={cn(
          "nexus-orb-disc absolute inset-0 rounded-full border backdrop-blur-md",
          "border-primary/30 bg-card/40",
          "transition-colors duration-300",
          "group-hover:border-primary/60",
          "group-data-[open=true]:border-secondary/60",
        )}
      />
      {/* Icon: 2×3 grid dots that morph to an ✕ when open */}
      <span
        aria-hidden
        className={cn(
          "nexus-orb-icon relative grid h-5 w-4 grid-cols-2 grid-rows-3 gap-[3px]",
          "transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          "group-hover:rotate-45",
          "group-data-[open=true]:rotate-[135deg]",
        )}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "nexus-orb-dot h-[3px] w-[3px] self-center justify-self-center rounded-full",
              "bg-primary shadow-[0_0_6px_var(--primary-glow,var(--primary))]",
              "transition-all duration-300",
              "group-data-[open=true]:bg-secondary",
            )}
          />
        ))}
      </span>
      {/* Live status pip (top-end) */}
      <span
        aria-hidden
        className="nexus-orb-pip absolute end-[2px] top-[2px] h-[6px] w-[6px] rounded-full bg-success"
      />
    </button>
  );
});
