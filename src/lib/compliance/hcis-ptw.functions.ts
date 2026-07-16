// HCIS Compliance + Digital PTW — server functions (seed, page data, emergency).
// New tables aren't in the generated Database type yet, so the RLS client is
// cast loosely per query (same idiom as sim.functions.ts / alerts.functions.ts).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
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
  .middleware([requireSupabaseAuth])
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
  }>;
};

export const getPtwOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PtwOverview> => {
    const db = context.supabase as unknown as LooseDb;
    const [{ data: permits }, { data: types }] = await Promise.all([
      db
        .from("permits")
        .select("id,ref,type_key,region,location,contractor,worker_count,starts_at,ends_at,status")
        .order("ends_at", { ascending: true }),
      db.from("permit_types").select("id,key,name_ar,name_en,icon,color").order("name_ar"),
    ]);
    const p = (permits ?? []) as PtwOverview["permits"];
    const now = Date.now();
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
      types: (types ?? []) as PtwOverview["types"],
      permits: p,
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
