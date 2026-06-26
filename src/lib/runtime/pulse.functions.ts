// Enterprise Runtime Pulse — drives autonomous activity across the platform.
// On each tick: closes stale "running" runs, starts a few new agent runs,
// advances any active workflow runs, and publishes correlated enterprise
// events. Everything writes through real tables (agent_runs, workflow_runs,
// workflow_step_runs, enterprise_events) so Realtime fans changes to every
// open dashboard automatically.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { publishEvent } from "@/lib/exec/event-bus.server";

const EVENT_TOPICS: Array<{ topic: string; severity: "info" | "notice" | "warn" | "error" | "critical"; source: string }> = [
  // Security ops — physical
  { topic: "permit.approved", severity: "notice", source: "sec.permits" },
  { topic: "permit.expired", severity: "warn", source: "sec.permits" },
  { topic: "patrol.completed", severity: "info", source: "sec.patrols" },
  { topic: "patrol.checkpoint", severity: "info", source: "sec.patrols" },
  { topic: "vehicle.entered", severity: "info", source: "sec.access" },
  { topic: "vehicle.exited", severity: "info", source: "sec.access" },
  { topic: "gate.opened", severity: "info", source: "sec.gates" },
  { topic: "badge.verified", severity: "info", source: "sec.access" },
  { topic: "visitor.checked_in", severity: "info", source: "sec.visitors" },
  { topic: "visitor.checked_out", severity: "info", source: "sec.visitors" },
  { topic: "contractor.arrived", severity: "info", source: "sec.contractors" },
  { topic: "contractor.expired", severity: "warn", source: "sec.contractors" },
  { topic: "cctv.alert", severity: "warn", source: "sec.cctv" },
  { topic: "sensor.triggered", severity: "warn", source: "sec.sensors" },
  { topic: "fire.alarm.restored", severity: "notice", source: "sec.fire" },
  { topic: "emergency.drill", severity: "notice", source: "sec.ops" },
  { topic: "maintenance.completed", severity: "info", source: "sec.work_orders" },
  // Risk / incidents
  { topic: "incident.created", severity: "warn", source: "sec.incidents" },
  { topic: "incident.closed", severity: "info", source: "sec.incidents" },
  { topic: "risk.increased", severity: "error", source: "risk.engine" },
  { topic: "risk.resolved", severity: "notice", source: "risk.engine" },
  { topic: "risk.escalated", severity: "error", source: "risk.engine" },
  // Workflows / approvals
  { topic: "workflow.approved", severity: "notice", source: "exec.workflow" },
  { topic: "audit.completed", severity: "notice", source: "compliance" },
  // Integrations
  { topic: "sap.synchronized", severity: "info", source: "integration.sap" },
  { topic: "outlook.email.sent", severity: "info", source: "integration.outlook" },
  { topic: "teams.notification", severity: "info", source: "integration.teams" },
  { topic: "sharepoint.upload", severity: "info", source: "integration.sharepoint" },
  // Exec / AI
  { topic: "report.generated", severity: "info", source: "exec.reports" },
  { topic: "briefing.published", severity: "notice", source: "exec.briefings" },
  { topic: "ai.recommendation", severity: "info", source: "aria.engine" },
  { topic: "prediction.updated", severity: "info", source: "kpi.intel" },
  { topic: "kpi.refreshed", severity: "info", source: "kpi.intel" },
  { topic: "notification.delivered", severity: "info", source: "comms.notifications" },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function pickN<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length > 0) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]!);
  }
  return out;
}

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
    if (!orgId) return { agents: 0, events: 0, workflows: 0, closed: 0 };

    let closed = 0;
    let agentsStarted = 0;
    let workflowsAdvanced = 0;
    let eventsPublished = 0;

    // 1) Close any agent_runs left "running" for >25s — simulate completion.
    const cutoff = new Date(Date.now() - 25_000).toISOString();
    const { data: stale } = await supabaseAdmin
      .from("agent_runs")
      .select("id, agent_id, started_at")
      .eq("org_id", orgId)
      .eq("status", "running")
      .lt("started_at", cutoff)
      .limit(8);
    if (stale && stale.length > 0) {
      for (const r of stale) {
        const ok = Math.random() > 0.08;
        const dur = Date.now() - new Date(r.started_at as string).getTime();
        await supabaseAdmin
          .from("agent_runs")
          .update({
            status: ok ? "succeeded" : "failed",
            finished_at: new Date().toISOString(),
            steps: 3 + Math.floor(Math.random() * 6),
            summary: ok ? "Run completed within SLA." : "Recoverable downstream timeout.",
            error: ok ? null : "Upstream tool timed out (retrying next cycle).",
          })
          .eq("id", r.id);
        await publishEvent(supabase, {
          topic: ok ? "agent.run.succeeded" : "agent.run.failed",
          source: "agent.runtime",
          severity: ok ? "info" : "warn",
          subject_type: "agent_run",
          subject_id: r.id,
          org_id: orgId,
          actor_id: userId,
          duration_ms: dur,
          payload: { agent_id: r.agent_id },
          metrics: { duration_ms: dur, cost_usd: +(0.002 + Math.random() * 0.05).toFixed(4) },
        });
        eventsPublished++;
        closed++;
      }
    }

    // 2) Start 1-3 new agent runs against enabled agents.
    const { data: agents } = await supabaseAdmin
      .from("agent_definitions")
      .select("id, name")
      .eq("enabled", true)
      .limit(50);
    if (agents && agents.length > 0) {
      const toStart = pickN(agents, 1 + Math.floor(Math.random() * 3));
      for (const a of toStart) {
        const goals = [
          "Scan operational telemetry for anomalies",
          "Refresh KPI projections for executive briefing",
          "Triage open incidents and recommend next actions",
          "Validate compliance posture across active permits",
          "Synthesize cross-site risk indicators",
          "Reconcile maintenance backlog with asset criticality",
        ];
        const { data: ins } = await supabaseAdmin
          .from("agent_runs")
          .insert({
            agent_id: a.id,
            triggered_by: userId,
            goal_override: pick(goals),
            status: "running",
            steps: 0,
            context_json: { autonomous: true, cycle: Date.now() },
            org_id: orgId,
          })
          .select("id")
          .single();
        if (ins?.id) {
          agentsStarted++;
          await publishEvent(supabase, {
            topic: "agent.run.started",
            source: "agent.runtime",
            severity: "info",
            subject_type: "agent_run",
            subject_id: ins.id,
            org_id: orgId,
            actor_id: userId,
            payload: { agent_id: a.id, agent_name: a.name },
          });
          eventsPublished++;
        }
      }
    }

    // 3) Advance any in-flight workflow runs (best-effort; ignore if none).
    const { data: activeWf } = await supabaseAdmin
      .from("workflow_runs")
      .select("id, current_step, status")
      .eq("org_id", orgId)
      .eq("status", "running")
      .limit(5);
    const STEP_FLOW = ["planning", "investigation", "approval", "execution", "verification", "completion"];
    if (activeWf) {
      for (const wf of activeWf) {
        const idx = STEP_FLOW.indexOf((wf.current_step as string) ?? "planning");
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
        workflowsAdvanced++;
        await publishEvent(supabase, {
          topic: done ? "workflow.completed" : `workflow.step.${next}`,
          source: "exec.workflow",
          severity: done ? "notice" : "info",
          subject_type: "workflow_run",
          subject_id: wf.id,
          org_id: orgId,
          actor_id: userId,
          payload: { step: next },
        });
        eventsPublished++;
      }
    }

    // 4) Publish 2-4 enterprise events to keep timelines moving.
    const burst = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < burst; i++) {
      const t = pick(EVENT_TOPICS);
      await publishEvent(supabase, {
        topic: t.topic,
        source: t.source,
        severity: t.severity,
        org_id: orgId,
        actor_id: userId,
        subject_type: t.topic.split(".")[0] ?? "system",
        payload: {
          cycle: Date.now(),
          site: pick(["Jeddah", "Makkah", "Yanbu", "Rabigh", "Taif"]),
          confidence: +(0.7 + Math.random() * 0.29).toFixed(2),
        },
        metrics: {
          latency_ms: 40 + Math.floor(Math.random() * 220),
          cost_usd: +(Math.random() * 0.03).toFixed(4),
        },
      });
      eventsPublished++;
    }

    return {
      agents: agentsStarted,
      events: eventsPublished,
      workflows: workflowsAdvanced,
      closed,
      at: new Date().toISOString(),
    };
  });
