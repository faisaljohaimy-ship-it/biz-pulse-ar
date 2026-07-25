/**
 * NxButton · نظام الأزرار — spec: docs/components/01-buttons.md
 *
 * One grammar for every action. Closed variant set; loading locks width and
 * sets aria-busy; Executive Action enforces the single-gold law by existing
 * as exactly one variant. Voice/FINN buttons are specialized siblings below.
 */
import * as React from "react";
import { Loader2, Mic } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const nxButtonVariants = cva(
  // base: instrument physics — near-solid, squarer than cards, no scale on hover
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-nx-12 font-medium cursor-pointer select-none transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-[var(--nx-anim-fast)] ease-[var(--nx-ease-out)] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nx-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-nx-obsidian disabled:pointer-events-none disabled:opacity-[var(--nx-opacity-38)] aria-busy:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-nx-cyan text-nx-obsidian hover:brightness-110",
        secondary:
          "bg-nx-card text-nx-pearl border border-white/14 hover:bg-nx-card/80 hover:border-white/25",
        ghost: "bg-transparent text-nx-pearl/72 hover:text-nx-pearl hover:bg-white/6",
        glass: "nx-glass-e1 text-nx-pearl hover:border-white/25",
        outline: "bg-transparent border border-nx-cyan/60 text-nx-cyan hover:bg-nx-cyan/10",
        danger: "bg-nx-critical text-nx-obsidian hover:brightness-110",
        warning: "bg-transparent border border-nx-warning text-nx-warning hover:bg-nx-warning/10",
        success: "bg-nx-success text-nx-obsidian hover:brightness-110",
        runtime:
          "bg-nx-card text-nx-pearl border border-nx-layer-runtime/24 hover:border-nx-layer-runtime/50",
        executive:
          "bg-nx-gold text-nx-obsidian shadow-[var(--nx-glow-authority)] hover:brightness-105",
      },
      size: {
        sm: "h-8 px-3 text-xs rounded-nx-8",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        xl: "h-14 px-8 text-base",
      },
      icon: {
        true: "px-0 aspect-square",
        false: "",
      },
    },
    defaultVariants: { variant: "secondary", size: "md", icon: false },
  },
);

export interface NxButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof nxButtonVariants> {
  loading?: boolean;
}

export const NxButton = React.forwardRef<HTMLButtonElement, NxButtonProps>(
  ({ className, variant, size, icon, loading = false, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(nxButtonVariants({ variant, size, icon }), className)}
      disabled={disabled}
      aria-busy={loading || undefined}
      data-variant={variant ?? "secondary"}
      {...props}
    >
      {loading ? <Loader2 aria-hidden className="size-4 nx-anim-spin" /> : null}
      <span className={cn(loading && "opacity-[var(--nx-opacity-38)]")}>{children}</span>
    </button>
  ),
);
NxButton.displayName = "NxButton";

/** Voice states per docs/components/01 + motion doc 05. */
export type NxVoiceState = "idle" | "listening" | "recording";

export interface NxVoiceButtonProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> {
  state?: NxVoiceState;
}

/** NxVoiceButton · زر الصوت — push-to-talk with the licensed breathing ring. */
export const NxVoiceButton = React.forwardRef<HTMLButtonElement, NxVoiceButtonProps>(
  ({ className, state = "idle", ...props }, ref) => (
    <button
      ref={ref}
      aria-pressed={state !== "idle"}
      aria-label={state === "idle" ? "تحدث إلى FINN" : state === "listening" ? "يستمع" : "يسجل"}
      data-voice-state={state}
      className={cn(
        "relative inline-flex size-12 items-center justify-center rounded-full nx-glass-e1 text-nx-pearl cursor-pointer transition-[border-color,box-shadow] duration-[var(--nx-anim-micro)] ease-[var(--nx-ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nx-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-nx-obsidian",
        state !== "idle" && "border-nx-layer-agent/60 shadow-[var(--nx-glow-agent)]",
        className,
      )}
      {...props}
    >
      {state !== "idle" ? (
        <span
          aria-hidden
          className="absolute inset-0 rounded-full border border-nx-layer-agent/40 nx-anim-breathe"
        />
      ) : null}
      {state === "recording" ? (
        <span aria-hidden className="size-3 rounded-nx-8 bg-nx-critical" />
      ) : (
        <Mic aria-hidden className="size-5" />
      )}
    </button>
  ),
);
NxVoiceButton.displayName = "NxVoiceButton";

export { nxButtonVariants };
