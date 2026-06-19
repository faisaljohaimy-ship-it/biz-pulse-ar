import { createFileRoute, Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { DOMAIN_URL } from "@/lib/domain";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Nexus AI OS" },
      { name: "description", content: "Terms governing use of Nexus AI OS — the executive intelligence operating system." },
      { property: "og:title", content: "Terms of Service — Nexus AI OS" },
      { property: "og:url", content: `${DOMAIN_URL}/terms` },
    ],
    links: [{ rel: "canonical", href: `${DOMAIN_URL}/terms` }],
  }),
  component: TermsPage,
});

function TermsPage() {
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
          {isAr ? "شروط الخدمة" : "Terms of Service"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isAr ? "آخر تحديث: ١٩ يونيو ٢٠٢٦" : "Last updated: June 19, 2026"}
        </p>

        <div className="prose prose-invert mt-10 max-w-none space-y-6 text-sm leading-relaxed text-foreground/90">
          <p>
            {isAr
              ? "باستخدامك Nexus AI OS، فإنك توافق على هذه الشروط نيابةً عن مؤسستك."
              : "By using Nexus AI OS, you agree to these terms on behalf of your organization."}
          </p>

          <h2 className="text-xl font-semibold">{isAr ? "١. الترخيص" : "1. License"}</h2>
          <p>
            {isAr
              ? "نمنحك ترخيصاً محدوداً وغير حصري وغير قابل للتحويل لاستخدام الخدمة وفقاً لخطة اشتراكك."
              : "We grant you a limited, non-exclusive, non-transferable license to use the Service per your subscription plan."}
          </p>

          <h2 className="text-xl font-semibold">{isAr ? "٢. الاستخدام المقبول" : "2. Acceptable use"}</h2>
          <ul className="ml-5 list-disc space-y-1">
            <li>{isAr ? "لا تستخدم الخدمة لأي نشاط غير قانوني." : "Do not use the Service for unlawful activity."}</li>
            <li>{isAr ? "لا تحاول اختراق أو الوصول غير المصرح به." : "Do not attempt unauthorized access or reverse engineering."}</li>
            <li>{isAr ? "أنت مسؤول عن سرية بيانات حسابك." : "You are responsible for the confidentiality of your credentials."}</li>
          </ul>

          <h2 className="text-xl font-semibold">{isAr ? "٣. البيانات والملكية" : "3. Data & ownership"}</h2>
          <p>
            {isAr
              ? "تحتفظ مؤسستك بالملكية الكاملة لجميع بياناتها. نحتفظ بالملكية الفكرية للخدمة ومخرجاتها العامة."
              : "Your organization retains full ownership of its data. We retain intellectual property in the Service itself."}
          </p>

          <h2 className="text-xl font-semibold">{isAr ? "٤. الفوترة" : "4. Billing"}</h2>
          <p>
            {isAr
              ? "تُحرَّر الفواتير شهرياً أو سنوياً حسب خطتك. الرسوم غير قابلة للاسترداد إلا حيث ينص القانون."
              : "Fees are invoiced monthly or annually per plan. Fees are non-refundable except as required by law."}
          </p>

          <h2 className="text-xl font-semibold">{isAr ? "٥. المسؤولية" : "5. Limitation of liability"}</h2>
          <p>
            {isAr
              ? "تُقدَّم الخدمة «كما هي». لا نتحمل أي أضرار تبعية تتجاوز الرسوم المدفوعة خلال آخر ١٢ شهراً."
              : "The Service is provided \"as is\". Our aggregate liability shall not exceed fees paid in the prior 12 months."}
          </p>

          <h2 className="text-xl font-semibold">{isAr ? "٦. الإنهاء" : "6. Termination"}</h2>
          <p>
            {isAr
              ? "يمكن لأي طرف إنهاء الخدمة بإشعار مسبق ٣٠ يوماً. عند الإنهاء، ستتاح لك ٣٠ يوماً لتصدير بياناتك."
              : "Either party may terminate with 30 days' notice. On termination, you have 30 days to export your data."}
          </p>

          <h2 className="text-xl font-semibold">{isAr ? "٧. القانون الحاكم" : "7. Governing law"}</h2>
          <p>
            {isAr
              ? "تخضع هذه الشروط لقوانين الولاية القضائية المتفق عليها في طلب الشراء."
              : "These terms are governed by the jurisdiction agreed in the order form."}
          </p>

          <p className="pt-4">
            {isAr ? "للأسئلة، " : "For questions, "}
            <Link to="/contact" className="text-primary underline-offset-4 hover:underline">
              {isAr ? "تواصل معنا" : "contact us"}
            </Link>.
          </p>
        </div>
      </article>
    </main>
  );
}
