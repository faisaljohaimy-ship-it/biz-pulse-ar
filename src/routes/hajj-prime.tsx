// /hajj-prime — dashboard embed of the external Nusuk Hajj platform.
// The URL is resolved ONLY through hajjEmbedUrl() (env: VITE_HAJJ_EMBED_URL)
// and is never rendered as visible text — the UI always shows the product
// label "منصة نُسك الحج". The iframe fills the viewport on every device
// (mobile, tablet, laptop) so the embedded dashboard preserves its own
// layout exactly as-is.
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  hajjEmbedUrl,
  hajjOpenUrl,
  HAJJ_PLATFORM_LABEL_AR,
  HAJJ_PLATFORM_LABEL_EN,
} from "@/lib/hajj-embed";

export const Route = createFileRoute("/hajj-prime")({
  component: HajjPrimeEmbed,
  head: () => ({
    meta: [
      { title: `${HAJJ_PLATFORM_LABEL_AR} · ${HAJJ_PLATFORM_LABEL_EN} — Neexios` },
      {
        name: "description",
        content: "منصة نُسك الحج داخل Neexios · لوحة قيادة عمليات الحج مشاعر 1447.",
      },
      { name: "color-scheme", content: "dark" },
      { name: "theme-color", content: "#061A2E" },
      // Frame is only useful inside the app shell; keep it out of search indexes.
      { name: "robots", content: "noindex" },
      { property: "og:title", content: `${HAJJ_PLATFORM_LABEL_AR} · ${HAJJ_PLATFORM_LABEL_EN}` },
      { property: "og:description", content: "مركز قيادة عمليات الحج مشاعر 1447 داخل Neexios." },
      { property: "og:url", content: "https://neexios.com/hajj-prime" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://neexios.com/hajj-prime" }],
  }),
});

function HajjPrimeEmbed() {
  const src = hajjEmbedUrl();
  const openUrl = hajjOpenUrl();

  if (!src) {
    return (
      <main
        dir="rtl"
        className="grid min-h-[100dvh] place-items-center bg-[#04070F] p-6 text-slate-100"
      >
        <div className="max-w-md rounded-2xl border border-emerald-400/20 bg-slate-900/60 p-6 text-center">
          <div className="text-lg font-semibold text-emerald-300">{HAJJ_PLATFORM_LABEL_AR}</div>
          <p className="mt-2 text-sm text-slate-300">
            التضمين المباشر غير مُفعَّل حالياً على هذا الخادم.
          </p>
          {openUrl ? (
            <a
              href={openUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/20"
            >
              فتح {HAJJ_PLATFORM_LABEL_AR}
            </a>
          ) : (
            <Link
              to="/hajj"
              className="mt-4 inline-block rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/20"
            >
              الانتقال إلى {HAJJ_PLATFORM_LABEL_AR}
            </Link>
          )}
        </div>
      </main>
    );
  }

  return (
    <main dir="rtl" className="fixed inset-0 h-[100dvh] w-screen bg-[#04070F]">
      <iframe
        src={src}
        title={`${HAJJ_PLATFORM_LABEL_AR} · ${HAJJ_PLATFORM_LABEL_EN}`}
        className="block h-full w-full border-0"
        allow="fullscreen; clipboard-read; clipboard-write; geolocation; microphone"
        allowFullScreen
        // sandbox omitted intentionally: the dashboard needs its own auth,
        // storage, and scripts to render exactly as-is on the source site.
      />
    </main>
  );
}
