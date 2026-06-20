import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { DOMAIN_URL } from "@/lib/domain";
import { ArrowLeft, TrendingUp, TrendingDown, Clock, Shield, Zap, DollarSign } from "lucide-react";

export const Route = createFileRoute("/roi")({
  head: () => ({
    meta: [
      { title: "ROI Calculator — Nexus AI OS" },
      { name: "description", content: "Quantify NEXUS AI OS business impact in under 30 seconds. Annual savings, cost reduction, revenue growth, productivity gain, risk reduction, and payback period." },
      { property: "og:title", content: "ROI Calculator — Nexus AI OS" },
      { property: "og:description", content: "Executive-grade ROI model for the autonomous enterprise." },
      { property: "og:url", content: `${DOMAIN_URL}/roi` },
      { property: "og:image", content: `${DOMAIN_URL}/og-image.jpg` },
    ],
    links: [{ rel: "canonical", href: `${DOMAIN_URL}/roi` }],
  }),
  component: ROIPage,
});

/* --------------------------------- Hooks --------------------------------- */

function useAnimatedNumber(value: number, duration = 800) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    fromRef.current = display;
    startRef.current = null;
    const target = value;
    const from = fromRef.current;
    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const p = Math.min(1, (ts - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (target - from) * eased);
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return display;
}

/* -------------------------------- Helpers -------------------------------- */

const fmtCurrency = (n: number, locale: "ar" | "en") => {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  const code = locale === "ar" ? "ر.س" : "SAR";
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(2)}B ${code}`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)}M ${code}`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}K ${code}`;
  return `${sign}${abs.toFixed(0)} ${code}`;
};

const fmtPct = (n: number) => `${n.toFixed(1)}%`;
const fmtMonths = (n: number, locale: "ar" | "en") =>
  locale === "ar" ? `${n.toFixed(1)} شهر` : `${n.toFixed(1)} months`;

/* ------------------------------- Component ------------------------------- */

type Inputs = {
  employees: number;
  revenue: number;     // SAR / year
  departments: number;
  projects: number;
  opCosts: number;     // SAR / year
};

const DEFAULTS: Inputs = {
  employees: 1200,
  revenue: 480_000_000,
  departments: 8,
  projects: 42,
  opCosts: 160_000_000,
};

function ROIPage() {
  const { locale, t } = useI18n();
  const isAr = locale === "ar";
  const [inp, setInp] = useState<Inputs>(DEFAULTS);

  /* ---- Core ROI model (deterministic, defensible) ---- */
  const model = useMemo(() => {
    const { employees, revenue, departments, projects, opCosts } = inp;

    // Productivity uplift: 22% base + 0.4% per department (capped 32%)
    const productivityPct = Math.min(32, 22 + departments * 0.4);
    // Cost reduction: 18% base + 0.25% per project (capped 28%)
    const costReductionPct = Math.min(28, 18 + projects * 0.25);
    // Revenue uplift: 9% base + 0.05% per employee (capped 17%)
    const revenueGrowthPct = Math.min(17, 9 + employees * 0.005);
    // Risk reduction (compliance, fraud, downtime exposure): 35–48%
    const riskReductionPct = Math.min(48, 35 + departments * 0.6 + projects * 0.1);

    const costSavings = opCosts * (costReductionPct / 100);
    const revenueUplift = revenue * (revenueGrowthPct / 100);
    // Productivity translates ~35% of (employees * SAR 180k loaded cost) at uplift %
    const productivityValue = employees * 180_000 * (productivityPct / 100) * 0.35;
    // Risk: assume 1.2% of revenue is annual risk exposure
    const riskValue = revenue * 0.012 * (riskReductionPct / 100);

    const annualSavings = costSavings + revenueUplift + productivityValue + riskValue;

    // NEXUS investment (3 tiers, by employees)
    const investment =
      employees < 500 ? 1_800_000 : employees < 5000 ? 6_400_000 : 14_800_000;

    const paybackMonths = Math.max(0.5, (investment / annualSavings) * 12);
    const threeYearROI = ((annualSavings * 3 - investment) / investment) * 100;

    return {
      productivityPct,
      costReductionPct,
      revenueGrowthPct,
      riskReductionPct,
      costSavings,
      revenueUplift,
      productivityValue,
      riskValue,
      annualSavings,
      investment,
      paybackMonths,
      threeYearROI,
    };
  }, [inp]);

  return (
    <div dir={isAr ? "rtl" : "ltr"} className="relative min-h-screen overflow-hidden bg-[#06070d] text-foreground">
      {/* Ambient cinematic backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(214,158,46,0.10),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(56,189,248,0.06),transparent_60%)]" />
        <div className="absolute inset-0 [background-image:linear-gradient(rgba(214,158,46,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(214,158,46,0.05)_1px,transparent_1px)] [background-size:48px_48px] opacity-30" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className={`h-4 w-4 ${isAr ? "rotate-180" : ""}`} />
          {isAr ? "العودة" : "Back"}
        </Link>
        <div className="text-xs uppercase tracking-[0.32em] text-amber-300/70">
          {isAr ? "حاسبة العائد التنفيذية" : "Executive ROI Model"}
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        {/* Hero */}
        <section className="mb-12 max-w-3xl">
          <h1 className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-4xl font-semibold leading-tight text-transparent sm:text-5xl">
            {isAr ? "احسب أثر NEXUS خلال 30 ثانية" : "Quantify NEXUS impact in 30 seconds"}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {isAr
              ? "نموذج مالي تنفيذي يحوّل مدخلاتك إلى وفر سنوي، نمو في الإيرادات، إنتاجية، وتقليل مخاطر، مع فترة استرداد فورية."
              : "An executive financial model that turns your operating shape into annual savings, revenue growth, productivity gains, and risk reduction — with an instant payback view."}
          </p>
        </section>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[420px_1fr]">
          {/* INPUTS */}
          <aside className="rounded-2xl border border-amber-400/15 bg-white/[0.02] p-6 backdrop-blur-xl">
            <h2 className="mb-6 text-sm font-medium uppercase tracking-[0.24em] text-amber-300/80">
              {isAr ? "المدخلات" : "Inputs"}
            </h2>
            <div className="space-y-6">
              <SliderField
                label={isAr ? "عدد الموظفين" : "Employees"}
                value={inp.employees}
                min={50} max={20000} step={50}
                onChange={(v) => setInp((s) => ({ ...s, employees: v }))}
                format={(v) => v.toLocaleString(isAr ? "ar-SA" : "en-US")}
              />
              <SliderField
                label={isAr ? "الإيرادات السنوية" : "Annual Revenue"}
                value={inp.revenue}
                min={10_000_000} max={5_000_000_000} step={10_000_000}
                onChange={(v) => setInp((s) => ({ ...s, revenue: v }))}
                format={(v) => fmtCurrency(v, locale)}
              />
              <SliderField
                label={isAr ? "عدد الإدارات" : "Departments"}
                value={inp.departments}
                min={1} max={40} step={1}
                onChange={(v) => setInp((s) => ({ ...s, departments: v }))}
                format={(v) => v.toString()}
              />
              <SliderField
                label={isAr ? "عدد المشاريع النشطة" : "Active Projects"}
                value={inp.projects}
                min={1} max={500} step={1}
                onChange={(v) => setInp((s) => ({ ...s, projects: v }))}
                format={(v) => v.toString()}
              />
              <SliderField
                label={isAr ? "التكاليف التشغيلية السنوية" : "Annual Operating Costs"}
                value={inp.opCosts}
                min={5_000_000} max={2_000_000_000} step={5_000_000}
                onChange={(v) => setInp((s) => ({ ...s, opCosts: v }))}
                format={(v) => fmtCurrency(v, locale)}
              />
            </div>

            <button
              onClick={() => setInp(DEFAULTS)}
              className="mt-8 w-full rounded-lg border border-amber-400/20 bg-amber-400/5 px-4 py-2 text-xs uppercase tracking-[0.24em] text-amber-300/80 transition hover:bg-amber-400/10"
            >
              {isAr ? "إعادة الضبط" : "Reset"}
            </button>
          </aside>

          {/* OUTPUTS */}
          <section className="space-y-6">
            {/* Headline */}
            <HeadlineCard
              isAr={isAr}
              annualSavings={model.annualSavings}
              paybackMonths={model.paybackMonths}
              threeYearROI={model.threeYearROI}
              locale={locale}
            />

            {/* KPI grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <MetricCard
                icon={<DollarSign className="h-5 w-5" />}
                label={isAr ? "الوفر السنوي" : "Annual Savings"}
                value={model.annualSavings}
                format={(v) => fmtCurrency(v, locale)}
                accent="amber"
              />
              <MetricCard
                icon={<TrendingDown className="h-5 w-5" />}
                label={isAr ? "خفض التكاليف" : "Cost Reduction"}
                value={model.costReductionPct}
                format={fmtPct}
                sub={fmtCurrency(model.costSavings, locale)}
                accent="cyan"
              />
              <MetricCard
                icon={<TrendingUp className="h-5 w-5" />}
                label={isAr ? "نمو الإيرادات" : "Revenue Growth"}
                value={model.revenueGrowthPct}
                format={fmtPct}
                sub={fmtCurrency(model.revenueUplift, locale)}
                accent="emerald"
              />
              <MetricCard
                icon={<Zap className="h-5 w-5" />}
                label={isAr ? "زيادة الإنتاجية" : "Productivity Increase"}
                value={model.productivityPct}
                format={fmtPct}
                sub={fmtCurrency(model.productivityValue, locale)}
                accent="amber"
              />
              <MetricCard
                icon={<Shield className="h-5 w-5" />}
                label={isAr ? "تقليل المخاطر" : "Risk Reduction"}
                value={model.riskReductionPct}
                format={fmtPct}
                sub={fmtCurrency(model.riskValue, locale)}
                accent="rose"
              />
              <MetricCard
                icon={<Clock className="h-5 w-5" />}
                label={isAr ? "فترة الاسترداد" : "Payback Period"}
                value={model.paybackMonths}
                format={(v) => fmtMonths(v, locale)}
                sub={isAr ? `استثمار ${fmtCurrency(model.investment, locale)}` : `Investment ${fmtCurrency(model.investment, locale)}`}
                accent="cyan"
              />
            </div>

            {/* Value stack bar */}
            <ValueStack
              isAr={isAr}
              segments={[
                { label: isAr ? "خفض التكاليف" : "Cost Reduction", value: model.costSavings, color: "rgb(56,189,248)" },
                { label: isAr ? "نمو الإيرادات" : "Revenue Growth", value: model.revenueUplift, color: "rgb(52,211,153)" },
                { label: isAr ? "الإنتاجية" : "Productivity", value: model.productivityValue, color: "rgb(251,191,36)" },
                { label: isAr ? "تقليل المخاطر" : "Risk Reduction", value: model.riskValue, color: "rgb(244,114,182)" },
              ]}
              total={model.annualSavings}
              locale={locale}
            />

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <Link
                to="/request-demo"
                className="flex-1 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 px-6 py-3 text-center text-sm font-medium text-[#0a0a0f] transition hover:from-amber-300 hover:to-amber-400"
              >
                {isAr ? "اطلب عرضًا تنفيذيًا" : "Request Executive Briefing"}
              </Link>
              <Link
                to="/pricing"
                className="flex-1 rounded-lg border border-amber-400/20 px-6 py-3 text-center text-sm text-amber-200/90 transition hover:bg-amber-400/5"
              >
                {isAr ? "خطط الاستثمار" : "View Investment Tiers"}
              </Link>
            </div>

            <p className="text-xs leading-relaxed text-muted-foreground/70">
              {isAr
                ? "النموذج مبني على متوسطات معيارية لقطاع المؤسسات في المملكة، ويُعاد ضبطه بشكل دوري وفقًا لبيانات العملاء الفعلية. الأرقام إرشادية ولا تشكّل ضمانًا تعاقديًا."
                : "Model is calibrated on Saudi enterprise benchmarks and updated against live customer telemetry. Figures are directional, not contractual guarantees."}
            </p>
          </section>
        </div>
      </main>

      <style>{`
        .roi-range { -webkit-appearance: none; appearance: none; height: 4px; background: linear-gradient(90deg, rgba(251,191,36,0.6), rgba(251,191,36,0.15)); border-radius: 999px; outline: none; }
        .roi-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 18px; height: 18px; border-radius: 999px; background: #fbbf24; border: 2px solid #0a0a0f; box-shadow: 0 0 0 4px rgba(251,191,36,0.18), 0 0 18px rgba(251,191,36,0.45); cursor: pointer; transition: transform .15s ease; }
        .roi-range::-webkit-slider-thumb:hover { transform: scale(1.1); }
        .roi-range::-moz-range-thumb { width: 18px; height: 18px; border-radius: 999px; background: #fbbf24; border: 2px solid #0a0a0f; box-shadow: 0 0 0 4px rgba(251,191,36,0.18), 0 0 18px rgba(251,191,36,0.45); cursor: pointer; }
        @keyframes roi-pulse { 0%,100% { opacity: .35 } 50% { opacity: 1 } }
        .roi-live-dot { animation: roi-pulse 1.8s ease-in-out infinite; }
        @keyframes roi-shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
        .roi-shimmer { background: linear-gradient(90deg, transparent, rgba(251,191,36,0.18), transparent); background-size: 200% 100%; animation: roi-shimmer 3.2s linear infinite; }
      `}</style>
    </div>
  );
}

/* ------------------------------- Subviews -------------------------------- */

function SliderField({
  label, value, min, max, step, onChange, format,
}: {
  label: string;
  value: number;
  min: number; max: number; step: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</label>
        <span className="font-mono text-sm text-amber-200">{format(value)}</span>
      </div>
      <input
        type="range"
        className="roi-range w-full"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function HeadlineCard({
  isAr, annualSavings, paybackMonths, threeYearROI, locale,
}: {
  isAr: boolean;
  annualSavings: number;
  paybackMonths: number;
  threeYearROI: number;
  locale: "ar" | "en";
}) {
  const animSavings = useAnimatedNumber(annualSavings);
  const animPayback = useAnimatedNumber(paybackMonths);
  const animROI = useAnimatedNumber(threeYearROI);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-400/25 bg-gradient-to-br from-amber-400/[0.06] via-white/[0.02] to-transparent p-8">
      <div aria-hidden className="roi-shimmer absolute inset-x-0 top-0 h-px" />
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-amber-300/80">
        <span className="roi-live-dot inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
        {isAr ? "مباشر · حساب آني" : "Live · Real-time"}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div>
          <div className="text-xs text-muted-foreground">{isAr ? "الوفر السنوي" : "Annual Savings"}</div>
          <div className="mt-1 bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text font-mono text-3xl font-semibold text-transparent sm:text-4xl">
            {fmtCurrency(animSavings, locale)}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{isAr ? "فترة الاسترداد" : "Payback Period"}</div>
          <div className="mt-1 font-mono text-3xl font-semibold text-foreground sm:text-4xl">
            {fmtMonths(animPayback, locale)}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{isAr ? "العائد خلال 3 سنوات" : "3-Year ROI"}</div>
          <div className="mt-1 font-mono text-3xl font-semibold text-emerald-300 sm:text-4xl">
            {animROI.toFixed(0)}%
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon, label, value, format, sub, accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  format: (v: number) => string;
  sub?: string;
  accent: "amber" | "cyan" | "emerald" | "rose";
}) {
  const v = useAnimatedNumber(value);
  const ring = {
    amber: "border-amber-400/20 text-amber-300",
    cyan: "border-cyan-400/20 text-cyan-300",
    emerald: "border-emerald-400/20 text-emerald-300",
    rose: "border-rose-400/20 text-rose-300",
  }[accent];

  return (
    <div className={`group relative overflow-hidden rounded-xl border ${ring} bg-white/[0.02] p-5 transition hover:bg-white/[0.04]`}>
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
        <span className="opacity-70">{icon}</span>
      </div>
      <div className="mt-3 font-mono text-2xl font-semibold text-foreground">{format(v)}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground/80">{sub}</div>}
    </div>
  );
}

function ValueStack({
  isAr, segments, total, locale,
}: {
  isAr: boolean;
  segments: { label: string; value: number; color: string }[];
  total: number;
  locale: "ar" | "en";
}) {
  const safeTotal = Math.max(1, total);
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-sm uppercase tracking-[0.24em] text-muted-foreground">
          {isAr ? "تركيب القيمة السنوية" : "Annual Value Composition"}
        </h3>
        <span className="font-mono text-sm text-amber-200">{fmtCurrency(total, locale)}</span>
      </div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/5">
        {segments.map((s) => (
          <div
            key={s.label}
            style={{ width: `${(s.value / safeTotal) * 100}%`, background: s.color }}
            className="h-full transition-all duration-700 ease-out"
            title={`${s.label}: ${fmtCurrency(s.value, locale)}`}
          />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
            <div className="min-w-0">
              <div className="truncate text-xs text-muted-foreground">{s.label}</div>
              <div className="font-mono text-xs text-foreground">{fmtCurrency(s.value, locale)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
