import { createFileRoute, Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { DOMAIN_URL } from "@/lib/domain";
import { ArrowLeft, FileText, Shield, Landmark, Briefcase, BookOpen, Lock } from "lucide-react";

export const Route = createFileRoute("/data-room")({
  head: () => ({
    meta: [
      { title: "Executive Data Room — NEXUS AI OS" },
      { name: "description", content: "Single confidential workspace for investor, government, security, compliance, ROI, and customer documents." },
      { property: "og:title", content: "NEXUS AI OS — Executive Data Room" },
      { property: "og:url", content: `${DOMAIN_URL}/data-room` },
    ],
    links: [{ rel: "canonical", href: `${DOMAIN_URL}/data-room` }],
  }),
  component: DataRoomPage,
});

type Doc = { title: string; titleAr: string; href: string; kind: "pdf" | "page"; note?: string; noteAr?: string };
type Section = { id: string; icon: React.ReactNode; title: string; titleAr: string; docs: Doc[] };

const SECTIONS: Section[] = [
  {
    id: "investor", icon: <Briefcase className="h-5 w-5" />, title: "Investor Documents", titleAr: "وثائق المستثمرين",
    docs: [
      { title: "Investor Deck V2 (Series A)", titleAr: "العرض الاستثماري V2", href: "/decks/nexus-investor-deck-v2.pptx", kind: "pdf", note: "PPTX · 14 slides", noteAr: "PPTX · 14 شريحة" },
      { title: "Final Readiness Audit", titleAr: "تدقيق الجاهزية النهائي", href: "/briefs/nexus-final-readiness-audit.pdf", kind: "pdf" },
      { title: "ROI Model", titleAr: "نموذج العائد", href: "/roi", kind: "page" },
    ],
  },
  {
    id: "government", icon: <Landmark className="h-5 w-5" />, title: "Government Documents", titleAr: "وثائق حكومية",
    docs: [
      { title: "Government Executive Brief (EN)", titleAr: "الملف الحكومي التنفيذي (EN)", href: "/briefs/nexus-government-brief-en.pdf", kind: "pdf" },
      { title: "الملف الحكومي التنفيذي (AR)", titleAr: "الملف الحكومي التنفيذي (عربي)", href: "/briefs/nexus-government-brief-ar.pdf", kind: "pdf" },
      { title: "Government Brief — Web", titleAr: "الملف الحكومي — صفحة", href: "/government-brief", kind: "page" },
    ],
  },
  {
    id: "security", icon: <Shield className="h-5 w-5" />, title: "Security Documents", titleAr: "وثائق الأمن",
    docs: [
      { title: "Trust Center", titleAr: "مركز الثقة", href: "/trust", kind: "page" },
      { title: "Security Controls", titleAr: "ضوابط الأمن", href: "/security", kind: "page" },
      { title: "Service Level Agreement", titleAr: "اتفاقية مستوى الخدمة", href: "/sla", kind: "page" },
    ],
  },
  {
    id: "compliance", icon: <BookOpen className="h-5 w-5" />, title: "Compliance Documents", titleAr: "وثائق الامتثال",
    docs: [
      { title: "Data Processing Addendum", titleAr: "ملحق معالجة البيانات", href: "/dpa", kind: "page" },
      { title: "Subprocessors", titleAr: "المعالجون من الباطن", href: "/subprocessors", kind: "page" },
      { title: "Privacy Policy", titleAr: "سياسة الخصوصية", href: "/privacy", kind: "page" },
      { title: "Terms", titleAr: "الشروط", href: "/terms", kind: "page" },
    ],
  },
  {
    id: "customers", icon: <FileText className="h-5 w-5" />, title: "Customer Evidence", titleAr: "أدلة العملاء",
    docs: [
      { title: "Anonymized Case Studies", titleAr: "قصص نجاح مجهولة الهوية", href: "/customers", kind: "page" },
      { title: "Executive Briefing", titleAr: "الإحاطة التنفيذية", href: "/executive-briefing", kind: "page" },
    ],
  },
];

function DataRoomPage() {
  const { locale } = useI18n();
  const isAr = locale === "ar";

  return (
    <div dir={isAr ? "rtl" : "ltr"} className="relative min-h-screen overflow-hidden bg-[#06070d] text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(214,158,46,0.10),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(56,189,248,0.06),transparent_60%)]" />
        <div className="absolute inset-0 [background-image:linear-gradient(rgba(214,158,46,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(214,158,46,0.05)_1px,transparent_1px)] [background-size:48px_48px] opacity-30" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className={`h-4 w-4 ${isAr ? "rotate-180" : ""}`} />
          {isAr ? "العودة" : "Back"}
        </Link>
        <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.32em] text-amber-300/70">
          <Lock className="h-3.5 w-3.5" />
          {isAr ? "غرفة البيانات التنفيذية" : "Executive Data Room"}
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        <section className="mb-10 max-w-3xl">
          <h1 className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-4xl font-semibold leading-tight text-transparent sm:text-5xl">
            {isAr ? "كل ما يحتاجه فريقك التنفيذي للقرار" : "Everything your executive team needs to decide"}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {isAr
              ? "غرفة بيانات مركزية للمستثمرين، الجهات الحكومية، ومسؤولي المشتريات المؤسسية. كل وثيقة ضمن سياسة الخصوصية واتفاقية معالجة البيانات."
              : "A single confidential workspace for investors, government leaders, and enterprise procurement. Every document under our Privacy Policy and DPA."}
          </p>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/5 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-amber-300">
            <Lock className="h-3 w-3" />
            {isAr ? "للتداول التنفيذي فقط" : "Executive distribution only"}
          </div>
        </section>

        <section className="space-y-6">
          {SECTIONS.map((s) => (
            <article key={s.id} className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
              <header className="mb-4 flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg border border-amber-400/30 bg-amber-400/5 text-amber-300">{s.icon}</span>
                <h2 className="text-base font-semibold text-foreground">{isAr ? s.titleAr : s.title}</h2>
              </header>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {s.docs.map((d) => {
                  const isExternal = d.href.startsWith("/briefs") || d.href.startsWith("/decks");
                  const inner = (
                    <div className="flex h-full items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-4 transition hover:border-amber-400/30 hover:bg-amber-400/[0.04]">
                      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground">{isAr ? d.titleAr : d.title}</div>
                        {(d.note || d.noteAr) && (
                          <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                            {isAr ? (d.noteAr ?? d.note) : d.note}
                          </div>
                        )}
                        {!d.note && (
                          <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                            {d.kind === "pdf" ? "PDF" : (isAr ? "صفحة" : "Page")}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                  return isExternal ? (
                    <a key={d.href} href={d.href} download className="block">{inner}</a>
                  ) : (
                    <Link key={d.href} to={d.href} className="block">{inner}</Link>
                  );
                })}
              </div>
            </article>
          ))}
        </section>

        <section className="mt-10 rounded-2xl border border-amber-400/15 bg-gradient-to-br from-amber-400/[0.06] via-white/[0.02] to-transparent p-8">
          <h3 className="text-sm uppercase tracking-[0.24em] text-amber-300/80">{isAr ? "تحتاج وصولاً موسَّعاً؟" : "Need broader access?"}</h3>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            {isAr
              ? "نُتيح غرفة بيانات موسَّعة بصلاحيات مخصّصة لفِرَق المشتريات الحكومية والمستثمرين المؤسسيين، تحت اتفاقية سرّية."
              : "Extended access — with custom permissions for government procurement and institutional investors — is available under NDA."}
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link to="/executive-booking" className="rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-2.5 text-center text-sm font-medium text-[#0a0a0f] hover:from-amber-300 hover:to-amber-400">
              {isAr ? "طلب وصول NDA" : "Request NDA access"}
            </Link>
            <Link to="/demo-videos" className="rounded-lg border border-amber-400/30 px-5 py-2.5 text-center text-sm text-amber-200/90 hover:bg-amber-400/5">
              {isAr ? "مشاهدة العروض التنفيذية" : "Watch executive demos"}
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
