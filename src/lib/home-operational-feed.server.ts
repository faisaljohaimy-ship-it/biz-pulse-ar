import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { REGIONS } from "@/lib/regions";
import {
  measuredProgress,
  validRegion,
  type OperationalFeed,
} from "@/components/home/operational-feed";

const DEADLINE = 3500;
// Exact seed references from 20260621195540 and 20260623130131 migrations.
// This does not certify that production contains no additional unmarked demo rows.
export const SEEDED_INCIDENT_REFS = [
  "INC-2026-0142",
  "INC-2026-0141",
  "INC-2026-0140",
  "INC-2026-0139",
  "INC-2026-0138",
];
export const SEEDED_PROJECT_REFS = [
  "PRJ-2026-001",
  "PRJ-2026-002",
  "PRJ-2026-003",
  "PRJ-2025-014",
  "PRJ-2026-004",
  "PRJ-2026-005",
  "PRJ-2026-006",
  "PRJ-2026-007",
  "PRJ-2025-019",
  "PRJ-2026-008",
];
const pgList = (values: readonly string[]) => `(${values.join(",")})`;
async function bounded<T>(work: PromiseLike<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(work),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("تعذرت قراءة الأخبار التشغيلية")), DEADLINE);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/** Public-safe projection only. Caller client preserves RLS; no service-role reads. */
export async function readHomeOperationalFeed(
  db: SupabaseClient<Database>,
): Promise<OperationalFeed> {
  const signal = AbortSignal.timeout(DEADLINE);
  const [incidents, maintenance, projects, overdue] = await Promise.allSettled([
    bounded(
      db
        .from("sec_incidents")
        .select("id", { count: "exact", head: true })
        .not("ref", "ilike", "%SIM%")
        .not("ref", "in", pgList(SEEDED_INCIDENT_REFS))
        .not("status", "in", '("closed","resolved","cancelled")')
        .abortSignal(signal),
    ),
    bounded(db.rpc("maint_analytics").abortSignal(signal)),
    bounded(
      db
        .from("sec_projects")
        .select("id, name_ar, name_en, progress, health, updated_at, sec_circles(region)")
        .not("ref", "ilike", "%SIM%")
        .not("ref", "in", pgList(SEEDED_PROJECT_REFS))
        .order("updated_at", { ascending: false })
        .limit(6)
        .abortSignal(signal),
    ),
    bounded(
      Promise.all(
        REGIONS.map((r) =>
          db
            .from("maint_orders_v")
            .select("id", { count: "exact", head: true })
            .eq("region", r.id)
            .in("status", ["open", "on_hold"])
            .gt("overdue_days", 0)
            .abortSignal(signal),
        ),
      ),
    ),
  ]);
  const out: OperationalFeed = {
    observedAt: new Date().toISOString(),
    incidents: { count: null, source: { kind: "unavailable", date: null } },
    maintenance: {
      regions: REGIONS.map((r) => ({ regionId: r.id, active: null, overdue: null })),
      source: { kind: "unavailable", date: null },
    },
    projects: { rows: [], source: { kind: "unavailable", date: null } },
  };
  if (incidents.status === "fulfilled" && !incidents.value.error) {
    out.incidents = { count: incidents.value.count, source: { kind: "database", date: null } };
  }
  if (maintenance.status === "fulfilled" && !maintenance.value.error) {
    const analytics = maintenance.value.data as unknown as {
      by_region?: Array<{ key: string | null; active: number }>;
    };
    if (Array.isArray(analytics?.by_region)) {
      out.maintenance.source = { kind: "database", date: null };
      out.maintenance.regions = REGIONS.map((r) => ({
        regionId: r.id,
        active: analytics.by_region?.find((x) => x.key === r.id)?.active ?? 0,
        overdue: null,
      }));
    }
  }
  if (out.maintenance.source.kind === "database" && overdue.status === "fulfilled") {
    out.maintenance.regions = out.maintenance.regions.map((r, i) => ({
      ...r,
      overdue: overdue.value[i].error ? null : overdue.value[i].count,
    }));
  }
  if (out.maintenance.source.kind === "unavailable") {
    const { maintExportSummary } = await import("@/lib/maintenance/maint-export-fallback.server");
    const summary = maintExportSummary();
    if (summary) {
      out.maintenance.source = { kind: "export", date: summary.exportDate ?? null };
      out.maintenance.regions = REGIONS.map((r) => ({
        regionId: r.id,
        active: summary.analytics.by_region.find((x) => x.key === r.id)?.active ?? 0,
        overdue: null,
      }));
    }
  }
  if (projects.status === "fulfilled" && !projects.value.error) {
    out.projects.source = { kind: "database", date: null };
    out.projects.rows = (projects.value.data ?? []).map((p) => ({
      id: p.id,
      nameAr: p.name_ar,
      nameEn: p.name_en,
      regionId: validRegion(p.sec_circles?.region),
      area: null,
      progress: measuredProgress(p.progress),
      health: ["green", "amber", "red"].includes(p.health)
        ? (p.health as "green" | "amber" | "red")
        : null,
      at: p.updated_at,
    }));
  }
  if (out.projects.source.kind === "unavailable" || out.projects.rows.length === 0) {
    const [{ default: raw }, { PROJECTS_REPORT_DATE }] = await Promise.all([
      import("@/lib/exec/projects-report.data.json?raw"),
      import("@/lib/exec/projects-report.real.server"),
    ]);
    const rows = JSON.parse(raw) as Array<{
      id: string;
      name: string;
      region_id: string | null;
      area_ar: string | null;
      progress: number;
      health: "green" | "amber" | "red" | null;
      starts_at: string | null;
    }>;
    out.projects.source = { kind: "export", date: PROJECTS_REPORT_DATE };
    out.projects.rows = rows
      .sort(
        (a, b) => (b.starts_at ?? "").localeCompare(a.starts_at ?? "") || a.id.localeCompare(b.id),
      )
      .slice(0, 6)
      .map((p) => ({
        id: p.id,
        nameAr: p.name,
        nameEn: p.name,
        regionId: validRegion(p.region_id),
        area: p.area_ar,
        progress: measuredProgress(p.progress),
        health: p.health,
        at: p.starts_at,
      }));
  }
  return out;
}
