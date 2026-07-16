// HCIS Compliance + Digital PTW — deterministic simulation seeder.
// Server-only. Every row: is_simulation=true + metadata.sim_seed (idempotent
// re-run). Regions are the four canonical ids from src/lib/regions.ts.
// Data is realistic-in-character (compliance ~87%, mixed permit states) and
// NEVER quotes any official document verbatim.
import type { SupabaseClient } from "@supabase/supabase-js";
import { makeRng } from "@/lib/simulation/sim.rng";
import type { RegionId } from "@/lib/regions";

// biome-ignore lint/suspicious/noExplicitAny: dynamic (not-yet-typed) tables need an untyped admin client
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- new tables aren't in the generated Database type yet
type Admin = SupabaseClient<any, any, any>;

export const HCIS_PTW_SEED_DEFAULT = 20260101;

const REGIONS: readonly RegionId[] = ["central", "western", "eastern", "southern"];

// ── HCIS requirement catalogue (generic professional wording) ───────────────
const HCIS_CATEGORIES = [
  { key: "physical", ar: "الحماية المادية", en: "Physical Protection" },
  { key: "surveillance", ar: "المراقبة الإلكترونية", en: "Electronic Surveillance" },
  { key: "forces", ar: "القوى الأمنية", en: "Security Forces" },
  { key: "emergency", ar: "إدارة الطوارئ", en: "Emergency Management" },
  { key: "infosec", ar: "أمن المعلومات التشغيلية", en: "Operational Information Security" },
  { key: "access", ar: "التحكم بالدخول", en: "Access Control" },
] as const;

const HCIS_CLAUSES: Record<string, Array<{ ar: string; en: string }>> = {
  physical: [
    {
      ar: "سياج محيطي متصل بارتفاع نظامي حول كامل المنشأة",
      en: "Continuous perimeter fence at the required height around the whole facility",
    },
    {
      ar: "بوابات مراقبة مزوّدة بحواجز آلية ونقاط تفتيش",
      en: "Monitored gates with automated barriers and inspection points",
    },
    {
      ar: "إنارة أمنية كافية على المحيط ونقاط الدخول",
      en: "Adequate security lighting on the perimeter and entry points",
    },
    { ar: "مناطق عازلة واضحة حول الأصول الحرجة", en: "Clear buffer zones around critical assets" },
    {
      ar: "حواجز مركبات ونقاط تصلّب عند المداخل الرئيسة",
      en: "Vehicle barriers and hardening points at main entrances",
    },
    {
      ar: "لافتات تحذيرية ومناطق محظورة معلّمة بوضوح",
      en: "Warning signage and clearly marked restricted areas",
    },
  ],
  surveillance: [
    {
      ar: "تغطية كاميرات مراقبة للمحيط ونقاط الدخول دون نقاط عمياء",
      en: "CCTV coverage of perimeter and entries with no blind spots",
    },
    {
      ar: "تسجيل مستمر بمدة احتفاظ نظامية وسلامة الأدلة",
      en: "Continuous recording with compliant retention and evidence integrity",
    },
    {
      ar: "أنظمة كشف تسلل على السياج والمناطق الحساسة",
      en: "Intrusion-detection systems on the fence and sensitive areas",
    },
    {
      ar: "غرفة تحكم مأهولة على مدار الساعة للمراقبة",
      en: "24/7 manned control room for monitoring",
    },
    {
      ar: "تحليلات فيديو ذكية للتنبيه على السلوك غير الطبيعي",
      en: "Smart video analytics for anomalous-behavior alerts",
    },
  ],
  forces: [
    {
      ar: "أعداد كافية من أفراد الأمن حسب تقييم المخاطر",
      en: "Sufficient security personnel per the risk assessment",
    },
    {
      ar: "برنامج تأهيل وتدريب دوري موثّق للأفراد",
      en: "Documented periodic qualification and training program",
    },
    {
      ar: "جدولة دوريات منتظمة موثّقة بنقاط تفتيش",
      en: "Regular documented patrol scheduling with checkpoints",
    },
    {
      ar: "إجراءات تصعيد واستجابة واضحة للحوادث",
      en: "Clear incident escalation and response procedures",
    },
    {
      ar: "تجهيزات ووسائل اتصال موثوقة للأفراد",
      en: "Reliable equipment and communications for personnel",
    },
  ],
  emergency: [
    {
      ar: "خطة إخلاء معتمدة ومحدّثة لكل موقع",
      en: "Approved, up-to-date evacuation plan for each site",
    },
    {
      ar: "تمارين طوارئ دورية موثّقة بالنتائج والدروس",
      en: "Periodic emergency drills documented with outcomes and lessons",
    },
    { ar: "نقاط تجمّع ومسارات إخلاء معلّمة", en: "Marked muster points and evacuation routes" },
    {
      ar: "تنسيق مسبق مع الجهات الإسعافية والدفاع المدني",
      en: "Pre-arranged coordination with emergency and civil-defense agencies",
    },
    {
      ar: "أنظمة إنذار وإخماد صيانتها مجدولة ومختبرة",
      en: "Alarm and suppression systems with scheduled, tested maintenance",
    },
  ],
  infosec: [
    {
      ar: "فصل شبكات التشغيل عن الشبكات الإدارية",
      en: "Segregation of operational networks from administrative networks",
    },
    {
      ar: "ضوابط وصول قائمة على الأدوار لأنظمة التحكم",
      en: "Role-based access controls for control systems",
    },
    {
      ar: "نسخ احتياطي دوري مختبر لأنظمة المراقبة",
      en: "Periodic, tested backups of surveillance systems",
    },
    {
      ar: "سجلّات تدقيق محمية ضد العبث للأحداث الأمنية",
      en: "Tamper-resistant audit logs for security events",
    },
  ],
  access: [
    {
      ar: "نظام تحكم بالدخول إلكتروني للمناطق الحساسة",
      en: "Electronic access-control system for sensitive areas",
    },
    {
      ar: "إدارة زوّار موثّقة ببطاقات ومرافقة",
      en: "Documented visitor management with badges and escort",
    },
    {
      ar: "منح وإلغاء الصلاحيات وفق مبدأ الحد الأدنى",
      en: "Grant/revoke privileges on a least-privilege basis",
    },
    {
      ar: "مراجعة دورية لسجلّات الدخول والصلاحيات",
      en: "Periodic review of access logs and privileges",
    },
  ],
};

const FINDING_TITLES = [
  "نقطة عمياء في تغطية الكاميرات عند البوابة الخلفية",
  "تأخر في تحديث خطة الإخلاء لأحد المواقع",
  "نقص في توثيق تمارين الطوارئ الأخيرة",
  "إنارة أمنية غير كافية على جزء من المحيط",
  "حاجز مركبات معطّل عند أحد المداخل",
  "مراجعة صلاحيات الدخول متأخرة عن دوريتها",
  "سجلّ دوريات ناقص لبعض المناوبات الليلية",
];

const INSPECTION_TITLES = [
  "زيارة تفتيش دورية شاملة",
  "تفتيش متابعة لإغلاق الملاحظات",
  "تدقيق أنظمة المراقبة والإنذار",
  "مراجعة جاهزية الطوارئ",
];

// ── PTW catalogue ───────────────────────────────────────────────────────────
const PERMIT_TYPES = [
  { key: "hot_work", ar: "عمل ساخن", en: "Hot Work", icon: "Flame", color: "#EF4444" },
  {
    key: "confined_space",
    ar: "دخول مكان مغلق",
    en: "Confined Space Entry",
    icon: "Box",
    color: "#F97316",
  },
  {
    key: "restricted_area",
    ar: "منطقة محظورة",
    en: "Restricted Area",
    icon: "ShieldAlert",
    color: "#8B5CF6",
  },
  { key: "excavation", ar: "حفر", en: "Excavation", icon: "Shovel", color: "#92400E" },
  {
    key: "lifting",
    ar: "رفع ثقيل",
    en: "Heavy Lifting",
    icon: "ArrowUpFromLine",
    color: "#3B82F6",
  },
  {
    key: "electrical_isolation",
    ar: "عزل كهربائي",
    en: "Electrical Isolation",
    icon: "Zap",
    color: "#EAB308",
  },
] as const;

const PRECAUTIONS: Record<string, string[]> = {
  hot_work: [
    "إطفاء حريق حاضر",
    "عزل المواد القابلة للاشتعال",
    "مراقب حريق معيّن",
    "فحص الغازات قبل البدء",
  ],
  confined_space: ["فحص الأكسجين والغازات", "تهوية كافية", "مراقب عند المدخل", "خطة إنقاذ جاهزة"],
  restricted_area: ["تصريح دخول ساري", "مرافقة أمنية", "توثيق الدخول والخروج"],
  excavation: ["تحديد الخدمات المدفونة", "دعم جوانب الحفرة", "حواجز وتحذيرات"],
  lifting: ["فحص المعدات والحبال", "منطقة رفع خالية", "مشغّل معتمد", "خطة رفع معتمدة"],
  electrical_isolation: ["قفل ووسم (LOTO)", "التحقق من انعدام الجهد", "تأريض حيثما لزم"],
};

const CONTRACTORS = ["البسّام", "سبكو", "نسما", "الزامل", "الكفاح", "مجموعة بن لادن", "الفنار"];
const LOCATIONS = [
  "الوحدة أ-١",
  "خزان الوقود ٣",
  "غرفة التحكم الرئيسة",
  "المستودع الشمالي",
  "محطة الضخ ٢",
  "الرصيف البحري",
  "منطقة التحميل",
];

type SeedResult = {
  seed: number;
  org_id: string;
  counts: Record<string, number>;
  duration_ms: number;
};

const chunkInsert = async (admin: Admin, table: string, rows: unknown[], size = 100) => {
  for (let i = 0; i < rows.length; i += size) {
    const { error } = await admin.from(table).insert(rows.slice(i, i + size));
    if (error) throw new Error(`[${table}] ${error.message}`);
  }
};

async function purge(admin: Admin, orgId: string, seed: number) {
  const tables = [
    "permit_events",
    "permit_approvals",
    "permits",
    "permit_types",
    "hcis_inspections",
    "hcis_findings",
    "hcis_assessments",
    "hcis_requirements",
  ];
  for (const t of tables) {
    await admin.from(t).delete().eq("org_id", orgId).contains("metadata", { sim_seed: seed });
  }
}

export async function runHcisPtwSeed(
  admin: Admin,
  opts: { orgId: string; seed?: number; userId?: string | null },
): Promise<SeedResult> {
  const started = Date.now();
  const seed = opts.seed ?? HCIS_PTW_SEED_DEFAULT;
  const rng = makeRng(seed);
  const org_id = opts.orgId;
  const tag = { sim_seed: seed };
  const counts: Record<string, number> = {};

  await purge(admin, org_id, seed);

  // ── HCIS requirements ──────────────────────────────────────────────────
  const reqRows: Array<Record<string, unknown>> = [];
  let clauseNo = 1;
  for (const cat of HCIS_CATEGORIES) {
    for (const clause of HCIS_CLAUSES[cat.key]!) {
      reqRows.push({
        org_id,
        clause_no: `${cat.key.slice(0, 3).toUpperCase()}-${String(clauseNo).padStart(3, "0")}`,
        category: cat.key,
        description_ar: clause.ar,
        description_en: clause.en,
        mandatory_level: rng.pick([
          "mandatory",
          "mandatory",
          "mandatory",
          "recommended",
          "conditional",
        ]),
        verification_frequency: rng.pick(["annual", "annual", "semiannual", "quarterly"]),
        is_simulation: true,
        metadata: tag,
      });
      clauseNo++;
    }
  }
  await chunkInsert(admin, "hcis_requirements", reqRows);
  counts.hcis_requirements = reqRows.length;
  const { data: reqs } = await admin
    .from("hcis_requirements")
    .select("id,category")
    .eq("org_id", org_id)
    .contains("metadata", tag);
  const reqList = (reqs ?? []) as Array<{ id: string; category: string }>;

  // ── HCIS assessments — one per requirement per region, ~87% compliant ──
  const assessRows: Array<Record<string, unknown>> = [];
  for (const region of REGIONS) {
    for (const r of reqList) {
      // realistic distribution: mostly compliant, some partial/non-compliant
      const status = rng.pick([
        "compliant",
        "compliant",
        "compliant",
        "compliant",
        "compliant",
        "compliant",
        "partial",
        "partial",
        "non_compliant",
        "not_applicable",
      ]);
      assessRows.push({
        org_id,
        requirement_id: r.id,
        region,
        status,
        evidence:
          status === "compliant"
            ? "أدلة موثّقة ومحدّثة"
            : status === "partial"
              ? "أدلة جزئية بحاجة لاستكمال"
              : null,
        notes: status === "non_compliant" ? "تتطلب خطة معالجة عاجلة" : null,
        last_verified_at: rng.daysAgo(0, 180),
        assessor: `مقيّم ${rng.int(1, 12)}`,
        is_simulation: true,
        metadata: tag,
      });
    }
  }
  await chunkInsert(admin, "hcis_assessments", assessRows, 200);
  counts.hcis_assessments = assessRows.length;

  // ── HCIS findings — gaps with CAP, some overdue ────────────────────────
  const findingRows: Array<Record<string, unknown>> = [];
  for (let i = 0; i < 22; i++) {
    const region = rng.pick(REGIONS);
    const overdue = rng.chance(0.3);
    findingRows.push({
      org_id,
      requirement_id: reqList.length ? rng.pick(reqList).id : null,
      region,
      title_ar: rng.pick(FINDING_TITLES),
      severity: rng.pick(["low", "medium", "medium", "high", "high", "critical"]),
      cap_plan: "تنفيذ الإجراء التصحيحي والتحقق من الفاعلية خلال المدة المحددة.",
      owner: `مسؤول ${rng.int(1, 8)}`,
      target_date: (rng.daysAgo(overdue ? 5 : -45, overdue ? 30 : -1) as string).slice(0, 10),
      status: overdue ? "overdue" : rng.pick(["open", "in_progress", "in_progress", "resolved"]),
      is_simulation: true,
      metadata: tag,
    });
  }
  await chunkInsert(admin, "hcis_findings", findingRows);
  counts.hcis_findings = findingRows.length;

  // ── HCIS inspections — scheduled + executed ────────────────────────────
  const inspRows: Array<Record<string, unknown>> = [];
  for (let i = 0; i < 16; i++) {
    const region = rng.pick(REGIONS);
    const executed = rng.chance(0.5);
    inspRows.push({
      org_id,
      region,
      title_ar: rng.pick(INSPECTION_TITLES),
      scheduled_at: rng.daysAgo(executed ? 5 : -30, executed ? 90 : -1),
      executed_at: executed ? rng.daysAgo(1, 60) : null,
      result: executed
        ? rng.pick(["passed", "passed_with_notes", "passed_with_notes", "failed"])
        : null,
      status: executed ? "executed" : "scheduled",
      report: executed ? "تقرير التفتيش موثّق ومرفق." : null,
      is_simulation: true,
      metadata: tag,
    });
  }
  await chunkInsert(admin, "hcis_inspections", inspRows);
  counts.hcis_inspections = inspRows.length;

  // ── PTW types ──────────────────────────────────────────────────────────
  const typeRows = PERMIT_TYPES.map((t) => ({
    org_id,
    key: t.key,
    name_ar: t.ar,
    name_en: t.en,
    icon: t.icon,
    color: t.color,
    is_simulation: true,
    metadata: tag,
  }));
  await chunkInsert(admin, "permit_types", typeRows);
  counts.permit_types = typeRows.length;
  const { data: types } = await admin
    .from("permit_types")
    .select("id,key")
    .eq("org_id", org_id)
    .contains("metadata", tag);
  const typeByKey = new Map((types ?? []).map((t: { id: string; key: string }) => [t.key, t.id]));

  // ── PTW permits — 25, varied realistic states across regions ───────────
  const permitRows: Array<Record<string, unknown>> = [];
  for (let i = 0; i < 25; i++) {
    const type = rng.pick(PERMIT_TYPES);
    const region = rng.pick(REGIONS);
    const status = rng.pick([
      "active",
      "active",
      "active",
      "active",
      "pending_approval",
      "pending_approval",
      "expired",
      "expired",
      "draft",
      "cancelled",
    ]);
    // active permits span "now"; some end within 2h (alert window)
    const soon = rng.chance(0.3);
    const startsAt = rng.daysAgo(0, 2);
    const endsAt =
      status === "active" && soon
        ? new Date(Date.now() + rng.int(20, 110) * 60_000).toISOString()
        : rng.daysAgo(status === "expired" ? 1 : -3, status === "expired" ? 10 : -1);
    permitRows.push({
      org_id,
      ref: `PTW-2026-${String(1000 + i)}`,
      type_id: typeByKey.get(type.key) ?? null,
      type_key: type.key,
      region,
      location: rng.pick(LOCATIONS),
      description: `${type.ar} — ${rng.pick(LOCATIONS)}`,
      contractor: rng.pick(CONTRACTORS),
      worker_count: rng.int(1, 12),
      starts_at: startsAt,
      ends_at: endsAt,
      precautions: PRECAUTIONS[type.key] ?? [],
      status,
      is_simulation: true,
      metadata: tag,
      created_by: opts.userId ?? null,
    });
  }
  await chunkInsert(admin, "permits", permitRows);
  counts.permits = permitRows.length;
  const { data: permits } = await admin
    .from("permits")
    .select("id,status")
    .eq("org_id", org_id)
    .contains("metadata", tag);
  const permitList = (permits ?? []) as Array<{ id: string; status: string }>;

  // ── PTW approvals (chain of 3) + events ────────────────────────────────
  const approvalRows: Array<Record<string, unknown>> = [];
  const eventRows: Array<Record<string, unknown>> = [];
  const chain: Array<"supervisor" | "safety" | "security"> = ["supervisor", "safety", "security"];
  for (const p of permitList) {
    const approvedUpTo =
      p.status === "active"
        ? 3
        : p.status === "pending_approval"
          ? rng.int(1, 2)
          : p.status === "draft"
            ? 0
            : 3;
    chain.forEach((role, idx) => {
      const decided = idx < approvedUpTo;
      approvalRows.push({
        org_id,
        permit_id: p.id,
        step_order: idx + 1,
        role,
        approver_id: null,
        approver_name: decided
          ? `${role === "supervisor" ? "مشرف العمل" : role === "safety" ? "مسؤول السلامة" : "مسؤول الأمن الصناعي"} ${rng.int(1, 6)}`
          : null,
        decision: decided ? "approved" : "pending",
        decided_at: decided ? rng.daysAgo(0, 3) : null,
        is_simulation: true,
        metadata: tag,
      });
    });
    eventRows.push({
      org_id,
      permit_id: p.id,
      event_type: "created",
      actor_name: "النظام",
      detail: "إنشاء التصريح",
      occurred_at: rng.daysAgo(0, 3),
      is_simulation: true,
      metadata: tag,
    });
    if (p.status === "active") {
      eventRows.push({
        org_id,
        permit_id: p.id,
        event_type: "qr_scan_in",
        actor_name: "مسح دخول",
        detail: "مسح رمز QR عند الدخول",
        occurred_at: rng.daysAgo(0, 1),
        is_simulation: true,
        metadata: tag,
      });
    }
  }
  await chunkInsert(admin, "permit_approvals", approvalRows, 200);
  counts.permit_approvals = approvalRows.length;
  await chunkInsert(admin, "permit_events", eventRows, 200);
  counts.permit_events = eventRows.length;

  return { seed, org_id, counts, duration_ms: Date.now() - started };
}
