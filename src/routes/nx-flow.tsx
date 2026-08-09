/**
 * /nx-flow · رحلة الوكلاء مع فِن — تسجيل المسار فقط.
 * الصفحة في المساعد المُودَع بجانبه (-nx-flow-page.tsx) ليقتطعها الموجّه
 * من حزمة الدخول. لا تصدير للصفحة من هنا — ذلك يُبطل الاقتطاع.
 */
import { createFileRoute } from "@tanstack/react-router";
import { DOMAIN_URL } from "@/lib/domain";
import { NxFlowPage } from "./-nx-flow-page";

export const Route = createFileRoute("/nx-flow")({
  head: () => ({
    meta: [
      { title: "رحلة الوكلاء مع سَدِيد · Agents Flow" },
      {
        name: "description",
        content:
          "لوح ساطع يقرأ رحلة العمل: سَدِيد يوجّه، الوكلاء ينفّذون، والقرار يعود للاعتماد البشري. محاكاة مرجعية.",
      },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: `${DOMAIN_URL}/nx-flow` }],
  }),
  component: NxFlowPage,
});
