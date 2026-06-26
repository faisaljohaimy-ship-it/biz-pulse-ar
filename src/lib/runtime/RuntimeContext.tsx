// Enterprise Runtime Context — shared hydrated state for the whole app.
import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { bootstrapEnterprise, type RuntimeBootstrap } from "./bootstrap.functions";
import { supabase } from "@/integrations/supabase/client";
import { InitializingShell } from "./InitializingShell";

type RuntimeContextValue = RuntimeBootstrap & {
  refresh: () => Promise<unknown>;
};

const RuntimeCtx = createContext<RuntimeContextValue | null>(null);

export function useRuntime(): RuntimeContextValue {
  const v = useContext(RuntimeCtx);
  if (!v) throw new Error("useRuntime must be used inside <RuntimeProvider>");
  return v;
}

export function useRuntimeOptional(): RuntimeContextValue | null {
  return useContext(RuntimeCtx);
}

export function RuntimeProvider({ children }: { children: ReactNode }) {
  const bootstrap = useServerFn(bootstrapEnterprise);
  const qc = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["enterprise-runtime"],
    queryFn: () => bootstrap(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Realtime: refresh runtime counters when critical tables change.
  useEffect(() => {
    if (!data) return;
    const channel = supabase
      .channel("enterprise-runtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "sec_incidents" }, () => {
        qc.invalidateQueries({ queryKey: ["enterprise-runtime"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "sec_cctv_alerts" }, () => {
        qc.invalidateQueries({ queryKey: ["enterprise-runtime"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "agent_runs" }, () => {
        qc.invalidateQueries({ queryKey: ["enterprise-runtime"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [data, qc]);

  if (isLoading || !data) {
    return <InitializingShell error={null} />;
  }
  if (isError) {
    return <InitializingShell error={error instanceof Error ? error.message : "Bootstrap failed"} onRetry={() => refetch()} />;
  }

  const value: RuntimeContextValue = { ...data, refresh: refetch };
  return <RuntimeCtx.Provider value={value}>{children}</RuntimeCtx.Provider>;
}
