// ARIA — server functions exposed to UI. All RLS-scoped.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ReportKindSchema } from "./types";

export const runAriaPipeline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({ message: z.string().min(1).max(4000), threadId: z.string().uuid().optional() })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { runPipeline } = await import("./pipeline.server");
    return runPipeline({
      supabase: context.supabase,
      userId: context.userId,
      threadId: data.threadId,
      message: data.message,
    });
  });

export const listAriaReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("aria_reports")
      .select("id,kind,title,period_start,period_end,confidence,created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getAriaReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("aria_reports")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Report not found");
    return row;
  });

export const generateAriaReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ kind: ReportKindSchema, language: z.enum(["ar", "en"]).default("ar") }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { runKpiEngine, runRiskEngine, runDecisionEngine, runReasoner, loadEnterpriseContext } =
      await import("./pipeline.server");
    const { generateReport } = await import("./reports.server");
    const kpiR = await runKpiEngine(context.supabase);
    const risks = await runRiskEngine(context.supabase, kpiR.kpis);
    const decisions = runDecisionEngine(risks, kpiR.kpis);
    const ctx = await loadEnterpriseContext(context.supabase);
    const message =
      data.language === "ar"
        ? `أنشئ ${data.kind === "executive" ? "تقريراً تنفيذياً شاملاً" : data.kind} للوضع الحالي.`
        : `Produce a ${data.kind} report for the current operational state.`;
    const reasoned = await runReasoner({
      message,
      language: data.language,
      enterpriseContext: ctx,
      kpis: kpiR.kpis,
      risks,
      decisions,
      memories: [],
      knowledge: [],
    });
    return generateReport({
      supabase: context.supabase,
      userId: context.userId,
      kind: data.kind,
      kpis: kpiR.kpis,
      risks,
      decisions,
      narrative: reasoned.text,
      language: data.language,
    });
  });

export const listAriaMemory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("aria_memory")
      .select("id,scope,key,content,importance,created_at,last_used_at")
      .order("last_used_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const pinAriaMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        scope: z.string().min(1).max(40).default("pinned"),
        key: z.string().min(1).max(120),
        content: z.string().min(1).max(4000),
        importance: z.number().min(0).max(1).default(0.9),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { storeMemory } = await import("./pipeline.server");
    await storeMemory(
      context.supabase,
      context.userId,
      data.scope,
      data.key,
      data.content,
      data.importance,
    );
    return { ok: true };
  });

export const forgetAriaMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("aria_memory").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listAriaDecisions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("aria_decisions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const updateAriaDecision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["pending", "approved", "executed", "dismissed", "failed"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("aria_decisions")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
