import { createFileRoute, Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { DOMAIN_URL } from "@/lib/domain";
import { ArrowLeft, Play, Clock } from "lucide-react";
import cinematicCity from "@/assets/cinematic-city.jpg";
import cinematicBoardroom from "@/assets/cinematic-boardroom.jpg";
import cinematicEarth from "@/assets/cinematic-earth.jpg";

export const Route = createFileRoute("/films")({
  head: () => ({
    meta: [
      { title: "Investor Film Center — Nexus AI OS" },
      { name: "description", content: "Cinematic films showcasing Nexus AI OS: ARIA, Digital Twin, Boardroom, Analytics, and the investor story in Arabic and English." },
      { property: "og:title", content: "Investor Film Center — Nexus AI OS" },
      { property: "og:url", content: `${DOMAIN_URL}/films` },
      { property: "og:image", content: `${DOMAIN_URL}/og-image.jpg` },
    ],
    links: [{ rel: "canonical", href: `${DOMAIN_URL}/films` }],
  }),
  component: FilmsPage,
});

type Film = {
  id: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  duration: string;
  poster: string;
  badgeAr: string;
  badgeEn: string;
  accent: "gold" | "blue" | "violet";
};

const FILMS: Film[] = [
  {
    id: "investor-ar",
    titleAr: "الفيلم الاستثماري — العربية",
    titleEn: "Investor Film — Arabic",
    descAr: "قصة نكسس من فوضى البيانات إلى ذكاء القرار التنفيذي.",
    descEn: "The Nexus story — from data chaos to executive decision intelligence.",
    duration: "4:32",
    poster: cinematicCity,
    badgeAr: "رئيسي",
    badgeEn: "Headline",
    accent: "gold",
  },
  {
    id: "investor-en",
    titleAr: "الفيلم الاستثماري — الإنجليزية",
    titleEn: "Investor Film — English",
    descAr: "Nexus AI OS as the operating layer of the modern enterprise.",
    descEn: "Nexus AI OS as the operating layer of the modern enterprise.",
    duration: "4:32",
    poster: cinematicEarth,
    badgeAr: "رئيسي",
    badgeEn: "Headline",
    accent: "blue",
  },
  {
    id: "walkthrough",
    titleAr: "شرح النظام الكامل",
    titleEn: "Product Walkthrough",
    descAr: "جولة تنفيذية في كل وحدات نكسس.",
    descEn: "Executive tour across every module of Nexus.",
    duration: "7:18",
    poster: cinematicBoardroom,
    badgeAr: "تفصيلي",
    badgeEn: "Deep Dive",
    accent: "violet",
  },
  {
    id: "aria",
    titleAr: "ARIA — الذكاء التنفيذي",
    titleEn: "ARIA — Executive Intelligence",
    descAr: "كيف يتحول كل سؤال تنفيذي إلى قرار مُسنَد بالبيانات.",
    descEn: "How every executive question becomes a data-grounded decision.",
    duration: "3:05",
    poster: cinematicBoardroom,
    badgeAr: "مساعد",
    badgeEn: "Assistant",
    accent: "violet",
  },
  {
    id: "digital-twin",
    titleAr: "التوأم الرقمي للمؤسسة",
    titleEn: "Digital Twin",
    descAr: "المؤسسة كمدينة حية: إدارات وأحياء، مخاطر وفرص.",
    descEn: "The enterprise as a living city — districts, risks, opportunities.",
    duration: "2:44",
    poster: cinematicCity,
    badgeAr: "تجربة",
    badgeEn: "Experience",
    accent: "gold",
  },
  {
    id: "boardroom",
    titleAr: "تجربة قاعة المجلس",
    titleEn: "Boardroom Experience",
    descAr: "موجزات مجلس الإدارة، السيناريوهات، توصيات ARIA.",
    descEn: "Board briefings, scenarios, and ARIA recommendations.",
    duration: "3:50",
    poster: cinematicBoardroom,
    badgeAr: "تنفيذي",
    badgeEn: "Executive",
    accent: "blue",
  },
  {
    id: "analytics",
    titleAr: "التحليلات الحية",
    titleEn: "Live Analytics",
    descAr: "مؤشرات أداء حية مع تفسير سببي تلقائي.",
    descEn: "Live KPIs with automatic causal explanation.",
    duration: "2:12",
    poster: cinematicEarth,
    badgeAr: "بيانات",
    badgeEn: "Data",
    accent: "blue",
  },
  {
    id: "roi",
    titleAr: "العائد على الاستثمار",
    titleEn: "ROI",
    descAr: "كيف يَفُكُّ نكسس ٣٥٪ من التكاليف ويُسرّع التقارير ٩٠٪.",
    descEn: "How Nexus removes 35% of costs and accelerates reporting 90%.",
    duration: "1:48",
    poster: cinematicCity,
    badgeAr: "أرقام",
    badgeEn: "Numbers",
    accent: "gold",
  },
];

const accentBorder = {
  gold: "border-amber-400/40 group-hover:border-amber-400/80",
  blue: "border-blue-400/40 group-hover:border-blue-400/80",
  violet: "border-violet-400/40 group-hover:border-violet-400/80",
} as const;

const accentGlow = {
  gold: "shadow-[0_0_40px_-10px_rgba(245,180,84,0.5)]",
  blue: "shadow-[0_0_40px_-10px_rgba(58,142,255,0.55)]",
  violet: "shadow-[0_0_40px_-10px_rgba(168,85,247,0.55)]",
} as const;

function FilmsPage() {
  const { locale } = useI18n();
  const isAr = locale === "ar";

  return (
    <main className="min-h-screen bg-[#04060d] text-foreground">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:py-14">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {isAr ? "العودة" : "Back"}
        </Link>

        <header className="mt-8 max-w-3xl">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-400/90">
            {isAr ? "مركز الأفلام" : "Film Center"}
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            {isAr ? "ثمانية أفلام. قصة واحدة." : "Eight films. One story."}
          </h1>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            {isAr
              ? "نكسس بعيون مجلس الإدارة، المستثمر، الفريق التنفيذي، وفرق التحول."
              : "Nexus through the eyes of the board, the investor, the executive team, and transformation leaders."}
          </p>
        </header>

        <section className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FILMS.map((f) => (
            <article
              key={f.id}
              className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-card/30 backdrop-blur-sm transition-all hover:-translate-y-1 ${accentBorder[f.accent]} ${accentGlow[f.accent]}`}
            >
              <div className="relative aspect-video overflow-hidden">
                <img
                  src={f.poster}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 h-full w-full scale-105 object-cover opacity-80 transition-transform duration-700 group-hover:scale-110 group-hover:opacity-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#04060d] via-[#04060d]/40 to-transparent" />
                <div className="absolute inset-x-0 top-3 flex items-center justify-between px-4 text-[10px] uppercase tracking-[0.2em]">
                  <span className="rounded-full border border-white/20 bg-black/40 px-2.5 py-1 text-white/90 backdrop-blur-sm">
                    {isAr ? f.badgeAr : f.badgeEn}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/40 px-2.5 py-1 text-white/90 backdrop-blur-sm">
                    <Clock className="h-3 w-3" />
                    {f.duration}
                  </span>
                </div>
                <button
                  type="button"
                  aria-label={isAr ? "تشغيل" : "Play"}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/30 bg-black/40 backdrop-blur-md transition-transform group-hover:scale-110 group-hover:bg-white/10">
                    <Play className="h-7 w-7 translate-x-0.5 fill-white text-white" />
                  </span>
                </button>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h2 className="text-lg font-semibold leading-snug">
                  {isAr ? f.titleAr : f.titleEn}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {isAr ? f.descAr : f.descEn}
                </p>
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{isAr ? "قريباً" : "Coming soon"}</span>
                  <span className="rounded-full border border-border px-2 py-0.5">HD · 4K</span>
                </div>
              </div>
            </article>
          ))}
        </section>

        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-muted-foreground">
            {isAr
              ? "تريد عرضاً مباشراً بدل المشاهدة؟"
              : "Prefer a live walkthrough?"}
          </p>
          <Link
            to="/request-demo"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-6 py-3 text-sm font-semibold text-black transition hover:opacity-90"
          >
            {isAr ? "اطلب عرضاً تنفيذياً" : "Request executive demo"}
          </Link>
        </div>
      </div>
    </main>
  );
}
