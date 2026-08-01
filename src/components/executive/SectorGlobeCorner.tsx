/**
 * SectorGlobeCorner — transparent, living region controller.
 *
 * Mounted at the workspace's top-left by AppShell. Keeps the active region
 * bound to the shared RegionContext, colours every halo from the canonical
 * regional palette, and offers both direct region selection and one-tap
 * cycling. The visual centrepiece is the official منصة إنجاز الأعمال command-stage
 * artwork (Saudi map + four regional panels), replacing the previous 3D
 * globe halo.
 */
import { useState, type CSSProperties } from "react";
import { ChevronDown, Globe2, Layers } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useRegion } from "@/lib/region-context";
import { REGION_ACCENT_HEX, REGION_ACCENT_RGB, type RegionId } from "@/lib/regions";
import { cn } from "@/lib/utils";
import commandStageAsset from "@/assets/nexios-command-stage.png.asset.json";

/** Circular thumbnail of the official command-stage artwork. */
function CommandStageThumb({
  activeColor,
  ar,
  className,
}: {
  readonly activeColor: string;
  readonly ar: boolean;
  readonly className?: string;
}) {
  return (
    <span
      aria-hidden={false}
      role="img"
      aria-label={ar ? "مسرح القيادة منصة إنجاز الأعمال" : "منصة إنجاز الأعمال command stage"}
      className={cn(
        "relative block h-full w-full overflow-hidden rounded-full ring-1 ring-inset",
        className,
      )}
      style={{
        backgroundImage: `url(${commandStageAsset.url})`,
        backgroundSize: "165%",
        backgroundPosition: "center 42%",
        boxShadow: `inset 0 0 22px ${activeColor}55, 0 0 18px ${activeColor}44`,
      }}
    >
      {/* soft brand tint keeps the artwork readable at any regional accent */}
      <span
        aria-hidden
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 45%, transparent 45%, ${activeColor}22 78%, ${activeColor}55 100%)`,
        }}
      />
    </span>
  );
}

export function SectorGlobeCorner() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { regionId, region, setRegion, regions } = useRegion();
  const [collapsed, setCollapsed] = useState(true);

  const activeColor = REGION_ACCENT_HEX[regionId];

  const cycleRegion = () => {
    const index = regions.findIndex((item) => item.id === regionId);
    const next = regions[(index + 1) % regions.length];
    setRegion(next.id as RegionId);
  };

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        aria-label={ar ? "إظهار محدد المناطق" : "Show region selector"}
        className="nx-region-control nx-region-control-active group pointer-events-auto relative grid size-14 place-items-center rounded-full border bg-[#020817]/35 backdrop-blur-xl transition duration-300 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 active:scale-95"
        style={
          {
            "--region-control-rgb": REGION_ACCENT_RGB[regionId],
          } as CSSProperties
        }
      >
        <span
          aria-hidden
          className="nx-holo-globe-pulse pointer-events-none absolute inset-1 rounded-full border"
          style={{ borderColor: `${activeColor}55` }}
        />
        <span className="relative size-12 transition-transform duration-500 group-hover:rotate-3">
          <CommandStageThumb activeColor={activeColor} ar={ar} />
        </span>
        <span
          aria-hidden
          className="absolute bottom-0.5 right-0.5 size-2 rounded-full border border-[#020817]"
          style={{ backgroundColor: activeColor, boxShadow: `0 0 9px ${activeColor}` }}
        />
      </button>
    );
  }

  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      className="pointer-events-auto w-[184px] overflow-hidden rounded-[22px] border bg-[#020817]/48 p-2.5 backdrop-blur-2xl sm:w-[196px] sm:p-3"
      style={{
        borderColor: `${activeColor}66`,
        background: `linear-gradient(145deg, ${activeColor}12, rgba(2,8,23,0.62) 42%, rgba(2,8,23,0.4))`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), inset 0 0 30px ${activeColor}12, 0 16px 46px -18px rgba(0,0,0,0.92), 0 0 32px -8px ${activeColor}88`,
      }}
    >
      <div className="mb-1 flex items-center justify-between gap-1">
        <span
          className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.16em]"
          style={{ color: activeColor }}
        >
          <Globe2 className="size-3.5" />
          {ar ? "محدد المناطق" : "REGIONS"}
        </span>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-label={ar ? "تصغير محدد المناطق" : "Collapse region selector"}
          className="grid size-7 place-items-center rounded-lg text-white/50 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2"
          style={{ outlineColor: activeColor }}
        >
          <ChevronDown className="size-4" />
        </button>
      </div>

      {/* The stage itself is a large control: tapping it cycles the region. */}
      <button
        type="button"
        onClick={cycleRegion}
        aria-label={ar ? "تغيير المنطقة التالية" : "Select next region"}
        className="nx-region-control nx-region-control-active group relative block aspect-square w-full rounded-full border focus-visible:outline-none focus-visible:ring-2"
        style={
          {
            "--region-control-rgb": REGION_ACCENT_RGB[regionId],
            outlineColor: activeColor,
          } as CSSProperties
        }
      >
        <span
          aria-hidden
          className="nx-holo-globe-pulse pointer-events-none absolute inset-[7%] rounded-full border"
          style={{ borderColor: `${activeColor}45` }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-[13%] rounded-full border border-dashed opacity-45 motion-safe:animate-[spin_18s_linear_infinite]"
          style={{ borderColor: activeColor }}
        />
        <span className="pointer-events-none absolute inset-[4%]">
          <CommandStageThumb activeColor={activeColor} ar={ar} />
        </span>
      </button>

      <div className="-mt-1 text-center">
        <div className="text-[12px] uppercase tracking-[0.2em] text-white/45">
          {ar ? "المنطقة النشطة" : "ACTIVE REGION"}
        </div>
        <div className="mt-0.5 flex items-center justify-center gap-1.5">
          <span
            aria-hidden
            className="size-1.5 rounded-full"
            style={{ backgroundColor: activeColor, boxShadow: `0 0 8px ${activeColor}` }}
          />
          <span className="truncate text-[12px] font-bold text-white" title={region.shortAr}>
            {ar ? region.shortAr : region.shortEn}
          </span>
        </div>
      </div>

      {/* Direct selection keeps the visual identity and operating context in sync. */}
      <div
        className="mt-2 grid grid-cols-2 gap-1.5"
        role="group"
        aria-label={ar ? "المناطق" : "Regions"}
      >
        {regions.map((item, index) => {
          const selected = item.id === regionId;
          const color = REGION_ACCENT_HEX[item.id];
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setRegion(item.id)}
              aria-pressed={selected}
              className={cn(
                "nx-region-control relative flex min-h-11 items-center justify-center gap-1.5 overflow-hidden rounded-xl border px-2 text-[12px] font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 active:scale-[0.97]",
                selected && "nx-region-control-active",
                selected ? "text-white" : "border-white/10 text-white/58 hover:text-white",
              )}
              style={
                {
                  "--region-control-rgb": REGION_ACCENT_RGB[item.id],
                  "--region-control-delay": `${-(index * 0.55)}s`,
                  background: selected
                    ? `linear-gradient(145deg, ${color}30, ${color}0A)`
                    : "rgba(255,255,255,0.025)",
                  outlineColor: color,
                } as CSSProperties
              }
            >
              <span
                aria-hidden
                className={cn("size-1.5 rounded-full", selected && "animate-pulse")}
                style={{
                  backgroundColor: color,
                  boxShadow: selected ? `0 0 8px ${color}` : undefined,
                }}
              />
              <span className="truncate">{ar ? item.shortAr : item.shortEn}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={cycleRegion}
        aria-label={ar ? "التبديل إلى المنطقة التالية" : "Switch to the next region"}
        className="nx-region-control nx-region-control-active mt-2 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border px-2 text-[12px] font-semibold transition duration-200 hover:brightness-125 focus-visible:outline-none focus-visible:ring-2 active:scale-[0.98]"
        style={
          {
            "--region-control-rgb": REGION_ACCENT_RGB[regionId],
            color: activeColor,
            background: `linear-gradient(135deg, ${activeColor}1F, ${activeColor}08)`,
            outlineColor: activeColor,
          } as CSSProperties
        }
      >
        <Layers className="size-4" />
        {ar ? "تغيير منطقة العمل" : "Change work region"}
      </button>
    </div>
  );
}

export default SectorGlobeCorner;
