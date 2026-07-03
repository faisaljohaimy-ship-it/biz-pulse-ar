import { createFileRoute, Link } from "@tanstack/react-router";
import { FILMS } from "@/components/promo/films";

export const Route = createFileRoute("/promo/")({
  head: () => ({
    meta: [
      { title: "نيكسوس — سلسلة الأفلام التنفيذية" },
      { name: "description", content: "خمسة أفلام تنفيذية قصيرة تشرح نيكسوس بالأرقام والمشاهد." },
      { property: "og:title", content: "نيكسوس — سلسلة الأفلام التنفيذية" },
      { property: "og:description", content: "خمسة أفلام تنفيذية قصيرة تشرح نيكسوس." },
    ],
  }),
  component: PromoHub,
});

function PromoHub() {
  return (
    <div dir="rtl" className="min-h-screen bg-[#04070F] text-white">
      <div className="mx-auto max-w-6xl px-5 py-14 md:py-20">
        <header className="mb-10 text-center">
          <div className="mb-2 text-[10px] uppercase tracking-[0.55em] text-white/50">
            Nexios · Cinematic Suite
          </div>
          <h1 className="text-4xl font-black md:text-6xl">سلسلة الأفلام التنفيذية</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-white/70 md:text-base">
            أربعة أفلام قصيرة — كل فيلم يحكي زاوية مختلفة من نيكسوس، بلغة تنفيذية وبصريات سينمائية.
          </p>
        </header>

        <div className="grid gap-5 md:grid-cols-2">
          {FILMS.map((f, i) => (
            <Link
              key={f.slug}
              to={`/promo/${f.slug}` as never}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-all hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.06]"
            >
              <div
                className="absolute inset-0 opacity-30 transition-opacity group-hover:opacity-60"
                style={{
                  background: `radial-gradient(60% 60% at 20% 20%, ${f.accent}55 0%, transparent 60%)`,
                }}
              />
              <div className="relative">
                <div
                  className="mb-3 text-[10px] uppercase tracking-[0.4em]"
                  style={{ color: f.accent }}
                >
                  Film {String(i + 1).padStart(2, "0")}
                </div>
                <h2 className="text-2xl font-black leading-snug md:text-3xl">{f.titleAr}</h2>
                {f.subtitleAr && (
                  <p className="mt-3 text-sm text-white/70">{f.subtitleAr}</p>
                )}
                <div className="mt-6 flex items-center gap-3 text-xs text-white/60">
                  <span className="rounded-full border border-white/15 px-3 py-1">
                    ⏱ {Math.round(f.duration)} ثانية
                  </span>
                  <span className="rounded-full border border-white/15 px-3 py-1">
                    {f.scenes.length} مشاهد
                  </span>
                  <span
                    className="mr-auto inline-flex items-center gap-1 rounded-full px-3 py-1 text-black"
                    style={{ background: f.accent }}
                  >
                    ▶ شاهد
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12 text-center text-xs text-white/40">
          الملفات الصوتية والفيديوهات: <code>/promo/audio/f1..f4.mp3</code> ·{" "}
          <code>/promo/video/f1..f4.mp4</code>
        </div>
      </div>
    </div>
  );
}
