/**
 * NexiosCommandCenter — the primary executive dashboard (the unified poster):
 * all four regional panels arranged around a central split Saudi map, with the
 * ARIA console, the system-status + smart-alerts panel, a HUD top bar and a
 * horizontal navigation bar.
 *
 * HORIZONTAL ON EVERY DEVICE (عرضاً لا طولاً): the whole console is authored at
 * a fixed landscape width and SCALED DOWN to fit the screen width — so it always
 * appears as one wide band identical to the poster, never reflowing into a tall
 * vertical stack. On desktop it renders near full size; on phones it shrinks to
 * fit the width while keeping the exact landscape composition.
 *
 * Every figure is «محاكاة»; every icon links to a REAL route. Region panels are
 * tinted by their own accent (west/central = blue, east/south = green).
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { REGION_ACCENT_HEX } from "@/lib/regions";
import { CC_REGIONS } from "./commandCenterData";
import { CommandTopBar } from "./cc/CommandTopBar";
import { RegionPanel } from "./cc/RegionPanel";
import { CentralSaudiMap } from "./cc/CentralSaudiMap";
import { AriaConsole } from "./cc/AriaConsole";
import { SystemStatusPanel } from "./cc/SystemStatusPanel";
import { CommandBottomNav } from "./cc/CommandBottomNav";

/** The fixed landscape authoring width of the command center. */
const BASE_W = 1180;

/**
 * FitScale — renders `children` at a fixed BASE_W width and scales the whole
 * block DOWN to fit the parent's width, so a wide landscape layout stays
 * horizontal (never stacks) on phones. Outer height tracks the scaled content.
 */
function FitScale({ children }: { children: ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const measure = () => {
      const cw = outer.clientWidth;
      const s = Math.min(1, cw / BASE_W);
      setScale(s);
      setHeight(inner.offsetHeight * s);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(outer);
    ro.observe(inner);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={outerRef}
      className="relative w-full overflow-hidden"
      // aspect-ratio gives a sensible height on first paint (before measuring);
      // the measured height overrides it once the observer runs.
      style={{ height, aspectRatio: height ? undefined : `${BASE_W} / 1140` }}
    >
      <div
        ref={innerRef}
        // physical left/top + top-left origin so scaling anchors correctly in
        // both LTR and RTL (logical `start` would flip and anchor off-screen).
        className="absolute left-0 top-0"
        style={{ width: BASE_W, transform: `scale(${scale})`, transformOrigin: "top left" }}
      >
        {children}
      </div>
    </div>
  );
}

export function NexiosCommandCenter() {
  const { locale } = useI18n();
  const ar = locale === "ar";

  const chrome = REGION_ACCENT_HEX.central; // blue chrome for bars / map west
  const green = REGION_ACCENT_HEX.eastern; // green for map east / system status

  return (
    <section
      dir={ar ? "rtl" : "ltr"}
      aria-label={ar ? "مركز القيادة التنفيذي الموحّد" : "Unified executive command center"}
      className="relative z-10 mx-auto w-full max-w-[1200px] px-2 sm:px-4"
    >
      <FitScale>
        <div className="nx-cmd-surface nx-living-border rounded-[24px] p-4">
          <CommandTopBar ar={ar} accent={chrome} />

          <div className="grid grid-cols-12 gap-3">
            {/* left column */}
            <div className="col-span-3 flex flex-col gap-3">
              <RegionPanel
                panel={CC_REGIONS.western}
                accent={REGION_ACCENT_HEX.western}
                ar={ar}
                title={ar ? "المنطقة الغربية" : "Western Region"}
              />
              <AriaConsole ar={ar} accent={REGION_ACCENT_HEX.western} />
            </div>

            {/* center column */}
            <div className="col-span-6 flex flex-col items-center gap-3">
              <RegionPanel
                panel={CC_REGIONS.central}
                accent={REGION_ACCENT_HEX.central}
                ar={ar}
                title={ar ? "المنطقة الوسطى" : "Central Region"}
              />
              <CentralSaudiMap blue={chrome} green={green} />
              <RegionPanel
                panel={CC_REGIONS.southern}
                accent={REGION_ACCENT_HEX.southern}
                ar={ar}
                title={ar ? "المنطقة الجنوبية" : "Southern Region"}
              />
            </div>

            {/* right column */}
            <div className="col-span-3 flex flex-col gap-3">
              <RegionPanel
                panel={CC_REGIONS.eastern}
                accent={REGION_ACCENT_HEX.eastern}
                ar={ar}
                title={ar ? "المنطقة الشرقية" : "Eastern Region"}
              />
              <SystemStatusPanel ar={ar} accent={green} />
            </div>
          </div>

          <CommandBottomNav ar={ar} accent={chrome} />
        </div>
      </FitScale>
    </section>
  );
}

export default NexiosCommandCenter;
