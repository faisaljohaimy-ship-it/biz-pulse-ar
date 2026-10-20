import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getHomeOperationalFeed } from "@/lib/home-operational-feed.functions";
import { buildOperationalTickerLines, type OperationalFeed } from "./operational-feed";

// Global attachSupabaseAuth in start.ts applies to direct serverFn calls too;
// useServerFn only adds redirect handling and is unnecessary for this public read.
export function useHomeOperationalFeed() {
  const { user, loading } = useAuth();
  const identity = `${user?.id ?? "guest"}:${user?.app_metadata?.current_org ?? "default"}`;
  const [state, setState] = useState<{
    identity: string;
    feed: OperationalFeed | null;
    failed: boolean;
  }>({ identity, feed: null, failed: false });
  const [attempt, retry] = useState(0);
  useEffect(() => {
    if (loading) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      let deadline: ReturnType<typeof setTimeout> | undefined;
      try {
        const feed = await Promise.race([
          getHomeOperationalFeed(),
          new Promise<never>((_, reject) => {
            deadline = setTimeout(() => reject(new Error("تعذرت القراءة")), 4500);
          }),
        ]);
        if (active) setState({ identity, feed, failed: false });
      } catch {
        if (active) setState({ identity, feed: null, failed: true });
      } finally {
        clearTimeout(deadline);
        if (active) timer = setTimeout(() => void refresh(), 60_000);
      }
    };
    void refresh();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [identity, loading, attempt]);
  const current = state.identity === identity ? state : null;
  return {
    lines: current?.feed ? buildOperationalTickerLines(current.feed) : undefined,
    isError: current?.failed ?? false,
    refetch: () => retry((x) => x + 1),
  };
}
