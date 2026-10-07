/**
 * بطاقة أمر العمل — ما يحتاجه المشرف في نظرة: ماذا، أين، كم أُنجز، كم تأخّر،
 * ومن أنشأه ومن يعمل عليه (بالاسم والرقم الوظيفي). البطاقة كلّها زرٌّ يفتح
 * التفاصيل — هدف لمس كبير على الجوال.
 */
import { MapPin } from "lucide-react";
import type { MaintOrder } from "@/lib/maintenance/maint-types";
import {
  KindBadge,
  OverdueBadge,
  PersonLine,
  StageBar,
  StatusChip,
  SystemTile,
  cityAr,
  fmt,
  fmtDate,
  regionAr,
  systemAr,
} from "@/components/sec/maint/maint-ui";

/** من أين جاء الأمر حين لا اسم ولا رقم لمنشئه — بلا اسمٍ مختلق. */
export function creatorFallback(o: MaintOrder): string {
  if (o.plan_generated) return "مولَّد آليًّا من خطة الصيانة الوقائية";
  if (o.source === "cm_log") return "مستورد من سجل الصيانة";
  if (o.source === "sap") return "مستورد من SAP";
  return "غير معروف";
}

export function MaintOrderCard({ order: o, onOpen }: { order: MaintOrder; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`أمر العمل ${o.ref} — ${o.component ?? systemAr(o.system)} في ${o.site ?? "موقع غير محدّد"}`}
      className="nx-home-kpi nx-focus-ring flex h-full w-full flex-col gap-3 rounded-2xl border border-[color:var(--hairline)] bg-[color:var(--surface)] p-4 text-start hover:border-[color:var(--tone-blue)]"
    >
      <span className="flex w-full items-start gap-3">
        <SystemTile system={o.system} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <bdi className="font-mono text-[12px] text-[color:var(--ink-3)]">{o.ref}</bdi>
            <span className="text-[12px] text-[color:var(--ink-3)]">{systemAr(o.system)}</span>
            <KindBadge kind={o.kind} />
          </span>
          <span className="mt-0.5 block truncate text-[15px] font-bold text-[color:var(--ink)]">
            {o.component ?? o.description ?? "عطل غير موصوف"}
          </span>
          <span className="mt-0.5 flex min-w-0 items-center gap-1 text-[12px] text-[color:var(--ink-2)]">
            <MapPin aria-hidden className="size-3.5 shrink-0" />
            <span className="truncate">
              {o.site ?? o.functional_location ?? "موقع غير محدّد"} ·{" "}
              {o.city ? cityAr(o.city) : regionAr(o.region)}
            </span>
          </span>
        </span>
      </span>

      <StageBar stage={o.stage} status={o.status} pct={o.progress_pct} />

      <span className="flex flex-wrap items-center gap-1.5">
        <StatusChip status={o.status} holdReason={o.hold_reason} />
        <OverdueBadge days={o.overdue_days} />
        {o.status === "completed" && o.delay_days !== null && o.delay_days > 0 && (
          <span className="text-[12px] font-semibold text-[color:var(--ink-2)]">
            أُنجز بتأخير {fmt(o.delay_days)} يومًا
          </span>
        )}
      </span>

      <span className="mt-auto grid w-full gap-1 border-t border-[color:var(--hairline-soft)] pt-2">
        {o.viewer_is_member ? (
          <>
            <PersonLine
              label="المُنشئ"
              name={o.created_by_name}
              staff={o.created_by_staff}
              emptyText={creatorFallback(o)}
            />
            <PersonLine
              label="الفني"
              name={o.assigned_to_name}
              staff={o.assigned_to_staff}
              emptyText="غير مُسنَد بعد"
            />
          </>
        ) : (
          <span className="text-[12px] text-[color:var(--ink-3)]">
            المُنشئ والفني يظهران لأعضاء المنشأة المسجَّلين
          </span>
        )}
        <span className="text-[12px] text-[color:var(--ink-3)]">
          طُلب {fmtDate(o.requested_at)}
          {o.stage_basis === "import_evidence" &&
            o.status !== "completed" &&
            " · النسبة مستنتجة من ملاحظة الفني"}
        </span>
      </span>
    </button>
  );
}
