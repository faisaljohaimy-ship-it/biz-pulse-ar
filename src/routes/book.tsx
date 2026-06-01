import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { FormShell } from "./request-demo";

export const Route = createFileRoute("/book")({
  head: () => ({
    meta: [
      { title: "Book a Meeting — Nexus AI OS" },
      { name: "description", content: "Book a 30-minute strategy session with a Nexus AI OS specialist." },
      { property: "og:title", content: "Book a Meeting — Nexus AI OS" },
      { property: "og:description", content: "30-minute strategy session with a specialist." },
    ],
  }),
  component: BookPage,
});

function BookPage() {
  const { locale } = useI18n();
  const isAr = locale === "ar";
  return (
    <FormShell
      isAr={isAr}
      eyebrow={isAr ? "احجز اجتماعاً" : "Book a Meeting"}
      title={isAr ? "٣٠ دقيقة مع متخصص." : "30 minutes with a specialist."}
      subtitle={isAr ? "اختر التاريخ والوقت المفضل وسنؤكد فوراً." : "Pick your preferred date and time — we'll confirm instantly."}
      successMsg={isAr ? "تم استلام طلب الحجز. ستصلك دعوة التقويم." : "Booking received. A calendar invite is on its way."}
      fields={[
        { name: "name", label: isAr ? "الاسم" : "Name", required: true },
        { name: "email", label: isAr ? "البريد الإلكتروني" : "Email", type: "email", required: true },
        { name: "company", label: isAr ? "الشركة" : "Company", required: true },
        { name: "date", label: isAr ? "التاريخ المفضل" : "Preferred date", type: "date", required: true },
        { name: "time", label: isAr ? "الوقت المفضل" : "Preferred time", type: "time" },
        { name: "topic", label: isAr ? "محور النقاش" : "Discussion topic", textarea: true },
      ]}
      submitLabel={isAr ? "احجز الآن" : "Book meeting"}
    />
  );
}
