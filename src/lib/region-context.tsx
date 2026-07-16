/**
 * Region context — a lightweight, client-only store for the active
 * Industrial Security region. Every screen reads the same context so
 * one system serves all four administrations (no forked routes).
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_REGION_ID,
  REGION_ACCENT_HEX,
  REGION_ACCENT_RGB,
  REGIONS,
  getRegion,
  type Region,
  type RegionId,
} from "./regions";

// Semantic accent tokens driven by the active region. Setting these inline on
// :root overrides both the light and dark stylesheet values, so every
// Tailwind primary/accent/ring utility across the whole system — nav, icons,
// buttons, borders, rings, glows — repaints in the active region's colour for
// instant regional distinction.
const REGION_ACCENT_TOKENS = [
  "--primary",
  "--accent",
  "--ring",
  "--sidebar-primary",
  "--sidebar-ring",
  "--sidebar-accent",
] as const;

interface RegionContextValue {
  region: Region;
  regionId: RegionId;
  setRegion: (id: RegionId) => void;
  regions: readonly Region[];
}

const RegionContext = createContext<RegionContextValue | null>(null);
const STORAGE_KEY = "nexios.region";

export function RegionProvider({ children }: { children: ReactNode }) {
  const [regionId, setRegionState] = useState<RegionId>(DEFAULT_REGION_ID);

  // Rehydrate from localStorage on mount (client-only; SSR-safe).
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY) as RegionId | null;
      if (stored && REGIONS.some((r) => r.id === stored)) {
        setRegionState(stored);
      }
    } catch {
      /* localStorage may be unavailable — silently keep default */
    }
  }, []);

  // Drive the whole system's colour from the active region: the pulse halo
  // (--nx-region-rgb) AND every semantic accent token, so all system chrome and
  // icons repaint in the active region's colour — clear visual distinction
  // between the four regions/sectors. Updates live on region switch.
  useEffect(() => {
    try {
      const root = document.documentElement;
      root.style.setProperty("--nx-region-rgb", REGION_ACCENT_RGB[regionId]);
      const hex = REGION_ACCENT_HEX[regionId];
      for (const token of REGION_ACCENT_TOKENS) {
        root.style.setProperty(token, hex);
      }
      root.setAttribute("data-region", regionId);
    } catch {
      /* noop */
    }
  }, [regionId]);

  const setRegion = useCallback((id: RegionId) => {
    setRegionState(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* noop */
    }
    try {
      window.dispatchEvent(new CustomEvent("nexios:region-change", { detail: { id } }));
    } catch {
      /* noop */
    }
  }, []);

  const value = useMemo<RegionContextValue>(
    () => ({ region: getRegion(regionId), regionId, setRegion, regions: REGIONS }),
    [regionId, setRegion],
  );

  return <RegionContext.Provider value={value}>{children}</RegionContext.Provider>;
}

export function useRegion(): RegionContextValue {
  const ctx = useContext(RegionContext);
  if (!ctx) {
    // Defensive fallback — never crash if a component is rendered outside
    // the provider (e.g. during Storybook / isolated tests).
    return {
      region: getRegion(DEFAULT_REGION_ID),
      regionId: DEFAULT_REGION_ID,
      setRegion: () => {},
      regions: REGIONS,
    };
  }
  return ctx;
}
