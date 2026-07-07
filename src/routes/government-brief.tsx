import { createFileRoute, Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { DOMAIN_URL } from "@/lib/domain";
import { ArrowLeft, Download, Shield, Globe2, Building2, Cpu, FileCheck2, Landmark, FileText } from "lucide-react";

export const Route = createFileRoute("/government-brief")({
  head: () => ({
    meta: [
      { title: "Government Executive Brief — NEXUS AI OS" },
      { name: "description", content: "Minister-level briefing on NEXUS AI OS: Saudi Vision 2030 alignment, NCA ECC compliance, data sovereignty, and the sovereign AI deployment model." },
      { property: "og:title", content: "NEXUS AI OS — Government Executive Brief" },
      { property: "og:description", content: "Sovereign executive intelligence platform for the Saudi public sector." },
      { property: "og:url", content: `${DOMAIN_URL}/government-brief` },
    ],
    links: [{ rel: "canonical", href: `${DOMAIN_URL}/government-brief` }],
  }),
  component: GovernmentBriefPage,
});

function GovernmentBriefPage() {
  const { locale } = useI18n();
  const isAr = locale === "ar";

  const pdfHref = isAr ? "/briefs/nexus-government-brief-ar.pdf" : "/briefs/nexus-government-brief-en.pdf";

  const sections = isAr
    ? [
        { icon: <Landmark className="h-5 w-5" />, title: "مواءمة رؤية المملكة 2030",
          body: "تخدم المنصة محاور الاقتصاد المزدهر والحكومة الطموحة والسيادة التقنية عبر رفع كفاءة الإنفاق وتسريع دورة القرار وتوطين قدرات الذكاء التنفيذي." },
        { icon: <Shield className="h-5 w-5" />, title: "التوافق مع ضوابط NCA ECC",
          body: "تغطية ECC-1:2018 عبر الحوكمة والدفاع والصمود وأطراف ثالثة. تشفير AES-256، TLS 1.3، إدارة هويات SSO/SAML وMFA، وسجل تدقيقي غير قابل للتعديل." },
        { icon: <Globe2 className="h-5 w-5" />, title: "سيادة البيانات",
          body: "استضافة 100% داخل المملكة عبر مزوّدين معتمدين من الهيئة الوطنية للأمن السيبراني وسدايا، مع منع نقل البيانات خارج الحدود الوطنية." },
        { icon: <Building2 className="h-5 w-5" />, title: "نموذج النشر الحكومي",
          body: "سحابة سيادية خاصة، أو نشر On-Prem داخل مركز البيانات الحكومي، أو هجين آمن يربط البيئة المحلية بالخدمات السيادية المعتمدة." },
        { icon: <Cpu className="h-5 w-5" />, title: "دعم الاستراتيجية الوطنية للذكاء الاصطناعي",
          body: "تمكين الكوادر الوطنية، توطين خوارزميات اللغة العربية والمعرفة المؤسسية، والمساهمة في رفع تصنيف المملكة في مؤشرات الجاهزية للذكاء الاصطناعي." },
        { icon: <FileCheck2 className="h-5 w-5" />, title: "الأثر الاقتصادي والتشغيلي",
          body: "خفض التكاليف 18–28%، رفع الإنتاجية 22–32%، تقليل المخاطر 35–48%، وتسريع دورة القرار بمعدل 40 ضعفاً." },
      ]
    : [
        { icon: <Landmark className="h-5 w-5" />, title: "Saudi Vision 2030 Alignment",
          body: "Directly serves the Thriving Economy, Ambitious Nation, and Technological Sovereignty pillars by improving spend efficiency, decision velocity, and national AI capability." },
        { icon: <Shield className="h-5 w-5" />, title: "NCA ECC Compliance",
          body: "ECC-1:2018 coverage across governance, defense, resilience, and third-party domains. AES-256, TLS 1.3, SSO/SAML, MFA, and immutable audit logging." },
        { icon: <Globe2 className="h-5 w-5" />, title: "Data Sovereignty",
          body: "100% in-Kingdom hosting on NCA- and SDAIA-authorized providers, with strict controls preventing cross-border data transfer." },
        { icon: <Building2 className="h-5 w-5" />, title: "Government Deployment Model",
          body: "Sovereign private cloud, on-premise inside government data centers, or secure hybrid connecting on-prem to approved sovereign services." },
        { icon: <Cpu className="h-5 w-5" />, title: "Support for NSDAI",
          body: "Builds national capability, localizes Arabic models and Saudi enterprise knowledge, and reinforces the Kingdom's position in global AI readiness." },
        { icon: <FileCheck2 className="h-5 w-5" />, title: "Economic & Operational Impact",
          body: "18–28% cost reduction, 22–32% productivity uplift, 35–48% risk reduction, and decision cycles 40× faster." },
      ];

  return (
    <div dir={isAr ? "rtl" : "ltr"} className="relative min-h-screen overflow-hidden bg-[#06070d] text-foreground">
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
          {isAr ? "وثيقة حكومية تنفيذية" : "Government Executive Brief"}
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        <section className="mb-12 max-w-4xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/5 px-3 py-1 text-xs uppercase tracking-[0.24em] text-amber-300">
            <Landmark className="h-3.5 w-3.5" />
            {isAr ? "وثيقة على مستوى الوزراء" : "Minister-Level Document"}
          </div>
          <h1 className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-4xl font-semibold leading-tight text-transparent sm:text-5xl">
            {isAr ? "منصة الذكاء التنفيذي السيادية للقطاع الحكومي السعودي" : "Sovereign Executive Intelligence for the Saudi Public Sector"}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {isAr
              ? "مواءمة كاملة مع رؤية المملكة 2030، وضوابط الأمن السيبراني الوطنية، والاستراتيجية الوطنية للذكاء الاصطناعي — مع نموذج نشر سيادي داخل المملكة."
              : "Fully aligned with Saudi Vision 2030, NCA ECC, and the National Strategy for AI — deployed sovereignly inside the Kingdom."}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href={pdfHref}
              download
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 px-6 py-3 text-sm font-medium text-[#0a0a0f] transition hover:from-amber-300 hover:to-amber-400"
            >
              <Download className="h-4 w-4" />
              {isAr ? "تحميل النسخة العربية (PDF)" : "Download English PDF"}
            </a>
            <a
              href={isAr ? "/briefs/nexus-government-brief-en.pdf" : "/briefs/nexus-government-brief-ar.pdf"}
              download
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-400/30 px-6 py-3 text-sm text-amber-200/90 transition hover:bg-amber-400/5"
            >
              <FileText className="h-4 w-4" />
              {isAr ? "English version (PDF)" : "تحميل النسخة العربية (PDF)"}
            </a>
            <Link
              to="/executive-briefing"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-6 py-3 text-sm text-foreground transition hover:bg-white/5"
            >
              {isAr ? "طلب إحاطة تنفيذية" : "Request an Executive Briefing"}
            </Link>
          </div>
        </section>

        {/* KPI strip */}
        <section className="mb-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { k: isAr ? "الجاهزية" : "Readiness", v: isAr ? "مصمَّم بما يتوائم مع SOC2 · ISO27001 · ECC" : "Aligned to SOC2 · ISO27001 · ECC (in progress)" },
            { k: isAr ? "السيادة" : "Sovereignty", v: isAr ? "استضافة سعودية 100%" : "100% In-Kingdom" },
            { k: isAr ? "العائد التشغيلي" : "Operational Return", v: "22–48%" },
            { k: isAr ? "فترة الاسترداد" : "Payback", v: isAr ? "4–9 أشهر" : "4–9 months" },
          ].map((c) => (
            <div key={c.k} className="rounded-xl border border-amber-400/15 bg-white/[0.02] p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{c.k}</div>
              <div className="mt-2 text-base font-semibold text-amber-200">{c.v}</div>
            </div>
          ))}
        </section>

        {/* Sections grid */}
        <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {sections.map((s) => (
            <article key={s.title} className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 transition hover:border-amber-400/20 hover:bg-white/[0.04]">
              <div className="flex items-center gap-3 text-amber-300">
                <span className="grid h-9 w-9 place-items-center rounded-lg border border-amber-400/30 bg-amber-400/5">{s.icon}</span>
                <h2 className="text-base font-semibold text-foreground">{s.title}</h2>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </article>
          ))}
        </section>

        {/* Cross-links */}
        <section className="mt-14 rounded-2xl border border-amber-400/15 bg-gradient-to-br from-amber-400/[0.06] via-white/[0.02] to-transparent p-8">
          <h3 className="text-sm uppercase tracking-[0.24em] text-amber-300/80">
            {isAr ? "وثائق ذات صلة" : "Related Documentation"}
          </h3>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { to: "/trust", label: isAr ? "الثقة والامتثال" : "Trust" },
              { to: "/security", label: isAr ? "الأمن" : "Security" },
              { to: "/dpa", label: "DPA" },
              { to: "/subprocessors", label: isAr ? "المعالجون" : "Subprocessors" },
              { to: "/sla", label: "SLA" },
              { to: "/customers", label: isAr ? "العملاء" : "Customers" },
            ].map((l) => (
              <Link key={l.to} to={l.to} className="rounded-lg border border-white/10 px-3 py-2 text-center text-xs text-foreground transition hover:border-amber-400/30 hover:bg-amber-400/5">
                {l.label}
              </Link>
            ))}
          </div>
        </section>

        <p className="mt-8 text-xs leading-relaxed text-muted-foreground/70">
          {isAr
            ? "هذه الوثيقة موجَّهة للتداول الرسمي بين الجهات الحكومية والمسؤولين التنفيذيين. الأرقام مبنية على معايير قياسية ولا تُعدّ ضماناً تعاقدياً."
            : "Intended for official distribution among government entities and senior executives. Figures are directional, not contractual guarantees."}
        </p>
      </main>
    </div>
  );
}
