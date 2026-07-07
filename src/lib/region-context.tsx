/**
 * Region context — a lightweight, client-only store for the active
 * Industrial Security region. Every screen reads the same context so
 * one system serves all four administrations (no forked routes).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_REGION_ID, REGIONS, getRegion, type Region, type RegionId } from "./regions";

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
