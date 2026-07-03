import { createFileRoute } from "@tanstack/react-router";
import { FilmShell } from "@/components/promo/FilmShell";
import { FILM_4 } from "@/components/promo/films";

export const Route = createFileRoute("/promo/f4")({
  head: () => ({
    meta: [
      { title: "نيكسوس — فوائد تتحدث بالأرقام" },
      { name: "description", content: "عائد نيكسوس التنفيذي بلغة الأرقام." },
      { property: "og:title", content: "نيكسوس — فوائد تتحدث بالأرقام" },
      { property: "og:description", content: "ROI نيكسوس بلغة مجلس الإدارة." },
    ],
  }),
  component: () => <FilmShell film={FILM_4} />,
});
