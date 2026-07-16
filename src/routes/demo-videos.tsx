import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { DOMAIN_URL } from "@/lib/domain";
import {
  ArrowLeft,
  Play,
  FileText,
  Crown,
  Landmark,
  Building2,
  Briefcase,
  Compass,
  Calculator,
} from "lucide-react";

export const Route = createFileRoute("/demo-videos")({
  head: () => ({
    meta: [
      { title: "Demo Video Hub — NEXUS AI OS" },
      {
        name: "description",
        content:
          "Executive overview, government, enterprise, investor, product walkthrough, and ROI demonstration videos for NEXUS AI OS.",
      },
      { property: "og:title", content: "NEXUS AI OS — Demo Video Hub" },
      { property: "og:url", content: `${DOMAIN_URL}/demo-videos` },
    ],
    links: [{ rel: "canonical", href: `${DOMAIN_URL}/demo-videos` }],
  }),
  component: DemoVideosPage,
});

type Video = {
  id: string;
  icon: React.ReactNode;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  duration: string;
  audience: string;
  pdf?: string;
};

const VIDEOS: Video[] = [
  {
    id: "executive",
    icon: <Crown className="h-5 w-5" />,
    titleEn: "Executive Overview",
    titleAr: "النظرة التنفيذية",
    descEn: "The 90-second case for the autonomous enterprise.",
    descAr: "قضية المؤسسة المستقلة في 90 ثانية.",
    duration: "1:30",
    audience: "C-Suite",
  },
  {
    id: "government",
    icon: <Landmark className="h-5 w-5" />,
    titleEn: "Government Edition",
    titleAr: "النسخة الحكومية",
    descEn: "Saudi Vision 2030, NCA ECC, sovereign deployment.",
    descAr: "رؤية 2030، NCA ECC، النشر السيادي.",
    duration: "2:10",
    audience: "Ministers & Public Sector",
    pdf: "/briefs/nexus-government-brief-ar.pdf",
  },
  {
    id: "enterprise",
    icon: <Building2 className="h-5 w-5" />,
    titleEn: "Enterprise Edition",
    titleAr: "النسخة المؤسسية",
    descEn: "Digital Twin, ARIA Core, executive cockpit at scale.",
    descAr: "التوأم الرقمي، نواة ARIA، قمرة القيادة.",
    duration: "3:00",
    audience: "Large Enterprise",
  },
  {
    id: "investor",
    icon: <Briefcase className="h-5 w-5" />,
    titleEn: "Investor Edition",
    titleAr: "نسخة المستثمرين",
    descEn: "Series A thesis, moat, financial trajectory.",
    descAr: "أطروحة Series A، الميزة الدفاعية، المسار المالي.",
    duration: "2:30",
    audience: "Series A Investors",
  },
  {
    id: "walkthrough",
    icon: <Compass className="h-5 w-5" />,
    titleEn: "Product Walkthrough",
    titleAr: "الجولة في المنتج",
    descEn: "End-to-end tour: ingest → predict → decide → execute.",
    descAr: "جولة شاملة: الاستيعاب ← التنبؤ ← القرار ← التنفيذ.",
    duration: "4:45",
    audience: "Operators",
  },
  {
    id: "roi",
    icon: <Calculator className="h-5 w-5" />,
    titleEn: "ROI Demonstration",
    titleAr: "عرض العائد الاستثماري",
    descEn: "Live ROI model from inputs to payback in 60s.",
    descAr: "نموذج العائد الحي من المدخلات إلى الاسترداد في 60 ثانية.",
    duration: "1:00",
    audience: "CFO Office",
  },
];

function DemoVideosPage() {
  const { locale } = useI18n();
  const isAr = locale === "ar";
  const [active, setActive] = useState<string>(VIDEOS[0].id);

  const current = VIDEOS.find((v) => v.id === active) ?? VIDEOS[0];

  return (
    <div
      dir={isAr ? "rtl" : "ltr"}
      className="relative min-h-screen overflow-hidden bg-[#06070d] text-foreground"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(214,158,46,0.10),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(56,189,248,0.06),transparent_60%)]" />
        <div className="absolute inset-0 [background-image:linear-gradient(rgba(214,158,46,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(214,158,46,0.05)_1px,transparent_1px)] [background-size:48px_48px] opacity-30" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className={`h-4 w-4 ${isAr ? "rotate-180" : ""}`} />
          {isAr ? "العودة" : "Back"}
        </Link>
        <div className="text-xs uppercase tracking-[0.32em] text-amber-300/70">
          {isAr ? "مركز العروض التنفيذية" : "Demo Video Hub"}
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        <section className="mb-10 max-w-3xl">
          <h1 className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-4xl font-semibold leading-tight text-transparent sm:text-5xl">
            {isAr ? "تجربة قاعة مجلس الإدارة" : "A boardroom-grade viewing experience"}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {isAr
              ? "ست تجارب فيديو مصمَّمة للمستثمرين، الجهات الحكومية، والمؤسسات الكبرى — مع وثائق تنفيذية مرفقة."
              : "Six dedicated experiences engineered for investors, government, and large enterprises — each with executive documentation attached."}
          </p>
        </section>

        {/* Player */}
        <section className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
          <div className="rounded-2xl border border-amber-400/20 bg-black/40 p-3 shadow-[0_30px_120px_-30px_rgba(245,158,11,0.25)]">
            <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/5 bg-gradient-to-br from-[#0a1535] via-[#06070d] to-[#1a0a0a]">
              {/* Cinematic poster */}
              <div
                aria-hidden
                className="absolute inset-0 [background-image:radial-gradient(ellipse_at_center,rgba(245,158,11,0.25),transparent_60%)]"
              />
              <div
                aria-hidden
                className="absolute inset-0 [background-image:linear-gradient(rgba(245,158,11,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(245,158,11,0.05)_1px,transparent_1px)] [background-size:48px_48px] opacity-40"
              />
              <div className="relative z-10 flex h-full flex-col items-center justify-center text-center">
                <button
                  type="button"
                  className="group grid h-20 w-20 place-items-center rounded-full border border-amber-400/40 bg-amber-400/10 backdrop-blur transition hover:scale-105 hover:bg-amber-400/20"
                  aria-label={isAr ? "تشغيل" : "Play"}
                >
                  <Play className="h-8 w-8 fill-amber-300 text-amber-300" />
                </button>
                <div className="mt-6 text-xs uppercase tracking-[0.32em] text-amber-300/80">
                  {current.audience}
                </div>
                <div className="mt-2 text-2xl font-semibold text-foreground">
                  {isAr ? current.titleAr : current.titleEn}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {current.duration} · NEXUS · AI OS
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-4">
              <p className="max-w-2xl text-sm text-muted-foreground">
                {isAr ? current.descAr : current.descEn}
              </p>
              <div className="flex gap-2">
                {current.pdf && (
                  <a
                    href={current.pdf}
                    download
                    className="inline-flex items-center gap-2 rounded-lg border border-amber-400/30 px-3 py-2 text-xs text-amber-200/90 hover:bg-amber-400/5"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    {isAr ? "تحميل الملف PDF" : "Download PDF"}
                  </a>
                )}
                <Link
                  to="/executive-booking"
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 px-3 py-2 text-xs font-medium text-[#0a0a0f] hover:from-amber-300 hover:to-amber-400"
                >
                  {isAr ? "احجز جلسة تنفيذية" : "Book Executive Session"}
                </Link>
              </div>
            </div>
          </div>

          {/* Library */}
          <aside className="space-y-3">
            <div className="mb-2 text-xs uppercase tracking-[0.24em] text-amber-300/80">
              {isAr ? "المكتبة" : "Library"}
            </div>
            {VIDEOS.map((v) => {
              const isActive = v.id === active;
              return (
                <button
                  key={v.id}
                  onClick={() => setActive(v.id)}
                  className={`w-full rounded-xl border p-4 text-start transition ${
                    isActive
                      ? "border-amber-400/40 bg-amber-400/[0.06]"
                      : "border-white/10 bg-white/[0.02] hover:border-amber-400/20 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`grid h-9 w-9 place-items-center rounded-lg border ${isActive ? "border-amber-400/40 text-amber-300" : "border-white/10 text-muted-foreground"}`}
                    >
                      {v.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">
                        {isAr ? v.titleAr : v.titleEn}
                      </div>
                      <div className="truncate text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        {v.audience} · {v.duration}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}

            <div className="mt-6 rounded-xl border border-white/5 bg-white/[0.02] p-4 text-xs text-muted-foreground">
              {isAr
                ? "لطلب نسخ مخصّصة (نسخة 30 ثانية ترويجية، أو نسخة رأسية 9:16) تواصل مع فريق العملاء التنفيذيين."
                : "For tailored cuts (30s promo or 9:16 vertical), contact the executive accounts team."}
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
