// Dynamic Tool Runner — renders a schema-driven form for any tool in
// tool_registry. Validates before execution, serializes automatically, and
// surfaces the resulting trace ID for the execution timeline. Falls back to
// raw JSON only when Developer Mode is toggled on.

import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Play, Code2, FormInput, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { runTool } from "@/lib/exec.functions";
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

function useDevMode() {
  const [dev, setDev] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("nexus.devMode") === "1";
  });
  const toggle = (v: boolean) => {
    setDev(v);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("nexus.devMode", v ? "1" : "0");
    }
  };
  return [dev, toggle] as const;
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
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; data?: unknown; error?: string; traceId?: string } | null>(null);
  const [devMode, setDevMode] = useDevMode();
  const [rawText, setRawText] = useState<string>("{}");

  const safeSchema: JsonSchema = schema && typeof schema === "object" ? schema : { type: "object", properties: {} };
  const form = useSchemaForm(safeSchema);

  const submit = async () => {
    let input: unknown;
    if (devMode) {
      try {
        input = JSON.parse(rawText || "{}");
      } catch (e) {
        toast.error(ar ? "JSON غير صالح" : "Invalid JSON", { description: (e as Error).message });
        return;
      }
    } else {
      if (!form.isValid) {
        toast.error(ar ? "تحقق من الحقول" : "Fix validation errors", {
          description: form.errors.map((e) => `${e.path}: ${e.message}`).join("\n"),
        });
        return;
      }
      input = form.value;
    }
    setPending(true);
    setResult(null);
    try {
      const res = (await run({ data: { toolId, input } })) as Record<string, unknown>;
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
              : (ar ? `${propCount} حقل مولّد تلقائياً` : `${propCount} auto-generated field${propCount === 1 ? "" : "s"}`)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Label htmlFor={`dev-${toolId}`} className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Code2 className="h-3 w-3" /> {ar ? "وضع المطور" : "Dev"}
          </Label>
          <Switch id={`dev-${toolId}`} checked={devMode} onCheckedChange={setDevMode} />
        </div>
      </div>

      {devMode ? (
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">{ar ? "مدخلات JSON خام" : "Raw JSON input"}</Label>
          <Textarea
            className="min-h-[140px] font-mono text-xs"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="{}"
          />
        </div>
      ) : (
        <JsonSchemaForm
          schema={safeSchema}
          value={form.value}
          onChange={form.setValue}
          errors={form.errors}
        />
      )}

      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="text-[10px] text-muted-foreground">
          {!devMode && form.errors.length > 0 && (
            <span className="text-rose-400">
              {form.errors.length} {ar ? "خطأ" : "validation error" + (form.errors.length === 1 ? "" : "s")}
            </span>
          )}
        </div>
        <Button size="sm" disabled={!enabled || pending} onClick={submit}>
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
            <pre className="whitespace-pre-wrap text-[11px] text-rose-300">{result.error}</pre>
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
