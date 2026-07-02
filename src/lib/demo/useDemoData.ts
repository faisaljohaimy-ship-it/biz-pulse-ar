import { useEffect, useState } from "react";
import { getDemoSnapshot, subscribeDemoData, type DemoKpiSnapshot } from "./demoDataProvider";

export function useDemoData(enabled: boolean): DemoKpiSnapshot {
  const [snap, setSnap] = useState<DemoKpiSnapshot>(() => getDemoSnapshot());
  useEffect(() => {
    if (!enabled) return;
    return subscribeDemoData(setSnap);
  }, [enabled]);
  return snap;
}
