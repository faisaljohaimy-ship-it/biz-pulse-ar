/**
 * درج تفاصيل أمر العمل — المراحل الثماني بنسبها، والبيانات الفنية والمالية،
 * والخط الزمني، والإجراءات بحسب الدور:
 *  • الفني المُسنَد: «انقل إلى المرحلة التالية» حتى «اختبار وتشغيل»، وإيقاف/استئناف.
 *  • مدير الصيانة: الإسناد، أي مرحلة، **الإغلاق بعد التحقق**، والإلغاء.
 *  • غيرهما والزائر: قراءة فقط، مع سبب ذلك.
 * القاعدة تقرّر الصلاحية فعلًا (`maint_*`)؛ الواجهة تُظهر الممكن لا تمنحه.
 * والإغلاق والإلغاء بخطوة تأكيد ثانية (بوابة التأكيد البشري).
 */
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, CircleCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import {
  advanceMaintStage,
  assignMaintOrder,
  getMaintOrder,
  setMaintStatus,
} from "@/lib/maint.functions";
import {
  HOLD_REASON_AR,
  STAGES,
  STAGE_AR,
  STAGE_PCT,
  STATUS_AR,
  nextStage,
  type HoldReason,
  type Stage,
} from "@/lib/maintenance/cm-log-rules";
import type { MaintOrder, StaffMember } from "@/lib/maintenance/maint-types";
import {
  OverdueBadge,
  PersonLine,
  StageBar,
  StatusChip,
  SystemTile,
  cityAr,
  fmt,
  fmtDate,
  fmtSar,
  holdAr,
  systemAr,
} from "@/components/sec/maint/maint-ui";
import { cn } from "@/lib/utils";

const SELECT =
  "nx-focus-ring h-11 w-full rounded-lg border border-[color:var(--hairline)] bg-[color:var(--surface)] px-3 text-sm text-[color:var(--ink)]";

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-[color:var(--hairline-soft)] p-2.5">
      <dt className="text-[12px] text-[color:var(--ink-3)]">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-bold text-[color:var(--ink)]">{value}</dd>
    </div>
  );
}

export function MaintOrderSheet({
  order,
  staff,
  onClose,
}: {
  order: MaintOrder | null;
  staff: StaffMember[];
  onClose: () => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fetchOrder = useServerFn(getMaintOrder);
  const advance = useServerFn(advanceMaintStage);
  const assign = useServerFn(assignMaintOrder);
  const setStatus = useServerFn(setMaintStatus);

  const id = order?.id ?? null;
  const detail = useQuery({
    queryKey: ["maint", "order", id, user?.id ?? null],
    queryFn: () => fetchOrder({ data: { id: id as string } }),
    enabled: !!id,
  });
  const o = detail.data?.order ?? order;

  const [note, setNote] = useState("");
  const [assignee, setAssignee] = useState("");
  const [targetStage, setTargetStage] = useState<Stage | "">("");
  const [holdReason, setHoldReason] = useState<HoldReason | "">("");
  const [confirm, setConfirm] = useState<null | "close" | "cancel">(null);
  useEffect(() => {
    setNote("");
    setAssignee("");
    setTargetStage("");
    setHoldReason("");
    setConfirm(null);
  }, [id]);

  const done = async (msg: string) => {
    toast.success(msg);
    setNote("");
    setConfirm(null);
    await qc.invalidateQueries({ queryKey: ["maint"] });
  };
  const fail = (e: unknown) =>
    toast.error(e instanceof Error ? e.message : "تعذّر تنفيذ الإجراء الآن.");

  const mAdvance = useMutation({
    mutationFn: (to: Stage) =>
      advance({ data: { id: id as string, toStage: to, note: note || undefined } }),
    onSuccess: (_d, to) => done(`نُقل الأمر إلى «${STAGE_AR[to]}» — ${fmt(STAGE_PCT[to])}٪`),
    onError: fail,
  });
  const mAssign = useMutation({
    mutationFn: (to: string) => assign({ data: { id: id as string, assignee: to } }),
    onSuccess: () => done("أُسند الأمر للفني"),
    onError: fail,
  });
  const mStatus = useMutation({
    mutationFn: (v: { status: "open" | "on_hold" | "cancelled"; holdReason?: HoldReason }) =>
      setStatus({ data: { id: id as string, ...v, note: note || undefined } }),
    onSuccess: (_d, v) => done(`أصبح الأمر: ${STATUS_AR[v.status]}`),
    onError: fail,
  });
  const busy = mAdvance.isPending || mAssign.isPending || mStatus.isPending;

  if (!o) return null;
  const isSim = o.id.startsWith("sim-");
  const isManager = staff.length > 0;
  const isAssignee = !!user && o.assigned_to === user.id;
  const active = o.status === "open" || o.status === "on_hold";
  const canWork = !isSim && !!user && active && (isManager || isAssignee);
  const next = nextStage(o.stage);
  const techNext = next && next !== "closed" ? next : null;
  const events = detail.data?.events ?? [];

  return (
    <Sheet open={!!order} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="left" className="w-full overflow-y-auto sm:max-w-xl" dir="rtl">
        <SheetHeader className="text-start">
          <div className="flex items-start gap-3">
            <SystemTile system={o.system} />
            <div className="min-w-0">
              <SheetTitle className="text-start text-lg font-black">
                {o.component ?? o.description ?? "أمر عمل"}
              </SheetTitle>
              <SheetDescription className="text-start">
                <bdi className="font-mono">{o.ref}</bdi> · {systemAr(o.system)} · {o.site ?? "—"} ·{" "}
                {cityAr(o.city)}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          <section
            aria-label="نسبة الإنجاز"
            className="rounded-2xl border border-[color:var(--hairline)] p-4"
          >
            <StageBar stage={o.stage} status={o.status} pct={o.progress_pct} />
            <div className="mt-2 flex flex-wrap gap-1.5">
              <StatusChip status={o.status} holdReason={o.hold_reason} />
              <OverdueBadge days={o.overdue_days} />
            </div>
            <ol className="mt-4 grid gap-1.5">
              {STAGES.map((s, i) => {
                const reached = o.status === "completed" || i <= STAGES.indexOf(o.stage);
                const current = o.status !== "completed" && s === o.stage;
                return (
                  <li
                    key={s}
                    aria-current={current ? "step" : undefined}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-2 py-1 text-[13px]",
                      current && "bg-[color:var(--chip-strong)] font-bold",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "grid size-5 shrink-0 place-items-center rounded-full border",
                        reached
                          ? "border-[color:var(--tone-emerald)] text-[color:var(--tone-emerald)]"
                          : "border-[color:var(--hairline)] text-transparent",
                      )}
                    >
                      <Check className="size-3" />
                    </span>
                    <span className="flex-1 text-[color:var(--ink)]">{STAGE_AR[s]}</span>
                    <span className="tabular-nums text-[color:var(--ink-3)]">
                      {fmt(STAGE_PCT[s])}٪
                    </span>
                  </li>
                );
              })}
            </ol>
            {o.stage_basis === "import_evidence" && active && (
              <p className="mt-3 rounded-lg bg-[color:var(--chip)] p-2 text-[12px] leading-relaxed text-[color:var(--ink-2)]">
                المرحلة مستنتجة من ملاحظة الفني في سجل الصيانة: ملاحظةٌ تطلب قطعة أو اعتمادًا ⇐
                «بانتظار قطع غيار» · تشخيصٌ جارٍ ⇐ «الفني في الموقع» · ملاحظةٌ فنية أخرى ⇐ «تم
                التشخيص» · بلا ملاحظة ⇐ «مسجَّل». تُصحَّح بأول تحديثٍ من الفني أو المدير.
              </p>
            )}
          </section>

          <section aria-label="المسؤولون" className="grid gap-1.5">
            <PersonLine
              label="المُنشئ"
              name={o.created_by_name}
              staff={o.created_by_staff}
              emptyText={o.source === "cm_log" ? "مستورد من سجل الصيانة" : "غير معروف"}
            />
            <PersonLine
              label="الفني المُسنَد"
              name={o.assigned_to_name}
              staff={o.assigned_to_staff}
              emptyText="غير مُسنَد بعد"
            />
          </section>

          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Fact label="تاريخ الطلب" value={fmtDate(o.requested_at)} />
            <Fact label="الإنجاز المتفق عليه" value={fmtDate(o.due_at)} />
            <Fact
              label={o.status === "completed" ? "تاريخ الإنجاز" : "عمر الطلب"}
              value={
                o.status === "completed"
                  ? fmtDate(o.completed_at)
                  : o.age_days === null
                    ? "—"
                    : `${fmt(o.age_days)} يومًا`
              }
            />
            <Fact
              label="أمر SAP"
              value={o.sap_wo ? <bdi className="font-mono">{o.sap_wo}</bdi> : "معلَّق — بلا رقم"}
            />
            <Fact label="أمر الشراء PO" value={o.po ?? "—"} />
            <Fact label="بند العقد · الكمية" value={`${o.boq_item ?? "—"} · ${fmt(o.qty)}`} />
            <Fact label="تكلفة الصيانة" value={fmtSar(o.maintenance_cost)} />
            <Fact label="قطع الغيار" value={fmtSar(o.spares_cost)} />
            <Fact
              label="غرامة التأخير"
              // المادة ٢٧: الفراغ في السجل «غير مسجّلة»، والصفر وحده «لا غرامة».
              value={
                o.delay_penalty === null
                  ? "غير مسجّلة"
                  : o.delay_penalty === 0
                    ? "لا غرامة"
                    : fmtSar(o.delay_penalty)
              }
            />
          </dl>

          {(o.description || o.notes) && (
            <section aria-label="الوصف والملاحظات" className="space-y-2">
              {o.description && (
                <p className="text-sm leading-relaxed text-[color:var(--ink)]">{o.description}</p>
              )}
              {o.notes && (
                <div className="rounded-xl border border-[color:var(--hairline-soft)] p-3">
                  <div className="mb-1 text-[12px] font-bold text-[color:var(--ink-3)]">
                    ملاحظة الفني
                  </div>
                  <p dir="auto" className="text-[13px] leading-relaxed text-[color:var(--ink-2)]">
                    {o.notes}
                  </p>
                </div>
              )}
            </section>
          )}

          {/* ── الإجراءات ── */}
          <section
            aria-label="الإجراءات"
            className="space-y-3 rounded-2xl border border-[color:var(--hairline)] p-4"
          >
            <h3 className="text-sm font-black text-[color:var(--ink)]">تحديث الأمر</h3>
            {isSim || !user ? (
              <p className="text-[13px] text-[color:var(--ink-2)]">
                هذه محاكاة مرجعية للعرض. سجّل الدخول لرؤية أوامر العمل الحقيقية وتحديثها.
              </p>
            ) : !active ? (
              <p className="text-[13px] text-[color:var(--ink-2)]">
                الأمر {STATUS_AR[o.status]} — لا يتغيّر بعد إغلاقه.
              </p>
            ) : !canWork ? (
              <p className="text-[13px] text-[color:var(--ink-2)]">
                يُحدِّث المرحلةَ الفنيُّ المُسنَد أو مديرُ الصيانة.
              </p>
            ) : (
              <>
                <div>
                  <Label htmlFor="mo-note" className="text-[12px]">
                    ملاحظة (اختيارية) — تُحفظ في الخط الزمني
                  </Label>
                  <Textarea
                    id="mo-note"
                    value={note}
                    maxLength={1000}
                    onChange={(e) => setNote(e.target.value)}
                    className="nx-focus-ring mt-1 min-h-16"
                    placeholder="مثال: استُبدل مزوّد الطاقة وتمّ اختبار الكاميرا"
                  />
                </div>

                {techNext && (
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={() => mAdvance.mutate(techNext)}
                    className="h-12 w-full text-base font-bold"
                  >
                    {mAdvance.isPending && <Loader2 className="size-4 animate-spin" />}
                    انقل إلى: {STAGE_AR[techNext]} ({fmt(STAGE_PCT[techNext])}٪)
                  </Button>
                )}

                {isManager && (
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <select
                      aria-label="اختر مرحلة"
                      value={targetStage}
                      onChange={(e) => setTargetStage(e.target.value as Stage)}
                      className={SELECT}
                    >
                      <option value="">مرحلة أخرى (للمدير)…</option>
                      {STAGES.filter((s) => s !== o.stage && s !== "closed").map((s) => (
                        <option key={s} value={s}>
                          {STAGE_AR[s]} — {fmt(STAGE_PCT[s])}٪
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy || !targetStage}
                      onClick={() => targetStage && mAdvance.mutate(targetStage)}
                      className="h-11"
                    >
                      طبّق
                    </Button>
                  </div>
                )}

                {o.status === "on_hold" ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => mStatus.mutate({ status: "open" })}
                    className="h-11 w-full"
                  >
                    استئناف العمل
                  </Button>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <select
                      aria-label="سبب الإيقاف"
                      value={holdReason}
                      onChange={(e) => setHoldReason(e.target.value as HoldReason)}
                      className={SELECT}
                    >
                      <option value="">سبب الإيقاف…</option>
                      {(Object.keys(HOLD_REASON_AR) as HoldReason[]).map((r) => (
                        <option key={r} value={r}>
                          {HOLD_REASON_AR[r]}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy || !holdReason}
                      onClick={() =>
                        holdReason && mStatus.mutate({ status: "on_hold", holdReason })
                      }
                      className="h-11"
                    >
                      إيقاف مؤقت
                    </Button>
                  </div>
                )}

                {isManager && (
                  <div className="grid gap-2 border-t border-[color:var(--hairline-soft)] pt-3">
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                      <select
                        aria-label="إسناد لفني"
                        value={assignee}
                        onChange={(e) => setAssignee(e.target.value)}
                        className={SELECT}
                      >
                        <option value="">إسناد لفني…</option>
                        {staff.map((s) => (
                          <option key={s.user_id} value={s.user_id}>
                            {s.display_name ?? "بلا اسم"}
                            {s.staff_number ? ` · #${s.staff_number}` : " · بلا رقم وظيفي"}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busy || !assignee}
                        onClick={() => mAssign.mutate(assignee)}
                        className="h-11"
                      >
                        إسناد
                      </Button>
                    </div>

                    {confirm === "close" ? (
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          disabled={busy}
                          onClick={() => mAdvance.mutate("closed")}
                          className="h-11 bg-emerald-700 font-bold text-white hover:bg-emerald-800"
                        >
                          <CircleCheck className="size-4" /> تأكيد الإغلاق ١٠٠٪
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setConfirm(null)}
                          className="h-11"
                        >
                          تراجع
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busy}
                        onClick={() => setConfirm("close")}
                        className="h-11 w-full border-emerald-600/60 font-bold text-emerald-700 dark:text-emerald-300"
                      >
                        <CircleCheck className="size-4" /> إغلاق بعد التحقق من الإصلاح
                      </Button>
                    )}

                    {confirm === "cancel" ? (
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant="destructive"
                          disabled={busy}
                          onClick={() => mStatus.mutate({ status: "cancelled" })}
                          className="h-11"
                        >
                          تأكيد الإلغاء
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setConfirm(null)}
                          className="h-11"
                        >
                          تراجع
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setConfirm("cancel")}
                        className="nx-focus-ring min-h-11 text-[13px] font-semibold text-[color:var(--ink-3)] underline-offset-4 hover:underline"
                      >
                        إلغاء الأمر…
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </section>

          {events.length > 0 && (
            <section aria-label="الخط الزمني">
              <h3 className="mb-2 text-sm font-black text-[color:var(--ink)]">الخط الزمني</h3>
              <ol className="space-y-2 border-s border-[color:var(--hairline)] ps-3">
                {events.map((e) => (
                  <li key={e.id} className="text-[13px]">
                    <div className="font-bold text-[color:var(--ink)]">
                      {e.event === "created"
                        ? "أُنشئ الأمر"
                        : e.event === "assigned"
                          ? "أُسند لفني"
                          : e.event === "stage" && e.to_stage
                            ? `${STAGE_AR[e.to_stage]} — ${fmt(STAGE_PCT[e.to_stage])}٪`
                            : e.to_status
                              ? `${STATUS_AR[e.to_status]}${e.hold_reason ? ` — ${holdAr(e.hold_reason)}` : ""}`
                              : "تحديث"}
                    </div>
                    <div className="text-[12px] text-[color:var(--ink-3)]">
                      {new Date(e.created_at).toLocaleString("ar-SA-u-ca-gregory", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                      {user && e.actor_id === user.id && " · أنت"}
                    </div>
                    {e.note && (
                      <p className="mt-0.5 text-[12px] text-[color:var(--ink-2)]">{e.note}</p>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
