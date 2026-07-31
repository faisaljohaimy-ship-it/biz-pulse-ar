import { createFileRoute } from "@tanstack/react-router";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { FinnUsageAnalytics } from "@/components/finn/FinnUsageAnalytics";
import { FinnAnomalyStrip } from "@/components/finn/FinnAnomalyStrip";
import { FinnDailySummary } from "@/components/finn/FinnDailySummary";

export const Route = createFileRoute("/_authenticated/finn-analytics")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: FinnAnalyticsPage,
});

function FinnAnalyticsPage() {
  return (
    <div dir="rtl" className="space-y-4 px-4 py-4 md:px-6">
      <div>
        <div className="text-[12px] uppercase tracking-[0.3em] text-[#3AE8FF]/70">
          FINN · Usage Analytics
        </div>
        <h1 className="mt-1 text-xl font-black text-white sm:text-2xl">تحليلات FINN</h1>
        <p className="mt-1 text-sm text-white/60">
          الاستخدام، أكثر الأسئلة، زمن الاستجابة، ورضا المستخدمين — مشتقّة من لقطة المحاكاة.
        </p>
      </div>
      <FinnDailySummary />
      <FinnAnomalyStrip />
      <FinnUsageAnalytics />
    </div>
  );
}
