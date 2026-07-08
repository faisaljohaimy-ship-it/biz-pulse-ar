/**
 * Phase 9.3 — Execution router. The canonical pipeline entry point.
 *
 * Pipeline:
 *   Resolve capability → Validate permissions → Resolve credentials →
 *   Budget validation → Timeout policy → Retry policy → Sandbox →
 *   Execute → Collect telemetry → Audit → Return typed result.
 *
 * Missing bindings / unbound adapters return "unconfigured". Nothing is
 * fabricated. The router never issues raw HTTP; adapters own I/O.
 */

import { ToolExecutionRequestSchema } from "./contracts";
import type { ExecutionStatus, ToolExecutionRequest, ToolExecutionResult } from "./types";
import { requireTool } from "./registry.server";
import { authorize } from "./authorization.server";
import { resolveCredentials } from "./credentials.server";
import { evaluatePolicy } from "./policy.server";
import { validateBudget, enforceBytes, measureBytes } from "./budget.server";
import { runWithTimeout, ToolTimeoutError } from "./timeout.server";
import { defaultRetryPlan, backoffFor, shouldRetry } from "./retry.server";
import { createSandbox, destroySandbox } from "./sandbox.server";
import { checkpoint } from "./checkpoint.server";
import { takeSnapshot } from "./snapshot.server";
import { emitTelemetry } from "./telemetry.server";
import { auditExecution } from "./audit.server";
import { recordMetric } from "./metrics.server";
import { getAdapter } from "./adapter.server";

function makeResult(
  req: ToolExecutionRequest,
  adapter: import("./types").AdapterKind,
  status: ExecutionStatus,
  output: unknown,
  error: { message: string; code: string } | null,
  startedAt: string,
  attempts: number,
  bytesIn: number,
  bytesOut: number,
): ToolExecutionResult {
  const finished = new Date().toISOString();
  return {
    execution_id: req.context.execution_id,
    tool_id: req.tool_id,
    adapter,
    status,
    output,
    error,
    started_at: startedAt,
    finished_at: finished,
    duration_ms: Date.parse(finished) - Date.parse(startedAt),
    attempts,
    bytes_in: bytesIn,
    bytes_out: bytesOut,
    trace_id: req.context.trace_id,
  };
}

export async function execute(rawRequest: ToolExecutionRequest): Promise<ToolExecutionResult> {
  const request = ToolExecutionRequestSchema.parse(rawRequest) as ToolExecutionRequest;
  const startedAt = new Date().toISOString();
  const ctx = request.context;

  // 1. Resolve capability / tool
  const tool = requireTool(request.tool_id);
  emitTelemetry(ctx.execution_id, tool.tool_id, "resolve", "tool resolved", {
    adapter: tool.adapter,
    capability_id: tool.capability_id,
  });
  checkpoint(ctx.execution_id, "resolve");

  const bytesIn = measureBytes(request.input);

  const finalize = (
    status: ExecutionStatus,
    output: unknown,
    error: { message: string; code: string } | null,
    attempts: number,
    stageMsg: string,
  ): ToolExecutionResult => {
    const bytesOut = measureBytes(output);
    const result = makeResult(
      request,
      tool.adapter,
      status,
      output,
      error,
      startedAt,
      attempts,
      bytesIn,
      bytesOut,
    );
    emitTelemetry(ctx.execution_id, tool.tool_id, "telemetry", stageMsg, { status });
    recordMetric({
      tool_id: tool.tool_id,
      adapter: tool.adapter,
      taken_at: result.finished_at,
      duration_ms: result.duration_ms,
      status,
      attempts,
    });
    auditExecution({
      execution_id: ctx.execution_id,
      tool_id: tool.tool_id,
      adapter: tool.adapter,
      agent_id: ctx.agent_id,
      org_id: ctx.org_id,
      status,
      side_effect: tool.side_effect,
      reason: stageMsg,
      trace_id: ctx.trace_id,
    });
    takeSnapshot(request, status, attempts);
    destroySandbox(ctx.execution_id);
    emitTelemetry(ctx.execution_id, tool.tool_id, "return", "result returned", { status });
    return result;
  };

  // 2. Permissions
  const authz = authorize(ctx.agent_id, tool);
  emitTelemetry(ctx.execution_id, tool.tool_id, "permissions", authz.reason, {
    allowed: authz.allowed,
  });
  checkpoint(ctx.execution_id, "permissions");
  if (!authz.allowed) {
    return finalize(
      "unauthorized",
      null,
      { message: authz.reason, code: "unauthorized" },
      0,
      authz.reason,
    );
  }

  // 3. Credentials
  const creds = await resolveCredentials(tool.credentials_ref);
  emitTelemetry(ctx.execution_id, tool.tool_id, "credentials", creds.reason, {
    found: creds.found,
  });
  checkpoint(ctx.execution_id, "credentials");
  if (!creds.found) {
    return finalize(
      "unconfigured",
      null,
      { message: creds.reason, code: "no_credentials" },
      0,
      creds.reason,
    );
  }

  // 4. Policy
  const policy = evaluatePolicy({
    adapter: tool.adapter,
    side_effect: tool.side_effect,
    org_id: ctx.org_id,
  });
  emitTelemetry(ctx.execution_id, tool.tool_id, "permissions", policy.reason, {
    allow: policy.allow,
  });
  if (!policy.allow) {
    return finalize(
      "denied",
      null,
      { message: policy.reason, code: "policy_denied" },
      0,
      policy.reason,
    );
  }

  // 5. Budget
  const budget = validateBudget(request.budget, tool.timeout_ms, ctx.deadline_at);
  emitTelemetry(ctx.execution_id, tool.tool_id, "budget", budget.reason, {
    effective_ms: budget.effective_deadline_ms,
  });
  checkpoint(ctx.execution_id, "budget");
  if (!budget.ok) {
    return finalize(
      "budget_exceeded",
      null,
      { message: budget.reason, code: "budget" },
      0,
      budget.reason,
    );
  }
  const bytesCheck = enforceBytes(request.budget, bytesIn, 0);
  if (!bytesCheck.ok) {
    return finalize(
      "budget_exceeded",
      null,
      { message: bytesCheck.reason, code: "budget_bytes" },
      0,
      bytesCheck.reason,
    );
  }

  // 6. Sandbox
  createSandbox({
    execution_id: ctx.execution_id,
    adapter: tool.adapter,
    allowed_side_effect: tool.side_effect,
  });
  checkpoint(ctx.execution_id, "sandbox");

  // 7. Adapter binding
  const handler = getAdapter(tool.adapter);
  if (!handler) {
    return finalize(
      "unconfigured",
      null,
      { message: `no handler bound for adapter ${tool.adapter}`, code: "unbound_adapter" },
      0,
      "unbound adapter",
    );
  }

  // 8. Execute with retry + timeout
  const plan = defaultRetryPlan(tool.max_retries);
  const effectiveTimeout = budget.effective_deadline_ms ?? tool.timeout_ms;
  let attempts = 0;
  let lastErr: unknown = null;

  while (attempts < plan.attempts_allowed) {
    attempts += 1;
    emitTelemetry(ctx.execution_id, tool.tool_id, "execute", `attempt ${attempts}`, { attempts });
    checkpoint(ctx.execution_id, "execute");
    try {
      const output = await runWithTimeout(
        () => handler.execute(request.input, ctx),
        effectiveTimeout,
        tool.tool_id,
      );
      const bytesOutCheck = enforceBytes(request.budget, bytesIn, measureBytes(output));
      if (!bytesOutCheck.ok) {
        return finalize(
          "budget_exceeded",
          null,
          { message: bytesOutCheck.reason, code: "budget_bytes_out" },
          attempts,
          bytesOutCheck.reason,
        );
      }
      return finalize("success", output, null, attempts, "adapter returned output");
    } catch (err) {
      lastErr = err;
      const timeoutErr = err instanceof ToolTimeoutError;
      emitTelemetry(ctx.execution_id, tool.tool_id, "retry", "attempt failed", {
        attempts,
        timeout: timeoutErr,
        message: err instanceof Error ? err.message : String(err),
      });
      if (timeoutErr) {
        return finalize(
          "timeout",
          null,
          { message: err.message, code: "timeout" },
          attempts,
          "timeout",
        );
      }
      if (!shouldRetry(plan, attempts, err)) break;
      await new Promise((r) => setTimeout(r, backoffFor(plan, attempts)));
    }
  }

  const msg = lastErr instanceof Error ? lastErr.message : String(lastErr ?? "unknown error");
  return finalize("failure", null, { message: msg, code: "adapter_failure" }, attempts, msg);
}
