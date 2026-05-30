import { useQuery } from "@tanstack/react-query";
import { getFabricSnapshot, getPredictions, type FabricSnapshot, type PredictionsPayload } from "@/lib/intelligence.functions";

const EMPTY: FabricSnapshot = {
  metrics: [],
  counts: { events: 0, openAlerts: 0, forgotten: 0, overdue: 0 },
  topAlerts: [],
  forgotten: [],
  sources: [],
};

export function useFabricSnapshot() {
  const q = useQuery({
    queryKey: ["fabric-snapshot"],
    queryFn: () => getFabricSnapshot(),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
  return { data: q.data ?? EMPTY, isLoading: q.isLoading, refetch: q.refetch };
}

export function metric(snap: FabricSnapshot, id: string): number {
  return snap.metrics.find((m) => m.id === id)?.value ?? 0;
}

export function usePredictions() {
  return useQuery<PredictionsPayload>({
    queryKey: ["predictions"],
    queryFn: () => getPredictions(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
