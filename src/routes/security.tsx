import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { DOMAIN_URL } from "@/lib/domain";
import { TrustShell, SectionTitle, Card, Bullets } from "@/components/trust-shell";
import {
  Lock,
  Shield,
  KeyRound,
  Network,
  Activity,
  AlertTriangle,
  Eye,
  Server,
  Database,
  Cpu,
  GitBranch,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [
      { title: "Security — Nexus AI OS" },
      {
        name: "description",
        content:
          "Defence-grade security controls for Nexus AI OS: encryption, identity, audit logging, business continuity, disaster recovery, incident response, and 99.9% uptime SLA.",
      },
      { property: "og:title", content: "Security — Nexus AI OS" },
      {
        property: "og:description",
        content: "Encryption, identity, audit, BCP/DR and incident response controls.",
      },
      { property: "og:url", content: `${DOMAIN_URL}/security` },
      { property: "og:image", content: `${DOMAIN_URL}/og-image.jpg` },
    ],
    links: [{ rel: "canonical", href: `${DOMAIN_URL}/security` }],
  }),
  component: SecurityPage,
});

function SecurityPage() {
  const { locale } = useI18n();
  const isAr = locale === "ar";

  const controls: {
    icon: React.ReactNode;
    titleEn: string;
    titleAr: string;
    items: { en: string; ar: string }[];
  }[] = [
    {
      icon: <Lock className="h-5 w-5" />,
      titleEn: "Encryption",
      titleAr: "التشفير",
      items: [
        {
          en: "TLS 1.3 in transit, HSTS, and TLS pinning for enterprise tenants.",
          ar: "TLS 1.3 أثناء النقل مع HSTS وتثبيت الشهادات للعملاء المؤسسيين.",
        },
        {
          en: "AES-256 at rest for databases, object storage, and backups.",
          ar: "AES-256 لقواعد البيانات والتخزين والنُسخ الاحتياطية.",
        },
        {
          en: "Per-tenant envelope encryption with KMS-managed keys; BYOK on enterprise.",
          ar: "تشفير المظاريف لكل مستأجر بمفاتيح KMS؛ وBYOK في الباقة المؤسسية.",
        },
        {
          en: "Field-level encryption available for designated PII columns.",
          ar: "تشفير على مستوى الحقل للأعمدة الحساسة.",
        },
      ],
    },
    {
      icon: <KeyRound className="h-5 w-5" />,
      titleEn: "Identity & Access",
      titleAr: "الهوية والوصول",
      items: [
        {
          en: "Email, Google, and SAML SSO; SCIM provisioning on enterprise.",
          ar: "تسجيل دخول بالبريد وGoogle وSAML SSO؛ مع SCIM في الباقة المؤسسية.",
        },
        {
          en: "Row-level security in the data layer with role-based access.",
          ar: "أمان على مستوى الصف مع التحكم بالصلاحيات.",
        },
        {
          en: "Optional MFA enforcement and per-workspace IP allow-listing.",
          ar: "تحقق متعدد العوامل وقوائم IP مسموح بها لكل مساحة عمل.",
        },
        {
          en: "Least-privilege admin model; production access brokered and time-bounded.",
          ar: "نموذج أقل صلاحية، والوصول للإنتاج محدود زمنيًا ومسجَّل.",
        },
      ],
    },
    {
      icon: <Network className="h-5 w-5" />,
      titleEn: "Network Security",
      titleAr: "أمن الشبكة",
      items: [
        {
          en: "Private VPC isolation per environment; no public database endpoints.",
          ar: "عزل VPC خاص لكل بيئة دون نقاط وصول عامة لقواعد البيانات.",
        },
        {
          en: "WAF, DDoS protection, and rate limiting at the edge.",
          ar: "جدار حماية تطبيقات وحماية DDoS وتحديد معدلات على الحافة.",
        },
        {
          en: "Egress filtering and signed inter-service communication.",
          ar: "تصفية الخروج واتصال موقّع بين الخدمات.",
        },
      ],
    },
    {
      icon: <Activity className="h-5 w-5" />,
      titleEn: "Audit Logging",
      titleAr: "سجلات التدقيق",
      items: [
        {
          en: "Tamper-evident trail for auth, role changes, and data access events.",
          ar: "سجل محصّن ضد العبث لأحداث الدخول والصلاحيات والوصول للبيانات.",
        },
        {
          en: "Customer-exportable logs; SIEM streaming via webhook on enterprise.",
          ar: "تصدير السجلات وتوجيهها إلى SIEM عبر Webhook.",
        },
        {
          en: "Configurable retention to match regulator requirements.",
          ar: "فترات احتفاظ قابلة للضبط وفق متطلبات الجهات التنظيمية.",
        },
      ],
    },
    {
      icon: <Eye className="h-5 w-5" />,
      titleEn: "Application Security",
      titleAr: "أمن التطبيقات",
      items: [
        {
          en: "Secure SDLC with peer review, dependency scanning, and secret detection in CI.",
          ar: "دورة تطوير آمنة مع مراجعة الكود وفحص التبعيات واكتشاف الأسرار في CI.",
        },
        {
          en: "Annual independent penetration test; remediation tracked to closure.",
          ar: "اختبار اختراق سنوي مستقل ومتابعة المعالجة حتى الإغلاق.",
        },
        {
          en: "Coordinated vulnerability disclosure channel for researchers.",
          ar: "قناة منسقة للإفصاح عن الثغرات للباحثين.",
        },
      ],
    },
    {
      icon: <Cpu className="h-5 w-5" />,
      titleEn: "AI & Model Security",
      titleAr: "أمن الذكاء الاصطناعي",
      items: [
        {
          en: "Customer data is not used to train shared models.",
          ar: "لا تُستخدم بيانات العملاء لتدريب نماذج مشتركة.",
        },
        {
          en: "Prompt-injection defences, output filtering, and tool-use sandboxing for ARIA agents.",
          ar: "حماية من حقن الموجّهات وتصفية المخرجات وعزل الأدوات لوكلاء ARIA.",
        },
        {
          en: "Human-in-the-loop approval gates for high-impact autonomous actions.",
          ar: "موافقة بشرية للقرارات الذاتية ذات الأثر العالي.",
        },
      ],
    },
    {
      icon: <Server className="h-5 w-5" />,
      titleEn: "Business Continuity (BCP)",
      titleAr: "استمرارية الأعمال",
      items: [
        {
          en: "Multi-AZ active-active architecture for the production control plane.",
          ar: "بنية متعددة المناطق نشطة-نشطة لطبقة التحكم في الإنتاج.",
        },
        {
          en: "Documented continuity plan reviewed and exercised annually.",
          ar: "خطة استمرارية موثقة تُراجَع وتُختَبر سنويًا.",
        },
        {
          en: "Critical-vendor failover playbooks for identity, email, and infrastructure.",
          ar: "خطط بديلة لمورّدي الهوية والبريد والبنية التحتية.",
        },
      ],
    },
    {
      icon: <Database className="h-5 w-5" />,
      titleEn: "Disaster Recovery (DR)",
      titleAr: "التعافي من الكوارث",
      items: [
        {
          en: "RPO ≤ 15 minutes, RTO ≤ 4 hours for tier-1 services.",
          ar: "هدف نقطة الاستعادة ≤ 15 دقيقة، وهدف زمن الاستعادة ≤ 4 ساعات للخدمات من الفئة الأولى.",
        },
        {
          en: "Encrypted, geo-isolated backups with integrity testing on a defined cadence.",
          ar: "نسخ احتياطية مشفرة ومعزولة جغرافيًا مع اختبار سلامة دوري.",
        },
        {
          en: "Annual full-region failover exercise with post-exercise report.",
          ar: "تمرين تحوّل سنوي كامل بين المناطق مع تقرير ما بعد التمرين.",
        },
      ],
    },
    {
      icon: <AlertTriangle className="h-5 w-5" />,
      titleEn: "Incident Response",
      titleAr: "الاستجابة للحوادث",
      items: [
        {
          en: "Documented runbooks with named on-call roles and severity tiers (SEV-1 → SEV-4).",
          ar: "إجراءات موثّقة مع أدوار مناوبة وتصنيف للحدّة (SEV-1 → SEV-4).",
        },
        {
          en: "Customer breach notification within 72 hours of confirmed compromise, or sooner if contractually required.",
          ar: "إشعار العملاء خلال 72 ساعة من تأكيد الاختراق، أو أسرع بحسب التعاقد.",
        },
        {
          en: "Post-incident review (RCA) shared with affected customers.",
          ar: "تحليل جذري لما بعد الحادث يُشارك مع العملاء المعنيين.",
        },
      ],
    },
    {
      icon: <GitBranch className="h-5 w-5" />,
      titleEn: "Change Management",
      titleAr: "إدارة التغيير",
      items: [
        {
          en: "Peer-reviewed pull requests with automated tests and security checks.",
          ar: "مراجعة الأقران مع اختبارات آلية وفحوصات أمنية.",
        },
        {
          en: "Progressive rollout with health-based automated rollback.",
          ar: "إصدارات تدريجية مع تراجع آلي يعتمد على الصحة.",
        },
        {
          en: "Emergency-change protocol with retrospective review.",
          ar: "بروتوكول تغيير طارئ مع مراجعة لاحقة.",
        },
      ],
    },
    {
      icon: <Users className="h-5 w-5" />,
      titleEn: "Personnel Security",
      titleAr: "أمن الأفراد",
      items: [
        {
          en: "Background checks where legally permitted; annual security awareness training.",
          ar: "فحوصات الخلفية حيثما يجيز النظام، وتدريب توعوي سنوي.",
        },
        {
          en: "Confidentiality agreements and acceptable-use policy for all staff.",
          ar: "اتفاقيات سرية وسياسة استخدام مقبول لجميع الموظفين.",
        },
        {
          en: "Off-boarding revokes access within one business hour of departure.",
          ar: "إلغاء الصلاحيات خلال ساعة عمل واحدة بعد المغادرة.",
        },
      ],
    },
    {
      icon: <Shield className="h-5 w-5" />,
      titleEn: "Monitoring & Detection",
      titleAr: "المراقبة والاكتشاف",
      items: [
        {
          en: "24/7 telemetry pipeline with anomaly detection and alerting.",
          ar: "خط قياس بياني على مدار الساعة مع اكتشاف الشذوذ والتنبيهات.",
        },
        {
          en: "Endpoint detection on production-adjacent workstations.",
          ar: "اكتشاف نقاط النهاية على أجهزة العاملين المتصلين بالإنتاج.",
        },
        {
          en: "Threat-intel feeds reviewed and triaged by the security team.",
          ar: "تغذية معلومات التهديدات تراجَع وتُصنَّف من فريق الأمن.",
        },
      ],
    },
  ];

  return (
    <TrustShell
      isAr={isAr}
      active="/security"
      eyebrow="Defence-grade controls"
      eyebrowAr="ضوابط من الدرجة الدفاعية"
      title="Security at NEXUS"
      titleAr="الأمن في NEXUS"
      subtitle="A layered control model spanning encryption, identity, network, application, AI, and human factors — designed for sovereign-grade workloads and Fortune-500 procurement."
      subtitleAr="نموذج ضوابط متعدد الطبقات يشمل التشفير والهوية والشبكة والتطبيقات والذكاء الاصطناعي والعنصر البشري — مُصمَّم للأعباء السيادية ومتطلبات أكبر المؤسسات."
      qualifier="This page is maintained by the NEXUS team and summarizes enabled controls. It is not an independent attestation; audit reports are available under NDA."
      qualifierAr="هذه الصفحة يحرّرها فريق NEXUS وتلخّص الضوابط المُفعّلة. ليست شهادة مستقلة؛ تتوفر تقارير التدقيق بموجب اتفاقية عدم إفصاح."
    >
      <section className="mb-10">
        <SectionTitle
          isAr={isAr}
          en="Security Controls"
          ar="ضوابط الأمن"
          icon={<Shield className="h-4 w-4" />}
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {controls.map((c) => (
            <Card key={c.titleEn}>
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-400/10 text-amber-200">
                  {c.icon}
                </span>
                <h3 className="truncate text-sm font-medium uppercase tracking-[0.16em] text-foreground/90 sm:tracking-[0.18em]">
                  {isAr ? c.titleAr : c.titleEn}
                </h3>
              </div>
              <div className="mt-4">
                <Bullets items={c.items} isAr={isAr} />
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <SectionTitle isAr={isAr} en="Resilience Targets" ar="أهداف الصمود" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { v: "99.9%", en: "Monthly uptime", ar: "التوفر الشهري" },
            { v: "≤ 15m", en: "RPO (data loss)", ar: "هدف نقطة الاستعادة" },
            { v: "≤ 4h", en: "RTO (recovery time)", ar: "هدف زمن الاستعادة" },
            { v: "≤ 72h", en: "Breach notification", ar: "الإخطار بالخروقات" },
          ].map((m) => (
            <Card key={m.v} className="text-center">
              <div className="bg-gradient-to-b from-amber-200 to-amber-400 bg-clip-text text-2xl font-semibold text-transparent sm:text-3xl">
                {m.v}
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:text-xs">
                {isAr ? m.ar : m.en}
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5 text-sm text-muted-foreground sm:p-6">
        {isAr
          ? "للحصول على استبيانات الأمن المؤسسية (CAIQ / SIG)، أو تقارير الاختراق، أو خطة BCP/DR التفصيلية، تواصل مع "
          : "For enterprise security questionnaires (CAIQ / SIG), penetration-test letters, or the full BCP/DR plan, contact "}
        <a className="text-amber-200 hover:underline" href="mailto:security@nexus-ai-os.com">
          security@nexus-ai-os.com
        </a>
        .
      </section>
    </TrustShell>
  );
}
