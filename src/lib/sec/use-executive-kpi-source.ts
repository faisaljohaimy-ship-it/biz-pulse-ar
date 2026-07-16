import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { getExecKpis } from "@/lib/sec.functions";
import type { ExecKpis } from "@/lib/sec-exec-kpis.functions";

export type ExecutiveKpiSource = {
  data: ExecKpis | undefined;
  mode: "live" | "simulation";
  state: "anonymous" | "loading" | "live" | "unavailable";
  updatedAt: number;
  isFetching: boolean;
};

/**
 * One secure source selector for every executive surface.
 *
 * Anonymous presentation visitors receive the clearly-labelled deterministic
 * snapshot. Authenticated users receive only their RLS-scoped organisation's
 * KPIs. We never fall back to anonymous service-role aggregation.
 */
export function useExecutiveKpiSource(): ExecutiveKpiSource {
  const { user, loading } = useAuth();
  const query = useQuery({
    queryKey: ["executive-kpis", user?.id ?? "anonymous"],
    queryFn: () => getExecKpis(),
    enabled: Boolean(user),
    staleTime: 15_000,
    refetchInterval: user ? 30_000 : false,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  if (!user) {
    return {
      data: undefined,
      mode: "simulation",
      state: loading ? "loading" : "anonymous",
      updatedAt: 0,
      isFetching: false,
    };
  }
  if (query.data) {
    return {
      data: query.data,
      mode: "live",
      state: "live",
      updatedAt: query.dataUpdatedAt,
      isFetching: query.isFetching,
    };
  }
  return {
    data: undefined,
    mode: "simulation",
    state: query.isPending ? "loading" : "unavailable",
    updatedAt: 0,
    isFetching: query.isFetching,
  };
}
