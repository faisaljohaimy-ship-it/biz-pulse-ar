import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Sparkles, Shield, Bot, Radar, BarChart3, Moon } from "lucide-react";

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
  return (
    <div dir="rtl" className="relative min-h-screen overflow-hidden bg-[#061A2E] text-white">
      {/* Ambient layers */}
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(0,212,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="pointer-events-none absolute -top-40 left-1/4 h-[520px] w-[520px] rounded-full bg-[#00D4FF]/10 blur-[140px] animate-pulse" />
      <div className="pointer-events-none absolute -bottom-40 right-1/4 h-[520px] w-[520px] rounded-full bg-[#3AE8FF]/10 blur-[140px] animate-pulse" />

      <div className="relative z-10 mx-auto max-w-6xl px-6 py-16">
        {/* Hero */}
        <section className="text-center">
          <div className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-[#00D4FF]/40 bg-[#00D4FF]/10 shadow-[0_0_50px_rgba(0,212,255,0.5)]">
            <Sparkles className="h-8 w-8 text-[#3AE8FF]" />
          </div>
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            NEXUS AI OS
          </h1>
          <p className="mt-3 text-lg text-[#3AE8FF]/90">نظام التشغيل التنفيذي للأمن الصناعي</p>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
            منصة ذكاء اصطناعي مؤسسية موحّدة تدير العمليات الأمنية، التوأم الرقمي، التقارير التنفيذية،
            ونظام الحج — بقيادة المحرّك التنفيذي <span className="text-[#3AE8FF]">ARIA</span>.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/runtime-hub"
              className="group inline-flex items-center gap-2 rounded-xl border border-[#3AE8FF]/60 bg-gradient-to-r from-[#00D4FF]/20 to-[#3AE8FF]/15 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_40px_rgba(58,232,255,0.45)] transition hover:scale-[1.02] hover:shadow-[0_0_60px_rgba(58,232,255,0.7)]"
            >
              <span>الدخول إلى النظام</span>
              <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
            </Link>
            <Link
              to="/request-demo"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-6 py-3 text-sm font-medium text-white/80 transition hover:border-white/30 hover:bg-white/[0.08]"
            >
              طلب عرض تجريبي
            </Link>
          </div>
        </section>

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
