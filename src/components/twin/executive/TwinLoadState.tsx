import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

/** Replace an indefinite loader with a clear slow state and an explicit retry. */
export function TwinLoadState({ failed = false }: { failed?: boolean }) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (failed) return;
    const timer = window.setTimeout(() => setSlow(true), 4_000);
    return () => window.clearTimeout(timer);
  }, [failed]);
  return (
    <div role={failed ? "alert" : "status"} className="space-y-2">
      <p>
        {failed
          ? ar
            ? "تعذر تحميل هذا الجزء؛ المحتوى الآخر مستقل."
            : "This section could not load; other content is independent."
          : slow
            ? ar
              ? "التحميل أبطأ من المتوقع. يمكنك الانتظار أو إعادة المحاولة."
              : "Loading is taking longer. Wait or retry."
            : ar
              ? "جاري التحميل…"
              : "Loading…"}
      </p>
      {(failed || slow) && (
        <button
          type="button"
          className="nx-focus-ring min-h-[44px] rounded-xl border px-4 py-2"
          onClick={() => window.location.reload()}
        >
          {ar ? "إعادة تحميل الصفحة" : "Reload page"}
        </button>
      )}
    </div>
  );
}
