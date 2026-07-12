/**
 * AriaUsageAnalytics — Phase 5 usage & satisfaction dashboard for ARIA.
 *
 * Reads the deterministic, fixture-derived analytics (`getUsageAnalytics`) — no
 * network, no external key — so it renders identically everywhere and is
 * honestly badged «محاكاة». Layout is horizontal-first per constitution art. 5:
 * a KPI snap-rail on mobile → grid on lg+, with a weekly volume bar chart and a
 * top-questions rail beside it. Full RTL, ≥44px targets.
 */
import { BarChart3, MessageSquare, Users, Timer, ThumbsUp } from "lucide-react";
import { getUsageAnalytics, type UsageKpi } from "@/lib/aria/usage-analytics";
import { SimBadge } from "@/components/os/SimBadge";

const KPI_ICON: Record<string, typeof MessageSquare> = {
  messages: MessageSquare,
  users: Users,
  latency: Timer,
  satisfaction: ThumbsUp,
};

const WEEK_DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export function AriaUsageAnalytics({ className = "" }: { readonly className?: string }) {
  const { kpis, topQuestions, weekly } = getUsageAnalytics();
  const peak = Math.max(...weekly, 1);

  return (
    <section
      dir="rtl"
      aria-label="تحليلات استخدام آريا"
      className={`relative w-full rounded-2xl border border-[#3AE8FF]/18 bg-gradient-to-b from-[#061A2E]/55 to-[#04101C]/70 p-4 backdrop-blur-md sm:p-5 ${className}`}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[#3AE8FF]/12 text-[#3AE8FF]">
            <BarChart3 className="h-4 w-4" aria-hidden />
          </span>
          <h2 className="text-sm font-bold text-white sm:text-base">تحليلات الاستخدام</h2>
        </div>
        <SimBadge ar className="text-[9px]" />
      </div>

      {/* KPI rail — horizontal snap on mobile → 4-across grid on lg+ */}
      <div
        className="-mx-1 mb-5 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-1 pb-1 sm:gap-3 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0"
        style={{ scrollbarWidth: "none" }}
      >
        {kpis.map((k: UsageKpi) => {
          const Icon = KPI_ICON[k.key] ?? MessageSquare;
          return (
            <div
              key={k.key}
              className="w-[46%] shrink-0 snap-start rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:w-[38%] lg:w-auto"
            >
              <Icon className="h-4 w-4 text-[#3AE8FF]" aria-hidden />
              <div
                className="mt-2 text-xl font-black text-white"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {k.value}
              </div>
              <div className="mt-0.5 text-[12px] font-semibold text-white/80">{k.ar}</div>
              <div className="mt-0.5 text-[10px] leading-relaxed text-white/45">{k.hintAr}</div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        {/* Weekly volume bars */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3AE8FF]/70">
            حجم الرسائل — آخر ٧ أيام
          </div>
          <div className="flex h-32 items-end justify-between gap-1.5">
            {weekly.map((v, i) => (
              <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1.5">
                <div
                  className="w-full rounded-t bg-gradient-to-t from-[#1933E6]/70 to-[#3AE8FF]/85 transition-all"
                  style={{ height: `${Math.max(6, Math.round((v / peak) * 104))}px` }}
                  title={`${WEEK_DAYS[i]}: ${v}`}
                />
                <span className="text-[8.5px] text-white/40">{WEEK_DAYS[i].slice(0, 3)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top questions */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3AE8FF]/70">
            أكثر الأسئلة تكراراً
          </div>
          <ul className="space-y-2">
            {topQuestions.map((q, i) => (
              <li key={i} className="flex items-center gap-2 text-[12px]">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#3AE8FF]/12 text-[10px] font-bold text-[#3AE8FF]">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-white/80">{q.ar}</span>
                <span
                  className="shrink-0 font-mono text-[11px] text-white/45"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {q.count}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default AriaUsageAnalytics;
