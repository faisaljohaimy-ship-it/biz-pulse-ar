// ARIA Corpus Seeder — populates aria_knowledge with the Industrial Security
// Department (Western Region) operational corpus. Admin-only. Idempotent:
// re-running skips titles already present for the active org.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireOrgContext } from "@/lib/org/org-middleware";
import { hasPlatformRole } from "@/lib/authz.server";
import { embedText, toPgVector } from "./embeddings.server";

type Entry = { title: string; source: string; tags: string[]; content: string };

const CORPUS: Entry[] = [
  // ---- Governance & Policy ----
  {
    title: "ميثاق إدارة الأمن الصناعي — المنطقة الغربية",
    source: "policy/charter",
    tags: ["governance", "charter", "ar"],
    content: `تتولى إدارة الأمن الصناعي بالمنطقة الغربية حماية الأصول والأفراد والعمليات في مواقع جدة ومكة المكرمة وينبع. تختص الإدارة بحوكمة الحوادث، التصاريح، الدوريات، أوامر العمل، والتفتيش الأمني، وفق معايير NFPA 600 و ISO 28000 و ISPS و OSHA 1910. تعتمد الإدارة منهجية الحوكمة الثلاثية (وقاية – استجابة – تحسين) وتقدم تقارير تنفيذية أسبوعية لرئيس قطاع العمليات.`,
  },
  {
    title: "Industrial Security Department — Operating Charter",
    source: "policy/charter-en",
    tags: ["governance", "charter", "en"],
    content: `The Industrial Security Department (Western Region) safeguards assets, personnel, and operations across Jeddah, Makkah, and Yanbu sites. Mandate covers incident governance, permits, patrols, work orders, and security inspections aligned to NFPA 600, ISO 28000, ISPS, and OSHA 1910. Operating model is Prevent → Respond → Improve with weekly executive reporting to Operations.`,
  },
  {
    title: "سياسة تصنيف الحوادث (P1–P5)",
    source: "policy/incident-severity",
    tags: ["incidents", "policy", "severity"],
    content: `يتم تصنيف الحوادث على خمس درجات: P1 طارئ يهدد الحياة أو الإنتاج (إخلاء فوري، إبلاغ الرئيس التنفيذي خلال 15 دقيقة)؛ P2 مرتفع (تأثير على عمليات حرجة، إبلاغ مدير العمليات خلال 30 دقيقة)؛ P3 متوسط (تأثير محدود، تسجيل + استجابة خلال 4 ساعات)؛ P4 منخفض (مراقبة + معالجة خلال 24 ساعة)؛ P5 ملاحظة (تسجيل وأرشفة). تُفتح أوامر عمل تلقائياً لكل حادث P1/P2.`,
  },
  {
    title: "Permit-to-Work (PTW) — Hot Work / Confined Space / Working at Height",
    source: "policy/ptw",
    tags: ["permits", "safety", "ptw"],
    content: `All hot work, confined-space entry, and working-at-height activities require an approved PTW prior to execution. Issuer must validate JSA, gas test (LEL < 10%, O2 19.5–23.5%), fire watch assignment, and rescue plan. PTW validity max 12 hours; renewal requires re-test. Concurrent PTWs on the same asset must be cross-checked by the Permit Coordinator.`,
  },
  {
    title: "سياسة دخول الزوار والمقاولين",
    source: "policy/visitor-access",
    tags: ["access", "visitors", "contractors"],
    content: `يُمنع دخول أي زائر أو مقاول بدون: (1) هوية وطنية/إقامة سارية، (2) موافقة مسبقة من الجهة المستضيفة، (3) إحاطة سلامة (Safety Induction) سارية لمدة 12 شهراً، (4) تصريح مركبة عند الدخول بسيارة. يُسلّم الزائر شارة مؤقتة ويُرافَق طوال الزيارة في المناطق المقيدة. المقاولون يُسجَّلون في sec_contractors مع وثائق التأمين وشهادات HSE.`,
  },

  // ---- SOPs ----
  {
    title: "SOP — الاستجابة لحريق في المباني الإدارية",
    source: "sop/fire-response-admin",
    tags: ["sop", "fire", "response"],
    content: `عند اكتشاف حريق: 1) تفعيل أقرب نقطة إنذار، 2) إبلاغ غرفة التحكم على الرمز Code Red متبوعاً بالموقع، 3) بدء الإخلاء عبر مسارات الطوارئ المعلّمة، 4) تجميع الموظفين في نقاط التجمع، 5) رئيس الفريق يجري نداء الأسماء ويبلغ القائد الميداني، 6) فرق الإطفاء الداخلية تتعامل مع الحرائق الصغيرة (Class A/B) باستخدام مطافئ CO2/Dry Powder، 7) استدعاء الدفاع المدني فوراً لأي حريق تجاوز 1 متر مربع.`,
  },
  {
    title: "SOP — Incident Triage at Control Room",
    source: "sop/triage-control-room",
    tags: ["sop", "control-room", "triage"],
    content: `Control room operator receives event (CCTV, sensor, radio, hotline). Within 60 seconds: 1) classify P1–P5, 2) create record in sec_incidents with site/zone/category, 3) dispatch nearest patrol team via sec_patrols, 4) notify Shift Supervisor for P1/P2, 5) open work order if asset impacted, 6) keep voice log on dispatch channel, 7) update status every 5 minutes until closed.`,
  },
  {
    title: "SOP — تفتيش البوابات الرئيسية",
    source: "sop/gate-inspection",
    tags: ["sop", "gates", "inspection"],
    content: `يقوم ضابط البوابة بفحص دوري كل ساعتين يشمل: (1) كاميرات ANPR تعمل وتسجل، (2) حواجز Arm-Barrier تستجيب خلال 3 ثوانٍ، (3) قارئ البطاقات يقرأ بنجاح، (4) إنارة محيط البوابة سليمة، (5) مسجل CCTV يخزن آخر 30 يوم. أي عطل يفتح أمر عمل P3 فوراً ويُبلغ مشرف الوردية.`,
  },
  {
    title: "SOP — Patrol Route Compliance",
    source: "sop/patrol-compliance",
    tags: ["sop", "patrols"],
    content: `Each patrol team follows assigned route with NFC checkpoint scans. Minimum 8 checkpoints per 4-hour shift. Missed checkpoint > 15 minutes triggers automatic alert to Shift Supervisor. Incident or anomaly during patrol must be logged in sec_patrols with photo evidence. Patrol leader signs off route closure at end of shift.`,
  },
  {
    title: "SOP — الاستجابة لتسرب مواد خطرة (HazMat)",
    source: "sop/hazmat",
    tags: ["sop", "hazmat", "emergency"],
    content: `1) إخلاء المنطقة بنصف قطر 50 متراً، 2) تحديد المادة من ورقة SDS، 3) إبلاغ غرفة التحكم Code Yellow، 4) ارتداء PPE المناسب (Level B/C حسب المادة)، 5) عزل المصدر إن أمكن دون مخاطرة، 6) استدعاء فريق HazMat المعتمد، 7) تسجيل الحادث P1 وفتح تحقيق فوري، 8) إخطار البيئة والصحة المهنية خلال ساعة.`,
  },

  // ---- KPIs ----
  {
    title: "KPIs — الأمن الصناعي (المنطقة الغربية)",
    source: "kpi/catalog",
    tags: ["kpi", "metrics"],
    content: `أبرز المؤشرات: MTTR للحوادث P1 ≤ 30 دقيقة، MTTR P2 ≤ 2 ساعة. التزام الدوريات ≥ 95% من نقاط التفتيش. توفر CCTV ≥ 99%. عدد التصاريح المعلقة > 24 ساعة = صفر. التزام إغلاق أوامر العمل خلال SLA ≥ 90%. زمن الاستجابة من بلاغ إلى وصول أقرب فريق ≤ 6 دقائق داخل المواقع. تقارير تنفيذية أسبوعية كل يوم أحد 08:00.`,
  },
  {
    title: "KPI Calculation Rules",
    source: "kpi/formulas",
    tags: ["kpi", "formulas"],
    content: `MTTR = sum(resolved_at - reported_at) / count(closed incidents in period). Patrol compliance = scanned_checkpoints / scheduled_checkpoints × 100. CCTV availability = uptime_minutes / total_minutes × 100. Permit overdue rate = count(permits with status='pending' and created_at < now-24h) / total_pending × 100. Work order SLA compliance = count(closed within sla) / count(closed) × 100.`,
  },

  // ---- Workflows ----
  {
    title: "Workflow — Incident Response Lifecycle",
    source: "workflow/incident-response",
    tags: ["workflow", "incident"],
    content: `Trigger: new row in sec_incidents. Steps: (1) ARIA risk scoring → assigns severity confidence; (2) dispatch nearest patrol via sec_patrol_teams.proximity; (3) if P1/P2 → page Shift Supervisor + open work order; (4) collect evidence (CCTV clips, photos, witness statements); (5) root-cause analysis using 5-Whys; (6) corrective actions tracked in sec_work_orders; (7) closure review by Manager; (8) publish post-incident summary to executive dashboard.`,
  },
  {
    title: "Workflow — Permit Approval",
    source: "workflow/permit-approval",
    tags: ["workflow", "permits"],
    content: `Permit applicant submits form → auto-validation (PPE checklist, JSA attached, requester certified) → Permit Coordinator review → Site Authority approval → ARIA risk flag if high-hazard → activation. Any rejection routes back to applicant with reason. Approved permits push notification to Shift Supervisor and create timer for expiry.`,
  },
  {
    title: "Workflow — Visitor Check-in",
    source: "workflow/visitor-checkin",
    tags: ["workflow", "visitors"],
    content: `Pre-registration in sec_visitors (host approved) → on-arrival ID scan at gate → badge print with photo → escort assignment for restricted zones → check-out scan releases badge. Overstay > 30 min beyond planned exit triggers gate officer alert and host notification. Daily visitor log auto-generated for compliance.`,
  },
  {
    title: "Workflow — Patrol Overdue Escalation",
    source: "workflow/patrol-overdue",
    tags: ["workflow", "patrols"],
    content: `If checkpoint not scanned within 15 min of scheduled time → automatic alert to Shift Supervisor + radio call. After 30 min → Manager escalation + dispatch standby team to verify patrol safety. Pattern of repeated overdue routes (>3 in week) triggers route optimization review.`,
  },
  {
    title: "Workflow — Daily KPI Snapshot",
    source: "workflow/daily-kpi",
    tags: ["workflow", "kpi"],
    content: `Cron 06:00 local → compute incidents (open/closed/by severity), patrol compliance %, CCTV uptime, permits pending, work orders SLA → write to hajj_kpi_snapshots and aria_reports → render PDF + Excel via report builder → email distribution list configured in report_schedules.`,
  },

  // ---- ARIA Guidance ----
  {
    title: "ARIA Operating Principles",
    source: "aria/principles",
    tags: ["aria", "principles"],
    content: `ARIA is the executive AI engine of NEXUS AI OS. It must: (1) ground every answer in cited records from sec_*/hajj_*/audit_logs; (2) prefer Arabic when user writes Arabic; (3) never fabricate incident IDs or KPI values; (4) flag uncertainty explicitly; (5) recommend next-best-actions tied to existing workflows; (6) escalate P1/P2 risk findings to Shift Supervisor automatically. Refuse to mutate data without explicit user confirmation.`,
  },
  {
    title: "ARIA Tone & Bilingual Style",
    source: "aria/style",
    tags: ["aria", "style"],
    content: `Executive tone: concise, evidence-led, no marketing fluff. Arabic responses use formal MSA with security/HSE terminology (الحادث، التصريح، الدورية، أمر العمل). English responses prefer active voice and operational verbs (dispatch, escalate, close, mitigate). Always include a one-line "Recommendation" at the end of analytical answers.`,
  },
  {
    title: "ARIA Escalation Matrix",
    source: "aria/escalation",
    tags: ["aria", "escalation"],
    content: `P1 → page Shift Supervisor + Operations Manager + open executive briefing item. P2 → Shift Supervisor + manager notification. P3 → log + supervisor email digest. Patrol non-compliance > 20% → Manager. CCTV outage > 30 min → Engineering + Manager. Permit backlog > 10 pending → Permit Coordinator + Manager. Any data integrity anomaly → Engineering on-call.`,
  },

  // ---- Compliance ----
  {
    title: "متطلبات الامتثال — Saudi HCIS & OSHA",
    source: "compliance/hcis-osha",
    tags: ["compliance", "hcis", "osha"],
    content: `يلتزم النظام بمعايير المركز الوطني للأمن الصناعي (HCIS) السعودي ومتطلبات OSHA 1910 ذات الصلة: تفتيش معدات الإطفاء شهرياً، تدريب CPR/First Aid سنوياً، فحص أنظمة الإنذار ربع سنوياً، أرشفة بيانات CCTV 90 يوم، تسجيل كافة الحوادث ضمن 24 ساعة. التدقيق الداخلي كل 6 أشهر والخارجي سنوياً.`,
  },
  {
    title: "Data Retention & Audit Trail",
    source: "compliance/retention",
    tags: ["compliance", "audit", "retention"],
    content: `audit_logs retained 7 years (immutable). CCTV footage 90 days standard, 1 year for incident-linked clips. sec_incidents records retained 10 years. Access logs (sec_visitors, sec_vehicles) retained 2 years. ARIA conversation logs retained 1 year, anonymized after 90 days. All retention enforced via scheduled jobs and DB triggers.`,
  },

  // ---- Sites ----
  {
    title: "مواقع المنطقة الغربية — جدة",
    source: "sites/jeddah",
    tags: ["sites", "jeddah"],
    content: `موقع جدة: مساحة 240 ألف م²، 4 بوابات رئيسية (G1 شمالي، G2 جنوبي، G3 لوجستي، G4 طوارئ)، 86 كاميرا CCTV، 12 غرفة تحكم فرعية وغرفة مركزية واحدة، 4 فرق دوريات (24/7). المخاطر الرئيسية: ازدحام لوجستي، رياح موسمية، مخاطر بحرية.`,
  },
  {
    title: "مواقع المنطقة الغربية — مكة المكرمة",
    source: "sites/makkah",
    tags: ["sites", "makkah"],
    content: `موقع مكة: حساسية تشغيلية عالية خصوصاً في موسم الحج. 6 بوابات، 142 كاميرا، تكامل مع غرفة عمليات المشاعر. متطلبات إضافية: تنسيق مع أمن الحرم، إخلاء جماهيري، خطط Plan-B لكثافة الحشود > 80%.`,
  },
  {
    title: "مواقع المنطقة الغربية — ينبع",
    source: "sites/yanbu",
    tags: ["sites", "yanbu"],
    content: `موقع ينبع: طبيعة صناعية بتروكيماوية. مخاطر HazMat مرتفعة. 3 بوابات، 64 كاميرا، 2 فريق HazMat معتمد. تنسيق مستمر مع الهيئة الملكية للجبيل وينبع وإدارة الطوارئ الصناعية. تفتيش يومي لخطوط الأنابيب وصمامات الأمان.`,
  },

  // ---- Operational ----
  {
    title: "أدوار الورديات — جدول 24/7",
    source: "ops/shifts",
    tags: ["operations", "shifts"],
    content: `ثلاث ورديات: A (06:00–14:00)، B (14:00–22:00)، C (22:00–06:00). كل وردية: مشرف وردية + 2 مراقب غرفة تحكم + 4 فرق ميدانية (3 أفراد لكل فريق) + ضابط بوابة لكل بوابة. التسليم بين الورديات يتطلب نموذج Handover موثق ومراجعة الحوادث المفتوحة.`,
  },
  {
    title: "Radio Communication Codes",
    source: "ops/radio-codes",
    tags: ["operations", "radio"],
    content: `Code Red = fire / Code Yellow = HazMat / Code Blue = medical emergency / Code Black = security threat (armed/intruder) / Code Green = drill / Code White = VIP movement / 10-4 = acknowledged / 10-20 = location request / 10-33 = emergency, clear channel. All codes followed by site + zone identifier.`,
  },
  {
    title: "Equipment — PPE Standard Issue",
    source: "ops/ppe",
    tags: ["operations", "ppe"],
    content: `Standard patrol PPE: high-visibility vest, safety shoes (steel toe), hard hat in industrial zones, two-way radio, flashlight, body-worn camera. HazMat additional: SCBA, Level B/C suit, gas detector (4-gas). Hot-work fire watch: face shield, fire blanket, 9-kg dry powder extinguisher.`,
  },
  {
    title: "Investigation — 5 Whys Template",
    source: "investigation/5-whys",
    tags: ["investigation", "rca"],
    content: `For each incident closed P1/P2/P3: document problem statement, then ask "why" five times to reach root cause. Map each why to category (Human / Process / Equipment / Environment / Management). Generate corrective action with owner + due date + verification method. Store in sec_incidents.investigation_notes and link to sec_work_orders.`,
  },
  {
    title: "Glossary — Industrial Security Terms (AR/EN)",
    source: "reference/glossary",
    tags: ["reference", "glossary"],
    content: `Incident = حادث | Permit = تصريح | Patrol = دورية | Work Order = أمر عمل | Asset = أصل | Site = موقع | Gate = بوابة | Shift = وردية | Control Room = غرفة تحكم | Visitor = زائر | Contractor = مقاول | Hazard = خطر | Risk = مخاطرة | Mitigation = إجراء وقائي | Escalation = تصعيد | Root Cause = السبب الجذري | SLA = اتفاقية مستوى الخدمة.`,
  },
];

export const seedAriaCorpus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireOrgContext])
  .handler(async ({ context }) => {
    const { supabase, userId, orgId } = context;

    // Admin gate
    const isAdmin = await hasPlatformRole(userId, "admin");
    if (!isAdmin) throw new Error("Forbidden: admin role required");

    // Skip titles already present in this org
    const { data: existing } = await supabase
      .from("aria_knowledge")
      .select("title")
      .eq("org_id", orgId);
    const have = new Set((existing ?? []).map((r) => r.title));
    const todo = CORPUS.filter((e) => !have.has(e.title));

    if (todo.length === 0) {
      return { inserted: 0, skipped: CORPUS.length, total: CORPUS.length };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let inserted = 0;
    const failures: string[] = [];

    // Embed sequentially in small batches to respect rate limits
    const CONCURRENCY = 4;
    for (let i = 0; i < todo.length; i += CONCURRENCY) {
      const slice = todo.slice(i, i + CONCURRENCY);
      const rows = await Promise.all(
        slice.map(async (e) => {
          const vec = await embedText(`${e.title}\n\n${e.content}`);
          if (!vec) {
            failures.push(e.title);
            return null;
          }
          return {
            title: e.title,
            source: e.source,
            tags: e.tags,
            content: e.content,
            embedding: toPgVector(vec),
            org_id: orgId,
          };
        }),
      );
      const valid = rows.filter((r): r is NonNullable<typeof r> => r !== null);
      if (valid.length === 0) continue;
      const { error } = await supabaseAdmin.from("aria_knowledge").insert(valid);
      if (error) {
        failures.push(`batch ${i}: ${error.message}`);
      } else {
        inserted += valid.length;
      }
    }

    return {
      inserted,
      skipped: CORPUS.length - todo.length,
      total: CORPUS.length,
      failures: failures.length ? failures : undefined,
    };
  });
