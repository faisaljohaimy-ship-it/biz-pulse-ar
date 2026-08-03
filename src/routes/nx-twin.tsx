/**
 * /nx-twin · اتجاه ج «التوأم الحيّ» — تسجيل المسار فقط.
 */
import { createFileRoute } from "@tanstack/react-router";
import { DOMAIN_URL } from "@/lib/domain";
import { NxTwinPage } from "./-nx-twin-page";

export const Route = createFileRoute("/nx-twin")({
  head: () => ({
    meta: [
      { title: "التوأم الحيّ · اتجاه ج — سَدِيد" },
      {
        name: "description",
        content: "اتجاه تصميمي مرشَّح: مشهد ثلاثي العمق وأعمدة ضوء تحمل القيمة.",
      },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: `${DOMAIN_URL}/nx-twin` }],
  }),
  component: NxTwinPage,
});
