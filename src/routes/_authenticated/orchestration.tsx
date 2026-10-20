import { useFnnOwner } from "@/lib/dual-agent/use-fnn-owner";
import { useId, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  Network,
  RefreshCw,
  ShieldCheck,
  Terminal,
  Upload,
  Workflow,
  History,
  FileBarChart,
  MessageSquare,
  Link2,
} from "lucide-react";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { NexusPage } from "@/components/nexus-frame";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import { useSadeed } from "@/lib/sadeed-core/hooks/useSadeed";
import { getDualAgentOverview, executeFnnTask } from "@/lib/dual-agent/command.functions";
import { DualAgentMetrics, DualAgentDistribution } from "@/components/agents/DualAgentMetrics";
import { screenNameAr } from "@/lib/nav/screen-names";

export const Route = createFileRoute("/_authenticated/orchestration")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: OrchestrationPage,
});

const STATUS_LABELS: Record<string, string> = {
  succeeded: "نجحت",
  failed: "تعذرت",
  pending_approval: "بانتظار الاعتماد",
  running: "قيد التنفيذ",
  rejected: "رُفضت",
  rolled_back: "تم التراجع",
  queued: "في الانتظار",
  cancelled: "أُلغيت",
};
const TOOL_LABELS: Record<string, string> = {
  "sql.read": "قراءة بيانات تشغيلية",
  "sec.create_incident": "اقتراح بلاغ جديد",
  "sec.update_work_order": "اقتراح تحديث أمر عمل",
};
const TOOL_EXAMPLES: Record<string, string> = {
  "sql.read": '{\n  "table": "sec_incidents",\n  "columns": ["id", "status"],\n  "limit": 10\n}',
  "sec.create_incident": '{\n  "title_ar": "",\n  "severity": "low"\n}',
  "sec.update_work_order": '{\n  "id": "",\n  "status": ""\n}',
};

async function bounded<T>(work: Promise<T>, timeoutMs = 4000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("تعذّرت قراءة سجل التنفيذ الآن.")), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function OrchestrationPage() {
  const { allowed, access } = useFnnOwner();
  if (!allowed)
    return (
      <Card dir="rtl" className="m-4 space-y-3 p-6">
        <h1 className="text-lg font-semibold">FNN · مساحة مالك النظام</h1>
        <p className="text-sm text-muted-foreground">
          {access.isFetching
            ? "جارٍ التحقق من صلاحية الدخول…"
            : "هذه المساحة مخصصة لحساب مالك النظام. سجّل الدخول بحساب المالك للمتابعة."}
        </p>
        <Button asChild className="min-h-11">
          <a href="/auth">تسجيل دخول المالك</a>
        </Button>
        {access.isError && (
          <Button variant="outline" className="min-h-11" onClick={() => void access.refetch()}>
            إعادة التحقق
          </Button>
        )}
      </Card>
    );
  return <OwnerOrchestrationPage />;
}

function OwnerOrchestrationPage() {
  const { user, loading } = useAuth();
  const { open } = useSadeed();
  const currentOrg =
    typeof user?.app_metadata?.current_org === "string" ? user.app_metadata.current_org : undefined;
  // Remount on identity/tenant changes so a previous user's task result cannot remain visible.
  return (
    <CommandWorkspace
      key={`${user?.id ?? "guest"}:${currentOrg ?? "default"}`}
      userId={user?.id}
      orgId={currentOrg}
      authLoading={loading}
      openAssistant={() => open()}
    />
  );
}

function CommandWorkspace({
  userId,
  orgId,
  authLoading,
  openAssistant,
}: {
  userId?: string;
  orgId?: string;
  authLoading: boolean;
  openAssistant: () => void;
}) {
  const getOverview = useServerFn(getDualAgentOverview);
  const dispatch = useServerFn(executeFnnTask);
  const qc = useQueryClient();
  const id = useId();
  const [toolId, setToolId] = useState<
    "sql.read" | "sec.create_incident" | "sec.update_work_order"
  >("sql.read");
  const [objective, setObjective] = useState("");
  const [input, setInput] = useState(TOOL_EXAMPLES["sql.read"]);
  const [review, setReview] = useState<Record<string, unknown> | null>(null);
  const [inputError, setInputError] = useState("");
  const queryKey = ["dual-agent-command", userId, orgId];
  const overview = useQuery({
    queryKey,
    queryFn: () => bounded(getOverview({ data: { orgId } })),
    enabled: !authLoading && !!userId,
    retry: false,
    staleTime: 15000,
    refetchInterval: 15000,
  });
  const run = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      bounded(dispatch({ data: { orgId, objective, toolId, input: payload } }), 45000),
    onSuccess: () => {
      setReview(null);
      void qc.invalidateQueries({ queryKey });
    },
  });
  const data = userId ? overview.data : undefined;
  const selectedTool = data?.tools.find((tool) => tool.id === toolId);

  function prepare() {
    setInputError("");
    try {
      const parsed: unknown = JSON.parse(input);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
      setReview(parsed as Record<string, unknown>);
    } catch {
      setInputError("أدخل بيانات المهمة ككائن JSON صحيح قبل المراجعة.");
    }
  }

  const resources = [
    {
      to: "/knowledge-upload",
      label: "استيراد المعرفة",
      detail: "فحص الملفات ومعاينتها قبل اعتماد الرفع",
      Icon: Upload,
    },
    {
      to: "/workflows",
      label: "سير العمل",
      detail: "تعريف المسارات وتشغيلها ضمن الصلاحيات",
      Icon: Workflow,
    },
    {
      to: "/exec",
      label: "التنفيذ والاعتمادات",
      detail: "تفاصيل الأدوات والوكلاء والتراجع المتاح",
      Icon: History,
    },
    {
      to: "/integrations",
      label: "التكاملات",
      detail: "مراجعة الموصلات وإعداداتها الفعلية",
      Icon: Link2,
    },
    {
      to: "/tools",
      label: "سجل الأدوات",
      detail: "المدخلات والصلاحيات ومتطلبات الاعتماد",
      Icon: Terminal,
    },
    {
      to: "/sec/reports",
      label: "التقارير",
      detail: "التقارير التشغيلية وتصدير PDF",
      Icon: FileBarChart,
    },
  ] as const;

  return (
    <div dir="rtl">
      <NexusPage
        eyebrow="SADEED × FNN"
        title={screenNameAr("/orchestration")}
        subtitle="سَدِيد يحلل ويوجّه ويراجع النتائج. FNN ينفّذ الأدوات المسموح بها بعد التحقق من الصلاحيات."
        actions={
          <>
            <Button variant="outline" className="min-h-11" onClick={openAssistant}>
              <MessageSquare className="me-2 h-4 w-4" />
              تحدّث مع سَدِيد
            </Button>
            <Button
              variant="outline"
              className="min-h-11"
              disabled={!userId || overview.isFetching}
              onClick={() => void overview.refetch()}
            >
              <RefreshCw className="me-2 h-4 w-4" />
              تحديث
            </Button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="space-y-2 border-primary/25 p-5">
            <Network className="h-6 w-6 text-primary" aria-hidden="true" />
            <h2 className="text-lg font-semibold">سَدِيد · القيادة الرقمية</h2>
            <p className="text-sm text-muted-foreground">
              فهم الطلب، تحديد الهدف، تفويض FNN، ومراجعة سجل النتائج. التوصيات أدناه تستند إلى
              العينة المتاحة.
            </p>
          </Card>
          <Card className="space-y-2 p-5">
            <Bot className="h-6 w-6 text-primary" aria-hidden="true" />
            <h2 className="text-lg font-semibold">FNN · التنفيذ الهندسي</h2>
            <p className="text-sm text-muted-foreground">
              قراءات تشغيلية وطلبات تغيير عبر الأدوات القائمة. النشر وتغيير الأسرار وتشغيل كود حر
              ليست أدوات متاحة في هذه الواجهة.
            </p>
          </Card>
        </div>
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          المهمة تحمل معرّفًا مشتركًا بين سَدِيد وFNN. تغييرات البيانات تُحال للاعتماد؛ إرسال الطلب
          لا يعني اكتمال تنفيذه.
        </p>
        {authLoading ? (
          <p role="status">جارٍ التحقق من الجلسة…</p>
        ) : !userId ? (
          <Card className="space-y-3 p-5">
            <h2 className="font-semibold">سجل مؤسستك محمي</h2>
            <p className="text-sm text-muted-foreground">
              سجّل الدخول لعرض المؤشرات الحقيقية وتفويض مهام التنفيذ. يمكنك استعراض مساحات العمل
              أدناه.
            </p>
            <Button asChild className="min-h-11">
              <Link to="/login">تسجيل الدخول</Link>
            </Button>
          </Card>
        ) : overview.isError ? (
          <Card className="space-y-3 p-5" role="alert">
            <p>تعذّر تحميل سجل المؤسسة الآن. تحقق من اختيار المؤسسة وصلاحياتك ثم أعد المحاولة.</p>
            <Button className="min-h-11" variant="outline" onClick={() => void overview.refetch()}>
              إعادة المحاولة
            </Button>
          </Card>
        ) : overview.isPending ? (
          <div
            className="grid grid-cols-2 gap-3 md:grid-cols-4"
            role="status"
            aria-label="جارٍ تحميل مؤشرات التنفيذ"
          >
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-32 rounded-xl bg-muted motion-safe:animate-pulse" />
            ))}
          </div>
        ) : null}
        <Tabs defaultValue="command" dir="rtl">
          <TabsList className="mb-4 w-full justify-start">
            <TabsTrigger className="min-h-11" value="command">
              قيادة سَدِيد
            </TabsTrigger>
            <TabsTrigger className="min-h-11" value="engineering">
              مساحة FNN الهندسية
            </TabsTrigger>
          </TabsList>
          <TabsContent value="command" className="space-y-5">
            <DualAgentMetrics metrics={data?.metrics} />
            <p className="text-xs text-muted-foreground">
              {data
                ? `المصدر: تشغيلاتك المسموح بها في المؤسسة · أحدث ${data.metrics.sampleSize.toLocaleString("ar-SA")} من حد أقصى ${data.sampleLimit} تشغيلًا · تحديث ${new Date(data.observedAt).toLocaleString("ar-SA")}. هذه عينة للمستخدم الحالي وليست إجمالي المؤسسة.`
                : "المصدر: سجل أدوات المؤسسة بعد تسجيل الدخول. المؤشرات غير المتاحة لا تُستبدل بأرقام افتراضية."}
            </p>
            {data && (
              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="space-y-4 p-5">
                  <h2 className="font-semibold">توزيع التنفيذ</h2>
                  {data.metrics.sampleSize ? (
                    <DualAgentDistribution metrics={data.metrics} />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      لم تُسجّل تشغيلات في هذه العينة بعد.
                    </p>
                  )}
                </Card>
                <Card className="space-y-3 p-5">
                  <h2 className="font-semibold">أولويات المراجعة</h2>
                  <p className="text-sm">
                    {data.metrics.pendingApproval
                      ? `راجع ${data.metrics.pendingApproval.toLocaleString("ar-SA")} طلبًا ينتظر الاعتماد قبل بدء مهام إضافية.`
                      : "لا توجد طلبات اعتماد معلّقة في العينة."}
                  </p>
                  <p className="text-sm">
                    {data.metrics.failed
                      ? `افحص ${data.metrics.failed.toLocaleString("ar-SA")} تشغيلًا تعذّر إكماله من سجل التنفيذ.`
                      : "لا توجد إخفاقات مسجلة في العينة."}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    الوقت الموفر والتكلفة والعائد: لم تُقَس. لا تكفي حالات النجاح وحدها لقياس الأثر
                    التشغيلي.
                  </p>
                  <Button asChild variant="outline" className="min-h-11">
                    <Link to="/execution">مراجعة سجل التنفيذ</Link>
                  </Button>
                </Card>
              </div>
            )}
            <Card className="space-y-4 p-5">
              <h2 className="font-semibold">تاريخ المهام والنتائج</h2>
              {!data?.executions.length ? (
                <p className="text-sm text-muted-foreground">
                  {data
                    ? "لا توجد مهام مسجلة في العينة الحالية."
                    : "يظهر التاريخ بعد قراءة سجل مؤسستك."}
                </p>
              ) : (
                <div className="max-w-full overflow-x-auto">
                  <table className="w-full text-start text-sm">
                    <caption className="sr-only">أحدث تشغيلات المستخدم ضمن المؤسسة</caption>
                    <thead>
                      <tr className="border-b">
                        <th className="p-3 text-start">الأداة</th>
                        <th className="p-3 text-start">الحالة</th>
                        <th className="p-3 text-start">المعرّف المشترك</th>
                        <th className="p-3 text-start">الوقت</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.executions.map((row) => (
                        <tr key={row.id} className="border-b">
                          <td className="p-3">{TOOL_LABELS[row.toolId] ?? row.toolId}</td>
                          <td className="whitespace-nowrap p-3">
                            {STATUS_LABELS[row.status] ?? "حالة غير معروفة"}
                          </td>
                          <td className="max-w-48 break-all p-3 font-mono text-xs" dir="ltr">
                            {row.correlationId ?? "لم يُسجّل"}
                          </td>
                          <td className="whitespace-nowrap p-3">
                            {row.createdAt
                              ? new Date(row.createdAt).toLocaleString("ar-SA")
                              : "لم يُسجّل"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </TabsContent>
          <TabsContent value="engineering" className="space-y-5">
            <Card className="space-y-4 p-5">
              <h2 className="text-lg font-semibold">تفويض مهمة إلى FNN</h2>
              <p className="text-sm text-muted-foreground">
                حدّد الهدف والأداة ومدخلاتها. يعيد الخادم التحقق من المؤسسة والصلاحيات وسياسة الأداة
                عند كل طلب.
              </p>
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  prepare();
                }}
              >
                <label className="block text-sm font-medium" htmlFor={`${id}-objective`}>
                  الهدف التنفيذي
                </label>
                <Textarea
                  id={`${id}-objective`}
                  disabled={run.isPending}
                  required
                  maxLength={2000}
                  value={objective}
                  onChange={(event) => {
                    setObjective(event.target.value);
                    setReview(null);
                    setInputError("");
                    run.reset();
                  }}
                  placeholder="ما النتيجة المطلوبة من هذه المهمة؟"
                />
                <label className="block text-sm font-medium" htmlFor={`${id}-tool`}>
                  الأداة المسموح بها
                </label>
                <select
                  id={`${id}-tool`}
                  disabled={run.isPending}
                  className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-foreground"
                  value={toolId}
                  onChange={(event) => {
                    const value = event.target.value as typeof toolId;
                    setToolId(value);
                    setReview(null);
                    setInputError("");
                    setInput(TOOL_EXAMPLES[value]);
                    run.reset();
                  }}
                >
                  {Object.entries(TOOL_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-muted-foreground">
                  {selectedTool?.enabled
                    ? selectedTool.requiresApproval
                      ? "هذه الأداة تنشئ طلب اعتماد؛ لا تُغيّر البيانات قبل موافقة المسؤول."
                      : "قراءة فقط ضمن المؤسسة والصلاحيات الممنوحة."
                    : "الأداة غير متاحة حاليًا ضمن سجل مؤسستك؛ التنفيذ معطّل."}
                </p>
                <label className="block text-sm font-medium" htmlFor={`${id}-input`}>
                  مدخلات الأداة (JSON)
                </label>
                <Textarea
                  dir="ltr"
                  className="min-h-40 font-mono text-sm"
                  id={`${id}-input`}
                  disabled={run.isPending}
                  value={input}
                  maxLength={20000}
                  required
                  onChange={(event) => {
                    setInput(event.target.value);
                    setReview(null);
                    setInputError("");
                    run.reset();
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  أدخل الحقول المطلوبة فقط، ولا تضع مفاتيح خدمات أو بيانات حساسة غير لازمة. مرجع
                  الحقول في سجل الأدوات.
                </p>
                {inputError && (
                  <p role="alert" className="text-sm text-destructive">
                    {inputError}
                  </p>
                )}
                <Button
                  type="submit"
                  className="min-h-11"
                  disabled={!selectedTool?.enabled || run.isPending || !objective.trim()}
                >
                  مراجعة التفويض
                </Button>
              </form>
              {review && (
                <div
                  className="space-y-3 rounded-lg border border-primary/30 p-4"
                  role="region"
                  aria-label="مراجعة المهمة"
                >
                  <h3 className="font-semibold">تأكيد المهمة</h3>
                  <p className="break-words text-sm">{objective}</p>
                  <p className="text-sm">
                    سَدِيد ← FNN ← {TOOL_LABELS[toolId]} ←{" "}
                    {selectedTool?.requiresApproval ? "اعتماد المسؤول" : "قراءة وتسجيل النتيجة"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedTool?.requiresApproval
                      ? "ستُرسل هذه البيانات كطلب اعتماد مسجّل، وليست موافقة على التنفيذ."
                      : "سيُنفّذ طلب القراءة ويُسجّل أثره ضمن مؤسستك."}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      className="min-h-11"
                      disabled={run.isPending || !selectedTool?.enabled}
                      onClick={() => run.mutate(review)}
                    >
                      {run.isPending
                        ? "جارٍ إرسال المهمة…"
                        : selectedTool?.requiresApproval
                          ? "إرسال للاعتماد"
                          : "تنفيذ القراءة"}
                    </Button>
                    <Button
                      variant="outline"
                      className="min-h-11"
                      disabled={run.isPending}
                      onClick={() => setReview(null)}
                    >
                      رجوع للتعديل
                    </Button>
                  </div>
                </div>
              )}
              {run.isError && (
                <p role="alert" className="text-sm text-destructive">
                  تعذّر تأكيد نتيجة المهمة. راجع سجل التنفيذ قبل إعادة الإرسال لتجنب التكرار.
                </p>
              )}
              {run.data && (
                <div className="space-y-2 rounded-lg border p-4" role="status">
                  <h3 className="font-semibold">
                    {STATUS_LABELS[run.data.status] ?? "استُلمت نتيجة المهمة"}
                  </h3>
                  <p className="break-all text-sm">
                    معرّف المهمة: <bdi>{run.data.taskId}</bdi>
                  </p>
                  <p className="break-all text-xs text-muted-foreground">
                    معرّف التنفيذ: <bdi>{run.data.executionId}</bdi>
                  </p>
                  {run.data.output !== undefined && (
                    <details>
                      <summary className="min-h-11 cursor-pointer py-3 text-sm">
                        عرض نتيجة الأداة
                      </summary>
                      <pre
                        dir="ltr"
                        className="max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs"
                      >
                        {JSON.stringify(run.data.output, null, 2)}
                      </pre>
                    </details>
                  )}
                  <Link
                    className="inline-flex min-h-11 items-center text-sm text-primary underline"
                    to="/exec"
                  >
                    متابعة التنفيذ والاعتماد
                  </Link>
                </div>
              )}
            </Card>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {resources.map(({ to, label, detail, Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="rounded-xl border bg-card p-5 text-card-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Icon className="mb-3 h-5 w-5 text-primary" aria-hidden="true" />
                  <h3 className="font-semibold">{label}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
                </Link>
              ))}
            </div>
            <Card className="space-y-2 p-5">
              <h2 className="font-semibold">البرمجة وGitHub</h2>
              <p className="text-sm text-muted-foreground">
                هذه النسخة لا تملك منفّذ كود معزولًا أو موصل GitHub من داخل التطبيق. تطوير الفروع
                وطلبات الدمج يجري عبر أدوات التطوير المعتمدة؛ لا يُعرض هنا كتنفيذ ناجح.
              </p>
            </Card>
          </TabsContent>
        </Tabs>
      </NexusPage>
    </div>
  );
}
