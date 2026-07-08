import { createFileRoute, Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { DOMAIN_URL } from "@/lib/domain";
import { Check, Sparkles, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Nexus AI OS" },
      {
        name: "description",
        content:
          "Transparent enterprise pricing for Nexus AI OS — the executive intelligence operating system. Starter, Growth, and Enterprise tiers.",
      },
      { property: "og:title", content: "Pricing — Nexus AI OS" },
      {
        property: "og:description",
        content: "Enterprise pricing for the executive AI operating system.",
      },
      { property: "og:url", content: `${DOMAIN_URL}/pricing` },
      { property: "og:image", content: `${DOMAIN_URL}/og-image.jpg` },
    ],
    links: [{ rel: "canonical", href: `${DOMAIN_URL}/pricing` }],
  }),
  component: PricingPage,
});

type Tier = {
  name: string;
  nameAr: string;
  price: string;
  priceAr: string;
  cadence: string;
  cadenceAr: string;
  blurb: string;
  blurbAr: string;
  features: string[];
  featuresAr: string[];
  cta: string;
  ctaAr: string;
  to: "/request-demo" | "/contact";
  featured?: boolean;
};

const TIERS: Tier[] = [
  {
    name: "Starter",
    nameAr: "البداية",
    price: "$2,400",
    priceAr: "٢٬٤٠٠ $",
    cadence: "/month",
    cadenceAr: "/شهرياً",
    blurb: "For executive teams piloting AI-driven decision flow.",
    blurbAr: "لفِرَق القيادة التي تختبر تدفقات القرار المدعومة بالذكاء.",
    features: [
      "Up to 10 executive seats",
      "ARIA executive assistant",
      "Live KPIs & briefings",
      "Email + chat support",
    ],
    featuresAr: [
      "حتى ١٠ مقاعد تنفيذية",
      "مساعد ARIA التنفيذي",
      "مؤشرات حية وملخصات يومية",
      "دعم عبر البريد والمحادثة",
    ],
    cta: "Start trial",
    ctaAr: "ابدأ التجربة",
    to: "/request-demo",
  },
  {
    name: "Growth",
    nameAr: "النمو",
    price: "$8,500",
    priceAr: "٨٬٥٠٠ $",
    cadence: "/month",
    cadenceAr: "/شهرياً",
    blurb: "Full intelligence fabric across departments.",
    blurbAr: "نسيج استخباراتي كامل عبر جميع الإدارات.",
    features: [
      "Up to 75 seats",
      "Departments, crises, governance",
      "Custom integrations (5)",
      "Priority SLA + onboarding",
    ],
    featuresAr: [
      "حتى ٧٥ مقعداً",
      "إدارات، أزمات، حوكمة",
      "تكاملات مخصصة (٥)",
      "أولوية في الدعم والتأهيل",
    ],
    cta: "Request demo",
    ctaAr: "اطلب عرضاً",
    to: "/request-demo",
    featured: true,
  },
  {
    name: "Enterprise",
    nameAr: "المؤسسات",
    price: "Custom",
    priceAr: "مخصّص",
    cadence: "",
    cadenceAr: "",
    blurb: "Private deployment, SSO, audit, and dedicated success.",
    blurbAr: "نشر خاص، تسجيل دخول موحد، تدقيق، ومدير نجاح مخصص.",
    features: [
      "Unlimited seats & departments",
      "SSO, SAML, audit logs, DPA",
      "Private cloud / on-prem",
      "Dedicated solutions architect",
    ],
    featuresAr: [
      "مقاعد وإدارات غير محدودة",
      "SSO وSAML وسجلات تدقيق واتفاقية DPA",
      "سحابة خاصة أو نشر داخلي",
      "مهندس حلول مخصص",
    ],
    cta: "Talk to sales",
    ctaAr: "تواصل مع المبيعات",
    to: "/contact",
  },
];

function PricingPage() {
  const { locale } = useI18n();
  const isAr = locale === "ar";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {isAr ? "العودة للرئيسية" : "Back to home"}
        </Link>

        <header className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            {isAr ? "تسعير المؤسسات" : "Enterprise Pricing"}
          </div>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            {isAr ? "تسعير شفاف. نتائج قابلة للقياس." : "Transparent pricing. Measurable outcomes."}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            {isAr
              ? "ادفع مقابل القيمة الاستراتيجية، لا مقابل المقاعد فقط. جميع الخطط تشمل ARIA والبنية الكاملة."
              : "Pay for strategic outcomes, not just seats. Every tier includes ARIA and the full intelligence fabric."}
          </p>
        </header>

        <section className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TIERS.map((t) => (
            <article
              key={t.name}
              className={`relative flex flex-col rounded-2xl border p-6 transition ${
                t.featured
                  ? "border-primary/60 bg-card shadow-lg shadow-primary/10"
                  : "border-border bg-card/50"
              }`}
            >
              {t.featured ? (
                <span className="absolute -top-3 right-6 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground">
                  {isAr ? "الأكثر اختياراً" : "Most popular"}
                </span>
              ) : null}
              <h2 className="text-xl font-semibold">{isAr ? t.nameAr : t.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{isAr ? t.blurbAr : t.blurb}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight">
                  {isAr ? t.priceAr : t.price}
                </span>
                <span className="text-sm text-muted-foreground">
                  {isAr ? t.cadenceAr : t.cadence}
                </span>
              </div>
              <ul className="mt-6 space-y-3 text-sm">
                {(isAr ? t.featuresAr : t.features).map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                to={t.to}
                className={`mt-8 inline-flex items-center justify-center rounded-md px-4 py-2.5 text-sm font-medium transition ${
                  t.featured
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border border-border bg-background hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                {isAr ? t.ctaAr : t.cta}
              </Link>
            </article>
          ))}
        </section>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          {isAr
            ? "الأسعار بالدولار الأمريكي. تتوفر الفوترة السنوية بخصم ١٥٪."
            : "Prices in USD. Annual billing available with 15% discount."}
        </p>
      </div>
    </main>
  );
}
