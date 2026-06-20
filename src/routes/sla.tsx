import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { DOMAIN_URL } from "@/lib/domain";
import { TrustShell, SectionTitle, Card, Bullets } from "@/components/trust-shell";
import { Gauge, Timer, BadgeCheck, LifeBuoy, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/sla")({
  head: () => ({
    meta: [
      { title: "Service Level Agreement (SLA) — Nexus AI OS" },
      { name: "description", content: "Nexus AI OS Service Level Agreement: 99.9% monthly uptime commitment, severity definitions, response times, service credits, and exclusions." },
      { property: "og:title", content: "Service Level Agreement — Nexus AI OS" },
      { property: "og:description", content: "99.9% uptime, severity tiers, response times, and service credits." },
      { property: "og:url", content: `${DOMAIN_URL}/sla` },
      { property: "og:image", content: `${DOMAIN_URL}/og-image.jpg` },
    ],
    links: [{ rel: "canonical", href: `${DOMAIN_URL}/sla` }],
  }),
  component: SlaPage,
});

function SlaPage() {
  const { locale } = useI18n();
  const isAr = locale === "ar";

  const severities = [
    {
      tier: "SEV-1",
      en: { name: "Critical",  desc: "Service unavailable or material loss of core functionality affecting most users.", ack: "15 minutes", upd: "Hourly" },
      ar: { name: "حرج",        desc: "الخدمة غير متاحة أو فقدان جوهري للوظائف الأساسية يؤثر على معظم المستخدمين.", ack: "15 دقيقة", upd: "كل ساعة" },
    },
    {
      tier: "SEV-2",
      en: { name: "High",      desc: "Major feature impaired with no reasonable workaround; performance severely degraded.", ack: "1 hour",    upd: "Every 4 hours" },
      ar: { name: "عالٍ",       desc: "خلل في ميزة رئيسية دون حل بديل معقول؛ أو تدهور شديد في الأداء.",                 ack: "ساعة واحدة", upd: "كل 4 ساعات" },
    },
    {
      tier: "SEV-3",
      en: { name: "Normal",    desc: "Limited or partial impact with a known workaround.",                                   ack: "1 business day", upd: "Daily" },
      ar: { name: "عادي",       desc: "تأثير محدود أو جزئي مع وجود حل بديل معروف.",                                          ack: "يوم عمل واحد", upd: "يوميًا" },
    },
    {
      tier: "SEV-4",
      en: { name: "Low",       desc: "Cosmetic issue, question, or feature request.",                                         ack: "2 business days", upd: "Weekly" },
      ar: { name: "منخفض",      desc: "مشكلة شكلية أو استفسار أو طلب ميزة.",                                                  ack: "يوما عمل",     upd: "أسبوعيًا" },
    },
  ];

  const credits = [
    { uptimeEn: "≥ 99.9%",            uptimeAr: "≥ 99.9%",            creditEn: "—",   creditAr: "—" },
    { uptimeEn: "< 99.9%  and  ≥ 99.0%", uptimeAr: "< 99.9%  و  ≥ 99.0%", creditEn: "10% of monthly fee", creditAr: "10% من الرسوم الشهرية" },
    { uptimeEn: "< 99.0%  and  ≥ 95.0%", uptimeAr: "< 99.0%  و  ≥ 95.0%", creditEn: "25% of monthly fee", creditAr: "25% من الرسوم الشهرية" },
    { uptimeEn: "< 95.0%",            uptimeAr: "< 95.0%",            creditEn: "50% of monthly fee", creditAr: "50% من الرسوم الشهرية" },
  ];

  const exclusions = [
    { en: "Scheduled maintenance announced ≥ 72 hours in advance (capped to a defined monthly window).", ar: "الصيانة المجدولة المُعلَن عنها قبل 72 ساعة على الأقل (ضمن نافذة شهرية محدّدة)." },
    { en: "Force majeure events outside reasonable control of NEXUS.", ar: "أحداث القوة القاهرة الخارجة عن السيطرة المعقولة لـ NEXUS." },
    { en: "Customer-caused outages (misconfiguration, breach of acceptable use, third-party integrations).", ar: "الأعطال الناتجة عن العميل (إعدادات خاطئة أو مخالفة سياسة الاستخدام أو تكاملات الطرف الثالث)." },
    { en: "Beta or preview services explicitly marked as such.", ar: "الخدمات التجريبية أو ما يحمل وسم Beta / Preview." },
  ];

  return (
    <TrustShell
      isAr={isAr}
      active="/sla"
      eyebrow="Service Commitment" eyebrowAr="التزام الخدمة"
      title="Service Level Agreement" titleAr="اتفاقية مستوى الخدمة"
      subtitle="A 99.9% monthly uptime commitment for the NEXUS production control plane, with defined severity tiers, response times, and service credits."
      subtitleAr="التزام بتوفر شهري 99.9% لطبقة التحكم في الإنتاج، مع مستويات حدّة محدّدة وأزمنة استجابة واعتمادات خدمة."
      qualifier="Definitions on this page summarize the contractual SLA. The executed Order Form and Master Services Agreement prevail in case of conflict."
      qualifierAr="تُلخّص هذه الصفحة الالتزامات التعاقدية. تسود وثيقة الطلب واتفاقية الخدمات الرئيسية المُوقَّعة في حال الاختلاف."
    >
      {/* HERO METRICS */}
      <section className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: <Gauge className="h-4 w-4" />,      v: "99.9%",  en: "Monthly uptime",        ar: "التوفر الشهري" },
          { icon: <Timer className="h-4 w-4" />,      v: "15 min", en: "SEV-1 acknowledgement", ar: "إقرار SEV-1" },
          { icon: <BadgeCheck className="h-4 w-4" />, v: "≤ 4h",   en: "RTO (tier-1)",          ar: "زمن الاستعادة (فئة 1)" },
          { icon: <LifeBuoy className="h-4 w-4" />,   v: "24/7",   en: "Incident response",     ar: "الاستجابة للحوادث" },
        ].map((m, i) => (
          <Card key={i}>
            <div className="flex items-center gap-2 text-amber-300/80">
              {m.icon}
              <span className="text-[10px] uppercase tracking-[0.18em]">{isAr ? m.ar : m.en}</span>
            </div>
            <div className="mt-2 bg-gradient-to-b from-amber-200 to-amber-400 bg-clip-text text-2xl font-semibold text-transparent sm:text-3xl">
              {m.v}
            </div>
          </Card>
        ))}
      </section>

      {/* UPTIME DEFINITION */}
      <section className="mb-10">
        <SectionTitle isAr={isAr} en="Uptime Commitment" ar="الالتزام بالتوفر" icon={<Gauge className="h-4 w-4" />} />
        <Card>
          <Bullets
            isAr={isAr}
            items={[
              { en: "Monthly Uptime % = (Total minutes in month − Unavailable minutes) ÷ Total minutes in month × 100.", ar: "نسبة التوفر الشهري = (إجمالي دقائق الشهر − دقائق عدم التوفر) ÷ إجمالي دقائق الشهر × 100." },
              { en: "“Unavailable” means the production control plane is returning 5xx errors or is unreachable for > 1 minute as measured by NEXUS monitoring.", ar: "«غير متاح» يعني إرجاع أخطاء 5xx أو عدم الوصول لطبقة التحكم لأكثر من دقيقة وفق مراقبة NEXUS." },
              { en: "Commitment is measured per calendar month, per customer environment.", ar: "يُقاس الالتزام شهريًا تقويميًا لكل بيئة عميل." },
            ]}
          />
        </Card>
      </section>

      {/* SEVERITY TABLE */}
      <section className="mb-10">
        <SectionTitle isAr={isAr} en="Severity & Response Times" ar="الحدّة وأزمنة الاستجابة" icon={<AlertTriangle className="h-4 w-4" />} />

        {/* mobile cards */}
        <div className="grid gap-3 md:hidden">
          {severities.map((s) => {
            const v = isAr ? s.ar : s.en;
            return (
              <Card key={s.tier}>
                <div className="flex items-center justify-between">
                  <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.18em] text-amber-200">{s.tier}</span>
                  <span className="text-sm text-foreground/90">{v.name}</span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{v.desc}</p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div><div className="text-amber-300/80">{isAr ? "الإقرار" : "Ack"}</div><div className="mt-0.5 text-foreground/90">{v.ack}</div></div>
                  <div><div className="text-amber-300/80">{isAr ? "التحديثات" : "Updates"}</div><div className="mt-0.5 text-foreground/90">{v.upd}</div></div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* desktop table */}
        <div className="hidden overflow-hidden rounded-xl border border-white/10 md:block">
          <table className="w-full table-fixed text-sm">
            <thead className="bg-white/[0.03] text-[10px] uppercase tracking-[0.18em] text-amber-300/80">
              <tr>
                <th className="w-[10%] px-4 py-3 text-start">{isAr ? "المستوى" : "Tier"}</th>
                <th className="w-[14%] px-4 py-3 text-start">{isAr ? "الاسم" : "Name"}</th>
                <th className="w-[46%] px-4 py-3 text-start">{isAr ? "الوصف" : "Description"}</th>
                <th className="w-[15%] px-4 py-3 text-start">{isAr ? "الإقرار" : "Acknowledgement"}</th>
                <th className="w-[15%] px-4 py-3 text-start">{isAr ? "التحديثات" : "Updates"}</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              {severities.map((s) => {
                const v = isAr ? s.ar : s.en;
                return (
                  <tr key={s.tier} className="border-t border-white/5">
                    <td className="px-4 py-3 align-top">
                      <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-amber-200">{s.tier}</span>
                    </td>
                    <td className="px-4 py-3 align-top text-foreground/90">{v.name}</td>
                    <td className="px-4 py-3 align-top">{v.desc}</td>
                    <td className="px-4 py-3 align-top">{v.ack}</td>
                    <td className="px-4 py-3 align-top">{v.upd}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* SERVICE CREDITS */}
      <section className="mb-10">
        <SectionTitle isAr={isAr} en="Service Credits" ar="اعتمادات الخدمة" icon={<BadgeCheck className="h-4 w-4" />} />
        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="w-full table-fixed text-sm">
            <thead className="bg-white/[0.03] text-[10px] uppercase tracking-[0.18em] text-amber-300/80">
              <tr>
                <th className="w-1/2 px-4 py-3 text-start">{isAr ? "نسبة التوفر الشهري" : "Monthly Uptime %"}</th>
                <th className="w-1/2 px-4 py-3 text-start">{isAr ? "الاعتماد" : "Service Credit"}</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              {credits.map((c, i) => (
                <tr key={i} className="border-t border-white/5">
                  <td className="px-4 py-3 align-top text-foreground/90">{isAr ? c.uptimeAr : c.uptimeEn}</td>
                  <td className="px-4 py-3 align-top">{isAr ? c.creditAr : c.creditEn}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground/70">
          {isAr
            ? "تُطلَب اعتمادات الخدمة كتابيًا خلال 30 يومًا من نهاية الشهر المعني وتُطبَّق على فواتير لاحقة."
            : "Service credits must be requested in writing within 30 days of the end of the affected month and are applied to subsequent invoices."}
        </p>
      </section>

      {/* EXCLUSIONS */}
      <section className="mb-10">
        <SectionTitle isAr={isAr} en="Exclusions" ar="الاستثناءات" />
        <Card>
          <Bullets items={exclusions} isAr={isAr} />
        </Card>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5 text-sm text-muted-foreground sm:p-6">
        {isAr
          ? "للحصول على نسخة SLA المؤسسية أو شروط أعلى (99.95% / 99.99%) للنشر السيادي، تواصل مع "
          : "For the enterprise SLA package or higher tiers (99.95% / 99.99%) for sovereign deployments, contact "}
        <a className="text-amber-200 hover:underline" href="mailto:enterprise@nexus-ai-os.com">enterprise@nexus-ai-os.com</a>.
      </section>
    </TrustShell>
  );
}
