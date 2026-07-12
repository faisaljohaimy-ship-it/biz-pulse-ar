import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, Shield, Bot, FileText, Smartphone, Radar } from "lucide-react";
import { AriaSignatureBackdrop } from "@/components/aria/AriaSignatureBackdrop";
import { DOMAIN_URL } from "@/lib/domain";

const APP_VERSION = "2.4.0";
const LAST_UPDATE = "2026-07-13";

const CAPABILITIES = [
  { icon: Sparkles, title: "عقل تنفيذي", desc: "RAG فوق المعرفة والذاكرة، وتعلّم أسبوعي ذاتي." },
  { icon: Bot, title: "وكلاء أذكياء", desc: "تنفيذ مهام الأمن الصناعي باقتراح واعتماد بشري." },
  { icon: Shield, title: "أمن صناعي", desc: "مؤشرات، حوادث، دوريات، وامتثال عبر أربع مناطق." },
  { icon: FileText, title: "تقارير ومستندات", desc: "PDF عربي فاخر ببصمة آريا، وتصدير Excel." },
  { icon: Radar, title: "توصيات استباقية", desc: "ملخص يومي وتوصيات مشتقّة من البيانات الحيّة." },
  {
    icon: Smartphone,
    title: "تطبيق لكل الأجهزة",
    desc: "PWA يُثبَّت من رابط واحد على الجوال والحاسب.",
  },
];

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "حول آريا · About ARIA — NEXIOS AI OS" },
      {
        name: "description",
        content: "آريا — الوكيلة التنفيذية لإدارة الأمن الصناعي في NEXIOS.",
      },
      { property: "og:title", content: "حول آريا · About ARIA" },
      { property: "og:url", content: `${DOMAIN_URL}/about` },
    ],
    links: [{ rel: "canonical", href: `${DOMAIN_URL}/about` }],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div
      dir="rtl"
      className="relative isolate min-h-screen overflow-hidden bg-[#04070F] text-white"
    >
      <AriaSignatureBackdrop intensity={1.4} />
      <main className="relative z-10 mx-auto w-full max-w-3xl px-4 py-14 sm:py-20">
        <div className="mb-2 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#3AE8FF]/12 text-[#3AE8FF]">
            <Sparkles className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-black sm:text-3xl">حول آريا</h1>
            <p className="text-sm text-white/55">الوكيلة التنفيذية لإدارة الأمن الصناعي — NEXIOS</p>
          </div>
        </div>

        <p className="mt-6 text-[15px] leading-relaxed text-white/80">
          آريا مساعِدة ذكية تنفيذية تعمل بالعربية الفصحى، بصوت رسمي واحد مقفل، وذاكرة تمتدّ عبر
          الجلسات، وتحسّن نفسها أسبوعيّاً من الأسئلة الضعيفة. تعمل على جميع الأجهزة، بهوية بصرية
          واحدة عبر كل نقاط اللمس.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {CAPABILITIES.map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.title}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm"
              >
                <Icon className="h-5 w-5 text-[#3AE8FF]" aria-hidden />
                <div className="mt-2 text-sm font-bold">{c.title}</div>
                <div className="mt-1 text-[12px] leading-relaxed text-white/60">{c.desc}</div>
              </div>
            );
          })}
        </div>

        <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-3 rounded-2xl border border-[#3AE8FF]/15 bg-[#061A2E]/50 p-4 text-sm">
          <div>
            <dt className="text-[11px] uppercase tracking-widest text-white/45">الإصدار</dt>
            <dd className="font-mono font-semibold text-[#3AE8FF]">v{APP_VERSION}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-widest text-white/45">آخر تحديث</dt>
            <dd className="font-mono font-semibold text-emerald-300">{LAST_UPDATE}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-widest text-white/45">الحالة</dt>
            <dd>
              <Link
                to="/status"
                className="font-semibold text-white/85 underline-offset-4 hover:underline"
              >
                لوحة الحالة التشغيلية
              </Link>
            </dd>
          </div>
        </dl>

        <div className="mt-8">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#3AE8FF]/35 bg-[#3AE8FF]/[0.06] px-5 text-sm font-semibold text-[#3AE8FF] transition hover:bg-[#3AE8FF]/10"
          >
            ← العودة إلى الواجهة الرئيسية
          </Link>
        </div>
      </main>
    </div>
  );
}
