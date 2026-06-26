import { useEffect, useState, useCallback } from "react";
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
 * is enforced by RLS — the hook returns whatever the signed-in user is
 * allowed to read.
 */
export function useEventStream(filter: EventFilter = {}) {
  const limit = filter.limit ?? 50;
  const [events, setEvents] = useState<EnterpriseEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const matches = useCallback(
    (row: EnterpriseEventRow) => {
      if (filter.topicPrefix && !row.topic.startsWith(filter.topicPrefix)) return false;
      if (filter.severity && !filter.severity.includes(row.severity)) return false;
      if (filter.subjectType && row.subject_type !== filter.subjectType) return false;
      if (filter.subjectId && row.subject_id !== filter.subjectId) return false;
      if (filter.correlationId && row.correlation_id !== filter.correlationId) return false;
      return true;
    },
    [filter.topicPrefix, filter.severity, filter.subjectType, filter.subjectId, filter.correlationId],
  );

  useEffect(() => {
    let alive = true;
    setLoading(true);

    const hydrate = async () => {
      let q = supabase
        .from("enterprise_events")
        .select("*")
        .order("occurred_at", { ascending: false })
        .limit(limit);
      if (filter.topicPrefix) q = q.like("topic", `${filter.topicPrefix}%`);
      if (filter.severity?.length) q = q.in("severity", filter.severity);
      if (filter.subjectType) q = q.eq("subject_type", filter.subjectType);
      if (filter.subjectId) q = q.eq("subject_id", filter.subjectId);
      if (filter.correlationId) q = q.eq("correlation_id", filter.correlationId);
      const { data, error: err } = await q;
      if (!alive) return;
      if (err) setError(err.message);
      else setEvents((data ?? []) as unknown as EnterpriseEventRow[]);
      setLoading(false);
    };
    void hydrate();

    const channel = supabase
      .channel(`events:${filter.topicPrefix ?? "all"}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "enterprise_events" },
        (payload) => {
          const row = payload.new as unknown as EnterpriseEventRow;
          if (!matches(row)) return;
          setEvents((prev) => [row, ...prev].slice(0, limit));
        },
      )
      .subscribe();

    return () => {
      alive = false;
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.topicPrefix, filter.subjectType, filter.subjectId, filter.correlationId, limit, matches]);

  return { events, loading, error };
}
