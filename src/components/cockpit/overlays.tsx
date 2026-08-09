/**
 * Cockpit overlays — DetailDrawer (layers, stages, KPIs, recommendation,
 * events, notifications, search, risk analysis, decision review) +
 * ActionModal workflows (initiative-create, sector-report) + the section
 * error boundary. Radix Sheet/Dialog supply focus trap, Escape and focus
 * return; every workflow write stays behind an explicit human gate and
 * lands in the simulated audit log (executeAction → correlationId).
 */
import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { Check, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { REGIONS } from "@/lib/regions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { NxButton, NxErrorState, NxSparkline } from "@/components/nx";
import type { CockpitSnapshot } from "./repository";
import { useCockpit, type DrawerTopic, type WorkflowId } from "./use-cockpit";
import { emitCockpitAction } from "./actions";
import { capabilityHref } from "./capabilities";

/* ── Section error isolation (package 01 §عزل الفشل) ─────────────────── */

interface BoundaryProps {
  children: React.ReactNode;
  sectionAr: string;
}

interface BoundaryState {
  failed: boolean;
}

export class CockpitSectionBoundary extends React.Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <div data-audit-exempt>
          <NxErrorState
            title={`تعذر عرض ${this.props.sectionAr}`}
            description="بقية القمرة تعمل — أعد تحميل هذه الوحدة."
            onRetry={() => this.setState({ failed: false })}
          />
        </div>
      );
    }
    return this.props.children;
  }
}

/* ── Drawer content per topic ─────────────────────────────────────────── */

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/8 py-2 text-sm">
      <span className="text-nx-pearl/56">{label}</span>
      <span className="text-end text-nx-pearl">{value}</span>
    </div>
  );
}

function DrawerBody({ topic, snapshot }: { topic: DrawerTopic; snapshot: CockpitSnapshot }) {
  const cockpit = useCockpit();
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const [confirming, setConfirming] = React.useState<string | null>(null);

  switch (topic.type) {
    case "layer": {
      const layer = snapshot.layers.find((l) => l.id === topic.id);
      if (!layer) return null;
      return (
        <div className="flex flex-col">
          <Row
            label="الحالة"
            value={
              layer.status === "healthy" ? "سليمة" : layer.status === "warning" ? "تحذير" : "حرجة"
            }
          />
          <Row label="زمن الاستجابة" value={<bdi dir="ltr">{layer.latencyMs}ms</bdi>} />
          <Row label="معدل الخطأ" value={<bdi dir="ltr">{layer.errorRate}%</bdi>} />
          <Row label="المدخلات" value={layer.inputAr} />
          <Row label="المخرجات" value={layer.outputAr} />
          <Row label="آخر أثر" value={<bdi dir="ltr">{layer.lastTraceId}</bdi>} />
        </div>
      );
    }
    case "stage": {
      const stage = snapshot.runtimeFlow.find((s) => s.id === topic.id);
      if (!stage) return null;
      return (
        <div className="flex flex-col">
          <Row label="المرحلة" value={stage.labelAr} />
          <Row label="الحالة" value={stage.status === "healthy" ? "سليمة" : "تحذير"} />
          <Row label="زمن المرحلة" value={<bdi dir="ltr">{stage.durationMs}ms</bdi>} />
          <Row label="معرف التتبع" value={<bdi dir="ltr">{stage.traceId}</bdi>} />
          {stage.id === "approval" ? (
            <p className="mt-3 text-xs leading-relaxed text-nx-gold">
              بوابة الاعتماد البشري — لا يعبر أي تنفيذ دون قرار إنسان صريح (المادة الثامنة).
            </p>
          ) : null}
        </div>
      );
    }
    case "kpi": {
      const metric = snapshot.metrics.find((m) => m.id === topic.id);
      if (!metric) return null;
      return (
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tabular-nums text-nx-pearl">{metric.value}</span>
            {metric.unit ? <span className="text-sm text-nx-pearl/56">{metric.unit}</span> : null}
          </div>
          <NxSparkline
            points={metric.history}
            width={220}
            height={48}
            label={`تاريخ ${metric.labelAr} خلال الفترات الست الأخيرة`}
          />
          <div className="flex flex-col">
            <Row label="مصدر البيانات" value={metric.source} />
            <Row label="آخر تحديث" value={metric.lastUpdatedAt} />
            <Row
              label="اتجاه الفترة"
              value={
                <bdi dir="ltr">
                  {metric.trend !== undefined
                    ? `${metric.trend > 0 ? "+" : ""}${metric.trend}`
                    : "—"}
                </bdi>
              }
            />
            <Row label="الوسم" value="محاكاة مرجعية · is_simulation" />
          </div>
        </div>
      );
    }
    case "recommendation": {
      const region = snapshot.regions.find(
        (r) => r.regionId === snapshot.sadeed.recommendationRegionId,
      );
      return (
        <div className="flex flex-col gap-3">
          <p className="text-sm leading-relaxed text-nx-pearl/88">
            {cockpit.regionDetail?.recommendationAr ?? snapshot.sadeed.recommendationAr}
          </p>
          <div className="flex flex-col">
            <Row label="درجة الثقة" value={`${Math.round(snapshot.sadeed.confidence * 100)}٪`} />
            <Row label="عدد المصادر" value={snapshot.sadeed.sourceCount} />
            <Row
              label="المنطقة المعنية"
              value={cockpit.regionDetail?.labelAr ?? region?.labelAr ?? "—"}
            />
            <Row label="طبيعة التوصية" value="استشارية — التنفيذ خلف بوابة الاعتماد" />
          </div>
          <NxButton
            variant="executive"
            size="lg"
            data-action="overlay.confirm"
            loading={cockpit.commandBusy}
            onClick={async () => {
              emitCockpitAction("overlay.confirm");
              const result = await cockpit.runCommand("sadeed.recommendation.open", {
                decision: "approve-recommendation",
              });
              if (result) {
                toast.success(`اعتُمدت التوصية — معرف الارتباط ${result.correlationId}`);
                cockpit.closeOverlay();
              }
            }}
          >
            اعتماد التوصية (بوابة بشرية)
          </NxButton>
        </div>
      );
    }
    case "event": {
      const event =
        snapshot.events.find((e) => e.id === topic.id) ??
        cockpit.events.find((e) => e.id === topic.id);
      if (!event) return <p className="text-sm text-nx-pearl/56">الحدث لم يعد متاحًا.</p>;
      return (
        <div className="flex flex-col">
          <Row label="العنوان" value={event.titleAr} />
          <Row label="التفاصيل" value={event.detailAr} />
          <Row label="المصدر" value={event.source} />
          <Row label="الوقت" value={<bdi dir="ltr">{event.time}</bdi>} />
          <Row
            label="الخطورة"
            value={
              event.severity === "critical"
                ? "حرجة"
                : event.severity === "warning"
                  ? "تحذير"
                  : event.severity === "success"
                    ? "نجاح"
                    : "معلومة"
            }
          />
        </div>
      );
    }
    case "notifications":
      return (
        <ul className="flex flex-col gap-2">
          {cockpit.notifications.map((n) => (
            <li
              key={n.id}
              className={cn(
                "nx-glass-e1 rounded-nx-12 flex flex-col gap-0.5 border p-3",
                n.read ? "border-white/8 opacity-72" : "border-nx-cyan/30",
              )}
            >
              <span className="flex items-center justify-between text-sm font-bold text-nx-pearl">
                {n.titleAr}
                <bdi className="text-[12px] font-normal text-nx-pearl/64" dir="ltr">
                  {n.time}
                </bdi>
              </span>
              <span className="text-xs text-nx-pearl/64">{n.detailAr}</span>
              {!n.read ? <span className="text-[12px] text-nx-cyan">غير مقروء</span> : null}
            </li>
          ))}
        </ul>
      );
    case "search": {
      const query = search.trim();
      const results = query
        ? [
            ...snapshot.metrics
              .filter((m) => m.labelAr.includes(query))
              .map((m) => ({
                key: `m-${m.id}`,
                labelAr: m.labelAr,
                kind: "مؤشر",
                open: () => cockpit.openDrawer({ type: "kpi", id: m.id }),
              })),
            ...snapshot.regions
              .filter((r) => r.labelAr.includes(query))
              .map((r) => ({
                key: `r-${r.regionId}`,
                labelAr: r.labelAr,
                kind: "منطقة",
                open: () => cockpit.selectRegion(r.regionId),
              })),
            ...cockpit.events
              .filter((e) => e.titleAr.includes(query) || e.detailAr.includes(query))
              .map((e) => ({
                key: `e-${e.id}`,
                labelAr: e.titleAr,
                kind: "حدث",
                open: () => cockpit.openDrawer({ type: "event", id: e.id }),
              })),
            // نتيجة «قدرة» كانت `() => undefined` — سطرٌ يظهر في البحث ولا
            // يفعل شيئًا عند النقر. صارت تفتح وجهة البطاقة الكانونية نفسها
            // (`capabilityHref`)، فلا يوجد في الدرج سطر ميت ولا باب قديم.
            ...snapshot.capabilities
              .filter((c) => c.labelAr.includes(query))
              .map((c) => ({
                key: `c-${c.id}`,
                labelAr: c.labelAr,
                kind: "قدرة",
                open: () => {
                  cockpit.closeOverlay();
                  navigate({ to: capabilityHref(c.id) });
                },
              })),
          ]
        : [];
      return (
        <div className="flex flex-col gap-3">
          <label className="nx-glass-e1 rounded-nx-12 flex items-center gap-2 border border-white/14 px-3 py-2">
            <Search aria-hidden className="size-4 text-nx-pearl/48" />
            <span className="sr-only">ابحث في القمرة</span>
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث في المؤشرات والمناطق والأحداث…"
              className="w-full bg-transparent text-sm text-nx-pearl outline-none placeholder:text-nx-pearl/38"
            />
          </label>
          {query && results.length === 0 ? (
            <p className="text-sm text-nx-pearl/56">لا نتائج لـ«{query}» — جرّب كلمة أقصر.</p>
          ) : null}
          <ul className="flex flex-col gap-1">
            {results.slice(0, 12).map((r) => (
              <li key={r.key}>
                <button
                  type="button"
                  data-action="events.open"
                  onClick={r.open}
                  className="flex min-h-11 w-full items-center justify-between gap-2 rounded-nx-8 px-2 text-start text-sm text-nx-pearl/80 hover:bg-white/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nx-cyan"
                >
                  {r.labelAr}
                  <span className="text-[12px] text-nx-pearl/64">{r.kind}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      );
    }
    case "risk-analysis":
      return (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-nx-pearl/56">
            توزيع المخاطر على المناطق الأربع — محاكاة مرجعية موسومة.
          </p>
          <ul className="flex flex-col gap-2">
            {snapshot.regions.map((region) => (
              <li
                key={region.regionId}
                className="nx-glass-e1 rounded-nx-12 flex items-center justify-between gap-3 border border-white/8 p-3"
              >
                <span className="text-sm text-nx-pearl">{region.labelAr}</span>
                <span className="flex items-center gap-3 text-xs">
                  <span className="text-nx-pearl/56">بلاغات: {region.openIncidents}</span>
                  <span
                    className={cn(
                      "rounded-nx-8 border px-2 py-0.5",
                      region.status === "warning"
                        ? "border-nx-warning/50 text-nx-warning"
                        : "border-nx-success/40 text-nx-success",
                    )}
                  >
                    {region.status === "warning" ? "انتباه" : "تحت السيطرة"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      );
    case "decision-review":
      return (
        <ul className="flex flex-col gap-2">
          {snapshot.pendingDecisions.map((decision) => {
            const region = REGIONS.find((r) => r.id === decision.regionId);
            const isConfirming = confirming === decision.id;
            return (
              <li
                key={decision.id}
                className="nx-glass-e1 rounded-nx-12 flex flex-col gap-2 border border-nx-gold/24 p-3"
              >
                <span className="text-sm font-bold text-nx-pearl">{decision.titleAr}</span>
                <span className="text-xs text-nx-pearl/64">
                  {region?.shortAr ?? "—"} · {decision.impactAr}
                </span>
                {isConfirming ? (
                  <div className="flex items-center gap-2">
                    <NxButton
                      variant="executive"
                      size="lg"
                      data-action="overlay.confirm"
                      loading={cockpit.commandBusy}
                      onClick={async () => {
                        emitCockpitAction("overlay.confirm");
                        const result = await cockpit.runCommand("quick.decisions.review", {
                          decisionId: decision.id,
                        });
                        if (result) {
                          toast.success(`اعتُمد القرار — ${result.correlationId}`);
                          setConfirming(null);
                        }
                      }}
                    >
                      تأكيد الاعتماد
                    </NxButton>
                    <NxButton
                      variant="ghost"
                      size="lg"
                      data-action="overlay.close"
                      onClick={() => setConfirming(null)}
                    >
                      تراجع
                    </NxButton>
                  </div>
                ) : (
                  <NxButton
                    variant="outline"
                    size="lg"
                    data-action="quick.decisions.review"
                    onClick={() => {
                      emitCockpitAction("quick.decisions.review");
                      setConfirming(decision.id);
                    }}
                  >
                    اعتماد (يتطلب تأكيدًا بشريًا)
                  </NxButton>
                )}
              </li>
            );
          })}
        </ul>
      );
    default:
      return null;
  }
}

const DRAWER_TITLE: Record<DrawerTopic["type"], string> = {
  layer: "تفاصيل الطبقة",
  stage: "تفاصيل المرحلة",
  kpi: "تفاصيل المؤشر",
  recommendation: "القرار بالتفصيل",
  event: "تفاصيل الحدث",
  notifications: "الإشعارات",
  search: "البحث",
  "risk-analysis": "تحليل المخاطر",
  "decision-review": "القرارات المعلقة",
};

/* ── Workflows (ActionModal) ──────────────────────────────────────────── */

function InitiativeCreateForm({ onDone }: { onDone: () => void }) {
  const cockpit = useCockpit();
  const [name, setName] = React.useState("");
  const [regionId, setRegionId] = React.useState(cockpit.selectedRegion);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim()) {
          setError("اكتب اسم المبادرة أولًا");
          return;
        }
        setError(null);
        setSubmitting(true);
        const result = await cockpit.runCommand("quick.initiative.create", {
          name: name.trim().slice(0, 120),
          regionId,
        });
        setSubmitting(false);
        if (result) {
          toast.success(`أُنشئت المبادرة في المحاكاة — ${result.correlationId}`);
          onDone();
        }
      }}
    >
      <label className="flex flex-col gap-1 text-sm text-nx-pearl/72">
        اسم المبادرة
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="nx-glass-e1 rounded-nx-12 border border-white/14 px-3 py-2 text-sm text-nx-pearl outline-none focus-visible:ring-2 focus-visible:ring-nx-cyan"
          placeholder="مثال: تحسين جاهزية محطات النقل"
        />
      </label>
      <fieldset className="flex flex-col gap-1 text-sm text-nx-pearl/72">
        <legend className="mb-1">المنطقة المستهدفة</legend>
        <div className="flex flex-wrap gap-2">
          {REGIONS.map((region) => {
            const selected = regionId === region.id;
            return (
              <label
                key={region.id}
                className={cn(
                  "rounded-nx-8 inline-flex min-h-11 cursor-pointer items-center gap-1.5 border px-3 py-1.5 text-xs",
                  selected ? "border-nx-cyan/60 text-nx-cyan" : "border-white/14 text-nx-pearl/64",
                )}
              >
                <input
                  type="radio"
                  name="region"
                  value={region.id}
                  checked={selected}
                  onChange={() => setRegionId(region.id)}
                  className="sr-only"
                />
                {/* Non-color selection cue (WCAG 1.4.1): a check icon, not
                    colour alone, marks the chosen region. */}
                <Check
                  aria-hidden
                  className={cn("size-3.5 shrink-0", selected ? "opacity-100" : "opacity-0")}
                />
                {region.shortAr}
              </label>
            );
          })}
        </div>
      </fieldset>
      {error ? <p className="text-xs text-nx-critical">{error}</p> : null}
      <p className="text-[12px] text-nx-pearl/64">
        الإنشاء يسجَّل في بيئة المحاكاة المرجعية فقط، ويمر عبر بوابة الاعتماد قبل أي تنفيذ.
      </p>
      <NxButton
        type="submit"
        variant="executive"
        size="lg"
        data-action="overlay.confirm"
        loading={submitting}
      >
        إنشاء المبادرة
      </NxButton>
    </form>
  );
}

function SectorReportBody({ snapshot }: { snapshot: CockpitSnapshot }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-nx-pearl/56">
        ملخص أداء المناطق الأربع — يولَّد من لقطة المحاكاة الحالية.
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-start text-xs text-nx-pearl/56">
            <th className="py-1 text-start font-medium">المنطقة</th>
            <th className="py-1 text-start font-medium">الجاهزية</th>
            <th className="py-1 text-start font-medium">الاتجاه</th>
            <th className="py-1 text-start font-medium">تصاريح نشطة</th>
          </tr>
        </thead>
        <tbody>
          {snapshot.regions.map((region) => (
            <tr key={region.regionId} className="border-t border-white/8 text-nx-pearl/80">
              <td className="py-1.5">{region.labelAr}</td>
              <td className="py-1.5 tabular-nums">{region.readiness}٪</td>
              <td className="py-1.5 tabular-nums" dir="ltr">
                +{region.trend}%
              </td>
              <td className="py-1.5 tabular-nums">{region.activePermits}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[12px] text-nx-pearl/64">
        محاكاة مرجعية موسومة — التقرير الرسمي يصدر من وحدة التقارير.
      </p>
      <a
        href="/sec/reports"
        data-action="nav.reports"
        onClick={() => emitCockpitAction("nav.reports")}
        className="text-sm text-nx-cyan underline-offset-4 hover:underline"
      >
        فتح وحدة التقارير الكاملة
      </a>
    </div>
  );
}

const WORKFLOW_TITLE: Record<WorkflowId, { title: string; description: string }> = {
  "initiative-create": {
    title: "إنشاء مبادرة جديدة",
    description: "تدفق إنشاء مبادرة — خلف بوابة الاعتماد البشري.",
  },
  "sector-report": {
    title: "تقرير أداء القطاعات",
    description: "ملخص فوري من لقطة القمرة الحالية.",
  },
};

/* ── Root overlay host ────────────────────────────────────────────────── */

export function CockpitOverlays({ snapshot }: { snapshot: CockpitSnapshot }) {
  const cockpit = useCockpit();
  const { overlay, closeOverlay } = cockpit;

  return (
    <>
      <Sheet
        open={overlay?.kind === "drawer"}
        onOpenChange={(open) => {
          if (!open) closeOverlay();
        }}
      >
        <SheetContent
          side="right"
          data-testid="detail-drawer"
          className="flex w-full max-w-md flex-col gap-4 overflow-y-auto border-white/10 bg-nx-obsidian text-nx-pearl"
        >
          {overlay?.kind === "drawer" ? (
            <>
              <SheetHeader>
                <SheetTitle className="text-start text-nx-pearl">
                  {DRAWER_TITLE[overlay.topic.type]}
                </SheetTitle>
              </SheetHeader>
              <DrawerBody topic={overlay.topic} snapshot={snapshot} />
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog
        open={overlay?.kind === "modal"}
        onOpenChange={(open) => {
          if (!open) closeOverlay();
        }}
      >
        <DialogContent
          data-testid="action-modal"
          className="border-white/10 bg-nx-obsidian text-nx-pearl sm:max-w-lg"
        >
          {overlay?.kind === "modal" ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-start text-nx-pearl">
                  {WORKFLOW_TITLE[overlay.workflow].title}
                </DialogTitle>
                <DialogDescription className="text-start text-nx-pearl/56">
                  {WORKFLOW_TITLE[overlay.workflow].description}
                </DialogDescription>
              </DialogHeader>
              {overlay.workflow === "initiative-create" ? (
                <InitiativeCreateForm onDone={closeOverlay} />
              ) : (
                <SectorReportBody snapshot={snapshot} />
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
