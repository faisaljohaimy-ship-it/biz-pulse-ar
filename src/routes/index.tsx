import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Sparkles, Shield, Bot, Radar, BarChart3, Moon } from "lucide-react";
import { NexusRevealHero } from "@/components/cinematic/NexusRevealHero";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NEXUS AI OS — Enterprise Industrial Security Operating System" },
      { name: "description", content: "AI-native operating system for industrial security, executive command, and Hajj operations. Powered by ARIA." },
      { property: "og:title", content: "NEXUS AI OS — Enterprise Industrial Security Operating System" },
      { property: "og:description", content: "Bilingual executive AI platform unifying security operations, digital twin, and real-time intelligence." },
    ],
  }),
  component: IntroLanding,
});

const PILLARS = [
  { icon: Shield,    title_ar: "أمن صناعي",       title_en: "Industrial Security", desc_ar: "حوادث، دوريات، تصاريح، زوار ومركبات في منصة موحّدة." },
  { icon: Bot,       title_ar: "وكلاء ذكاء",       title_en: "AI Agents",           desc_ar: "14+ وكيل تنفيذي مع تنسيق أدوات وسجل شرعي للأحداث." },
  { icon: Radar,     title_ar: "توأم رقمي حي",   title_en: "Live Digital Twin",   desc_ar: "تحديث لحظي للأصول والمواقع والعمليات عبر نبض المؤسسة." },
  { icon: BarChart3, title_ar: "تقارير تنفيذية",  title_en: "Executive Reports",   desc_ar: "مؤشرات أداء، RAG وذاكرة إنتاجية مع تسليم Outlook." },
  { icon: Moon,      title_ar: "نظام الحج",        title_en: "Hajj Operations",     desc_ar: "وحدة مشاعر 1447 لإدارة العمليات الميدانية في الموسم." },
  { icon: Sparkles,  title_ar: "ARIA التنفيذية",  title_en: "ARIA Engine",         desc_ar: "محرك GPT-5 ثنائي اللغة مع صوت طبيعي وذاكرة حية." },
] as const;

function IntroLanding() {
  const navigate = useNavigate();
  return (
    <div dir="rtl" className="relative min-h-screen overflow-hidden bg-black text-white">
      <NexusRevealHero onEnterOps={() => navigate({ to: "/runtime-hub" })} />

      <div className="relative z-10 mx-auto max-w-6xl px-6 py-16">


        {/* Pillars */}
        <section className="mt-16">
          <div className="mb-6 text-center">
            <div className="text-[11px] uppercase tracking-[0.3em] text-[#3AE8FF]/70">Capabilities</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">مكوّنات النظام</h2>
          </div>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PILLARS.map((p) => {
              const Icon = p.icon;
              return (
                <li
                  key={p.title_en}
                  className="group rounded-2xl border border-[#00D4FF]/25 bg-[#00D4FF]/[0.05] p-5 shadow-[0_0_24px_rgba(0,212,255,0.15)] transition hover:border-[#3AE8FF]/60 hover:bg-[#3AE8FF]/[0.08] hover:shadow-[0_0_40px_rgba(58,232,255,0.35)]"
                >
                  <div className="mb-3 flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00D4FF]/20 text-[#3AE8FF] shadow-[0_0_18px_rgba(0,212,255,0.5)]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{p.title_ar}</div>
                      <div className="text-[10px] uppercase tracking-[0.25em] text-white/40">{p.title_en}</div>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-white/65">{p.desc_ar}</p>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Footer CTA */}
        <section className="mt-16 rounded-2xl border border-[#00D4FF]/30 bg-gradient-to-br from-[#00D4FF]/10 to-transparent p-8 text-center shadow-[0_0_40px_rgba(0,212,255,0.2)]">
          <h3 className="text-xl font-semibold">جاهز للدخول إلى مركز القيادة؟</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm text-white/65">
            ادخل إلى Runtime Hub لرؤية جميع مراحل النظام مباشرة، مع وميض حي وروابط فعّالة لكل وحدة.
          </p>
          <div className="mt-5">
            <Link
              to="/runtime-hub"
              className="inline-flex items-center gap-2 rounded-xl border border-[#3AE8FF]/60 bg-[#3AE8FF]/10 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_30px_rgba(58,232,255,0.4)] transition hover:bg-[#3AE8FF]/20"
            >
              <span>دخول النظام</span>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <p className="mt-10 text-center text-[11px] uppercase tracking-[0.3em] text-white/30">
          NEXUS AI OS · v1.0 GA
        </p>
      </div>
    </div>
  );
}
