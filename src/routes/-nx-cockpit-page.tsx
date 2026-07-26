/**
 * ExecutiveCockpitPage (exported as NxCockpitPage) — the NEXIOS executive
 * cockpit, colocated as a non-route helper (dash prefix) so the router
 * auto-code-splits the route out of the entry bundle.
 *
 * Composition (package 01 §معمارية الصفحة):
 *   SystemHeader (brand · layer rail 01..05 · clock · notifications)
 *   DesktopSideNavigation | RuntimeDataFlow + KPI + StrategicMap | FINN
 *   CapabilityGrid → LiveEventStream → ExperienceLevelBar
 *
 * Every interactive control carries a registered data-action; the dev
 * build audits the DOM for dead controls on mount. Data is the explicit
 * reference-simulation repository (amber badge) — the four regions come
 * from the frozen src/lib/regions.ts single source.
 */
import * as React from "react";
import { getRouteApi } from "@tanstack/react-router";
import { REGIONS, type RegionId } from "@/lib/regions";
import { NxErrorState, NxSkeleton } from "@/components/nx";
import { auditCockpitActions } from "@/components/cockpit/actions";
import { CockpitProvider, useCockpit } from "@/components/cockpit/use-cockpit";
import { CockpitHeader } from "@/components/cockpit/header";
import { DesktopSideNavigation, MobileNavigationDrawer } from "@/components/cockpit/navigation";
import { PrimaryKpiStrip, RuntimeFlowPanel } from "@/components/cockpit/panels";
import { StrategicMapPanel } from "@/components/cockpit/map";
import { FinnExecutivePanel } from "@/components/cockpit/finn-panel";
import { CapabilityGrid } from "@/components/cockpit/capabilities";
import { LiveEventStream } from "@/components/cockpit/events";
import { CockpitOverlays, CockpitSectionBoundary } from "@/components/cockpit/overlays";
import { ExperienceLevelBar } from "@/components/cockpit/experience-bar";

const routeApi = getRouteApi("/nx-cockpit");

function isRegionId(value: unknown): value is RegionId {
  return typeof value === "string" && REGIONS.some((r) => r.id === value);
}

/**
 * URL ⇄ state sync, isolated so the page stays renderable outside a
 * router (component tests). Deep links ?region=…&level=… apply once on
 * mount; afterwards state drives the URL via replace navigation.
 */
function CockpitUrlSync() {
  const cockpit = useCockpit();
  const navigate = routeApi.useNavigate();
  const search = routeApi.useSearch();
  const urlAppliedRef = React.useRef(false);

  React.useEffect(() => {
    if (urlAppliedRef.current) return;
    urlAppliedRef.current = true;
    if (isRegionId(search.region) && search.region !== cockpit.selectedRegion) {
      cockpit.selectRegion(search.region);
    }
    if (
      (search.level === "executive" ||
        search.level === "operational" ||
        search.level === "technical") &&
      search.level !== cockpit.level
    ) {
      cockpit.setLevel(search.level);
    }
    // Intentionally once — afterwards state drives the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!urlAppliedRef.current) return;
    void navigate({
      to: "/nx-cockpit",
      search: (prev: Record<string, unknown>) => ({ ...prev, region: cockpit.selectedRegion, level: cockpit.level }),
      replace: true,
    });
  }, [cockpit.selectedRegion, cockpit.level, navigate]);

  return null;
}

function CockpitSkeleton() {
  return (
    <div aria-label="جارٍ تحميل القمرة" className="flex flex-col gap-4">
      <NxSkeleton className="h-24 w-full" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <NxSkeleton key={i} className="h-32 w-full" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <NxSkeleton className="h-96 w-full" />
        <NxSkeleton className="h-96 w-full" />
      </div>
    </div>
  );
}

function CockpitContent() {
  const cockpit = useCockpit();
  const [navOpen, setNavOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  // Dev-mode dead-control audit (package: automatic actionId enforcement).
  React.useEffect(() => {
    if (!import.meta.env.DEV || !rootRef.current) return;
    const offenders = auditCockpitActions(rootRef.current);
    if (offenders.length > 0) {
      console.error("[cockpit] عناصر تفاعلية بلا إجراء مسجل:", offenders);
    }
  }, [cockpit.snapshot.state]);

  return (
    <div ref={rootRef} dir="rtl" className="min-h-dvh bg-nx-obsidian text-nx-pearl">
      <main className="mx-auto flex w-full max-w-[2200px] flex-col gap-4 px-3 py-4 md:px-5 md:py-5">
        {cockpit.snapshot.state === "loading" ? <CockpitSkeleton /> : null}

        {cockpit.snapshot.state === "error" ? (
          <div data-audit-exempt>
            <NxErrorState
              title="تعذر تحميل القمرة"
              description={cockpit.snapshot.messageAr}
              onRetry={cockpit.reloadSnapshot}
            />
          </div>
        ) : null}

        {cockpit.snapshot.state === "ready" ? (
          <>
            {cockpit.snapshot.stale ? (
              <div className="flex items-center justify-between gap-3 rounded-nx-12 border border-nx-warning/40 px-3 py-2 text-xs text-nx-warning">
                البيانات المعروضة قديمة نسبيًا — حدّث اللقطة.
                <button
                  type="button"
                  data-action="snapshot.retry"
                  onClick={cockpit.reloadSnapshot}
                  className="rounded-nx-8 border border-nx-warning/50 px-3 py-1.5 min-h-11 transition-colors duration-[var(--nx-anim-fast)] hover:bg-nx-warning/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nx-cyan"
                >
                  تحديث الآن
                </button>
              </div>
            ) : null}

            <CockpitHeader
              layers={cockpit.snapshot.data.layers}
              onToggleNav={() => setNavOpen((v) => !v)}
            />

            <div className="flex items-start gap-4">
              <DesktopSideNavigation />

              <div className="flex min-w-0 flex-1 flex-col gap-4">
                <CockpitSectionBoundary sectionAr="تدفق البيانات">
                  <RuntimeFlowPanel snapshot={cockpit.snapshot.data} />
                </CockpitSectionBoundary>

                <CockpitSectionBoundary sectionAr="المؤشرات">
                  <PrimaryKpiStrip metrics={cockpit.snapshot.data.metrics} />
                </CockpitSectionBoundary>

                {/* Base track MUST be minmax(0,1fr): an implicit auto column
                    would size to the region-card row's max-content and push
                    the whole grid past small viewports. */}
                <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 min-[1200px]:grid-cols-[minmax(0,1fr)_19.5rem]">
                  <CockpitSectionBoundary sectionAr="الخريطة الاستراتيجية">
                    <StrategicMapPanel regions={cockpit.snapshot.data.regions} />
                  </CockpitSectionBoundary>

                  <CockpitSectionBoundary sectionAr="لوحة FINN">
                    <FinnExecutivePanel finn={cockpit.snapshot.data.finn} />
                  </CockpitSectionBoundary>
                </div>

                <CockpitSectionBoundary sectionAr="القدرات المؤسسية">
                  <CapabilityGrid capabilities={cockpit.snapshot.data.capabilities} />
                </CockpitSectionBoundary>

                <CockpitSectionBoundary sectionAr="سجل الأحداث">
                  <LiveEventStream />
                </CockpitSectionBoundary>

                <ExperienceLevelBar />
              </div>
            </div>

            <CockpitOverlays snapshot={cockpit.snapshot.data} />
          </>
        ) : null}

        <p aria-live="polite" role="status" data-testid="cockpit-live-region" className="sr-only">
          {cockpit.liveMessage}
        </p>
      </main>

      <MobileNavigationDrawer open={navOpen} onOpenChange={setNavOpen} />
    </div>
  );
}

export interface NxCockpitPageProps {
  /** Test injection: replace the demo repository. */
  repository?: import("@/components/cockpit/repository").ExecutiveCockpitRepository;
  /** Disable router URL sync when rendered outside a RouterProvider. */
  urlSync?: boolean;
}

export function NxCockpitPage({ repository, urlSync = true }: NxCockpitPageProps = {}) {
  return (
    <CockpitProvider repository={repository}>
      {urlSync ? <CockpitUrlSync /> : null}
      <CockpitContent />
    </CockpitProvider>
  );
}
