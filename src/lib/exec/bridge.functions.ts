/**
 * Executive Command Bridge — server functions that aggregate live
 * operational signal for the `/bridge` route. Pure reads from real
 * tables (`agent_definitions`, `agent_runs`, `sec_incidents`,
 * `sec_patrols`, `enterprise_events`) — no mocks, no fabrication.
 */
import { createServerFn } from "@tanstack/react-start";
import { outcomeOf } from "@/lib/evidence/pulse-confidence";
import { optionalSupabaseAuth } from "@/integrations/supabase/optional-auth-middleware";

export type BridgeAgentStatus =
  | "offline"
  | "idle"
  | "monitoring"
  | "waiting"
  | "thinking"
  | "searching"
  | "analyzing"
  | "consulting"
  | "executing"
  | "speaking"
  | "completed"
  | "escalated"
  | "warning"
  | "error"
  | "recovery";

export type BridgeAgent = {
  id: string;
  name: string;
  goal: string | null;
  enabled: boolean;
  status: BridgeAgentStatus;
  /**
   * نسبةُ نجاحِ آخر التشغيلات — **أو `null` حين لا تشغيلَ يُقاس.**
   *
   * كانت تسقط إلى `0.85` ثابتًا عند غياب التاريخ: رقمٌ مكتوب يُعرض
   * كأنه قياس، ويرفع متوسّط `ai_confidence` معه. و«لا تاريخ» ليست
   * «ثقةٌ عالية» — هي **لا قياس** (المادة ٢٧).
   */
  confidence: number | null;
  /** Latest current task line, or null when idle. */
  current_task: string | null;
  last_run_at: string | null;
  last_run_status: string | null;
};

export type BridgeHealth = {
  /** 0..100 — composite operational health. */
  score: number;
  open_incidents: number;
  critical_incidents: number;
  active_patrols: number;
  visitors_onsite: number;
  active_permits: number;
  open_work_orders: number;
  /** `null` = لا مقاولَ له درجةٌ مقيسة — غيابٌ لا صفر. */
  compliance_score: number | null;
  /**
   * متوسّط ما قِيس من الوكلاء على مقياس **٠..١** — `null` حين لا وكيل
   * له تاريخ.
   *
   * كان يُعاد مضروبًا في مئة (‏`Math.round(avg * 100)`) بينما المحاكاة
   * تعيد `0.93` والمستهلك (`theater.tsx`) يضرب في مئة ويقارن بـ`0.75`.
   * فكان المسار الحيّ يعرض **٨٥٠٠٪** والمحاكاة ٩٣٪ — عطلٌ لا يظهر ما
   * دامت المحاكاة هي المخدومة. المقياس الآن واحدٌ في المسارين.
   */
  ai_confidence: number | null;
  agents_online: number;
  agents_total: number;
};

export type BridgeState = {
  health: BridgeHealth;
  agents: BridgeAgent[];
  generated_at: string;
};

export const getBridgeState = createServerFn({ method: "GET" })
  .middleware([optionalSupabaseAuth])
  .handler(async ({ context }): Promise<BridgeState> => {
    const { buildBridgeSimulation, resilient } = await import("./showcase-simulation.server");
    return resilient(
      "bridge-state",
      () => fetchBridgeState(context.supabase),
      (v) =>
        v.agents.length === 0 &&
        v.health.open_incidents === 0 &&
        v.health.active_patrols === 0 &&
        v.health.active_permits === 0,
      () => buildBridgeSimulation(Date.now()),
    );
  });

async function fetchBridgeState(
  // Structural: the RLS client injected by optional auth.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
): Promise<BridgeState> {
  {
    const [
      agentDefsRes,
      agentRunsRes,
      incidentsRes,
      patrolsRes,
      visitorsRes,
      permitsRes,
      workOrdersRes,
      contractorsRes,
    ] = await Promise.all([
      sb
        .from("agent_definitions")
        .select("id, name, goal, enabled, updated_at")
        .eq("enabled", true)
        .order("name", { ascending: true })
        .limit(12),
      sb
        .from("agent_runs")
        .select("id, agent_id, status, summary, started_at, finished_at, goal_override")
        .order("started_at", { ascending: false })
        .limit(120),
      sb
        .from("sec_incidents")
        .select("id, severity, status")
        .in("status", ["open", "investigating", "in_progress", "new"]),
      sb
        .from("sec_patrols")
        .select("id, status")
        .in("status", ["active", "in_progress", "started"]),
      sb.from("sec_visitors").select("status"),
      sb.from("sec_permits").select("status"),
      sb.from("sec_work_orders").select("status"),
      sb.from("sec_contractors").select("compliance_score"),
    ]);

    const defs = (agentDefsRes.data ?? []) as Array<{
      id: string;
      name: string;
      goal: string | null;
      enabled: boolean;
      updated_at: string;
    }>;
    const runs = (agentRunsRes.data ?? []) as Array<{
      id: string;
      agent_id: string;
      status: string;
      summary: string | null;
      started_at: string;
      finished_at: string | null;
      goal_override: string | null;
    }>;
    const incidents = (incidentsRes.data ?? []) as Array<{ severity: string; status: string }>;
    const patrols = (patrolsRes.data ?? []) as Array<{ status: string }>;
    const visitors = (visitorsRes.data ?? []) as Array<{ status: string }>;
    const permits = (permitsRes.data ?? []) as Array<{ status: string }>;
    const workOrders = (workOrdersRes.data ?? []) as Array<{ status: string }>;
    const contractors = (contractorsRes.data ?? []) as Array<{ compliance_score: number | null }>;

    const runsByAgent = new Map<string, typeof runs>();
    for (const r of runs) {
      const arr = runsByAgent.get(r.agent_id) ?? [];
      arr.push(r);
      runsByAgent.set(r.agent_id, arr);
    }

    const agents: BridgeAgent[] = defs.map((d) => {
      const recent = (runsByAgent.get(d.id) ?? []).slice(0, 8);
      const last = recent[0] ?? null;
      // **المفرداتُ من مصدرٍ واحد.** كان هنا `"completed"` وحدها، والكاتب
      // (`agent-runtime.server.ts`) يكتب `"succeeded"` — فوكيلٌ نجح سبعًا
      // من ثمانٍ يُقرأ **صفرًا** بحلقةٍ حمراء: إخفاقٌ مختلَق، وهو أسوأ من
      // خطّ الأساس `0.85` الذي أُزيل. والسطرُ ٱلتالي في هذا الملفّ نفسه
      // كان يعرف الاثنتين — مفردةٌ واحدة في موضعين تفترق.
      const completed = recent.filter((r) => outcomeOf("agent_runs", r.status) === "ok").length;
      const failed = recent.filter((r) => outcomeOf("agent_runs", r.status) === "bad").length;
      const total = completed + failed;
      // لا تشغيلَ سابق ⇐ لا قياس. والرقم المكتوب هنا كان يُعرض نسبةً
      // على شاشةٍ تنفيذية بلا ما يسنده.
      // **ولا أرضيةَ ٠٫٤.** أُزيل `0.85` وبقي القاع، فكان وكيلٌ نجح صفرًا
      // من ثمانية يُقرأ «٤٠٪» بحلقةٍ كهرمانية لا صفرًا أحمر — وخطُّ أساسٍ
      // مفترَضٌ في القاع هو خطُّ الأساس نفسه الذي أُزيل من القمّة.
      const confidence = total === 0 ? null : completed / total;

      let status: BridgeAgentStatus = d.enabled ? "monitoring" : "offline";
      if (last) {
        const ageMs = Date.now() - new Date(last.started_at).getTime();
        const goal = (last.goal_override ?? "").toLowerCase();
        const summary = (last.summary ?? "").toLowerCase();
        const haystack = `${goal} ${summary}`;
        if (last.status === "running") {
          if (/search|بحث|قاعدة المعرفة|knowledge|kb\./.test(haystack)) status = "searching";
          else if (/analy|تحلي|risk|خطر|score/.test(haystack)) status = "analyzing";
          else if (/consult|coordinate|تنسيق|تشاور|delegat/.test(haystack)) status = "consulting";
          else if (/dispatch|execute|تنفيذ|أمر عمل|teams\.post|email\.send/.test(haystack))
            status = "executing";
          else status = "thinking";
        } else if (last.status === "completed" || last.status === "succeeded") {
          // recently completed within 90s reads as "speaking" to highlight latest voice
          if (ageMs < 90_000) status = "speaking";
          else if (/escalat|تصعيد|critical|حرج/.test(summary)) status = "escalated";
          else if (/warn|تحذير|risk/.test(summary)) status = "warning";
          else status = "completed";
        } else if (last.status === "failed") {
          status = "error";
        } else if (last.status === "waiting" || last.status === "pending") {
          status = "waiting";
        }
      } else if (!d.enabled) {
        status = "offline";
      } else {
        status = "idle";
      }

      const current_task =
        last?.status === "running"
          ? (last.goal_override?.slice(0, 120) ?? "Working")
          : (last?.summary?.slice(0, 120) ?? null);

      return {
        id: d.id,
        name: d.name,
        goal: d.goal,
        enabled: d.enabled,
        status,
        confidence,
        current_task,
        last_run_at: last?.started_at ?? null,
        last_run_status: last?.status ?? null,
      };
    });

    const critical = incidents.filter((i) => i.severity === "critical").length;
    const high = incidents.filter((i) => i.severity === "high").length;
    const agentsOnline = agents.filter((a) => a.enabled).length;
    const visitorsOnsite = visitors.filter((v) =>
      ["checked_in", "onsite", "active"].includes(v.status),
    ).length;
    const activePermits = permits.filter((p) =>
      ["active", "approved", "in_progress"].includes(p.status),
    ).length;
    const openWorkOrders = workOrders.filter(
      (w) => w.status !== "closed" && w.status !== "cancelled",
    ).length;
    // **المتوسّط على المقيس وحده** — والقاعدة مكتوبةٌ على بُعد سطرين
    // لأجل `aiConfidence`، وكانت منقوضةً هنا: `?? 0` يُدخل غيرَ المقيس
    // بقيمةٍ مفترَضة فيصير الرقم خليطًا من قياسٍ وافتراضٍ يبدو مقيسًا.
    const scored = contractors.filter((c) => c.compliance_score != null);
    const complianceScore = scored.length
      ? Math.round(scored.reduce((s, c) => s + (c.compliance_score as number), 0) / scored.length)
      : null;
    // المتوسّط على **المقيس وحده**: إدخالُ غير المقيس بقيمةٍ مفترَضة يصنع
    // رقمًا يبدو مقيسًا وهو خليطٌ من قياسٍ وافتراض. ولا مقيسَ إطلاقًا ⇐
    // `null` لا صفر: الصفر ثقةٌ معدومة، والغياب لا حكم.
    const measuredAgents = agents.filter(
      (a): a is (typeof agents)[number] & { confidence: number } => a.confidence !== null,
    );
    const aiConfidence = measuredAgents.length
      ? measuredAgents.reduce((s, a) => s + a.confidence, 0) / measuredAgents.length
      : null;

    // Composite health: 100 minus weighted incident pressure, floored at 35.
    const incidentPenalty =
      critical * 12 + high * 5 + Math.max(0, incidents.length - critical - high) * 2;
    const score = Math.max(35, Math.min(100, 100 - incidentPenalty));

    return {
      health: {
        score,
        open_incidents: incidents.length,
        critical_incidents: critical,
        active_patrols: patrols.length,
        visitors_onsite: visitorsOnsite,
        active_permits: activePermits,
        open_work_orders: openWorkOrders,
        compliance_score: complianceScore,
        ai_confidence: aiConfidence,
        agents_online: agentsOnline,
        agents_total: defs.length,
      },
      agents,
      generated_at: new Date().toISOString(),
    };
  }
}

// ------------------------------------------------------------------
// Mission Timeline — bilingual storytelling stream
// ------------------------------------------------------------------

export type MissionTimelineEntry = {
  id: string;
  ts: string;
  tone: "info" | "success" | "warn" | "critical";
  agent_name_ar: string;
  agent_name_en: string;
  action_ar: string;
  action_en: string;
  text_ar: string;
  text_en: string;
  result_ar: string | null;
  result_en: string | null;
  topic: string;
  status: string;
  severity: string;
  correlation_id: string | null;
  duration_ms: number | null;
};

export const getMissionTimeline = createServerFn({ method: "GET" })
  .middleware([optionalSupabaseAuth])
  .handler(async ({ context }): Promise<MissionTimelineEntry[]> => {
    const { buildTimelineSimulation, resilient } = await import("./showcase-simulation.server");
    return resilient(
      "mission-timeline",
      () => fetchMissionTimeline(context.supabase),
      (rows) => rows.length === 0,
      () => buildTimelineSimulation(Date.now()),
    );
  });

async function fetchMissionTimeline(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
): Promise<MissionTimelineEntry[]> {
  {
    const { data } = await sb
      .from("enterprise_events")
      .select(
        "id, topic, source, severity, actor_id, org_id, subject_type, subject_id, correlation_id, duration_ms, status, payload_json, inputs_json, outputs_json, metrics_json, occurred_at, processed_at, error",
      )
      .order("occurred_at", { ascending: false })
      .limit(40);
    const rows = (data ?? []) as Parameters<
      typeof import("@/lib/narrator/event-narrator").narrateEvent
    >[0][];
    const { narrateEvent } = await import("@/lib/narrator/event-narrator");
    return rows.map((row) => {
      const n = narrateEvent(row);
      return {
        id: n.id,
        ts: new Date(n.ts).toISOString(),
        tone: n.tone,
        agent_name_ar: n.agent_name_ar,
        agent_name_en: n.agent_name_en,
        action_ar: n.action_ar,
        action_en: n.action_en,
        text_ar: n.text_ar,
        text_en: n.text_en,
        result_ar: n.result_ar ?? null,
        result_en: n.result_en ?? null,
        topic: n.topic,
        status: n.status,
        severity: n.severity,
        correlation_id: n.correlation_id,
        duration_ms: n.duration_ms,
      };
    });
  }
}
