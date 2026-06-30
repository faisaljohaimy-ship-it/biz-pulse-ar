import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DEMO_EMAIL } from "@/lib/demo.functions";

/** Tables owned by a user that should be wiped on demo reset. */
const USER_SCOPED_TABLES = [
  "pulse_kpis",
  "pulse_crises",
  "pulse_execution",
  "pulse_memory",
  "intelligence_alerts",
  "intelligence_events",
  "executive_briefings",
  "briefing_actions",
  "briefing_opportunities",
  "briefing_risks",
  "business_outcomes",
  "outcome_metrics",
  "transformation_programs",
  "transformation_milestones",
  "governance_policies",
  "governance_systems",
  "tasks",
  "prompts",
  "knowledge_docs",
  "threads",
  "messages",
] as const;

type AdminClient = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

async function requireAdmin(context: { supabase: { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: Error | null }> }; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || data !== true) throw new Error("Forbidden");
}

async function getDemoUserId(supabaseAdmin: AdminClient): Promise<string> {
  const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) throw new Error(error.message);
  const u = list.users.find((u) => u.email?.toLowerCase() === DEMO_EMAIL);
  if (!u) throw new Error("Demo user not found — call ensureDemoUser first.");
  return u.id;
}

/** Wipes all sample data for the demo account. Safe to call repeatedly. */
export const resetDemoData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
  await requireAdmin(context);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const userId = await getDemoUserId(supabaseAdmin);
  for (const table of USER_SCOPED_TABLES) {
    await supabaseAdmin.from(table).delete().eq("user_id", userId);
  }
  return { ok: true };
});

/** Seeds a realistic Fortune-500 snapshot for the demo account. Idempotent. */
export const seedDemoData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
  await requireAdmin(context);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const userId = await getDemoUserId(supabaseAdmin);

  // Wipe first so reseeding is clean
  for (const table of USER_SCOPED_TABLES) {
    await supabaseAdmin.from(table).delete().eq("user_id", userId);
  }

  const now = new Date();
  const inDays = (d: number) => new Date(now.getTime() + d * 86400000).toISOString();

  // ===== KPIs =====
  await supabaseAdmin.from("pulse_kpis").insert([
    { user_id: userId, key: "revenue", label: "الإيرادات الفصلية", label_en: "Quarterly Revenue", value: "$184M", delta: "+12.4%", trend: "up", tone: "emerald", why: "نمو في القطاع المؤسسي", why_en: "Enterprise segment growth", sort_order: 1 },
    { user_id: userId, key: "ebitda", label: "هامش EBITDA", label_en: "EBITDA Margin", value: "28.6%", delta: "+1.8pt", trend: "up", tone: "cyan", why: "تحسين كفاءة التشغيل", why_en: "Operational efficiency gains", sort_order: 2 },
    { user_id: userId, key: "nps", label: "صافي نقاط الترويج", label_en: "NPS", value: "72", delta: "+6", trend: "up", tone: "primary", why: "تحسين تجربة العميل", why_en: "Customer experience upgrade", sort_order: 3 },
    { user_id: userId, key: "churn", label: "معدل الفقد", label_en: "Churn", value: "2.1%", delta: "-0.4pt", trend: "down", tone: "amber", why: "خطة الاحتفاظ نشطة", why_en: "Retention program active", sort_order: 4 },
  ]);

  // ===== Crises / Risks =====
  await supabaseAdmin.from("pulse_crises").insert([
    { user_id: userId, key: "supply-chain", category: "Operations", title: "اضطراب سلسلة التوريد — آسيا", title_en: "Supply chain disruption — Asia", risk_score: 78, probability: 65, impact: "تأخير شحن $4.2M", impact_en: "$4.2M shipment delay", owner: "COO", action: "تفعيل موردين بدلاء", action_en: "Activate alt suppliers", route: "/risk", sort_order: 1 },
    { user_id: userId, key: "cyber", category: "Security", title: "محاولات اختراق متزايدة", title_en: "Elevated intrusion attempts", risk_score: 64, probability: 55, impact: "خطر سمعة وامتثال", impact_en: "Reputation & compliance risk", owner: "CISO", action: "تشديد MFA على كل النظم", action_en: "Enforce MFA org-wide", route: "/governance", sort_order: 2 },
    { user_id: userId, key: "talent", category: "People", title: "مغادرة قائد منتج", title_en: "Product leader attrition", risk_score: 42, probability: 40, impact: "تأخر خارطة الطريق", impact_en: "Roadmap slip risk", owner: "CHRO", action: "خطة خلافة معجلة", action_en: "Accelerated succession plan", route: "/team", sort_order: 3 },
  ]);

  // ===== Execution =====
  await supabaseAdmin.from("pulse_execution").insert([
    { user_id: userId, key: "exec-1", decision: "إطلاق منصة الذكاء التنفيذي", decision_en: "Launch executive intelligence platform", action: "نشر للنواة 50 مستخدم", action_en: "Roll out to first 50 execs", owner: "CTO", department: "Engineering", dependency: "تأهيل البيانات", dependency_en: "Data onboarding", risk: "low", completion: 78, status: "in_progress", sort_order: 1 },
    { user_id: userId, key: "exec-2", decision: "توسيع السوق الخليجي", decision_en: "GCC market expansion", action: "افتتاح مكتب الرياض", action_en: "Open Riyadh office", owner: "CRO", department: "Sales", dependency: "اعتماد قانوني", dependency_en: "Legal approval", risk: "medium", completion: 45, status: "in_progress", sort_order: 2 },
    { user_id: userId, key: "exec-3", decision: "أتمتة ضمان الجودة", decision_en: "Automate QA pipeline", action: "تشغيل اختبارات OS-2", action_en: "Run OS-2 test suite", owner: "VP Eng", department: "Engineering", dependency: "—", dependency_en: "—", risk: "low", completion: 92, status: "in_progress", sort_order: 3 },
  ]);

  // ===== Intelligence Alerts =====
  await supabaseAdmin.from("intelligence_alerts").insert([
    { user_id: userId, title: "منافس جديد دخل القطاع المؤسسي", title_en: "New competitor entered enterprise segment", severity: "high", detail: "إعلان منتج مماثل بسعر أقل 18%", owner: "CSO", source: "Market Intel", route: "/intelligence", business_impact_score: 76 },
    { user_id: userId, title: "تغير تنظيمي — حماية البيانات", title_en: "Regulatory shift — data protection", severity: "medium", detail: "تحديث PDPL في الربع القادم", owner: "Legal", source: "Compliance Feed", route: "/governance", business_impact_score: 58 },
    { user_id: userId, title: "فرصة شراكة استراتيجية", title_en: "Strategic partnership opportunity", severity: "low", detail: "اهتمام من Tier-1 cloud provider", owner: "BD", source: "Inbound", route: "/portfolio", business_impact_score: 64 },
  ]);

  // ===== Executive Briefing =====
  const { data: brief } = await supabaseAdmin.from("executive_briefings").insert({
    user_id: userId,
    title: "موجز اليوم التنفيذي",
    title_en: "Today's Executive Brief",
    summary: "نمو إيرادات قوي مع ضغط على سلسلة التوريد. اتخذ ٣ قرارات معلقة.",
    summary_en: "Strong revenue growth with supply pressure. 3 pending decisions await.",
  }).select().single();

  if (brief?.id) {
    await supabaseAdmin.from("briefing_actions").insert([
      { user_id: userId, briefing_id: brief.id, title: "اعتمد ميزانية Q3 المعدلة", title_en: "Approve revised Q3 budget", priority: 90 },
      { user_id: userId, briefing_id: brief.id, title: "وقّع عقد شراكة AWS", title_en: "Sign AWS partnership contract", priority: 75 },
    ]);
    await supabaseAdmin.from("briefing_risks").insert([
      { user_id: userId, briefing_id: brief.id, title: "تأخر شحنات آسيا", title_en: "Asia shipment delays", level: "high", probability: 65 },
    ]);
    await supabaseAdmin.from("briefing_opportunities").insert([
      { user_id: userId, briefing_id: brief.id, title: "صفقة Tier-1 جاهزة للإغلاق", title_en: "Tier-1 deal ready to close", potential: 85 },
    ]);
  }

  // ===== Business Outcomes =====
  await supabaseAdmin.from("business_outcomes").insert([
    { user_id: userId, category: "revenue", label: "النمو السنوي", label_en: "YoY Growth", value: "+24%", delta: "+6pt", period_from: "Q1", period_to: "Q2" },
    { user_id: userId, category: "efficiency", label: "وقت اتخاذ القرار", label_en: "Decision Latency", value: "−42%", delta: "−12pt", period_from: "Q1", period_to: "Q2" },
    { user_id: userId, category: "people", label: "الاحتفاظ بالكفاءات", label_en: "Talent Retention", value: "94%", delta: "+3pt", period_from: "Q1", period_to: "Q2" },
  ]);

  // ===== Transformation Programs =====
  await supabaseAdmin.from("transformation_programs").insert([
    { user_id: userId, name: "تحول AI-First", name_en: "AI-First Transformation", phase: "scale", progress: 68, adoption: 74, savings: "$12M" },
    { user_id: userId, name: "تحديث البيانات", name_en: "Data Modernization", phase: "design", progress: 32, adoption: 28, savings: "$4.5M" },
  ]);

  // ===== Governance =====
  await supabaseAdmin.from("governance_policies").insert([
    { user_id: userId, name: "سياسة الذكاء الاصطناعي المسؤول", name_en: "Responsible AI Policy", version: "2.1", coverage: 88 },
    { user_id: userId, name: "خصوصية البيانات", name_en: "Data Privacy", version: "3.0", coverage: 96 },
  ]);
  await supabaseAdmin.from("governance_systems").insert([
    { user_id: userId, name: "Core CRM", kind: "SaaS", owner: "Sales Ops", criticality: "Tier-1", sla: 99.95, risk: "low" },
    { user_id: userId, name: "Data Lake", kind: "Internal", owner: "Data Eng", criticality: "Tier-1", sla: 99.9, risk: "medium" },
  ]);

  // ===== Tasks =====
  await supabaseAdmin.from("tasks").insert([
    { user_id: userId, title: "مراجعة موجز التنفيذي", description: "موجز اليوم — ٣ قرارات معلقة", status: "todo", priority: "high", due_at: inDays(0) },
    { user_id: userId, title: "موافقة على ميزانية Q3", status: "in_progress", priority: "high", due_at: inDays(2) },
    { user_id: userId, title: "مراجعة تقرير المخاطر الأمنية", status: "todo", priority: "medium", due_at: inDays(5) },
  ]);

  return { ok: true, userId };
});
