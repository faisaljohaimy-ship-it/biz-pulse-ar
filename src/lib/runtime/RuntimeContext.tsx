// Enterprise Runtime Context — shared hydrated state for the whole app.
import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { bootstrapEnterprise, type RuntimeBootstrap } from "./bootstrap.functions";
import { supabase } from "@/integrations/supabase/client";
import { InitializingShell } from "./InitializingShell";
import { useRuntimeScheduler } from "./useRuntimeScheduler";

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
  // Subscribe ONCE on mount — never re-subscribe on data refetch (would
  // collide with the existing joined channel and throw "cannot add
  // postgres_changes callbacks after subscribe()").
  const hasData = !!data;
  useEffect(() => {
    if (!hasData) return;
    const topic = `enterprise-runtime:${Math.random().toString(36).slice(2, 10)}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any = null;
    try {
      const invalidate = () => qc.invalidateQueries({ queryKey: ["enterprise-runtime"] });
      channel = supabase.channel(topic);
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sec_incidents" },
        invalidate,
      );
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sec_cctv_alerts" },
        invalidate,
      );
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agent_runs" },
        invalidate,
      );
      channel.subscribe();
    } catch (err) {
      console.warn("[runtime] realtime unavailable", err);
    }
    return () => {
      if (channel) {
        try {
          void supabase.removeChannel(channel);
        } catch {
          /* noop */
        }
      }
    };
  }, [hasData, qc]);

  // Autonomous runtime scheduler — enabled once bootstrap data is hydrated.
  useRuntimeScheduler(!!data);

  if (isLoading || !data) {
    return <InitializingShell error={null} />;
  }
  if (isError) {
    return (
      <InitializingShell
        error={error instanceof Error ? error.message : "Bootstrap failed"}
        onRetry={() => refetch()}
      />
    );
  }

  const value: RuntimeContextValue = { ...data, refresh: refetch };
  return <RuntimeCtx.Provider value={value}>{children}</RuntimeCtx.Provider>;
}
