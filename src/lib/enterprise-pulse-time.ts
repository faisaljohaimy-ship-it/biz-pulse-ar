/**
 * Relative times for the executive pulse.
 * Invalid server timestamps must not render NaN, and scheduled future
 * events must not be described as if they happened already.
 */
export function formatRelativeTime(date: Date, locale: "ar" | "en"): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1_000);
  if (!Number.isFinite(diff)) return "—";
  if (diff >= -5 && diff < 5) return locale === "ar" ? "الآن" : "just now";

  const future = diff < 0;
  let value = Math.abs(diff);
  let unit = "s";
  if (value >= 60) {
    value = future ? Math.ceil(value / 60) : Math.floor(value / 60);
    unit = "m";
    if (value >= 60) {
      value = future ? Math.ceil(value / 60) : Math.floor(value / 60);
      unit = "h";
    }
  }
  if (locale === "ar") {
    return `${future ? "بعد" : "قبل"} ${value} ${unit === "s" ? "ثانية" : unit === "m" ? "دقيقة" : "ساعة"}`;
  }
  return future ? `in ${value}${unit}` : `${value}${unit} ago`;
}
