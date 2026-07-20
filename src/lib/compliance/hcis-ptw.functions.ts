// HCIS Compliance + Digital PTW — server functions (seed, page data, emergency).
// New tables aren't in the generated Database type yet, so the RLS client is
// cast loosely per query (same idiom as sim.functions.ts / alerts.functions.ts).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { optionalSupabaseAuth } from "@/integrations/supabase/optional-auth-middleware";
import {
  requirePlatformAdmin,
  getCurrentOrgIdForUser,
  hasAnyPlatformRole,
} from "@/lib/authz.server";

// biome-ignore lint/suspicious/noExplicitAny: new tables not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- loose client for not-yet-typed tables
type LooseDb = { from: (t: string) => any };

const REGION_IDS = ["central", "western", "eastern", "southern"] as const;

/* ── Seed (admin-gated) ─────────────────────────────────────────────────── */
export const runHcisPtwSeedFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { seed?: number }) =>
    z.object({ seed: z.number().int().optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { runHcisPtwSeed } = await import("./hcis-ptw.seeder.server");
    const orgId = await getCurrentOrgIdForUser(context.userId);
    if (!orgId) throw new Error("No org for current user");
    return await runHcisPtwSeed(supabaseAdmin, { orgId, seed: data.seed, userId: context.userId });
  });

/* ── HCIS overview (page + ARIA) ────────────────────────────────────────── */
export type HcisOverview = {
  overallPct: number;
  byRegion: Record<string, number>;
  byCategory: Record<string, { pct: number; total: number }>;
  findings: {
    total: number;
    overdue: number;
    bySeverity: Record<string, number>;
    top: Array<{
      id: string;
      title_ar: string;
      region: string;
      severity: string;
      status: string;
      target_date: string | null;
    }>;
  };
  inspections: Array<{
    id: string;
    title_ar: string;
    region: string;
    scheduled_at: string;
    status: string;
    result: string | null;
  }>;
  matrix: Array<{ category: string; region: string; status: string; count: number }>;
};

function compliancePct(rows: Array<{ status: string }>): number {
  const scored = rows.filter((r) => r.status !== "not_applicable");
  if (scored.length === 0) return 0;
  const weight = (s: string) => (s === "compliant" ? 1 : s === "partial" ? 0.5 : 0);
  const sum = scored.reduce((acc, r) => acc + weight(r.status), 0);
  return Math.round((sum / scored.length) * 100);
}

export const getHcisOverview = createServerFn({ method: "GET" })
  // Open showcase read: guests get an ANON-key client, so the anon RLS
  // policies in the database decide what they see. Writes stay auth-gated.
  .middleware([optionalSupabaseAuth])
  .handler(async ({ context }): Promise<HcisOverview> => {
    const db = context.supabase as unknown as LooseDb;
    const [{ data: assessments }, { data: findings }, { data: inspections }, { data: reqs }] =
      await Promise.all([
        db.from("hcis_assessments").select("region,status,requirement_id"),
        db
          .from("hcis_findings")
          .select("id,title_ar,region,severity,status,target_date")
          .order("target_date", { ascending: true }),
        db
          .from("hcis_inspections")
          .select("id,title_ar,region,scheduled_at,status,result")
          .order("scheduled_at", { ascending: true }),
        db.from("hcis_requirements").select("id,category"),
      ]);

    const a = (assessments ?? []) as Array<{
      region: string;
      status: string;
      requirement_id: string;
    }>;
    const catByReq = new Map(
      ((reqs ?? []) as Array<{ id: string; category: string }>).map((r) => [r.id, r.category]),
    );

    const byRegion: Record<string, number> = {};
    for (const region of REGION_IDS)
      byRegion[region] = compliancePct(a.filter((r) => r.region === region));

    const byCategory: Record<string, { pct: number; total: number }> = {};
    const cats = new Set(catByReq.values());
    for (const cat of cats) {
      const rows = a.filter((r) => catByReq.get(r.requirement_id) === cat);
      byCategory[cat] = { pct: compliancePct(rows), total: rows.length };
    }

    // matrix: category × region → dominant status count
    const matrixMap = new Map<
      string,
      { category: string; region: string; status: string; count: number }
    >();
    for (const r of a) {
      const cat = catByReq.get(r.requirement_id) ?? "other";
      const key = `${cat}|${r.region}|${r.status}`;
      const prev = matrixMap.get(key);
      if (prev) prev.count++;
      else matrixMap.set(key, { category: cat, region: r.region, status: r.status, count: 1 });
    }

    const f = (findings ?? []) as HcisOverview["findings"]["top"];
    const bySeverity: Record<string, number> = {};
    for (const x of f) bySeverity[x.severity] = (bySeverity[x.severity] ?? 0) + 1;

    return {
      overallPct: compliancePct(a),
      byRegion,
      byCategory,
      findings: {
        total: f.length,
        overdue: f.filter((x) => x.status === "overdue").length,
        bySeverity,
        top: f
          .filter((x) => x.status !== "resolved")
          .sort((x, y) => (x.target_date ?? "9999").localeCompare(y.target_date ?? "9999"))
          .slice(0, 8),
      },
      inspections: (inspections ?? []) as HcisOverview["inspections"],
      matrix: Array.from(matrixMap.values()),
    };
  });

/* ── PTW overview (page + ARIA) ─────────────────────────────────────────── */
export type PtwOverview = {
  counts: { active: number; pending: number; endingSoon: number; expiredToday: number };
  types: Array<{
    id: string;
    key: string;
    name_ar: string;
    name_en: string;
    icon: string;
    color: string;
  }>;
  permits: Array<{
    id: string;
    ref: string;
    type_key: string;
    region: string;
    location: string;
    contractor: string | null;
    worker_count: number;
    starts_at: string;
    ends_at: string;
    status: string;
    is_simulation: boolean;
  }>;
  /** "database" = live rows; "reference" = built-in always-on simulation. */
  source: "database" | "reference";
};

/* ── Built-in PTW simulation (guaranteed board) ─────────────────────────
   Mirrors supabase/migrations/20260719210000_ptw_public_demo_seed.sql but
   with times computed RELATIVE TO NOW so «ساري الآن / ينتهي خلال ساعتين /
   منتهٍ اليوم» stay truthful forever. Served only when the database is
   unreachable or has no anon-visible permit rows; every row is flagged
   is_simulation=true and the UI badges the board as reference data. */
function buildPtwSimulation(now: number): Pick<PtwOverview, "types" | "permits"> {
  const iso = (ms: number) => new Date(ms).toISOString();
  const H = 3_600_000;
  const types: PtwOverview["types"] = [
    {
      id: "sim-t1",
      key: "hot_work",
      name_ar: "أعمال ساخنة",
      name_en: "Hot Work",
      icon: "Flame",
      color: "#F97316",
    },
    {
      id: "sim-t2",
      key: "confined_space",
      name_ar: "دخول أماكن مغلقة",
      name_en: "Confined Space Entry",
      icon: "DoorClosed",
      color: "#8B5CF6",
    },
    {
      id: "sim-t3",
      key: "electrical",
      name_ar: "أعمال كهربائية",
      name_en: "Electrical Work",
      icon: "Zap",
      color: "#FACC15",
    },
    {
      id: "sim-t4",
      key: "work_at_height",
      name_ar: "العمل على ارتفاع",
      name_en: "Work at Height",
      icon: "TowerControl",
      color: "#22D3EE",
    },
  ];
  const permits: PtwOverview["permits"] = [
    {
      id: "sim-p1",
      ref: "PTW-SIM-001",
      type_key: "hot_work",
      region: "western",
      location: "محطة التحويل الغربية — خزان الوقود 3",
      contractor: "شركة الإنشاءات المتقدمة",
      worker_count: 4,
      starts_at: iso(now - 2 * H),
      ends_at: iso(now + 6 * H),
      status: "active",
      is_simulation: true,
    },
    {
      id: "sim-p2",
      ref: "PTW-SIM-002",
      type_key: "electrical",
      region: "central",
      location: "لوحة التوزيع الرئيسية — مبنى القيادة",
      contractor: "المقاول الوطني للطاقة",
      worker_count: 2,
      starts_at: iso(now - 1 * H),
      ends_at: iso(now + 7 * H),
      status: "active",
      is_simulation: true,
    },
    {
      id: "sim-p3",
      ref: "PTW-SIM-003",
      type_key: "work_at_height",
      region: "eastern",
      location: "برج الاتصالات الشرقي — منصة 40م",
      contractor: "أعمال الارتفاعات المحدودة",
      worker_count: 3,
      starts_at: iso(now - 3 * H),
      ends_at: iso(now + 5 * H),
      status: "active",
      is_simulation: true,
    },
    {
      id: "sim-p4",
      ref: "PTW-SIM-004",
      type_key: "confined_space",
      region: "southern",
      location: "خزان المياه الجنوبي — غرفة الضخ",
      contractor: "شركة الصيانة الصناعية",
      worker_count: 5,
      starts_at: iso(now - 0.5 * H),
      ends_at: iso(now + 1.5 * H),
      status: "active",
      is_simulation: true,
    },
    {
      id: "sim-p5",
      ref: "PTW-SIM-005",
      type_key: "hot_work",
      region: "central",
      location: "ورشة اللحام المركزية — خط الأنابيب B",
      contractor: "مصنع المعدات الثقيلة",
      worker_count: 6,
      starts_at: iso(now + 4 * H),
      ends_at: iso(now + 12 * H),
      status: "pending_approval",
      is_simulation: true,
    },
    {
      id: "sim-p6",
      ref: "PTW-SIM-007",
      type_key: "work_at_height",
      region: "eastern",
      location: "رافعة الميناء الشرقي — الرصيف 2",
      contractor: "أعمال الارتفاعات المحدودة",
      worker_count: 4,
      starts_at: iso(now + 6 * H),
      ends_at: iso(now + 14 * H),
      status: "pending_approval",
      is_simulation: true,
    },
    {
      id: "sim-p7",
      ref: "PTW-SIM-006",
      type_key: "electrical",
      region: "western",
      location: "إنارة السور المحيطي — القطاع الغربي",
      contractor: "المقاول الوطني للطاقة",
      worker_count: 2,
      starts_at: iso(now - 9 * H),
      ends_at: iso(now - 2 * H),
      status: "expired",
      is_simulation: true,
    },
  ];
  return { types, permits };
}

export const getPtwOverview = createServerFn({ method: "GET" })
  // Same open-showcase read model as getHcisOverview (anon RLS decides).
  .middleware([optionalSupabaseAuth])
  .handler(async ({ context }): Promise<PtwOverview> => {
    const now = Date.now();
    let p: PtwOverview["permits"] = [];
    let t: PtwOverview["types"] = [];
    let source: PtwOverview["source"] = "database";
    try {
      const db = context.supabase as unknown as LooseDb;
      // Hard 4s ceiling: an unreachable database must fall to the
      // simulation, never hang the board (resilient() doctrine).
      const [{ data: permits }, { data: types }] = await Promise.race([
        Promise.all([
          db
            .from("permits")
            .select(
              "id,ref,type_key,region,location,contractor,worker_count,starts_at,ends_at,status,is_simulation",
            )
            .order("ends_at", { ascending: true }),
          db.from("permit_types").select("id,key,name_ar,name_en,icon,color").order("name_ar"),
        ]),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("showcase-timeout")), 4_000);
        }),
      ]);
      p = (permits ?? []) as PtwOverview["permits"];
      t = (types ?? []) as PtwOverview["types"];
    } catch (error) {
      console.error("[ptw] overview fetch failed — serving built-in simulation.", error);
    }
    // The board is NEVER empty: with no anon-visible rows (unreachable or
    // unseeded database) serve the built-in relative-time simulation.
    if (p.length === 0 && t.length === 0) {
      const sim = buildPtwSimulation(now);
      p = sim.permits;
      t = sim.types;
      source = "reference";
    }
    const soon = now + 2 * 60 * 60 * 1000;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return {
      counts: {
        active: p.filter((x) => x.status === "active").length,
        pending: p.filter((x) => x.status === "pending_approval").length,
        endingSoon: p.filter(
          (x) =>
            x.status === "active" &&
            new Date(x.ends_at).getTime() <= soon &&
            new Date(x.ends_at).getTime() >= now,
        ).length,
        expiredToday: p.filter(
          (x) => x.status === "expired" && new Date(x.ends_at).getTime() >= startOfDay.getTime(),
        ).length,
      },
      types: t,
      permits: p,
      source,
    };
  });

/* ── Create a permit (draft → pending_approval with a 3-step chain) ─────── */
export const createPermitFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        type_key: z.string().min(2).max(40),
        region: z.enum(REGION_IDS),
        location: z.string().min(2).max(200),
        description: z.string().max(600).optional(),
        contractor: z.string().max(120).optional(),
        worker_count: z.number().int().min(1).max(200).default(1),
        starts_at: z.string(),
        ends_at: z.string(),
        precautions: z.array(z.string().max(120)).max(20).default([]),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const orgId = await getCurrentOrgIdForUser(context.userId);
    if (!orgId) throw new Error("No org for current user");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as unknown as LooseDb;
    const ref = `PTW-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const { data: typeRow } = await db
      .from("permit_types")
      .select("id")
      .eq("org_id", orgId)
      .eq("key", data.type_key)
      .maybeSingle();
    const { data: created, error } = await db
      .from("permits")
      .insert({
        org_id: orgId,
        ref,
        type_id: typeRow?.id ?? null,
        type_key: data.type_key,
        region: data.region,
        location: data.location,
        description: data.description ?? null,
        contractor: data.contractor ?? null,
        worker_count: data.worker_count,
        starts_at: data.starts_at,
        ends_at: data.ends_at,
        precautions: data.precautions,
        status: "pending_approval",
        created_by: context.userId,
      })
      .select("id,ref")
      .single();
    if (error || !created) throw new Error(error?.message ?? "create failed");
    const row = created as { id: string; ref: string };
    const chain = ["supervisor", "safety", "security"] as const;
    await db.from("permit_approvals").insert(
      chain.map((role, idx) => ({
        org_id: orgId,
        permit_id: row.id,
        step_order: idx + 1,
        role,
        decision: "pending",
      })),
    );
    await db.from("permit_events").insert({
      org_id: orgId,
      permit_id: row.id,
      event_type: "created",
      actor_id: context.userId,
      actor_name: "منشئ التصريح",
      detail: "إنشاء تصريح جديد وإرساله لسلسلة الموافقات",
      occurred_at: new Date().toISOString(),
    });
    return { ok: true, id: row.id, ref: row.ref };
  });

/* ── Emergency: suspend all active permits in a region (privileged) ─────── */
export const suspendRegionPermitsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { region?: string }) =>
    z.object({ region: z.enum(REGION_IDS) }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    // Privileged: mirror the emergency-broadcast gate. A bulk suspend is a
    // destructive, outward-affecting action.
    if (!(await hasAnyPlatformRole(context.userId, ["admin", "manager"]))) {
      throw new Error("Forbidden: suspending permits requires admin or manager role.");
    }
    const orgId = await getCurrentOrgIdForUser(context.userId);
    if (!orgId) throw new Error("No org for current user");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as unknown as LooseDb;
    const { data: affected, error } = await db
      .from("permits")
      .update({ status: "suspended" })
      .eq("org_id", orgId)
      .eq("region", data.region)
      .eq("status", "active")
      .select("id");
    if (error) throw new Error(error.message);
    const ids = ((affected ?? []) as Array<{ id: string }>).map((r) => r.id);
    if (ids.length) {
      await db.from("permit_events").insert(
        ids.map((id) => ({
          org_id: orgId,
          permit_id: id,
          event_type: "suspended",
          actor_id: context.userId,
          actor_name: "تعليق طوارئ",
          detail: `تعليق طارئ لتصاريح المنطقة (${data.region})`,
          occurred_at: new Date().toISOString(),
        })),
      );
    }
    return { ok: true, suspended: ids.length, region: data.region };
  });
