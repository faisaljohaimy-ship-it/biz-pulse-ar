import { createFileRoute, Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { DOMAIN_URL } from "@/lib/domain";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — NEXIOS AI OS" },
      {
        name: "description",
        content: "How NEXIOS AI OS collects, processes, and protects enterprise data.",
      },
      { property: "og:title", content: "Privacy Policy — NEXIOS AI OS" },
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
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {isAr ? "العودة للرئيسية" : "Back to home"}
        </Link>
        <h1 className="mt-8 text-3xl font-bold tracking-tight sm:text-4xl">
          {isAr ? "سياسة الخصوصية" : "Privacy Policy"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isAr ? "آخر تحديث: ١٥ يوليو ٢٠٢٦" : "Last updated: July 15, 2026"}
        </p>

        <div className="prose prose-invert mt-10 max-w-none space-y-6 text-sm leading-relaxed text-foreground/90">
          <p>
            {isAr
              ? "تصف هذه السياسة كيف تعالج منصة NEXIOS AI OS الأساسية البيانات التي تختار مؤسستك مشاركتها، وكيف تُحمى وتُحذف. تُحدَّد هوية المتحكم والمعالج في اتفاقية العميل الموقعة."
              : "This policy describes how the core NEXIOS AI OS platform processes, safeguards, and deletes data your organization chooses to share. The controller and processor are identified in the customer's signed agreement."}
          </p>

          <h2 className="text-xl font-semibold">
            {isAr ? "١. البيانات التي نجمعها" : "1. Data we collect"}
          </h2>
          <ul className="ml-5 list-disc space-y-1">
            <li>
              {isAr
                ? "بيانات الحساب: الاسم، البريد الإلكتروني، الدور."
                : "Account data: name, email, role."}
            </li>
            <li>
              {isAr
                ? "بيانات اعتماد وتسليم البريد وSMS، مع إخفاء المستلم وتشفير المحتوى."
                : "Email/SMS approval and delivery metadata, with a masked recipient and encrypted content."}
            </li>
            <li>
              {isAr
                ? "بيانات المؤسسة التي تختار رفعها: مؤشرات، تنبيهات، وثائق، محادثات ARIA."
                : "Enterprise data you choose to upload: KPIs, alerts, documents, ARIA conversations."}
            </li>
            <li>
              {isAr
                ? "بيانات الاستخدام التشغيلية لتحسين الموثوقية."
                : "Operational usage data to improve reliability."}
            </li>
          </ul>

          <h2 className="text-xl font-semibold">
            {isAr ? "٢. كيف نستخدم البيانات" : "2. How we use data"}
          </h2>
          <p>
            {isAr
              ? "تُستخدم البيانات فقط لتشغيل الخدمة لمؤسستك. لا نبيع البيانات. لا نستخدم بيانات عملائنا لتدريب نماذج لغوية عامة."
              : "Data is used only to operate the Service for your organization. We do not sell data. We do not use customer data to train general-purpose language models."}
          </p>
          <p>
            {isAr
              ? "منصة الحج خارج نطاق هذه النسخة من السياسة، وتتطلب تقييماً وملحق احتفاظ مستقلاً قبل معالجة بيانات شخصية حقيقية."
              : "The Hajj module is outside this policy version and requires a separate assessment and retention annex before processing real personal data."}
          </p>

          <h2 className="text-xl font-semibold">{isAr ? "٣. الأمان" : "3. Security"}</h2>
          <p>
            {isAr
              ? "تشفير أثناء النقل (TLS) وأثناء التخزين. صلاحيات صارمة على مستوى الصف (RLS) على قاعدة البيانات. سجلات تدقيق للوصول الإداري."
              : "Encryption in transit (TLS) and at rest. Row-level security on every customer table. Audit logs on administrative access."}
          </p>

          <h2 className="text-xl font-semibold">
            {isAr ? "٤. الاحتفاظ والحذف" : "4. Retention & deletion"}
          </h2>
          <p>
            {isAr
              ? "تُحفظ بيانات الحساب طوال العقد وتُعاد أو تُحذف خلال ٣٠ يوماً من الإنهاء ما لم يفرض النظام خلاف ذلك. السجلات التشغيلية ١٢ شهراً، وسجلات الأمن والحد الأدنى من بيانات اعتماد الرسائل ٢٤ شهراً؛ ويُمحى محتوى الرسائل المشفر خلال ٣٠ يوماً كحد أقصى. يمكن للعقد اعتماد مدد أقصر."
              : "Account data is retained for the contract term and returned or deleted within 30 days after termination unless law requires otherwise. Default retention is 12 months for operational records, 24 months for security and minimum message-approval metadata, and no more than 30 days for encrypted message content. A contract may set shorter periods."}
          </p>

          <h2 className="text-xl font-semibold">{isAr ? "٥. حقوقك" : "5. Your rights"}</h2>
          <p>
            {isAr
              ? "يمكنك طلب العلم أو الوصول أو نسخة أو التصحيح أو الإتلاف وسحب الموافقة حيث تنطبق. تُعالج الطلبات خلال المدة النظامية وبحد أقصى ٣٠ يوماً عبر "
              : "You may request information, access, a copy, correction, deletion, or withdrawal of consent where applicable. Requests are handled within the statutory period and no later than 30 days via "}
            <Link to="/contact" className="text-primary underline-offset-4 hover:underline">
              {isAr ? "صفحة التواصل" : "our contact page"}
            </Link>
            .
          </p>

          <h2 className="text-xl font-semibold">{isAr ? "٦. التواصل" : "6. Contact"}</h2>
          <p>
            {isAr
              ? "لاستفسارات الخصوصية وطلبات الحقوق: "
              : "For privacy inquiries and data-subject requests: "}
            <a className="text-primary hover:underline" href="mailto:privacy@neexios.com">
              privacy@neexios.com
            </a>
            .
          </p>
        </div>
      </article>
    </main>
  );
}
