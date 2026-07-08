import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

export type MapSite = {
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

const STATUS_COLOR: Record<MapSite["status"], string> = {
  ok: "hsl(var(--primary))",
  warn: "hsl(var(--warning, 38 92% 50%))",
  critical: "hsl(var(--destructive))",
};

const TYPE_RADIUS: Record<MapSite["type"], number> = {
  hq: 14,
  branch: 10,
  site: 9,
  asset: 8,
  incident: 11,
};

type LeafletModules = {
  MapContainer: any;
  TileLayer: any;
  CircleMarker: any;
  Popup: any;
  LayersControl: any;
};

export function ExecutiveMapClient({ sites, isAr }: { sites: MapSite[]; isAr: boolean }) {
  const [mods, setMods] = useState<LeafletModules | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [rl, L] = await Promise.all([import("react-leaflet"), import("leaflet")]);
      await import("leaflet/dist/leaflet.css");
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
      if (!alive) return;
      setMods({
        MapContainer: rl.MapContainer,
        TileLayer: rl.TileLayer,
        CircleMarker: rl.CircleMarker,
        Popup: rl.Popup,
        LayersControl: rl.LayersControl,
      });
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!mods) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
        {isAr ? "تحميل الخريطة..." : "Loading map..."}
      </div>
    );
  }

  const { MapContainer, TileLayer, CircleMarker, Popup, LayersControl } = mods;

  return (
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

      {sites.map((s) => (
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
              <Badge
                variant={
                  s.status === "critical"
                    ? "destructive"
                    : s.status === "warn"
                      ? "secondary"
                      : "outline"
                }
                className="text-[10px]"
              >
                {s.status.toUpperCase()}
              </Badge>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
