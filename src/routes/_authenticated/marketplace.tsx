import { createFileRoute, Link } from "@tanstack/react-router";
import { Store, Sparkles, Image, FileText, Languages, Calculator, Brain, Code2, Mic, BarChart3, Search, Wand2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { PageHeader, Section, ModuleCard } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/marketplace")({
  component: MarketplacePage,
});

// Each tool routes to a real working workspace. /aria accepts ?prompt= to prefill.
const TOOLS: Array<{
  icon: typeof Sparkles;
  key: string;
  cat: string;
  to: string;
  prompt?: string;
}> = [
  { icon: Sparkles, key: "summarize", cat: "text", to: "/aria", prompt: "لخّص الوثيقة التالية بأهم النقاط التنفيذية:" },
  { icon: Image, key: "image_gen", cat: "media", to: "/aria", prompt: "أنشئ صورة احترافية بمواصفات:" },
  { icon: FileText, key: "doc_qa", cat: "docs", to: "/aria-documents" },
  { icon: Languages, key: "translate", cat: "text", to: "/aria", prompt: "ترجم النص التالي بدقة وسياق احترافي:" },
  { icon: Calculator, key: "spreadsheet", cat: "data", to: "/aria-documents" },
  { icon: Brain, key: "research", cat: "research", to: "/aria", prompt: "أجرِ بحثاً عميقاً متعدد المصادر حول:" },
  { icon: Code2, key: "code_review", cat: "dev", to: "/aria", prompt: "راجع الكود التالي واقترح تحسينات:" },
  { icon: Mic, key: "transcribe", cat: "media", to: "/voice" },
  { icon: BarChart3, key: "data_viz", cat: "data", to: "/analytics" },
  { icon: Search, key: "web_search", cat: "research", to: "/aria", prompt: "ابحث في الإنترنت عن أحدث المعلومات حول:" },
  { icon: Wand2, key: "rewrite", cat: "text", to: "/aria", prompt: "أعد صياغة النص التالي بأسلوب احترافي:" },
];

const NAMES: Record<string, { ar: string; en: string; d_ar: string; d_en: string }> = {
  summarize: { ar: "ملخّص ذكي", en: "Smart Summarizer", d_ar: "لخّص أي وثيقة في ثوانٍ.", d_en: "Summarize any document in seconds." },
  image_gen: { ar: "مولّد الصور", en: "Image Generator", d_ar: "صور احترافية من نص.", d_en: "Pro-grade images from text." },
  doc_qa: { ar: "أسئلة على المستندات", en: "Doc Q&A", d_ar: "اسأل ملفاتك مباشرة.", d_en: "Ask your files directly." },
  translate: { ar: "ترجمة احترافية", en: "Pro Translator", d_ar: "ترجمة دقيقة بسياق.", d_en: "Context-aware translation." },
  spreadsheet: { ar: "محلل جداول", en: "Spreadsheet Analyst", d_ar: "تحليل بيانات Excel/CSV.", d_en: "Analyze Excel/CSV data." },
  research: { ar: "باحث عميق", en: "Deep Research", d_ar: "بحث متعدد المصادر.", d_en: "Multi-source research." },
  code_review: { ar: "مراجع الكود", en: "Code Reviewer", d_ar: "اكتشاف الأخطاء والتحسينات.", d_en: "Detect bugs and improvements." },
  transcribe: { ar: "تفريغ صوتي", en: "Transcription", d_ar: "صوت إلى نص بدقة عالية.", d_en: "Speech-to-text with high accuracy." },
  data_viz: { ar: "تصور البيانات", en: "Data Visualizer", d_ar: "رسوم بيانية تلقائية.", d_en: "Auto-generated charts." },
  web_search: { ar: "بحث ويب", en: "Web Search", d_ar: "نتائج محدّثة من الإنترنت.", d_en: "Fresh internet results." },
  rewrite: { ar: "إعادة صياغة", en: "Rewriter", d_ar: "حسّن أسلوب النص.", d_en: "Polish any text." },
};

function MarketplacePage() {
  const { t, locale } = useI18n();
  const [q, setQ] = useState("");
  const filtered = TOOLS.filter((tool) =>
    !q || NAMES[tool.key].ar.includes(q) || NAMES[tool.key].en.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <Section>
      <PageHeader
        icon={Store}
        title={t("nav.marketplace")}
        subtitle={locale === "ar" ? "اكتشف وفعّل أدوات الذكاء الاصطناعي." : "Discover and activate AI tools."}
        badge={`${TOOLS.length}+ tools`}
      />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={locale === "ar" ? "ابحث عن أداة..." : "Search tools..."}
        className="max-w-sm"
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((tool) => {
          const n = NAMES[tool.key];
          const search = tool.prompt ? { prompt: tool.prompt } : undefined;
          return (
            <ModuleCard
              key={tool.key}
              icon={tool.icon}
              title={locale === "ar" ? n.ar : n.en}
              description={locale === "ar" ? n.d_ar : n.d_en}
              tag={tool.cat}
            >
              <Button size="sm" variant="outline" className="w-full" asChild>
                <Link to={tool.to} search={search as never}>
                  {locale === "ar" ? "تفعيل" : "Activate"}
                </Link>
              </Button>
            </ModuleCard>
          );
        })}
      </div>
    </Section>
  );
}

