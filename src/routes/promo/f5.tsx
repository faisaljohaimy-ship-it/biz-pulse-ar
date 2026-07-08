import { createFileRoute } from "@tanstack/react-router";
import { FilmShell } from "@/components/promo/FilmShell";
import { FILM_5 } from "@/components/promo/films";

export const Route = createFileRoute("/promo/f5")({
  head: () => ({
    meta: [
      { title: "نيكسوس — المملكة تتحوّل بالهولوجرام" },
      {
        name: "description",
        content: "فيلم هولوجرامي لأبراج المملكة العربية السعودية ومنظومة نيكسوس التنفيذية.",
      },
      { property: "og:title", content: "نيكسوس — المملكة تتحوّل بالهولوجرام" },
      {
        property: "og:description",
        content: "بصريات هولوجرامية للرياض والظهران — بلغة نيكسوس التنفيذية.",
      },
    ],
  }),
  component: () => <FilmShell film={FILM_5} />,
});
