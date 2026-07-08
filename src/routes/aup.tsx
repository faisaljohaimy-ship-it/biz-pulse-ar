import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { DOMAIN_URL } from "@/lib/domain";
import { TrustShell, SectionTitle, Card, Bullets } from "@/components/trust-shell";
import { Ban, ShieldAlert, Scale } from "lucide-react";

export const Route = createFileRoute("/aup")({
  head: () => ({
    meta: [
      { title: "Acceptable Use Policy — NEXIOS | NEXUS AI OS" },
      {
        name: "description",
        content:
          "Acceptable use rules for the NEXUS AI OS platform — prohibited content, prohibited activities, enforcement and reporting.",
      },
      { property: "og:title", content: "Acceptable Use Policy — NEXIOS" },
      {
        property: "og:description",
        content:
          "Prohibited content, prohibited activities, enforcement, and reporting for NEXUS AI OS.",
      },
      { property: "og:url", content: `${DOMAIN_URL}/aup` },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: `${DOMAIN_URL}/aup` }],
  }),
  component: AupPage,
});

function AupPage() {
  const { locale } = useI18n();
  const isAr = locale === "ar";

  const sections = [
    {
      titleEn: "1 · Prohibited content",
      titleAr: "1 · المحتوى المحظور",
      items: [
        {
          en: "Unlawful, defamatory, infringing, or sexually exploitative material.",
          ar: "محتوى غير قانوني أو تشهيري أو منتهك أو استغلالي جنسيًا.",
        },
        {
          en: "Material that violates Saudi laws, including PDPL and counter-terrorism statutes.",
          ar: "أي محتوى يخالف الأنظمة السعودية بما فيها نظام حماية البيانات الشخصية وأنظمة مكافحة الإرهاب.",
        },
        {
          en: "Personal data of third parties without lawful basis.",
          ar: "بيانات شخصية للغير دون سند نظامي.",
        },
      ],
    },
    {
      titleEn: "2 · Prohibited activities",
      titleAr: "2 · الأنشطة المحظورة",
      items: [
        {
          en: "Reverse engineering, scraping at scale, or bypassing rate limits.",
          ar: "الهندسة العكسية أو الاستخراج الجماعي أو تجاوز حدود المعدل.",
        },
        {
          en: "Using ARIA agents to generate disinformation, CSAM, weapons design, or malware.",
          ar: "استخدام وكلاء ARIA لإنتاج تضليل أو مواد CSAM أو تصاميم أسلحة أو برمجيات خبيثة.",
        },
        {
          en: "Probing, scanning, or attacking the Service or other tenants.",
          ar: "فحص أو مهاجمة الخدمة أو المستأجرين الآخرين.",
        },
        {
          en: "Using the Service to take credit, employment, lending, insurance, or housing decisions about individuals without human oversight.",
          ar: "استخدام الخدمة لاتخاذ قرارات ائتمانية أو توظيفية أو إقراض أو تأمين أو سكن دون إشراف بشري.",
        },
      ],
    },
    {
      titleEn: "3 · Enforcement",
      titleAr: "3 · التنفيذ",
      items: [
        {
          en: "We may throttle, suspend, or terminate access without notice for severe or repeated violations.",
          ar: "يحق لنا تقييد الوصول أو تعليقه أو إنهاؤه دون إشعار للمخالفات الجسيمة أو المتكررة.",
        },
        {
          en: "We cooperate with lawful requests from competent Saudi authorities under PDPL Article 31.",
          ar: "نتعاون مع الطلبات النظامية للجهات السعودية وفق المادة 31 من PDPL.",
        },
      ],
    },
    {
      titleEn: "4 · Reporting",
      titleAr: "4 · الإبلاغ",
      items: [
        {
          en: "Abuse or vulnerability reports: security@neexios.com (PGP available on request).",
          ar: "للإبلاغ عن إساءة أو ثغرة: security@neexios.com (PGP عند الطلب).",
        },
        { en: "Legal notices: legal@neexios.com.", ar: "الإشعارات القانونية: legal@neexios.com." },
      ],
    },
  ];

  return (
    <TrustShell
      isAr={isAr}
      active="/aup"
      eyebrow="Policy"
      eyebrowAr="سياسة"
      title="Acceptable Use Policy"
      titleAr="سياسة الاستخدام المقبول"
      subtitle="Rules every NEXUS AI OS user, customer, and developer must follow."
      subtitleAr="القواعد التي يلتزم بها كل مستخدم وعميل ومطوّر على منصة NEXUS AI OS."
      qualifier="Effective 2026-06-20. Forms part of the Master Services Agreement."
      qualifierAr="ساري ابتداءً من 20-06-2026. جزء من اتفاقية الخدمات الرئيسية."
    >
      <section className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { icon: <Ban className="h-4 w-4" />, en: "Hard prohibitions", ar: "محظورات صريحة" },
          {
            icon: <ShieldAlert className="h-4 w-4" />,
            en: "Active enforcement",
            ar: "تنفيذ فعّال",
          },
          { icon: <Scale className="h-4 w-4" />, en: "PDPL & GDPR", ar: "PDPL و GDPR" },
        ].map((b, i) => (
          <Card key={i} className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-400/10 text-amber-200">
              {b.icon}
            </span>
            <span className="truncate text-xs uppercase tracking-[0.18em] text-foreground/90">
              {isAr ? b.ar : b.en}
            </span>
          </Card>
        ))}
      </section>
      <section>
        <SectionTitle isAr={isAr} en="Policy" ar="السياسة" icon={<Scale className="h-4 w-4" />} />
        <div className="space-y-4">
          {sections.map((s) => (
            <Card key={s.titleEn}>
              <h3 className="text-sm font-medium uppercase tracking-[0.18em] text-foreground/90">
                {isAr ? s.titleAr : s.titleEn}
              </h3>
              <div className="mt-3">
                <Bullets items={s.items} isAr={isAr} />
              </div>
            </Card>
          ))}
        </div>
      </section>
    </TrustShell>
  );
}
