import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { DOMAIN_URL } from "@/lib/domain";
import { TrustShell, SectionTitle, Card } from "@/components/trust-shell";
import { Building2, Bell, Globe2 } from "lucide-react";

export const Route = createFileRoute("/subprocessors")({
  head: () => ({
    meta: [
      { title: "Subprocessors — Nexus AI OS" },
      { name: "description", content: "Current list of Nexus AI OS subprocessors, the services they support, and the regions where they process customer data." },
      { property: "og:title", content: "Subprocessors — Nexus AI OS" },
      { property: "og:description", content: "Authorized subprocessors, processing purpose, and data location." },
      { property: "og:url", content: `${DOMAIN_URL}/subprocessors` },
      { property: "og:image", content: `${DOMAIN_URL}/og-image.jpg` },
    ],
    links: [{ rel: "canonical", href: `${DOMAIN_URL}/subprocessors` }],
  }),
  component: SubprocessorsPage,
});

type Sub = {
  name: string;
  purposeEn: string; purposeAr: string;
  locationEn: string; locationAr: string;
  dataEn: string; dataAr: string;
};

const CORE: Sub[] = [
  {
    name: "Cloud infrastructure (hyperscaler)",
    purposeEn: "Compute, storage, and managed networking for the production control plane.",
    purposeAr: "الحوسبة والتخزين والشبكات المُدارة لطبقة التحكم في الإنتاج.",
    locationEn: "Customer-region: KSA, EU, or US",
    locationAr: "حسب منطقة العميل: السعودية أو الاتحاد الأوروبي أو الولايات المتحدة",
    dataEn: "Encrypted application & database data",
    dataAr: "بيانات تطبيقية وقواعد بيانات مشفّرة",
  },
  {
    name: "Managed database & storage",
    purposeEn: "Primary OLTP store, object storage, and encrypted backups.",
    purposeAr: "قاعدة المعاملات الرئيسية والتخزين الكائني والنسخ المشفّرة.",
    locationEn: "Same region as customer tenancy",
    locationAr: "نفس منطقة استضافة العميل",
    dataEn: "Customer business data (encrypted at rest)",
    dataAr: "بيانات العمل (مشفّرة في السكون)",
  },
  {
    name: "Authentication & identity",
    purposeEn: "Email / Google / SAML SSO, MFA, and session management.",
    purposeAr: "تسجيل الدخول وSAML وMFA وإدارة الجلسات.",
    locationEn: "Global (auth metadata only)",
    locationAr: "عالمي (بيانات المصادقة فقط)",
    dataEn: "Email, display name, auth tokens",
    dataAr: "البريد والاسم وروموز المصادقة",
  },
  {
    name: "Foundation model providers (LLM)",
    purposeEn: "ARIA reasoning, summarization, and language understanding.",
    purposeAr: "الاستنتاج والتلخيص وفهم اللغة لـ ARIA.",
    locationEn: "Enterprise routing to in-region endpoints where available",
    locationAr: "توجيه مؤسسي لنقاط نهاية داخل المنطقة حيثما توفّر",
    dataEn: "Prompts & context the customer chooses to send",
    dataAr: "الموجّهات والسياق التي يختار العميل إرسالها",
  },
];

const OPERATIONAL: Sub[] = [
  {
    name: "Transactional email",
    purposeEn: "Authentication emails, alerts, and customer notifications.",
    purposeAr: "رسائل المصادقة والتنبيهات وإشعارات العملاء.",
    locationEn: "EU / US",
    locationAr: "الاتحاد الأوروبي / الولايات المتحدة",
    dataEn: "Email address, message body",
    dataAr: "البريد ومحتوى الرسالة",
  },
  {
    name: "Error & performance monitoring",
    purposeEn: "Runtime telemetry, error reporting, and APM.",
    purposeAr: "بيانات وقت التشغيل وتقارير الأخطاء وقياس الأداء.",
    locationEn: "EU / US",
    locationAr: "الاتحاد الأوروبي / الولايات المتحدة",
    dataEn: "Stack traces, request metadata (PII scrubbed)",
    dataAr: "تتبّع الأخطاء وبيانات الطلب (مع تنقية PII)",
  },
  {
    name: "Product analytics",
    purposeEn: "Aggregate usage analytics to improve the product.",
    purposeAr: "تحليلات استخدام مُجمَّعة لتحسين المنتج.",
    locationEn: "EU / US",
    locationAr: "الاتحاد الأوروبي / الولايات المتحدة",
    dataEn: "Pseudonymous event data",
    dataAr: "بيانات أحداث باسم مستعار",
  },
  {
    name: "Customer support tooling",
    purposeEn: "Ticketing, support communication, and CRM.",
    purposeAr: "نظام التذاكر والتواصل وإدارة العلاقة.",
    locationEn: "EU / US",
    locationAr: "الاتحاد الأوروبي / الولايات المتحدة",
    dataEn: "Contact details, conversation history",
    dataAr: "بيانات التواصل وسجل المحادثات",
  },
  {
    name: "Payment processing",
    purposeEn: "Subscription billing for non-enterprise plans (where applicable).",
    purposeAr: "فوترة الاشتراك للباقات غير المؤسسية (عند الانطباق).",
    locationEn: "EU / US",
    locationAr: "الاتحاد الأوروبي / الولايات المتحدة",
    dataEn: "Billing contact; card data is tokenized by the provider",
    dataAr: "بيانات الفوترة؛ بيانات البطاقة مرمّزة لدى المزود",
  },
];

function Table({ rows, isAr }: { rows: Sub[]; isAr: boolean }) {
  return (
    <>
      {/* Mobile — stacked cards */}
      <div className="grid gap-3 md:hidden">
        {rows.map((r) => (
          <Card key={r.name}>
            <div className="text-sm font-medium text-foreground">{r.name}</div>
            <dl className="mt-3 space-y-2 text-xs text-muted-foreground">
              <div><dt className="text-amber-300/80">{isAr ? "الغرض" : "Purpose"}</dt><dd className="mt-0.5">{isAr ? r.purposeAr : r.purposeEn}</dd></div>
              <div><dt className="text-amber-300/80">{isAr ? "الموقع" : "Location"}</dt><dd className="mt-0.5">{isAr ? r.locationAr : r.locationEn}</dd></div>
              <div><dt className="text-amber-300/80">{isAr ? "البيانات" : "Data"}</dt><dd className="mt-0.5">{isAr ? r.dataAr : r.dataEn}</dd></div>
            </dl>
          </Card>
        ))}
      </div>

      {/* Desktop — table */}
      <div className="hidden overflow-hidden rounded-xl border border-white/10 md:block">
        <table className="w-full table-fixed text-sm">
          <thead className="bg-white/[0.03] text-[10px] uppercase tracking-[0.18em] text-amber-300/80">
            <tr>
              <th className="w-[28%] px-4 py-3 text-start">{isAr ? "المورّد / الخدمة" : "Subprocessor / Service"}</th>
              <th className="w-[32%] px-4 py-3 text-start">{isAr ? "الغرض" : "Purpose"}</th>
              <th className="w-[20%] px-4 py-3 text-start">{isAr ? "الموقع" : "Location"}</th>
              <th className="w-[20%] px-4 py-3 text-start">{isAr ? "البيانات" : "Data Processed"}</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            {rows.map((r) => (
              <tr key={r.name} className="border-t border-white/5">
                <td className="px-4 py-3 align-top text-foreground/90">{r.name}</td>
                <td className="px-4 py-3 align-top">{isAr ? r.purposeAr : r.purposeEn}</td>
                <td className="px-4 py-3 align-top">{isAr ? r.locationAr : r.locationEn}</td>
                <td className="px-4 py-3 align-top">{isAr ? r.dataAr : r.dataEn}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function SubprocessorsPage() {
  const { locale } = useI18n();
  const isAr = locale === "ar";

  return (
    <TrustShell
      isAr={isAr}
      active="/subprocessors"
      eyebrow="Transparency" eyebrowAr="الشفافية"
      title="Subprocessors" titleAr="المورّدون الفرعيون"
      subtitle="Authorized subprocessors NEXUS engages to deliver the platform — what they do, where they process data, and what categories they touch."
      subtitleAr="قائمة المورّدين الفرعيين الذين يستعين بهم NEXUS لتقديم المنصة — مهامهم ومواقع معالجة البيانات وفئاتها."
      qualifier="Categories shown reflect the general architecture. The vendor list specific to a customer's region and plan is provided under NDA on request."
      qualifierAr="تعكس الفئات المعروضة البنية العامة. قائمة المورّدين الخاصة بمنطقة العميل وباقته تُقدَّم عند الطلب بموجب اتفاقية عدم إفصاح."
    >
      <section className="mb-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-400/10 text-amber-200"><Globe2 className="h-4 w-4" /></span>
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-[0.18em] text-foreground/90">{isAr ? "موقع البيانات" : "Data Residency"}</div>
            <p className="mt-1 text-sm text-muted-foreground">{isAr ? "KSA, EU، US حسب باقة العميل" : "KSA, EU, US per customer plan"}</p>
          </div>
        </Card>
        <Card className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-400/10 text-amber-200"><Bell className="h-4 w-4" /></span>
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-[0.18em] text-foreground/90">{isAr ? "إشعارات التغيير" : "Change Notice"}</div>
            <p className="mt-1 text-sm text-muted-foreground">{isAr ? "إخطار مسبق قبل أي إضافة جديدة" : "Prior notice before any new addition"}</p>
          </div>
        </Card>
        <Card className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-400/10 text-amber-200"><Building2 className="h-4 w-4" /></span>
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-[0.18em] text-foreground/90">{isAr ? "العقود" : "Contracts"}</div>
            <p className="mt-1 text-sm text-muted-foreground">{isAr ? "DPA + SCCs مع كل مورّد" : "DPA + SCCs with each vendor"}</p>
          </div>
        </Card>
      </section>

      <section className="mb-10">
        <SectionTitle isAr={isAr} en="Core Platform Subprocessors" ar="مورّدو المنصة الأساسيون" />
        <Table rows={CORE} isAr={isAr} />
      </section>

      <section className="mb-10">
        <SectionTitle isAr={isAr} en="Operational Subprocessors" ar="مورّدو العمليات" />
        <Table rows={OPERATIONAL} isAr={isAr} />
      </section>

      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5 text-sm text-muted-foreground sm:p-6">
        {isAr
          ? "للاشتراك في إشعارات تغيير المورّدين الفرعيين أو طلب القائمة التفصيلية الخاصة بعقدك، راسل "
          : "To subscribe to subprocessor-change notifications, or request the detailed list specific to your contract, contact "}
        <a className="text-amber-200 hover:underline" href="mailto:privacy@nexus-ai-os.com">privacy@nexus-ai-os.com</a>.
      </section>
    </TrustShell>
  );
}
