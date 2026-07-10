/**
 * /aria/demo — سيناريو تنفيذي مباشر
 *
 * يعرض قائمة أسئلة تنفيذية جاهزة يمكن دفعها إلى ARIA (المسار المفرد)
 * ويعرض بجانبها بطاقة `ExecutiveCard` الحية من `activeExecution` في المتجر
 * حتى يتضح مسار: سؤال → تفكير → قرار → توصية → موافقة → خطوة تالية.
 *
 * لا يستدعي أي LLM مباشرة — فقط `useAria().ask()` عبر Brain المفرد.
 */
import { createFileRoute } from "@tanstack/react-router";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { useAria } from "@/lib/aria-core";
import { ExecutiveCard } from "@/components/aria-core/ExecutiveCard";
import { Sparkles, PlayCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/aria/demo")({
  component: AriaDemoPage,
  head: () => ({
    meta: [
      { title: "ARIA — سيناريو تنفيذي مباشر" },
      {
        name: "description",
        content: "سيناريو حي لعرض قدرات ARIA التنفيذية: قرار، توصية، موافقة.",
      },
    ],
  }),
  errorComponent: ({ error, reset }) => (
    <RouteErrorBoundary error={error} reset={reset} routeLabel="/aria/demo" />
  ),
  notFoundComponent: () => (
    <div dir="rtl" className="p-6">
      الصفحة غير موجودة
    </div>
  ),
});

const SCENARIOS: ReadonlyArray<{ id: string; label_ar: string; prompt: string }> = [
  {
    id: "ops-status",
    label_ar: "ما حالة العمليات الآن؟",
    prompt: "ما حالة العمليات الآن؟ اعطني ملخصاً تنفيذياً مع أعلى المخاطر والإجراء الموصى به.",
  },
  {
    id: "incident-triage",
    label_ar: "تصعيد أعلى حادثة مفتوحة",
    prompt: "ما هي أعلى حادثة أمنية مفتوحة حالياً وما التوصية التنفيذية للتصعيد؟",
  },
  {
    id: "sla-risk",
    label_ar: "المهام المهددة بخرق SLA",
    prompt: "ما المهام العاجلة المهددة بخرق SLA خلال 24 ساعة القادمة؟",
  },
  {
    id: "patrol-coverage",
    label_ar: "تغطية الدوريات اليوم",
    prompt: "ما مستوى تغطية الدوريات اليوم وأين توجد فجوات تحتاج قراراً؟",
  },
];

function AriaDemoPage() {
  const { ask, open } = useAria();

  const run = (prompt: string) => {
    open();
    ask(prompt);
  };

  return (
    <div dir="rtl" className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          سيناريو تنفيذي حي
        </div>
        <h1 className="text-2xl font-semibold text-foreground">تجربة ARIA التنفيذية</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          اختر سيناريو تنفيذي وسيتم إرساله إلى ARIA عبر القناة المفردة. ستظهر بطاقة الملخص التنفيذي
          أدناه فور اكتمال التحليل.
        </p>
      </header>

      <section aria-label="السيناريوهات" className="grid gap-3 sm:grid-cols-2">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => run(s.prompt)}
            className="group flex items-start gap-3 rounded-xl border border-border/60 bg-card/60 p-4 text-right transition-colors hover:border-primary/40 hover:bg-card"
          >
            <PlayCircle
              className="mt-0.5 h-5 w-5 shrink-0 text-primary transition-transform group-hover:scale-110"
              aria-hidden
            />
            <div className="flex-1 space-y-1">
              <div className="text-sm font-medium text-foreground">{s.label_ar}</div>
              <div className="text-xs leading-relaxed text-muted-foreground">{s.prompt}</div>
            </div>
          </button>
        ))}
      </section>

      <section
        aria-label="ملخص ARIA التنفيذي الحالي"
        className="rounded-xl border border-border/40 bg-background/40 p-1"
      >
        <ExecutiveCard />
        <p className="px-4 py-3 text-center text-xs text-muted-foreground">
          سيظهر الملخص التنفيذي هنا بعد تشغيل أي سيناريو.
        </p>
      </section>
    </div>
  );
}
