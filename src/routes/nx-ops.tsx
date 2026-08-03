/**
 * /nx-ops · مسرح العمليات الحيّ — تسجيل المسار فقط.
 * الصفحة في المساعد المُودَع بجانبه (-nx-ops-page.tsx) ليقتطعها الموجّه من
 * حزمة الدخول. لا تصدير للصفحة من هنا — ذلك يُبطل الاقتطاع.
 */
import { createFileRoute } from "@tanstack/react-router";
import { DOMAIN_URL } from "@/lib/domain";
import { NxOpsPage } from "./-nx-ops-page";

export const Route = createFileRoute("/nx-ops")({
  head: () => ({
    meta: [
      { title: "مسرح العمليات الحيّ · Ops Theater — سَدِيد" },
      {
        name: "description",
        content:
          "غرفة العمليات الحية لسَدِيد — FINN تنسّق من القلب وعشرة وكلاء متخصصون يعملون في غرفهم، والقرارات تسري مباشرة. محاكاة مرجعية.",
      },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: `${DOMAIN_URL}/nx-ops` }],
  }),
  component: NxOpsPage,
});
