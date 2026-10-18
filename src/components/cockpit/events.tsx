/**
 * LiveEventStream — L5 traceability band. Event cards with severity
 * coding (text + color, never color alone), pause/resume with a bounded
 * buffer, previous/next roving focus, dismiss, and open-detail. New
 * events are announced politely through the page live region.
 */
import * as React from "react";
import { ChevronLeft, ChevronRight, Pause, Play, Radio, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NxEmptyState, NxPanel, NxStatusIndicator } from "@/components/nx";
import type { CockpitEvent, EventSeverity } from "./repository";
import { useCockpit } from "./use-cockpit";
import { emitCockpitAction } from "./actions";

const SEVERITY_META: Record<EventSeverity, { word: string; chip: string; dot: string }> = {
  success: { word: "نجاح", chip: "border-nx-success/40", dot: "bg-nx-success" },
  warning: { word: "تحذير", chip: "border-nx-warning/50", dot: "bg-nx-warning" },
  critical: { word: "حرج", chip: "border-nx-critical/60", dot: "bg-nx-critical" },
  info: { word: "معلومة", chip: "border-white/14", dot: "bg-nx-info" },
};

export function LiveEventStream() {
  const { events, eventsPaused, bufferedCount, toggleEventsPaused, dismissEvent, openDrawer } =
    useCockpit();
  const listRef = React.useRef<HTMLUListElement>(null);
  const pauseRef = React.useRef<HTMLButtonElement>(null);
  const [focusIndex, setFocusIndex] = React.useState(0);
  // Index to restore focus to after a dismiss removes the focused card, so
  // keyboard/SR focus never drops to <body>. null = no pending move.
  const pendingFocusRef = React.useRef<number | null>(null);

  const moveFocus = (delta: number) => {
    const next = Math.min(Math.max(focusIndex + delta, 0), Math.max(events.length - 1, 0));
    setFocusIndex(next);
    const items = listRef.current?.querySelectorAll<HTMLElement>("[data-event-open]");
    items?.[next]?.focus();
    // scrollIntoView is absent in jsdom — optional-call keeps tests real.
    items?.[next]?.scrollIntoView?.({ inline: "nearest", block: "nearest", behavior: "smooth" });
  };

  // After a dismiss shrinks the list, land focus on the card now occupying
  // that slot (clamped), or the pause control if the stream emptied.
  React.useEffect(() => {
    if (pendingFocusRef.current == null) return;
    const target = pendingFocusRef.current;
    pendingFocusRef.current = null;
    const items = listRef.current?.querySelectorAll<HTMLElement>("[data-event-open]");
    if (items && items.length > 0) {
      const idx = Math.min(target, items.length - 1);
      setFocusIndex(idx);
      items[idx]?.focus();
    } else {
      pauseRef.current?.focus();
    }
  }, [events]);

  return (
    <NxPanel
      data-testid="event-stream"
      title="سجل الأحداث المباشر"
      layer="analytics"
      density="operations"
    >
      {/* Controls flow (and wrap) inside the content — the fixed-height
          panel header cannot hold three 44px buttons on 360-430px. */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <NxStatusIndicator
          status={eventsPaused ? "warning" : "success"}
          label={
            eventsPaused
              ? `متوقف مؤقتًا${bufferedCount > 0 ? ` · ${bufferedCount} في الانتظار` : ""}`
              : "بث مباشر"
          }
          live={!eventsPaused}
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-action="events.previous"
            aria-label="الحدث السابق"
            onClick={() => {
              emitCockpitAction("events.previous");
              moveFocus(1);
            }}
            className="nx-holo-icon rounded-nx-8 inline-flex size-11 items-center justify-center text-nx-pearl/72 transition-[border-color] duration-[var(--nx-anim-fast)] hover:border-nx-cyan/40 hover:text-nx-pearl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nx-cyan"
          >
            <ChevronRight aria-hidden className="size-4" />
          </button>
          <button
            type="button"
            data-action="events.next"
            aria-label="الحدث التالي"
            onClick={() => {
              emitCockpitAction("events.next");
              moveFocus(-1);
            }}
            className="nx-holo-icon rounded-nx-8 inline-flex size-11 items-center justify-center text-nx-pearl/72 transition-[border-color] duration-[var(--nx-anim-fast)] hover:border-nx-cyan/40 hover:text-nx-pearl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nx-cyan"
          >
            <ChevronLeft aria-hidden className="size-4" />
          </button>
          <button
            ref={pauseRef}
            type="button"
            data-action="events.pause.toggle"
            aria-pressed={eventsPaused}
            aria-label={eventsPaused ? "استئناف الأحداث" : "إيقاف الأحداث مؤقتًا"}
            onClick={() => {
              emitCockpitAction("events.pause.toggle");
              toggleEventsPaused();
            }}
            className="nx-holo-icon rounded-nx-8 inline-flex size-11 items-center justify-center text-nx-pearl transition-[border-color] duration-[var(--nx-anim-fast)] hover:border-nx-cyan/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nx-cyan"
          >
            {eventsPaused ? (
              <Play aria-hidden className="size-4" />
            ) : (
              <Pause aria-hidden className="size-4" />
            )}
          </button>
        </div>
      </div>
      {events.length === 0 ? (
        <NxEmptyState
          icon={<Radio aria-hidden className="size-8 text-nx-pearl/38" />}
          title="لا أحداث بعد"
          description="سيظهر هنا كل حدث تشغيلي فور وقوعه — والأحداث المرجعية (ليست حيّة) تُبثّ دوريًا."
        />
      ) : (
        <ul
          ref={listRef}
          role="log"
          aria-label="الأحداث المباشرة"
          className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1"
        >
          {events.map((event) => {
            const meta = SEVERITY_META[event.severity];
            return (
              <li
                key={event.id}
                data-severity={event.severity}
                className={cn(
                  "nx-glass-e1 rounded-nx-12 relative flex min-w-56 shrink-0 snap-start flex-col gap-1 border p-3",
                  meta.chip,
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-[12px] text-nx-pearl/56">
                    <span aria-hidden className={cn("size-1.5 rounded-full", meta.dot)} />
                    {meta.word}
                    <bdi dir="ltr">{event.time}</bdi>
                  </span>
                  <button
                    type="button"
                    data-action="events.dismiss"
                    aria-label={`إخفاء الحدث: ${event.titleAr}`}
                    onClick={() => {
                      emitCockpitAction("events.dismiss");
                      pendingFocusRef.current = events.findIndex((e) => e.id === event.id);
                      dismissEvent(event.id);
                    }}
                    className="inline-flex size-11 items-center justify-center rounded-nx-8 text-nx-pearl/48 transition-colors duration-[var(--nx-anim-fast)] hover:text-nx-pearl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nx-cyan"
                  >
                    <X aria-hidden className="size-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  data-action="events.open"
                  data-event-open={event.id}
                  onClick={() => {
                    emitCockpitAction("events.open");
                    openDrawer({ type: "event", id: event.id });
                  }}
                  className="flex min-h-11 flex-col gap-0.5 rounded-nx-8 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nx-cyan"
                >
                  <span className="text-sm font-bold text-nx-pearl">{event.titleAr}</span>
                  <span className="text-xs text-nx-pearl/64">{event.detailAr}</span>
                  <span className="text-[12px] text-nx-pearl/60">المصدر: {event.source}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </NxPanel>
  );
}
