/**
 * LanguageToggle — compact AR/EN switcher pinned at the top of every page.
 * Persists choice via the shared `useI18n()` provider (localStorage `locale`).
 */
import { useI18n } from "@/lib/i18n";

export function LanguageToggle() {
  const { locale, setLocale } = useI18n();
  const next = locale === "ar" ? "en" : "ar";
  const label = locale === "ar" ? "EN" : "ع";
  const aria = locale === "ar" ? "Switch to English" : "التبديل إلى العربية";

  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      aria-label={aria}
      title={aria}
      className="inline-flex h-7 min-w-[40px] items-center justify-center gap-1 rounded-full border border-[#3AE8FF]/50 bg-[#3AE8FF]/10 px-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#3AE8FF] shadow-[0_0_10px_-2px_rgba(58,232,255,0.6)] transition hover:bg-[#3AE8FF]/20 hover:text-white"
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 rounded-full bg-[#3AE8FF] shadow-[0_0_6px_#3AE8FF]"
      />
      {label}
    </button>
  );
}
