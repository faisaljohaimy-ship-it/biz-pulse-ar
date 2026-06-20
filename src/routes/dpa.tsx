import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { DOMAIN_URL } from "@/lib/domain";
import { TrustShell, SectionTitle, Card, Bullets } from "@/components/trust-shell";
import { ScrollText, FileCheck, Globe, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/dpa")({
  head: () => ({
    meta: [
      { title: "Data Processing Addendum (DPA) — Nexus AI OS" },
      { name: "description", content: "Summary of the Nexus AI OS Data Processing Addendum: roles, processing scope, data subject rights, international transfers, security measures, and breach notification." },
      { property: "og:title", content: "Data Processing Addendum — Nexus AI OS" },
      { property: "og:description", content: "GDPR / PDPL-aligned DPA summary, available in full under enterprise contract." },
      { property: "og:url", content: `${DOMAIN_URL}/dpa` },
      { property: "og:image", content: `${DOMAIN_URL}/og-image.jpg` },
    ],
    links: [{ rel: "canonical", href: `${DOMAIN_URL}/dpa` }],
  }),
  component: DpaPage,
});

function DpaPage() {
  const { locale } = useI18n();
  const isAr = locale === "ar";

  const sections: { titleEn: string; titleAr: string; items: { en: string; ar: string }[] }[] = [
    {
      titleEn: "1 · Parties & Roles", titleAr: "1 · الأطراف والأدوار",
      items: [
        { en: "Customer acts as Data Controller for personal data submitted to the Services.", ar: "العميل بصفته «المتحكم في البيانات» للبيانات الشخصية المُدخلة إلى الخدمة." },
        { en: "NEXUS acts as Data Processor and processes personal data solely on documented instructions of the Customer.", ar: "NEXUS بصفته «معالج البيانات» ولا يعالج البيانات إلا بناءً على تعليمات موثقة من العميل." },
        { en: "Where NEXUS engages subprocessors, NEXUS remains liable to the Customer for their performance.", ar: "في حال الاستعانة بمورّدين فرعيين، يبقى NEXUS مسؤولًا تجاه العميل عن أدائهم." },
      ],
    },
    {
      titleEn: "2 · Scope, Duration & Purpose", titleAr: "2 · النطاق والمدة والغرض",
      items: [
        { en: "Subject matter: provision of the NEXUS AI OS platform and ARIA agent services.", ar: "الموضوع: تقديم منصة NEXUS AI OS وخدمات وكلاء ARIA." },
        { en: "Duration: the term of the underlying Master Services Agreement, plus any data-return / deletion window.", ar: "المدة: مدة اتفاقية الخدمات الرئيسية إضافة إلى فترة إعادة البيانات أو حذفها." },
        { en: "Purpose: enabling executive intelligence, decision support, and Digital Twin workflows requested by Customer.", ar: "الغرض: تمكين الذكاء التنفيذي ودعم القرار والتوأم الرقمي وفق طلب العميل." },
      ],
    },
    {
      titleEn: "3 · Categories of Data & Data Subjects", titleAr: "3 · فئات البيانات وأصحاب البيانات",
      items: [
        { en: "Identification data (name, role, email) and authentication metadata.", ar: "بيانات التعريف (الاسم والدور والبريد) وبيانات المصادقة." },
        { en: "Business data submitted by Customer (operational, financial, risk, project artefacts).", ar: "البيانات التشغيلية التي يُدخلها العميل (تشغيلية ومالية ومخاطر ومشاريع)." },
        { en: "Data subjects typically include Customer's employees, contractors, and authorized partners.", ar: "يشمل أصحاب البيانات عادةً موظفي العميل والمتعاقدين والشركاء المخوّلين." },
      ],
    },
    {
      titleEn: "4 · Security Measures", titleAr: "4 · التدابير الأمنية",
      items: [
        { en: "Technical and organizational measures aligned with ISO/IEC 27001 Annex A and NCA ECC controls.", ar: "تدابير تقنية وإدارية متوافقة مع ضوابط ISO 27001 وNCA ECC." },
        { en: "Encryption in transit (TLS 1.3) and at rest (AES-256), per-tenant key separation.", ar: "تشفير أثناء النقل (TLS 1.3) وفي السكون (AES-256) مع فصل المفاتيح لكل مستأجر." },
        { en: "Access governed by least-privilege, MFA, and audit logging — see the Security page.", ar: "وصول يقوم على أقل صلاحية وتحقق متعدد العوامل وسجلات تدقيق — راجع صفحة الأمن." },
      ],
    },
    {
      titleEn: "5 · Subprocessors", titleAr: "5 · المورّدون الفرعيون",
      items: [
        { en: "Current list maintained on the Subprocessors page; Customer may subscribe to change notifications.", ar: "تُحفظ القائمة الحالية في صفحة المورّدين الفرعيين؛ ويمكن للعميل الاشتراك في إشعارات التغيير." },
        { en: "NEXUS will give prior notice of any new subprocessor and an opportunity to object on reasonable grounds.", ar: "يُخطر NEXUS مسبقًا بأي مورّد فرعي جديد ويتيح للعميل الاعتراض لأسباب معقولة." },
      ],
    },
    {
      titleEn: "6 · International Transfers", titleAr: "6 · النقل الدولي للبيانات",
      items: [
        { en: "In-Kingdom (KSA) data residency available for Saudi tenants.", ar: "خيار استضافة البيانات داخل المملكة العربية السعودية." },
        { en: "Where transfer outside the customer region is required, EU Standard Contractual Clauses (SCCs) and equivalent safeguards apply.", ar: "عند الحاجة للنقل خارج منطقة العميل، تُطبَّق الشروط التعاقدية القياسية SCCs أو ضمانات معادلة." },
        { en: "Saudi PDPL cross-border review supported on enterprise plan.", ar: "دعم مراجعة النقل العابر للحدود وفق PDPL ضمن الباقة المؤسسية." },
      ],
    },
    {
      titleEn: "7 · Data Subject Rights", titleAr: "7 · حقوق أصحاب البيانات",
      items: [
        { en: "NEXUS will assist Customer in responding to access, rectification, deletion, restriction, and portability requests.", ar: "يساعد NEXUS العميل في الرد على طلبات الوصول والتصحيح والحذف والتقييد ونقل البيانات." },
        { en: "Where a request is sent directly to NEXUS, it is forwarded to the relevant Customer without undue delay.", ar: "إذا وصل الطلب إلى NEXUS مباشرة، يُحوَّل إلى العميل المعني دون تأخير غير مبرر." },
      ],
    },
    {
      titleEn: "8 · Breach Notification", titleAr: "8 · الإخطار بالخروقات",
      items: [
        { en: "NEXUS will notify Customer without undue delay, and in any case within 72 hours, of a confirmed personal-data breach affecting Customer data.", ar: "يُخطر NEXUS العميل دون تأخير، وخلال 72 ساعة كحد أقصى، بأي خرق مؤكد لبيانات شخصية يخصّ العميل." },
        { en: "Notification includes nature of incident, categories and approximate volume of data, and mitigations taken.", ar: "يتضمن الإشعار طبيعة الحادث وفئات البيانات وحجمها التقريبي والإجراءات المتخذة." },
      ],
    },
    {
      titleEn: "9 · Audits", titleAr: "9 · التدقيق",
      items: [
        { en: "Customer may request third-party audit reports and security questionnaires once per 12 months, subject to NDA.", ar: "يمكن للعميل طلب تقارير التدقيق المستقلة واستبيانات الأمن مرة كل 12 شهرًا بموجب اتفاقية عدم إفصاح." },
        { en: "On-site audits available under enterprise contract and reasonable scheduling.", ar: "تدقيق ميداني متاح ضمن العقود المؤسسية وبجدول معقول." },
      ],
    },
    {
      titleEn: "10 · Return & Deletion", titleAr: "10 · إعادة وحذف البيانات",
      items: [
        { en: "Upon termination, Customer data is returned or deleted within 30 days, unless retention is legally required.", ar: "عند انتهاء التعاقد، تُعاد بيانات العميل أو تُحذف خلال 30 يومًا ما لم يستلزم النظام خلاف ذلك." },
        { en: "Backups containing Customer data are aged out per the documented backup retention schedule.", ar: "تخضع النُسخ الاحتياطية لجدول الاحتفاظ الموثّق ثم تُحذف." },
      ],
    },
  ];

  return (
    <TrustShell
      isAr={isAr}
      active="/dpa"
      eyebrow="Contractual" eyebrowAr="تعاقدي"
      title="Data Processing Addendum" titleAr="ملحق معالجة البيانات"
      subtitle="A summary of the NEXUS DPA — the controller / processor terms that govern how we handle personal data on behalf of our customers."
      subtitleAr="ملخّص لـ DPA الخاص بـ NEXUS — الشروط بين «المتحكم» و«المعالج» التي تحكم معالجة البيانات الشخصية بالنيابة عن عملائنا."
      qualifier="This summary is for orientation only. The executed DPA (PDF) prevails in case of conflict. Request the signed document from privacy@nexus-ai-os.com."
      qualifierAr="هذا الملخص للاسترشاد فقط. يسود ملحق DPA المُوقَّع (PDF) في حال الاختلاف. لطلب النسخة الموقّعة: privacy@nexus-ai-os.com."
    >
      <section className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: <ShieldCheck className="h-4 w-4" />, en: "GDPR-aligned",  ar: "متوافق مع GDPR" },
          { icon: <ShieldCheck className="h-4 w-4" />, en: "PDPL-aligned",  ar: "متوافق مع PDPL" },
          { icon: <Globe className="h-4 w-4" />,      en: "SCCs available", ar: "SCCs متاحة" },
          { icon: <FileCheck className="h-4 w-4" />,  en: "BAA on request", ar: "BAA عند الطلب" },
        ].map((b, i) => (
          <Card key={i} className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-400/10 text-amber-200">{b.icon}</span>
            <span className="truncate text-xs uppercase tracking-[0.18em] text-foreground/90">{isAr ? b.ar : b.en}</span>
          </Card>
        ))}
      </section>

      <section className="mb-10">
        <SectionTitle isAr={isAr} en="DPA Summary" ar="ملخّص الـ DPA" icon={<ScrollText className="h-4 w-4" />} />
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

      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5 text-sm text-muted-foreground sm:p-6">
        {isAr
          ? "لطلب النسخة الكاملة من ملحق معالجة البيانات أو SCCs أو BAA، راسل "
          : "To request the full DPA, SCCs, or a BAA, contact "}
        <a className="text-amber-200 hover:underline" href="mailto:privacy@nexus-ai-os.com">privacy@nexus-ai-os.com</a>.
      </section>
    </TrustShell>
  );
}
