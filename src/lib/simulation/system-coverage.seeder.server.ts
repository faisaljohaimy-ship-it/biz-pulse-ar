// System-coverage seeder — fills the last dashboard tables that no other
// seeder or migration populates, so the simulation covers 100% of the system
// (no empty module). Idempotent + realistic. Called from runSimulationSeed.
//
// Gap tables (from the coverage audit):
//   • intelligence_events   — user-scoped (executive fabric / twin)
//   • intelligence_alerts   — user-scoped (executive predictions / twin)
//   • business_outcomes     — user-scoped (executive command center)
//   • sec_vehicles          — org-scoped  (/sec/vehicles)
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

  return counts;
}
