import { createFileRoute, Link } from "@tanstack/react-router";
import { Bot, Sparkles, BarChart3, Megaphone, Shield, Code2, FileText, Headphones, Rocket } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { PageHeader, Section, ModuleCard } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/agents")({
  component: AgentsPage,
});

const AGENTS = [
  { key: "executive", icon: Sparkles, model: "Gemini 3 Flash", tag: "Active" },
  { key: "analyst", icon: BarChart3, model: "Gemini 3 Flash", tag: "Active" },
  { key: "marketer", icon: Megaphone, model: "Gemini 3 Flash", tag: "Active" },
  { key: "security", icon: Shield, model: "Gemini 3 Flash", tag: "Active" },
  { key: "engineer", icon: Code2, model: "GPT-5 mini", tag: "Active" },
  { key: "writer", icon: FileText, model: "Gemini 3 Flash", tag: "Active" },
  { key: "support", icon: Headphones, model: "Gemini 3 Flash", tag: "Active" },
  { key: "research", icon: Bot, model: "Gemini 3 Flash", tag: "Active" },
  { key: "pilot", icon: Rocket, model: "Gemini 3 Flash", tag: "Pilot" },
];

const NAMES: Record<string, { ar: string; en: string; desc_ar: string; desc_en: string }> = {
  executive: { ar: "المستشار التنفيذي", en: "Executive Advisor", desc_ar: "قرارات استراتيجية وتقارير قيادية.", desc_en: "Strategic decisions and leadership briefings." },
  analyst: { ar: "محلل البيانات", en: "Data Analyst", desc_ar: "تحليل KPI وتوقعات النمو.", desc_en: "KPI analysis and growth forecasting." },
  marketer: { ar: "مدير التسويق", en: "Marketing Lead", desc_ar: "حملات ومحتوى موجه.", desc_en: "Campaigns and targeted content." },
  security: { ar: "محلل أمني", en: "Security Analyst", desc_ar: "كشف الثغرات والتهديدات.", desc_en: "Threat & vulnerability detection." },
  engineer: { ar: "مهندس برمجيات", en: "Software Engineer", desc_ar: "كتابة كود ومراجعات تقنية.", desc_en: "Code generation and technical reviews." },
  writer: { ar: "كاتب محترف", en: "Professional Writer", desc_ar: "وثائق ومقالات احترافية.", desc_en: "Polished documents and articles." },
  support: { ar: "دعم العملاء", en: "Customer Support", desc_ar: "ردود سريعة ومتعاطفة.", desc_en: "Fast, empathetic responses." },
  research: { ar: "باحث ذكي", en: "Research Agent", desc_ar: "جمع وتلخيص المعلومات.", desc_en: "Aggregate and summarize sources." },
  pilot: { ar: "وكيل Pilot", en: "Pilot Agent", desc_ar: "تجربة تنفيذية جاهزة لتكوين السيناريوهات وتشغيلها عبر ARIA.", desc_en: "Production pilot orchestration ready for scenario setup through ARIA." },
};

function AgentsPage() {
  const { locale, t } = useI18n();
  return (
    <Section>
      <PageHeader
        icon={Bot}
        title={t("nav.agents")}
        subtitle={locale === "ar" ? "فريق متكامل من الوكلاء الذكيين متخصصين في مهام مختلفة." : "A team of specialized AI agents, each tuned for a different mission."}
        badge="Multi-Agent"
        actions={
          <Button asChild>
            <Link to="/assistant">{locale === "ar" ? "بدء محادثة" : "Start chat"}</Link>
          </Button>
        }
      />
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 shadow-glow">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold">{locale === "ar" ? "Pilot مفعل للإطلاق" : "Pilot is ready to launch"}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {locale === "ar"
                ? "استخدم ARIA لتكوين تجربة Pilot، ربط الوكلاء، وفتح التوأم الرقمي كغرفة تشغيل مباشرة."
                : "Use ARIA to configure a pilot, bind agents, and open the digital twin as a live operating room."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline"><Link to="/digital-twin">{locale === "ar" ? "افتح التوأم" : "Open Twin"}</Link></Button>
            <Button asChild><Link to="/assistant">{locale === "ar" ? "كوّن Pilot عبر ARIA" : "Configure Pilot in ARIA"}</Link></Button>
          </div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {AGENTS.map((a) => {
          const n = NAMES[a.key];
          return (
            <ModuleCard
              key={a.key}
              icon={a.icon}
              title={locale === "ar" ? n.ar : n.en}
              description={locale === "ar" ? n.desc_ar : n.desc_en}
              tag={a.tag}
            >
              <div className="flex items-center justify-between">
                <code className="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">{a.model}</code>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/assistant">{locale === "ar" ? "تشغيل" : "Run"}</Link>
                </Button>
              </div>
            </ModuleCard>
          );
        })}
      </div>
    </Section>
  );
}
