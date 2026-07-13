/**
 * NexiosCommandCenter — the primary executive dashboard (the unified poster):
 * all four regional panels arranged around a central split Saudi map, with the
 * ARIA console, the system-status + smart-alerts panel, a HUD top bar and a
 * horizontal navigation bar.
 *
 * The whole console is a single HORIZONTAL canvas on every device: on narrow
 * screens it scrolls sideways (min-width preserved) instead of reflowing to a
 * tall stack, so the command-center composition is identical everywhere.
 *
 * Every figure is «محاكاة»; every icon links to a REAL route. Region panels are
 * tinted by their own accent (west/central = blue, east/south = green).
 */
import { useI18n } from "@/lib/i18n";
import { REGION_ACCENT_HEX } from "@/lib/regions";
import { CC_REGIONS } from "./commandCenterData";
import { CommandTopBar } from "./cc/CommandTopBar";
import { RegionPanel } from "./cc/RegionPanel";
import { CentralSaudiMap } from "./cc/CentralSaudiMap";
import { AriaConsole } from "./cc/AriaConsole";
import { SystemStatusPanel } from "./cc/SystemStatusPanel";
import { CommandBottomNav } from "./cc/CommandBottomNav";

export function NexiosCommandCenter() {
  const { locale } = useI18n();
  const ar = locale === "ar";

  const chrome = REGION_ACCENT_HEX.central; // blue chrome for bars / map west
  const green = REGION_ACCENT_HEX.eastern; // green for map east / system status

  return (
    <section
      dir={ar ? "rtl" : "ltr"}
      aria-label={ar ? "مركز القيادة التنفيذي الموحّد" : "Unified executive command center"}
      className="relative z-10 mx-auto w-full max-w-[1440px] px-2 sm:px-4"
    >
      {/* horizontal canvas — scrolls sideways on narrow screens */}
      <div
        className="nx-cmd-surface nx-living-border overflow-x-auto rounded-[24px] p-3 sm:p-4"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="mx-auto min-w-[1180px]">
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
      </div>

      <p className="mt-1.5 text-center text-[10px] text-white/40 sm:hidden">
        {ar ? "اسحب أفقيًا لاستكشاف كامل المركز" : "Swipe horizontally to explore"}
      </p>
    </section>
  );
}

export default NexiosCommandCenter;
