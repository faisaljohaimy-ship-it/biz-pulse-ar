// Shared realtime hook. Subscribes to Postgres changes on a table and
// re-runs the provided query builder on every change.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useLiveRows<T>(
  table: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  build: (q: any) => unknown,
  deps: unknown[] = [],
) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    const refetch = () => {
      // كان هذا `.then(...)` وحده: لا `catch` ولا سقف زمني. فرفضُ الوعد —
      // انقطاع شبكة، أو رفض RLS يعيد `error` بدل `data` — يعني أن
      // `setLoading(false)` لا يُنفَّذ **أبدًا**، فيبقى هيكل التحميل إلى
      // الأبد ويُطبع `unhandled rejection` في الطرفية. والقاعدة المطبَّقة
      // في `makeHooks.useList` هي المرجع: سباق أربع ثوانٍ، ثم قائمة فارغة
      // تنهض تحتها المراجع المدمجة — لا انتظارٌ بلا نهاية.
      const TIMEOUT_MS = 4_000;
      Promise.race([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (build(supabase.from(table as any)) as any).then(
          ({ data }: { data: T[] | null }) => data ?? [],
        ),
        new Promise<T[]>((resolve) => setTimeout(() => resolve([]), TIMEOUT_MS)),
      ])
        .catch((error: unknown) => {
          console.warn(`[useLiveRows] ${table} تعذّرت قراءته`, error);
          return [] as T[];
        })
        .then((next: T[]) => {
          if (!alive) return;
          setRows(next);
          setLoading(false);
        });
    };
    refetch();
    const channel = supabase
      .channel(`live:${table}:${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { event: "*", schema: "public", table } as any,
        refetch,
      )
      .subscribe();
    return () => {
      alive = false;
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { rows, loading };
}

export function fmtRel(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.max(1, Math.round(ms / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function fmtDuration(startIso: string | null | undefined, endIso?: string | null): string {
  if (!startIso) return "—";
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  const ms = Math.max(0, end - start);
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return `${m}m ${rs}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}
