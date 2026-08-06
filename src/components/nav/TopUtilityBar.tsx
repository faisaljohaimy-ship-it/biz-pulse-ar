/**
 * TopUtilityBar — global top-right utilities:
 *   • Notifications → dropdown with empty/live state
 *
 * Mounted once in AppShell. Fully RTL, ≥44px targets, keyboard accessible.
 *
 * OWNER DIRECTIVE (G1 · G2) — two utilities were REMOVED from this bar:
 *   • The search field. The CommandPalette itself is untouched and still
 *     opens on Ctrl/Cmd+K from AppShell; only the visible trigger is gone.
 *   • The settings icon, which duplicated the right rail's own entry
 *     (app-shell.tsx → "/settings"). The rail is now the single way in.
 * Both were removed HERE, in the one shared bar, rather than per screen —
 * that is why غرفة العمليات and الأمن الصناعي both lose them at once.
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Notif = {
  id: string;
  title_ar: string;
  title_en: string;
  source: string;
  severity: "info" | "warn" | "critical";
  time: string;
  href?: string;
};

// Live wiring lands next turn (enterprise_events subscription). For now the
// list is empty — the panel shows a professional empty state, never fake rows.
const useLiveNotifications = (): { items: Notif[]; simulated: boolean } => {
  return { items: [], simulated: false };
};

export function TopUtilityBar({ className }: { className?: string }) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const { items, simulated } = useLiveNotifications();
  const unread = items.length;

  useEffect(() => {
    if (!notifOpen) return;
    const onClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNotifOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [notifOpen]);

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {/* Notifications */}
      <div className="relative" ref={notifRef}>
        <button
          type="button"
          onClick={() => setNotifOpen((v) => !v)}
          aria-label={ar ? "التنبيهات" : "Notifications"}
          aria-expanded={notifOpen}
          className="nx-orb relative grid size-11 place-items-center rounded-xl border border-sidebar-border bg-card/60 text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
          style={{
            // اللون هنا يحمل معنًى لا زينة: كهرماني حين يوجد غير مقروء،
            // سماوي حين لا شيء ينتظر. والعدد مكتوب في الشارة فوقه — فاللون
            // إشارةٌ ثانية لا الوحيدة (WCAG 1.4.1).
            ["--orb-accent" as string]: unread > 0 ? "var(--tone-amber)" : "var(--tone-cyan)",
            ["--orb-speed" as string]: unread > 0 ? "0.8s" : "1.6s",
          }}
        >
          <Bell className="size-4" aria-hidden />
          {unread > 0 && (
            <span
              aria-label={`${unread} ${ar ? "غير مقروءة" : "unread"}`}
              className="absolute -top-1 -end-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[12px] font-bold text-destructive-foreground"
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
        {notifOpen && (
          <div
            role="dialog"
            aria-label={ar ? "التنبيهات" : "Notifications"}
            dir={ar ? "rtl" : "ltr"}
            className="absolute end-0 top-[calc(100%+8px)] z-50 w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-sidebar-border bg-[#06101F]/98 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="text-sm font-bold text-white">
                {ar ? "التنبيهات" : "Notifications"}
              </div>
              {simulated && (
                <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[12px] font-semibold text-amber-200">
                  {ar ? "محاكاة" : "Simulated"}
                </span>
              )}
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                  <Bell className="size-6 text-white/30" aria-hidden />
                  <p className="text-sm text-white/70">
                    {ar ? "لا توجد تنبيهات حالياً" : "No notifications right now"}
                  </p>
                  <p className="text-[12px] text-white/40">
                    {ar
                      ? "سيظهر أي حدث حرج فور وصوله."
                      : "New critical events will appear here instantly."}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-white/5">
                  {items.map((n) => (
                    <li key={n.id}>
                      <NotifRow n={n} ar={ar} onNav={() => setNotifOpen(false)} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NotifRow({ n, ar, onNav }: { n: Notif; ar: boolean; onNav: () => void }) {
  const sev =
    n.severity === "critical"
      ? "text-destructive border-destructive/40"
      : n.severity === "warn"
        ? "text-amber-300 border-amber-400/40"
        : "text-cyan-200 border-cyan-400/30";
  const body = (
    <div className="flex items-start gap-3 px-4 py-3 transition hover:bg-white/5">
      <span
        className={cn(
          "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border text-[12px] font-bold",
          sev,
        )}
        aria-hidden
      >
        !
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-white">
          {ar ? n.title_ar : n.title_en}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[12px] text-white/50">
          <span>{n.source}</span>
          <span aria-hidden>·</span>
          <span>{n.time}</span>
        </div>
      </div>
    </div>
  );
  if (n.href) {
    return (
      <Link to={n.href} onClick={onNav} className="block">
        {body}
      </Link>
    );
  }
  return body;
}
