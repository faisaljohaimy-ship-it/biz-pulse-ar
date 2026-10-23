import { createFileRoute } from "@tanstack/react-router";
import { SadeedCinematicExperience } from "@/components/cinematic/SadeedCinematicExperience";

export const Route = createFileRoute("/cinematic")({
  head: () => ({
    meta: [
      { title: "SADEED | التجربة السينمائية" },
      {
        name: "description",
        content: "عرض موشن جرافيك سينمائي تفاعلي للتوأم الرقمي والأمن الصناعي",
      },
    ],
  }),
  component: SadeedCinematicExperience,
});
