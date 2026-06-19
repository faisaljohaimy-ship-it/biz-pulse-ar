import { createFileRoute, Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { DOMAIN_URL } from "@/lib/domain";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Nexus AI OS" },
      { name: "description", content: "How Nexus AI OS collects, processes, and protects enterprise data." },
      { property: "og:title", content: "Privacy Policy — Nexus AI OS" },
      { property: "og:url", content: `${DOMAIN_URL}/privacy` },
    ],
    links: [{ rel: "canonical", href: `${DOMAIN_URL}/privacy` }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const { locale } = useI18n();
  const isAr = locale === "ar";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <article className="mx-auto max-w-3xl px-5 py-16 sm:py-24">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          {isAr ? "العودة للرئيسية" : "Back to home"}
        </Link>
        <h1 className="mt-8 text-3xl font-bold tracking-tight sm:text-4xl">
          {isAr ? "سياسة الخصوصية" : "Privacy Policy"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isAr ? "آخر تحديث: ١٩ يونيو ٢٠٢٦" : "Last updated: June 19, 2026"}
        </p>

        <div className="prose prose-invert mt-10 max-w-none space-y-6 text-sm leading-relaxed text-foreground/90">
          <p>
            {isAr
              ? "تصف هذه السياسة كيف يقوم Nexus AI OS («نحن»، «الخدمة») بجمع ومعالجة وحماية البيانات التي تشاركها مؤسستك معنا."
              : "This page describes how Nexus AI OS (\"we\", \"the Service\") collects, processes, and safeguards the data your organization shares with us. It is maintained by the Nexus AI OS team to answer common privacy questions."}
          </p>

          <h2 className="text-xl font-semibold">{isAr ? "١. البيانات التي نجمعها" : "1. Data we collect"}</h2>
          <ul className="ml-5 list-disc space-y-1">
            <li>{isAr ? "بيانات الحساب: الاسم، البريد الإلكتروني، الدور." : "Account data: name, email, role."}</li>
            <li>{isAr ? "بيانات المؤسسة التي تختار رفعها: مؤشرات، تنبيهات، وثائق، محادثات ARIA." : "Enterprise data you choose to upload: KPIs, alerts, documents, ARIA conversations."}</li>
            <li>{isAr ? "بيانات الاستخدام التشغيلية لتحسين الموثوقية." : "Operational usage data to improve reliability."}</li>
          </ul>

          <h2 className="text-xl font-semibold">{isAr ? "٢. كيف نستخدم البيانات" : "2. How we use data"}</h2>
          <p>
            {isAr
              ? "تُستخدم البيانات فقط لتشغيل الخدمة لمؤسستك. لا نبيع البيانات. لا نستخدم بيانات عملائنا لتدريب نماذج لغوية عامة."
              : "Data is used only to operate the Service for your organization. We do not sell data. We do not use customer data to train general-purpose language models."}
          </p>

          <h2 className="text-xl font-semibold">{isAr ? "٣. الأمان" : "3. Security"}</h2>
          <p>
            {isAr
              ? "تشفير أثناء النقل (TLS) وأثناء التخزين. صلاحيات صارمة على مستوى الصف (RLS) على قاعدة البيانات. سجلات تدقيق للوصول الإداري."
              : "Encryption in transit (TLS) and at rest. Row-level security on every customer table. Audit logs on administrative access."}
          </p>

          <h2 className="text-xl font-semibold">{isAr ? "٤. الاحتفاظ والحذف" : "4. Retention & deletion"}</h2>
          <p>
            {isAr
              ? "تحتفظ بيانات الحساب طوال مدة الاشتراك. عند الإنهاء، تُحذف خلال ٣٠ يوماً ما لم يطلب القانون خلاف ذلك."
              : "Account data is retained for the duration of your subscription. On termination, it is deleted within 30 days unless required by law."}
          </p>

          <h2 className="text-xl font-semibold">{isAr ? "٥. حقوقك" : "5. Your rights"}</h2>
          <p>
            {isAr
              ? "يمكنك طلب الوصول أو التصحيح أو الحذف أو النقل لبياناتك في أي وقت عبر "
              : "You may request access, correction, deletion, or portability of your data at any time via "}
            <Link to="/contact" className="text-primary underline-offset-4 hover:underline">
              {isAr ? "صفحة التواصل" : "our contact page"}
            </Link>.
          </p>

          <h2 className="text-xl font-semibold">{isAr ? "٦. التواصل" : "6. Contact"}</h2>
          <p>
            {isAr
              ? "لأي استفسار بشأن الخصوصية، تواصل مع فريق الخصوصية عبر صفحة التواصل."
              : "For any privacy inquiries, reach the privacy team via our contact page."}
          </p>
        </div>
      </article>
    </main>
  );
}
