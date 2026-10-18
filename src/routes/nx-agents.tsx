/**
 * /nx-agents · منظومة الوكلاء الثلاثة عشر — route definition only. The page
 * lives in the colocated non-route helper (-nx-agents-page.tsx) so the router
 * code-splits it out of the entry bundle.
 */
import { createFileRoute } from "@tanstack/react-router";
import { DOMAIN_URL } from "@/lib/domain";
import { NxAgentsPage } from "./-nx-agents-page";

export const Route = createFileRoute("/nx-agents")({
  head: () => ({
    meta: [
      { title: "منظومة الوكلاء الثلاثة عشر · NX Agents — سَدِيد" },
      {
        name: "description",
        content:
          "منظومة وكلاء سَدِيد المتخصّصة — قراءة فقط، وبيانات مرجعية موسومة ما لم يصل المصدر الحيّ.",
      },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: `${DOMAIN_URL}/nx-agents` }],
  }),
  component: NxAgentsPage,
});
