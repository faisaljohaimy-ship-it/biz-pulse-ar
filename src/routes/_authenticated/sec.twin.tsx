import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { getTwinTree, type TwinTree } from "@/lib/sec.functions";
import { SecPageHeader, statusClass, severityClass } from "@/components/sec/sec-shell";
import { RegionTwinScene, type TwinAsset } from "@/components/sec/RegionTwinScene";
import { TwinFilmPlayer } from "@/components/twin/TwinFilmPlayer";
import { useRegion } from "@/lib/region-context";
import type { Region } from "@/lib/regions";
// تدقيق تعبيرية الأيقونات ٢٠٢٦/٠٨/٢٧ — القاعدة الموثقة في sec-shell نفسها:
// `Camera` كاميرا تصوير لا مراقبة (الكانونية `Cctv`)، و`Radar` كشفٌ عن بُعد
// لا جولة راجلة (الدوريات `Footprints` في كل الأسطح)، و`ShieldCheck` امتثالٌ
// لا غرفة تحكم (`Monitor` — البطاقة نفسها تعدّ «الشاشات»)، و`KeyRound` مفتاح
// **صلاحيات** الدخول لا البوابة المادية (`DoorOpen` كما في sec.access وتوصية
// SEC-03)، و`Crown` امتياز لا منطقة جغرافية (`MapPin` كانونية RegionSwitcher).
import {
  ChevronRight,
  Network,
  Building,
  Building2,
  Boxes,
  Cctv,
  DoorOpen,
  Activity,
  MapPin,
  Monitor,
  Footprints,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/sec/twin")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: TwinPage,
});

type SelectedKind =
  | "region"
  | "circle"
  | "site"
  | "building"
  | "camera"
  | "gate"
  | "sensor"
  | "control_room"
  | "patrol_team";
type Selected = { kind: SelectedKind; id: string } | null;

/**
 * أصول المشهد من الشجرة المحمّلة: كاميرات وبوابات وحسّاسات المقدّمة.
 *
 * العدد محدود بـ١٤ لا لتقليل الرسم بل لأن ما فوقه يتراكم على المشهد
 * فيحجب البنى التي يُفترض أن يشير إليها. سطر الإعلان الذي كان أسفل
 * المشهد («هضبة نجد … أبرز ١٤ أصلًا من …») حُذف بأمر المالك ٢٠٢٦/٠٨/٢٠
 * («حذف هذا التعليق من التوأم الرقمي») — الحدّ باقٍ، والإعلان لا.
 */
const SCENE_ASSET_CAP = 14;

function sceneAssets(tree: TwinTree | undefined): { shown: TwinAsset[]; total: number } {
  if (!tree) return { shown: [], total: 0 };
  const out: TwinAsset[] = [];
  for (const circle of tree.circles) {
    for (const site of circle.sites) {
      for (const building of site.buildings) {
        for (const cam of building.cameras) {
          out.push({
            id: `cam-${cam.id}`,
            labelAr: `كاميرا ${cam.code}`,
            tone: cam.status === "online" ? "ok" : cam.status === "degraded" ? "warn" : "danger",
          });
        }
        for (const gate of building.gates) {
          out.push({
            id: `gate-${gate.id}`,
            labelAr: `بوابة ${gate.code}`,
            tone: gate.status === "online" ? "ok" : "warn",
          });
        }
        for (const sensor of building.sensors) {
          out.push({
            id: `sensor-${sensor.id}`,
            labelAr: `حسّاس ${sensor.code}`,
            tone: sensor.status === "online" ? "ok" : sensor.status === "alarm" ? "danger" : "warn",
          });
        }
      }
    }
  }
  // ما ليس سليمًا يُعرض أوّلًا: المشهد لوحة إنذار، وإخفاء إنذارٍ خلف حدٍّ
  // عدديّ لأن ترتيب القاعدة صادف أن يضعه أخيرًا عطلٌ لا اختصار.
  const rank = { danger: 0, warn: 1, ok: 2 } as const;
  out.sort((a, b) => rank[a.tone] - rank[b.tone]);
  return { shown: out.slice(0, SCENE_ASSET_CAP), total: out.length };
}

function TwinPage() {
  const fetchTree = useServerFn(getTwinTree);
  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["sec-twin"],
    queryFn: () => fetchTree(),
    refetchInterval: 60_000,
  });
  const [selected, setSelected] = useState<Selected>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["region"]));
  // بأمر المالك ٢٠٢٦/٠٨/٢٠ («حذف الفلاتر ووضع الفلتر على الوسطى لأننا في
  // أيقونة الوسطى»): لا فلتر مناطق محليًّا — المشهد يتبع سياق المنطقة
  // العام (مبدّل الشريط الجانبي) فلا يعرض منطقةً غير التي يقف عليها النظام.
  const { region, regionId } = useRegion();
  const { shown: assets } = useMemo(() => sceneAssets(data), [data]);

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <SecPageHeader
        title="التوأم الرقمي للمناطق"
        subtitle="مشهد مرسوم لكل منطقة، ونموذج هرمي تفاعلي لجميع الأصول الأمنية"
      />

      <section
        aria-live="polite"
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
      >
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 font-semibold ${isError ? "border-rose-300 text-rose-700" : data?.dataSource === "live" ? "border-emerald-300 text-emerald-700" : "border-amber-300 text-amber-700"}`}
          >
            {isError
              ? "تعذر تحديث بيانات التوأم الرقمي"
              : !data
                ? "جاري الاتصال بمصدر البيانات"
                : data.dataSource === "live"
                  ? "بيانات أصول مرتبطة بالنظام"
                  : "بيانات عرض توضيحية — ليست تشغيلية"}
          </span>
          <span className="text-muted-foreground">
            {isFetching ? "جارٍ التحديث…" : "تحديث تلقائي كل 60 ثانية عند توفر الاتصال"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="rounded-full border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          تحديث البيانات
        </button>
      </section>

      {/* المشهد المرسوم — لا `transform` ولا `filter` على هذه الغلافات:
          أيٌّ منها يُسقط كل `position: fixed` في الصفحة إلى نفسه. */}
      <section className="rounded-xl border border-border bg-card p-3">
        <RegionTwinScene regionId={regionId} assets={assets} />
      </section>

      {/* فيلم التوأم الرقمي: مشغّلٌ مضمَّن في الصفحة لا إطارٌ يضمّ /cinematic (كان الإطار يحمل قشرة
          التطبيق مرّتين). الفيلم **مُصيَّر مسبقًا** — ملف فيديو توضيحي لا بثّ ولا بيانات تشغيلية،
          وإفصاحه ووصفه النصّي في المشغّل نفسه فلا ينحرف عن /cinematic. وبياناتُ الأصول وشارة مصدرها
          في القسم أعلاه؛ وشرائح الإعلان القديمة تحت الفيلم حُذفت: كانت تصف «العرض» لا الفيلم وتكرّر
          ما في الشارة. */}
      <section
        className="rounded-2xl border border-cyan-300/40 bg-card p-4 shadow-sm"
        aria-label="تجربة سديد السينمائية"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">التوأم الرقمي السينمائي</h2>
            <p className="text-sm text-muted-foreground">
              فيلم موشن جرافيك توضيحي يشرح فكرة التوأم الرقمي للأمن الصناعي، مستقلّ عن بيانات
              المراقبة الحقيقية.
            </p>
          </div>
          {/* ينتقل إلى صفحة التجربة (لا شاشة كاملة في هذه الصفحة): يُسمّى بما يفعله — #18. */}
          <Link to="/cinematic" className="twin-film-btn nx-focus-ring">
            فتح التجربة السينمائية
          </Link>
        </div>
        <div className="mx-auto mt-4 w-full max-w-4xl">
          <TwinFilmPlayer />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[420px_1fr]">
        <div className="rounded-xl border border-border bg-card p-3 max-h-[78vh] overflow-y-auto">
          {isError && !data ? (
            <div
              role="alert"
              className="space-y-3 rounded-xl border border-rose-300/50 bg-rose-50 p-4 text-sm text-rose-950"
            >
              <p>تعذر الحصول على شجرة الأصول. لن تُعرض أرقام غير موثوقة على أنها بيانات حية.</p>
              <button
                type="button"
                onClick={() => void refetch()}
                className="rounded-full border border-rose-400 px-4 py-2"
              >
                إعادة المحاولة
              </button>
            </div>
          ) : isLoading || !data ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-8 animate-pulse rounded bg-muted/40" />
              ))}
            </div>
          ) : (
            /* بأمر المالك ٢٠٢٦/٠٨/٢٠ («تعديل أسماء إدارة الأمن الصناعي
               بالغربية إلى الوسطى»): اسم الإدارة يتبع المنطقة النشطة من
               `regions.ts` عبر السياق العام، لا نصًّا مثبَّتًا على الغربية
               في صفوف الخادم. */
            <TreeNode
              icon={MapPin}
              label={region.labelAr}
              count={data.circles.length}
              countLabel="دوائر"
              isExpanded={expanded.has("region")}
              isSelected={selected?.kind === "region"}
              onToggle={() => toggle("region")}
              onSelect={() => setSelected({ kind: "region", id: "region" })}
              depth={0}
            >
              {data.circles.map((c) => {
                const cKey = `c-${c.id}`;
                return (
                  <TreeNode
                    key={c.id}
                    icon={Building}
                    label={c.name_ar}
                    count={c.sites.length}
                    countLabel="مواقع"
                    isExpanded={expanded.has(cKey)}
                    isSelected={selected?.kind === "circle" && selected.id === c.id}
                    onToggle={() => toggle(cKey)}
                    onSelect={() => setSelected({ kind: "circle", id: c.id })}
                    depth={1}
                  >
                    {c.sites.map((s) => {
                      const sKey = `s-${s.id}`;
                      return (
                        <TreeNode
                          key={s.id}
                          icon={Building2}
                          label={s.name_ar}
                          count={s.buildings.length}
                          countLabel="مباني"
                          tone={
                            s.status === "operational"
                              ? "ok"
                              : s.status === "degraded"
                                ? "warn"
                                : "danger"
                          }
                          isExpanded={expanded.has(sKey)}
                          isSelected={selected?.kind === "site" && selected.id === s.id}
                          onToggle={() => toggle(sKey)}
                          onSelect={() => setSelected({ kind: "site", id: s.id })}
                          depth={2}
                        >
                          {s.buildings.map((b) => {
                            const bKey = `b-${b.id}`;
                            const childCount = b.cameras.length + b.gates.length + b.sensors.length;
                            return (
                              <TreeNode
                                key={b.id}
                                icon={Boxes}
                                label={b.name_ar}
                                count={childCount}
                                countLabel="أصول"
                                tone={b.status === "operational" ? "ok" : "warn"}
                                isExpanded={expanded.has(bKey)}
                                isSelected={selected?.kind === "building" && selected.id === b.id}
                                onToggle={() => toggle(bKey)}
                                onSelect={() => setSelected({ kind: "building", id: b.id })}
                                depth={3}
                              >
                                {b.cameras.length > 0 && (
                                  <GroupNode label={`📹 الكاميرات (${b.cameras.length})`} depth={4}>
                                    {b.cameras.map((cam) => (
                                      <LeafNode
                                        key={cam.id}
                                        icon={Cctv}
                                        label={`${cam.code} · ${cam.kind}`}
                                        meta={`${cam.health}%`}
                                        tone={
                                          cam.status === "online"
                                            ? "ok"
                                            : cam.status === "degraded"
                                              ? "warn"
                                              : "danger"
                                        }
                                        isSelected={
                                          selected?.kind === "camera" && selected.id === cam.id
                                        }
                                        onSelect={() => setSelected({ kind: "camera", id: cam.id })}
                                        depth={5}
                                      />
                                    ))}
                                  </GroupNode>
                                )}
                                {b.gates.length > 0 && (
                                  <GroupNode label={`🚪 البوابات (${b.gates.length})`} depth={4}>
                                    {b.gates.map((g) => (
                                      <LeafNode
                                        key={g.id}
                                        icon={DoorOpen}
                                        label={`${g.code} · ${g.kind}`}
                                        meta={`${g.events_today}/يوم`}
                                        tone={g.status === "online" ? "ok" : "warn"}
                                        isSelected={
                                          selected?.kind === "gate" && selected.id === g.id
                                        }
                                        onSelect={() => setSelected({ kind: "gate", id: g.id })}
                                        depth={5}
                                      />
                                    ))}
                                  </GroupNode>
                                )}
                                {b.sensors.length > 0 && (
                                  <GroupNode label={`🛰 الحساسات (${b.sensors.length})`} depth={4}>
                                    {b.sensors.map((sn) => (
                                      <LeafNode
                                        key={sn.id}
                                        icon={Activity}
                                        label={`${sn.code} · ${sn.sensor_type}`}
                                        meta={
                                          sn.reading != null ? `${sn.reading}${sn.unit ?? ""}` : "—"
                                        }
                                        tone={
                                          sn.status === "online"
                                            ? "ok"
                                            : sn.status === "alarm"
                                              ? "danger"
                                              : "warn"
                                        }
                                        isSelected={
                                          selected?.kind === "sensor" && selected.id === sn.id
                                        }
                                        onSelect={() => setSelected({ kind: "sensor", id: sn.id })}
                                        depth={5}
                                      />
                                    ))}
                                  </GroupNode>
                                )}
                              </TreeNode>
                            );
                          })}
                        </TreeNode>
                      );
                    })}
                    {c.control_rooms.length > 0 && (
                      <GroupNode label={`🖥 غرف التحكم (${c.control_rooms.length})`} depth={2}>
                        {c.control_rooms.map((cr) => (
                          <LeafNode
                            key={cr.id}
                            icon={Monitor}
                            label={cr.name_ar}
                            meta={`${cr.operators_count} مشغل`}
                            tone={cr.status === "operational" ? "ok" : "warn"}
                            isSelected={selected?.kind === "control_room" && selected.id === cr.id}
                            onSelect={() => setSelected({ kind: "control_room", id: cr.id })}
                            depth={3}
                          />
                        ))}
                      </GroupNode>
                    )}
                    {c.patrol_teams.length > 0 && (
                      <GroupNode label={`🚓 فرق الدوريات (${c.patrol_teams.length})`} depth={2}>
                        {c.patrol_teams.map((pt) => (
                          <LeafNode
                            key={pt.id}
                            icon={Footprints}
                            label={pt.name_ar}
                            meta={`${pt.members_count} عضو`}
                            tone={
                              pt.status === "available"
                                ? "ok"
                                : pt.status === "on-route"
                                  ? "warn"
                                  : "muted"
                            }
                            isSelected={selected?.kind === "patrol_team" && selected.id === pt.id}
                            onSelect={() => setSelected({ kind: "patrol_team", id: pt.id })}
                            depth={3}
                          />
                        ))}
                      </GroupNode>
                    )}
                  </TreeNode>
                );
              })}
            </TreeNode>
          )}
        </div>
        <div className="rounded-xl border border-border bg-card p-4 min-h-[60vh]">
          {data && <DetailsPanel tree={data} selected={selected} region={region} />}
        </div>
      </div>
    </div>
  );
}

type Tone = "ok" | "warn" | "danger" | "muted";
const toneDot: Record<Tone, string> = {
  ok: "bg-emerald-500",
  warn: "bg-amber-500",
  danger: "bg-red-500",
  muted: "bg-muted-foreground",
};

function TreeNode({
  icon: Icon,
  label,
  count,
  countLabel,
  isExpanded,
  isSelected,
  onToggle,
  onSelect,
  depth,
  tone,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count?: number;
  countLabel?: string;
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onSelect: () => void;
  depth: number;
  tone?: Tone;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 rounded-md text-sm cursor-pointer transition-colors",
          isSelected ? "bg-primary/15 text-foreground" : "hover:bg-muted/50 text-foreground",
        )}
        style={{ paddingInlineStart: `${depth * 12 + 4}px` }}
      >
        <button onClick={onToggle} className="p-1 hover:bg-muted rounded" aria-label="toggle">
          <ChevronRight
            className={cn("h-3.5 w-3.5 transition-transform", isExpanded && "rotate-90")}
          />
        </button>
        <button onClick={onSelect} className="flex flex-1 items-center gap-2 py-1.5 text-start">
          <Icon className="h-4 w-4 text-primary shrink-0" />
          {tone && <span className={cn("h-1.5 w-1.5 rounded-full", toneDot[tone])} />}
          <span className="truncate flex-1">{label}</span>
          {count != null && (
            <span className="text-[12px] text-muted-foreground shrink-0">
              {count} {countLabel}
            </span>
          )}
        </button>
      </div>
      {isExpanded && <div>{children}</div>}
    </div>
  );
}
function GroupNode({
  label,
  depth,
  children,
}: {
  label: string;
  depth: number;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-1">
      <div
        className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground py-1"
        style={{ paddingInlineStart: `${depth * 12 + 16}px` }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}
function LeafNode({
  icon: Icon,
  label,
  meta,
  tone,
  isSelected,
  onSelect,
  depth,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  meta?: string;
  tone?: Tone;
  isSelected: boolean;
  onSelect: () => void;
  depth: number;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2 rounded-md py-1 text-xs transition-colors",
        isSelected ? "bg-primary/15 text-foreground" : "hover:bg-muted/40 text-muted-foreground",
      )}
      style={{ paddingInlineStart: `${depth * 12 + 16}px` }}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {tone && <span className={cn("h-1.5 w-1.5 rounded-full", toneDot[tone])} />}
      <span className="truncate flex-1 text-start">{label}</span>
      {meta && <span className="text-[12px] shrink-0">{meta}</span>}
    </button>
  );
}

function DetailsPanel({
  tree,
  selected,
  region,
}: {
  tree: TwinTree;
  selected: Selected;
  region: Region;
}) {
  if (!selected) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <Network className="h-12 w-12 text-muted-foreground/70" aria-hidden />
        <p className="mt-3 text-sm text-muted-foreground">اختر أي عنصر من الشجرة لعرض تفاصيله</p>
        <p className="mt-1 text-[12px] text-muted-foreground">
          المنطقة ← الدائرة ← الموقع ← المبنى ← الأصل
        </p>
      </div>
    );
  }
  if (selected.kind === "region") {
    const totalSites = tree.circles.reduce((s, c) => s + c.sites.length, 0);
    const totalBuildings = tree.circles.reduce(
      (s, c) => s + c.sites.reduce((ss, st) => ss + st.buildings.length, 0),
      0,
    );
    const totalCameras = tree.circles.reduce(
      (s, c) =>
        s +
        c.sites.reduce(
          (ss, st) => ss + st.buildings.reduce((sb, b) => sb + b.cameras.length, 0),
          0,
        ),
      0,
    );
    return (
      /* الاسم من `regions.ts` عبر المنطقة النشطة (أمر المالك ٢٠٢٦/٠٨/٢٠)
         لا من صفّ الخادم المثبَّت على الغربية. */
      <DetailFrame title={region.labelAr} subtitle={region.labelEn} icon={MapPin}>
        <Grid>
          <Cell label="الأقسام" value={tree.sections.length} />
          <Cell label="الدوائر" value={tree.circles.length} />
          <Cell label="المواقع" value={totalSites} />
          <Cell label="المباني" value={totalBuildings} />
          <Cell label="الكاميرات" value={totalCameras} />
        </Grid>
        <h3 className="mt-4 text-sm font-semibold">الأقسام</h3>
        <ul className="mt-2 divide-y divide-border">
          {tree.sections.map((s) => (
            <li key={s.id} className="flex justify-between py-2 text-sm">
              <span>{s.name_ar}</span>
              <span className="text-muted-foreground">
                {s.head} · {s.staff_count} موظف
              </span>
            </li>
          ))}
        </ul>
      </DetailFrame>
    );
  }
  if (selected.kind === "circle") {
    const c = tree.circles.find((x) => x.id === selected.id);
    if (!c) return <Empty />;
    return (
      <DetailFrame title={c.name_ar} subtitle={`${c.name_en} · ${c.manager ?? ""}`} icon={Building}>
        <Grid>
          <Cell label="الموظفون" value={c.staff_count} />
          <Cell label="المواقع" value={c.sites.length} />
          <Cell label="غرف التحكم" value={c.control_rooms.length} />
          <Cell label="فرق الدوريات" value={c.patrol_teams.length} />
        </Grid>
        <SADEEDSection
          analysis={`دائرة ${c.name_ar} تضم ${c.sites.length} موقعاً و ${c.patrol_teams.length} فرقة دوريات. مستوى التغطية ${c.sites.length >= 2 ? "كافٍ" : "يحتاج تعزيز"}.`}
          actions={[
            `مراجعة تغطية CCTV في ${c.sites.length} موقعاً`,
            "تأكيد جاهزية فرق الدوريات للوردية القادمة",
            c.sites.length < 2
              ? "اقتراح موقع إضافي لتعزيز التغطية"
              : "متابعة الخطة الأسبوعية المعتادة",
          ]}
        />
      </DetailFrame>
    );
  }
  if (selected.kind === "site") {
    const site = tree.circles
      .flatMap((c) => c.sites.map((s) => ({ ...s, _circle: c.name_ar })))
      .find((s) => s.id === selected.id);
    if (!site) return <Empty />;
    return (
      <DetailFrame
        title={site.name_ar}
        subtitle={`${site._circle} · ${site.code}`}
        icon={Building2}
      >
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full border px-2 py-0.5 text-xs ${statusClass(site.status)}`}>
            {site.status}
          </span>
          <span
            className={`rounded-full border px-2 py-0.5 text-xs ${severityClass(site.sensitivity)}`}
          >
            حساسية {site.sensitivity}
          </span>
        </div>
        <Grid>
          <Cell label="حرّاس" value={site.guards_count} />
          <Cell label="المباني" value={site.buildings.length} />
          <Cell
            label="الكاميرات"
            value={site.buildings.reduce((s, b) => s + b.cameras.length, 0)}
          />
          <Cell label="الحساسات" value={site.buildings.reduce((s, b) => s + b.sensors.length, 0)} />
        </Grid>
        <SADEEDSection
          analysis={`موقع ${site.name_ar} (${site.sensitivity}) حالياً ${site.status}. عدد الأصول المرتبطة كافٍ للتشغيل العادي.`}
          actions={[
            site.status !== "operational"
              ? "فتح أمر عمل عاجل لإعادة الموقع للحالة التشغيلية"
              : "فحص دوري للأنظمة الأمنية",
            "مراجعة عدد الحرّاس مقابل الحساسية",
            "تأكيد جاهزية بوابات الدخول",
          ]}
        />
      </DetailFrame>
    );
  }
  if (selected.kind === "building") {
    const b = tree.circles
      .flatMap((c) =>
        c.sites.flatMap((s) =>
          s.buildings.map((bd) => ({ ...bd, _site: s.name_ar, _circle: c.name_ar })),
        ),
      )
      .find((x) => x.id === selected.id);
    if (!b) return <Empty />;
    return (
      <DetailFrame
        title={b.name_ar}
        subtitle={`${b._circle} · ${b._site} · ${b.code}`}
        icon={Boxes}
      >
        <Grid>
          <Cell label="الطوابق" value={b.floors} />
          <Cell label="الكاميرات" value={b.cameras.length} />
          <Cell label="البوابات" value={b.gates.length} />
          <Cell label="الحساسات" value={b.sensors.length} />
        </Grid>
        <span
          className={`mt-2 inline-block rounded-full border px-2 py-0.5 text-xs ${statusClass(b.status)}`}
        >
          {b.status}
        </span>
        <SADEEDSection
          analysis={`المبنى ${b.name_ar} يحتوي ${b.cameras.length + b.gates.length + b.sensors.length} أصل أمني. الصحة العامة ${b.status}.`}
          actions={[
            "فحص بصري شامل خلال 48 ساعة",
            b.cameras.filter((c) => c.status !== "online").length > 0
              ? `إصلاح ${b.cameras.filter((c) => c.status !== "online").length} كاميرا غير متصلة`
              : "متابعة الصيانة الوقائية",
          ]}
        />
      </DetailFrame>
    );
  }
  if (selected.kind === "camera") {
    const cam = tree.circles
      .flatMap((c) => c.sites.flatMap((s) => s.buildings.flatMap((b) => b.cameras)))
      .find((x) => x.id === selected.id);
    if (!cam) return <Empty />;
    return (
      <DetailFrame
        title={cam.code}
        subtitle={`كاميرا ${cam.kind} · ${cam.resolution ?? "—"}`}
        icon={Cctv}
      >
        <Grid>
          <Cell label="الحالة" value={cam.status} />
          <Cell label="الصحة" value={`${cam.health}%`} />
          <Cell label="الدقة" value={cam.resolution ?? "—"} />
          <Cell label="آخر اتصال" value={new Date(cam.last_seen_at).toLocaleTimeString("ar-SA")} />
        </Grid>
        <SADEEDSection
          analysis={`الكاميرا ${cam.code} حالياً ${cam.status}. الصحة ${cam.health}%.`}
          actions={
            cam.status !== "online"
              ? ["فتح أمر صيانة تصحيحية", "إخطار غرفة التحكم بالعجز المؤقت"]
              : ["فحص دوري في الموعد المجدول"]
          }
        />
      </DetailFrame>
    );
  }
  if (selected.kind === "gate") {
    const g = tree.circles
      .flatMap((c) => c.sites.flatMap((s) => s.buildings.flatMap((b) => b.gates)))
      .find((x) => x.id === selected.id);
    if (!g) return <Empty />;
    return (
      <DetailFrame title={g.code} subtitle={`بوابة ${g.kind}`} icon={DoorOpen}>
        <Grid>
          <Cell label="الحالة" value={g.status} />
          <Cell label="الصحة" value={`${g.health}%`} />
          <Cell label="أحداث اليوم" value={g.events_today} />
          <Cell label="آخر حدث" value={new Date(g.last_event_at).toLocaleTimeString("ar-SA")} />
        </Grid>
      </DetailFrame>
    );
  }
  if (selected.kind === "sensor") {
    const s = tree.circles
      .flatMap((c) => c.sites.flatMap((st) => st.buildings.flatMap((b) => b.sensors)))
      .find((x) => x.id === selected.id);
    if (!s) return <Empty />;
    return (
      <DetailFrame title={s.code} subtitle={`حساس ${s.sensor_type}`} icon={Activity}>
        <Grid>
          <Cell label="الحالة" value={s.status} />
          <Cell label="القراءة" value={s.reading != null ? `${s.reading}${s.unit ?? ""}` : "—"} />
          <Cell label="العتبة" value={s.threshold ?? "—"} />
          <Cell label="آخر قراءة" value={new Date(s.last_reading_at).toLocaleTimeString("ar-SA")} />
        </Grid>
      </DetailFrame>
    );
  }
  if (selected.kind === "control_room") {
    const cr = tree.circles.flatMap((c) => c.control_rooms).find((x) => x.id === selected.id);
    if (!cr) return <Empty />;
    return (
      <DetailFrame title={cr.name_ar} subtitle={cr.code} icon={Monitor}>
        <Grid>
          <Cell label="المشغلون" value={cr.operators_count} />
          <Cell label="الشاشات" value={cr.screens_count} />
          <Cell label="قائد الوردية" value={cr.shift_lead ?? "—"} />
          <Cell label="الحالة" value={cr.status} />
        </Grid>
      </DetailFrame>
    );
  }
  if (selected.kind === "patrol_team") {
    const pt = tree.circles.flatMap((c) => c.patrol_teams).find((x) => x.id === selected.id);
    if (!pt) return <Empty />;
    return (
      <DetailFrame title={pt.name_ar} subtitle={pt.code} icon={Footprints}>
        <Grid>
          <Cell label="القائد" value={pt.leader ?? "—"} />
          <Cell label="الأعضاء" value={pt.members_count} />
          <Cell label="المركبة" value={pt.vehicle_plate ?? "—"} />
          <Cell label="الحالة" value={pt.status} />
        </Grid>
      </DetailFrame>
    );
  }
  return <Empty />;
}

function DetailFrame({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 border-b border-border pb-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      <div className="mt-3 space-y-3">{children}</div>
    </div>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2 md:grid-cols-4">{children}</div>;
}
function Cell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-2">
      <div className="text-[12px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-bold text-foreground">{value}</div>
    </div>
  );
}
function SADEEDSection({ analysis, actions }: { analysis: string; actions: string[] }) {
  return (
    <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-3">
      <div className="text-xs font-semibold text-primary">🧠 تحليل سَدِيد</div>
      <p className="mt-1 text-xs text-foreground">{analysis}</p>
      <div className="mt-2 text-xs font-semibold text-primary">إجراءات مقترحة</div>
      <ul className="mt-1 list-disc list-inside text-xs text-muted-foreground space-y-0.5">
        {actions.map((a, i) => (
          <li key={i}>{a}</li>
        ))}
      </ul>
    </div>
  );
}
function Empty() {
  return <div className="text-sm text-muted-foreground">العنصر غير موجود</div>;
}
