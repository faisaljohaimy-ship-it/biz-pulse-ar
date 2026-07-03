import { createFileRoute } from "@tanstack/react-router";
import { FilmShell } from "@/components/promo/FilmShell";
import { FILM_2 } from "@/components/promo/films";

export const Route = createFileRoute("/promo/f2")({
  head: () => ({
    meta: [
      { title: "نيكسوس — رحلة داخل نيكسوس" },
      { name: "description", content: "جولة أريا داخل مركز القيادة الرقمي." },
      { property: "og:title", content: "نيكسوس — رحلة داخل نيكسوس" },
      { property: "og:description", content: "جولة إرشادية بصوت أريا." },
    ],
  }),
  component: () => <FilmShell film={FILM_2} />,
});
