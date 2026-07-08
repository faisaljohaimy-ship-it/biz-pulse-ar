import { useEffect } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Sub = {
  table: string;
  event?: "INSERT" | "UPDATE" | "DELETE" | "*";
  schema?: string;
  queryKeys: QueryKey[];
};

/**
 * Subscribe to Postgres changes and invalidate the matching React Query keys.
 * Cuts polling load: dashboards refetch on real events rather than every N seconds.
 */
export function useRealtimeInvalidate(channelName: string, subs: Sub[]) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!subs.length) return;
    const channel = supabase.channel(channelName);
    for (const s of subs) {
      channel.on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "postgres_changes" as any,
        { event: s.event ?? "*", schema: s.schema ?? "public", table: s.table },
        () => {
          for (const key of s.queryKeys) {
            qc.invalidateQueries({ queryKey: key });
          }
        },
      );
    }
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName]);
}
