/**
 * NxEventTicker · شريط الأحداث — spec: docs/motion/04 §Ticker (content flows
 * to the LEFT: translateX 0→−50% over a duplicated track) + docs/design/07
 * (triple-coded event kinds).
 *
 * Motion licenses honored: linear loop at token speed (--nx-loop-ticker,
 * 24px/s), pauses on hover/focus, `data-nx-loop` for the global
 * reduced-motion pause hook. A critical item revokes the loop license
 * entirely — the ticker drops to a static emphasis list (an alarm is read,
 * never scrolled past). Reduced motion renders the same static list.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export type NxEventKind = "decision" | "alert" | "approval" | "execution" | "audit";

export const EVENT_KIND_LABEL: Record<NxEventKind, string> = {
  decision: "قرار",
  alert: "تنبيه",
  approval: "اعتماد",
  execution: "تنفيذ",
  audit: "تدقيق",
};

const KIND_ACCENT: Record<NxEventKind, string> = {
  decision: "border-nx-layer-analytics/40 text-nx-layer-analytics",
  alert: "border-nx-warning/50 text-nx-warning",
  approval: "border-nx-gold/50 text-nx-gold",
  execution: "border-nx-layer-agent/40 text-nx-layer-agent",
  audit: "border-white/14 text-nx-pearl/72",
};

export interface NxTickerEvent {
  id: string;
  kind: NxEventKind;
  text: string;
  /** Display time (already formatted by the screen — components fetch nothing). */
  time?: string;
  /** Critical events revoke the scroll license: static emphasis mode. */
  critical?: boolean;
}

/** Ticker speed from --nx-loop-ticker (motion doc 03): 24 px per second. */
const TICKER_SPEED_PX_PER_S = 24;
const FALLBACK_DURATION_S = 40;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function EventChip({ event }: { event: NxTickerEvent }) {
  return (
    <span
      data-kind={event.kind}
      data-critical={event.critical || undefined}
      className={cn(
        "rounded-nx-8 inline-flex shrink-0 items-center gap-2 border px-3 py-1 text-xs",
        event.critical
          ? "border-nx-critical/70 text-nx-critical shadow-[var(--nx-glow-critical)]"
          : KIND_ACCENT[event.kind],
      )}
    >
      <span className="font-semibold">{EVENT_KIND_LABEL[event.kind]}</span>
      <span className="text-nx-pearl/72">{event.text}</span>
      {event.time ? (
        <span className="text-nx-pearl/38" dir="ltr">
          {event.time}
        </span>
      ) : null}
    </span>
  );
}

export interface NxEventTickerProps extends React.HTMLAttributes<HTMLDivElement> {
  events: readonly NxTickerEvent[];
}

export const NxEventTicker = React.forwardRef<HTMLDivElement, NxEventTickerProps>(
  ({ className, events, ...props }, ref) => {
    const reducedMotion = usePrefersReducedMotion();
    const hasCritical = events.some((e) => e.critical);
    const staticMode = reducedMotion || hasCritical || events.length === 0;

    const trackRef = React.useRef<HTMLDivElement>(null);
    const [durationS, setDurationS] = React.useState(FALLBACK_DURATION_S);
    const [paused, setPaused] = React.useState(false);

    React.useLayoutEffect(() => {
      if (staticMode) return;
      const track = trackRef.current;
      if (!track) return;
      /* The track holds two copies — one copy's width sets the loop length. */
      const copyWidth = track.scrollWidth / 2;
      if (copyWidth > 0) setDurationS(copyWidth / TICKER_SPEED_PX_PER_S);
    }, [staticMode, events]);

    if (staticMode) {
      return (
        <div
          ref={ref}
          role="log"
          aria-label="سجل الأحداث"
          data-ticker-mode={hasCritical ? "critical" : "static"}
          className={cn("flex flex-wrap items-center gap-2", className)}
          {...props}
        >
          {events.length === 0 ? (
            <span className="text-xs text-nx-pearl/56">لا أحداث بعد</span>
          ) : (
            events.map((e) => <EventChip key={e.id} event={e} />)
          )}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        role="log"
        aria-label="شريط الأحداث المباشر"
        data-ticker-mode="scrolling"
        tabIndex={0}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        className={cn("overflow-hidden", className)}
        {...props}
      >
        {/* dir=ltr so translateX(−50%) reads as leftward flow (motion doc 04). */}
        {/* animation-name/timing/iteration come from [data-nx-ticker-track]
            in the sheet — an inline `animation` shorthand would reset
            play-state at inline priority and defeat the pause rules. */}
        <div
          ref={trackRef}
          data-nx-loop=""
          data-nx-ticker-track=""
          data-paused={paused || undefined}
          dir="ltr"
          className="flex w-max items-center gap-2"
          style={{ animationDuration: `${durationS}s` }}
        >
          <div dir="rtl" className="flex items-center gap-2 pe-2">
            {events.map((e) => (
              <EventChip key={e.id} event={e} />
            ))}
          </div>
          <div dir="rtl" aria-hidden className="flex items-center gap-2 pe-2">
            {events.map((e) => (
              <EventChip key={`dup-${e.id}`} event={e} />
            ))}
          </div>
        </div>
      </div>
    );
  },
);
NxEventTicker.displayName = "NxEventTicker";
