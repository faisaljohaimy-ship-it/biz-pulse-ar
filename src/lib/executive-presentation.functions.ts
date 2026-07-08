/**
 * Executive Presentation — server functions.
 *
 * Live signals feeding the Executive Presentation layer on /live-dashboard.
 * All reads go through the RLS-scoped `context.supabase` (as the caller);
 * writes for decision approvals stay in the caller's rows and emit an
 * enterprise_event that downstream workers pick up.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { triggerWorkflow } from "@/lib/exec/workflow-engine.server";
import { z } from "zod";

// ---------- System Pulse ----------

export type PulseTone = "healthy" | "warning" | "critical" | "unknown";

export type PulseChip = {
  key: string;
  label_ar: string;
  label_en: string;
  status: PulseTone;
  value: string;
  detail: string;
  updated_at: string;
};

export type SystemPulse = {
  generated_at: string;
  chips: PulseChip[];
  confidence: number; // 0-100 platform-wide operating confidence
};

function tone(v: number, warn: number, crit: number, inverse = false): PulseTone {
  if (Number.isNaN(v)) return "unknown";
  if (inverse) {
    if (v >= crit) return "critical";
    if (v >= warn) return "warning";
    return "healthy";
  }
  if (v <= crit) return "critical";
  if (v <= warn) return "warning";
  return "healthy";
}

export const getSystemPulse = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SystemPulse> => {
    const { supabase } = context;
    const sinceHour = new Date(Date.now() - 3600_000).toISOString();
    const sinceDay = new Date(Date.now() - 24 * 3600_000).toISOString();
    const now = new Date().toISOString();

    const [aiUsage, tools, agents, runs, incidents, audits, memory] = await Promise.all([
      supabase
        .from("ai_usage")
        .select("latency_ms,total_tokens,created_at")
        .gte("created_at", sinceDay)
        .limit(5000),
      supabase
        .from("tool_executions")
        .select("status,duration_ms,created_at")
        .gte("created_at", sinceHour)
        .limit(5000),
      supabase
        .from("agent_runs")
        .select("status,started_at")
        .gte("started_at", sinceDay)
        .limit(2000),
      supabase
        .from("workflow_runs")
        .select("status,started_at")
        .gte("started_at", sinceDay)
        .limit(2000),
      supabase
        .from("sec_incidents")
        .select("severity,status")
        .in("status", ["open", "in_progress", "escalated"])
        .limit(2000),
      supabase
        .from("audit_logs")
        .select("status,occurred_at")
        .gte("occurred_at", sinceDay)
        .limit(2000),
      supabase
        .from("aria_memory")
        .select("id,importance,updated_at")
        .gte("updated_at", sinceDay)
        .limit(2000),
    ]);

    const aiRows = (aiUsage.data ?? []) as { latency_ms: number | null; total_tokens: number }[];
    const aiTotal = aiRows.length;
    // Health signal for AI = presence of traffic + latency band (no status col in ai_usage).
    const aiLatency = aiRows.length
      ? Math.round(aiRows.reduce((s, r) => s + (r.latency_ms ?? 0), 0) / aiRows.length)
      : 0;
    const aiRate = aiTotal === 0 ? 100 : aiLatency > 8000 ? 60 : aiLatency > 4000 ? 85 : 99;

    const toolRows = (tools.data ?? []) as { status: string; duration_ms: number | null }[];
    const toolTotal = toolRows.length;
    const toolFail = toolRows.filter((r) => r.status === "failed").length;
    const toolFailPct = toolTotal ? (toolFail * 100) / toolTotal : 0;
    const toolAvg = toolRows.length
      ? Math.round(toolRows.reduce((s, r) => s + (r.duration_ms ?? 0), 0) / toolRows.length)
      : 0;

    const agentRows = (agents.data ?? []) as { status: string }[];
    const agentActive = agentRows.filter(
      (r) => r.status === "running" || r.status === "queued",
    ).length;
    const agentFail = agentRows.filter((r) => r.status === "failed").length;
    const agentTotal = agentRows.length || 1;
    const agentFailPct = (agentFail * 100) / agentTotal;

    const runRows = (runs.data ?? []) as { status: string }[];
    const runsRunning = runRows.filter((r) => r.status === "running").length;
    const runsFailed = runRows.filter((r) => r.status === "failed").length;
    const runsTotal = runRows.length || 1;
    const runsFailPct = (runsFailed * 100) / runsTotal;

    const incRows = (incidents.data ?? []) as { severity: string; status: string }[];
    const critical = incRows.filter((i) => i.severity === "critical").length;
    const openIncidents = incRows.length;

    const auditRows = (audits.data ?? []) as { status: string | null }[];
    const auditFail = auditRows.filter((a) => a.status === "failed" || a.status === "error").length;
    const auditTotal = auditRows.length || 1;
    const auditFailPct = (auditFail * 100) / auditTotal;

    const memRows = memory.data ?? [];
    const memActive = memRows.length;

    // Voice / Avatar readiness: verify configured secrets exist server-side.
    const voiceReady = Boolean(process.env.ELEVENLABS_API_KEY);
    const avatarReady = Boolean(process.env.HEYGEN_API_KEY || process.env.LIVEAVATAR_API_KEY);
    const aiKeyReady = Boolean(process.env.LOVABLE_API_KEY);

    const chips: PulseChip[] = [
      {
        key: "ai",
        label_ar: "الذكاء الاصطناعي",
        label_en: "AI",
        status: !aiKeyReady ? "critical" : tone(aiRate, 95, 90),
        value: `${aiRate}%`,
        detail: `${aiTotal} calls · ${aiLatency}ms avg`,
        updated_at: now,
      },
      {
        key: "runtime",
        label_ar: "وقت التشغيل",
        label_en: "Runtime",
        status: tone(runsFailPct, 5, 15, true),
        value: `${runsRunning}`,
        detail: `${runsRunning} running · ${runsFailed} failed / 24h`,
        updated_at: now,
      },
      {
        key: "tools",
        label_ar: "الأدوات",
        label_en: "Tools",
        status: tone(toolFailPct, 2, 10, true),
        value: `${Math.round(100 - toolFailPct)}%`,
        detail: `${toolTotal} exec · ${toolAvg}ms avg`,
        updated_at: now,
      },
      {
        key: "agents",
        label_ar: "الوكلاء",
        label_en: "Agents",
        status: tone(agentFailPct, 5, 15, true),
        value: `${agentActive}`,
        detail: `${agentActive} active · ${agentFail} failed`,
        updated_at: now,
      },
      {
        key: "voice",
        label_ar: "الصوت",
        label_en: "Voice",
        status: voiceReady ? "healthy" : "warning",
        value: voiceReady ? "READY" : "OFF",
        detail: voiceReady ? "ElevenLabs configured" : "ElevenLabs key missing",
        updated_at: now,
      },
      {
        key: "avatar",
        label_ar: "الأڤاتار",
        label_en: "Avatar",
        status: avatarReady ? "healthy" : "warning",
        value: avatarReady ? "READY" : "OFF",
        detail: avatarReady ? "HeyGen configured" : "HeyGen key missing",
        updated_at: now,
      },
      {
        key: "memory",
        label_ar: "الذاكرة",
        label_en: "Memory",
        status: memActive > 0 ? "healthy" : "warning",
        value: `${memActive}`,
        detail: `${memActive} entries updated / 24h`,
        updated_at: now,
      },
      {
        key: "security",
        label_ar: "الأمن",
        label_en: "Security",
        status: critical > 0 ? "critical" : openIncidents > 5 ? "warning" : "healthy",
        value: `${critical}`,
        detail: `${critical} critical · ${openIncidents} open`,
        updated_at: now,
      },
      {
        key: "api",
        label_ar: "الواجهات",
        label_en: "API",
        status: tone(auditFailPct, 2, 10, true),
        value: `${Math.round(100 - auditFailPct)}%`,
        detail: `${auditTotal} events · ${auditFail} errors`,
        updated_at: now,
      },
    ];

    // Overall confidence: weighted health of AI + tools + runtime + security.
    const conf = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          0.3 * aiRate +
            0.25 * (100 - toolFailPct) +
            0.2 * (100 - runsFailPct) +
            0.25 * (critical > 0 ? 40 : openIncidents > 5 ? 70 : 95),
        ),
      ),
    );

    return { generated_at: now, chips, confidence: conf };
  });

// ---------- Live Pipelines (Runtime / Voice / Avatar) ----------

export type LivePipelineBucket = {
  t: string; // ISO bucket start
  label: string; // HH:mm
  runs: number; // total events in bucket
  errors: number; // failed / errored events in bucket
};

export type LivePipelineSeries = {
  key: "runtime" | "voice" | "avatar";
  label_ar: string;
  label_en: string;
  totalRuns: number;
  totalErrors: number;
  errorRate: number; // 0-100
  avgPerMin: number;
  status: PulseTone;
  ready: boolean;
  buckets: LivePipelineBucket[];
};

export type LivePipelines = {
  generated_at: string;
  window_minutes: number;
  bucket_minutes: number;
  series: LivePipelineSeries[];
};

const PIPELINE_WINDOW_MIN = 60;
const PIPELINE_BUCKET_MIN = 5;

function emptyBuckets(now: Date): LivePipelineBucket[] {
  const buckets: LivePipelineBucket[] = [];
  const n = Math.floor(PIPELINE_WINDOW_MIN / PIPELINE_BUCKET_MIN);
  const base =
    Math.floor(now.getTime() / (PIPELINE_BUCKET_MIN * 60_000)) * (PIPELINE_BUCKET_MIN * 60_000);
  for (let i = n - 1; i >= 0; i--) {
    const t = new Date(base - i * PIPELINE_BUCKET_MIN * 60_000);
    const hh = String(t.getUTCHours()).padStart(2, "0");
    const mm = String(t.getUTCMinutes()).padStart(2, "0");
    buckets.push({ t: t.toISOString(), label: `${hh}:${mm}`, runs: 0, errors: 0 });
  }
  return buckets;
}

function fillBuckets(
  buckets: LivePipelineBucket[],
  rows: readonly { at: string | null; failed: boolean }[],
): void {
  if (buckets.length === 0) return;
  const step = PIPELINE_BUCKET_MIN * 60_000;
  const startMs = new Date(buckets[0].t).getTime();
  for (const r of rows) {
    if (!r.at) continue;
    const idx = Math.floor((new Date(r.at).getTime() - startMs) / step);
    if (idx < 0 || idx >= buckets.length) continue;
    buckets[idx].runs += 1;
    if (r.failed) buckets[idx].errors += 1;
  }
}

function summarize(buckets: LivePipelineBucket[]): {
  totalRuns: number;
  totalErrors: number;
  errorRate: number;
  avgPerMin: number;
} {
  const totalRuns = buckets.reduce((s, b) => s + b.runs, 0);
  const totalErrors = buckets.reduce((s, b) => s + b.errors, 0);
  const errorRate = totalRuns ? (totalErrors * 100) / totalRuns : 0;
  const avgPerMin = totalRuns / PIPELINE_WINDOW_MIN;
  return { totalRuns, totalErrors, errorRate, avgPerMin };
}

function pipelineTone(errorRate: number, ready: boolean, totalRuns: number): PulseTone {
  if (!ready) return "warning";
  if (totalRuns === 0) return "unknown";
  return tone(errorRate, 5, 15, true);
}

export const getLivePipelines = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LivePipelines> => {
    const { supabase } = context;
    const now = new Date();
    const sinceMs = now.getTime() - PIPELINE_WINDOW_MIN * 60_000;
    const since = new Date(sinceMs).toISOString();

    const [runs, voiceEvents, avatarEvents] = await Promise.all([
      supabase
        .from("workflow_runs")
        .select("status,started_at")
        .gte("started_at", since)
        .limit(5000),
      supabase
        .from("enterprise_events")
        .select("status,severity,topic,occurred_at")
        .or("topic.ilike.voice.%,topic.ilike.aria.voice%,topic.ilike.tts.%,topic.ilike.stt.%")
        .gte("occurred_at", since)
        .limit(5000),
      supabase
        .from("enterprise_events")
        .select("status,severity,topic,occurred_at")
        .or("topic.ilike.avatar.%,topic.ilike.heygen.%,topic.ilike.aria.avatar%")
        .gte("occurred_at", since)
        .limit(5000),
    ]);

    const runtimeBuckets = emptyBuckets(now);
    fillBuckets(
      runtimeBuckets,
      ((runs.data ?? []) as { status: string; started_at: string | null }[]).map((r) => ({
        at: r.started_at,
        failed: r.status === "failed",
      })),
    );

    const voiceBuckets = emptyBuckets(now);
    fillBuckets(
      voiceBuckets,
      (
        (voiceEvents.data ?? []) as {
          status: string | null;
          severity: string | null;
          occurred_at: string | null;
        }[]
      ).map((r) => ({
        at: r.occurred_at,
        failed: r.status === "failed" || r.severity === "critical" || r.severity === "warn",
      })),
    );

    const avatarBuckets = emptyBuckets(now);
    fillBuckets(
      avatarBuckets,
      (
        (avatarEvents.data ?? []) as {
          status: string | null;
          severity: string | null;
          occurred_at: string | null;
        }[]
      ).map((r) => ({
        at: r.occurred_at,
        failed: r.status === "failed" || r.severity === "critical" || r.severity === "warn",
      })),
    );

    const voiceReady = Boolean(process.env.ELEVENLABS_API_KEY);
    const avatarReady = Boolean(process.env.HEYGEN_API_KEY || process.env.LIVEAVATAR_API_KEY);

    const runtimeSum = summarize(runtimeBuckets);
    const voiceSum = summarize(voiceBuckets);
    const avatarSum = summarize(avatarBuckets);

    return {
      generated_at: now.toISOString(),
      window_minutes: PIPELINE_WINDOW_MIN,
      bucket_minutes: PIPELINE_BUCKET_MIN,
      series: [
        {
          key: "runtime",
          label_ar: "حياة وقت التشغيل",
          label_en: "Runtime Lifeline",
          ...runtimeSum,
          ready: true,
          status: pipelineTone(runtimeSum.errorRate, true, runtimeSum.totalRuns),
          buckets: runtimeBuckets,
        },
        {
          key: "voice",
          label_ar: "خط أنابيب الصوت",
          label_en: "Voice Pipeline",
          ...voiceSum,
          ready: voiceReady,
          status: pipelineTone(voiceSum.errorRate, voiceReady, voiceSum.totalRuns),
          buckets: voiceBuckets,
        },
        {
          key: "avatar",
          label_ar: "دورة حياة الأڤاتار",
          label_en: "Avatar Lifecycle",
          ...avatarSum,
          ready: avatarReady,
          status: pipelineTone(avatarSum.errorRate, avatarReady, avatarSum.totalRuns),
          buckets: avatarBuckets,
        },
      ],
    };
  });

// ---------- Business KPIs ----------

export type BusinessKpi = {
  key: string;
  label_ar: string;
  label_en: string;
  value: string;
  delta?: string;
  tone: "primary" | "emerald" | "amber" | "rose" | "secondary";
};

export type BusinessKpiSet = {
  kpis: BusinessKpi[];
  outcomes: {
    id: string;
    category: string;
    label: string;
    label_en: string | null;
    value: string;
    delta: string | null;
  }[];
  generated_at: string;
};

export const getBusinessKpis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BusinessKpiSet> => {
    const { supabase } = context;
    const sinceDay = new Date(Date.now() - 24 * 3600_000).toISOString();
    const sinceWeek = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();

    const [outcomes, incidents, patrols, runs, tools, agents] = await Promise.all([
      supabase.from("business_outcomes").select("id,category,label,label_en,value,delta").limit(20),
      supabase
        .from("sec_incidents")
        .select("status,severity,response_minutes,created_at")
        .gte("created_at", sinceWeek)
        .limit(5000),
      supabase.from("sec_patrols").select("status,checkpoints_done,checkpoints_total").limit(2000),
      supabase
        .from("workflow_runs")
        .select("status,started_at")
        .gte("started_at", sinceDay)
        .limit(2000),
      supabase
        .from("tool_executions")
        .select("status,created_at")
        .gte("created_at", sinceDay)
        .limit(5000),
      supabase.from("agent_runs").select("status").gte("created_at", sinceWeek).limit(2000),
    ]);

    const incRows = incidents.data ?? [];
    const resolved = incRows.filter((i) => i.status === "resolved" || i.status === "closed").length;
    const resolutionRate = incRows.length ? Math.round((resolved * 100) / incRows.length) : 100;
    const avgResponse = (() => {
      const arr = incRows.map((i) => i.response_minutes ?? 0).filter((n) => n > 0);
      return arr.length ? Math.round(arr.reduce((s, n) => s + n, 0) / arr.length) : 0;
    })();

    const patRows = patrols.data ?? [];
    const patrolCompletion = patRows.length
      ? Math.round(
          (patRows.reduce(
            (s, p) => s + (p.checkpoints_total ? p.checkpoints_done / p.checkpoints_total : 0),
            0,
          ) /
            patRows.length) *
            100,
        )
      : 0;

    const runRows = runs.data ?? [];
    const runOk = runRows.filter(
      (r) => r.status === "succeeded" || r.status === "completed",
    ).length;
    const automation = runRows.length ? Math.round((runOk * 100) / runRows.length) : 0;

    const toolRows = tools.data ?? [];
    const toolOk = toolRows.filter((r) => r.status === "succeeded").length;
    const availability = toolRows.length ? Math.round((toolOk * 100) / toolRows.length) : 100;

    const agentRows = agents.data ?? [];
    const decisionAcc = agentRows.length
      ? Math.round(
          (agentRows.filter((r) => r.status === "succeeded" || r.status === "completed").length *
            100) /
            agentRows.length,
        )
      : 0;

    const kpis: BusinessKpi[] = [
      {
        key: "availability",
        label_ar: "الجاهزية",
        label_en: "Availability",
        value: `${availability}%`,
        tone: "emerald",
      },
      {
        key: "resolution",
        label_ar: "معدل الحل",
        label_en: "Resolution",
        value: `${resolutionRate}%`,
        tone: "primary",
      },
      {
        key: "response",
        label_ar: "زمن الاستجابة",
        label_en: "Response",
        value: `${avgResponse}m`,
        tone: "amber",
      },
      {
        key: "automation",
        label_ar: "الأتمتة",
        label_en: "Automation",
        value: `${automation}%`,
        tone: "secondary",
      },
      {
        key: "adoption",
        label_ar: "التبنّي",
        label_en: "Adoption",
        value: `${patrolCompletion}%`,
        tone: "primary",
      },
      {
        key: "decision",
        label_ar: "دقة القرار",
        label_en: "Decision Accuracy",
        value: `${decisionAcc}%`,
        tone: "emerald",
      },
    ];

    return {
      kpis,
      outcomes: (outcomes.data ?? []) as BusinessKpiSet["outcomes"],
      generated_at: new Date().toISOString(),
    };
  });

// ---------- Decision Center ----------

export type ExecutiveDecision = {
  id: string;
  recommendation: string;
  rationale: string | null;
  recommended_action: string | null;
  next_step: string | null;
  confidence: number | null;
  status: "pending" | "approved" | "executed" | "dismissed" | "failed";
  executed_tool: string | null;
  has_workflow: boolean;
  created_at: string;
};

export const listPendingDecisions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ExecutiveDecision[]> => {
    const { data, error } = await context.supabase
      .from("aria_decisions")
      .select(
        "id,recommendation,rationale,recommended_action,next_step,confidence,status,executed_tool,tool_payload,created_at",
      )
      .in("status", ["pending", "approved"])
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return (data ?? []).map((d) => {
      const p = (d.tool_payload as Record<string, unknown> | null) ?? null;
      return {
        id: d.id,
        recommendation: d.recommendation,
        rationale: d.rationale,
        recommended_action: (d as { recommended_action: string | null }).recommended_action ?? null,
        next_step: (d as { next_step: string | null }).next_step ?? null,
        confidence: d.confidence == null ? null : Number(d.confidence),
        status: d.status as ExecutiveDecision["status"],
        executed_tool: d.executed_tool,
        has_workflow: Boolean(
          p && typeof (p as { workflow_id?: unknown }).workflow_id === "string",
        ),
        created_at: d.created_at,
      };
    });
  });

const DecisionActionSchema = z.object({ id: z.string().uuid() });

export const approveDecision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DecisionActionSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Load the decision (RLS enforces ownership + org).
    const { data: decision, error: loadErr } = await supabase
      .from("aria_decisions")
      .select("id,tool_payload,executed_tool,status,org_id")
      .eq("id", data.id)
      .maybeSingle();
    if (loadErr) throw new Error(loadErr.message);
    if (!decision) throw new Error("Decision not found");
    if (decision.status !== "pending" && decision.status !== "approved") {
      throw new Error(`Decision already ${decision.status}`);
    }

    const payload = (decision.tool_payload as Record<string, unknown> | null) ?? {};
    const workflowId = typeof payload.workflow_id === "string" ? payload.workflow_id : null;
    const workflowInput = (payload.payload as Record<string, unknown> | undefined) ?? {};

    // Mark approved before triggering — audit trail sees intent even if the run
    // fails downstream, and the executor picks up the correct state.
    const { error: updErr } = await supabase
      .from("aria_decisions")
      .update({ status: "approved", updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (updErr) throw new Error(updErr.message);

    let runId: string | null = null;
    let runStatus: string | null = null;

    if (workflowId) {
      try {
        const run = await triggerWorkflow(supabase, {
          workflowId,
          triggeredBy: userId,
          triggerEvent: "executive_decision",
          payload: { ...workflowInput, decision_id: data.id },
          idempotencyKey: `decision:${data.id}`,
        });
        runId = run.runId;
        runStatus = run.status;
        await supabase
          .from("aria_decisions")
          .update({
            status: run.status === "failed" ? "failed" : "executed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.id);
      } catch (err) {
        await supabase
          .from("aria_decisions")
          .update({ status: "failed", updated_at: new Date().toISOString() })
          .eq("id", data.id);
        throw err instanceof Error ? err : new Error(String(err));
      }
    } else {
      // No workflow bound — emit an event so the async fabric can pick it up.
      await supabase.from("enterprise_events").insert({
        topic: "exec.decision.approved",
        source: "executive_presentation",
        severity: "info",
        status: "pending",
        actor_id: userId,
        org_id: decision.org_id,
        subject_type: "aria_decision",
        subject_id: decision.id,
        payload_json: JSON.parse(
          JSON.stringify({
            decision_id: decision.id,
            executed_tool: decision.executed_tool,
            payload,
          }),
        ),
      });
    }

    return { ok: true, runId, runStatus };
  });

export const dismissDecision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DecisionActionSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("aria_decisions")
      .update({ status: "dismissed", updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Executive Timeline ----------

export type TimelineEntry = {
  id: string;
  when: string;
  kind: "event" | "decision" | "run";
  severity: "info" | "warn" | "critical";
  title: string;
  subtitle: string | null;
};

export const getExecutiveTimeline = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TimelineEntry[]> => {
    const { supabase } = context;
    const [events, decisions, runs] = await Promise.all([
      supabase
        .from("enterprise_events")
        .select("id,topic,severity,occurred_at,subject_type,payload_json")
        .order("occurred_at", { ascending: false })
        .limit(20),
      supabase
        .from("aria_decisions")
        .select("id,recommendation,status,confidence,created_at")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("workflow_runs")
        .select("id,workflow_id,status,started_at,error")
        .order("started_at", { ascending: false })
        .limit(20),
    ]);

    const evEntries: TimelineEntry[] = (events.data ?? []).map((e) => ({
      id: `evt:${e.id}`,
      when: e.occurred_at as string,
      kind: "event",
      severity:
        e.severity === "critical"
          ? "critical"
          : e.severity === "warn" || e.severity === "warning"
            ? "warn"
            : "info",
      title: e.topic,
      subtitle: e.subject_type ?? null,
    }));
    const dcEntries: TimelineEntry[] = (decisions.data ?? []).map((d) => ({
      id: `dec:${d.id}`,
      when: d.created_at as string,
      kind: "decision",
      severity: d.status === "failed" ? "critical" : d.status === "pending" ? "warn" : "info",
      title: d.recommendation.slice(0, 96),
      subtitle: `status: ${d.status} · confidence ${d.confidence == null ? "—" : Math.round(Number(d.confidence) * 100) + "%"}`,
    }));
    const runEntries: TimelineEntry[] = (runs.data ?? []).map((r) => ({
      id: `run:${r.id}`,
      when: (r.started_at as string) ?? new Date().toISOString(),
      kind: "run",
      severity: r.status === "failed" ? "critical" : r.status === "running" ? "warn" : "info",
      title: `Workflow ${r.workflow_id?.slice(0, 8) ?? "run"}`,
      subtitle: r.error ? String(r.error).slice(0, 96) : `status: ${r.status}`,
    }));

    return [...evEntries, ...dcEntries, ...runEntries]
      .sort((a, b) => (a.when < b.when ? 1 : -1))
      .slice(0, 40);
  });
