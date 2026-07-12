import { createFileRoute } from "@tanstack/react-router";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { AriaUsageAnalytics } from "@/components/aria/AriaUsageAnalytics";
import { AriaAnomalyStrip } from "@/components/aria/AriaAnomalyStrip";
import { AriaDailySummary } from "@/components/aria/AriaDailySummary";

export const Route = createFileRoute("/_authenticated/aria-analytics")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: AriaAnalyticsPage,
});

function AriaAnalyticsPage() {
  return (
    <div dir="rtl" className="space-y-4 px-4 py-4 md:px-6">
      <div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-[#3AE8FF]/70">
          ARIA · Usage Analytics
        </div>
        <h1 className="mt-1 text-xl font-black text-white sm:text-2xl">تحليلات آريا</h1>
        <p className="mt-1 text-sm text-white/60">
          الاستخدام، أكثر الأسئلة، زمن الاستجابة، ورضا المستخدمين — مشتقّة من لقطة المحاكاة.
        </p>
      </div>
      <AriaDailySummary />
      <AriaAnomalyStrip />
      <AriaUsageAnalytics />
    </div>
  );
}
