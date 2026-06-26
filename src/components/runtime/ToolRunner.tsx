// Enterprise Tool Runner v2 — strictly schema-driven. No raw JSON. No "{}"
// submissions. Smart defaults from the authenticated session, "Load Sample"
// using real tenant IDs, live read-only payload preview, and humanised
// validation errors. Operators never type JSON.

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Loader2,
  Play,
  FormInput,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { runTool, getToolSampleContext } from "@/lib/exec.functions";
import { JsonSchemaForm, useSchemaForm, type JsonSchema } from "./JsonSchemaForm";

type ToolRunnerProps = {
  toolId: string;
  toolName: string;
  schema: JsonSchema | null | undefined;
  requiresApproval?: boolean;
  enabled?: boolean;
  ar?: boolean;
  onCompleted?: (result: unknown) => void;
};

type SampleCtx = Awaited<ReturnType<typeof getToolSampleContext>>;

const FRIENDLY_ERROR_BY_KEY: Record<string, { en: string; ar: string }> = {
  required: {
    en: "This field is required.",
    ar: "هذا الحقل مطلوب.",
  },
  invalid_email: { en: "Enter a valid email address.", ar: "أدخل بريداً إلكترونياً صالحاً." },
  invalid_uuid: { en: "Enter a valid ID (UUID).", ar: "أدخل معرّفاً صالحاً (UUID)." },
  invalid_url: { en: "Enter a full https:// URL.", ar: "أدخل رابطاً كاملاً https://." },
  invalid_format: { en: "Value does not match the required format.", ar: "القيمة لا تطابق التنسيق المطلوب." },
  out_of_range: { en: "Value is out of the allowed range.", ar: "القيمة خارج النطاق المسموح." },
  not_integer: { en: "Enter a whole number.", ar: "أدخل عدداً صحيحاً." },
  not_in_enum: { en: "Pick one of the available options.", ar: "اختر من القائمة المتاحة." },
};

function humaniseError(msg: string, ar: boolean): string {
  const m = msg.toLowerCase();
  if (m.includes("is required")) return FRIENDLY_ERROR_BY_KEY.required[ar ? "ar" : "en"];
  if (m.includes("email")) return FRIENDLY_ERROR_BY_KEY.invalid_email[ar ? "ar" : "en"];
  if (m.includes("uuid")) return FRIENDLY_ERROR_BY_KEY.invalid_uuid[ar ? "ar" : "en"];
  if (m.includes("url") || m.includes("must be a url")) return FRIENDLY_ERROR_BY_KEY.invalid_url[ar ? "ar" : "en"];
  if (m.includes("must be one of")) return FRIENDLY_ERROR_BY_KEY.not_in_enum[ar ? "ar" : "en"];
  if (m.includes("integer")) return FRIENDLY_ERROR_BY_KEY.not_integer[ar ? "ar" : "en"];
  if (m.startsWith("min ") || m.startsWith("max ") || m.includes("length")) return FRIENDLY_ERROR_BY_KEY.out_of_range[ar ? "ar" : "en"];
  if (m.includes("invalid format")) return FRIENDLY_ERROR_BY_KEY.invalid_format[ar ? "ar" : "en"];
  return msg;
}

/** Walk the schema and pre-fill any property whose name matches a known
 *  contextual key (org_id, user_id, actor_id, now, timestamp, site_id…). */
function applySmartDefaults(
  schema: JsonSchema,
  current: Record<string, unknown>,
  ctx: SampleCtx | undefined,
): Record<string, unknown> {
  if (!ctx) return current;
  const next = { ...current };
  for (const [key, sub] of Object.entries(schema.properties ?? {})) {
    if (next[key] !== undefined && next[key] !== "" && next[key] !== null) continue;
    const k = key.toLowerCase();
    if (sub.type === "object" && sub.properties) {
      const child = (typeof next[key] === "object" && next[key] !== null ? next[key] : {}) as Record<string, unknown>;
      next[key] = applySmartDefaults(sub, child, ctx);
      continue;
    }
    if ((k === "org_id" || k === "organization_id" || k === "tenant_id") && ctx.org_id) next[key] = ctx.org_id;
    else if ((k === "user_id" || k === "actor_id" || k === "operator_id" || k === "created_by") && ctx.user_id) next[key] = ctx.user_id;
    else if ((k === "now" || k === "timestamp" || k === "occurred_at" || k === "at" || k === "as_of") && (sub.type === "string" || !sub.type)) next[key] = ctx.now_iso;
  }
  return next;
}

/** Optionally fill in non-contextual fields with real tenant samples. */
function applySampleData(
  schema: JsonSchema,
  current: Record<string, unknown>,
  ctx: SampleCtx,
): Record<string, unknown> {
  const next = { ...current };
  for (const [key, sub] of Object.entries(schema.properties ?? {})) {
    const k = key.toLowerCase();
    if (sub.type === "object" && sub.properties) {
      next[key] = applySampleData(sub, (next[key] as Record<string, unknown>) ?? {}, ctx);
      continue;
    }
    if (next[key] !== undefined && next[key] !== "" && next[key] !== null) continue;
    if (k.includes("site") && ctx.site_id) next[key] = ctx.site_id;
    else if (k.includes("workflow") && ctx.workflow_id) next[key] = ctx.workflow_id;
    else if (k.includes("incident") && ctx.incident_id) next[key] = ctx.incident_id;
    else if (k.includes("asset") && ctx.asset_id) next[key] = ctx.asset_id;
    else if (k.includes("agent") && ctx.agent_id) next[key] = ctx.agent_id;
    else if (k === "tool_id" && ctx.tool_id) next[key] = ctx.tool_id;
    else if (sub.examples && sub.examples.length > 0) next[key] = sub.examples[0];
    else if (sub.enum && sub.enum.length > 0 && (next[key] === undefined || next[key] === "")) next[key] = sub.enum[0];
  }
  return next;
}

export function ToolRunner({
  toolId,
  toolName,
  schema,
  requiresApproval,
  enabled = true,
  ar,
  onCompleted,
}: ToolRunnerProps) {
  const run = useServerFn(runTool);
  const fetchSampleCtx = useServerFn(getToolSampleContext);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; data?: unknown; error?: string; traceId?: string } | null>(null);
  const [showPreview, setShowPreview] = useState(true);

  const safeSchema: JsonSchema = schema && typeof schema === "object" ? schema : { type: "object", properties: {} };
  const form = useSchemaForm(safeSchema);

  const { data: sampleCtx } = useQuery({
    queryKey: ["tool-sample-ctx"],
    queryFn: () => fetchSampleCtx(),
    staleTime: 60_000,
  });

  // Apply smart defaults once context loads
  useEffect(() => {
    if (!sampleCtx) return;
    const filled = applySmartDefaults(safeSchema, (form.value as Record<string, unknown>) ?? {}, sampleCtx);
    if (JSON.stringify(filled) !== JSON.stringify(form.value)) {
      form.setValue(filled);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sampleCtx]);

  const friendlyErrors = useMemo(
    () => form.errors.map((e) => ({ ...e, message: humaniseError(e.message, !!ar) })),
    [form.errors, ar],
  );

  const loadSample = () => {
    if (!sampleCtx?.has_real_data) {
      toast.error(ar ? "لا توجد بيانات حقيقية" : "No real tenant data available", {
        description: ar
          ? "أضف بيانات في المؤسسة أولاً لاستخدام العينة."
          : "Add records to your tenant before using sample.",
      });
      return;
    }
    const filled = applySampleData(safeSchema, (form.value as Record<string, unknown>) ?? {}, sampleCtx);
    form.setValue(filled);
    toast.success(ar ? "تم تحميل عيّنة حقيقية" : "Loaded real-data sample");
  };

  const submit = async () => {
    if (!form.isValid) {
      const first = friendlyErrors[0];
      toast.error(ar ? "تحقّق من الحقول" : "Fix the highlighted fields", {
        description: first ? `${first.path.replace(/^\$\.?/, "")} — ${first.message}` : undefined,
      });
      return;
    }
    setPending(true);
    setResult(null);
    try {
      const res = (await run({ data: { toolId, input: form.value } })) as Record<string, unknown>;
      const traceId = (res?.execution_id as string) || (res?.id as string) || (res?.correlation_id as string);
      setResult({ ok: true, data: res, traceId });
      toast.success(ar ? "تم التنفيذ" : "Executed", {
        description: traceId ? `Trace ${traceId.slice(0, 8)}…` : undefined,
      });
      onCompleted?.(res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setResult({ ok: false, error: msg });
      toast.error(ar ? "فشل التنفيذ" : "Execution failed", { description: msg });
    } finally {
      setPending(false);
    }
  };

  const propCount = Object.keys(safeSchema.properties ?? {}).length;
  const previewJson = useMemo(() => {
    try {
      return JSON.stringify(form.value ?? {}, null, 2);
    } catch {
      return "{}";
    }
  }, [form.value]);

  return (
    <Card className="glass-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FormInput className="h-4 w-4 text-cyan-300" />
            <span className="truncate font-semibold text-sm">{toolName}</span>
            <Badge variant="outline" className="text-[10px]">{toolId}</Badge>
            {requiresApproval && (
              <Badge variant="secondary" className="text-[10px]">{ar ? "اعتماد" : "Approval"}</Badge>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {propCount === 0
              ? (ar ? "لا توجد مدخلات مطلوبة." : "No inputs required.")
              : (ar ? `${propCount} حقل — مولّد تلقائياً من المخطط` : `${propCount} field${propCount === 1 ? "" : "s"} — auto-generated from schema`)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7"
            disabled={!sampleCtx?.has_real_data || propCount === 0}
            onClick={loadSample}
            title={!sampleCtx?.has_real_data ? (ar ? "لا توجد بيانات حقيقية" : "No real tenant data") : undefined}
          >
            <Sparkles className="h-3 w-3" />
            <span className="ms-1 text-[10px]">{ar ? "عيّنة حقيقية" : "Load Sample"}</span>
          </Button>
        </div>
      </div>

      <JsonSchemaForm
        schema={safeSchema}
        value={form.value}
        onChange={form.setValue}
        errors={friendlyErrors}
      />

      {propCount > 0 && (
        <div className="rounded-md border border-border/40 bg-background/30">
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <span className="flex items-center gap-1.5">
              {showPreview ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              {ar ? "معاينة الحمولة (للقراءة فقط)" : "Payload preview (read-only)"}
            </span>
            <Badge variant="outline" className="text-[10px]">
              {form.isValid ? (ar ? "صالح" : "Valid") : `${friendlyErrors.length} ${ar ? "خطأ" : "issue" + (friendlyErrors.length === 1 ? "" : "s")}`}
            </Badge>
          </button>
          {showPreview && (
            <pre
              className="max-h-40 overflow-auto border-t border-border/40 bg-background/50 px-3 py-2 font-mono text-[11px] text-cyan-200/90"
              aria-readonly
            >
              {previewJson}
            </pre>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="text-[10px] text-muted-foreground">
          {friendlyErrors.length > 0 && (
            <span className="text-rose-400">
              {friendlyErrors.length} {ar ? "حقل بحاجة لمراجعة" : "field" + (friendlyErrors.length === 1 ? "" : "s") + " need attention"}
            </span>
          )}
        </div>
        <Button size="sm" disabled={!enabled || pending || !form.isValid} onClick={submit}>
          {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
          <span className="ms-1">{pending ? (ar ? "جارٍ التنفيذ…" : "Running…") : (ar ? "تشغيل" : "Run")}</span>
        </Button>
      </div>

      {result && (
        <div className={`rounded-md border p-2 text-xs ${result.ok ? "border-emerald-500/30 bg-emerald-500/5" : "border-rose-500/30 bg-rose-500/5"}`}>
          <div className="flex items-center gap-2 mb-1">
            {result.ok ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
            )}
            <span className="font-semibold">
              {result.ok ? (ar ? "نجاح" : "Success") : (ar ? "خطأ" : "Error")}
            </span>
            {result.traceId && (
              <Badge variant="outline" className="text-[10px] ms-auto">
                Trace {result.traceId.slice(0, 8)}
              </Badge>
            )}
          </div>
          {result.error ? (
            <pre className="whitespace-pre-wrap text-[11px] text-rose-300">{humaniseError(result.error, !!ar)}</pre>
          ) : (
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-[11px] text-muted-foreground">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          )}
        </div>
      )}
    </Card>
  );
}
