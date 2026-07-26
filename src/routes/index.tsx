import { createFileRoute } from "@tanstack/react-router";
import { NxCockpitPage } from "./-nx-cockpit-page";

function HomePage() {
  // The executive cockpit is the homepage — rendered as real React
  // components (header rail, KPI strip, strategic map, FINN panel,
  // capability grid, live events, experience bar). urlSync is disabled
  // here because "/" doesn't declare the ?region/?level search params.
  return <NxCockpitPage urlSync={false} />;
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NEXIOS AI OS — قمرة القيادة التنفيذية FINN" },
      {
        name: "description",
        content:
          "NEXIOS AI OS — قمرة القيادة التنفيذية FINN: مؤشرات حية، خريطة استراتيجية للمملكة، وقرارات فورية موحّدة لكل القطاعات.",
      },
      { property: "og:title", content: "NEXIOS AI OS — FINN" },
      {
        property: "og:description",
        content:
          "قمرة القيادة التنفيذية NEXIOS AI مع FINN — رؤية حية، تحليل فوري، وقرار موثوق للقادة.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://neexios.com/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "NEXIOS AI OS — FINN" },
      {
        name: "twitter:description",
        content:
          "قمرة القيادة التنفيذية NEXIOS AI مع FINN — رؤية حية، تحليل فوري، وقرار موثوق للقادة.",
      },
    ],
    links: [{ rel: "canonical", href: "https://neexios.com/" }],
  }),
  component: HomePage,
});
