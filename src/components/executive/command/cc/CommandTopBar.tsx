/**
 * CommandTopBar — the command center's HUD top bar: live clock/date, system &
 * connection status chips, the NEXIOS emblem/wordmark, and the action cluster
 * (search · notifications · settings · executive user).
 */
import { useEffect, useState } from "react";
import { Activity, Bell, Hexagon, Search, Settings, User, Wifi } from "lucide-react";

export function CommandTopBar({ ar, accent }: { ar: boolean; accent: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const time = now
    ? now.toLocaleTimeString(ar ? "ar-SA" : "en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "——:——";
  const date = now
    ? now.toLocaleDateString(ar ? "ar-SA" : "en-US", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <header className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 backdrop-blur-md">
      {/* clock + status */}
      <div className="flex items-center gap-3">
        <div className="min-w-0">
          <div
            className="font-mono text-sm font-bold tabular-nums text-white"
            suppressHydrationWarning
          >
            {time}
          </div>
          <div className="truncate text-[9px] text-white/50" suppressHydrationWarning>
            {date}
          </div>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <span className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[9px] text-white/70">
            <Activity className="h-3 w-3" style={{ color: accent }} aria-hidden />
            {ar ? "النظام مستقر" : "System stable"}
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[9px] text-white/70">
            <Wifi className="h-3 w-3" style={{ color: accent }} aria-hidden />
            {ar ? "متصلة" : "Connected"}
          </span>
        </div>
      </div>

      {/* wordmark */}
      <div className="flex items-center gap-2">
        <Hexagon className="h-5 w-5" style={{ color: accent }} aria-hidden />
        <div className="text-center leading-tight">
          <div className="text-sm font-black tracking-[0.14em] text-white sm:text-base">
            NE<span style={{ color: accent }}>X</span>IOS{" "}
            <span className="text-white/70">AI&nbsp;OS</span>
          </div>
          <div className="text-[7px] uppercase tracking-[0.3em] text-white/45 sm:text-[8px]">
            Executive Intelligence OS
          </div>
        </div>
      </div>

      {/* actions */}
      <div className="flex items-center gap-1.5">
        {[Search, Settings].map((Icon, i) => (
          <span
            key={i}
            className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 bg-white/5"
          >
            <Icon className="nx-icon-soft h-3.5 w-3.5 text-white/70" aria-hidden />
          </span>
        ))}
        <span className="relative grid h-7 w-7 place-items-center rounded-lg border border-white/10 bg-white/5">
          <Bell className="nx-icon-soft h-3.5 w-3.5 text-white/70" aria-hidden />
          <span
            className="absolute -top-1 -right-1 grid h-3.5 min-w-3.5 place-items-center rounded-full px-0.5 text-[8px] font-bold text-white"
            style={{ background: "#b91c1c" }}
          >
            12
          </span>
        </span>
        <span className="ms-1 hidden items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1 sm:flex">
          <span
            className="grid h-6 w-6 place-items-center rounded-full"
            style={{ background: `${accent}22`, color: accent }}
          >
            <User className="h-3.5 w-3.5" aria-hidden />
          </span>
          <span className="leading-tight">
            <span className="block text-[9px] text-white/85">{ar ? "أهلاً بك" : "Welcome"}</span>
            <span className="block text-[8px] text-white/50">
              {ar ? "المدير التنفيذي" : "Executive"}
            </span>
          </span>
        </span>
      </div>
    </header>
  );
}

export default CommandTopBar;
