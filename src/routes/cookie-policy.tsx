import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { DOMAIN_URL } from "@/lib/domain";
import { TrustShell, SectionTitle, Card, Bullets } from "@/components/trust-shell";
import { Cookie, Shield, Settings2 } from "lucide-react";

export const Route = createFileRoute("/cookie-policy")({
  head: () => ({
    meta: [
      { title: "Cookie Policy — NEEXIOS | NEXUS AI OS" },
      { name: "description", content: "How NEEXIOS uses cookies and similar technologies — categories, purposes, retention, and your choices. PDPL & GDPR-aligned." },
      { property: "og:title", content: "Cookie Policy — NEEXIOS" },
      { property: "og:description", content: "Cookie categories, retention, and user choices for neexios.com and the NEXUS AI OS platform." },
      { property: "og:url", content: `${DOMAIN_URL}/cookie-policy` },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: `${DOMAIN_URL}/cookie-policy` }],
  }),
  component: CookiePage,
});

function CookiePage() {
  const { locale } = useI18n();
  const isAr = locale === "ar";

  const sections = [
    {
      titleEn: "1 · What are cookies", titleAr: "1 · ما هي ملفات تعريف الارتباط",
      items: [
        { en: "Small text files stored on your device to remember preferences and session state.", ar: "ملفات نصية صغيرة تُخزَّن على جهازك لتذكّر التفضيلات وحالة الجلسة." },
        { en: "We also use localStorage, sessionStorage and similar browser APIs covered by this policy.", ar: "نستخدم أيضًا تخزين المتصفح وواجهات مماثلة تشملها هذه السياسة." },
      ],
    },
    {
      titleEn: "2 · Categories we use", titleAr: "2 · الفئات المستخدمة",
      items: [
        { en: "Strictly necessary — authentication, security, CSRF, language preference. Always on.", ar: "ضرورية تمامًا — المصادقة والأمن وتفضيل اللغة. تعمل دائمًا." },
        { en: "Functional — UI state (sidebar, theme), saved across sessions to improve experience.", ar: "وظيفية — حالة الواجهة (الشريط، السمة) لتحسين التجربة." },
        { en: "Analytics — aggregated usage metrics, no PII, retention ≤ 13 months.", ar: "تحليلية — مقاييس استخدام مجمّعة دون بيانات شخصية، احتفاظ لا يتجاوز 13 شهرًا." },
        { en: "We do NOT use advertising or cross-site tracking cookies.", ar: "لا نستخدم ملفات تتبّع إعلاني أو عبر المواقع." },
      ],
    },
    {
      titleEn: "3 · Your choices", titleAr: "3 · خياراتك",
      items: [
        { en: "Browser settings let you block or delete cookies — strictly-necessary cookies cannot be disabled without breaking sign-in.", ar: "يمكن لإعدادات المتصفح حظر أو حذف الكوكيز — لا يمكن تعطيل الضرورية دون كسر تسجيل الدخول." },
        { en: "Enterprise customers can request a no-analytics deployment under MSA.", ar: "يمكن لعملاء المؤسسات طلب نشر بدون تحليلات ضمن اتفاقية الخدمات." },
      ],
    },
    {
      titleEn: "4 · Updates & contact", titleAr: "4 · التحديثات والتواصل",
      items: [
        { en: "Material changes are announced on this page with a new effective date.", ar: "تُنشر التغييرات الجوهرية على هذه الصفحة مع تاريخ سريان جديد." },
        { en: "Questions: privacy@neexios.com", ar: "للاستفسار: privacy@neexios.com" },
      ],
    },
  ];

  return (
    <TrustShell
      isAr={isAr} active="/cookie-policy"
      eyebrow="Policy" eyebrowAr="سياسة"
      title="Cookie Policy" titleAr="سياسة ملفات تعريف الارتباط"
      subtitle="How neexios.com and the NEXUS AI OS platform use cookies and similar storage."
      subtitleAr="كيف يستخدم موقع neexios.com ومنصة NEXUS AI OS ملفات تعريف الارتباط ووسائل التخزين المماثلة."
      qualifier="Effective 2026-06-20. PDPL & GDPR aligned."
      qualifierAr="ساري ابتداءً من 20-06-2026. متوافق مع PDPL وGDPR."
    >
      <section className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { icon: <Shield className="h-4 w-4" />, en: "No ad tracking", ar: "بلا تتبع إعلاني" },
          { icon: <Cookie className="h-4 w-4" />, en: "PDPL & GDPR", ar: "PDPL و GDPR" },
          { icon: <Settings2 className="h-4 w-4" />, en: "User control", ar: "تحكّم المستخدم" },
        ].map((b, i) => (
          <Card key={i} className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-400/10 text-amber-200">{b.icon}</span>
            <span className="truncate text-xs uppercase tracking-[0.18em] text-foreground/90">{isAr ? b.ar : b.en}</span>
          </Card>
        ))}
      </section>
      <section>
        <SectionTitle isAr={isAr} en="Details" ar="التفاصيل" icon={<Cookie className="h-4 w-4" />} />
        <div className="space-y-4">
          {sections.map((s) => (
            <Card key={s.titleEn}>
              <h3 className="text-sm font-medium uppercase tracking-[0.18em] text-foreground/90">{isAr ? s.titleAr : s.titleEn}</h3>
              <div className="mt-3"><Bullets items={s.items} isAr={isAr} /></div>
            </Card>
          ))}
        </div>
      </section>
    </TrustShell>
  );
}
