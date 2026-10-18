/**
 * /blueprint · المُخطَّط التنفيذي — تسجيل المسار فقط.
 * الصفحة في المساعد المُودَع بجانبه (-blueprint-page.tsx) ليقتطعها الموجّه
 * من حزمة الدخول. لا تصدير للصفحة من هنا — ذلك يُبطل الاقتطاع.
 */
import { createFileRoute } from "@tanstack/react-router";
import { DOMAIN_URL } from "@/lib/domain";
import { BlueprintPage } from "./-blueprint-page";

export const Route = createFileRoute("/blueprint")({
  head: () => ({
    meta: [
      { title: "المُخطَّط التنفيذي · Blueprint — سَدِيد" },
      {
        name: "description",
        content:
          "السطح الهندسي لسَدِيد — المناطق الأربع بطاقاتٍ بامتثالها وحالتها، والمساعد سَدِيد وسطًا، وتحليلاته وتنبيهاته إلى جانبه. بيانات مرجعية ما لم يصل المصدر الحيّ.",
      },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: `${DOMAIN_URL}/blueprint` }],
  }),
  component: BlueprintPage,
});
