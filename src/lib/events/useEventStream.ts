import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type EnterpriseEventRow = {
  id: string;
  topic: string;
  source: string;
  severity: string;
  actor_id: string | null;
  org_id: string;
  subject_type: string | null;
  subject_id: string | null;
  correlation_id: string | null;
  duration_ms: number | null;
  status: string;
  payload_json: Record<string, unknown>;
  inputs_json: Record<string, unknown>;
  outputs_json: Record<string, unknown>;
  metrics_json: Record<string, unknown>;
  occurred_at: string;
  processed_at: string | null;
  error: string | null;
};

export type EventFilter = {
  topicPrefix?: string;
  severity?: string[];
  subjectType?: string;
  subjectId?: string;
  correlationId?: string;
  limit?: number;
};

/**
 * Subscribe to the enterprise event stream with optional filtering. Hydrates
 * with the most recent rows, then appends realtime inserts. Tenant isolation
 * is enforced by RLS.
 *
 * Realtime safety:
 * - Unique channel topic per hook instance (avoids "cannot add postgres_changes
 *   callbacks after subscribe()" when two consumers mount the same filter).
 * - Stable effect deps via primitive serialization — never depends on an
 *   array/object identity that changes every render.
 * - All realtime work wrapped in try/catch; hydrated data continues to render
 *   even if realtime is unavailable.
 */
export function useEventStream(filter: EventFilter = {}) {
  const limit = filter.limit ?? 50;
  const [events, setEvents] = useState<EnterpriseEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Latest-filter ref so the realtime callback always uses fresh predicates
  // without forcing the effect to re-subscribe.
  const filterRef = useRef(filter);
  filterRef.current = filter;

  // Primitive dep key — stable across renders unless inputs actually change.
  const severityKey = filter.severity ? [...filter.severity].sort().join(",") : "";
  const depKey = [
    filter.topicPrefix ?? "",
    filter.subjectType ?? "",
    filter.subjectId ?? "",
    filter.correlationId ?? "",
    severityKey,
    String(limit),
  ].join("|");

  useEffect(() => {
    let alive = true;
    setLoading(true);

    const f = filterRef.current;
    const hydrate = async () => {
      try {
        let q = supabase
          .from("enterprise_events")
          .select("*")
          .order("occurred_at", { ascending: false })
          .limit(limit);
        if (f.topicPrefix) q = q.like("topic", `${f.topicPrefix}%`);
        if (f.severity?.length) q = q.in("severity", f.severity);
        if (f.subjectType) q = q.eq("subject_type", f.subjectType);
        if (f.subjectId) q = q.eq("subject_id", f.subjectId);
        if (f.correlationId) q = q.eq("correlation_id", f.correlationId);
        const { data, error: err } = await q;
        if (!alive) return;
        if (err) setError(err.message);
        else setEvents((data ?? []) as unknown as EnterpriseEventRow[]);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "load_failed");
      } finally {
        if (alive) setLoading(false);
      }
    };
    void hydrate();

    // Unique topic per hook instance — never share a channel name.
    const topic = `events:${f.topicPrefix ?? "all"}:${Math.random().toString(36).slice(2, 10)}`;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase.channel(topic);
      channel.on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "postgres_changes" as any,
        { event: "INSERT", schema: "public", table: "enterprise_events" },
        (payload: { new: unknown }) => {
          const row = payload.new as EnterpriseEventRow;
          const cur = filterRef.current;
          if (cur.topicPrefix && !row.topic.startsWith(cur.topicPrefix)) return;
          if (cur.severity && !cur.severity.includes(row.severity)) return;
          if (cur.subjectType && row.subject_type !== cur.subjectType) return;
          if (cur.subjectId && row.subject_id !== cur.subjectId) return;
          if (cur.correlationId && row.correlation_id !== cur.correlationId) return;
          setEvents((prev) => [row, ...prev].slice(0, limit));
        },
      );
      channel.subscribe();
    } catch (err) {
      // Realtime is best-effort; page continues to function with hydrated data.
      console.warn("[useEventStream] realtime unavailable", err);
    }

    return () => {
      alive = false;
      if (channel) {
        try {
          void supabase.removeChannel(channel);
        } catch {
          /* noop */
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depKey]);

  return { events, loading, error };
}
