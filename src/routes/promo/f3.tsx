import { createFileRoute } from "@tanstack/react-router";
import { FilmShell } from "@/components/promo/FilmShell";
import { FILM_3 } from "@/components/promo/films";

export const Route = createFileRoute("/promo/f3")({
  head: () => ({
    meta: [
      { title: "نيكسوس — أقصى استفادة" },
      { name: "description", content: "أربع عادات لمستخدمي نيكسوس المحترفين." },
      { property: "og:title", content: "نيكسوس — أقصى استفادة" },
      { property: "og:description", content: "عادات المحترفين في نيكسوس." },
    ],
  }),
  component: () => <FilmShell film={FILM_3} />,
});
