import { createFileRoute, Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { DOMAIN_URL } from "@/lib/domain";
import {
  ArrowLeft,
  Shield,
  Lock,
  Server,
  FileCheck,
  AlertTriangle,
  Eye,
  Mail,
  Globe,
  KeyRound,
  Database,
  Users,
  Activity,
  ScrollText,
  Building2,
} from "lucide-react";

export const Route = createFileRoute("/trust")({
  head: () => ({
    meta: [
      { title: "Trust & Security — NEXIOS AI OS" },
      {
        name: "description",
        content:
          "Trust, security, and compliance posture for NEXIOS AI OS — designed to align with SOC 2, ISO 27001, NCA ECC, and Saudi PDPL. Certifications in progress. Covers data residency, encryption, audit logging, and incident response.",
      },
      { property: "og:title", content: "Trust & Security — NEXIOS AI OS" },
      { property: "og:description", content: "Procurement-ready security & compliance overview." },
      { property: "og:url", content: `${DOMAIN_URL}/trust` },
      { property: "og:image", content: `${DOMAIN_URL}/og-image.jpg` },
    ],
    links: [{ rel: "canonical", href: `${DOMAIN_URL}/trust` }],
  }),
  component: TrustPage,
});

/* --------------------------------- Data ---------------------------------- */

type Status = "aligned" | "in-progress" | "operational";

function StatusPill({ status, isAr }: { status: Status; isAr: boolean }) {
  const map = {
    aligned: {
      en: "Aligned",
      ar: "متوافق",
      cls: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    },
    "in-progress": {
      en: "Pending certification",
      ar: "قيد الاعتماد",
      cls: "border-amber-400/30 bg-amber-400/10 text-amber-200",
    },
    operational: {
      en: "Operational",
      ar: "مُفعّل",
      cls: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200",
    },
  } as const;
  const v = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-[0.18em] ${v.cls}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {isAr ? v.ar : v.en}
    </span>
  );
}

/* -------------------------------- Page ----------------------------------- */

function TrustPage() {
  const { locale } = useI18n();
  const isAr = locale === "ar";

  const frameworks: {
    id: string;
    nameEn: string;
    nameAr: string;
    descEn: string;
    descAr: string;
    status: Status;
  }[] = [
    {
      id: "soc2",
      nameEn: "SOC 2 Type II",
      nameAr: "SOC 2 من النوع الثاني",
      descEn:
        "Security, availability, and confidentiality controls aligned with AICPA Trust Services Criteria. Independent audit engagement scheduled.",
      descAr: "ضوابط الأمن والتوفر والسرية وفق معايير AICPA. مع جدولة تدقيق مستقل.",
      status: "in-progress",
    },
    {
      id: "iso",
      nameEn: "ISO/IEC 27001:2022",
      nameAr: "آيزو/IEC 27001:2022",
      descEn:
        "Information security management system structured against the Annex A control set, with policies, risk register, and Statement of Applicability maintained.",
      descAr:
        "نظام إدارة أمن المعلومات وفق ضوابط الملحق (أ)، مع سياسات وسجل مخاطر وبيان قابلية تطبيق.",
      status: "in-progress",
    },
    {
      id: "nca",
      nameEn: "NCA Essential Cybersecurity Controls (ECC-1:2018)",
      nameAr: "الضوابط الأساسية للأمن السيبراني NCA ECC",
      descEn:
        "Mapped to the Saudi National Cybersecurity Authority Essential Controls across governance, defence, resilience, and third-party domains.",
      descAr:
        "متوافق مع ضوابط الهيئة الوطنية للأمن السيبراني في الحوكمة والدفاع والصمود وأطراف ثالثة.",
      status: "aligned",
    },
    {
      id: "ccc",
      nameEn: "NCA Cloud Cybersecurity Controls (CCC-1:2020)",
      nameAr: "ضوابط الأمن السيبراني للحوسبة السحابية NCA CCC",
      descEn:
        "Cloud-tenant and CSP responsibilities documented per the NCA shared-responsibility model.",
      descAr: "توثيق مسؤوليات المستأجر ومزود الخدمة وفق نموذج المسؤولية المشتركة.",
      status: "aligned",
    },
    {
      id: "pdpl",
      nameEn: "Saudi PDPL",
      nameAr: "نظام حماية البيانات الشخصية (PDPL)",
      descEn:
        "Personal Data Protection Law obligations addressed for lawful basis, data subject rights, cross-border transfer review, and breach notification.",
      descAr:
        "الالتزامات وفق نظام حماية البيانات الشخصية: الأساس النظامي، حقوق أصحاب البيانات، نقل البيانات، والإخطار بالخروقات.",
      status: "aligned",
    },
    {
      id: "vision",
      nameEn: "Saudi Vision 2030 Alignment",
      nameAr: "التوافق مع رؤية المملكة 2030",
      descEn:
        "Built for Kingdom digital-sovereignty, Arabic-first AI, and the National Strategy for Data & AI (NSDAI) objectives.",
      descAr:
        "مُصمَّم لدعم السيادة الرقمية للمملكة، والذكاء الاصطناعي بالعربية، وأهداف الاستراتيجية الوطنية للبيانات والذكاء الاصطناعي.",
      status: "aligned",
    },
    {
      id: "gdpr",
      nameEn: "GDPR (EU customers)",
      nameAr: "GDPR (للعملاء في الاتحاد الأوروبي)",
      descEn:
        "Data Processing Addendum, Standard Contractual Clauses, and EEA transfer review available on request.",
      descAr:
        "ملحق معالجة البيانات والشروط التعاقدية القياسية ومراجعة نقل البيانات متوفرة عند الطلب.",
      status: "aligned",
    },
    {
      id: "hipaa",
      nameEn: "HIPAA-aware (healthcare deployments)",
      nameAr: "HIPAA (للنشر في القطاع الصحي)",
      descEn:
        "Technical, administrative, and physical safeguards configurable for covered-entity engagements. BAA available under enterprise plan.",
      descAr:
        "ضوابط تقنية وإدارية ومادية قابلة للتفعيل في القطاع الصحي. اتفاقية BAA ضمن الباقة المؤسسية.",
      status: "in-progress",
    },
  ];

  const controls: {
    icon: React.ReactNode;
    titleEn: string;
    titleAr: string;
    bullets: { en: string; ar: string }[];
  }[] = [
    {
      icon: <Lock className="h-5 w-5" />,
      titleEn: "Encryption",
      titleAr: "التشفير",
      bullets: [
        {
          en: "TLS 1.3 in transit, with HSTS and TLS pinning on enterprise tenants.",
          ar: "تشفير TLS 1.3 أثناء النقل مع HSTS وتثبيت الشهادات للعملاء المؤسسيين.",
        },
        {
          en: "AES-256 at rest for primary stores, object storage, and backups.",
          ar: "AES-256 لتخزين البيانات والنُسخ الاحتياطية.",
        },
        {
          en: "Per-tenant envelope encryption with KMS-managed keys; BYOK on enterprise plan.",
          ar: "تشفير المظاريف لكل مستأجر بمفاتيح KMS، مع دعم BYOK في الباقة المؤسسية.",
        },
        {
          en: "Field-level encryption for designated PII columns.",
          ar: "تشفير على مستوى الحقل للأعمدة الحساسة.",
        },
      ],
    },
    {
      icon: <Server className="h-5 w-5" />,
      titleEn: "Data Residency",
      titleAr: "موقع تخزين البيانات",
      bullets: [
        {
          en: "Kingdom of Saudi Arabia regional hosting for KSA tenants; EU and US regions available.",
          ar: "استضافة داخل المملكة العربية السعودية للعملاء المحليين، مع توفر مناطق الاتحاد الأوروبي والولايات المتحدة.",
        },
        {
          en: "Sovereign-deployment option for government and regulated industries.",
          ar: "خيار النشر السيادي للجهات الحكومية والقطاعات المنظمة.",
        },
        {
          en: "No cross-border movement of customer data without contractual authorization.",
          ar: "لا يتم نقل بيانات العملاء خارج الحدود دون تفويض تعاقدي.",
        },
      ],
    },
    {
      icon: <KeyRound className="h-5 w-5" />,
      titleEn: "Identity & Access",
      titleAr: "الهوية والوصول",
      bullets: [
        {
          en: "Email, Google, and SAML SSO; SCIM provisioning on enterprise plan.",
          ar: "تسجيل دخول بالبريد وGoogle وSAML SSO؛ مع SCIM في الباقة المؤسسية.",
        },
        {
          en: "Role-based access control backed by row-level security in the data layer.",
          ar: "تحكم بالصلاحيات مع أمان على مستوى الصف في طبقة البيانات.",
        },
        {
          en: "Optional MFA enforcement and IP allow-listing per workspace.",
          ar: "خيارات التحقق متعدد العوامل وقوائم IP المسموح بها.",
        },
        {
          en: "Least-privilege admin model; production access is brokered and time-bounded.",
          ar: "نموذج أقل صلاحية ممكنة، والوصول للإنتاج محدود زمنيًا ومُسجَّل.",
        },
      ],
    },
    {
      icon: <Activity className="h-5 w-5" />,
      titleEn: "Audit Logging",
      titleAr: "سجلات التدقيق",
      bullets: [
        {
          en: "Tamper-evident audit trail for authentication, role changes, and data access events.",
          ar: "سجل تدقيق محصّن ضد العبث لأحداث الدخول والصلاحيات والوصول للبيانات.",
        },
        {
          en: "Customer-exportable logs; SIEM streaming via webhook on enterprise plan.",
          ar: "إمكانية تصدير السجلات وتوجيهها إلى SIEM عبر Webhook.",
        },
        {
          en: "Configurable retention windows aligned to regulator requirements.",
          ar: "فترات احتفاظ قابلة للضبط وفق متطلبات الجهات التنظيمية.",
        },
      ],
    },
    {
      icon: <AlertTriangle className="h-5 w-5" />,
      titleEn: "Incident Response",
      titleAr: "الاستجابة للحوادث",
      bullets: [
        {
          en: "Documented runbooks with named on-call roles and severity tiers.",
          ar: "إجراءات موثّقة مع أدوار مناوبة وتصنيف للحدّة.",
        },
        {
          en: "Customer breach notification within 72 hours of confirmed compromise, or sooner if contractually required.",
          ar: "إشعار العملاء خلال 72 ساعة من تأكيد الاختراق، أو أسرع بحسب التعاقد.",
        },
        {
          en: "Post-incident review shared with affected customers.",
          ar: "تقرير ما بعد الحادث يُشارك مع العملاء المعنيين.",
        },
      ],
    },
    {
      icon: <Database className="h-5 w-5" />,
      titleEn: "Data Lifecycle",
      titleAr: "دورة حياة البيانات",
      bullets: [
        {
          en: "Backups encrypted, geo-isolated where applicable, and integrity-tested on a defined cadence.",
          ar: "نسخ احتياطية مشفرة ومعزولة جغرافيًا واختبار سلامة دوري.",
        },
        {
          en: "Customer-initiated export and deletion via authenticated request.",
          ar: "تصدير وحذف البيانات بطلب موثّق من العميل.",
        },
        {
          en: "Sub-30-day deletion of customer data after contract termination, unless retention is legally required.",
          ar: "حذف بيانات العملاء خلال أقل من 30 يومًا بعد انتهاء التعاقد، ما لم يستلزم النظام خلاف ذلك.",
        },
      ],
    },
    {
      icon: <Eye className="h-5 w-5" />,
      titleEn: "Application Security",
      titleAr: "أمن التطبيقات",
      bullets: [
        {
          en: "Secure SDLC with code review, dependency scanning, and secret detection in CI.",
          ar: "دورة تطوير آمنة مع مراجعة الكود وفحص التبعيات واكتشاف الأسرار في CI.",
        },
        {
          en: "Annual third-party penetration test; remediation tracked to closure.",
          ar: "اختبار اختراق سنوي من طرف ثالث ومتابعة المعالجة حتى الإغلاق.",
        },
        {
          en: "Coordinated vulnerability disclosure channel for researchers.",
          ar: "قناة منسقة للإفصاح عن الثغرات للباحثين.",
        },
      ],
    },
    {
      icon: <Users className="h-5 w-5" />,
      titleEn: "Personnel & Vendors",
      titleAr: "الأفراد والموردون",
      bullets: [
        {
          en: "Background checks where legally permitted; annual security awareness training.",
          ar: "فحوصات الخلفية حيثما يجيز النظام، وتدريب توعوي سنوي.",
        },
        {
          en: "Subprocessor due diligence and contractual data-protection terms.",
          ar: "تقييم المورّدين والشروط التعاقدية لحماية البيانات.",
        },
        {
          en: "Production change-management with peer approval.",
          ar: "إدارة التغيير في الإنتاج مع موافقة الزملاء.",
        },
      ],
    },
  ];

  return (
    <div
      dir={isAr ? "rtl" : "ltr"}
      className="relative min-h-screen overflow-hidden bg-[#06070d] text-foreground"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(214,158,46,0.10),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(56,189,248,0.06),transparent_60%)]" />
        <div className="absolute inset-0 [background-image:linear-gradient(rgba(214,158,46,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(214,158,46,0.05)_1px,transparent_1px)] [background-size:56px_56px] opacity-25" />
      </div>

      <header className="relative z-10 mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-5 sm:px-6 sm:py-6">
        <Link
          to="/"
          className="inline-flex min-w-0 items-center gap-2 truncate text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className={`h-4 w-4 shrink-0 ${isAr ? "rotate-180" : ""}`} />
          {isAr ? "العودة" : "Back"}
        </Link>
        <div className="text-[10px] uppercase tracking-[0.28em] text-amber-300/70 sm:text-xs sm:tracking-[0.32em]">
          {isAr ? "الثقة والأمان" : "Trust & Security"}
        </div>
      </header>

      <nav className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        <div className="-mx-1 flex gap-1 overflow-x-auto pb-2 sm:gap-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[
            { to: "/trust", en: "Trust", ar: "الثقة", active: true },
            { to: "/security", en: "Security", ar: "الأمن", active: false },
            { to: "/dpa", en: "DPA", ar: "ملحق المعالجة", active: false },
            { to: "/subprocessors", en: "Subprocessors", ar: "المورّدون الفرعيون", active: false },
            { to: "/sla", en: "SLA", ar: "اتفاقية الخدمة", active: false },
          ].map((t) => (
            <Link
              key={t.to}
              to={t.to}
              className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] transition sm:text-xs ${
                t.active
                  ? "border-amber-400/40 bg-amber-400/10 text-amber-200"
                  : "border-white/10 bg-white/[0.02] text-muted-foreground hover:border-amber-400/25 hover:text-foreground"
              }`}
            >
              {isAr ? t.ar : t.en}
            </Link>
          ))}
        </div>
      </nav>

      <main className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        {/* HERO */}
        <section className="mb-12 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-amber-300/80">
            <Shield className="h-3.5 w-3.5" />{" "}
            {isAr
              ? "جاهز للمشتريات المؤسسية والحكومية"
              : "Enterprise & Government Procurement Ready"}
          </div>
          <h1 className="mt-5 bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-4xl font-semibold leading-tight text-transparent sm:text-5xl">
            {isAr ? "الثقة والأمان في NEXIOS" : "Trust at NEXIOS"}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {isAr
              ? "صُممت NEXIOS AI OS لمتطلبات الجهات السيادية والمؤسسات الكبرى: صلاحيات بأقل امتياز، عزل مؤسسي، تشفير وتدقيق وفق الضوابط المثبتة لبيئة النشر، وبوابة تمنع الإنتاج حتى اعتماد الإقامة والمعالجات الفرعية."
              : "NEXIOS AI OS is designed for sovereign and enterprise procurement: least privilege, tenant isolation, deployment-verified encryption and auditing, and an activation gate that blocks production until residency and subprocessors are approved."}
          </p>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground/70">
            {isAr
              ? "هذه الصفحة يحرّرها فريق NEXIOS لتلخيص الضوابط المُفعّلة وممارسات الأمان. ليست شهادة أو تدقيقًا مستقلاً. تتوفر تقارير التدقيق وملحق معالجة البيانات (DPA) وقائمة المورّدين الفرعيين بموجب اتفاقية عدم إفصاح."
              : "This page is maintained by the NEXIOS team to summarize enabled controls and current practices. It is not an independent attestation. Audit reports, DPA, and subprocessor list are available under NDA."}
          </p>
        </section>

        {/* COMPLIANCE GRID */}
        <section className="mb-12">
          <SectionTitle
            isAr={isAr}
            en="Compliance & Frameworks"
            ar="الالتزام والأطر التنظيمية"
            icon={<FileCheck className="h-4 w-4" />}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {frameworks.map((f) => (
              <div
                key={f.id}
                className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] p-5 transition hover:border-amber-400/25 hover:bg-white/[0.04]"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-medium text-foreground">
                    {isAr ? f.nameAr : f.nameEn}
                  </h3>
                  <StatusPill status={f.status} isAr={isAr} />
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {isAr ? f.descAr : f.descEn}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground/70">
            {isAr
              ? "«متوافق» تعني أن الضوابط مطبّقة ومُوثّقة. «قيد الاعتماد» تعني أن التدقيق المستقل قيد الإعداد ولم تصدر الشهادة بعد."
              : "“Aligned” means the controls are implemented and documented. “Pending certification” means independent audit is in preparation and no certificate has issued yet."}
          </p>
        </section>

        {/* CONTROLS */}
        <section className="mb-12">
          <SectionTitle
            isAr={isAr}
            en="Security Controls"
            ar="ضوابط الأمن"
            icon={<Shield className="h-4 w-4" />}
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {controls.map((c) => (
              <div
                key={c.titleEn}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-6"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400/10 text-amber-200">
                    {c.icon}
                  </span>
                  <h3 className="text-sm font-medium uppercase tracking-[0.18em] text-foreground/90">
                    {isAr ? c.titleAr : c.titleEn}
                  </h3>
                </div>
                <ul className="mt-4 space-y-2.5">
                  {c.bullets.map((b, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground"
                    >
                      <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-amber-300/80" />
                      <span>{isAr ? b.ar : b.en}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* SHARED RESPONSIBILITY */}
        <section className="mb-12">
          <SectionTitle
            isAr={isAr}
            en="Shared Responsibility"
            ar="المسؤولية المشتركة"
            icon={<Building2 className="h-4 w-4" />}
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <RespCard
              title={isAr ? "NEXIOS" : "NEXIOS"}
              items={
                isAr
                  ? [
                      "أمن المنصة والبنية التحتية",
                      "التشفير وإدارة المفاتيح",
                      "المراقبة والاستجابة للحوادث",
                      "الالتزام التنظيمي للمنصة",
                    ]
                  : [
                      "Platform & infrastructure security",
                      "Encryption & key management",
                      "Monitoring & incident response",
                      "Platform-level compliance",
                    ]
              }
            />
            <RespCard
              title={isAr ? "مزود البنية السحابية" : "Cloud Provider"}
              items={
                isAr
                  ? [
                      "أمن مراكز البيانات",
                      "أمن الشبكة والاستضافة",
                      "الأجهزة والتجزئة المنطقية",
                      "شهادات التشغيل السحابي",
                    ]
                  : [
                      "Physical data-center security",
                      "Network & hypervisor security",
                      "Hardware & logical isolation",
                      "Cloud operating certifications",
                    ]
              }
            />
            <RespCard
              title={isAr ? "العميل" : "Customer"}
              items={
                isAr
                  ? [
                      "إدارة المستخدمين والصلاحيات",
                      "تكوين سياسات SSO وMFA",
                      "تصنيف البيانات داخل المساحة",
                      "الاستخدام السليم وفق العقد",
                    ]
                  : [
                      "User & role administration",
                      "SSO & MFA policy configuration",
                      "Data classification inside the workspace",
                      "Acceptable-use under contract",
                    ]
              }
            />
          </div>
        </section>

        {/* VISION 2030 */}
        <section className="mb-12">
          <div className="overflow-hidden rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-400/[0.06] via-white/[0.02] to-transparent p-8">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-amber-300/80">
              <Globe className="h-4 w-4" />{" "}
              {isAr ? "التوافق مع رؤية 2030" : "Saudi Vision 2030 Alignment"}
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-foreground sm:text-3xl">
              {isAr ? "بُني للسيادة الرقمية للمملكة" : "Built for Kingdom digital sovereignty"}
            </h2>
            <div className="mt-5 grid grid-cols-1 gap-4 text-sm text-muted-foreground sm:grid-cols-3">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-amber-200/80">
                  {isAr ? "اقتصاد رقمي" : "Digital Economy"}
                </div>
                <p className="mt-2">
                  {isAr
                    ? "منصة ذكاء تنفيذية تُعيد توطين القرار داخل المؤسسات الوطنية."
                    : "An executive intelligence platform that localizes decision-making inside national enterprises."}
                </p>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-amber-200/80">
                  {isAr ? "السيادة على البيانات" : "Data Sovereignty"}
                </div>
                <p className="mt-2">
                  {isAr
                    ? "خيارات نشر داخل المملكة مع تحكم العميل في موقع وتخزين بياناته."
                    : "In-Kingdom deployment options with customer control over data location and storage."}
                </p>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-amber-200/80">
                  {isAr ? "الكفاءات الوطنية" : "National Talent"}
                </div>
                <p className="mt-2">
                  {isAr
                    ? "تشغيل ARIA بالعربية أولًا، ودعم فرق الذكاء الاصطناعي والأمن المحلية."
                    : "Arabic-first ARIA operation and support for local AI and security teams."}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CONTACT */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <ContactCard
            icon={<Mail className="h-5 w-5" />}
            titleEn="Security Contact"
            titleAr="فريق الأمان"
            isAr={isAr}
            valueEn="security@nexus-ai-os.com"
            valueAr="security@nexus-ai-os.com"
            descEn="Report security concerns, suspected vulnerabilities, or coordinate disclosure."
            descAr="للإبلاغ عن أي ملاحظة أمنية أو ثغرة محتملة أو تنسيق إفصاح."
            href="mailto:security@nexus-ai-os.com"
          />
          <ContactCard
            icon={<ScrollText className="h-5 w-5" />}
            titleEn="Privacy & DPO"
            titleAr="الخصوصية ومسؤول حماية البيانات"
            isAr={isAr}
            valueEn="privacy@neexios.com"
            valueAr="privacy@neexios.com"
            descEn="Data subject requests, DPA, subprocessors, and PDPL inquiries."
            descAr="طلبات أصحاب البيانات وملحق المعالجة وقائمة المورّدين الفرعيين."
            href="mailto:privacy@neexios.com"
          />
          <ContactCard
            icon={<AlertTriangle className="h-5 w-5" />}
            titleEn="Incident Hotline (24/7)"
            titleAr="خط الحوادث على مدار الساعة"
            isAr={isAr}
            valueEn="soc@nexus-ai-os.com"
            valueAr="soc@nexus-ai-os.com"
            descEn="For confirmed or suspected security incidents involving NEXIOS services."
            descAr="للحوادث الأمنية المؤكدة أو المشتبه بها المتعلقة بخدمات NEXIOS."
            href="mailto:soc@nexus-ai-os.com"
          />
        </section>

        <section className="mt-12 rounded-xl border border-white/10 bg-white/[0.02] p-6 text-sm text-muted-foreground">
          <p>
            {isAr
              ? "للحصول على ملحق معالجة البيانات (DPA)، تقارير التدقيق، قائمة المورّدين الفرعيين، أو استبيانات الأمن المؤسسية (CAIQ/SIG)، تواصل مع فريق الأمان أو احجز جلسة تنفيذية."
              : "To request the DPA, audit reports, subprocessor list, or enterprise security questionnaires (CAIQ / SIG), contact the security team or schedule an executive briefing."}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to="/executive-briefing"
              className="rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-2 text-xs font-medium text-[#0a0a0f] hover:from-amber-300 hover:to-amber-400"
            >
              {isAr ? "احجز جلسة تنفيذية" : "Schedule Executive Briefing"}
            </Link>
            <a
              href="mailto:security@nexus-ai-os.com"
              className="rounded-lg border border-amber-400/25 px-4 py-2 text-xs text-amber-200 hover:bg-amber-400/[0.06]"
            >
              {isAr ? "طلب وثائق الامتثال" : "Request Compliance Pack"}
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}

/* ------------------------------ Subviews ------------------------------- */

function SectionTitle({
  isAr,
  en,
  ar,
  icon,
}: {
  isAr: boolean;
  en: string;
  ar: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-amber-300/80">
      {icon}
      {isAr ? ar : en}
    </div>
  );
}

function RespCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
      <h3 className="text-sm font-medium uppercase tracking-[0.18em] text-amber-200/90">{title}</h3>
      <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
        {items.map((i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-amber-300/70" />
            <span>{i}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ContactCard({
  icon,
  titleEn,
  titleAr,
  valueEn,
  valueAr,
  descEn,
  descAr,
  href,
  isAr,
}: {
  icon: React.ReactNode;
  titleEn: string;
  titleAr: string;
  valueEn: string;
  valueAr: string;
  descEn: string;
  descAr: string;
  href: string;
  isAr: boolean;
}) {
  return (
    <a
      href={href}
      className="group block rounded-xl border border-white/10 bg-white/[0.02] p-6 transition hover:border-amber-400/25 hover:bg-white/[0.04]"
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400/10 text-amber-200">
          {icon}
        </span>
        <h3 className="text-sm font-medium uppercase tracking-[0.18em] text-foreground/90">
          {isAr ? titleAr : titleEn}
        </h3>
      </div>
      <div className="mt-3 font-mono text-sm text-amber-200">{isAr ? valueAr : valueEn}</div>
      <p className="mt-2 text-sm text-muted-foreground">{isAr ? descAr : descEn}</p>
    </a>
  );
}
