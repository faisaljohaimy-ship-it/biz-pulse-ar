import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/nx-cockpit" });
  },
  head: () => ({
    meta: [
      { title: "NEXIOS AI  -  FINN" },
      {
        name: "description",
        content:
          "NEXIOS AI OS — منصة القيادة التنفيذية بشبكة الذكاء العصبي السريعة FINN: قرارات فورية، أرقام حية، وتحكّم موحّد لكل القطاعات.",
      },
      { property: "og:title", content: "NEXIOS AI  -  FINN" },
      {
        property: "og:description",
        content:
          "منصة القيادة التنفيذية NEXIOS AI مع FINN — شبكة الذكاء العصبي السريعة: رؤية حية، تحليل فوري، وقرار موثوق للقادة.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://neexios.com/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "NEXIOS AI  -  FINN" },
      {
        name: "twitter:description",
        content:
          "منصة القيادة التنفيذية NEXIOS AI مع FINN — شبكة الذكاء العصبي السريعة: رؤية حية، تحليل فوري، وقرار موثوق للقادة.",
      },
    ],
    links: [{ rel: "canonical", href: "https://neexios.com/nx-cockpit" }],
  }),
  component: () => null,
});
