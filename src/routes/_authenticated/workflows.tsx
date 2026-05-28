import { createFileRoute } from "@tanstack/react-router";
import { Workflow, Zap, Mail, Database, MessageSquare, Calendar, FileText } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { PageHeader, Section, ModuleCard } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/workflows")({
  component: WorkflowsPage,
});

const TEMPLATES = [
  { icon: Mail, k: "email_triage" },
  { icon: MessageSquare, k: "support_bot" },
  { icon: FileText, k: "doc_pipeline" },
  { icon: Database, k: "data_sync" },
  { icon: Calendar, k: "meeting_brief" },
  { icon: Zap, k: "alert_router" },
];

const T: Record<string, { ar: string; en: string; d_ar: string; d_en: string }> = {
  email_triage: { ar: "فرز البريد", en: "Email Triage", d_ar: "تصنيف وترتيب الرسائل تلقائياً.", d_en: "Auto-classify and prioritize incoming mail." },
  support_bot: { ar: "بوت الدعم", en: "Support Bot", d_ar: "رد فوري على أسئلة العملاء.", d_en: "Instant answers for customer queries." },
  doc_pipeline: { ar: "خط معالجة المستندات", en: "Doc Pipeline", d_ar: "تلخيص واستخراج البيانات.", d_en: "Summarize and extract structured data." },
  data_sync: { ar: "مزامنة البيانات", en: "Data Sync", d_ar: "ربط الأنظمة وتزامن السجلات.", d_en: "Connect systems and sync records." },
  meeting_brief: { ar: "موجز الاجتماعات", en: "Meeting Brief", d_ar: "ملخص ومهام بعد كل اجتماع.", d_en: "Recap and action items after each meeting." },
  alert_router: { ar: "موجّه التنبيهات", en: "Alert Router", d_ar: "وجّه التنبيهات للقناة الصحيحة.", d_en: "Route alerts to the right channel." },
};

function WorkflowsPage() {
  const { t, locale } = useI18n();
  return (
    <Section>
      <PageHeader
        icon={Workflow}
        title={t("nav.workflows")}
        subtitle={locale === "ar" ? "أتمتة العمليات بربط الوكلاء والأدوات والمحفزات." : "Automate by chaining agents, tools, and triggers."}
        badge="Automation"
        actions={<Button>{locale === "ar" ? "إنشاء سير جديد" : "New workflow"}</Button>}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((tpl) => {
          const n = T[tpl.k];
          return (
            <ModuleCard
              key={tpl.k}
              icon={tpl.icon}
              title={locale === "ar" ? n.ar : n.en}
              description={locale === "ar" ? n.d_ar : n.d_en}
              tag="template"
            >
              <Button size="sm" variant="outline" className="w-full">
                {locale === "ar" ? "استخدم القالب" : "Use template"}
              </Button>
            </ModuleCard>
          );
        })}
      </div>
    </Section>
  );
}
