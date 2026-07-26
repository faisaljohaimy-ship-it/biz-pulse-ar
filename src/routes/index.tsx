import { createFileRoute } from "@tanstack/react-router";
import cockpitReference from "@/assets/nexios-cockpit-reference.png.asset.json";

function HomeCockpitImage() {
  return (
    <main
      dir="rtl"
      className="min-h-screen w-full bg-[#040814] flex items-center justify-center overflow-x-auto"
    >
      <img
        src={cockpitReference.url}
        alt="NEXIOS AI OS — قمرة القيادة التنفيذية FINN"
        className="w-full h-auto max-w-[1600px] block select-none"
        draggable={false}
      />
    </main>
  );
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NEXIOS AI  -  FINN" },
      {
        name: "description",
        content:
          "NEXIOS AI OS — قمرة القيادة التنفيذية FINN: مؤشرات حية، خريطة استراتيجية للمملكة، وقرارات فورية موحّدة لكل القطاعات.",
      },
      { property: "og:title", content: "NEXIOS AI  -  FINN" },
      {
        property: "og:description",
        content:
          "قمرة القيادة التنفيذية NEXIOS AI مع FINN — رؤية حية، تحليل فوري، وقرار موثوق للقادة.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://neexios.com/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "NEXIOS AI  -  FINN" },
      {
        name: "twitter:description",
        content:
          "قمرة القيادة التنفيذية NEXIOS AI مع FINN — رؤية حية، تحليل فوري، وقرار موثوق للقادة.",
      },
    ],
    links: [{ rel: "canonical", href: "https://neexios.com/" }],
  }),
  component: HomeCockpitImage,
});
