import { useEffect, useId, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { listMyOrgs } from "@/lib/org/org.functions";
import {
  saveWorkflowDraft,
  type WorkflowDraftReceipt,
  type WorkflowDraftSaveResult,
} from "@/lib/exec/workflow-drafts.functions";
import {
  WORKFLOW_DRAFT_REQUESTS,
  previewWorkflowDraft,
  type WorkflowDraftPreview,
  type WorkflowDraftPreviewError,
} from "@/lib/exec/workflow-draft-template";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/** Membership reads are caller-scoped. Previewing never creates or runs a workflow. */
export function WorkflowDraftComposer({ onSaved }: { onSaved?: () => void }) {
  const { user } = useAuth();
  // A changed account unmounts the prior form and its preview; nothing persists in storage.
  return <DraftForm key={user?.id ?? "guest"} userId={user?.id ?? null} onSaved={onSaved} />;
}

const ERROR_COPY: Record<WorkflowDraftPreviewError, { ar: string; en: string }> = {
  request: {
    ar: "اكتب طلبًا لا يتجاوز 160 حرفًا.",
    en: "Enter a request of at most 160 characters.",
  },
  unsupported: {
    ar: "الطلب غير مدعوم. القالب المتاح لتشخيص الأصول غير المتصلة فقط؛ لا ينشئ مهامًا أو يعالج التصاريح.",
    en: "Unsupported request. Only offline asset diagnostics are available; this template creates no tasks and processes no permits.",
  },
  organization: {
    ar: "اختر الجهة بنفسك قبل المعاينة.",
    en: "Choose an organization before previewing.",
  },
  limit: { ar: "اختر حدًا صحيحًا بين 1 و50.", en: "Choose a whole-number limit between 1 and 50." },
};

const SAVE_ERROR_COPY: Record<
  Exclude<WorkflowDraftSaveResult["status"], "saved">,
  { ar: string; en: string }
> = {
  invalid_request: {
    ar: "الطلب غير صالح للحفظ. راجع المعاينة.",
    en: "This request cannot be saved. Review the preview.",
  },
  forbidden: {
    ar: "صلاحياتك لا تسمح بحفظ هذه المسودة. لم يصدر إقرار حفظ.",
    en: "Your permissions do not allow saving this draft. No save receipt was issued.",
  },
  conflict: {
    ar: "يوجد سجل لا يطابق هذه المحاولة؛ لن يُستبدل أو يُعدّل.",
    en: "This request conflicts with a different stored record; it will not be replaced or updated.",
  },
  unavailable: {
    ar: "تعذر التحقق من الحفظ. أعد المحاولة بالمعرّف نفسه.",
    en: "Saving could not be checked. Retry with the same request ID.",
  },
  unconfirmed: {
    ar: "لم تتأكد نتيجة الحفظ؛ قد تكون المسودة حُفظت. أعد المحاولة بالمعرّف نفسه للتحقق، دون إنشاء محاولة مكررة.",
    en: "The save outcome is unconfirmed; the draft may have been saved. Retry with the same request ID to check, without creating a duplicate request.",
  },
};

function DraftForm({ userId, onSaved }: { userId: string | null; onSaved?: () => void }) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const lang = ar ? "ar" : "en";
  const id = useId();
  const fetchOrgs = useServerFn(listMyOrgs);
  const saveDraft = useServerFn(saveWorkflowDraft);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [receipt, setReceipt] = useState<WorkflowDraftReceipt | null>(null);
  const [saveProblem, setSaveProblem] = useState<Exclude<
    WorkflowDraftSaveResult["status"],
    "saved"
  > | null>(null);
  const [orgId, setOrgId] = useState("");
  const [request, setRequest] = useState("");
  const [limit, setLimit] = useState("20");
  const [preview, setPreview] = useState<WorkflowDraftPreview | null>(null);
  const [problem, setProblem] = useState<WorkflowDraftPreviewError | null>(null);
  const orgs = useQuery({
    queryKey: ["my-orgs", userId ?? "anon"],
    enabled: Boolean(userId),
    staleTime: 60_000,
    retry: false,
    queryFn: async ({ signal }) => {
      const controller = new AbortController();
      const cancel = () => controller.abort();
      signal.addEventListener("abort", cancel, { once: true });
      if (signal.aborted) cancel();
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([
          fetchOrgs({ signal: controller.signal }),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
              controller.abort();
              reject(new Error("Organization lookup timed out"));
            }, 4000);
          }),
        ]);
      } finally {
        if (timer) clearTimeout(timer);
        signal.removeEventListener("abort", cancel);
      }
    },
  });
  const selectedOrg = orgs.data?.find((org) => org.id === orgId);
  const clearPreview = () => {
    setReceipt(null);
    setReviewed(false);
    setDraftId(null);
    setSaveProblem(null);
    setPreview(null);
    setProblem(null);
  };

  return (
    <Card
      className="min-w-0 space-y-4 p-4"
      dir={ar ? "rtl" : "ltr"}
      aria-labelledby={`${id}-title`}
    >
      <div>
        <h2 id={`${id}-title`} className="font-semibold">
          {ar ? "معاينة مسودة سير عمل" : "Preview a workflow draft"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {ar
            ? "قالب تشخيصي للقراءة فقط. المعاينة لا تجلب بيانات الأصول ولا تنفذ أي خطوة."
            : "A read-only diagnostic template. Previewing fetches no asset data and runs no steps."}
        </p>
        <p className="mt-2 text-sm font-semibold" role="status">
          {ar
            ? receipt
              ? "حُفظت مسودة معطلة؛ لم تُشغّل ولم تُنشّط."
              : "تُحفظ المسودة معطلة بعد المراجعة فقط. الحفظ يخضع لصلاحياتك في الجهة؛ لا تشغيل أو تنشيط."
            : receipt
              ? "Saved as a disabled draft; no run or activation occurred."
              : "Save only as a disabled draft after review. Organization permissions apply; no run or activation."}
        </p>
      </div>
      {!userId ? (
        <p>
          {ar
            ? "سجّل الدخول لاختيار جهة من عضوياتك."
            : "Sign in to choose one of your organizations."}
        </p>
      ) : orgs.isPending ? (
        <p role="status">{ar ? "جارٍ تحميل جهاتك…" : "Loading your organizations…"}</p>
      ) : orgs.isError ? (
        <div role="alert" className="space-y-2">
          <p>
            {ar
              ? "تعذر تحميل جهاتك. أعد المحاولة."
              : "Your organizations could not load. Try again."}
          </p>
          <Button
            type="button"
            className="min-h-[44px]"
            variant="outline"
            onClick={() => void orgs.refetch()}
          >
            {ar ? "إعادة المحاولة" : "Try again"}
          </Button>
        </div>
      ) : orgs.data?.length === 0 ? (
        <p>
          {ar
            ? "لا توجد عضويات جهات متاحة لهذا الحساب."
            : "No organization memberships are available for this account."}
        </p>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const result = previewWorkflowDraft({
              request,
              orgId: selectedOrg?.id ?? "",
              limit: Number(limit),
            });
            if (saving) return;
            setDraftId(result.ok ? (draftId ?? crypto.randomUUID()) : null);
            setReceipt(null);
            setReviewed(false);
            setSaveProblem(null);
            setPreview(result.ok ? result.preview : null);
            setProblem(result.ok ? null : result.reason);
          }}
        >
          <div className="space-y-2">
            <label htmlFor={`${id}-org`} className="text-sm font-semibold">
              {ar ? "الجهة" : "Organization"}
            </label>
            <select
              id={`${id}-org`}
              className="nexus-field min-h-[44px] w-full rounded-xl border border-input bg-background px-3 text-sm"
              disabled={saving}
              value={orgId}
              onChange={(event) => {
                setOrgId(event.target.value);
                clearPreview();
              }}
            >
              <option value="">{ar ? "اختر الجهة" : "Choose an organization"}</option>
              {orgs.data?.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor={`${id}-request`} className="text-sm font-semibold">
              {ar ? "الطلب" : "Request"}
            </label>
            <Textarea
              id={`${id}-request`}
              disabled={saving}
              maxLength={160}
              value={request}
              placeholder={WORKFLOW_DRAFT_REQUESTS[lang]}
              onChange={(event) => {
                setRequest(event.target.value);
                clearPreview();
              }}
            />
            <p className="text-xs text-muted-foreground">
              {ar ? "القالب المدعوم: " : "Supported request: "}
              {WORKFLOW_DRAFT_REQUESTS[lang]}
            </p>
          </div>
          <div className="space-y-2">
            <label htmlFor={`${id}-limit`} className="text-sm font-semibold">
              {ar ? "حد القراءة المقترح" : "Proposed read limit"}
            </label>
            <Input
              id={`${id}-limit`}
              className="min-h-[44px]"
              disabled={saving}
              type="number"
              min={1}
              max={50}
              step={1}
              value={limit}
              onChange={(event) => {
                setLimit(event.target.value);
                clearPreview();
              }}
            />
          </div>
          <Button type="submit" className="min-h-[44px]" disabled={saving}>
            {ar ? "معاينة دون حفظ" : "Preview without saving"}
          </Button>
          {problem && <p role="alert">{ERROR_COPY[problem][lang]}</p>}
          {preview && selectedOrg && (
            <div
              className="space-y-3 rounded-xl border border-border p-3"
              aria-label={
                receipt
                  ? ar
                    ? "معاينة المسودة المحفوظة"
                    : "Saved draft preview"
                  : ar
                    ? "المعاينة غير المحفوظة"
                    : "Unsaved preview"
              }
            >
              <p className="font-semibold">
                {selectedOrg.name} —{" "}
                {receipt
                  ? ar
                    ? "مسودة محفوظة ومعطلة"
                    : "Saved, disabled draft"
                  : ar
                    ? "مسودة معطلة وغير محفوظة"
                    : "Disabled, unsaved draft"}
              </p>
              <p>
                {ar
                  ? "قراءة تشخيصية واحدة للأصول غير المتصلة. الحد المقترح: "
                  : "One diagnostic read of offline assets. Proposed limit: "}
                {preview.definition.steps[0].input.limit}
              </p>
              <p className="text-sm text-muted-foreground">
                {ar
                  ? "لا موضوع تشغيل ولا نتائج تشخيص؛ الحفظ ليس اعتمادًا للتنفيذ."
                  : "No trigger topic or diagnostic results; saving does not authorize execution."}
              </p>
              <p className="text-sm">
                {ar
                  ? "الحالة المقترحة: غير متصل. الترتيب: الأقدم ظهورًا أولًا. الجهة والحد الموضحان أعلاه للمراجعة فقط."
                  : "Proposed status: offline. Order: oldest last-seen first. The organization and limit above are for review only."}
              </p>
              {!receipt && (
                <div className="space-y-3">
                  <label className="flex min-h-[44px] items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={reviewed}
                      disabled={saving}
                      onChange={(event) => setReviewed(event.target.checked)}
                    />
                    {ar
                      ? "راجعت الجهة والحد؛ ستبقى المسودة معطلة دون تنفيذ."
                      : "I reviewed the organization and limit; this draft will stay disabled without execution."}
                  </label>
                  <Button
                    type="button"
                    className="min-h-[44px]"
                    disabled={!reviewed || saving || selectedOrg.role === "viewer"}
                    onClick={async () => {
                      if (!draftId || !reviewed || !userId || saving) return;
                      setSaving(true);
                      setSaveProblem(null);
                      try {
                        const result = await saveDraft({
                          data: {
                            draftId,
                            orgId: preview.orgId,
                            request,
                            limit: preview.definition.steps[0].input.limit,
                          },
                        });
                        if (!alive.current) return;
                        if (result.status === "saved") {
                          const row = result.receipt;
                          if (
                            row.id !== draftId ||
                            row.orgId !== preview.orgId ||
                            row.ownerId !== userId ||
                            row.enabled !== false ||
                            row.version !== 1
                          ) {
                            setSaveProblem("unconfirmed");
                            return;
                          }
                          setReceipt(row);
                          onSaved?.();
                        } else setSaveProblem(result.status);
                      } catch {
                        if (alive.current) setSaveProblem("unconfirmed");
                      } finally {
                        if (alive.current) setSaving(false);
                      }
                    }}
                  >
                    {ar
                      ? saving
                        ? "جارٍ التحقق من الحفظ…"
                        : "حفظ مسودة معطلة"
                      : saving
                        ? "Checking saved draft…"
                        : "Save disabled draft"}
                  </Button>
                  {selectedOrg.role === "viewer" && (
                    <p className="text-sm">
                      {ar ? "دورك يسمح بالمعاينة فقط." : "Your role permits preview only."}
                    </p>
                  )}
                </div>
              )}
              {saveProblem && (
                <div role="alert" className="space-y-2 text-sm">
                  <p>{SAVE_ERROR_COPY[saveProblem][lang]}</p>
                  {draftId && (
                    <p>
                      {ar ? "معرّف المحاولة: " : "Request ID: "}
                      <code dir="ltr" className="break-all">
                        {draftId}
                      </code>
                    </p>
                  )}
                </div>
              )}
              {receipt && (
                <div
                  role="status"
                  aria-label={ar ? "إقرار الحفظ" : "Save receipt"}
                  className="space-y-2 text-sm"
                >
                  <p>
                    {ar
                      ? "تأكد الحفظ من السجل المطابق نفسه. المسودة معطلة وليست إجراءً منفذًا."
                      : "Saving was confirmed from the matching stored row. This draft is disabled and has not been executed."}
                  </p>
                  <dl className="space-y-2">
                    <div>
                      <dt>{ar ? "معرّف المسودة" : "Draft ID"}</dt>
                      <dd className="break-all" dir="ltr">
                        {receipt.id}
                      </dd>
                    </div>
                    <div>
                      <dt>{ar ? "وقت الحفظ" : "Saved at"}</dt>
                      <dd>{new Date(receipt.createdAt).toLocaleString(lang)}</dd>
                    </div>
                    <div>
                      <dt>{ar ? "الحالة" : "Status"}</dt>
                      <dd>{ar ? "معطلة" : "Disabled"}</dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>
          )}
        </form>
      )}
    </Card>
  );
}
