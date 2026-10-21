import { Link } from "@tanstack/react-router";
import { Bot, Network, ShieldCheck } from "lucide-react";
import { useFnnOwner } from "@/lib/dual-agent/use-fnn-owner";
import { useFnnChatStore } from "@/lib/dual-agent/fnn-chat-store";
import { useSadeed } from "@/lib/sadeed-core/hooks/useSadeed";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import "@/styles/home/home-owner-agents.css";

/** Owner-only entry points to the existing assistants; no second conversation or executor. */
export function HomeOwnerAgents() {
  const { allowed, userId } = useFnnOwner();
  const { open } = useSadeed();
  const openFnn = useFnnChatStore((state) => state.openFor);
  const { locale } = useI18n();
  const ar = locale === "ar";
  if (!allowed || !userId) return null;

  return (
    <section
      dir={ar ? "rtl" : "ltr"}
      aria-labelledby="home-owner-agents-title"
      className="nx-bp-stage nx-home-panel space-y-4 p-4 md:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="home-owner-agents-title" className="text-lg font-semibold text-foreground">
          {ar ? "سَدِيد وFNN · مساحة المالك" : "SADEED & FNN · Owner workspace"}
        </h2>
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="size-4" aria-hidden />
          {ar ? "دخول المالك موثّق على الخادم" : "Server-verified owner access"}
        </span>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <article className="min-w-0 space-y-3 rounded-xl border border-border bg-background/60 p-4">
          <h3 className="flex items-center gap-2 font-semibold text-foreground">
            <Network className="size-5 text-primary" aria-hidden />
            {ar ? "سَدِيد · القيادة والتحليل" : "SADEED · Leadership & analysis"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {ar
              ? "الإدارة والقيادة الرقمية، تحليل المؤشرات، وتنسيق الوكلاء ومراجعة نتائجهم."
              : "Digital leadership, operational analysis, agent coordination and outcome review."}
          </p>
          <Button className="nx-owner-control min-h-11" onClick={() => open({ focus: true })}>
            {ar ? "فتح محادثة سَدِيد" : "Open SADEED chat"}
          </Button>
        </article>
        <article className="min-w-0 space-y-3 rounded-xl border border-primary/25 bg-primary/5 p-4">
          <h3 className="flex items-center gap-2 font-semibold text-foreground">
            <Bot className="size-5 text-primary" aria-hidden />
            {ar ? "FNN · الأتمتة والهندسة" : "FNN · Automation & engineering"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {ar
              ? "محادثة مستقلة لتجهيز الأتمتة وحقن البيانات ومراجعة البرمجة. التنفيذ للأدوات المصرّح بها فقط؛ البرمجة والنشر خطط للمراجعة."
              : "Independent automation, data ingestion and engineering planning. Execution uses authorized tools only; coding and deployment remain reviewable plans."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button className="nx-owner-control min-h-11" onClick={() => openFnn(userId)}>
              {ar ? "فتح محادثة FNN" : "Open FNN chat"}
            </Button>
            <Button asChild variant="outline" className="nx-owner-control min-h-11">
              <Link to="/orchestration">
                {ar ? "الأدوات وسجل النتائج" : "Tools & task history"}
              </Link>
            </Button>
          </div>
        </article>
      </div>
      <p className="text-xs text-muted-foreground">
        {ar
          ? "هذه بطاقة تعريف بالأدوار، وليست قياسًا للجاهزية. حالة الأدوات ونتائج التنفيذ تُقرأ من سجل المؤسسة؛ فتح المحادثة لا يشغّل أي مهمة."
          : "Role overview, not a readiness measurement. Tool status and outcomes come from the organization registry; opening chat never starts a task."}
      </p>
    </section>
  );
}
