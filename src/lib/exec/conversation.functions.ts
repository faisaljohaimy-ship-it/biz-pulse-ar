/**
 * Executive Agent Conversation — Phase 6.
 *
 * Reads the LIVE record of work the AI organization has done from
 * `agent_runs` + `agent_definitions`, projects each completed run as a
 * single bilingual "statement" by that specialist agent, then asks ARIA
 * (gpt-5 via Lovable AI Gateway) to synthesize one executive
 * recommendation across all statements. The synthesis is persisted to
 * `aria_reports` (kind=`conversation`) so follow-up loads are instant
 * and the executive memory survives across sessions.
 *
 * No schema changes. No mocks. Every line traces back to a real
 * `agent_runs.id` you can inspect under /exec.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConversationTurn = {
  /** agent_runs.id — forensic anchor */
  run_id: string;
  /** "aria" or agent_definitions.id */
  speaker_id: string;
  speaker_name: string;
  /** Bilingual short label of what this specialist owns. */
  role_ar: string;
  role_en: string;
  /** UI status — drives icon/animation. */
  state: "speaking" | "completed" | "thinking" | "escalated" | "warning" | "error";
  /** Bilingual paraphrase, executive language, no SQL / table names. */
  statement_ar: string;
  statement_en: string;
  /** 0..1 confidence (success ratio heuristic). */
  confidence: number;
  occurred_at: string;
};

export type ConversationSynthesis = {
  situation_ar: string;
  situation_en: string;
  impact_ar: string;
  impact_en: string;
  priority: "low" | "medium" | "high" | "critical";
  recommendation_ar: string;
  recommendation_en: string;
  next_actions_ar: string[];
  next_actions_en: string[];
  confidence: number;
  /** Optional rendered note when synthesis fell back to deterministic. */
  source: "gpt-5" | "deterministic";
};

export type AgentConversation = {
  generated_at: string;
  /** Conversation transcript — newest-first. */
  turns: ConversationTurn[];
  /** ARIA's executive synthesis across the transcript. */
  synthesis: ConversationSynthesis | null;
  /** Whether the synthesis was loaded from cache. */
  cached: boolean;
};

// ---------------------------------------------------------------------------
// Helpers — strip technical language so executives never see SQL/schemas
// ---------------------------------------------------------------------------

const TECH_PATTERNS: RegExp[] = [
  /\bpublic\.[a-z_]+/gi,
  /\bsec_[a-z_]+/gi,
  /\bsql\.[a-z_.]+/gi,
  /\bm365\.[a-z_.]+/gi,
  /\bid=[0-9a-f-]{8,}/gi,
  /site_id=[0-9a-f-]{8,}/gi,
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
  /\bjsonb?\b/gi,
  /```[\s\S]*?```/g,
];

function sanitizeForExecutive(input: string | null | undefined): string {
  if (!input) return "";
  let out = input;
  for (const re of TECH_PATTERNS) out = out.replace(re, "");
  return out
    .replace(/[`*_>#]+/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:!؟])/g, "$1")
    .trim();
}

function firstLine(s: string, max = 240): string {
  const cleaned = sanitizeForExecutive(s);
  const line = cleaned.split(/\n+/).find((l) => l.trim().length > 12) ?? cleaned;
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
}

const ROLES: Record<string, { ar: string; en: string }> = {
  incident_commander: { ar: "قائد الحوادث", en: "Incident Commander" },
  risk_intelligence: { ar: "استخبارات المخاطر", en: "Risk Intelligence" },
  compliance_auditor: { ar: "مدقق الامتثال", en: "Compliance Auditor" },
  patrol_intelligence: { ar: "استخبارات الدوريات", en: "Patrol Intelligence" },
  visitor_intelligence: { ar: "استخبارات الزوار", en: "Visitor Intelligence" },
  permit_intelligence: { ar: "استخبارات التصاريح", en: "Permit Intelligence" },
  asset_intelligence: { ar: "استخبارات الأصول", en: "Asset Intelligence" },
  cctv_intelligence: { ar: "استخبارات المراقبة", en: "CCTV Intelligence" },
  emergency_commander: { ar: "قائد الطوارئ", en: "Emergency Commander" },
  knowledge_agent: { ar: "استخبارات المعرفة", en: "Knowledge Intelligence" },
  executive_briefer: { ar: "المراسل التنفيذي", en: "Executive Reporter" },
  digital_twin: { ar: "التوأم الرقمي", en: "Digital Twin" },
  operations_coordinator: { ar: "منسّق العمليات", en: "Operations Coordinator" },
};

function lookupRole(agentId: string, fallbackName: string): { ar: string; en: string } {
  return ROLES[agentId] ?? { ar: fallbackName, en: fallbackName };
}

function classifyState(summary: string): ConversationTurn["state"] {
  const s = summary.toLowerCase();
  if (/escalat|تصعيد|critical|حرج|p0|p1/.test(s)) return "escalated";
  if (/warn|تحذير|risk|خطر|violation|مخالف/.test(s)) return "warning";
  return "completed";
}

// ---------------------------------------------------------------------------
// Cache key — one synthesis per "conversation window".
// We use the latest finished_at of the included runs as the cache anchor so
// the synthesis is invalidated automatically when new agent work lands.
// ---------------------------------------------------------------------------

function cacheTitle(anchor: string): string {
  return `agent-conversation:${anchor}`;
}

// ---------------------------------------------------------------------------
// Server function — get live conversation + ARIA synthesis
// ---------------------------------------------------------------------------

export const getAgentConversation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AgentConversation> => {
    const sb = context.supabase;
    const generated_at = new Date().toISOString();

    // Pull the latest meaningful run per agent (within 14 days).
    const { data: runRows } = await sb
      .from("agent_runs")
      .select("id, agent_id, status, summary, started_at, finished_at")
      .gte("started_at", new Date(Date.now() - 14 * 86_400_000).toISOString())
      .in("status", ["succeeded", "completed", "failed", "running"])
      .order("started_at", { ascending: false })
      .limit(60);

    const { data: defRows } = await sb.from("agent_definitions").select("id, name, enabled");

    const defs = new Map<string, { name: string; enabled: boolean }>();
    for (const d of (defRows ?? []) as Array<{ id: string; name: string; enabled: boolean }>) {
      defs.set(d.id, { name: d.name, enabled: d.enabled });
    }

    const seen = new Set<string>();
    const turns: ConversationTurn[] = [];
    for (const r of (runRows ?? []) as Array<{
      id: string;
      agent_id: string;
      status: string;
      summary: string | null;
      started_at: string;
      finished_at: string | null;
    }>) {
      if (seen.has(r.agent_id)) continue;
      seen.add(r.agent_id);
      const def = defs.get(r.agent_id);
      const role = lookupRole(r.agent_id, def?.name ?? r.agent_id);
      const cleaned = firstLine(r.summary ?? "");
      if (!cleaned && r.status !== "running") continue;

      const state: ConversationTurn["state"] =
        r.status === "failed"
          ? "error"
          : r.status === "running"
            ? "thinking"
            : classifyState(cleaned);

      turns.push({
        run_id: r.id,
        speaker_id: r.agent_id,
        speaker_name: def?.name ?? r.agent_id,
        role_ar: role.ar,
        role_en: role.en,
        state,
        statement_ar: cleaned || (state === "thinking" ? "يعمل على المهمة الحالية…" : ""),
        statement_en: cleaned || (state === "thinking" ? "Working on the current task…" : ""),
        confidence:
          r.status === "succeeded" || r.status === "completed"
            ? 0.9
            : r.status === "failed"
              ? 0.4
              : 0.7,
        occurred_at: r.finished_at ?? r.started_at,
      });

      if (turns.length >= 8) break;
    }

    if (turns.length === 0) {
      return { generated_at, turns, synthesis: null, cached: false };
    }

    const anchor =
      turns
        .map((t) => t.occurred_at)
        .sort()
        .slice(-1)[0] ?? generated_at;

    // Try cache first — `aria_reports.kind = 'conversation'`, title carries the anchor.
    const cacheKey = cacheTitle(anchor);
    const { data: cachedRow } = await sb
      .from("aria_reports")
      .select("payload, confidence")
      .eq("kind", "conversation")
      .eq("title", cacheKey)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cachedRow?.payload) {
      const p = cachedRow.payload as Partial<ConversationSynthesis> & Record<string, unknown>;
      return {
        generated_at,
        turns,
        cached: true,
        synthesis: {
          situation_ar: String(p.situation_ar ?? ""),
          situation_en: String(p.situation_en ?? ""),
          impact_ar: String(p.impact_ar ?? ""),
          impact_en: String(p.impact_en ?? ""),
          priority: (p.priority as ConversationSynthesis["priority"]) ?? "medium",
          recommendation_ar: String(p.recommendation_ar ?? ""),
          recommendation_en: String(p.recommendation_en ?? ""),
          next_actions_ar: Array.isArray(p.next_actions_ar) ? (p.next_actions_ar as string[]) : [],
          next_actions_en: Array.isArray(p.next_actions_en) ? (p.next_actions_en as string[]) : [],
          confidence: Number(cachedRow.confidence ?? p.confidence ?? 0.8),
          source: "gpt-5",
        },
      };
    }

    // Synthesize via gpt-5.
    let synthesis: ConversationSynthesis;
    try {
      const key = process.env.LOVABLE_API_KEY;
      if (!key) throw new Error("Missing LOVABLE_API_KEY");

      const findings = turns
        .map(
          (t) =>
            `${t.role_en} (${t.speaker_name}, state=${t.state}, conf=${t.confidence.toFixed(2)}): ${t.statement_en || t.statement_ar}`,
        )
        .join("\n");

      const prompt =
        `You are ARIA, Chief Executive Intelligence Officer for an Industrial Security operation in Saudi Arabia (Western Region). ` +
        `Read the LIVE statements from your specialist agents below and synthesize ONE executive recommendation. ` +
        `Speak as an executive to executives — no SQL, no table names, no markdown, no schemas, no UUIDs. ` +
        `Return STRICT JSON with these keys exactly:\n` +
        `  situation_ar, situation_en (1 sentence each)\n` +
        `  impact_ar, impact_en (1 sentence each — operational and business impact)\n` +
        `  priority: one of "low" | "medium" | "high" | "critical"\n` +
        `  recommendation_ar, recommendation_en (1-2 sentences each)\n` +
        `  next_actions_ar, next_actions_en (array of 2-4 short imperative actions)\n` +
        `  confidence: number 0..1\n\n` +
        `Agent statements (most-recent first):\n${findings}`;

      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "openai/gpt-5",
          messages: [
            { role: "system", content: "Reply with ONLY valid JSON. No prose, no code fences." },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (!res.ok) throw new Error(`gateway ${res.status}`);
      const json = await res.json();
      const text: string = json?.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(text);

      const priority = ["low", "medium", "high", "critical"].includes(String(parsed.priority))
        ? (parsed.priority as ConversationSynthesis["priority"])
        : "medium";

      synthesis = {
        situation_ar: String(parsed.situation_ar ?? ""),
        situation_en: String(parsed.situation_en ?? ""),
        impact_ar: String(parsed.impact_ar ?? ""),
        impact_en: String(parsed.impact_en ?? ""),
        priority,
        recommendation_ar: String(parsed.recommendation_ar ?? ""),
        recommendation_en: String(parsed.recommendation_en ?? ""),
        next_actions_ar: Array.isArray(parsed.next_actions_ar)
          ? parsed.next_actions_ar.slice(0, 4).map((s: unknown) => String(s))
          : [],
        next_actions_en: Array.isArray(parsed.next_actions_en)
          ? parsed.next_actions_en.slice(0, 4).map((s: unknown) => String(s))
          : [],
        confidence: Math.max(0, Math.min(1, Number(parsed.confidence ?? 0.82))),
        source: "gpt-5",
      };

      // Persist as ARIA's short-term executive memory.
      try {
        const { data: orgRow } = await sb
          .from("org_members")
          .select("org_id")
          .eq("user_id", context.userId)
          .limit(1)
          .maybeSingle();
        const org_id = orgRow?.org_id ?? null;
        if (org_id) {
          await sb.from("aria_reports").insert({
            org_id,
            user_id: context.userId,
            kind: "conversation",
            title: cacheKey,
            payload: synthesis,
            markdown: `ARIA · ${synthesis.priority.toUpperCase()}\n\n${synthesis.recommendation_en}`,
            confidence: synthesis.confidence,
            period_start: turns[turns.length - 1]?.occurred_at ?? generated_at,
            period_end: generated_at,
          });
        }
      } catch (err) {
        console.warn("[conversation] persistence failed (non-fatal):", err);
      }
    } catch (err) {
      console.warn("[conversation] gpt-5 unavailable, using deterministic synthesis:", err);
      const escalated = turns.some((t) => t.state === "escalated");
      const warning = turns.some((t) => t.state === "warning");
      const priority: ConversationSynthesis["priority"] = escalated
        ? "critical"
        : warning
          ? "high"
          : "medium";
      synthesis = {
        situation_ar: `سجّل الفريق التنفيذي ${turns.length} تحديثًا تشغيليًا حديثًا.`,
        situation_en: `Executive team logged ${turns.length} recent operational updates.`,
        impact_ar: escalated
          ? "هناك بنود تتطلب تصعيدًا فوريًا."
          : warning
            ? "هناك بنود تتطلب مراجعة."
            : "الوضع التشغيلي مستقر.",
        impact_en: escalated
          ? "Items require immediate escalation."
          : warning
            ? "Items require review."
            : "Operational posture remains stable.",
        priority,
        recommendation_ar: escalated
          ? "تنسيق فوري بين قيادة الحوادث وقيادة الطوارئ خلال الـ60 دقيقة القادمة."
          : "الإبقاء على الاستعداد التشغيلي مع مراجعة دورية كل ساعة.",
        recommendation_en: escalated
          ? "Coordinate Incident Command with Emergency Command within the next 60 minutes."
          : "Maintain operational readiness with hourly review.",
        next_actions_ar: escalated
          ? ["تأكيد التصعيد", "تنبيه فريق الطوارئ", "تحديث الموجز التنفيذي"]
          : ["متابعة المؤشرات", "مراجعة الدوريات", "تجديد التقرير خلال 60 دقيقة"],
        next_actions_en: escalated
          ? ["Confirm escalation", "Alert emergency team", "Update executive brief"]
          : ["Track indicators", "Review patrols", "Refresh briefing in 60 minutes"],
        confidence: 0.7,
        source: "deterministic",
      };
    }

    return { generated_at, turns, synthesis, cached: false };
  });
