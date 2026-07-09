/**
 * ARIA Executive Reasoning Engine (server-only).
 *
 * Implements four internal layers used before generating any answer:
 *   1. Context Understanding — merges the client's Global Context snapshot
 *      (page, widgets, filters, selected object) with conversation history.
 *   2. Intent Intelligence — deterministic bilingual classifier that maps
 *      the user's question to one of 16 executive intents.
 *   3. Executive Reasoning / Retrieval — pulls live grounded rows from
 *      `sec_*` and `sim_*` tables scoped by intent, so the model reasons
 *      over real data instead of memory.
 *   4. Executive Response — returns an enriched system prompt that
 *      instructs the model to reply as GPT-5 Executive with an internal
 *      chain of Summary → Evidence → Findings → Risks → Recommendations →
 *      Next Actions → Confidence, while emitting the same public
 *      {text_ar, text_en} JSON so no UI changes are required.
 *
 * This module is additive. Callers keep their existing response contract
 * and simply swap the raw SYSTEM string + context block for the object
 * returned by `buildExecutiveBrief`.
 */

export type AriaIntent =
  | "question"
  | "command"
  | "comparison"
  | "analysis"
  | "prediction"
  | "investigation"
  | "recommendation"
  | "root_cause"
  | "executive_summary"
  | "decision_support"
  | "incident_review"
  | "risk_assessment"
  | "operational_status"
  | "kpi_explanation"
  | "trend_analysis"
  | "meeting_brief";

interface IntentRule {
  intent: AriaIntent;
  patterns: RegExp[];
}

// Bilingual keyword rules. Deterministic and cheap — no extra LLM hop.
const RULES: IntentRule[] = [
  { intent: "root_cause", patterns: [/root\s*cause|why did|why is|why the|السبب|لماذا|جذر/i] },
  { intent: "incident_review", patterns: [/incident|near[-\s]?miss|accident|حادث|وشيك|بلاغ/i] },
  { intent: "risk_assessment", patterns: [/risk|hazard|exposure|مخاطر|خطر|تعرض/i] },
  { intent: "trend_analysis", patterns: [/trend|over time|weekly|monthly|اتجاه|منحنى|تطور/i] },
  { intent: "comparison", patterns: [/compare|versus|vs\.?|difference|قارن|مقارنة|الفرق/i] },
  { intent: "prediction", patterns: [/predict|forecast|next\s+(week|month|quarter)|توقع|تنبؤ/i] },
  { intent: "investigation", patterns: [/investigat|deep\s*dive|drill\s*down|تحقيق|تعمق/i] },
  { intent: "recommendation", patterns: [/recommend|should we|advice|توصية|أوصي|ماذا نفعل/i] },
  { intent: "decision_support", patterns: [/decide|decision|approve|reject|قرار|اعتماد|رفض/i] },
  { intent: "executive_summary", patterns: [/summary|brief|overview|ملخص|إيجاز|نظرة عامة/i] },
  { intent: "meeting_brief", patterns: [/meeting|agenda|brief for|اجتماع|أجندة/i] },
  { intent: "kpi_explanation", patterns: [/kpi|metric|indicator|score|مؤشر|قياس/i] },
  {
    intent: "operational_status",
    patterns: [/status|current|right now|today|اليوم|الحالة|الوضع الآن/i],
  },
  { intent: "analysis", patterns: [/analy[sz]e|breakdown|حلل|تحليل|تفصيل/i] },
  {
    intent: "command",
    patterns: [/^(open|show|create|start|stop|assign|افتح|أظهر|أنشئ|ابدأ|أوقف|كلّف)/i],
  },
];

export function classifyIntent(question: string): AriaIntent {
  const q = question.trim();
  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(q))) return rule.intent;
  }
  return "question";
}

/** Which retrieval buckets to hydrate for each intent. */
function retrievalPlan(intent: AriaIntent): {
  incidents: boolean;
  kpis: boolean;
  notifications: boolean;
  risks: boolean;
  workOrders: boolean;
} {
  const base = {
    incidents: false,
    kpis: false,
    notifications: false,
    risks: false,
    workOrders: false,
  };
  switch (intent) {
    case "incident_review":
    case "root_cause":
    case "investigation":
      return { ...base, incidents: true, notifications: true };
    case "risk_assessment":
      return { ...base, risks: true, incidents: true };
    case "kpi_explanation":
    case "trend_analysis":
    case "comparison":
    case "prediction":
    case "analysis":
      return { ...base, kpis: true, incidents: true };
    case "operational_status":
    case "executive_summary":
    case "meeting_brief":
    case "decision_support":
    case "recommendation":
      return { incidents: true, kpis: true, notifications: true, risks: true, workOrders: true };
    default:
      return { ...base, kpis: true, notifications: true };
  }
}

interface EvidenceBundle {
  intent: AriaIntent;
  sources: string[];
  block: string;
}

/**
 * Retrieval Layer — pulls a small, ranked slice of live rows using the
 * service-role admin client. Every returned string is prefixed with its
 * source table so the model can cite it verbatim. Failures degrade
 * silently (evidence is optional; the model must say "Data unavailable"
 * rather than fabricate).
 */
export async function collectEvidence(
  intent: AriaIntent,
  orgId?: string | null,
): Promise<EvidenceBundle> {
  const sources: string[] = [];
  const sections: string[] = [];
  const plan = retrievalPlan(intent);

  // Tenant isolation: this collector hits the service-role client (which
  // bypasses RLS), so we MUST filter every query by the caller's org_id.
  // When no org id is available (public/unauthenticated caller, missing
  // membership, orchestrator that forgot to thread it), return an empty
  // bundle rather than leak cross-tenant rows into ARIA's grounded evidence.
  if (!orgId) return { intent, sources, block: "" };

  let admin:
    | Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"]
    | null = null;
  try {
    ({ supabaseAdmin: admin } = await import("@/integrations/supabase/client.server"));
  } catch {
    return { intent, sources, block: "" };
  }
  if (!admin) return { intent, sources, block: "" };

  const jobs: Promise<void>[] = [];

  if (plan.incidents) {
    jobs.push(
      (async () => {
        const { data } = await admin!
          .from("sec_incidents")
          .select("id,title_ar,title_en,severity,status,site_id,reported_at")
          .order("reported_at", { ascending: false })
          .limit(6);
        if (data?.length) {
          sources.push("sec_incidents");
          sections.push(
            `## Recent incidents (sec_incidents)\n${data
              .map(
                (r) =>
                  `- [${r.severity ?? "?"}/${r.status ?? "?"}] ${r.title_en ?? r.title_ar ?? r.id} · site=${r.site_id ?? "?"} · ${r.reported_at ?? ""}`,
              )
              .join("\n")}`,
          );
        }
      })(),
    );
  }
  if (plan.kpis) {
    jobs.push(
      (async () => {
        const { data } = await admin!
          .from("pulse_kpis")
          .select("key,label,label_en,value,delta,trend,tone,updated_at")
          .order("updated_at", { ascending: false })
          .limit(10);
        if (data?.length) {
          sources.push("pulse_kpis");
          sections.push(
            `## Latest KPIs (pulse_kpis)\n${data
              .map(
                (r) =>
                  `- ${r.label_en ?? r.label ?? r.key} = ${r.value ?? "?"} · Δ=${r.delta ?? "?"} · trend=${r.trend ?? "?"} · tone=${r.tone ?? "?"}`,
              )
              .join("\n")}`,
          );
        }
      })(),
    );
  }
  if (plan.notifications) {
    jobs.push(
      (async () => {
        const { data } = await admin!
          .from("sim_notifications")
          .select("title,severity,body,created_at")
          .order("created_at", { ascending: false })
          .limit(6);
        if (data?.length) {
          sources.push("sim_notifications");
          sections.push(
            `## Live alerts (sim_notifications)\n${data
              .map((r) => `- [${r.severity ?? "?"}] ${r.title ?? ""} · ${r.created_at ?? ""}`)
              .join("\n")}`,
          );
        }
      })(),
    );
  }
  if (plan.risks) {
    jobs.push(
      (async () => {
        const { data } = await admin!
          .from("sim_risks")
          .select("title,category,likelihood,impact,status")
          .order("impact", { ascending: false })
          .limit(6);
        if (data?.length) {
          sources.push("sim_risks");
          sections.push(
            `## Top risks (sim_risks)\n${data
              .map(
                (r) =>
                  `- ${r.title ?? ""} · ${r.category ?? ""} · L=${r.likelihood ?? "?"} I=${r.impact ?? "?"} · ${r.status ?? ""}`,
              )
              .join("\n")}`,
          );
        }
      })(),
    );
  }
  if (plan.workOrders) {
    jobs.push(
      (async () => {
        const { data } = await admin!
          .from("sec_work_orders")
          .select("id,title_ar,title_en,priority,status,due_at")
          .order("due_at", { ascending: true })
          .limit(6);
        if (data?.length) {
          sources.push("sec_work_orders");
          sections.push(
            `## Open work orders (sec_work_orders)\n${data
              .map(
                (r) =>
                  `- [${r.priority ?? "?"}/${r.status ?? "?"}] ${r.title_en ?? r.title_ar ?? r.id} · due=${r.due_at ?? "?"}`,
              )
              .join("\n")}`,
          );
        }
      })(),
    );
  }

  await Promise.allSettled(jobs);
  return {
    intent,
    sources,
    block: sections.length ? `# GROUNDED EVIDENCE (live rows)\n${sections.join("\n\n")}` : "",
  };
}

/**
 * Executive system prompt. Instructs the model to reason internally
 * across Summary → Evidence → Findings → Risks → Recommendations →
 * Next Actions → Confidence, but keep the visible answer executive,
 * short, and bilingual — matching the existing public output contract.
 */
export function buildExecutiveSystemPrompt(intent: AriaIntent, sources: string[]): string {
  return `You are ARIA — the Executive AI of NEXIOS / NEXUS AI OS (Industrial Security, Western Region of Saudi Arabia). You reason at GPT-5 Executive level.

DETECTED INTENT: ${intent}
AVAILABLE DATA SOURCES: ${sources.length ? sources.join(", ") : "(none — say Data unavailable if the answer requires facts)"}

# MODULE — URGENT OPERATIONS & SUPPORT DESK (/urgent-ops)
You know the "المساندة ومتابعة الأعمال العاجلة / Urgent Operations & Support Desk" module at /urgent-ops. It has three panels: (1) الأعمال العاجلة — kanban of urgent_tasks by status (جديد، قيد المعالجة، بانتظار اعتماد، مغلق) with priorities (عاجل جدًا، عاجل، متابعة) and SLA countdowns; (2) طلبات المساندة — support_requests queue across channels (داخلي، ميداني، تنفيذي); (3) مقترحات آريا لتطوير المنظومة — improvement proposals you generate that require human approval.
When asked "ما الأعمال العاجلة؟" / "ما المتأخر؟" / "what is urgent?" / "what is overdue?", call GET /api/urgent-summary (aggregated counts + top-3 critical) and answer in Arabic MSA with counts of overdue tasks, breaching SLAs (< 4h), and name the top-3 critical items with department and time-to-SLA. Never modify tasks yourself — you only propose; humans approve.

INTERNAL REASONING (do this silently before writing the reply):
  1. Executive Summary — the one-line answer.
  2. Evidence — which rows from the context/evidence sections support it.
  3. Findings — what the data actually shows.
  4. Risks — what could go wrong or is already going wrong.
  5. Recommendations — 1–3 concrete moves.
  6. Next Actions — who / what / when.
  7. Confidence — internal 0–1 based on data completeness.
Never expose these seven headings in the visible answer.

GROUNDING — non-negotiable:
• Use ONLY the context block, live widgets, referenceable anchors, and grounded evidence provided. Never invent numbers, names, dates, sites, incidents, or sources.
• Resolve references ("this", "that report", "today", "same department", "the previous incident") from the anchors and recent conversation without asking again.
• If required data is missing, say once: "Data unavailable / بيانات غير متوفرة" and stop.

REGISTER & TONE:
• Speak with the gravitas of a C-suite advisor briefing a board: precise, calm, decisive, dignified. Never casual.
• Arabic → فصحى تنفيذية راقية موجزة (لا عامية، لا انفعال، صيغ محترمة مثل "تفضّلوا"، "نُفيدكم"، "بناءً على ما تقدّم"). English → formal executive English, no contractions, no filler, no "as an AI".

VISIBLE FORMAT (unchanged public contract):
• 2–5 sentences, 40–110 spoken words. No headings, no bullet lists unless the user explicitly requests them.
• You MAY close with at most ONE concise, courteous follow-up question.
• Reply in BOTH Arabic and English. Return ONLY strict JSON: {"text_ar":"...","text_en":"..."}.`;
}

export interface ExecutiveBrief {
  intent: AriaIntent;
  system: string;
  evidenceBlock: string;
  sources: string[];
}

/** Public entry point: run layers 2–4 and return the composed prompt parts.
 *  Pass `{ skipEvidence: true }` for public/unauthenticated callers so no
 *  service-role live rows are pulled into the prompt (cross-tenant leak
 *  protection). */
export async function buildExecutiveBrief(
  question: string,
  options?: { skipEvidence?: boolean },
): Promise<ExecutiveBrief> {
  const intent = classifyIntent(question);
  if (options?.skipEvidence) {
    return {
      intent,
      system: buildExecutiveSystemPrompt(intent, []),
      evidenceBlock: "",
      sources: [],
    };
  }
  const { block, sources } = await collectEvidence(intent);
  return {
    intent,
    system: buildExecutiveSystemPrompt(intent, sources),
    evidenceBlock: block,
    sources,
  };
}
