import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { FormShell } from "./request-demo";

import { DOMAIN_URL } from "@/lib/domain";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Sales — Nexus AI OS" },
      {
        name: "description",
        content: "Talk to Nexus AI OS enterprise sales about pricing, deployment, and security.",
      },
      { property: "og:title", content: "Contact Sales — Nexus AI OS" },
      {
        property: "og:description",
        content: "Enterprise pricing, deployment, and security conversations.",
      },
      { property: "og:url", content: `${DOMAIN_URL}/contact` },
    ],
    links: [{ rel: "canonical", href: `${DOMAIN_URL}/contact` }],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { locale } = useI18n();
  const isAr = locale === "ar";
  return (
    <FormShell
      kind="contact"
      isAr={isAr}
      eyebrow={isAr ? "تواصل مع المبيعات" : "Contact Sales"}
      title={isAr ? "حلول مؤسسية. أسعار مخصصة." : "Enterprise solutions. Custom pricing."}
      subtitle={
        isAr
          ? "أخبرنا عن احتياجك وسنرد خلال يوم عمل."
          : "Tell us what you need and we'll respond within one business day."
      }
      successMsg={
        isAr
          ? "وصلتنا رسالتك. سيتواصل فريق المبيعات قريباً."
          : "Message received. Sales will reach out shortly."
      }
      fields={[
        { name: "name", label: isAr ? "الاسم" : "Name", required: true },
        { name: "email", label: isAr ? "بريد العمل" : "Work email", type: "email", required: true },
        { name: "company", label: isAr ? "الشركة" : "Company", required: true },
        { name: "phone", label: isAr ? "الهاتف" : "Phone", type: "tel" },
        { name: "interest", label: isAr ? "مجال الاهتمام" : "Area of interest" },
        { name: "message", label: isAr ? "رسالتك" : "Message", textarea: true, required: true },
      ]}
      submitLabel={isAr ? "أرسل" : "Send message"}
    />
  );
}
