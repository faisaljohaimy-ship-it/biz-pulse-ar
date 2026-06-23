import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Activity, AlertTriangle, Building2, MapPin, Radio, Shield } from "lucide-react";
import { ExecutiveMapClient, type MapSite } from "@/components/executive-map-client";


export const Route = createFileRoute("/_authenticated/executive-map")({
  component: ExecutiveMapPage,
  errorComponent: ({ error, reset }) => (
    <div className="p-6">
      <Card className="p-6">
        <div className="text-destructive font-semibold">Map error</div>
        <div className="text-sm text-muted-foreground mt-1">{error.message}</div>
        <Button className="mt-3" onClick={reset}>Retry</Button>
      </Card>
    </div>
  ),
  notFoundComponent: () => <div className="p-6">Not found</div>,
});

type Site = {
  id: string;
  name: string;
  name_ar?: string;
  type: "hq" | "branch" | "site" | "asset" | "incident";
  lat: number;
  lng: number;
  status: "ok" | "warn" | "critical";
  metric?: string;
  detail?: string;
};

// Seed of strategic locations in MENA + key global hubs. Augmented at runtime
// by sec_incidents / pulse_crises so the map reflects real signals.
const SEED_SITES: Site[] = [
  { id: "hq-riyadh", name: "HQ Riyadh", name_ar: "المقر الرئيسي - الرياض", type: "hq", lat: 24.7136, lng: 46.6753, status: "ok", metric: "Health 94", detail: "Executive HQ" },
  { id: "br-jeddah", name: "Jeddah Hub", name_ar: "مركز جدة", type: "branch", lat: 21.4858, lng: 39.1925, status: "ok", metric: "Health 88" },
  { id: "br-dammam", name: "Dammam Ops", name_ar: "عمليات الدمام", type: "site", lat: 26.4207, lng: 50.0888, status: "warn", metric: "Throughput -7%" },
  { id: "br-dubai", name: "Dubai", name_ar: "دبي", type: "branch", lat: 25.2048, lng: 55.2708, status: "ok", metric: "Health 91" },
  { id: "br-abudhabi", name: "Abu Dhabi", name_ar: "أبوظبي", type: "branch", lat: 24.4539, lng: 54.3773, status: "ok", metric: "Health 90" },
  { id: "br-cairo", name: "Cairo", name_ar: "القاهرة", type: "branch", lat: 30.0444, lng: 31.2357, status: "warn", metric: "FX risk" },
  { id: "br-doha", name: "Doha", name_ar: "الدوحة", type: "branch", lat: 25.276987, lng: 51.520008, status: "ok" },
  { id: "br-kuwait", name: "Kuwait City", name_ar: "الكويت", type: "branch", lat: 29.3759, lng: 47.9774, status: "ok" },
  { id: "br-manama", name: "Manama", name_ar: "المنامة", type: "branch", lat: 26.2285, lng: 50.5860, status: "ok" },
  { id: "br-muscat", name: "Muscat", name_ar: "مسقط", type: "branch", lat: 23.5880, lng: 58.3829, status: "ok" },
  { id: "br-london", name: "London", type: "branch", lat: 51.5074, lng: -0.1278, status: "ok" },
  { id: "br-singapore", name: "Singapore", type: "branch", lat: 1.3521, lng: 103.8198, status: "ok" },
  { id: "asset-neom", name: "NEOM Site", name_ar: "موقع نيوم", type: "asset", lat: 27.9654, lng: 35.2733, status: "warn", metric: "Permit pending" },
  { id: "asset-redsea", name: "Red Sea Project", name_ar: "مشروع البحر الأحمر", type: "asset", lat: 25.5, lng: 36.5, status: "ok" },
];

const STATUS_COLOR: Record<Site["status"], string> = {
  ok: "hsl(var(--primary))",
  warn: "hsl(var(--warning, 38 92% 50%))",
  critical: "hsl(var(--destructive))",
};

const TYPE_RADIUS: Record<Site["type"], number> = {
  hq: 14,
  branch: 10,
  site: 9,
  asset: 8,
  incident: 11,
};

function ExecutiveMapPage() {
  const { locale } = useI18n();
  const isAr = locale === "ar";
  const [sites, setSites] = useState<Site[]>(SEED_SITES);
  const [filter, setFilter] = useState<"all" | Site["status"]>("all");
  const [loading, setLoading] = useState(true);

  // Fix default Leaflet icon paths (not used for circles but keeps Leaflet happy)
  useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [{ data: incidents }, { data: crises }] = await Promise.all([
          supabase.from("sec_incidents").select("id,title,severity,location_lat,location_lng,status").limit(50),
          supabase.from("pulse_crises").select("id,title,severity,lat,lng,status").limit(50),
        ]);
        if (!alive) return;
        const extra: Site[] = [];
        for (const i of (incidents ?? []) as any[]) {
          if (typeof i.location_lat === "number" && typeof i.location_lng === "number") {
            extra.push({
              id: `inc-${i.id}`,
              name: i.title ?? "Incident",
              type: "incident",
              lat: i.location_lat,
              lng: i.location_lng,
              status: i.severity === "high" || i.severity === "critical" ? "critical" : "warn",
              metric: `Severity: ${i.severity ?? "n/a"}`,
              detail: i.status,
            });
          }
        }
        for (const c of (crises ?? []) as any[]) {
          if (typeof c.lat === "number" && typeof c.lng === "number") {
            extra.push({
              id: `cri-${c.id}`,
              name: c.title ?? "Crisis",
              type: "incident",
              lat: c.lat,
              lng: c.lng,
              status: "critical",
              metric: `Severity: ${c.severity ?? "n/a"}`,
              detail: c.status,
            });
          }
        }
        if (extra.length) setSites((prev) => [...prev, ...extra]);
      } catch {
        // tables may not have geo columns; ignore silently
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const visible = useMemo(
    () => (filter === "all" ? sites : sites.filter((s) => s.status === filter)),
    [sites, filter],
  );

  const counts = useMemo(
    () => ({
      total: sites.length,
      ok: sites.filter((s) => s.status === "ok").length,
      warn: sites.filter((s) => s.status === "warn").length,
      critical: sites.filter((s) => s.status === "critical").length,
    }),
    [sites],
  );

  return (
    <div className="space-y-4 p-4 md:p-6">
      <PageHeader
        icon={MapPin}
        title={isAr ? "الخريطة التنفيذية" : "Executive Map"}
        subtitle={
          isAr
            ? "خريطة حية لمواقع المؤسسة وأصولها وحوادثها — مدعومة بـ OpenStreetMap"
            : "Live map of organizational sites, assets and incidents — powered by OpenStreetMap"
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={Building2} label={isAr ? "إجمالي المواقع" : "Total Sites"} value={counts.total} tone="default" />
        <StatCard icon={Shield} label={isAr ? "سليم" : "Healthy"} value={counts.ok} tone="ok" />
        <StatCard icon={Activity} label={isAr ? "تحذير" : "Warning"} value={counts.warn} tone="warn" />
        <StatCard icon={AlertTriangle} label={isAr ? "حرج" : "Critical"} value={counts.critical} tone="critical" />
      </div>

      <Card className="overflow-hidden border-border/60">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-muted/30 px-4 py-2">
          <div className="flex items-center gap-2 text-sm">
            <Radio className="h-4 w-4 text-primary" />
            <span className="font-medium">{isAr ? "البث المباشر" : "Live Feed"}</span>
            {loading && <Badge variant="outline" className="text-xs">{isAr ? "تحميل..." : "Loading..."}</Badge>}
          </div>
          <div className="flex gap-1">
            {(["all", "ok", "warn", "critical"] as const).map((k) => (
              <Button
                key={k}
                size="sm"
                variant={filter === k ? "default" : "outline"}
                onClick={() => setFilter(k)}
              >
                {k === "all" ? (isAr ? "الكل" : "All") : k === "ok" ? (isAr ? "سليم" : "OK") : k === "warn" ? (isAr ? "تحذير" : "Warn") : (isAr ? "حرج" : "Critical")}
              </Button>
            ))}
          </div>
        </div>

        <div className="h-[70vh] w-full">
          <MapContainer
            center={[24.7136, 46.6753]}
            zoom={4}
            scrollWheelZoom
            className="h-full w-full"
            style={{ background: "hsl(var(--background))" }}
          >
            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="Dark">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Light">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Standard">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
              </LayersControl.BaseLayer>
            </LayersControl>

            {visible.map((s) => (
              <CircleMarker
                key={s.id}
                center={[s.lat, s.lng]}
                radius={TYPE_RADIUS[s.type]}
                pathOptions={{
                  color: STATUS_COLOR[s.status],
                  fillColor: STATUS_COLOR[s.status],
                  fillOpacity: 0.55,
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="space-y-1 min-w-[180px]">
                    <div className="font-semibold text-sm">{isAr && s.name_ar ? s.name_ar : s.name}</div>
                    <div className="text-xs opacity-70 capitalize">{s.type}</div>
                    {s.metric && <div className="text-xs">{s.metric}</div>}
                    {s.detail && <div className="text-xs opacity-80">{s.detail}</div>}
                    <Badge variant={s.status === "critical" ? "destructive" : s.status === "warn" ? "secondary" : "outline"} className="text-[10px]">
                      {s.status.toUpperCase()}
                    </Badge>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
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
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">{label}</div>
        <Icon className={`h-4 w-4 ${toneClass}`} />
      </div>
      <div className={`mt-1 text-2xl font-bold ${toneClass}`}>{value}</div>
    </Card>
  );
}
