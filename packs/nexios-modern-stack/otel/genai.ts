/**
 * NEXIOS — طبقة القياس المفقودة (telemetry/)
 * تصطلح على OpenTelemetry GenAI Semantic Conventions.
 *
 * تحذير إصدار: اتفاقيات gen_ai.* ما تزال pre-stable (لا 1.0 بعد).
 * ثبّت الإصدار الذي تبني عليه وتوقّع تغيّر أسماء بين النسخ.
 */
import { trace, SpanStatusCode } from "@opentelemetry/api";

export const SEMCONV_VERSION = "1.41.0"; // ثبّتها ووثّقها

const tracer = trace.getTracer("nexios.sadeed.shell", SEMCONV_VERSION);

type Outcome = "success" | "partial" | "fail" | "insufficient_evidence";

/** غلاف استدعاء قدرة — ينتج span وسطرًا في shell_runs معًا */
export async function withCapabilitySpan<T>(
  ctx: {
    capabilityId: string;
    agentId: string;
    role: string;
    region?: string;
    isSimulation: boolean;
  },
  fn: () => Promise<{ result: T; outcome: Outcome; gated?: boolean; cited?: boolean }>
): Promise<T> {
  return tracer.startActiveSpan(`invoke_agent ${ctx.agentId}`, async (span) => {
    const t0 = performance.now();
    span.setAttributes({
      "gen_ai.operation.name": "invoke_agent",
      "gen_ai.agent.id": ctx.agentId,
      "gen_ai.tool.name": ctx.capabilityId,
      // سمات نطاقية — ليست من الاتفاقية، لذا مساحة أسماء خاصة
      "nexios.role": ctx.role,
      "nexios.region": ctx.region ?? "unset",
      "nexios.is_simulation": ctx.isSimulation,
    });

    try {
      const r = await fn();
      span.setAttributes({
        "nexios.outcome": r.outcome,
        "nexios.gated": r.gated ?? false,
        "nexios.cited": r.cited ?? false,
      });
      // الامتناع نجاح لا فشل — لا تعاقب النظام على صدقه
      span.setStatus({
        code: r.outcome === "fail" ? SpanStatusCode.ERROR : SpanStatusCode.OK,
      });
      await recordRun({ ...ctx, outcome: r.outcome, latencyMs: performance.now() - t0 });
      return r.result;
    } catch (e) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(e) });
      await recordRun({ ...ctx, outcome: "fail", latencyMs: performance.now() - t0 });
      throw e;
    } finally {
      span.end();
    }
  });
}

/** يكتب في shell_runs — القشرة تكتب هنا فقط (allowlist) */
async function recordRun(_row: {
  capabilityId: string;
  role: string;
  region?: string;
  isSimulation: boolean;
  outcome: Outcome;
  latencyMs: number;
}): Promise<void> {
  // اربطه بـ shell.runs.record.
  // لا تفعّل adapt/ قبل أن يكتب هذا فعليًا — تكيّف بلا قياس = انحراف.
}
