/**
 * CommandHeader — the console's HUD top bar: live clock + date (start),
 * the NEXIOS wordmark (center), and living status glyphs (end).
 * Clock ticks client-side only; SSR renders a stable placeholder.
 */
import { useEffect, useState } from "react";
import { Bell, Search, Settings, ShieldCheck, Signal, Wifi } from "lucide-react";

function useClock(active: boolean) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    if (!active) return;
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, [active]);
  return now;
}

const STATUS = [
  { icon: ShieldCheck, key: "secure" },
  { icon: Signal, key: "signal" },
  { icon: Wifi, key: "wifi" },
] as const;

const ACTIONS = [Search, Bell, Settings] as const;

export function CommandHeader({
  ar,
  accent,
  mounted,
}: {
  ar: boolean;
  accent: string;
  mounted: boolean;
}) {
  const now = useClock(mounted);

  const time = now
    ? now.toLocaleTimeString(ar ? "ar-SA" : "en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "——:——";
  const date = now
    ? now.toLocaleDateString(ar ? "ar-SA" : "en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

  return (
    <header className="flex items-center justify-between gap-3">
      {/* clock */}
      <div className="min-w-0">
        <div
          className="font-mono text-sm font-bold tabular-nums text-white sm:text-base"
          suppressHydrationWarning
        >
          {time}
        </div>
        <div className="truncate text-[10px] text-white/50" suppressHydrationWarning>
          {date}
        </div>
      </div>

      {/* wordmark */}
      <div className="text-center">
        <div className="text-sm font-black tracking-[0.18em] text-white sm:text-lg">
          NE<span style={{ color: accent }}>X</span>IOS{" "}
          <span className="text-white/70">AI&nbsp;OS</span>
        </div>
        <div className="text-[8px] uppercase tracking-[0.32em] text-white/45 sm:text-[9px]">
          Executive Intelligence OS
        </div>
      </div>

      {/* status + actions */}
      <div className="flex items-center gap-2.5">
        <div className="hidden items-center gap-2 sm:flex">
          {STATUS.map(({ icon: Icon, key }) => (
            <Icon
              key={key}
              className="nx-icon-soft h-4 w-4"
              style={{ color: accent }}
              aria-hidden
            />
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          {ACTIONS.map((Icon, i) => (
            <span
              key={i}
              className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 bg-white/5"
            >
              <Icon className="nx-icon-soft h-3.5 w-3.5 text-white/70" aria-hidden />
            </span>
          ))}
        </div>
      </div>
    </header>
  );
}

export default CommandHeader;
