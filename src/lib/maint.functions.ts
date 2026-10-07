/**
 * خادم صفحة الصيانة — أوامر العمل من `maint_orders`: سجل الصيانة التصحيحية
 * (CM) وتصدير SAP PM، بيانات فعلية لا محاكاة (أمر المالك ٢٠٢٦/١٠/٠٦: «ازل
 * بيانات المحاكاة واعتمد هذه البيانات المرفقة كبيانات فعلية وحقيقية»).
 *
 * **القراءة** `optionalSupabaseAuth` — والقاعدة تقرّر ما يُرى لا هذا الملف:
 * العضو يرى مؤسسته كاملة؛ والزائر يرى الأوامر في **نافذة القراءة العامة** (حتى
 * 2027-04-06، `maint_public_read_open()`) بلا أسماء ولا أرقام وظيفية ولا ملاحظات
 * — العرض `maint_orders_v` يحجبها لغير الأعضاء. وبعد النافذة يعود العرض فارغًا
 * للزائر، فتدعوه الصفحة للدخول.
 *
 * **لا محاكاة ولا بديل:** العطل أو المهلة (٤ ثوانٍ) ⇐ خطأٌ عربي ترفعه الدالّة
 * فتعرضه الصفحة بزرّ «أعد المحاولة». والفراغ فراغٌ صادق.
 *
 * **الكتابة** `requireSupabaseAuth` وكلها دوالّ القاعدة (`maint_*`) — هي التي
 * تقرّر الفاعل المسموح والانتقال الصالح.
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
  if (/invalid region/i.test(m)) return "اختر منطقة من المناطق الأربع.";
  if (/invalid due date/i.test(m)) return "تاريخ الاستحقاق يجب أن يكون اليوم أو بعده، خلال سنة.";
  if (/site and description are required/i.test(m)) return "اكتب الموقع ووصف العطل.";
  if (/invalid/i.test(m)) return "قيمة غير صالحة — راجع الحقول.";
  return "تعذّر تنفيذ الإجراء الآن — أعد المحاولة.";
}

// ── القراءة ───────────────────────────────────────────────────────────────
/** خطأ قراءةٍ تعرضه الصفحة كما هو — عربيٌّ محايد بلا تفاصيل تقنية. */
const READ_FAILED = "تعذّر تحميل بيانات الصيانة الآن — أعد المحاولة.";

const listInput = z.object({
  tab: z.enum(["active", "history"]),
  q: z.string().trim().max(80).optional(),
  system: z.enum(["CCTV", "GATE", "ACS", "VISIT", "CONTROL", "PIDS"]).optional(),
  kind: z.enum(["corrective", "preventive"]).optional(),
  region: z.enum(["central", "western", "eastern", "southern"]).optional(),
  city: z.string().trim().max(20).optional(),
  status: z.enum(["open", "on_hold", "completed", "cancelled"]).optional(),
  holdReason: z.string().trim().max(30).optional(),
  mine: z.boolean().optional(),
  unassigned: z.boolean().optional(),
  page: z.number().int().min(0).max(500).default(0),
  pageSize: z.number().int().min(5).max(60).default(24),
});
export type MaintListInput = z.input<typeof listInput>;

export const listMaintOrders = createServerFn({ method: "POST" })
  .middleware([optionalSupabaseAuth])
  .inputValidator((d: unknown) => listInput.parse(d))
  .handler(async ({ data, context }): Promise<MaintPage> => {
    const db = untyped(context.supabase);
    let q = db.from("maint_orders_v").select("*", { count: "exact" });
    q =
      data.tab === "active"
        ? q.in("status", ["open", "on_hold"])
        : data.status
          ? q.eq("status", data.status)
          : q;
    if (data.system) q = q.eq("system", data.system);
    if (data.kind) q = q.eq("kind", data.kind);
    if (data.region) q = q.eq("region", data.region);
    if (data.city) q = q.eq("city", data.city);
    if (data.holdReason)
      q =
        data.holdReason === "unclassified"
          ? q.is("hold_reason", null)
          : q.eq("hold_reason", data.holdReason);
    if (data.unassigned) q = q.eq("is_assigned", false);
    // «أوامري» للمسجَّل وحده — والزائر لا مُعرِّف له فلا يُفلتر به.
    if (data.mine && context.userId)
      q = q.or(`assigned_to.eq.${context.userId},created_by.eq.${context.userId}`);
    if (data.q) {
      // الفاصلة والأقواس تكسر صيغة `or` في PostgREST — تُنزع من البحث.
      const t = data.q.replace(/[,()*%]/g, " ").trim();
      if (t)
        q = q.or(
          `ref.ilike.*${t}*,site.ilike.*${t}*,component.ilike.*${t}*,description.ilike.*${t}*,functional_location.ilike.*${t}*`,
        );
    }
    q =
      data.tab === "active"
        ? q.order("overdue_days", { ascending: false, nullsFirst: false })
        : q.order("requested_at", { ascending: false, nullsFirst: false });
    const from = data.page * data.pageSize;
    try {
      const res = await withTimeout(q.range(from, from + data.pageSize - 1));
      if (res.error) throw new Error(res.error.message);
      return { source: "database", rows: (res.data ?? []) as MaintOrder[], total: res.count ?? 0 };
    } catch (e) {
      console.error("[maint] list failed:", (e as Error).message);
      throw new Error(READ_FAILED);
    }
  });

export const getMaintSummary = createServerFn({ method: "GET" })
  .middleware([optionalSupabaseAuth])
  .handler(async ({ context }): Promise<MaintSummary> => {
    const db = untyped(context.supabase);
    try {
      const [k, a] = await withTimeout(
        Promise.all([db.rpc("maint_kpis"), db.rpc("maint_analytics")]),
      );
      if (k.error || a.error) throw new Error((k.error ?? a.error)?.message);
      return {
        source: "database",
        kpis: k.data as MaintKpis,
        analytics: a.data as MaintAnalytics,
      };
    } catch (e) {
      console.error("[maint] summary failed:", (e as Error).message);
      throw new Error(READ_FAILED);
    }
  });

export const getMaintOrder = createServerFn({ method: "POST" })
  .middleware([optionalSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(
    async ({ data, context }): Promise<{ order: MaintOrder | null; events: MaintEvent[] }> => {
      const db = untyped(context.supabase);
      const [o, e] = await withTimeout(
        Promise.all([
          db.from("maint_orders_v").select("*").eq("id", data.id).maybeSingle(),
          // الخط الزمني للأعضاء وحدهم (القاعدة تحجبه عن الزائر) — حجبُه ليس عطلًا.
          context.userId
            ? db
                .from("maint_order_events")
                .select(
                  "id, event, from_stage, to_stage, from_status, to_status, hold_reason, note, actor_id, created_at",
                )
                .eq("order_id", data.id)
                .order("created_at", { ascending: true })
            : Promise.resolve({ data: [], error: null }),
        ]),
      );
      if (o.error) throw new Error(READ_FAILED);
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

const realId = z.string().uuid();

export const createMaintOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        site: z.string().trim().min(2).max(200),
        city: z.string().trim().max(20).optional(),
        region: z.enum(["central", "western", "eastern", "southern"]).optional(),
        system: z.enum(["CCTV", "GATE", "ACS", "VISIT", "CONTROL", "PIDS"]),
        kind: z.enum(["corrective", "preventive"]).default("corrective"),
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
    const ref = await callRpc(context.supabase, "maint_create_order_v2", {
      _site: data.site,
      _city: data.city ?? null,
      _region: data.region ?? null,
      _system: data.system,
      _kind: data.kind,
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
