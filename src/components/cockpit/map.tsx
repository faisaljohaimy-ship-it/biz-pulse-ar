/**
 * StrategicMapPanel — Saudi Arabia dot-mesh silhouette with region
 * nodes projected from real lat/lng, and four floating regional
 * metric cards anchored around the map (western/eastern/central/
 * southern). Mode controls (3D / layers / heat / live) sit under
 * the map on a dedicated bar to match the reference cockpit layout.
 *
 * The map SVG is an ORIGINAL stylized silhouette (representative
 * schematic, explicitly labeled as non-official geometry); the four
 * region nodes are real HTML buttons so keyboard, focus and 44px
 * touch targets come for free.
 */
import * as React from "react";
import { Expand, Flame, Layers, Radar, Rotate3d, Shrink } from "lucide-react";
import { cn } from "@/lib/utils";
import { REGION_MARKERS } from "@/components/executive/region-markers";
import { REGION_ACCENT_HEX, type RegionId } from "@/lib/regions";
import { NxPanel, NxSparkline, NxSkeleton } from "@/components/nx";
import type { MapMode, RegionSnapshot } from "./repository";
import { useCockpit, usePrefersReducedMotion } from "./use-cockpit";
import { emitCockpitAction, type CockpitActionId } from "./actions";

/** lat/lng → percentage position inside the schematic viewport. */
function project(lat: number, lng: number): { left: number; top: number } {
  const left = ((lng - 34) / (56 - 34)) * 84 + 8;
  const top = (1 - (lat - 16) / (32 - 16)) * 78 + 8;
  return { left, top };
}

const MODE_META: Record<
  MapMode,
  { actionId: CockpitActionId; labelAr: string; icon: React.ComponentType<{ className?: string }> }
> = {
  "3d": { actionId: "map.mode.3d", labelAr: "عرض ثلاثي الأبعاد", icon: Rotate3d },
  layers: { actionId: "map.mode.layers", labelAr: "طبقات البيانات", icon: Layers },
  heat: { actionId: "map.mode.heat", labelAr: "خريطة حرارية", icon: Flame },
  live: { actionId: "map.mode.live", labelAr: "تتبع مباشر", icon: Radar },
};

const MODE_ORDER: readonly MapMode[] = ["3d", "layers", "heat", "live"];

const STATUS_WORD: Record<RegionSnapshot["status"], string> = {
  healthy: "سليمة",
  warning: "تحذير",
  critical: "حرجة",
  unknown: "غير معروفة",
};

/**
 * Stylized Saudi Arabia silhouette filled with a dot pattern (dot-mesh look).
 * The path is a rough representative outline in the 400x300 viewport, aligned
 * with lat 16–32 / lng 34–56 so region markers projected from real coords
 * fall inside the shape.
 */
const SAUDI_PATH =
  "M60,48 L118,32 L172,26 L214,32 L252,52 L282,86 L292,112 L272,120 L286,132 L280,158 L296,172 L328,196 L322,240 L262,262 L188,258 L118,252 L92,232 L82,198 L96,168 L74,138 L86,108 L64,78 Z";

function SchematicBackdrop({ mode, reduced }: { mode: MapMode; reduced: boolean }) {
  const nodes = REGION_MARKERS.map((m) => {
    const p = project(m.lat, m.lng);
    return { id: m.id, x: (p.left / 100) * 400, y: (p.top / 100) * 300 };
  });
  const links: [number, number][] = [
    [0, 1],
    [0, 2],
    [0, 3],
    [1, 3],
  ];
  return (
    <svg
      viewBox="0 0 400 300"
      aria-hidden
      className="absolute inset-0 size-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <pattern
          id="nx-map-dots"
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="3" cy="3" r="1" fill="rgba(56,189,248,0.55)" />
        </pattern>
        <pattern
          id="nx-map-dots-dense"
          width="4.5"
          height="4.5"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="2.25" cy="2.25" r="0.8" fill="rgba(56,189,248,0.72)" />
        </pattern>
        <radialGradient id="nx-map-glow" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="rgba(56,189,248,0.22)" />
          <stop offset="60%" stopColor="rgba(30,139,255,0.06)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
        <filter id="nx-map-soft" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="0.6" />
        </filter>
      </defs>

      {/* soft glow behind the peninsula */}
      <rect x="0" y="0" width="400" height="300" fill="url(#nx-map-glow)" />

      {/* silhouette outline */}
      <path
        d={SAUDI_PATH}
        fill="rgba(15,42,74,0.35)"
        stroke="rgba(56,189,248,0.55)"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      {/* dot-mesh fill (clipped by same path via a second fill) */}
      <path d={SAUDI_PATH} fill={mode === "heat" ? "url(#nx-map-dots-dense)" : "url(#nx-map-dots)"} />

      {mode === "layers" ? (
        <g stroke="rgba(22,217,255,0.14)" strokeWidth="0.6">
          {Array.from({ length: 11 }, (_, i) => (
            <line key={`v${i}`} x1={30 + i * 34} y1={20} x2={30 + i * 34} y2={280} />
          ))}
          {Array.from({ length: 8 }, (_, i) => (
            <line key={`h${i}`} x1={20} y1={35 + i * 32} x2={380} y2={35 + i * 32} />
          ))}
        </g>
      ) : null}

      {mode === "heat"
        ? nodes.map((n) => (
            <circle
              key={`heat-${n.id}`}
              cx={n.x}
              cy={n.y}
              r={42}
              fill={REGION_ACCENT_HEX[n.id]}
              opacity={0.22}
              filter="url(#nx-map-soft)"
            />
          ))
        : null}

      {(mode === "layers" || mode === "live") &&
        links.map(([a, b]) => (
          <line
            key={`ln-${a}-${b}`}
            x1={nodes[a].x}
            y1={nodes[a].y}
            x2={nodes[b].x}
            y2={nodes[b].y}
            stroke="rgba(22,217,255,0.45)"
            strokeWidth="1"
            strokeDasharray="4 5"
            className={mode === "live" && !reduced ? "nx-map-flow" : undefined}
          />
        ))}

      {mode === "3d" ? (
        <g stroke="rgba(30,139,255,0.22)" fill="none">
          <ellipse cx={200} cy={258} rx={168} ry={22} />
          <ellipse cx={200} cy={258} rx={118} ry={14} opacity={0.6} />
        </g>
      ) : null}
    </svg>
  );
}

function RegionNodeButton({
  region,
  selected,
  mode,
  reduced,
  onSelect,
}: {
  region: RegionSnapshot;
  selected: boolean;
  mode: MapMode;
  reduced: boolean;
  onSelect: (id: RegionId) => void;
}) {
  const marker = REGION_MARKERS.find((m) => m.id === region.regionId);
  if (!marker) return null;
  const p = project(marker.lat, marker.lng);
  return (
    <button
      type="button"
      data-action="map.region.select"
      data-region={region.regionId}
      aria-pressed={selected}
      aria-label={`اختيار ${region.labelAr} — الجاهزية ${region.readiness}٪ · ${STATUS_WORD[region.status]}`}
      onClick={() => {
        emitCockpitAction("map.region.select");
        onSelect(region.regionId);
      }}
      style={{ left: `${p.left}%`, top: `${p.top}%`, color: region.accentHex }}
      className={cn(
        "absolute z-10 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full transition-transform duration-[var(--nx-anim-fast)] ease-[var(--nx-ease-out)] hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nx-cyan",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-1 rounded-full border",
          selected ? "border-current opacity-90" : "border-current opacity-40",
          mode === "live" && !reduced && "nx-anim-breathe",
        )}
        style={{ boxShadow: selected ? `0 0 22px ${region.accentHex}80` : `0 0 10px ${region.accentHex}40` }}
      />
      <svg viewBox="0 0 24 24" aria-hidden className="size-5">
        <polygon
          points="12,2 21,7 21,17 12,22 3,17 3,7"
          fill={selected ? "currentColor" : "none"}
          fillOpacity={selected ? 0.35 : 0}
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <circle cx="12" cy="12" r="2" fill="currentColor" />
      </svg>
    </button>
  );
}

/** Which corner each region hovers over the map on desktop. */
const REGION_ANCHOR: Record<RegionId, string> = {
  western: "top-2 start-2",
  eastern: "top-2 end-2",
  central: "bottom-1/3 end-2",
  southern: "bottom-2 start-2",
};

function FloatingRegionCard({
  region,
  selected,
  onSelect,
  anchor,
}: {
  region: RegionSnapshot;
  selected: boolean;
  onSelect: (id: RegionId) => void;
  anchor: string;
}) {
  return (
    <button
      type="button"
      data-action="map.region.select"
      data-region-card={region.regionId}
      aria-pressed={selected}
      onClick={() => {
        emitCockpitAction("map.region.select");
        onSelect(region.regionId);
      }}
      style={{ color: region.accentHex }}
      className={cn(
        "nx-glass-e1 rounded-nx-12 absolute z-20 flex w-40 flex-col gap-1 border p-2.5 text-start backdrop-blur transition-[border-color,box-shadow] duration-[var(--nx-anim-fast)] ease-[var(--nx-ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nx-cyan",
        anchor,
        selected
          ? "border-current shadow-[0_0_24px_-6px_currentColor]"
          : "border-white/10 hover:border-current/60",
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-nx-pearl">{region.labelAr}</span>
        <span aria-hidden className="size-1.5 rounded-full bg-current" />
      </span>
      <span className="flex items-baseline gap-1.5">
        <span className="text-xl font-bold tabular-nums text-nx-pearl">
          {region.readiness}
          <span className="text-[10px] font-medium text-nx-pearl/56">٪</span>
        </span>
        <span className="text-[10px] tabular-nums text-nx-success" dir="ltr">
          ▲ {region.trend}%
        </span>
      </span>
      <NxSparkline
        points={region.history}
        width={130}
        height={18}
        label={`اتجاه جاهزية ${region.labelAr}`}
        className="text-current opacity-70"
      />
      <span className="text-[10px] text-nx-pearl/56">
        {STATUS_WORD[region.status]} · بلاغات: {region.openIncidents}
      </span>
    </button>
  );
}

function RegionMetricCardsMobile({
  regions,
  selected,
  onSelect,
}: {
  regions: readonly RegionSnapshot[];
  selected: RegionId;
  onSelect: (id: RegionId) => void;
}) {
  return (
    <div
      data-testid="region-metric-cards"
      className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 md:hidden"
    >
      {regions.map((region) => {
        const isSelected = region.regionId === selected;
        return (
          <button
            key={region.regionId}
            type="button"
            data-action="map.region.select"
            data-region-card={region.regionId}
            aria-pressed={isSelected}
            onClick={() => {
              emitCockpitAction("map.region.select");
              onSelect(region.regionId);
            }}
            className={cn(
              "nx-glass-e1 rounded-nx-12 flex min-h-11 min-w-40 shrink-0 snap-start flex-col gap-1 border p-3 text-start",
              isSelected ? "border-current" : "border-white/10",
            )}
            style={{ color: region.accentHex }}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-nx-pearl">{region.labelAr}</span>
              <span aria-hidden className="size-1.5 rounded-full bg-current" />
            </span>
            <span className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums text-nx-pearl">
                {region.readiness}
                <span className="text-xs font-medium text-nx-pearl/56">٪</span>
              </span>
              <span className="text-[11px] tabular-nums text-nx-success" dir="ltr">
                ▲ {region.trend}%
              </span>
            </span>
            <NxSparkline
              points={region.history}
              width={110}
              height={22}
              label={`اتجاه جاهزية ${region.labelAr}`}
              className="text-current opacity-70"
            />
            <span className="text-[11px] text-nx-pearl/56">
              {STATUS_WORD[region.status]} · بلاغات: {region.openIncidents}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function StrategicMapPanel({ regions }: { regions: readonly RegionSnapshot[] }) {
  const { selectedRegion, selectRegion, mapMode, setMapMode, regionLoading } = useCockpit();
  const reduced = usePrefersReducedMotion();
  const [expanded, setExpanded] = React.useState(false);

  React.useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const modeControls = (
    <div role="group" aria-label="أوضاع الخريطة" className="flex flex-wrap items-center gap-2">
      {MODE_ORDER.map((mode) => {
        const meta = MODE_META[mode];
        const Icon = meta.icon;
        const active = mapMode === mode;
        return (
          <button
            key={mode}
            type="button"
            data-action={meta.actionId}
            data-map-mode={mode}
            aria-pressed={active}
            onClick={() => {
              emitCockpitAction(meta.actionId);
              setMapMode(mode);
            }}
            className={cn(
              "nx-glass-e1 rounded-nx-8 inline-flex min-h-11 items-center gap-1.5 border px-3 py-1.5 text-xs transition-[border-color,box-shadow] duration-[var(--nx-anim-fast)] ease-[var(--nx-ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nx-cyan",
              active
                ? "border-nx-cyan/70 text-nx-cyan shadow-[var(--nx-glow-focus)]"
                : "border-white/10 text-nx-pearl/64 hover:border-nx-cyan/40 hover:text-nx-pearl",
            )}
          >
            <Icon aria-hidden className="size-3.5" />
            {meta.labelAr}
          </button>
        );
      })}
      <button
        type="button"
        data-action="map.fullscreen"
        aria-pressed={expanded}
        aria-label={expanded ? "إنهاء ملء الشاشة" : "ملء الشاشة"}
        onClick={() => {
          emitCockpitAction("map.fullscreen");
          setExpanded((v) => !v);
        }}
        className="nx-glass-e1 rounded-nx-8 inline-flex size-11 items-center justify-center border border-white/10 text-nx-pearl/72 transition-[border-color] duration-[var(--nx-anim-fast)] hover:border-nx-cyan/40 hover:text-nx-pearl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nx-cyan"
      >
        {expanded ? (
          <Shrink aria-hidden className="size-4" />
        ) : (
          <Expand aria-hidden className="size-4" />
        )}
      </button>
    </div>
  );

  const scene = (
    <div
      data-testid="saudi-map-visualization"
      data-map-mode={mapMode}
      className="relative w-full overflow-hidden rounded-nx-12 border border-white/8 bg-[radial-gradient(circle_at_50%_20%,rgba(19,80,130,0.30),transparent_60%)]"
      style={{
        aspectRatio: expanded ? undefined : "4 / 2.4",
        minHeight: expanded ? "60dvh" : undefined,
      }}
    >
      <div
        className={cn(
          "absolute inset-0 transition-transform duration-[var(--nx-anim-slow)] ease-[var(--nx-ease-out)]",
          mapMode === "3d" &&
            !reduced &&
            "[transform:perspective(900px)_rotateX(22deg)_scale(1.03)]",
        )}
      >
        <SchematicBackdrop mode={mapMode} reduced={reduced} />
        {regions.map((region) => (
          <RegionNodeButton
            key={region.regionId}
            region={region}
            selected={region.regionId === selectedRegion}
            mode={mapMode}
            reduced={reduced}
            onSelect={selectRegion}
          />
        ))}
      </div>

      {/* Floating regional cards (desktop / tablet only). Anchored to the
          four corners of the map to mirror the reference cockpit. Mobile
          gets a scrollable strip below the map instead. */}
      <div className="pointer-events-none absolute inset-0 hidden md:block">
        {regions.map((region) => (
          <div key={region.regionId} className="pointer-events-auto contents">
            <FloatingRegionCard
              region={region}
              selected={region.regionId === selectedRegion}
              onSelect={selectRegion}
              anchor={REGION_ANCHOR[region.regionId]}
            />
          </div>
        ))}
      </div>

      <span className="absolute bottom-2 start-1/2 -translate-x-1/2 rounded-nx-8 border border-white/10 bg-nx-obsidian/70 px-2 py-0.5 text-[10px] text-nx-pearl/56">
        مخطط تمثيلي — ليس حدودًا جغرافية رسمية
      </span>
      {regionLoading ? (
        <span className="absolute top-2 end-2">
          <NxSkeleton className="h-5 w-24" />
        </span>
      ) : null}
    </div>
  );

  return (
    <>
      <NxPanel
        data-testid="strategic-map"
        title="الخريطة الاستراتيجية"
        layer="twin"
        density="operations"
        footer={<span>أداء المناطق الأربع في الوقت الفعلي · محاكاة مرجعية</span>}
      >
        <div className="flex flex-col gap-4">
          <p className="text-xs text-nx-pearl/56">
            المملكة العربية السعودية — أداء الإدارات الإقليمية الأربع للأمن الصناعي
          </p>
          {scene}
          {/* Mode controls now live UNDER the map on their own bar, to
              match the reference cockpit ergonomics. */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-nx-pearl/56">وضع العرض</span>
            {modeControls}
          </div>
          <RegionMetricCardsMobile
            regions={regions}
            selected={selectedRegion}
            onSelect={selectRegion}
          />
        </div>
      </NxPanel>
      {expanded ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="الخريطة الاستراتيجية — ملء الشاشة"
          className="fixed inset-0 z-50 flex flex-col gap-4 bg-nx-obsidian/96 p-4 backdrop-blur-sm md:p-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-nx-pearl">الخريطة الاستراتيجية</h3>
            {modeControls}
          </div>
          <div className="min-h-0 flex-1">{scene}</div>
          <RegionMetricCardsMobile
            regions={regions}
            selected={selectedRegion}
            onSelect={selectRegion}
          />
        </div>
      ) : null}
    </>
  );
}
