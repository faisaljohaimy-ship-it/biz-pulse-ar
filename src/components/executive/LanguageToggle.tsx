/**
 * LanguageToggle — compact glass pill (ع | EN), top-center of the viewport.
 * Single component; mounted once at the root layout only.
 * Active language: font-weight 600, full opacity. Inactive: 45% opacity.
 */
import { useI18n } from "@/lib/i18n";

export function LanguageToggle() {
  const { locale, setLocale } = useI18n();
  const isAr = locale === "ar";
  const next = isAr ? "en" : "ar";
  const aria = isAr ? "Switch to English" : "التبديل إلى العربية";

  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      aria-label={aria}
      title={aria}
      dir="ltr"
      className="inline-flex h-7 select-none items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 text-[11px] tracking-wide text-white/85 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.6)] backdrop-blur-md transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60"
      style={{ paddingBlock: 4, paddingInline: 10 }}
    >
      <span
        className="leading-none"
        style={{
          fontWeight: isAr ? 600 : 400,
          opacity: isAr ? 1 : 0.45,
          fontFamily: "'IBM Plex Sans Arabic','Cairo',ui-sans-serif,system-ui",
        }}
      >
        ع
      </span>
      <span aria-hidden className="text-white/25">|</span>
      <span
        className="leading-none"
        style={{
          fontWeight: isAr ? 400 : 600,
          opacity: isAr ? 0.45 : 1,
        }}
      >
        EN
      </span>
    </button>
  );
}
