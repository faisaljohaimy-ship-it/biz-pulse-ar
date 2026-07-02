import { createContext, useContext, useMemo, useState, useCallback, type ReactNode } from "react";
import { evaluateAll, type KpiEvaluation, type KpiValue } from "./kpi-registry";

/**
 * NEXIOS · KPI Watcher
 * Live snapshot of KPI values → breach evaluations. Any page can push
 * its current KPI values via `setKpis`. ARIA reads breaches from context
 * to drive proactive nudges + evidence-based answers.
 */
interface KpiWatcherAPI {
  values: KpiValue[];
  evaluations: KpiEvaluation[];
  breaches: KpiEvaluation[];
  setKpis: (v: KpiValue[]) => void;
  patchKpi: (key: string, value: number) => void;
}

const Ctx = createContext<KpiWatcherAPI | null>(null);

export function KpiWatcherProvider({ children }: { children: ReactNode }) {
  const [values, setValues] = useState<KpiValue[]>([]);

  const setKpis = useCallback((v: KpiValue[]) => setValues(v), []);
  const patchKpi = useCallback((key: string, value: number) => {
    setValues((prev) => {
      const other = prev.filter((p) => p.key !== key);
      return [...other, { key, value }];
    });
  }, []);

  const api = useMemo<KpiWatcherAPI>(() => {
    const evaluations = evaluateAll(values);
    const breaches = evaluations.filter((e) => e.breached);
    return { values, evaluations, breaches, setKpis, patchKpi };
  }, [values, setKpis, patchKpi]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useKpiWatcher(): KpiWatcherAPI {
  const v = useContext(Ctx);
  if (!v) {
    // Non-fatal default so components can render outside the provider (SSR/tests).
    return {
      values: [],
      evaluations: [],
      breaches: [],
      setKpis: () => {},
      patchKpi: () => {},
    };
  }
  return v;
}
