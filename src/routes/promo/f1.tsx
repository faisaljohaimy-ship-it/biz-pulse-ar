import { createFileRoute } from "@tanstack/react-router";
import { FilmShell } from "@/components/promo/FilmShell";
import { FILM_1 } from "@/components/promo/films";

export const Route = createFileRoute("/promo/f1")({
  head: () => ({
    meta: [
      { title: "نيكسوس — صدمة الواقع التشغيلي" },
      { name: "description", content: "من الفوضى التشغيلية إلى الذكاء المؤسسي — بالأرقام." },
      { property: "og:title", content: "نيكسوس — صدمة الواقع التشغيلي" },
      { property: "og:description", content: "فيلم تنفيذي — مشكلات وحلول بالأرقام." },
    ],
  }),
  component: () => <FilmShell film={FILM_1} />,
});
