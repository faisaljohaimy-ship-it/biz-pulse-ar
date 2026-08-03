/**
 * /nx-sovereign · اتجاه ب «السيادي» — تسجيل المسار فقط.
 */
import { createFileRoute } from "@tanstack/react-router";
import { DOMAIN_URL } from "@/lib/domain";
import { NxSovereignPage } from "./-nx-sovereign-page";

export const Route = createFileRoute("/nx-sovereign")({
  head: () => ({
    meta: [
      { title: "السيادي · اتجاه ب — سَدِيد" },
      {
        name: "description",
        content: "اتجاه تصميمي مرشَّح: تقرير سيادي بالطباعة والذهب والهندسة الإسلامية.",
      },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: `${DOMAIN_URL}/nx-sovereign` }],
  }),
  component: NxSovereignPage,
});
