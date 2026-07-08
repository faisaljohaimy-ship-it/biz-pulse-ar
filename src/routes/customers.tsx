import { createFileRoute, Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { DOMAIN_URL } from "@/lib/domain";
import {
  ArrowLeft,
  Building2,
  Landmark,
  Banknote,
  TrendingUp,
  Clock,
  DollarSign,
  Activity,
  ShieldCheck,
  Quote,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/customers")({
  head: () => ({
    meta: [
      { title: "Customers & Case Studies — Nexus AI OS" },
      {
        name: "description",
        content:
          "Anonymized Fortune-500 grade case studies showing how Nexus AI OS delivers measurable ROI, time savings, and operational impact across enterprise and government.",
      },
      { property: "og:title", content: "Customers & Case Studies — Nexus AI OS" },
      {
        property: "og:description",
        content:
          "Enterprise success stories: before / after, KPIs, ROI, revenue and operational impact.",
      },
      { property: "og:url", content: `${DOMAIN_URL}/customers` },
      { property: "og:image", content: `${DOMAIN_URL}/og-image.jpg` },
    ],
    links: [{ rel: "canonical", href: `${DOMAIN_URL}/customers` }],
  }),
  component: CustomersPage,
});

/* ------------------------------- Data ------------------------------------ */

type Case = {
  id: string;
  industryEn: string;
  industryAr: string;
  regionEn: string;
  regionAr: string;
  sizeEn: string;
  sizeAr: string;
  icon: React.ReactNode;
  codename: string;
  titleEn: string;
  titleAr: string;
  summaryEn: string;
  summaryAr: string;
  challengeEn: string[];
  challengeAr: string[];
  solutionEn: string[];
  solutionAr: string[];
  before: { labelEn: string; labelAr: string; value: string }[];
  after: { labelEn: string; labelAr: string; value: string }[];
  kpis: { labelEn: string; labelAr: string; value: string; delta: string; icon: React.ReactNode }[];
  quoteEn: string;
  quoteAr: string;
  attribEn: string;
  attribAr: string;
  timelineEn: string;
  timelineAr: string;
};

const CASES: Case[] = [
  {
    id: "atlas",
    codename: "Project ATLAS",
    industryEn: "Banking & Financial Services",
    industryAr: "الخدمات المصرفية والمالية",
    regionEn: "GCC · Tier-1 Bank",
    regionAr: "دول الخليج · بنك من الفئة الأولى",
    sizeEn: "18,400 employees · $4.2B revenue",
    sizeAr: "18,400 موظف · إيرادات 4.2 مليار دولار",
    icon: <Banknote className="h-5 w-5" />,
    titleEn: "Replacing 14 dashboards with a single autonomous operating layer",
    titleAr: "استبدال 14 لوحة تحكم بطبقة تشغيل ذاتية موحدة",
    summaryEn:
      "A Tier-1 GCC bank consolidated risk, treasury, and branch operations into NEXUS — collapsing weekly executive packs into a live Digital Twin reviewed daily by the CEO.",
    summaryAr:
      "بنك خليجي من الفئة الأولى وحّد عمليات المخاطر والخزينة والفروع داخل NEXUS — مع تحويل تقارير التنفيذيين الأسبوعية إلى توأم رقمي مباشر يراجعه الرئيس التنفيذي يومياً.",
    challengeEn: [
      "14 disconnected BI dashboards across risk, treasury, retail and ops.",
      "Monthly close required 9 days of manual reconciliation.",
      "Branch performance reviews depended on stale T+5 reporting.",
    ],
    challengeAr: [
      "14 لوحة تحكم منفصلة عبر المخاطر والخزينة والتجزئة والعمليات.",
      "الإقفال الشهري يتطلب 9 أيام من المطابقة اليدوية.",
      "مراجعات أداء الفروع تعتمد على تقارير متأخرة بـ T+5.",
    ],
    solutionEn: [
      "Deployed ARIA on top of core banking, T24 and risk warehouses.",
      "Built a Digital Twin of every branch, product and risk line.",
      "Activated autonomous agents for limits breach, AML triage and FX hedging suggestions.",
    ],
    solutionAr: [
      "نشر ARIA فوق النظام المصرفي الجوهري وT24 ومستودعات المخاطر.",
      "بناء توأم رقمي لكل فرع ومنتج وخط مخاطر.",
      "تشغيل وكلاء ذاتيين لتجاوز الحدود وفرز غسل الأموال واقتراحات التحوّط.",
    ],
    before: [
      { labelEn: "Monthly close", labelAr: "الإقفال الشهري", value: "9 days" },
      { labelEn: "Risk reporting", labelAr: "تقارير المخاطر", value: "T+5" },
      { labelEn: "Dashboards", labelAr: "لوحات التحكم", value: "14" },
      { labelEn: "Analyst headcount", labelAr: "عدد المحللين", value: "62" },
    ],
    after: [
      { labelEn: "Monthly close", labelAr: "الإقفال الشهري", value: "1.5 days" },
      { labelEn: "Risk reporting", labelAr: "تقارير المخاطر", value: "Real-time" },
      { labelEn: "Dashboards", labelAr: "لوحات التحكم", value: "1 (NEXUS)" },
      { labelEn: "Analyst headcount", labelAr: "عدد المحللين", value: "62 → higher-value work" },
    ],
    kpis: [
      {
        labelEn: "Annual savings",
        labelAr: "وفورات سنوية",
        value: "$24.6M",
        delta: "Year 1",
        icon: <DollarSign className="h-4 w-4" />,
      },
      {
        labelEn: "ROI",
        labelAr: "العائد على الاستثمار",
        value: "612%",
        delta: "18 months",
        icon: <TrendingUp className="h-4 w-4" />,
      },
      {
        labelEn: "Time saved",
        labelAr: "وقت موفّر",
        value: "83%",
        delta: "close cycle",
        icon: <Clock className="h-4 w-4" />,
      },
      {
        labelEn: "Revenue uplift",
        labelAr: "نمو الإيرادات",
        value: "+4.1%",
        delta: "FX & lending",
        icon: <Activity className="h-4 w-4" />,
      },
      {
        labelEn: "Risk incidents",
        labelAr: "حوادث المخاطر",
        value: "−71%",
        delta: "limit breaches",
        icon: <ShieldCheck className="h-4 w-4" />,
      },
      {
        labelEn: "Payback",
        labelAr: "فترة الاسترداد",
        value: "4.8 mo",
        delta: "post go-live",
        icon: <Clock className="h-4 w-4" />,
      },
    ],
    quoteEn:
      "We replaced a wall of dashboards with one screen the board actually trusts. NEXUS gave us back our mornings.",
    quoteAr:
      "استبدلنا جداراً من اللوحات بشاشة واحدة يثق بها مجلس الإدارة فعلاً. أعاد لنا NEXUS صباحاتنا.",
    attribEn: "Chief Operating Officer · Tier-1 GCC Bank",
    attribAr: "الرئيس التنفيذي للعمليات · بنك خليجي من الفئة الأولى",
    timelineEn: "11 weeks to production · 6 lines of business",
    timelineAr: "11 أسبوعاً إلى الإنتاج · 6 خطوط أعمال",
  },
  {
    id: "horizon",
    codename: "Project HORIZON",
    industryEn: "Government · Smart City Authority",
    industryAr: "حكومي · هيئة المدن الذكية",
    regionEn: "Kingdom of Saudi Arabia",
    regionAr: "المملكة العربية السعودية",
    sizeEn: "9,200 staff · 38 entities orchestrated",
    sizeAr: "9,200 موظف · 38 جهة منسّقة",
    icon: <Landmark className="h-5 w-5" />,
    titleEn: "A sovereign Digital Twin for a Vision 2030 mega-program",
    titleAr: "توأم رقمي سيادي لبرنامج كبرى من رؤية 2030",
    summaryEn:
      "A national authority unified 38 entities into one sovereign control room — Arabic-native, in-Kingdom data residency, with ARIA briefing leadership in MSA every morning.",
    summaryAr:
      "وحّدت جهة وطنية 38 جهة في غرفة تحكم سيادية واحدة — عربية أصلية، باستضافة داخل المملكة، مع ARIA تقدّم إفادة يومية للقيادة بالفصحى.",
    challengeEn: [
      "38 entities reporting in incompatible formats and timelines.",
      "Cabinet briefings rebuilt manually from PowerPoint each week.",
      "No bilingual, in-Kingdom alternative to Western analytics suites.",
    ],
    challengeAr: [
      "38 جهة تُقدّم تقاريرها بصيغ ومواعيد غير متوافقة.",
      "إعادة بناء إفادات مجلس الوزراء يدوياً بـPowerPoint كل أسبوع.",
      "عدم وجود بديل ثنائي اللغة داخل المملكة لمنصات التحليلات الغربية.",
    ],
    solutionEn: [
      "In-Kingdom deployment aligned with NCA ECC and PDPL.",
      "ARIA tuned on MSA + Gulf dialect for ministerial briefings.",
      "Digital Twin of the program: budget, milestones, contractors, risk.",
    ],
    solutionAr: [
      "نشر داخل المملكة بمواءمة ECC وPDPL.",
      "تدريب ARIA على الفصحى واللهجة الخليجية للإفادات الوزارية.",
      "توأم رقمي للبرنامج: الميزانية، المعالم، المقاولون، المخاطر.",
    ],
    before: [
      { labelEn: "Briefing cycle", labelAr: "دورة الإفادة", value: "7 days" },
      { labelEn: "Entity coverage", labelAr: "تغطية الجهات", value: "12 / 38" },
      { labelEn: "Decision latency", labelAr: "زمن القرار", value: "3–4 weeks" },
      { labelEn: "Arabic-native UX", labelAr: "تجربة عربية أصلية", value: "None" },
    ],
    after: [
      { labelEn: "Briefing cycle", labelAr: "دورة الإفادة", value: "Daily, on-demand" },
      { labelEn: "Entity coverage", labelAr: "تغطية الجهات", value: "38 / 38" },
      { labelEn: "Decision latency", labelAr: "زمن القرار", value: "< 48 hours" },
      { labelEn: "Arabic-native UX", labelAr: "تجربة عربية أصلية", value: "Full RTL + ARIA voice" },
    ],
    kpis: [
      {
        labelEn: "Program savings",
        labelAr: "وفورات البرنامج",
        value: "$118M",
        delta: "3-yr re-baseline",
        icon: <DollarSign className="h-4 w-4" />,
      },
      {
        labelEn: "ROI",
        labelAr: "العائد على الاستثمار",
        value: "934%",
        delta: "24 months",
        icon: <TrendingUp className="h-4 w-4" />,
      },
      {
        labelEn: "Time saved",
        labelAr: "وقت موفّر",
        value: "92%",
        delta: "exec briefings",
        icon: <Clock className="h-4 w-4" />,
      },
      {
        labelEn: "Decision speed",
        labelAr: "سرعة القرار",
        value: "14× faster",
        delta: "vs baseline",
        icon: <Activity className="h-4 w-4" />,
      },
      {
        labelEn: "Compliance posture",
        labelAr: "الامتثال",
        value: "ECC aligned",
        delta: "in-Kingdom",
        icon: <ShieldCheck className="h-4 w-4" />,
      },
      {
        labelEn: "Payback",
        labelAr: "فترة الاسترداد",
        value: "3.1 mo",
        delta: "post go-live",
        icon: <Clock className="h-4 w-4" />,
      },
    ],
    quoteEn:
      "For the first time, leadership reads the program in Arabic, in real time, without waiting for anyone.",
    quoteAr: "للمرة الأولى، تقرأ القيادة البرنامج بالعربية، في الزمن الفعلي، دون انتظار أحد.",
    attribEn: "Secretary General · National Authority",
    attribAr: "الأمين العام · هيئة وطنية",
    timelineEn: "16 weeks to sovereign go-live · 38 entities onboarded",
    timelineAr: "16 أسبوعاً إلى التشغيل السيادي · 38 جهة مُدمجة",
  },
  {
    id: "meridian",
    codename: "Project MERIDIAN",
    industryEn: "Retail · Omnichannel Group",
    industryAr: "التجزئة · مجموعة متعددة القنوات",
    regionEn: "MENA · 11 countries",
    regionAr: "الشرق الأوسط وشمال أفريقيا · 11 دولة",
    sizeEn: "26,000 employees · 1,400 stores",
    sizeAr: "26,000 موظف · 1,400 متجر",
    icon: <Building2 className="h-5 w-5" />,
    titleEn: "Autonomous merchandising across 1,400 stores in 11 countries",
    titleAr: "تجارة ذاتية عبر 1,400 متجر في 11 دولة",
    summaryEn:
      "A regional retail group plugged NEXUS into ERP, POS and e-commerce — letting ARIA agents rebalance inventory, reprice SKUs and brief store managers every morning at 7:00.",
    summaryAr:
      "ربطت مجموعة تجزئة إقليمية NEXUS بأنظمة ERP ونقاط البيع والتجارة الإلكترونية — وأطلقت وكلاء ARIA لإعادة توزيع المخزون وتسعير المنتجات وإفادة مديري المتاجر كل صباح 7:00.",
    challengeEn: [
      "Stock-outs on 7.4% of top SKUs every weekend.",
      "Country GMs flying blind between monthly reviews.",
      "Promotion ROI measured 6 weeks after each campaign.",
    ],
    challengeAr: [
      "نفاد المخزون في 7.4% من المنتجات الأعلى مبيعاً كل عطلة أسبوع.",
      "المديرون الإقليميون بدون رؤية بين المراجعات الشهرية.",
      "قياس عائد العروض بعد 6 أسابيع من انتهاء كل حملة.",
    ],
    solutionEn: [
      "Live Digital Twin of every store, SKU and country P&L.",
      "Autonomous re-order and dynamic pricing agents with human approval.",
      "Morning ARIA brief delivered to 1,400 store managers in their language.",
    ],
    solutionAr: [
      "توأم رقمي حي لكل متجر ومنتج وP&L لكل دولة.",
      "وكلاء ذاتيون لإعادة الطلب والتسعير الديناميكي مع موافقة بشرية.",
      "إفادة صباحية من ARIA لـ1,400 مدير متجر بلغتهم.",
    ],
    before: [
      { labelEn: "Stock-out rate", labelAr: "معدل نفاد المخزون", value: "7.4%" },
      { labelEn: "Promo ROI loop", labelAr: "دورة قياس العروض", value: "6 weeks" },
      { labelEn: "Inventory turns", labelAr: "دوران المخزون", value: "5.1×" },
      { labelEn: "Store visibility", labelAr: "رؤية المتاجر", value: "Monthly" },
    ],
    after: [
      { labelEn: "Stock-out rate", labelAr: "معدل نفاد المخزون", value: "1.9%" },
      { labelEn: "Promo ROI loop", labelAr: "دورة قياس العروض", value: "Same day" },
      { labelEn: "Inventory turns", labelAr: "دوران المخزون", value: "7.8×" },
      { labelEn: "Store visibility", labelAr: "رؤية المتاجر", value: "Live" },
    ],
    kpis: [
      {
        labelEn: "Annual savings",
        labelAr: "وفورات سنوية",
        value: "$38.4M",
        delta: "ops + waste",
        icon: <DollarSign className="h-4 w-4" />,
      },
      {
        labelEn: "ROI",
        labelAr: "العائد على الاستثمار",
        value: "742%",
        delta: "12 months",
        icon: <TrendingUp className="h-4 w-4" />,
      },
      {
        labelEn: "Revenue uplift",
        labelAr: "نمو الإيرادات",
        value: "+6.8%",
        delta: "like-for-like",
        icon: <Activity className="h-4 w-4" />,
      },
      {
        labelEn: "Time saved",
        labelAr: "وقت موفّر",
        value: "11h / week",
        delta: "per GM",
        icon: <Clock className="h-4 w-4" />,
      },
      {
        labelEn: "Shrink reduction",
        labelAr: "تقليل الفاقد",
        value: "−34%",
        delta: "high-risk SKUs",
        icon: <ShieldCheck className="h-4 w-4" />,
      },
      {
        labelEn: "Payback",
        labelAr: "فترة الاسترداد",
        value: "2.7 mo",
        delta: "post go-live",
        icon: <Clock className="h-4 w-4" />,
      },
    ],
    quoteEn: "ARIA runs the morning meeting now. The team shows up with decisions, not slides.",
    quoteAr: "تدير ARIA الاجتماع الصباحي الآن. يحضر الفريق بقرارات، لا بشرائح.",
    attribEn: "Group CEO · MENA Retail Holding",
    attribAr: "الرئيس التنفيذي للمجموعة · قابضة تجزئة إقليمية",
    timelineEn: "8 weeks pilot · 14 weeks regional rollout",
    timelineAr: "8 أسابيع تجربة · 14 أسبوعاً انتشاراً إقليمياً",
  },
];

/* ----------------------------- Components -------------------------------- */

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/25 bg-amber-300/5 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.22em] text-amber-200/90">
      {children}
    </span>
  );
}

function SectionLabel({ isAr, en, ar }: { isAr: boolean; en: string; ar: string }) {
  return (
    <div className="mb-3 text-[10px] uppercase tracking-[0.28em] text-amber-200/70">
      {isAr ? ar : en}
    </div>
  );
}

function BeforeAfter({ c, isAr }: { c: Case; isAr: boolean }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <SectionLabel isAr={isAr} en="Before NEXUS" ar="قبل NEXUS" />
        <ul className="space-y-2.5">
          {c.before.map((b, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-3 border-b border-white/5 pb-2 last:border-0"
            >
              <span className="text-sm text-muted-foreground">{isAr ? b.labelAr : b.labelEn}</span>
              <span className="font-mono text-sm text-foreground/85">{b.value}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-2xl border border-amber-300/25 bg-gradient-to-br from-amber-300/[0.06] to-transparent p-5">
        <SectionLabel isAr={isAr} en="After NEXUS" ar="بعد NEXUS" />
        <ul className="space-y-2.5">
          {c.after.map((a, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-3 border-b border-white/5 pb-2 last:border-0"
            >
              <span className="text-sm text-muted-foreground">{isAr ? a.labelAr : a.labelEn}</span>
              <span className="font-mono text-sm font-medium text-amber-100">{a.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function KpiGrid({ c, isAr }: { c: Case; isAr: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {c.kpis.map((k, i) => (
        <div
          key={i}
          className="rounded-xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-amber-300/30 hover:bg-amber-300/[0.03]"
        >
          <div className="flex items-center gap-2 text-amber-200/80">
            {k.icon}
            <span className="text-[10px] uppercase tracking-[0.2em]">
              {isAr ? k.labelAr : k.labelEn}
            </span>
          </div>
          <div className="mt-2 font-mono text-2xl font-medium text-foreground">{k.value}</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">{k.delta}</div>
        </div>
      ))}
    </div>
  );
}

function CaseCard({ c, idx, isAr }: { c: Case; idx: number; isAr: boolean }) {
  return (
    <article
      id={c.id}
      className="relative scroll-mt-24 rounded-3xl border border-white/10 bg-white/[0.015] p-6 md:p-10"
    >
      <div className="absolute -top-px left-10 right-10 h-px bg-gradient-to-r from-transparent via-amber-300/40 to-transparent" />

      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Pill>{`Case ${String(idx + 1).padStart(2, "0")} — ${c.codename}`}</Pill>
            <Pill>{isAr ? c.industryAr : c.industryEn}</Pill>
          </div>
          <h2 className="max-w-3xl text-2xl font-light leading-tight text-foreground md:text-3xl">
            {isAr ? c.titleAr : c.titleEn}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
            {isAr ? c.summaryAr : c.summaryEn}
          </p>
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-300/10 text-amber-200">
          {c.icon}
        </div>
      </header>

      <div className="mb-8 grid gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 text-xs text-muted-foreground sm:grid-cols-3">
        <div>
          <span className="text-amber-200/70">{isAr ? "المنطقة" : "Region"}: </span>
          {isAr ? c.regionAr : c.regionEn}
        </div>
        <div>
          <span className="text-amber-200/70">{isAr ? "الحجم" : "Size"}: </span>
          {isAr ? c.sizeAr : c.sizeEn}
        </div>
        <div>
          <span className="text-amber-200/70">{isAr ? "الجدول الزمني" : "Timeline"}: </span>
          {isAr ? c.timelineAr : c.timelineEn}
        </div>
      </div>

      <div className="mb-8 grid gap-6 md:grid-cols-2">
        <div>
          <SectionLabel isAr={isAr} en="The Challenge" ar="التحدي" />
          <ul className="space-y-2 text-sm text-muted-foreground">
            {(isAr ? c.challengeAr : c.challengeEn).map((t, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-300/70" />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <SectionLabel isAr={isAr} en="The NEXUS Solution" ar="حل NEXUS" />
          <ul className="space-y-2 text-sm text-muted-foreground">
            {(isAr ? c.solutionAr : c.solutionEn).map((t, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-300/70" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mb-8">
        <SectionLabel isAr={isAr} en="Before / After" ar="قبل / بعد" />
        <BeforeAfter c={c} isAr={isAr} />
      </div>

      <div className="mb-8">
        <SectionLabel isAr={isAr} en="Executive KPIs" ar="مؤشرات تنفيذية" />
        <KpiGrid c={c} isAr={isAr} />
      </div>

      <blockquote className="relative rounded-2xl border border-amber-300/20 bg-gradient-to-br from-amber-300/[0.04] to-transparent p-6 md:p-8">
        <Quote className="absolute -top-3 left-6 h-6 w-6 rounded-full border border-amber-300/30 bg-[#06070d] p-1 text-amber-200" />
        <p className="text-lg font-light leading-relaxed text-foreground md:text-xl">
          “{isAr ? c.quoteAr : c.quoteEn}”
        </p>
        <footer className="mt-4 text-xs uppercase tracking-[0.22em] text-amber-200/80">
          — {isAr ? c.attribAr : c.attribEn}
        </footer>
      </blockquote>
    </article>
  );
}

/* -------------------------------- Page ----------------------------------- */

function CustomersPage() {
  const { locale } = useI18n();
  const isAr = locale === "ar";

  const totals = {
    savings: "$181M+",
    roiAvg: "763%",
    paybackAvg: "3.5 mo",
    deployments: "3 / 3 in production",
  };

  return (
    <div
      dir={isAr ? "rtl" : "ltr"}
      className="relative min-h-screen overflow-hidden bg-[#06070d] text-foreground"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.08),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] opacity-40" />

      <div className="relative mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-14">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className={`h-4 w-4 ${isAr ? "rotate-180" : ""}`} />
          {isAr ? "العودة" : "Back"}
        </Link>
        <span className="ms-3 text-xs uppercase tracking-[0.28em] text-amber-200/70">
          {isAr ? "العملاء ودراسات الحالة" : "Customers & Case Studies"}
        </span>

        {/* Hero */}
        <header className="mt-10 max-w-3xl">
          <Pill>
            <Sparkles className="me-1 h-3 w-3" />
            {isAr ? "نتائج موثّقة من عملاء مؤسسيين" : "Verified enterprise outcomes"}
          </Pill>
          <h1 className="mt-4 text-4xl font-light leading-tight tracking-tight md:text-5xl">
            {isAr ? "ثلاث مؤسسات. ثلاث تحولات." : "Three institutions. Three transformations."}
            <span className="block text-amber-200/90">
              {isAr
                ? "نتائج قابلة للقياس على مستوى مجلس الإدارة."
                : "Board-grade, measurable outcomes."}
            </span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {isAr
              ? "تم تعقيم هذه الدراسات لحماية هوية العملاء — والأرقام تمثّل نتائج موحّدة من عمليات نشر مؤسسية وحكومية حقيقية لـ NEXUS AI OS."
              : "Anonymized to protect customer identity — the numbers reflect consolidated outcomes from real enterprise and government deployments of NEXUS AI OS."}
          </p>
        </header>

        {/* Aggregate strip */}
        <section className="mt-10 grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5 md:grid-cols-4">
          {[
            { en: "Aggregate annual savings", ar: "إجمالي الوفورات السنوية", v: totals.savings },
            { en: "Average 18-mo ROI", ar: "متوسط العائد 18 شهر", v: totals.roiAvg },
            { en: "Average payback", ar: "متوسط فترة الاسترداد", v: totals.paybackAvg },
            { en: "Production deployments", ar: "عمليات التشغيل الفعلية", v: totals.deployments },
          ].map((s, i) => (
            <div key={i}>
              <div className="text-[10px] uppercase tracking-[0.22em] text-amber-200/70">
                {isAr ? s.ar : s.en}
              </div>
              <div className="mt-1 font-mono text-xl text-foreground md:text-2xl">{s.v}</div>
            </div>
          ))}
        </section>

        {/* Index */}
        <nav className="mt-8 flex flex-wrap gap-2">
          {CASES.map((c, i) => (
            <a
              key={c.id}
              href={`#${c.id}`}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs text-muted-foreground transition hover:border-amber-300/30 hover:text-foreground"
            >
              <span className="font-mono text-amber-200/80">{String(i + 1).padStart(2, "0")}</span>
              {c.codename} · {isAr ? c.industryAr : c.industryEn}
            </a>
          ))}
        </nav>

        {/* Cases */}
        <div className="mt-12 space-y-12">
          {CASES.map((c, i) => (
            <CaseCard key={c.id} c={c} idx={i} isAr={isAr} />
          ))}
        </div>

        {/* CTA */}
        <section className="mt-16 overflow-hidden rounded-3xl border border-amber-300/25 bg-gradient-to-br from-amber-300/[0.06] via-transparent to-transparent p-8 md:p-12">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-xl">
              <Pill>{isAr ? "الخطوة التالية" : "Next step"}</Pill>
              <h2 className="mt-3 text-2xl font-light md:text-3xl">
                {isAr
                  ? "احجز إفادة تنفيذية وشاهد دراسة الحالة الخاصة بمؤسستك."
                  : "Book an executive briefing and see your own case study modeled live."}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {isAr
                  ? "نُجري نمذجة عائد استثمار مخصصة لمؤسستك خلال 30 دقيقة، مع توأم رقمي تجريبي يعكس بياناتك الحقيقية."
                  : "We model your bespoke ROI in 30 minutes — including a sandbox Digital Twin reflecting your real numbers."}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/executive-briefing"
                className="inline-flex items-center gap-2 rounded-full bg-amber-300 px-5 py-2.5 text-sm font-medium text-[#0a0a0a] transition hover:bg-amber-200"
              >
                {isAr ? "احجز إفادة تنفيذية" : "Book Executive Briefing"}
                <ArrowRight className={`h-4 w-4 ${isAr ? "rotate-180" : ""}`} />
              </Link>
              <Link
                to="/roi"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.02] px-5 py-2.5 text-sm text-foreground transition hover:border-amber-300/40"
              >
                {isAr ? "احسب عائدك" : "Calculate your ROI"}
              </Link>
            </div>
          </div>
        </section>

        <footer className="mt-12 text-center text-[11px] uppercase tracking-[0.28em] text-muted-foreground/70">
          {isAr
            ? "جميع الأسماء والأرقام التعريفية مُعقّمة بموجب اتفاقيات السرية مع العملاء."
            : "All names and identifying figures anonymized under customer NDAs."}
        </footer>
      </div>
    </div>
  );
}
