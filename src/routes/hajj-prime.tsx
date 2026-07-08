// /hajj-prime — legacy route. The previous implementation embedded an
// external deployment (hajj.neexios.com) via <iframe>, but that origin
// serves `X-Frame-Options: deny`, so users were stuck on an "Opening…"
// spinner forever. The real dashboard lives inside this app at /hajj
// (Hajj Operations Command Center, backed by hajj.functions.ts).
// This route now redirects there so any old links keep working.
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/hajj-prime")({
  beforeLoad: () => {
    throw redirect({ to: "/hajj" });
  },
  head: () => ({
    meta: [
      { title: "منصة نُسك الحج · Hajj Command — Neexios" },
      {
        name: "description",
        content: "منصة نُسك الحج داخل Neexios · مركز قيادة عمليات الحج مشاعر 1447.",
      },
      { name: "color-scheme", content: "dark" },
      { name: "theme-color", content: "#061A2E" },
      { property: "og:title", content: "منصة نُسك الحج · Hajj Command" },
      { property: "og:description", content: "مركز قيادة عمليات الحج مشاعر 1447 داخل Neexios." },
      { property: "og:url", content: "https://neexios.com/hajj" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://neexios.com/hajj" }],
  }),
});
