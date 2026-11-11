/**
 * Relative times for the executive pulse.
 * Invalid server timestamps must not render NaN, and scheduled future
 * events must not be described as if they happened already.
 */
export function formatRelativeTime(date: Date, locale: "ar" | "en"): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1_000);
  if (!Number.isFinite(diff)) return "—";

  // A small clock skew is displayed as "now" rather than an artificial future event.
  if (diff < -5) {
    const secondsAhead = -diff;
    if (secondsAhead < 60)
      return locale === "ar" ? `بعد ${secondsAhead} ثانية` : `in ${secondsAhead}s`;
    const minutesAhead = Math.ceil(secondsAhead / 60);
    if (minutesAhead < 60)
      return locale === "ar" ? `بعد ${minutesAhead} دقيقة` : `in ${minutesAhead}m`;
    const hoursAhead = Math.ceil(minutesAhead / 60);
    return locale === "ar" ? `بعد ${hoursAhead} ساعة` : `in ${hoursAhead}h`;
  }

  if (diff < 5) return locale === "ar" ? "الآن" : "just now";
  if (diff < 60) return locale === "ar" ? `قبل ${diff} ثانية` : `${diff}s ago`;
  const m = Math.floor(diff / 60);
  if (m < 60) return locale === "ar" ? `قبل ${m} دقيقة` : `${m}m ago`;
  const h = Math.floor(m / 60);
  return locale === "ar" ? `قبل ${h} ساعة` : `${h}h ago`;
}
