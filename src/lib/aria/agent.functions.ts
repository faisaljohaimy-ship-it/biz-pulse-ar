/**
 * ARIA autonomous-agent server functions.
 *
 * Additive endpoints for the Executive Thinking Loop:
 *   - runInsightScanFn: proactive scan across live sec/sim/pulse data.
 *   - runThinkingLoopFn: full loop (intent + plan + insights + evidence)
 *     returning a structured executive bundle without a model call.
 *
 * Both are authenticated AND org-scoped so evidence retrieval never leaks
 * cross-tenant rows from the service-role client.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireOrgContext } from "@/lib/org/org-middleware";
import { runInsightScan } from "./insight-engine.server";
import { runThinkingLoop } from "./thinking-loop.server";

export const runInsightScanFn = createServerFn({ method: "POST" })
  .middleware([requireOrgContext])
  .handler(async ({ context }) => runInsightScan(context.orgId));

export const runThinkingLoopFn = createServerFn({ method: "POST" })
  .middleware([requireOrgContext])
  .validator((v) => z.object({ question: z.string().min(1).max(600) }).parse(v))
  .handler(async ({ data, context }) => {
    const bundle = await runThinkingLoop(data.question, { orgId: context.orgId });
    // Strip the raw system prompt from the client-visible payload.
    return {
      intent: bundle.intent,
      sources: bundle.sources,
      plan: bundle.plan,
      insights: bundle.insights,
    };
  });
