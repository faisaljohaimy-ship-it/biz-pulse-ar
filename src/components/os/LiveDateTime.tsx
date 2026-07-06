/**
 * LiveDateTime — bilingual live clock strip for /os.
 * Row 1: current time in Arabic (Riyadh) and English (24h).
 * Row 2: Hijri date (Umm al-Qura) followed by Gregorian date.
 * Updates every second, SSR-safe (renders only after mount).
 */
import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

const TZ = "Asia/Riyadh";

const arTime = new Intl.DateTimeFormat("ar-SA", {
  hour: "2-digit", minute: "2-digit", second: "2-digit",
  hour12: true, timeZone: TZ,
});
const enTime = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit", minute: "2-digit", second: "2-digit",
  hour12: false, timeZone: TZ,
});
const hijriDate = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
  weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: TZ,
});
const gregDate = new Intl.DateTimeFormat("en-GB", {
  weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: TZ,
});

export function LiveDateTime({ ar }: { readonly ar: boolean }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!now) {
    return (
      <div
        aria-hidden
        className="pointer-events-auto inline-flex h-[30px] items-center rounded-full border border-white/10 bg-white/5 px-3 backdrop-blur"
      />
    );
  }

  const timeAr = arTime.format(now);
  const timeEn = enTime.format(now);
  const dHijri = hijriDate.format(now);
  const dGreg = gregDate.format(now);

  return (
    <div
      role="group"
      aria-label={ar ? "الوقت والتاريخ الحيّ" : "Live date and time"}
      dir="ltr"
      className="pointer-events-auto inline-flex flex-col items-end gap-0.5 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-white/85 shadow-[0_0_24px_rgba(0,212,255,0.08)] backdrop-blur-md"
    >
      {/* Row 1 — time AR · EN */}
      <div className="flex items-center gap-2 text-[11px] font-medium tabular-nums">
        <Clock aria-hidden className="h-3 w-3 text-[#3AE8FF]" strokeWidth={2.25} />
        <span
          dir="rtl"
          lang="ar"
          className="text-[#3AE8FF]"
          style={{ fontFamily: '"Tajawal", ui-sans-serif, system-ui' }}
        >
          {timeAr}
        </span>
        <span aria-hidden className="text-white/25">·</span>
        <span dir="ltr" lang="en" className="text-white/80">
          {timeEn}
        </span>
      </div>
      {/* Row 2 — Hijri · Gregorian */}
      <div className="flex items-center gap-2 text-[10px] font-medium text-white/60">
        <span
          dir="rtl"
          lang="ar"
          className="whitespace-nowrap"
          style={{ fontFamily: '"Tajawal", ui-sans-serif, system-ui' }}
        >
          {dHijri} هـ
        </span>
        <span aria-hidden className="text-white/25">·</span>
        <span dir="ltr" lang="en" className="whitespace-nowrap">
          {dGreg}
        </span>
      </div>
    </div>
  );
}

export default LiveDateTime;
