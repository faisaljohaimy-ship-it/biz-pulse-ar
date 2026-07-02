/**
 * LanguageToggle — premium globe AR/EN switcher pinned at the top of every page.
 * Persists choice via the shared `useI18n()` provider (localStorage `locale`).
 */
import { Globe } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function LanguageToggle() {
  const { locale, setLocale } = useI18n();
  const next = locale === "ar" ? "en" : "ar";
  const aria = locale === "ar" ? "Switch to English" : "التبديل إلى العربية";
  const active = locale === "ar" ? "AR" : "EN";
  const dim = locale === "ar" ? "EN" : "AR";

  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      aria-label={aria}
      title={aria}
      className="group inline-flex h-8 items-center gap-1.5 rounded-full border border-[#3AE8FF]/50 bg-[#3AE8FF]/10 px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-white shadow-[0_0_14px_-2px_rgba(58,232,255,0.7)] backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-[#3AE8FF]/20"
    >
      <Globe className="h-3.5 w-3.5 text-[#3AE8FF] transition group-hover:rotate-12" />
      <span className="text-[#3AE8FF]">{active}</span>
      <span className="text-white/30">/</span>
      <span className="text-white/50">{dim}</span>
    </button>
  );
}
