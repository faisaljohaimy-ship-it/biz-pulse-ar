// Executive Alert Overlay — Phase 5. Listens for nexios:demo-alert.
import * as React from "react";
import { AlertTriangle, MapPin, Clock, ShieldAlert, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { DemoScene } from "@/lib/demo/scenes";

type Alert = NonNullable<DemoScene["alert"]> & { _key: string };

const SEVERITY_TONE: Record<Alert["severity"], string> = {
  low:      "border-[#3AE8FF]/40 text-[#3AE8FF]",
  medium:   "border-[#F5C86B]/50 text-[#FBE29A]",
  high:     "border-[#FF9A66]/60 text-[#FFC1A0]",
  critical: "border-[#FF6A9A]/70 text-[#FFB0C7]",
};

export function ExecutiveAlertOverlay() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [alert, setAlert] = React.useState<Alert | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    const onAlert = (e: Event) => {
      const detail = (e as CustomEvent<{ alert: Alert; stepId: string }>).detail;
      if (!detail?.alert) return;
      setAlert({ ...detail.alert, _key: detail.stepId });
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setAlert(null), 12000);
    };
    window.addEventListener("nexios:demo-alert", onAlert as EventListener);
    return () => {
      window.removeEventListener("nexios:demo-alert", onAlert as EventListener);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!alert) return null;
  const t = (a: string, e: string) => (ar ? a : e);
  const tone = SEVERITY_TONE[alert.severity];

  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      className="pointer-events-none fixed inset-x-0 top-[24px] z-[97] flex justify-center px-3"
      style={{ animation: "nx-alert-in 420ms ease-out both" }}
    >
      <div className={`pointer-events-auto flex w-full max-w-3xl items-start gap-3 rounded-2xl border bg-[#061A2E]/95 p-3 shadow-[0_0_60px_rgba(255,106,154,0.35)] backdrop-blur-xl ${tone}`}>
        <div className="relative">
          <ShieldAlert className="h-5 w-5" />
          <span className="absolute -end-1 -top-1 h-2 w-2 animate-ping rounded-full bg-current" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5" />
            <div className="text-[10px] uppercase tracking-[0.28em]">
              {t("تنبيه تنفيذي", "Executive Alert")} · {alert.severity.toUpperCase()}
            </div>
          </div>
          <div className="mt-1 grid gap-1 text-xs text-white/85 sm:grid-cols-3">
            <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3 opacity-60" />{ar ? alert.location_ar : alert.location_en}</div>
            <div className="truncate">{ar ? alert.impact_ar : alert.impact_en}</div>
            <div className="flex items-center gap-1.5"><Clock className="h-3 w-3 opacity-60" />ETA {alert.etaMinutes}m</div>
          </div>
          <div className="mt-1 text-xs text-white/70">
            <span className="font-semibold">{t("توصية: ", "Recommended: ")}</span>
            {ar ? alert.recommended_ar : alert.recommended_en}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setAlert(null)}
          aria-label={t("إغلاق", "Dismiss")}
          className="rounded-full border border-white/15 p-1 text-white/70 hover:bg-white/10"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <style>{`@keyframes nx-alert-in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
