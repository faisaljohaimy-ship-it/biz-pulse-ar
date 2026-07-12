/**
 * AriaAnomalyStrip — Phase 5 KPI anomaly detection surface.
 *
 * Renders the deterministic findings from `detectAnomalies()` (fixture-derived,
 * no key, honestly «محاكاة»-badged) as a horizontal card rail — a snap-scroll
 * on mobile, a grid on lg+ (constitution art. 5). Each card links to the real
 * module where the operator acts on the deviation (art. 6). When no anomaly is
 * found the strip shows a calm "all nominal" state — never an empty void.
 */
import { Link } from "@tanstack/react-router";
import { AlertTriangle, ShieldCheck, ArrowUpLeft } from "lucide-react";
import { detectAnomalies, type AnomalySeverity } from "@/lib/aria/anomaly-detection";
import { SimBadge } from "@/components/os/SimBadge";

const TONE: Record<AnomalySeverity, { ring: string; text: string; chip: string; ar: string }> = {
  critical: {
    ring: "border-rose-400/40 bg-rose-500/[0.08]",
    text: "text-rose-200",
    chip: "border-rose-400/50 bg-rose-500/15 text-rose-200",
    ar: "حرج",
  },
  warning: {
    ring: "border-amber-400/40 bg-amber-500/[0.07]",
    text: "text-amber-200",
    chip: "border-amber-400/50 bg-amber-500/15 text-amber-200",
    ar: "تحذير",
  },
};

export function AriaAnomalyStrip({ className = "" }: { readonly className?: string }) {
  const anomalies = detectAnomalies();

  return (
    <section
      dir="rtl"
      aria-label="كشف شذوذ المؤشرات"
      className={`relative w-full rounded-2xl border border-[#3AE8FF]/18 bg-gradient-to-b from-[#061A2E]/55 to-[#04101C]/70 p-4 backdrop-blur-md sm:p-5 ${className}`}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-amber-500/12 text-amber-300">
            <AlertTriangle className="h-4 w-4" aria-hidden />
          </span>
          <h2 className="text-sm font-bold text-white sm:text-base">كشف شذوذ المؤشرات</h2>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-white/60">
            {anomalies.length}
          </span>
        </div>
        <SimBadge ar className="text-[9px]" />
      </div>

      {anomalies.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.06] p-4 text-emerald-100">
          <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-300" aria-hidden />
          <span className="text-[13px] leading-relaxed">
            لا انحرافات مؤثّرة عن متوسط المناطق — كل المؤشرات ضمن النطاق الطبيعي.
          </span>
        </div>
      ) : (
        <div
          className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 sm:gap-3 lg:mx-0 lg:grid lg:grid-cols-2 lg:overflow-visible lg:px-0"
          style={{ scrollbarWidth: "none" }}
        >
          {anomalies.map((a) => {
            const t = TONE[a.severity];
            return (
              <Link
                key={a.key}
                to={a.to}
                aria-label={a.summaryAr}
                className={`group flex min-h-[92px] w-[80%] shrink-0 snap-start items-start gap-3 rounded-xl border p-3.5 transition hover:brightness-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3AE8FF]/60 sm:w-[52%] lg:w-auto ${t.ring}`}
              >
                <AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${t.text}`} aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-white">
                      {a.metricAr} · {a.regionAr}
                    </span>
                    <span
                      className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${t.chip}`}
                    >
                      {t.ar}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] leading-relaxed text-white/70">{a.summaryAr}</p>
                </div>
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/15 bg-white/[0.04] text-white/70 transition group-hover:text-[#3AE8FF]">
                  <ArrowUpLeft className="h-4 w-4" aria-hidden />
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default AriaAnomalyStrip;
