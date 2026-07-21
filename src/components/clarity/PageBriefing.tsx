/**
 * PageBriefing — the constitutional Article-21 widget: every screen
 * explains itself within three seconds. One sentence of purpose, the
 * data source (with the simulation badge when applicable), and 2–3
 * available actions. Collapsible; open by default on the first visit to
 * each route (localStorage, no PII), collapsed afterwards.
 */
import { useEffect, useState } from "react";
import { ChevronDown, Database, Info, MousePointerClick } from "lucide-react";

export function PageBriefing({
  routeKey,
  what,
  dataSource,
  simulation = true,
  actions,
}: {
  /** Stable per-route key for the first-visit memory (e.g. "bi"). */
  routeKey: string;
  /** «ما هذه الصفحة» — one sentence. */
  what: string;
  /** «مصدر البيانات» — table names / origin, human-readable Arabic. */
  dataSource: string;
  /** Whether displayed data may be reference simulation (Article 6 badge). */
  simulation?: boolean;
  /** «ما يمكنك فعله هنا» — 2–3 short bullets. */
  actions: string[];
}) {
  const storageKey = `nexios-briefing:${routeKey}`;
  const [open, setOpen] = useState(true);
  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey) === "seen") setOpen(false);
      else localStorage.setItem(storageKey, "seen");
    } catch {
      /* first-visit memory is a nicety, never a dependency */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section
      dir="rtl"
      aria-label="تعريف الصفحة"
      className="holo-card rounded-2xl px-4 py-3 text-sm"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-[44px] w-full items-center justify-between gap-3 text-start"
      >
        <span className="flex items-center gap-2 font-semibold text-white">
          <Info className="h-4 w-4 text-[#3AE8FF]" aria-hidden />
          {what}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-white/50 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open && (
        <div className="mt-2 grid gap-2 border-t border-white/10 pt-3 text-xs text-white/70 sm:grid-cols-2">
          <div className="flex items-start gap-2">
            <Database className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" aria-hidden />
            <div>
              <div className="font-semibold text-white/85">مصدر البيانات</div>
              <div className="mt-0.5 leading-relaxed">{dataSource}</div>
              {simulation && (
                <div className="mt-1 inline-flex rounded-full border border-amber-300/40 bg-amber-300/10 px-2 py-0.5 text-[10px] text-amber-200">
                  محاكاة مرجعية — is_simulation = true
                </div>
              )}
            </div>
          </div>
          <div className="flex items-start gap-2">
            <MousePointerClick className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#3AE8FF]" aria-hidden />
            <div>
              <div className="font-semibold text-white/85">ما يمكنك فعله هنا</div>
              <ul className="mt-0.5 space-y-0.5">
                {actions.map((a) => (
                  <li key={a} className="leading-relaxed">
                    · {a}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default PageBriefing;
