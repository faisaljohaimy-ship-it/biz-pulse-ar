/**
 * خادم صفحة الصيانة — أوامر العمل من `maint_orders` (ترحيل `20261006120000`).
 *
 * **القراءة** `optionalSupabaseAuth`: الزائر لا يُستعلَم له شيء أصلًا — يرى
 * المحاكاة المرجعية الموسومة (قرار المالك: البيانات الحقيقية خلف الدخول).
 * والمسجَّل يقرأ بعميله الخاضع لـRLS؛ وعند العطل أو المهلة (٤ ثوانٍ) تنهض
 * المحاكاة موسومة. و**الفراغ لا يُحكم من نتيجة فلتر**: بحثٌ بلا نتائج لمسجَّلٍ
 * حالةٌ فارغة صادقة، لا سببٌ لعرض محاكاة.
 *
 * **الكتابة** `requireSupabaseAuth` وكلها دوالّ القاعدة (`maint_*`) — هي التي
 * تقرّر الفاعل المسموح والانتقال الصالح، لا هذا الملف.
 *
 * `types.ts` لا يُعاد توليده في هذا المستودع، فالعميل يُقرأ بلا مخطّط مولَّد
 * (`SupabaseClient` عامّ) والأنواع من `maint-types.ts`.
 */
import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { optionalSupabaseAuth } from "@/integrations/supabase/optional-auth-middleware";
import { STAGES } from "@/lib/maintenance/cm-log-rules";
import type {
  MaintAnalytics,
  MaintEvent,
  MaintKpis,
  MaintOrder,
  MaintPage,
  MaintSummary,
  StaffMember,
} from "@/lib/maintenance/maint-types";

const untyped = (c: unknown) => c as SupabaseClient;
const TIMEOUT_MS = 4_000;

function withTimeout<T>(p: PromiseLike<T>): Promise<T> {
  return Promise.race([
    Promise.resolve(p),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("maint-timeout")), TIMEOUT_MS),
    ),
  ]);
}

/** رسالة القاعدة ← عربية محايدة (لا عبارات مصادقة تقنية للمستخدم). */
export function maintErrorMessage(raw: string | undefined): string {
  const m = raw ?? "";
  if (/not allowed|permission denied|42501/i.test(m))
    return "لا تملك صلاحية هذا الإجراء على هذا الأمر.";
  if (/only a manager can close or move back/i.test(m))
    return "الإغلاق النهائي أو إرجاع المرحلة لمدير الصيانة.";
  if (/only a manager can cancel/i.test(m)) return "إلغاء الأمر لمدير الصيانة.";
  if (/hold reason required/i.test(m)) return "اختر سبب الإيقاف.";
  if (/order is closed/i.test(m)) return "هذا الأمر مغلق — لا يتغيّر بعد إغلاقه.";
  if (/assignee is not a member/i.test(m)) return "الفني المختار ليس عضوًا في المؤسسة.";
  if (/invalid due date/i.test(m)) return "تاريخ الاستحقاق يجب أن يكون اليوم أو بعده، خلال سنة.";
  if (/site and description are required/i.test(m)) return "اكتب الموقع ووصف العطل.";
  if (/invalid/i.test(m)) return "قيمة غير صالحة — راجع الحقول.";
  return "تعذّر تنفيذ الإجراء الآن — أعد المحاولة.";
}

// ── القراءة ───────────────────────────────────────────────────────────────
const listInput = z.object({
  tab: z.enum(["active", "history"]),
  q: z.string().trim().max(80).optional(),
  system: z.enum(["CCTV", "GATE", "ACS", "VISIT"]).optional(),
  city: z.string().trim().max(20).optional(),
  status: z.enum(["open", "on_hold", "completed", "cancelled"]).optional(),
  holdReason: z.string().trim().max(30).optional(),
  mine: z.boolean().optional(),
  unassigned: z.boolean().optional(),
  page: z.number().int().min(0).max(500).default(0),
  pageSize: z.number().int().min(5).max(60).default(24),
});
export type MaintListInput = z.input<typeof listInput>;

/** فلترة المحاكاة بالقواعد نفسها — فيتصرّف الزائر كالمسجَّل. */
function filterSim(rows: MaintOrder[], d: z.output<typeof listInput>): MaintPage {
  const q = d.q?.toLowerCase();
  const filtered = rows
    .filter((r) => (d.tab === "active" ? r.status === "open" || r.status === "on_hold" : true))
    .filter((r) => !d.system || r.system === d.system)
    .filter((r) => !d.city || r.city === d.city)
    .filter((r) => !d.status || r.status === d.status)
    .filter((r) => !d.holdReason || (r.hold_reason ?? "unclassified") === d.holdReason)
    .filter((r) => !d.unassigned || !r.assigned_to)
    .filter(
      (r) => !q || [r.ref, r.site, r.component, r.city].some((v) => v?.toLowerCase().includes(q)),
    );
  const sorted =
    d.tab === "active"
      ? filtered.sort((a, b) => (b.overdue_days ?? 0) - (a.overdue_days ?? 0))
      : filtered.sort((a, b) => (b.requested_at ?? "").localeCompare(a.requested_at ?? ""));
  return {
    source: "reference",
    rows: sorted.slice(d.page * d.pageSize, (d.page + 1) * d.pageSize),
    total: sorted.length,
  };
}

async function simPage(d: z.output<typeof listInput>): Promise<MaintPage> {
  const { buildMaintOrdersSimulation } = await import("@/lib/maintenance/maint-simulation");
  return filterSim(buildMaintOrdersSimulation(), d);
}

const hasFilters = (d: z.output<typeof listInput>) =>
  !!(d.q || d.system || d.city || d.status || d.holdReason || d.mine || d.unassigned);

export const listMaintOrders = createServerFn({ method: "POST" })
  .middleware([optionalSupabaseAuth])
  .inputValidator((d: unknown) => listInput.parse(d))
  .handler(async ({ data, context }): Promise<MaintPage> => {
    if (!context.userId) return simPage(data);
    try {
      const db = untyped(context.supabase);
      let q = db.from("maint_orders_v").select("*", { count: "exact" });
      q =
        data.tab === "active"
          ? q.in("status", ["open", "on_hold"])
          : data.status
            ? q.eq("status", data.status)
            : q;
      if (data.system) q = q.eq("system", data.system);
      if (data.city) q = q.eq("city", data.city);
      if (data.holdReason)
        q =
          data.holdReason === "unclassified"
            ? q.is("hold_reason", null)
            : q.eq("hold_reason", data.holdReason);
      if (data.unassigned) q = q.is("assigned_to", null);
      if (data.mine) q = q.or(`assigned_to.eq.${context.userId},created_by.eq.${context.userId}`);
      if (data.q) {
        // الفاصلة والأقواس تكسر صيغة `or` في PostgREST — تُنزع من البحث.
        const s = data.q.replace(/[,()*%]/g, " ").trim();
        if (s) q = q.or(`ref.ilike.*${s}*,site.ilike.*${s}*,component.ilike.*${s}*`);
      }
      q =
        data.tab === "active"
          ? q.order("overdue_days", { ascending: false, nullsFirst: false })
          : q.order("requested_at", { ascending: false, nullsFirst: false });
      const from = data.page * data.pageSize;
      const res = await withTimeout(q.range(from, from + data.pageSize - 1));
      if (res.error) throw new Error(res.error.message);
      const total = res.count ?? 0;
      // الجدول خاوٍ تمامًا (لم يُستورد بعد) ⇐ المحاكاة، كما في `getMaintSummary`؛
      // أمّا فلترٌ بلا نتائج أو «لا أوامر نشطة» في جدولٍ ممتلئ ⇐ فارغٌ صادق.
      if (total === 0 && !hasFilters(data)) {
        const probe = await withTimeout(
          db.from("maint_orders_v").select("id", { count: "exact", head: true }),
        );
        if (!probe.error && (probe.count ?? 0) === 0) return simPage(data);
      }
      return { source: "database", rows: (res.data ?? []) as MaintOrder[], total };
    } catch (e) {
      console.error(
        "[maint] list unavailable — serving reference simulation:",
        (e as Error).message,
      );
      return simPage(data);
    }
  });

export const getMaintSummary = createServerFn({ method: "GET" })
  .middleware([optionalSupabaseAuth])
  .handler(async ({ context }): Promise<MaintSummary> => {
    const sim = async () =>
      (await import("@/lib/maintenance/maint-simulation")).buildMaintSummarySimulation();
    if (!context.userId) return sim();
    try {
      const db = untyped(context.supabase);
      const [k, a] = await withTimeout(
        Promise.all([db.rpc("maint_kpis"), db.rpc("maint_analytics")]),
      );
      if (k.error || a.error) throw new Error((k.error ?? a.error)?.message);
      const kpis = k.data as MaintKpis;
      if (!kpis || kpis.total === 0) return sim();
      return { source: "database", kpis, analytics: a.data as MaintAnalytics };
    } catch (e) {
      console.error(
        "[maint] summary unavailable — serving reference simulation:",
        (e as Error).message,
      );
      return sim();
    }
  });

export const getMaintOrder = createServerFn({ method: "POST" })
  .middleware([optionalSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().min(1).max(64) }).parse(d))
  .handler(
    async ({ data, context }): Promise<{ order: MaintOrder | null; events: MaintEvent[] }> => {
      if (data.id.startsWith("sim-") || !context.userId) {
        const { buildMaintOrdersSimulation } = await import("@/lib/maintenance/maint-simulation");
        return {
          order: buildMaintOrdersSimulation().find((r) => r.id === data.id) ?? null,
          events: [],
        };
      }
      if (!z.string().uuid().safeParse(data.id).success) return { order: null, events: [] };
      const db = untyped(context.supabase);
      const [o, e] = await withTimeout(
        Promise.all([
          db.from("maint_orders_v").select("*").eq("id", data.id).maybeSingle(),
          db
            .from("maint_order_events")
            .select(
              "id, event, from_stage, to_stage, from_status, to_status, hold_reason, note, actor_id, created_at",
            )
            .eq("order_id", data.id)
            .order("created_at", { ascending: true }),
        ]),
      );
      if (o.error) throw new Error(maintErrorMessage(o.error.message));
      return {
        order: (o.data as MaintOrder | null) ?? null,
        events: (e.data ?? []) as MaintEvent[],
      };
    },
  );

/** دليل الإسناد — يعيد قائمة فارغة لغير المدير (القاعدة تقرّر)، وبها تعرف الواجهة دورَه. */
export const getMaintStaffDirectory = createServerFn({ method: "GET" })
  .middleware([optionalSupabaseAuth])
  .handler(async ({ context }): Promise<StaffMember[]> => {
    if (!context.userId) return [];
    try {
      const res = await withTimeout(untyped(context.supabase).rpc("maint_staff_directory"));
      return res.error ? [] : ((res.data ?? []) as StaffMember[]);
    } catch {
      return [];
    }
  });

// ── الكتابة ───────────────────────────────────────────────────────────────
async function callRpc(supabase: unknown, fn: string, args: Record<string, unknown>) {
  const { data, error } = await untyped(supabase).rpc(fn, args);
  if (error) throw new Error(maintErrorMessage(error.message));
  return data as unknown;
}

const realId = z
  .string()
  .uuid()
  .refine((v) => !v.startsWith("sim-"), "simulation rows are read-only");

export const createMaintOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        site: z.string().trim().min(2).max(200),
        city: z.string().trim().max(20).optional(),
        system: z.enum(["CCTV", "GATE", "ACS", "VISIT"]),
        component: z.string().trim().max(120).optional(),
        description: z.string().trim().min(5).max(2000),
        priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
        dueAt: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const ref = await callRpc(context.supabase, "maint_create_order", {
      _site: data.site,
      _city: data.city ?? null,
      _system: data.system,
      _component: data.component ?? null,
      _description: data.description,
      _priority: data.priority,
      _due_at: data.dueAt ?? null,
    });
    return { ref: String(ref) };
  });

export const assignMaintOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: realId, assignee: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await callRpc(context.supabase, "maint_assign", { _order: data.id, _assignee: data.assignee });
    return { ok: true as const };
  });

export const advanceMaintStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ id: realId, toStage: z.enum(STAGES), note: z.string().trim().max(1000).optional() })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await callRpc(context.supabase, "maint_advance_stage", {
      _order: data.id,
      _to_stage: data.toStage,
      _note: data.note ?? null,
    });
    return { ok: true as const };
  });

export const setMaintStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: realId,
        status: z.enum(["open", "on_hold", "cancelled"]),
        holdReason: z
          .enum([
            "approval",
            "power",
            "site_not_ready",
            "access",
            "it_support",
            "civil_cabling",
            "spare_parts",
            "troubleshooting",
          ])
          .optional(),
        note: z.string().trim().max(1000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await callRpc(context.supabase, "maint_set_status", {
      _order: data.id,
      _status: data.status,
      _hold_reason: data.holdReason ?? null,
      _note: data.note ?? null,
    });
    return { ok: true as const };
  });
