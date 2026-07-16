// System-coverage seeder — fills the last dashboard tables that no other
// seeder or migration populates, so the simulation covers 100% of the system
// (no empty module). Idempotent + realistic. Called from runSimulationSeed.
//
// Gap tables (from the coverage audit):
//   • intelligence_events    — user-scoped (executive fabric / twin)
//   • intelligence_alerts    — user-scoped (executive predictions / twin)
//   • business_outcomes      — user-scoped (executive command center)
//   • briefing_risks         — user-scoped (situation room · decision engine)
//   • briefing_opportunities — user-scoped (situation room · decision engine)
//   • briefing_actions       — user-scoped (situation room · decision engine)
//   • sec_vehicles           — org-scoped  (/sec/vehicles)
//   • cost_budgets           — org-scoped  (governance / observability)
//   • evolution_log          — global      (intelligence · self-evolution feed)
//   • learn_lessons          — global      (/learn module content)
//   • learn_quiz_questions   — global      (/learn quizzes)
// Tables without a metadata column stay idempotent via a deterministic
// sentinel (SIM:: label_en, SIMV- ref, sim- slug) or delete-by-known-value.
// Everything else the dashboards read is already seeded by migrations,
// per-user pulse auto-seed, or the sim/hcis-ptw seeders.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Rng } from "./sim.rng";

// biome-ignore lint/suspicious/noExplicitAny: dynamic (partly not-yet-typed) tables need an untyped admin client
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- loose admin client
type Admin = SupabaseClient<any, any, any>;

const EVENT_KINDS = [
  "decision",
  "initiative",
  "commitment",
  "risk",
  "recommendation",
  "meeting",
  "dependency",
  "escalation",
  "board_action",
] as const;

const EVENT_TITLES: Array<{ ar: string; kind: (typeof EVENT_KINDS)[number] }> = [
  { ar: "اعتماد خطة تعزيز المراقبة الإلكترونية للمنطقة الغربية", kind: "decision" },
  { ar: "مبادرة رفع جاهزية فرق الاستجابة للطوارئ", kind: "initiative" },
  { ar: "التزام بإغلاق فجوات الامتثال الحرجة قبل التفتيش القادم", kind: "commitment" },
  { ar: "خطر تأخّر تجديد تصاريح المقاولين في المنطقة الشرقية", kind: "risk" },
  { ar: "توصية بتوحيد منصة تصاريح العمل رقميًا عبر المناطق", kind: "recommendation" },
  { ar: "اجتماع مجلس الأمن الصناعي الأسبوعي", kind: "meeting" },
  { ar: "اعتماد ميزانية استبدال كاميرات المحيط", kind: "board_action" },
  { ar: "تصعيد بلاغ اقتحام محيطي غير محسوم", kind: "escalation" },
  { ar: "اعتماد جدول الدوريات المعزّزة لموسم الذروة", kind: "decision" },
  { ar: "مبادرة تدريب أفراد الأمن على أنظمة الكشف الجديدة", kind: "initiative" },
  { ar: "اعتماد إجراءات الإخلاء المحدّثة لمواقع ينبع", kind: "decision" },
  { ar: "التزام بإتمام تمارين الطوارئ ربع السنوية", kind: "commitment" },
  { ar: "توصية بربط التوأم الرقمي بتنبيهات التصاريح السارية", kind: "recommendation" },
  { ar: "تبعية: إتمام صيانة أنظمة الإنذار قبل التفتيش", kind: "dependency" },
];

const ALERT_TITLES = [
  "احتمال تجاوز مهلة معالجة فجوة امتثال حرجة",
  "ارتفاع غير معتاد في محاولات الدخول المرفوضة",
  "تصريح عمل ساخن يقترب من الانتهاء دون تجديد",
  "تأخّر صيانة كاميرا في نقطة حساسة",
  "توقّع ذروة دوريات خلال نهاية الأسبوع",
  "انخفاض جاهزية فريق استجابة في موقع",
  "احتمال تعارض جدول تفتيش مع تمرين طوارئ",
  "تنبيه استباقي: قرب انتهاء صلاحية تصاريح مقاول",
];

const OUTCOMES: Array<{ category: string; label: string; value: string; delta: string }> = [
  { category: "الامتثال", label: "نسبة الامتثال HCIS", value: "٨٧٪", delta: "+٤٪" },
  { category: "التصاريح", label: "تصاريح سارية الآن", value: "١٤", delta: "+٣" },
  { category: "الحوادث", label: "زمن الاستجابة للبلاغات", value: "١٨ دقيقة", delta: "-٦٪" },
  { category: "الدوريات", label: "التزام جدول الدوريات", value: "٩٤٪", delta: "+٢٪" },
  { category: "المراقبة", label: "جاهزية الكاميرات", value: "٩٦٪", delta: "+١٪" },
  { category: "الطوارئ", label: "تمارين إخلاء منفّذة", value: "٨", delta: "+٢" },
  { category: "المخاطر", label: "مخاطر حرجة مفتوحة", value: "٣", delta: "-١" },
  { category: "الأداء", label: "مؤشر الأداء التنفيذي", value: "٩١", delta: "+٥" },
];

const VEHICLE_TYPES = ["car", "truck", "van", "bus", "heavy_equipment"];
const DRIVERS = [
  "أحمد الغامدي",
  "خالد العتيبي",
  "سعد القحطاني",
  "فهد الدوسري",
  "ناصر الشهري",
  "بندر الحربي",
  "ماجد الزهراني",
];
const COMPANIES = ["البسّام", "سبكو", "نسما", "الزامل", "الكفاح"];

// ── Executive briefing detail lists (situation room / decision engine) ──────
// The read path (src/lib/exec/decisions.functions.ts) scopes only by user_id
// (RLS) and does not filter by briefing_id, so standalone rows render fine.
const BRIEF_RISKS: Array<{ ar: string; en: string; level: string; probability: number }> = [
  {
    ar: "تأخّر إغلاق فجوات الامتثال الحرجة قبل التفتيش القادم",
    en: "Delay closing critical compliance gaps before next inspection",
    level: "critical",
    probability: 82,
  },
  {
    ar: "نقص تغطية الكاميرات في محيط المنطقة الشرقية",
    en: "Perimeter camera coverage gap — Eastern region",
    level: "high",
    probability: 71,
  },
  {
    ar: "اقتراب انتهاء تصاريح مقاولين دون تجديد",
    en: "Contractor permits nearing expiry without renewal",
    level: "high",
    probability: 64,
  },
  {
    ar: "ضعف جاهزية فريق استجابة في موقع ينبع",
    en: "Reduced response-team readiness at Yanbu site",
    level: "medium",
    probability: 48,
  },
];

const BRIEF_OPPS: Array<{ ar: string; en: string; potential: number }> = [
  {
    ar: "توحيد منصة تصاريح العمل رقميًا يخفض زمن الإصدار ٤٠٪",
    en: "Unifying digital PTW cuts issuance time by 40%",
    potential: 88,
  },
  {
    ar: "ربط التوأم الرقمي بتنبيهات التصاريح لرفع الاستباقية",
    en: "Linking the digital twin to permit alerts boosts foresight",
    potential: 76,
  },
  {
    ar: "أتمتة تقارير جاهزية HCIS توفّر ساعات عمل أسبوعية",
    en: "Automating HCIS readiness reports saves weekly labor",
    potential: 69,
  },
];

const BRIEF_ACTIONS: Array<{ ar: string; en: string; priority: number }> = [
  {
    ar: "اعتماد خطة معالجة الفجوات الحرجة خلال ٧ أيام",
    en: "Approve critical-gap remediation plan within 7 days",
    priority: 92,
  },
  {
    ar: "جدولة تفتيش استباقي للمنطقة الشرقية",
    en: "Schedule a proactive Eastern-region inspection",
    priority: 78,
  },
  {
    ar: "تكليف فريق بتجديد تصاريح المقاولين المنتهية",
    en: "Assign a team to renew expiring contractor permits",
    priority: 66,
  },
];

// ── Cost budgets (governance / observability) — org-scoped, UNIQUE(org,scope) ─
const COST_BUDGETS: Array<{ scope: string; cap: number; threshold: number }> = [
  { scope: "ai_gateway", cap: 2500, threshold: 80 },
  { scope: "storage", cap: 600, threshold: 75 },
  { scope: "messaging", cap: 400, threshold: 85 },
  { scope: "compute", cap: 1800, threshold: 80 },
];

// ── Self-evolution applied-log (intelligence dashboard) — global, no metadata ─
// Idempotent via delete-by-known-value on these exact summaries.
const EVO_SUMMARIES = [
  "تحسين دقة تصنيف بلاغات الأمن الصناعي بنسبة ٦٪ بعد ضبط نموذج التصنيف.",
  "تقصير مسار موافقات تصاريح العمل الساخن بخطوة واحدة دون المساس بالأمان.",
  "إضافة ربط تلقائي بين فجوات الامتثال وخطط المعالجة المقترحة.",
  "تحسين توقيت تنبيهات قرب انتهاء التصاريح لتقليل الإنذارات المتأخرة.",
  "ضبط عتبات كشف محاولات الدخول المرفوضة لتقليل الإنذارات الكاذبة.",
  "تحديث ملخّصات آريا التنفيذية لتكون أكثر إيجازًا واعتمادًا على البيانات.",
];

// ── /learn module content — global, idempotent via `sim-` slug prefix ────────
type SimLesson = {
  slug: string;
  order_index: number;
  category: string;
  title_ar: string;
  title_en: string;
  subtitle_ar: string;
  subtitle_en: string;
  summary_ar: string;
  summary_en: string;
  quiz: Array<{
    prompt_ar: string;
    prompt_en: string;
    options_ar: string[];
    options_en: string[];
    correct_index: number;
    explanation_ar: string;
  }>;
};

const LEARN_LESSONS: SimLesson[] = [
  {
    slug: "sim-hcis-basics",
    order_index: 1,
    category: "compliance",
    title_ar: "أساسيات الامتثال HCIS",
    title_en: "HCIS Compliance Basics",
    subtitle_ar: "فهم فئات الأمن الصناعي ومصفوفة الامتثال",
    subtitle_en: "Understanding industrial-security categories and the compliance matrix",
    summary_ar:
      "تعرّف على فئات الامتثال الست، وكيف تُقرأ مصفوفة الامتثال (الفئة × المنطقة)، وكيفية تتبّع الفجوات وخطط المعالجة استعدادًا للتفتيش.",
    summary_en:
      "Learn the six compliance categories, how to read the compliance matrix (category × region), and how to track gaps and remediation plans ahead of inspection.",
    quiz: [
      {
        prompt_ar: "ماذا تمثّل خلايا مصفوفة الامتثال؟",
        prompt_en: "What do the compliance-matrix cells represent?",
        options_ar: ["الفئة مقابل المنطقة", "الموظف مقابل المهمة", "التكلفة مقابل الزمن"],
        options_en: ["Category vs region", "Employee vs task", "Cost vs time"],
        correct_index: 0,
        explanation_ar: "تعرض المصفوفة حالة كل فئة امتثال ضمن كل منطقة من المناطق الأربع.",
      },
      {
        prompt_ar: "متى يتحوّل عدّاد موعد الفجوة إلى الأحمر؟",
        prompt_en: "When does a gap's due-date counter turn red?",
        options_ar: ["عند التأخّر عن الموعد", "عند الإنشاء", "بعد الإغلاق"],
        options_en: ["When past due", "On creation", "After closure"],
        correct_index: 0,
        explanation_ar: "يتحوّل العدّاد إلى الأحمر عند تجاوز الموعد النهائي لخطة المعالجة.",
      },
    ],
  },
  {
    slug: "sim-ptw-lifecycle",
    order_index: 2,
    category: "operations",
    title_ar: "دورة حياة تصاريح العمل الرقمية",
    title_en: "Digital PTW Lifecycle",
    subtitle_ar: "من الإنشاء إلى الاعتماد والتحقّق الميداني",
    subtitle_en: "From creation to approval and field verification",
    summary_ar:
      "تابع رحلة تصريح العمل عبر سلسلة الموافقات (مشرف العمل ← السلامة ← الأمن الصناعي)، ودور رمز QR في التحقّق الميداني، والتعليق الطارئ خلف تأكيد بشري.",
    summary_en:
      "Follow a permit through the approval chain (work supervisor → safety → industrial security), the role of the QR code in field verification, and emergency suspension behind human confirmation.",
    quiz: [
      {
        prompt_ar: "ما ترتيب سلسلة موافقات تصريح العمل؟",
        prompt_en: "What is the permit approval chain order?",
        options_ar: [
          "مشرف العمل ← السلامة ← الأمن الصناعي",
          "الأمن الصناعي ← السلامة ← المشرف",
          "السلامة ← المشرف ← الأمن",
        ],
        options_en: [
          "Supervisor → Safety → Industrial Security",
          "Industrial Security → Safety → Supervisor",
          "Safety → Supervisor → Security",
        ],
        correct_index: 0,
        explanation_ar: "يبدأ الاعتماد من مشرف العمل ثم مسؤول السلامة ثم مسؤول الأمن الصناعي.",
      },
      {
        prompt_ar: "ماذا يفتح مسح رمز QR للتصريح؟",
        prompt_en: "What does scanning a permit's QR code open?",
        options_ar: ["صفحة تحقّق عامة", "لوحة الأدمن", "نموذج إنشاء تصريح"],
        options_en: ["A public verification page", "The admin panel", "A permit-creation form"],
        correct_index: 0,
        explanation_ar: "يفتح الرمز صفحة تحقّق عامة تعرض صلاحية التصريح وتفاصيله الآمنة.",
      },
    ],
  },
  {
    slug: "sim-incident-response",
    order_index: 3,
    category: "core",
    title_ar: "الاستجابة للحوادث الأمنية",
    title_en: "Security Incident Response",
    subtitle_ar: "من البلاغ إلى الإغلاق مع قياس زمن الاستجابة",
    subtitle_en: "From report to closure with response-time measurement",
    summary_ar:
      "افهم دورة حياة البلاغ الأمني، وكيف يقيس النظام زمن الاستجابة، ومتى يُصعَّد البلاغ، وكيف تتحوّل الحوادث إلى إجراءات تصحيحية متابَعة.",
    summary_en:
      "Understand the security-incident lifecycle, how the system measures response time, when to escalate, and how incidents turn into tracked corrective actions.",
    quiz: [
      {
        prompt_ar: "ما المؤشر الأساسي لجودة الاستجابة للبلاغ؟",
        prompt_en: "What is the key indicator of incident response quality?",
        options_ar: ["زمن الاستجابة", "عدد الكاميرات", "حجم الميزانية"],
        options_en: ["Response time", "Number of cameras", "Budget size"],
        correct_index: 0,
        explanation_ar: "زمن الاستجابة من البلاغ إلى المعالجة هو المؤشر المحوري لجودة الاستجابة.",
      },
    ],
  },
  {
    slug: "sim-aria-executive",
    order_index: 4,
    category: "core",
    title_ar: "آريا في القرار التنفيذي",
    title_en: "ARIA for Executive Decisions",
    subtitle_ar: "كيف تستمد آريا معلوماتها من المحاكاة وقاعدة البيانات",
    subtitle_en: "How ARIA grounds answers in the simulation and database",
    summary_ar:
      "تعلّم كيف تجيب آريا باختصار واعتمادًا على المحاكاة وقاعدة البيانات فقط، وكيف تستخدم أدوات الامتثال والتصاريح، ومتى تُرسل البريد والرسائل نيابة عنك.",
    summary_en:
      "Learn how ARIA answers concisely grounded only in the simulation and database, how it uses compliance and permit tools, and when it sends email and SMS on your behalf.",
    quiz: [
      {
        prompt_ar: "من أين تستمد آريا معلوماتها؟",
        prompt_en: "Where does ARIA source its information?",
        options_ar: ["المحاكاة وقاعدة البيانات فقط", "الإنترنت المفتوح", "تخمينات عامة"],
        options_en: ["Simulation and database only", "The open internet", "General guesses"],
        correct_index: 0,
        explanation_ar: "آريا مقيّدة بالمحاكاة وقاعدة البيانات فقط لضمان دقّة وموثوقية الإجابات.",
      },
    ],
  },
];

export async function seedSystemCoverage(
  admin: Admin,
  opts: { orgId: string; userId?: string | null; seed: number; rng: Rng; siteIds: string[] },
): Promise<Record<string, number>> {
  const { orgId, userId, seed, rng, siteIds } = opts;
  const tag = { sim_seed: seed };
  const counts: Record<string, number> = {};
  const now = Date.now();
  const iso = (offsetDays: number) => new Date(now + offsetDays * 86_400_000).toISOString();

  // ── User-scoped executive tables (only if we have the seeding user) ──────
  if (userId) {
    // intelligence_events — tagged + purged by metadata.sim_seed
    await admin
      .from("intelligence_events")
      .delete()
      .eq("user_id", userId)
      .contains("metadata", tag);
    const events = EVENT_TITLES.map((e, i) => ({
      user_id: userId,
      kind: e.kind,
      title: e.ar,
      status: rng.pick(["open", "open", "in_progress", "in_progress", "blocked", "done"]),
      impact: rng.pick(["low", "medium", "medium", "high", "critical"]),
      progress: rng.int(0, 100),
      owner: `تنفيذي ${rng.int(1, 8)}`,
      department: rng.pick(["الأمن الصناعي", "السلامة", "العمليات", "المشاريع"]),
      due_at: iso(rng.int(-10, 30)),
      last_update: iso(-rng.int(0, 6)),
      metadata: { sim_seed: seed, idx: i },
    }));
    const { error: evErr } = await admin.from("intelligence_events").insert(events);
    if (evErr) throw new Error(`[intelligence_events] ${evErr.message}`);
    counts.intelligence_events = events.length;

    // intelligence_alerts
    await admin
      .from("intelligence_alerts")
      .delete()
      .eq("user_id", userId)
      .contains("metadata", tag);
    const alerts = ALERT_TITLES.map((t) => ({
      user_id: userId,
      severity: rng.pick(["low", "medium", "medium", "high", "critical"]),
      title: t,
      detail: "تنبيه استباقي مولّد من محاكاة النظام.",
      business_impact_score: rng.int(35, 95),
      owner: `مسؤول ${rng.int(1, 6)}`,
      metadata: { sim_seed: seed },
    }));
    const { error: alErr } = await admin.from("intelligence_alerts").insert(alerts);
    if (alErr) throw new Error(`[intelligence_alerts] ${alErr.message}`);
    counts.intelligence_alerts = alerts.length;

    // business_outcomes — no metadata column → purge all sim rows for this user
    // by the deterministic sentinel category prefix.
    await admin.from("business_outcomes").delete().eq("user_id", userId).like("label_en", "SIM::%");
    const outcomes = OUTCOMES.map((o) => ({
      user_id: userId,
      category: o.category,
      label: o.label,
      label_en: `SIM::${o.category}`,
      value: o.value,
      delta: o.delta,
    }));
    const { error: boErr } = await admin.from("business_outcomes").insert(outcomes);
    if (boErr) throw new Error(`[business_outcomes] ${boErr.message}`);
    counts.business_outcomes = outcomes.length;

    // briefing_risks / _opportunities / _actions — no metadata column → purge
    // by our exact known titles (delete-by-value) so re-seeds stay idempotent
    // and never touch real ARIA-generated briefing rows.
    await admin
      .from("briefing_risks")
      .delete()
      .eq("user_id", userId)
      .in(
        "title",
        BRIEF_RISKS.map((r) => r.ar),
      );
    const briefRisks = BRIEF_RISKS.map((r) => ({
      user_id: userId,
      title: r.ar,
      title_en: r.en,
      level: r.level,
      probability: r.probability,
    }));
    const { error: brErr } = await admin.from("briefing_risks").insert(briefRisks);
    if (brErr) throw new Error(`[briefing_risks] ${brErr.message}`);
    counts.briefing_risks = briefRisks.length;

    await admin
      .from("briefing_opportunities")
      .delete()
      .eq("user_id", userId)
      .in(
        "title",
        BRIEF_OPPS.map((o) => o.ar),
      );
    const briefOpps = BRIEF_OPPS.map((o) => ({
      user_id: userId,
      title: o.ar,
      title_en: o.en,
      potential: o.potential,
    }));
    const { error: boppErr } = await admin.from("briefing_opportunities").insert(briefOpps);
    if (boppErr) throw new Error(`[briefing_opportunities] ${boppErr.message}`);
    counts.briefing_opportunities = briefOpps.length;

    await admin
      .from("briefing_actions")
      .delete()
      .eq("user_id", userId)
      .in(
        "title",
        BRIEF_ACTIONS.map((a) => a.ar),
      );
    const briefActions = BRIEF_ACTIONS.map((a) => ({
      user_id: userId,
      title: a.ar,
      title_en: a.en,
      priority: a.priority,
    }));
    const { error: baErr } = await admin.from("briefing_actions").insert(briefActions);
    if (baErr) throw new Error(`[briefing_actions] ${baErr.message}`);
    counts.briefing_actions = briefActions.length;
  }

  // ── Org-scoped vehicles (/sec/vehicles) — ref sentinel for idempotency ───
  await admin.from("sec_vehicles").delete().eq("org_id", orgId).like("ref", "SIMV-%");
  const vehicles = Array.from({ length: 16 }, (_v, i) => {
    const status = rng.pick(["expected", "inside", "inside", "left", "denied"]);
    return {
      org_id: orgId,
      ref: `SIMV-${String(2000 + i)}`,
      plate: `${rng.pick(["أ", "ب", "ج", "د", "هـ"])} ${rng.int(1000, 9999)}`,
      vehicle_type: rng.pick(VEHICLE_TYPES),
      driver_name: rng.pick(DRIVERS),
      company: rng.pick(COMPANIES),
      status,
      site_id: siteIds.length ? rng.pick(siteIds) : null,
      check_in_at: status === "inside" || status === "left" ? iso(-rng.int(0, 1)) : null,
      check_out_at: status === "left" ? iso(0) : null,
    };
  });
  const { error: vErr } = await admin.from("sec_vehicles").insert(vehicles);
  if (vErr) throw new Error(`[sec_vehicles] ${vErr.message}`);
  counts.sec_vehicles = vehicles.length;

  // ── Org-scoped cost budgets (governance / observability) ─────────────────
  // UNIQUE(org_id, scope) → upsert on conflict keeps it idempotent.
  const budgets = COST_BUDGETS.map((b) => ({
    org_id: orgId,
    scope: b.scope,
    monthly_cap_usd: b.cap,
    alert_threshold_pct: b.threshold,
    enabled: true,
  }));
  const { error: cbErr } = await admin
    .from("cost_budgets")
    .upsert(budgets, { onConflict: "org_id,scope" });
  if (cbErr) throw new Error(`[cost_budgets] ${cbErr.message}`);
  counts.cost_budgets = budgets.length;

  // ── Global self-evolution applied-log (intelligence dashboard) ───────────
  // No org/user scope + no metadata → purge by our exact known summaries.
  await admin.from("evolution_log").delete().in("summary_ar", EVO_SUMMARIES);
  const evoRows = EVO_SUMMARIES.map((s, i) => ({
    summary_ar: s,
    applied_at: iso(-i - rng.int(0, 2)),
  }));
  const { error: elErr } = await admin.from("evolution_log").insert(evoRows);
  if (elErr) throw new Error(`[evolution_log] ${elErr.message}`);
  counts.evolution_log = evoRows.length;

  // ── Global /learn content (lessons + quizzes) ────────────────────────────
  // Idempotent via `sim-` slug prefix; deleting a lesson cascades its quiz
  // questions (ON DELETE CASCADE), so purge lessons then re-insert both.
  await admin.from("learn_lessons").delete().like("slug", "sim-%");
  const lessonRows = LEARN_LESSONS.map((l) => ({
    slug: l.slug,
    order_index: l.order_index,
    category: l.category,
    title_ar: l.title_ar,
    title_en: l.title_en,
    subtitle_ar: l.subtitle_ar,
    subtitle_en: l.subtitle_en,
    summary_ar: l.summary_ar,
    summary_en: l.summary_en,
    published: true,
  }));
  const { data: insertedLessons, error: llErr } = await admin
    .from("learn_lessons")
    .insert(lessonRows)
    .select("id, slug");
  if (llErr) throw new Error(`[learn_lessons] ${llErr.message}`);
  counts.learn_lessons = (insertedLessons ?? []).length;

  const idBySlug = new Map(
    (insertedLessons ?? []).map((r: { id: string; slug: string }) => [r.slug, r.id]),
  );
  const quizRows = LEARN_LESSONS.flatMap((l) => {
    const lessonId = idBySlug.get(l.slug);
    if (!lessonId) return [];
    return l.quiz.map((q, qi) => ({
      lesson_id: lessonId,
      order_index: qi + 1,
      prompt_ar: q.prompt_ar,
      prompt_en: q.prompt_en,
      options_ar: q.options_ar,
      options_en: q.options_en,
      correct_index: q.correct_index,
      explanation_ar: q.explanation_ar,
    }));
  });
  if (quizRows.length) {
    const { error: lqErr } = await admin.from("learn_quiz_questions").insert(quizRows);
    if (lqErr) throw new Error(`[learn_quiz_questions] ${lqErr.message}`);
  }
  counts.learn_quiz_questions = quizRows.length;

  return counts;
}
