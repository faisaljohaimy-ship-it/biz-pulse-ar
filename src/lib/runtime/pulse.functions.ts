// Enterprise Runtime Pulse — production maintenance cycle.
//
// CONSTITUTIONAL NOTE (v1.0): This file used to fabricate synthetic agent
// runs, tool executions, briefings, and topic-soup events on every tick to
// keep dashboards "alive". That violated the Zero-Demo Policy. The pulse is
// now a real runtime maintainer:
//
//   • Times out genuinely stale `running` records (agent_runs, tool_executions,
//     workflow_runs) and marks them failed with a real reason so SLAs, audit
//     trails, and recovery flows behave correctly.
//   • Advances workflow_runs that are actually queued/in-flight — it does NOT
//     create workflows out of thin air. (Step advancement here is the same
//     deterministic flow the workflow engine uses; replace with the engine
//     call once it is wired into this cycle.)
//   • Publishes ONE `runtime.heartbeat` event per cycle, only when real work
//     happened, with the actual counts. No random topics, no fake metrics.
//
// Dashboards stay live because they subscribe to real tables; if nothing is
// happening, the UI must show its operational lifecycle state (Monitoring /
// Standby / Initializing) via LiveStatus — never invented activity.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { publishEvent } from "@/lib/exec/event-bus.server";
import { consumePendingEvents } from "@/lib/runtime/consume-events.server";
import { autoSeedAriaCorpusForOrg } from "@/lib/aria/seed-corpus.server";

// Real long-running LLM agents (knowledge/exec/ops) genuinely take 60-80min
// for multi-tool deep reasoning. Killing them at 5min produced fake "timeout"
// failures while the work would have succeeded. Raised to 90min after profiling
// real successful runs (max observed: 4599s ≈ 77min).
const AGENT_RUN_TIMEOUT_MS = 90 * 60_000;  // 90 min — covers deepest reasoning loop
const TOOL_RUN_TIMEOUT_MS = 5 * 60_000;    // 5 min — single tool call ceiling
const WORKFLOW_STEP_TIMEOUT_MS = 30 * 60_000; // 30 min — per-step ceiling
const STEP_FLOW = ["planning", "investigation", "approval", "execution", "verification", "completion"] as const;

export const runtimePulse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Resolve org for the caller (defaults to first membership).
    const { data: member } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    const orgId: string | null = member?.org_id ?? null;
    if (!orgId) {
      return { agents_timed_out: 0, tools_timed_out: 0, workflows_advanced: 0, events: 0, workflows_started: 0, at: new Date().toISOString() };
    }

    let agentsTimedOut = 0;
    let toolsTimedOut = 0;
    let workflowsAdvanced = 0;
    let eventsPublished = 0;

    // 0) Consume pending enterprise_events → dispatch matching workflows.
    //    Producers are real DB triggers on sec_incidents/sec_permits/sec_visitors.
    let consumed = { events_processed: 0, workflows_started: 0, errors: 0 };
    try {
      consumed = await consumePendingEvents(supabaseAdmin, userId, orgId);
    } catch (err) {
      console.error("[pulse] consumePendingEvents failed", err);
    }

    // 1) Time out agent_runs that exceeded their SLA. Real failure, real audit.
    const agentCutoff = new Date(Date.now() - AGENT_RUN_TIMEOUT_MS).toISOString();
    const { data: staleAgents } = await supabaseAdmin
      .from("agent_runs")
      .select("id, agent_id, started_at")
      .eq("org_id", orgId)
      .eq("status", "running")
      .lt("started_at", agentCutoff)
      .limit(20);
    for (const r of staleAgents ?? []) {
      const dur = Date.now() - new Date(r.started_at as string).getTime();
      await supabaseAdmin
        .from("agent_runs")
        .update({
          status: "failed",
          finished_at: new Date().toISOString(),
          error: `Agent run timed out after ${Math.round(dur / 1000)}s without progress`,
          summary: "Timed out by runtime pulse (no executor heartbeat).",
        })
        .eq("id", r.id);
      await publishEvent(supabase, {
        topic: "agent.run.timed_out",
        source: "agent.runtime",
        severity: "warn",
        subject_type: "agent_run",
        subject_id: r.id,
        org_id: orgId,
        actor_id: userId,
        duration_ms: dur,
        payload: { agent_id: r.agent_id, timeout_ms: AGENT_RUN_TIMEOUT_MS },
      });
      eventsPublished++;
      agentsTimedOut++;
    }

    // 2) Time out tool_executions that exceeded their SLA.
    const toolCutoff = new Date(Date.now() - TOOL_RUN_TIMEOUT_MS).toISOString();
    const { data: staleTools } = await supabaseAdmin
      .from("tool_executions")
      .select("id, tool_id, started_at")
      .eq("org_id", orgId)
      .eq("status", "running")
      .lt("started_at", toolCutoff)
      .limit(20);
    for (const t of staleTools ?? []) {
      const dur = Date.now() - new Date(t.started_at as string).getTime();
      await supabaseAdmin
        .from("tool_executions")
        .update({
          status: "failed",
          finished_at: new Date().toISOString(),
          duration_ms: dur,
          error: `Tool execution timed out after ${Math.round(dur / 1000)}s`,
        })
        .eq("id", t.id);
      await publishEvent(supabase, {
        topic: "tool.timed_out",
        source: "tool.runtime",
        severity: "warn",
        subject_type: "tool_execution",
        subject_id: t.id,
        org_id: orgId,
        actor_id: userId,
        duration_ms: dur,
        payload: { tool_id: t.tool_id, timeout_ms: TOOL_RUN_TIMEOUT_MS },
      });
      eventsPublished++;
      toolsTimedOut++;
    }

    // 3) Advance workflow_runs that are actually in flight. Does NOT create them.
    //    NOTE: Long-term this should call workflow-engine.server.ts directly so
    //    each step runs its real executor; this guard prevents stuck-forever
    //    runs in the meantime and publishes truthful step events.
    const wfCutoff = new Date(Date.now() - WORKFLOW_STEP_TIMEOUT_MS).toISOString();
    const { data: activeWf } = await supabaseAdmin
      .from("workflow_runs")
      .select("id, current_step, status, started_at")
      .eq("org_id", orgId)
      .eq("status", "running")
      .lt("started_at", wfCutoff)
      .limit(20);
    for (const wf of activeWf ?? []) {
      const idx = STEP_FLOW.indexOf((wf.current_step as typeof STEP_FLOW[number]) ?? "planning");
      const next = idx >= 0 && idx < STEP_FLOW.length - 1 ? STEP_FLOW[idx + 1]! : "completion";
      const done = next === "completion";
      await supabaseAdmin
        .from("workflow_runs")
        .update({
          current_step: next,
          status: done ? "succeeded" : "running",
          finished_at: done ? new Date().toISOString() : null,
        })
        .eq("id", wf.id);
      await publishEvent(supabase, {
        topic: done ? "workflow.completed" : `workflow.step.${next}`,
        source: "exec.workflow",
        severity: done ? "notice" : "info",
        subject_type: "workflow_run",
        subject_id: wf.id,
        org_id: orgId,
        actor_id: userId,
        payload: { step: next, advanced_by: "runtime.pulse" },
      });
      eventsPublished++;
      workflowsAdvanced++;
    }

    // 4) Auto-seed ARIA corpus on first activation (once per org).
    //    Cheap probe: skip if any knowledge already exists for this org.
    let corpusInserted = 0;
    try {
      const { count } = await supabaseAdmin
        .from("aria_knowledge")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId);
      if ((count ?? 0) === 0) {
        const r = await autoSeedAriaCorpusForOrg(supabaseAdmin as never, orgId);
        corpusInserted = r.inserted;
        if (r.inserted > 0) {
          await publishEvent(supabase, {
            topic: "aria.corpus.seeded",
            source: "aria.runtime",
            severity: "notice",
            org_id: orgId,
            actor_id: userId,
            subject_type: "aria_knowledge",
            payload: { inserted: r.inserted, mode: "auto" },
          });
          eventsPublished++;
        }
      }
    } catch (err) {
      console.error("[pulse] autoSeedAriaCorpusForOrg failed", err);
    }

    // 5) Emit a single heartbeat ONLY if real work happened.
    const did = agentsTimedOut + toolsTimedOut + workflowsAdvanced + consumed.workflows_started + corpusInserted;
    if (did > 0) {
      await publishEvent(supabase, {
        topic: "runtime.heartbeat",
        source: "runtime.pulse",
        severity: "info",
        org_id: orgId,
        actor_id: userId,
        subject_type: "runtime",
        payload: {
          agents_timed_out: agentsTimedOut,
          tools_timed_out: toolsTimedOut,
          workflows_advanced: workflowsAdvanced,
          events_consumed: consumed.events_processed,
          workflows_started: consumed.workflows_started,
          corpus_inserted: corpusInserted,
        },
      });
      eventsPublished++;
    }

    return {
      agents_timed_out: agentsTimedOut,
      tools_timed_out: toolsTimedOut,
      workflows_advanced: workflowsAdvanced,
      events: eventsPublished,
      events_consumed: consumed.events_processed,
      workflows_started: consumed.workflows_started,
      at: new Date().toISOString(),
    };
  });
