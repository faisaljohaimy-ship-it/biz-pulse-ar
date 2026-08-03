/**
 * /nx-atlas · اتجاه أ «مركز المهام» — تسجيل المسار فقط.
 * الصفحة في المساعد المُودَع بجانبه ليقتطعها الموجّه من حزمة الدخول.
 */
import { createFileRoute } from "@tanstack/react-router";
import { DOMAIN_URL } from "@/lib/domain";
import { NxAtlasPage } from "./-nx-atlas-page";

export const Route = createFileRoute("/nx-atlas")({
  head: () => ({
    meta: [
      { title: "مركز المهام · اتجاه أ — سَدِيد" },
      { name: "description", content: "اتجاه تصميمي مرشَّح: كثافة طرفية بلا مساحة ميتة." },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: `${DOMAIN_URL}/nx-atlas` }],
  }),
  component: NxAtlasPage,
});
