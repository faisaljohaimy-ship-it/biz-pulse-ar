// Hajj Operations — server functions for مشاعر 1447 command center.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { optionalSupabaseAuth } from "@/integrations/supabase/optional-auth-middleware";

export type HajjSite = {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  lat: number;
  lng: number;
  status: "safe" | "alert" | "danger";
  staff_count: number;
  notes: string | null;
};
export type HajjStation = {
  id: string;
  site_id: string;
  code: string;
  name_ar: string;
  name_en: string;
  kind: string;
  network: "online" | "degraded" | "offline";
  staff_count: number;
  reports_count: number;
  incidents_count: number;
};
export type HajjTask = {
  id: string;
  station_id: string | null;
  category: string;
  title_ar: string;
  title_en: string | null;
  priority: "P1" | "P2" | "P3" | "P4" | "P5";
  status: "pending" | "in_progress" | "done" | "cancelled";
  reported_at: string;
  started_at: string | null;
  completed_at: string | null;
};
export type HajjKpi = {
  id: string;
  snapshot_at: string;
  open_incidents: number;
  active_alerts: number;
  tasks_done: number;
  field_staff: number;
  stations_online: number;
  stations_total: number;
  compliance_pct: number;
  risk_level: "low" | "medium" | "high";
};

export type HajjOverview = {
  sites: HajjSite[];
  stations: HajjStation[];
  tasks: HajjTask[];
  kpi: HajjKpi | null;
};

async function fetchHajjOverview(sb: { from: (t: string) => any }): Promise<HajjOverview> {
  const [sites, stations, tasks, kpi] = await Promise.all([
    sb.from("hajj_sites").select("*").order("code"),
    sb.from("hajj_stations").select("*").order("code"),
    sb.from("hajj_tasks").select("*").order("reported_at", { ascending: false }).limit(50),
    sb
      .from("hajj_kpi_snapshots")
      .select("*")
      .order("snapshot_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  return {
    sites: (sites.data ?? []) as HajjSite[],
    stations: (stations.data ?? []) as HajjStation[],
    tasks: (tasks.data ?? []) as HajjTask[],
    kpi: (kpi.data ?? null) as HajjKpi | null,
  };
}

export const getHajjOverview = createServerFn({ method: "GET" })
  // Open showcase read (anon RLS decides visibility); «بيانات لا تفرغ»:
  // unreachable/empty database ⇒ built-in مشاعر reference simulation.
  .middleware([optionalSupabaseAuth])
  .handler(async ({ context }): Promise<HajjOverview> => {
    const { buildHajjSimulation, resilient } =
      await import("@/lib/exec/showcase-simulation.server");
    return resilient(
      "hajj-overview",
      () => fetchHajjOverview(context.supabase as { from: (t: string) => any }),
      (r) => r.sites.length === 0 && r.stations.length === 0 && r.tasks.length === 0 && !r.kpi,
      () => buildHajjSimulation(Date.now()) as unknown as HajjOverview,
    );
  });

export const updateHajjTaskStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["pending", "in_progress", "done", "cancelled"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const now = new Date().toISOString();
    const patch = {
      status: data.status,
      started_at: data.status === "in_progress" ? now : undefined,
      completed_at: data.status === "done" ? now : undefined,
    };
    const { error } = await context.supabase.from("hajj_tasks").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const generateHajjExecutiveSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const [sites, stations, tasks, kpi] = await Promise.all([
      sb.from("hajj_sites").select("code,name_ar,status,staff_count"),
      sb.from("hajj_stations").select("code,name_ar,network,incidents_count"),
      sb
        .from("hajj_tasks")
        .select("category,priority,status,title_ar")
        .order("reported_at", { ascending: false })
        .limit(30),
      sb
        .from("hajj_kpi_snapshots")
        .select("*")
        .order("snapshot_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const apiKey = process.env.LOVABLE_API_KEY;
    const payload = {
      sites: sites.data,
      stations: stations.data,
      tasks: tasks.data,
      kpi: kpi.data,
    };

    if (!apiKey) {
      return { summary: buildFallbackSummary(payload), source: "fallback" as const };
    }

    try {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                "أنت ARIA، الذكاء التنفيذي لطاقة مشاعر. اكتب ملخصاً تنفيذياً موجزاً (6-10 أسطر) بالعربية الفصحى حول حالة عمليات الحج 1447 — مواقع المشاعر، المحطات، المهام العاجلة، المخاطر. اختم بثلاث توصيات قابلة للتنفيذ.",
            },
            { role: "user", content: "بيانات لحظية:\n" + JSON.stringify(payload).slice(0, 6000) },
          ],
        }),
      });
      const j = await r.json();
      const summary = j?.choices?.[0]?.message?.content ?? buildFallbackSummary(payload);
      return { summary, source: "aria" as const };
    } catch {
      return { summary: buildFallbackSummary(payload), source: "fallback" as const };
    }
  });

function buildFallbackSummary(p: {
  sites?: { name_ar: string; status: string }[] | null;
  stations?: { network: string }[] | null;
  tasks?: { status: string; priority: string }[] | null;
  kpi?: { open_incidents?: number; field_staff?: number; compliance_pct?: number } | null;
}): string {
  const alerts = (p.sites ?? []).filter((s) => s.status !== "safe").length;
  const online = (p.stations ?? []).filter((s) => s.network === "online").length;
  const total = (p.stations ?? []).length;
  const pending = (p.tasks ?? []).filter((t) => t.status === "pending").length;
  const p5 = (p.tasks ?? []).filter((t) => t.priority === "P5").length;
  const kpi = p.kpi ?? {};
  return [
    "ملخص تنفيذي — عمليات الحج 1447",
    `• المواقع تحت تنبيه/خطر: ${alerts} من 4 مشاعر.`,
    `• المحطات المتصلة: ${online}/${total}.`,
    `• المهام المعلقة: ${pending} (منها P5 طارئة: ${p5}).`,
    `• الموظفون في الميدان: ${kpi.field_staff ?? "—"} · امتثال: ${kpi.compliance_pct ?? "—"}%.`,
    "",
    "توصيات:",
    "1) تعزيز الاستجابة لطلبات P5 الطبية فوراً.",
    "2) رفع جاهزية المحطات ذات الشبكة المتدهورة.",
    "3) مزامنة لقطة KPI كل 15 دقيقة خلال ذروة المشاعر.",
  ].join("\n");
}
