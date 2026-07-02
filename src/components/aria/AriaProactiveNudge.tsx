import { useEffect, useState } from "react";
import { useKpiWatcher } from "@/lib/aria/kpi-watcher";
import { useI18n } from "@/lib/i18n";

const LS_KEY = "aria_nudge_seen_v1";

function loadSeen(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(LS_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch { return new Set(); }
}
function saveSeen(s: Set<string>) {
  try { sessionStorage.setItem(LS_KEY, JSON.stringify([...s])); } catch { /* ignore */ }
}

/**
 * NEXIOS · ARIA Proactive Nudge
 * When a KPI breaches its threshold for the first time this session, show
 * a small dismissible chip near the dock. Never a modal. Max one per KPI.
 */
export function AriaProactiveNudge() {
  const { breaches } = useKpiWatcher();
  const { lang } = useI18n();
  const [seen, setSeen] = useState<Set<string>>(() => loadSeen());
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (active) return;
    const fresh = breaches.find((b) => !seen.has(b.def.key));
    if (fresh) setActive(fresh.def.key);
  }, [breaches, seen, active]);

  const current = breaches.find((b) => b.def.key === active);
  if (!current) return null;

  const text =
    (lang === "ar" ? current.def.nudge_ar : current.def.nudge_en) ??
    (lang === "ar"
      ? `تنبيه على مؤشر ${current.def.label_ar}.`
      : `Alert on ${current.def.label_en}.`);

  const dismiss = () => {
    const next = new Set(seen);
    next.add(current.def.key);
    setSeen(next);
    saveSeen(next);
    setActive(null);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-[104px] end-4 z-[95] max-w-xs animate-in fade-in slide-in-from-bottom-2"
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      <div
        className="flex items-start gap-2 rounded-2xl border p-3 text-sm shadow-2xl backdrop-blur"
        style={{
          background: "linear-gradient(135deg, rgba(255,183,3,0.18), rgba(11,39,66,0.85))",
          borderColor: current.level === "crit" ? "rgba(255,77,109,0.55)" : "rgba(255,183,3,0.55)",
          color: "#F4FBFF",
          fontFamily: lang === "ar" ? "var(--font-arabic)" : "var(--font-sans)",
        }}
      >
        <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
             style={{ background: current.level === "crit" ? "#FF4D6D" : "#FFB703",
                      boxShadow: `0 0 8px ${current.level === "crit" ? "#FF4D6D" : "#FFB703"}` }} />
        <div className="min-w-0 flex-1">
          <p className="leading-snug">{text}</p>
          <p className="mt-1 text-[11px] opacity-70">
            {lang === "ar" ? `القيمة الحالية: ${current.value}` : `Current: ${current.value}`}
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={lang === "ar" ? "إغلاق" : "Dismiss"}
          className="nx-press rounded-md px-1.5 py-0.5 text-xs opacity-70 hover:opacity-100"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
