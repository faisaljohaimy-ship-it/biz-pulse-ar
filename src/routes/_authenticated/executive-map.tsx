import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, Building2, MapPin, Radio, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { CommandBackdrop } from "@/components/executive/CommandBackdrop";
import { REGION_MARKERS } from "@/components/executive/region-markers";
import { ExecutiveMapClient, type MapSite } from "@/components/executive-map-client";
// «داخل المملكة» يُعرَّف مرّة واحدة للنظام كلّه: كان هنا تعريفٌ ثانٍ يقبل
// حتى العرض 33 بينما يقبل الآخر 32.5 — نقطةٌ تُقبل في خريطة وتُرفض في
// أخرى، وهو أسوأ من الخطأ الواحد لأنه يظهر ولا يظهر.
import { isInsideSaudi } from "@/components/map/saudi-geometry";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { REGIONS, REGION_ACCENT_HEX, type RegionId } from "@/lib/regions";

export const Route = createFileRoute("/_authenticated/executive-map")({
  component: ExecutiveMapPage,
  errorComponent: ({ error, reset }) => (
    <div className="p-6">
      <Card className="p-6">
        <div className="font-semibold text-destructive">تعذّر تحميل الخريطة</div>
        <div className="mt-1 text-sm text-muted-foreground">{error.message}</div>
        <Button className="mt-3" onClick={reset}>
          إعادة المحاولة
        </Button>
      </Card>
    </div>
  ),
  notFoundComponent: () => <div className="p-6">الصفحة غير موجودة</div>,
});

type IncidentGeoRow = {
  id: string;
  title: string | null;
  severity: string | null;
  location_lat: number | null;
  location_lng: number | null;
  status: string | null;
};

type CrisisGeoRow = {
  id: string;
  title: string | null;
  severity: string | null;
  lat: number | null;
  lng: number | null;
  status: string | null;
};

const SEED_SITES: MapSite[] = [
  {
    id: "central-hq",
    name: "Riyadh Operations HQ",
    name_ar: "مقر عمليات الرياض",
    type: "hq",
    region: "central",
    lat: 24.7136,
    lng: 46.6753,
    status: "ok",
    metric: "امتثال 96%",
    detail: "مركز القيادة التنفيذي",
    operations: 38,
  },
  {
    id: "central-asset",
    name: "Al Kharj Security Site",
    name_ar: "موقع أمن الخرج",
    type: "asset",
    region: "central",
    lat: 24.1556,
    lng: 47.312,
    status: "warn",
    metric: "صيانة مجدولة",
    operations: 14,
  },
  {
    id: "western-site-jeddah",
    name: "Jeddah Industrial Security",
    name_ar: "مركز الأمن الصناعي بجدة",
    type: "site",
    region: "western",
    lat: 21.4858,
    lng: 39.1925,
    status: "ok",
    metric: "امتثال 94%",
    operations: 31,
  },
  {
    id: "western-asset-yanbu",
    name: "Yanbu Asset Cluster",
    name_ar: "مجمع أصول ينبع",
    type: "asset",
    region: "western",
    lat: 24.0232,
    lng: 38.1901,
    status: "warn",
    metric: "تصريح قيد المراجعة",
    operations: 18,
  },
  {
    id: "eastern-site-dammam",
    name: "Dammam Operations",
    name_ar: "عمليات الدمام",
    type: "site",
    region: "eastern",
    lat: 26.4207,
    lng: 50.0888,
    status: "ok",
    metric: "امتثال 97%",
    operations: 44,
  },
  {
    id: "eastern-asset-jubail",
    name: "Jubail Industrial Asset",
    name_ar: "أصل الجبيل الصناعي",
    type: "asset",
    region: "eastern",
    lat: 27.0174,
    lng: 49.6225,
    status: "critical",
    metric: "بلاغ عالي الخطورة",
    operations: 22,
  },
  {
    id: "southern-site-abha",
    name: "Abha Security Center",
    name_ar: "مركز أمن أبها",
    type: "site",
    region: "southern",
    lat: 18.2465,
    lng: 42.5117,
    status: "ok",
    metric: "امتثال 93%",
    operations: 19,
  },
  {
    id: "southern-asset-jazan",
    name: "Jazan Asset Cluster",
    name_ar: "مجمع أصول جازان",
    type: "asset",
    region: "southern",
    lat: 16.8892,
    lng: 42.5511,
    status: "warn",
    metric: "فحص وقائي",
    operations: 12,
  },
];

function closestRegion(lat: number, lng: number): RegionId {
  return REGION_MARKERS.reduce(
    (best, marker) => {
      const distance = (lat - marker.lat) ** 2 + (lng - marker.lng) ** 2;
      return distance < best.distance ? { id: marker.id, distance } : best;
    },
    { id: "central" as RegionId, distance: Number.POSITIVE_INFINITY },
  ).id;
}

function ExecutiveMapPage() {
  const { locale } = useI18n();
  const isAr = locale === "ar";
  const [sites, setSites] = useState<MapSite[]>(SEED_SITES);
  const [statusFilter, setStatusFilter] = useState<"all" | MapSite["status"]>("all");
  const [regionFilter, setRegionFilter] = useState<"all" | RegionId>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const [{ data: incidents }, { data: crises }] = await Promise.all([
          supabase
            .from("sec_incidents")
            .select("id,title,severity,location_lat,location_lng,status")
            .limit(50),
          supabase.from("pulse_crises").select("id,title,severity,lat,lng,status").limit(50),
        ]);
        if (!alive) return;

        const extras: MapSite[] = [];
        for (const incident of (incidents ?? []) as unknown as IncidentGeoRow[]) {
          const lat = incident.location_lat;
          const lng = incident.location_lng;
          if (typeof lat !== "number" || typeof lng !== "number" || !isInsideSaudi(lat, lng)) {
            continue;
          }
          extras.push({
            id: `incident-${incident.id}`,
            name: incident.title ?? "Security incident",
            name_ar: incident.title ?? "بلاغ أمني",
            type: "incident",
            region: closestRegion(lat, lng),
            lat,
            lng,
            status:
              incident.severity === "high" || incident.severity === "critical"
                ? "critical"
                : "warn",
            metric: `الخطورة: ${incident.severity ?? "غير محددة"}`,
            detail: incident.status ?? undefined,
            operations: 1,
          });
        }
        for (const crisis of (crises ?? []) as unknown as CrisisGeoRow[]) {
          const lat = crisis.lat;
          const lng = crisis.lng;
          if (typeof lat !== "number" || typeof lng !== "number" || !isInsideSaudi(lat, lng)) {
            continue;
          }
          extras.push({
            id: `crisis-${crisis.id}`,
            name: crisis.title ?? "Critical event",
            name_ar: crisis.title ?? "حالة حرجة",
            type: "incident",
            region: closestRegion(lat, lng),
            lat,
            lng,
            status: "critical",
            metric: `الخطورة: ${crisis.severity ?? "حرجة"}`,
            detail: crisis.status ?? undefined,
            operations: 1,
          });
        }
        if (extras.length > 0) setSites((current) => [...current, ...extras]);
      } catch {
        // The reference Saudi distribution remains available when geo tables are absent.
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const visible = useMemo(
    () =>
      sites.filter(
        (site) =>
          (statusFilter === "all" || site.status === statusFilter) &&
          (regionFilter === "all" || site.region === regionFilter),
      ),
    [sites, statusFilter, regionFilter],
  );

  const counts = useMemo(
    () => ({
      total: sites.length,
      ok: sites.filter((site) => site.status === "ok").length,
      warn: sites.filter((site) => site.status === "warn").length,
      critical: sites.filter((site) => site.status === "critical").length,
    }),
    [sites],
  );

  const regionSummary = useMemo(
    () =>
      Object.fromEntries(
        REGIONS.map((region) => {
          const rows = sites.filter((site) => site.region === region.id);
          return [
            region.id,
            {
              sites: rows.filter((site) => ["hq", "branch", "site"].includes(site.type)).length,
              assets: rows.filter((site) => site.type === "asset").length,
              incidents: rows.filter((site) => site.type === "incident").length,
              operations: rows.reduce((sum, site) => sum + (site.operations ?? 0), 0),
            },
          ];
        }),
      ) as Record<
        RegionId,
        { sites: number; assets: number; incidents: number; operations: number }
      >,
    [sites],
  );

  return (
    <div dir={isAr ? "rtl" : "ltr"} className="relative space-y-4 p-4 md:p-6">
      <CommandBackdrop />
      <PageHeader
        icon={MapPin}
        title={isAr ? "الخريطة التنفيذية" : "Executive Map"}
        subtitle={
          isAr
            ? "توزيع تفاعلي لمواقع الأمن الصناعي والأصول والعمليات والحوادث داخل المملكة العربية السعودية."
            : "Interactive distribution of industrial-security sites, assets, operations, and incidents across Saudi Arabia."
        }
      />

      <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0">
        <StatCard
          icon={Building2}
          label={isAr ? "المكونات" : "Components"}
          value={counts.total}
          tone="default"
        />
        <StatCard icon={Shield} label={isAr ? "سليم" : "Healthy"} value={counts.ok} tone="ok" />
        <StatCard
          icon={Activity}
          label={isAr ? "تحذير" : "Warning"}
          value={counts.warn}
          tone="warn"
        />
        <StatCard
          icon={AlertTriangle}
          label={isAr ? "حرج" : "Critical"}
          value={counts.critical}
          tone="critical"
        />
      </div>

      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {REGIONS.map((region) => {
          const summary = regionSummary[region.id];
          const active = regionFilter === region.id;
          return (
            <li key={region.id}>
              <button
                type="button"
                onClick={() => setRegionFilter(active ? "all" : region.id)}
                aria-pressed={active}
                className="w-full rounded-2xl border p-3 text-start transition hover:bg-muted/40"
                style={{
                  borderColor: active
                    ? REGION_ACCENT_HEX[region.id]
                    : `${REGION_ACCENT_HEX[region.id]}44`,
                  backgroundColor: active ? `${REGION_ACCENT_HEX[region.id]}14` : undefined,
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor: REGION_ACCENT_HEX[region.id],
                      boxShadow: `0 0 12px ${REGION_ACCENT_HEX[region.id]}`,
                    }}
                  />
                  <span className="font-semibold">{isAr ? region.shortAr : region.shortEn}</span>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-1 text-center">
                  {[
                    [isAr ? "مواقع" : "Sites", summary.sites],
                    [isAr ? "أصول" : "Assets", summary.assets],
                    [isAr ? "عمليات" : "Ops", summary.operations],
                    [isAr ? "حوادث" : "Inc.", summary.incidents],
                  ].map(([label, value]) => (
                    <div key={String(label)}>
                      <div className="text-sm font-bold tabular-nums">{value}</div>
                      <div className="text-[12px] text-muted-foreground">{label}</div>
                    </div>
                  ))}
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      <Card className="overflow-hidden border-border/60">
        <div className="flex flex-col gap-3 border-b border-border/60 bg-muted/30 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Radio className="h-4 w-4 text-primary" />
            <span className="font-medium">{isAr ? "التوزيع الحي" : "Live distribution"}</span>
            {loading && <Badge variant="outline">{isAr ? "تحميل…" : "Loading…"}</Badge>}
          </div>
          <div className="flex flex-wrap gap-1">
            {(["all", "ok", "warn", "critical"] as const).map((value) => (
              <Button
                key={value}
                size="sm"
                variant={statusFilter === value ? "default" : "outline"}
                onClick={() => setStatusFilter(value)}
              >
                {value === "all"
                  ? isAr
                    ? "كل الحالات"
                    : "All status"
                  : value === "ok"
                    ? isAr
                      ? "سليم"
                      : "Healthy"
                    : value === "warn"
                      ? isAr
                        ? "تحذير"
                        : "Warning"
                      : isAr
                        ? "حرج"
                        : "Critical"}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-b border-border/60 px-4 py-3 text-[12px] text-muted-foreground sm:grid-cols-4">
          {[
            ["hq", isAr ? "مقر قيادة" : "Headquarters"],
            ["site", isAr ? "موقع أمني" : "Security site"],
            ["asset", isAr ? "أصل" : "Asset"],
            ["incident", isAr ? "حادث/بلاغ" : "Incident"],
          ].map(([type, label]) => (
            <div key={type} className="flex items-center gap-2">
              <span
                className="rounded-full bg-primary/50"
                style={{
                  width: type === "hq" ? 14 : type === "incident" ? 11 : type === "site" ? 9 : 8,
                  height: type === "hq" ? 14 : type === "incident" ? 11 : type === "site" ? 9 : 8,
                }}
              />
              {label}
            </div>
          ))}
        </div>

        {/* مفتاح الحالة — الحجم كان مشروحًا واللون لا. ورسمٌ يحمل بُعدين
            ويشرح واحدًا يُقرأ نصفه تخمينًا. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border/60 px-4 py-3 text-[12px] text-muted-foreground">
          <span className="font-semibold text-foreground">{isAr ? "اللون" : "Colour"}:</span>
          {(
            [
              ["ok", isAr ? "سليم" : "Healthy"],
              ["warn", isAr ? "تحذير" : "Warning"],
              ["critical", isAr ? "حرج" : "Critical"],
            ] as const
          ).map(([status, label]) => (
            <span key={status} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className={`h-3 w-3 rounded-full border-2 ${
                  status === "ok"
                    ? "border-primary bg-primary/50"
                    : status === "warn"
                      ? "border-amber-500 bg-amber-500/50"
                      : "border-destructive bg-destructive/50 [border-style:dashed]"
                }`}
              />
              {label}
            </span>
          ))}
          <span className="text-[11px]">
            {isAr
              ? "— «حرج» بحدٍّ متقطّع أيضًا، فلا يُقرأ باللون وحده"
              : "— critical is also dashed, never colour alone"}
          </span>
        </div>

        {/* التوزيع على الإدارات الأربع — «التوضيح» المطلوب رقمًا لا انطباعًا */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-b border-border/60 px-4 py-3 text-[12px] sm:grid-cols-4">
          {REGIONS.map((r) => (
            <div key={r.id} className="flex items-center gap-2">
              <span
                aria-hidden
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: REGION_ACCENT_HEX[r.id] }}
              />
              <span className="text-muted-foreground">{isAr ? r.shortAr : r.shortEn}</span>
              <b className="tabular-nums text-foreground">
                {visible.filter((v) => v.region === r.id).length}
              </b>
            </div>
          ))}
        </div>

        <div className="h-[68vh] w-full">
          <ExecutiveMapClient sites={visible} isAr={isAr} />
        </div>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: "default" | "ok" | "warn" | "critical";
}) {
  const toneClass =
    tone === "ok"
      ? "text-primary"
      : tone === "warn"
        ? "text-amber-500"
        : tone === "critical"
          ? "text-destructive"
          : "text-foreground";
  return (
    <Card className="min-w-[42%] shrink-0 snap-start bg-background/60 p-4 backdrop-blur-sm sm:min-w-[30%] md:min-w-0">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">{label}</div>
        <Icon className={`h-4 w-4 ${toneClass}`} />
      </div>
      <div className={`mt-1 text-2xl font-bold ${toneClass}`}>{value}</div>
    </Card>
  );
}
