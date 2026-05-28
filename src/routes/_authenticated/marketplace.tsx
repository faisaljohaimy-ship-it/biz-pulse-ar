import { createFileRoute } from "@tanstack/react-router";
import { Store, Sparkles, Image, FileText, Languages, Calculator, Brain, Code2, Mic, BarChart3, Search, Wand2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { PageHeader, Section, ModuleCard } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/marketplace")({
  component: MarketplacePage,
});

const TOOLS = [
  { icon: Sparkles, key: "summarize", cat: "text" },
  { icon: Image, key: "image_gen", cat: "media" },
  { icon: FileText, key: "doc_qa", cat: "docs" },
  { icon: Languages, key: "translate", cat: "text" },
  { icon: Calculator, key: "spreadsheet", cat: "data" },
  { icon: Brain, key: "research", cat: "research" },
  { icon: Code2, key: "code_review", cat: "dev" },
  { icon: Mic, key: "transcribe", cat: "media" },
  { icon: BarChart3, key: "data_viz", cat: "data" },
  { icon: Search, key: "web_search", cat: "research" },
  { icon: Wand2, key: "rewrite", cat: "text" },
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
  const filtered = TOOLS.filter((t) =>
    !q || NAMES[t.key].ar.includes(q) || NAMES[t.key].en.toLowerCase().includes(q.toLowerCase()),
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
          return (
            <ModuleCard
              key={tool.key}
              icon={tool.icon}
              title={locale === "ar" ? n.ar : n.en}
              description={locale === "ar" ? n.d_ar : n.d_en}
              tag={tool.cat}
            >
              <Button size="sm" variant="outline" className="w-full">
                {locale === "ar" ? "تفعيل" : "Activate"}
              </Button>
            </ModuleCard>
          );
        })}
      </div>
    </Section>
  );
}
