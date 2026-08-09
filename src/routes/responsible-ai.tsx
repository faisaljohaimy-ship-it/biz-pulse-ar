import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { DOMAIN_URL } from "@/lib/domain";
import { TrustShell, SectionTitle, Card, Bullets } from "@/components/trust-shell";
import { Brain, Sparkles, ShieldCheck, Users } from "lucide-react";

export const Route = createFileRoute("/responsible-ai")({
  head: () => ({
    meta: [
      { title: "Responsible AI — SADEED | SADEED" },
      {
        name: "description",
        content:
          "SADEED Responsible AI commitments — human oversight, transparency, bias mitigation, safety, and SDAIA / EU AI Act alignment.",
      },
      { property: "og:title", content: "Responsible AI — SADEED" },
      {
        property: "og:description",
        content: "Principles, controls, and accountability for AI inside SADEED.",
      },
      { property: "og:url", content: `${DOMAIN_URL}/responsible-ai` },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: `${DOMAIN_URL}/responsible-ai` }],
  }),
  component: RaiPage,
});

function RaiPage() {
  const { locale } = useI18n();
  const isAr = locale === "ar";

  const sections = [
    {
      titleEn: "1 · Principles",
      titleAr: "1 · المبادئ",
      items: [
        {
          en: "Human oversight — executive decisions stay with humans; SADEED recommends, never auto-executes irreversible actions.",
          ar: "إشراف بشري — تبقى القرارات التنفيذية بيد الإنسان؛ يقترح سَدِيد ولا ينفّذ القرارات غير القابلة للتراجع تلقائيًا.",
        },
        {
          en: "Transparency — every AI output carries provenance, model, and confidence metadata.",
          ar: "شفافية — كل مخرج للذكاء الاصطناعي يحمل المصدر والنموذج ودرجة الثقة.",
        },
        {
          en: "Fairness — bias testing on Arabic, English, and dialect inputs; periodic audits.",
          ar: "إنصاف — اختبارات تحيّز على المدخلات العربية والإنجليزية واللهجات مع تدقيق دوري.",
        },
        {
          en: "Safety — refusal taxonomy aligned with SDAIA Generative AI guidelines and EU AI Act Title III risk categories.",
          ar: "سلامة — تصنيف رفض متوافق مع إرشادات سدايا وقانون الذكاء الاصطناعي الأوروبي.",
        },
      ],
    },
    {
      titleEn: "2 · Data & training",
      titleAr: "2 · البيانات والتدريب",
      items: [
        {
          en: "Customer data is NEVER used to train foundation models. RAG operates on tenant-isolated indices.",
          ar: "لا تُستخدم بيانات العميل أبدًا لتدريب النماذج. يعمل RAG على فهارس معزولة لكل مستأجر.",
        },
        {
          en: "Intelligence inference uses Google Gemini only; ElevenLabs is isolated to speech output. Retention controls are applied where the provider supports them.",
          ar: "يستخدم الاستدلال الذكي Google Gemini فقط، بينما يُعزل ElevenLabs لإخراج الصوت. وتُطبّق ضوابط الاحتفاظ حيث يدعمها المزوّد.",
        },
      ],
    },
    {
      titleEn: "3 · Prohibited AI uses",
      titleAr: "3 · الاستخدامات المحظورة للذكاء الاصطناعي",
      items: [
        {
          en: "Social scoring of individuals, predictive policing, biometric mass surveillance, real-time emotion inference in workplaces.",
          ar: "التصنيف الاجتماعي للأفراد، الشرطة التنبؤية، المراقبة البيومترية الجماعية، استنتاج المشاعر الفوري في بيئات العمل.",
        },
        {
          en: "Fully automated denial of credit, employment, insurance, or government benefits.",
          ar: "الحرمان الآلي بالكامل من الائتمان أو التوظيف أو التأمين أو المزايا الحكومية.",
        },
      ],
    },
    {
      titleEn: "4 · Governance",
      titleAr: "4 · الحوكمة",
      items: [
        {
          en: "AI Risk Committee reviews new model deployments; quarterly red-team exercises.",
          ar: "لجنة مخاطر الذكاء الاصطناعي تراجع كل نشر جديد للنماذج مع تمارين Red Team ربع سنوية.",
        },
        {
          en: "Incidents reported to ai-safety@neexios.com and recorded in the audit log.",
          ar: "تُبلَّغ الحوادث إلى ai-safety@neexios.com وتُسجَّل في سجل التدقيق.",
        },
        {
          en: "Customers may disable Gemini intelligence or ElevenLabs speech independently without weakening tenant isolation.",
          ar: "يمكن للعميل تعطيل ذكاء Gemini أو صوت ElevenLabs بصورة مستقلة من دون إضعاف عزل المستأجرين.",
        },
      ],
    },
  ];

  return (
    <TrustShell
      isAr={isAr}
      active="/responsible-ai"
      eyebrow="Policy"
      eyebrowAr="سياسة"
      title="Responsible AI"
      titleAr="الذكاء الاصطناعي المسؤول"
      subtitle="How SADEED designs, deploys, and governs AI inside SADEED."
      subtitleAr="كيف يصمّم سَدِيد وينشر ويحوكم الذكاء الاصطناعي داخل سَدِيد."
      qualifier="Aligned with SDAIA Generative AI Guidelines, EU AI Act, and OECD AI Principles."
      qualifierAr="متوافق مع إرشادات سدايا للذكاء التوليدي، قانون الذكاء الاصطناعي الأوروبي، ومبادئ OECD."
    >
      <section className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: <Users className="h-4 w-4" />, en: "Human-in-the-loop", ar: "إشراف بشري" },
          { icon: <Sparkles className="h-4 w-4" />, en: "Transparent", ar: "شفافية" },
          { icon: <ShieldCheck className="h-4 w-4" />, en: "Safety-tested", ar: "اختبارات سلامة" },
          {
            icon: <Brain className="h-4 w-4" />,
            en: "No model training on tenant data",
            ar: "بلا تدريب على بيانات المستأجرين",
          },
        ].map((b, i) => (
          <Card key={i} className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg nx-holo-icon [--nx-holo-rgb:251_191_36] text-amber-200">
              {b.icon}
            </span>
            <span className="truncate text-xs uppercase tracking-[0.18em] text-foreground/90">
              {isAr ? b.ar : b.en}
            </span>
          </Card>
        ))}
      </section>
      <section>
        <SectionTitle
          isAr={isAr}
          en="Commitments"
          ar="الالتزامات"
          icon={<Brain className="h-4 w-4" />}
        />
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
