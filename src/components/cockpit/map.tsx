/**
 * StrategicMapPanel — SaudiMapVisualization + RegionMetricCards +
 * MapModeControls. The map is an ORIGINAL stylized SVG (representative
 * schematic, explicitly labeled as non-official geometry — package 02
 * placeholder law), never the reference image. The four region nodes are
 * real HTML buttons projected from REGION_MARKERS coordinates, so
 * keyboard, focus and 44px touch targets come for free.
 *
 * The four modes are functional, not cosmetic: 3d tilts the scene with
 * depth rings; layers draws the data-grid and inter-region links; heat
 * paints readiness-derived intensity; live animates flow pulses (silenced
 * under prefers-reduced-motion).
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

/** Stylized schematic landmass + data grid (decorative; buttons carry a11y). */
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
      preserveAspectRatio="none"
    >
      {/* representative landmass silhouette — schematic, not official borders */}
      <path
        d="M70 40 L210 28 L268 60 L332 96 L348 150 L306 214 L238 262 L166 250 L118 208 L64 150 Z"
        fill="rgba(30,139,255,0.07)"
        stroke="rgba(71,169,255,0.30)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {mode === "layers" ? (
        <g stroke="rgba(22,217,255,0.14)" strokeWidth="0.75">
          {Array.from({ length: 9 }, (_, i) => (
            <line key={`v${i}`} x1={40 + i * 40} y1={20} x2={40 + i * 40} y2={280} />
          ))}
          {Array.from({ length: 7 }, (_, i) => (
            <line key={`h${i}`} x1={20} y1={40 + i * 36} x2={380} y2={40 + i * 36} />
          ))}
        </g>
      ) : null}
      {mode === "heat"
        ? nodes.map((n) => {
            const region = REGION_MARKERS.find((m) => m.id === n.id);
            if (!region) return null;
            return (
              <circle
                key={`heat-${n.id}`}
                cx={n.x}
                cy={n.y}
                r={46}
                fill={REGION_ACCENT_HEX[n.id]}
                opacity={0.22}
              />
            );
          })
        : null}
      {(mode === "layers" || mode === "live") &&
        links.map(([a, b]) => (
          <line
            key={`ln-${a}-${b}`}
            x1={nodes[a].x}
            y1={nodes[a].y}
            x2={nodes[b].x}
            y2={nodes[b].y}
            stroke="rgba(22,217,255,0.35)"
            strokeWidth="1.25"
            strokeDasharray="6 6"
            className={mode === "live" && !reduced ? "nx-map-flow" : undefined}
          />
        ))}
      {mode === "3d" ? (
        <g stroke="rgba(30,139,255,0.22)" fill="none">
          <ellipse cx={200} cy={252} rx={168} ry={26} />
          <ellipse cx={200} cy={252} rx={118} ry={17} opacity={0.6} />
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
        "absolute z-10 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full transition-transform duration-[var(--nx-anim-fast)] ease-[var(--nx-ease-out)] hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nx-cyan",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-1 rounded-full border",
          selected ? "border-current opacity-90" : "border-current opacity-40",
          mode === "live" && !reduced && "nx-anim-breathe",
        )}
        style={{ boxShadow: selected ? `0 0 18px ${region.accentHex}66` : undefined }}
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

function RegionMetricCards({
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
      className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 md:grid md:grid-cols-4 md:overflow-visible"
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
              "nx-glass-e1 rounded-nx-12 flex min-h-11 min-w-40 shrink-0 snap-start flex-col gap-1 border p-3 text-start transition-[border-color,box-shadow] duration-[var(--nx-anim-fast)] ease-[var(--nx-ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nx-cyan md:min-w-0",
              isSelected ? "border-current" : "border-white/10 hover:border-current/50",
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
              label={`اتجاه جاهزية ${region.labelAr}: صاعد`}
              className="text-current opacity-70"
            />
            <span className="text-[11px] text-nx-pearl/56">
              الحالة: {STATUS_WORD[region.status]} · بلاغات مفتوحة: {region.openIncidents}
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
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const restoreFocusRef = React.useRef<HTMLElement | null>(null);

  // Fullscreen map is a modal dialog: Escape closes, Tab is trapped inside,
  // focus enters on open and returns to the trigger on close (WCAG 2.4.3 /
  // 2.1.2). aria-modal marks the rest of the page inert for assistive tech.
  React.useEffect(() => {
    if (!expanded) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const node = dialogRef.current;
    const focusablesIn = () =>
      node
        ? Array.from(
            node.querySelectorAll<HTMLElement>(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
            ),
          ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null)
        : [];
    focusablesIn()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setExpanded(false);
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusablesIn();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    const target = node ?? window;
    target.addEventListener("keydown", onKey as EventListener);
    return () => {
      target.removeEventListener("keydown", onKey as EventListener);
      restoreFocusRef.current?.focus();
    };
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
        className="nx-holo-icon rounded-nx-8 inline-flex size-11 items-center justify-center border border-white/10 text-nx-pearl/72 transition-[border-color] duration-[var(--nx-anim-fast)] hover:border-nx-cyan/40 hover:text-nx-pearl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nx-cyan"
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
      className="relative w-full overflow-hidden rounded-nx-12 border border-white/8 bg-[radial-gradient(circle_at_50%_20%,rgba(19,80,130,0.20),transparent_55%)]"
      style={{
        aspectRatio: expanded ? undefined : "4 / 2.6",
        minHeight: expanded ? "60dvh" : undefined,
      }}
    >
      <div
        className={cn(
          "absolute inset-0 transition-transform duration-[var(--nx-anim-slow)] ease-[var(--nx-ease-out)]",
          mapMode === "3d" &&
            !reduced &&
            "[transform:perspective(900px)_rotateX(24deg)_scale(1.04)]",
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
      <span className="absolute bottom-2 start-2 rounded-nx-8 border border-white/10 bg-nx-obsidian/70 px-2 py-0.5 text-[10px] text-nx-pearl/56">
        مخطط تمثيلي للعرض — ليس حدودًا جغرافية رسمية
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
      {/* While the fullscreen dialog is open, the in-flow panel is a duplicate
          of the same map + controls. aria-modal alone doesn't inert it, so SR
          browse-mode (VoiceOver rotor) could still reach the background copy
          and its duplicated heading. `inert` + aria-hidden removes it from BOTH
          tab order and the accessibility tree. `contents` avoids any layout
          shift. */}
      <div className="contents" inert={expanded || undefined} aria-hidden={expanded || undefined}>
        <NxPanel
          data-testid="strategic-map"
          title="الخريطة الاستراتيجية"
          layer="twin"
          density="operations"
          footer={<span>أداء المناطق الأربع في الوقت الفعلي · محاكاة مرجعية</span>}
        >
          <div className="flex flex-col gap-4">
            {/* Controls live in the flowing content, not the fixed-height
              panel header — five 44px buttons must WRAP on 360-430px. */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-nx-pearl/56">
                المملكة العربية السعودية — أداء الإدارات الإقليمية الأربع للأمن الصناعي
              </p>
              {modeControls}
            </div>
            {scene}
            <RegionMetricCards
              regions={regions}
              selected={selectedRegion}
              onSelect={selectRegion}
            />
          </div>
        </NxPanel>
      </div>
      {expanded ? (
        <div
          ref={dialogRef}
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
          <RegionMetricCards regions={regions} selected={selectedRegion} onSelect={selectRegion} />
        </div>
      ) : null}
    </>
  );
}
