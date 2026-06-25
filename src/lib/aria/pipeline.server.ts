// ARIA Executive Intelligence — deterministic pipeline orchestrator.
// Each stage is a pure async function; the orchestrator composes them and
// returns a full trace alongside the final answer.

import type { SupabaseClient } from "@supabase/supabase-js";
import { generateText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import {
  IntentSchema,
  type Intent,
  type RiskItem,
  type DecisionItem,
  type StageTrace,
  type Citation,
  type ReportKind,
} from "./types";
import { fetchExecKpiSources, computeExecKpis, type ExecKpis } from "@/lib/sec.functions";
import { buildAriaContext } from "@/lib/aria-context.server";
import { embedText, toPgVector } from "./embeddings.server";

const REASONING_MODEL = "openai/gpt-5";
const FAST_MODEL = "google/gemini-3-flash-preview";

function provider() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY missing — ARIA gateway unavailable.");
  return createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: {
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });
}

async function timed<T>(stage: string, fn: () => Promise<T>): Promise<{ value: T; ms: number }> {
  const t0 = Date.now();
  try {
    const value = await fn();
    return { value, ms: Date.now() - t0 };
  } catch (e) {
    console.error(`[aria/pipeline] stage ${stage} failed`, e);
    throw e;
  }
}

// ============ Stage 1: Intent ============
export async function detectIntent(message: string): Promise<Intent> {
  const fallback: Intent = {
    intent: "conversational",
    language: /[\u0600-\u06FF]/.test(message) ? "ar" : "en",
    entities: [],
    requires_report: false,
    requires_tools: false,
    confidence: 0.4,
  };
  try {
    const p = provider();
    const { text } = await generateText({
      model: p(FAST_MODEL),
      maxOutputTokens: 300,
      system:
        "You classify executive industrial-security queries. Reply with ONLY a JSON object matching: {intent: one of kpi_query|risk_query|incident_lookup|report_request|tool_action|conversational, language: ar|en, entities: string[], requires_report: boolean, report_kind?: executive|daily|weekly|monthly|incident|risk|operations|board, requires_tools: boolean, confidence: 0..1}. No prose.",
      prompt: message,
    });
    const cleaned = text.replace(/```json\s*|\s*```/g, "").trim();
    const parsed = IntentSchema.safeParse(JSON.parse(cleaned));
    return parsed.success ? parsed.data : fallback;
  } catch {
    return fallback;
  }
}

// ============ Stage 2: Memory ============
export async function recallMemory(
  supabase: SupabaseClient,
  userId: string,
  message: string,
): Promise<{ memories: { key: string; content: string; similarity: number }[]; embedding: number[] | null }> {
  const embedding = await embedText(message);
  if (!embedding) return { memories: [], embedding: null };
  const { data, error } = await supabase.rpc("aria_match_memory", {
    _user_id: userId,
    _query: toPgVector(embedding),
    _scope: null,
    _limit: 6,
  });
  if (error) {
    console.warn("[aria/memory] rpc error", error.message);
    return { memories: [], embedding };
  }
  const rows = (data ?? []) as { key: string; content: string; similarity: number }[];
  // Refresh last_used_at for surfaced memories (best-effort).
  if (rows.length) {
    const keys = rows.map((r) => r.key);
    await supabase
      .from("aria_memory")
      .update({ last_used_at: new Date().toISOString() })
      .eq("user_id", userId)
      .in("key", keys);
  }
  return {
    memories: rows
      .filter((r) => r.similarity > 0.5)
      .map((r) => ({ key: r.key, content: r.content, similarity: r.similarity })),
    embedding,
  };
}

export async function storeMemory(
  supabase: SupabaseClient,
  userId: string,
  scope: string,
  key: string,
  content: string,
  importance = 0.5,
): Promise<void> {
  const embedding = await embedText(content);
  const row = {
    user_id: userId,
    scope,
    key: key.slice(0, 120),
    content: content.slice(0, 4000),
    importance,
    embedding: embedding ? toPgVector(embedding) : null,
    last_used_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from("aria_memory")
    .upsert(row, { onConflict: "user_id,scope,key" });
  if (error) console.warn("[aria/memory] upsert failed", error.message);
}

// ============ Stage 3: RAG (Knowledge) ============
export async function retrieveKnowledge(
  supabase: SupabaseClient,
  embedding: number[] | null,
): Promise<{ chunks: { title: string; source: string; content: string; similarity: number; id: string }[]; citations: Citation[] }> {
  if (!embedding) return { chunks: [], citations: [] };
  const { data, error } = await supabase.rpc("aria_match_knowledge", {
    _query: toPgVector(embedding),
    _tags: null,
    _limit: 5,
  });
  if (error) {
    console.warn("[aria/rag] rpc error", error.message);
    return { chunks: [], citations: [] };
  }
  const rows = (data ?? []) as { id: string; title: string; source: string; content: string; similarity: number }[];
  const chunks = rows.filter((r) => r.similarity > 0.4);
  return {
    chunks,
    citations: chunks.map((c) => ({ id: c.id, source: c.source, title: c.title, similarity: c.similarity })),
  };
}

// ============ Stage 4: Enterprise context ============
export async function loadEnterpriseContext(supabase: SupabaseClient): Promise<string> {
  return buildAriaContext(supabase);
}

// ============ Stage 5: KPI ============
export async function runKpiEngine(supabase: SupabaseClient): Promise<{
  kpis: ExecKpis;
  breaches: { metric: string; value: number; threshold: number; severity: "warn" | "alert" }[];
}> {
  const sources = await fetchExecKpiSources(
    supabase as unknown as { from: (t: string) => { select: (c: string) => Promise<{ data: unknown }> } },
  );
  const kpis = computeExecKpis(sources);
  const breaches: { metric: string; value: number; threshold: number; severity: "warn" | "alert" }[] = [];
  if (kpis.incidents_critical > 0) breaches.push({ metric: "incidents_critical", value: kpis.incidents_critical, threshold: 0, severity: "alert" });
  if (kpis.cctv_health < 80) breaches.push({ metric: "cctv_health", value: kpis.cctv_health, threshold: 80, severity: kpis.cctv_health < 60 ? "alert" : "warn" });
  if (kpis.access_health < 80) breaches.push({ metric: "access_health", value: kpis.access_health, threshold: 80, severity: kpis.access_health < 60 ? "alert" : "warn" });
  if (kpis.patrol_completion < 90) breaches.push({ metric: "patrol_completion", value: kpis.patrol_completion, threshold: 90, severity: "warn" });
  if (kpis.contractors_compliance < 90) breaches.push({ metric: "contractors_compliance", value: kpis.contractors_compliance, threshold: 90, severity: "warn" });
  if (kpis.risk_index > 60) breaches.push({ metric: "risk_index", value: kpis.risk_index, threshold: 60, severity: kpis.risk_index > 80 ? "alert" : "warn" });
  if (kpis.executive_readiness < 70) breaches.push({ metric: "executive_readiness", value: kpis.executive_readiness, threshold: 70, severity: kpis.executive_readiness < 50 ? "alert" : "warn" });
  return { kpis, breaches };
}

// ============ Stage 6: Risk engine ============
const SEV_WEIGHT: Record<string, number> = { low: 20, medium: 45, high: 70, critical: 95 };

export async function runRiskEngine(supabase: SupabaseClient, kpis: ExecKpis): Promise<RiskItem[]> {
  const [incidentsQ, permitsQ, assetsQ, cctvQ] = await Promise.all([
    supabase.from("sec_incidents").select("id,ref,title_ar,severity,status,reported_at").neq("status", "closed").neq("status", "resolved").order("reported_at", { ascending: false }).limit(50),
    supabase.from("sec_permits").select("id,ref,work_type,risk_level,status,ends_at").in("status", ["active", "approved"]).limit(50),
    supabase.from("sec_assets").select("id,code,name_ar,health,status").lt("health", 60).limit(50),
    supabase.from("sec_cctv_alerts").select("id,ref,alert_type,camera_code,confidence,status").eq("status", "new").limit(50),
  ]);
  const now = Date.now();
  const items: RiskItem[] = [];

  for (const inc of (incidentsQ.data ?? []) as { id: string; ref: string; title_ar: string; severity: string; reported_at: string }[]) {
    const ageH = Math.max(0, (now - new Date(inc.reported_at).getTime()) / 36e5);
    const ageScore = Math.min(20, ageH * 0.5);
    const score = Math.min(100, (SEV_WEIGHT[inc.severity] ?? 40) + ageScore);
    items.push({
      id: inc.id,
      kind: "incident",
      title: inc.title_ar,
      score: Math.round(score),
      severity: (inc.severity as RiskItem["severity"]) ?? "medium",
      rationale: `بلاغ ${inc.severity} مفتوح منذ ${Math.round(ageH)} ساعة`,
      ref: inc.ref,
    });
  }
  for (const p of (permitsQ.data ?? []) as { id: string; ref: string; work_type: string; risk_level: string; ends_at: string }[]) {
    const endsInH = (new Date(p.ends_at).getTime() - now) / 36e5;
    if (endsInH < 0) {
      items.push({ id: p.id, kind: "permit", title: `تصريح منتهي: ${p.work_type}`, score: 75, severity: "high", rationale: `انتهى منذ ${Math.round(-endsInH)}h`, ref: p.ref });
    } else if (endsInH < 24) {
      items.push({ id: p.id, kind: "permit", title: `تصريح ينتهي خلال 24h: ${p.work_type}`, score: 50, severity: "medium", rationale: `ينتهي خلال ${Math.round(endsInH)}h`, ref: p.ref });
    }
  }
  for (const a of (assetsQ.data ?? []) as { id: string; code: string; name_ar: string; health: number; status: string }[]) {
    items.push({
      id: a.id,
      kind: "asset",
      title: `أصل بصحة منخفضة: ${a.name_ar}`,
      score: Math.min(100, 100 - a.health),
      severity: a.health < 30 ? "high" : "medium",
      rationale: `صحة ${a.health}% — ${a.status}`,
      ref: a.code,
    });
  }
  for (const c of (cctvQ.data ?? []) as { id: string; ref: string; alert_type: string; camera_code: string; confidence: number }[]) {
    items.push({
      id: c.id,
      kind: "cctv",
      title: `تنبيه CCTV: ${c.alert_type}`,
      score: Math.round(40 + c.confidence * 50),
      severity: c.confidence > 0.85 ? "high" : "medium",
      rationale: `كاميرا ${c.camera_code} ثقة ${Math.round(c.confidence * 100)}%`,
      ref: c.ref,
    });
  }
  if (kpis.risk_index > 70) {
    items.push({
      id: "global-risk",
      kind: "incident",
      title: "ارتفاع مؤشر المخاطر العام",
      score: kpis.risk_index,
      severity: kpis.risk_index > 85 ? "critical" : "high",
      rationale: `risk_index=${kpis.risk_index} (الحد ≤ 60)`,
      ref: null,
    });
  }
  return items.sort((a, b) => b.score - a.score).slice(0, 12);
}

// ============ Stage 7: Decision engine ============
export function runDecisionEngine(risks: RiskItem[], kpis: ExecKpis): DecisionItem[] {
  const decisions: DecisionItem[] = [];
  const criticalIncidents = risks.filter((r) => r.kind === "incident" && r.severity === "critical");
  if (criticalIncidents.length) {
    decisions.push({
      recommendation: `معالجة فورية لـ ${criticalIncidents.length} بلاغ حرج`,
      rationale: criticalIncidents.map((r) => `${r.ref ?? r.id} (score ${r.score})`).join("، "),
      confidence: 0.92,
      suggested_tool: "sec_list_incidents",
      tool_payload_json: JSON.stringify({ severity: "critical", status: "open" }),
      alternatives: ["تصعيد إلى رئيس القسم", "تحويل إلى غرفة العمليات المركزية"],
    });
  }
  const expiredPermits = risks.filter((r) => r.kind === "permit" && r.severity === "high");
  if (expiredPermits.length) {
    decisions.push({
      recommendation: `إغلاق ${expiredPermits.length} تصريح منتهي والتنبيه على المقاولين`,
      rationale: expiredPermits.map((r) => r.ref ?? r.id).join("، "),
      confidence: 0.85,
      suggested_tool: "sec_list_permits",
      tool_payload_json: JSON.stringify({ status: "expired" }),
      alternatives: ["تمديد التصريح بعد المراجعة"],
    });
  }
  if (kpis.cctv_health < 80) {
    decisions.push({
      recommendation: `جدولة صيانة وقائية لمنظومة CCTV (الصحة ${kpis.cctv_health}%)`,
      rationale: `cctv_health < 80%؛ ${kpis.cameras_total - kpis.cameras_online} كاميرا غير متصلة`,
      confidence: 0.8,
      suggested_tool: "sec_create_work_order",
      tool_payload_json: JSON.stringify({ kind: "preventive", asset_kind: "cctv", priority: "high" }),
      alternatives: ["إعادة فحص الشبكة قبل فتح أمر صيانة"],
    });
  }
  if (kpis.patrol_completion < 90) {
    decisions.push({
      recommendation: `تعزيز الدوريات (إنجاز ${kpis.patrol_completion}%)`,
      rationale: "patrol_completion دون الهدف 90%",
      confidence: 0.75,
      suggested_tool: "sec_schedule_patrol",
      tool_payload_json: null,
      alternatives: ["مراجعة جداول الورديات", "إضافة فرقة مساندة"],
    });
  }
  return decisions;
}

// ============ Stage 8: Reasoning ============
export async function runReasoner(args: {
  message: string;
  language: "ar" | "en";
  enterpriseContext: string;
  kpis: ExecKpis;
  risks: RiskItem[];
  decisions: DecisionItem[];
  memories: { key: string; content: string }[];
  knowledge: { title: string; source: string; content: string }[];
}): Promise<{ text: string; tokens?: number }> {
  const p = provider();
  const system = `You are ARIA — Executive AI for إدارة الأمن الصناعي بالمنطقة الغربية (Western Region Industrial Security). Respond in ${args.language === "ar" ? "Arabic (MSA)" : "English"}. Render the executive structure with H3 sections in this order: 🎯 Executive Summary, 📊 Related KPIs (table), 🔍 Root Cause Analysis, ⚠️ Risks, 💡 Opportunities, ✅ Recommended Actions, 📈 Confidence, ➡️ Next Executive Decision. Ground EVERY number in the supplied context. If a datum is missing, say "بيانات غير متوفرة" / "Data unavailable". Never fabricate.`;

  const ctx = [
    `# LIVE KPIs\n${JSON.stringify(args.kpis, null, 2)}`,
    `# RANKED RISKS\n${args.risks.map((r) => `- [${r.severity} · ${r.score}] ${r.title} — ${r.rationale}${r.ref ? ` (${r.ref})` : ""}`).join("\n") || "—"}`,
    `# DECISION RECOMMENDATIONS\n${args.decisions.map((d) => `- (conf ${Math.round(d.confidence * 100)}%) ${d.recommendation} — ${d.rationale}`).join("\n") || "—"}`,
    args.memories.length ? `# RECALLED MEMORY\n${args.memories.map((m) => `- ${m.key}: ${m.content}`).join("\n")}` : "",
    args.knowledge.length ? `# RELEVANT KNOWLEDGE\n${args.knowledge.map((k) => `- ${k.title} (${k.source}): ${k.content.slice(0, 240)}`).join("\n")}` : "",
    `# ENTERPRISE CONTEXT\n${args.enterpriseContext}`,
  ].filter(Boolean).join("\n\n");

  const { text, usage } = await generateText({
    model: p(REASONING_MODEL),
    system: `${system}\n\n${ctx}`,
    prompt: args.message,
    maxOutputTokens: 1800,
  });
  return { text, tokens: usage?.totalTokens };
}

// ============ Orchestrator ============
export type PipelineResult = {
  answer: string;
  trace: StageTrace[];
  intent: Intent;
  kpis: ExecKpis;
  breaches: { metric: string; value: number; threshold: number; severity: "warn" | "alert" }[];
  risks: RiskItem[];
  decisions: DecisionItem[];
  citations: Citation[];
  confidence: number;
  report?: { kind: ReportKind; id: string; title: string };
  total_ms: number;
  tokens?: number;
};

export async function runPipeline(args: {
  supabase: SupabaseClient;
  userId: string;
  threadId?: string;
  message: string;
}): Promise<PipelineResult> {
  const trace: StageTrace[] = [];
  const t0 = Date.now();

  const intentR = await timed("intent", () => detectIntent(args.message));
  const intent = intentR.value;
  trace.push({ stage: "intent", status: "ok", duration_ms: intentR.ms, summary: `${intent.intent} (${Math.round(intent.confidence * 100)}%)`, data_json: JSON.stringify(intent) });

  const memR = await timed("memory", () => recallMemory(args.supabase, args.userId, args.message));
  trace.push({ stage: "memory", status: "ok", duration_ms: memR.ms, summary: `${memR.value.memories.length} memories`, data_json: JSON.stringify(memR.value.memories) });

  const ragR = await timed("knowledge", () => retrieveKnowledge(args.supabase, memR.value.embedding));
  trace.push({ stage: "knowledge", status: "ok", duration_ms: ragR.ms, summary: `${ragR.value.chunks.length} chunks`, data_json: JSON.stringify(ragR.value.citations) });

  const ctxR = await timed("context", () => loadEnterpriseContext(args.supabase));
  trace.push({ stage: "context", status: ctxR.value.startsWith("NO_") || ctxR.value.startsWith("INDUSTRIAL_") ? "skipped" : "ok", duration_ms: ctxR.ms, summary: `${ctxR.value.length} chars` });

  const kpiR = await timed("kpi", () => runKpiEngine(args.supabase));
  trace.push({ stage: "kpi", status: "ok", duration_ms: kpiR.ms, summary: `readiness ${kpiR.value.kpis.executive_readiness} · breaches ${kpiR.value.breaches.length}`, data_json: JSON.stringify(kpiR.value.breaches) });

  const riskR = await timed("risk", () => runRiskEngine(args.supabase, kpiR.value.kpis));
  trace.push({ stage: "risk", status: "ok", duration_ms: riskR.ms, summary: `${riskR.value.length} ranked risks`, data_json: JSON.stringify(riskR.value.slice(0, 3)) });

  const decR = await timed("decision", async () => runDecisionEngine(riskR.value, kpiR.value.kpis));
  trace.push({ stage: "decision", status: "ok", duration_ms: decR.ms, summary: `${decR.value.length} decisions`, data_json: JSON.stringify(decR.value) });

  // Persist decisions (best-effort)
  if (decR.value.length) {
    const rows = decR.value.map((d) => ({
      user_id: args.userId,
      thread_id: args.threadId ?? null,
      recommendation: d.recommendation,
      rationale: d.rationale,
      confidence: d.confidence,
      executed_tool: d.suggested_tool,
      tool_payload: d.tool_payload_json ? JSON.parse(d.tool_payload_json) : null,
      status: "pending" as const,
    }));
    const { error } = await args.supabase.from("aria_decisions").insert(rows);
    if (error) console.warn("[aria/pipeline] decisions insert failed", error.message);
  }

  const reasonR = await timed("reasoning", () =>
    runReasoner({
      message: args.message,
      language: intent.language,
      enterpriseContext: ctxR.value,
      kpis: kpiR.value.kpis,
      risks: riskR.value,
      decisions: decR.value,
      memories: memR.value.memories,
      knowledge: ragR.value.chunks,
    }),
  );
  trace.push({ stage: "reasoning", status: "ok", duration_ms: reasonR.ms, summary: `${reasonR.value.text.length} chars`, data_json: JSON.stringify({ tokens: reasonR.value.tokens }) });

  // Tools stage — agentic tools live in /api/chat; here we surface what would be called.
  trace.push({
    stage: "tools",
    status: decR.value.some((d) => d.suggested_tool) ? "ok" : "skipped",
    duration_ms: 0,
    summary: decR.value.filter((d) => d.suggested_tool).map((d) => d.suggested_tool!).join(", ") || "no tool calls",
  });

  // Report generation if requested
  let report: PipelineResult["report"];
  if (intent.requires_report) {
    const reportR = await timed("report", async () => {
      const { generateReport } = await import("./reports.server");
      return generateReport({
        supabase: args.supabase,
        userId: args.userId,
        kind: intent.report_kind ?? "executive",
        kpis: kpiR.value.kpis,
        risks: riskR.value,
        decisions: decR.value,
        narrative: reasonR.value.text,
        language: intent.language,
      });
    });
    trace.push({ stage: "report", status: "ok", duration_ms: reportR.ms, summary: `${reportR.value.kind} report saved`, data_json: JSON.stringify({ id: reportR.value.id }) });
    report = reportR.value;
  } else {
    trace.push({ stage: "report", status: "skipped", duration_ms: 0, summary: "not requested" });
  }

  // Auto-memorize salient query (best-effort, non-blocking conceptually).
  await storeMemory(
    args.supabase,
    args.userId,
    "conversation",
    `q:${Date.now()}`,
    `${args.message}\n→ ${reasonR.value.text.slice(0, 600)}`,
    0.4,
  ).catch(() => {});

  const confidence = Math.min(
    1,
    (intent.confidence + (decR.value.reduce((s, d) => s + d.confidence, 0) / Math.max(1, decR.value.length))) / 2,
  );

  return {
    answer: reasonR.value.text,
    trace,
    intent,
    kpis: kpiR.value.kpis,
    breaches: kpiR.value.breaches,
    risks: riskR.value,
    decisions: decR.value,
    citations: ragR.value.citations,
    confidence,
    report,
    total_ms: Date.now() - t0,
    tokens: reasonR.value.tokens,
  };
}
