import { useId, useState } from "react";
import { Bot, Download, Workflow } from "lucide-react";
import type { AgentOpsRecord } from "@/lib/exec.functions";
import { prepareFnnPlan, type FnnPlan } from "@/lib/sadeed/orchestrator/fnn-plan";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

/** Reuses the caller's existing operations read. Never invokes the paid agent runtime. */
export function FnnAutomationPanel({ agents }: { agents: AgentOpsRecord[] }) {
  const inputId = useId();
  const [question, setQuestion] = useState("");
  const [plan, setPlan] = useState<FnnPlan | null>(null);
  const [planSimulation, setPlanSimulation] = useState(false);
  const [target, setTarget] = useState("");
  const simulation = agents.some(
    (agent) => (agent as AgentOpsRecord & { is_simulation?: boolean }).is_simulation,
  );
  const peers = agents
    .filter((agent) => !target || agent.id === target)
    .map(({ id, name }) => ({ id, name }));

  function exportPlan() {
    if (!plan || plan.status !== "prepared") return;
    const blob = new Blob(
      [
        JSON.stringify(
          {
            ...plan,
            source: planSimulation ? "reference_simulation" : "agent_definitions",
            executed: false,
            approval_required: true,
          },
          null,
          2,
        ),
      ],
      { type: "application/json;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "fnn-automation-plan.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <Card
      dir="rtl"
      className="my-5 space-y-4 border-primary/25 p-5"
      aria-labelledby={`${inputId}-title`}
    >
      <div className="flex items-center gap-3">
        <Bot className="h-6 w-6 text-primary" aria-hidden="true" />
        <div>
          <h2 id={`${inputId}-title`} className="text-lg font-semibold">
            FNN · مساعد الأتمتة
          </h2>
          <p className="text-sm text-muted-foreground">
            جهّز خطة متابعة للأمن الصناعي دون استهلاك رصيد نماذج الذكاء الاصطناعي.
          </p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        المصدر: سجل الوكلاء المعروض في هذه الصفحة.{" "}
        {simulation
          ? "محاكاة مرجعية — ليست بيانات إنتاج."
          : agents.length
            ? "قراءة من سجل الوكلاء."
            : "لم يصل سجل الوكلاء بعد؛ يمكن تجهيز الخطوات محلياً."}{" "}
        لا تُنفّذ الخطة أي تعديل أو مراسلة.
      </p>
      <Button asChild variant="outline" className="min-h-11">
        <a href="/orchestration">فتح قيادة سَدِيد ومساحة تنفيذ FNN</a>
      </Button>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          setPlan(prepareFnnPlan(question, peers));
          setPlanSimulation(simulation);
        }}
      >
        <label htmlFor={inputId} className="block text-sm font-medium">
          ما المهمة المطلوب تجهيزها؟
        </label>
        <Textarea
          id={inputId}
          value={question}
          maxLength={2000}
          onChange={(event) => {
            setQuestion(event.target.value);
            setPlan(null);
          }}
          placeholder="مثال: جهّز متابعة صيانة الأمن الصناعي"
          required
        />
        <label htmlFor={`${inputId}-target`} className="block text-sm font-medium">
          الوكيل المقترح للمراجعة
        </label>
        <select
          id={`${inputId}-target`}
          value={target}
          onChange={(event) => {
            setTarget(event.target.value);
            setPlan(null);
          }}
          className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-foreground"
        >
          <option value="">سجل الوكلاء كاملاً — اختيار المسؤول عند الاعتماد</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </select>
        <Button className="min-h-11" type="submit">
          <Workflow className="me-2 h-4 w-4" />
          تجهيز الخطة
        </Button>
      </form>
      <div role="status" aria-live="polite">
        {plan && (
          <div className="space-y-3 rounded-lg border border-border p-4">
            <h3 className="font-medium">{plan.title}</h3>
            {plan.steps.length > 0 && (
              <ol className="list-inside list-decimal space-y-2 text-sm">
                {plan.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            )}
            {plan.status === "prepared" && (
              <>
                <p className="text-sm">
                  {planSimulation
                    ? "الوكلاء أدناه من المحاكاة المرجعية."
                    : "الوكلاء المتاحون للمراجعة من السجل:"}{" "}
                  {plan.peers.length
                    ? plan.peers.map((peer) => peer.name).join(" · ")
                    : "لم يصل سجل وكلاء؛ لم تُحدد جهة تنفيذ."}
                </p>
                <p className="text-sm text-muted-foreground">
                  الأدوات المحلية: {plan.tools.join(" · ")}
                </p>
                <p className="text-sm text-muted-foreground">
                  مسودة محلية · لم تُنفّذ · تتطلب مراجعة صاحب الصلاحية. الوصول إلى البيانات يبقى
                  بصلاحيات الجلسة الحالية.
                </p>
                <Button type="button" className="min-h-11" variant="outline" onClick={exportPlan}>
                  <Download className="me-2 h-4 w-4" />
                  تنزيل الخطة
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
