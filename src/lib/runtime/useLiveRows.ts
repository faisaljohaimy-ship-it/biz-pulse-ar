// Shared realtime hook. Subscribes to Postgres changes on a table and
// re-runs the provided query builder on every change.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** مهلة القراءة — القاعدة نفسها في `makeHooks.useList` و`resilient()`. */
export const LIVE_ROWS_TIMEOUT_MS = 4_000;

export const LIVE_ROWS_TIMEOUT_AR = "انتهت مهلة القراءة (4 ثوانٍ) دون ردّ من القاعدة.";
export const LIVE_ROWS_ERROR_AR = "تعذّرت قراءة البيانات الحيّة الآن.";

export type LiveRowsResult<T> = {
  rows: T[];
  loading: boolean;
  /**
   * الخطأ الصادق: حقل `error` من PostgREST (رفض RLS، جدولٌ غائب، امتيازٌ
   * منزوع) أو انقضاء المهلة. كان يُبتلع فتبدو حالة الرفض قائمةً فارغةً
   * «بانتظار التنفيذات…» — وهو فراغٌ كاذب (UI-4).
   */
  error: Error | null;
  /** إعادة المحاولة بيد المستخدم (المادة ١٤). */
  refetch: () => void;
};

export function useLiveRows<T>(
  table: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  build: (q: any) => unknown,
  deps: unknown[] = [],
): LiveRowsResult<T> {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);
  const refetch = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const run = () => {
      // كان هذا `.then(...)` وحده: لا `catch` ولا سقف زمني. فرفضُ الوعد —
      // انقطاع شبكة، أو رفض RLS يعيد `error` بدل `data` — يعني أن
      // `setLoading(false)` لا يُنفَّذ **أبدًا**، فيبقى هيكل التحميل إلى
      // الأبد ويُطبع `unhandled rejection` في الطرفية. السقف أربع ثوانٍ باقٍ،
      // والجديد أن الخطأ يُعاد للصفحة بدل أن يتنكّر قائمةً فارغة.
      let timer: ReturnType<typeof setTimeout> | null = null;
      Promise.race([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (build(supabase.from(table as any)) as any).then(
          ({ data, error }: { data: T[] | null; error: { message?: string } | null }) => {
            if (error) throw new Error(error.message || LIVE_ROWS_ERROR_AR);
            return data ?? [];
          },
        ),
        new Promise<T[]>((_, reject) => {
          timer = setTimeout(() => reject(new Error(LIVE_ROWS_TIMEOUT_AR)), LIVE_ROWS_TIMEOUT_MS);
        }),
      ])
        .then((next: T[]) => {
          if (!alive) return;
          setRows(next);
          setError(null);
        })
        .catch((err: unknown) => {
          console.warn(`[useLiveRows] ${table} تعذّرت قراءته`, err);
          if (!alive) return;
          // الصفوف السابقة تبقى إن وُجدت — خطأُ تحديثٍ عابر لا يمحو ما عُرض.
          setError(err instanceof Error ? err : new Error(LIVE_ROWS_ERROR_AR));
        })
        .finally(() => {
          if (timer) clearTimeout(timer);
          if (alive) setLoading(false);
        });
    };
    run();
    const channel = supabase
      .channel(`live:${table}:${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { event: "*", schema: "public", table } as any,
        run,
      )
      .subscribe();
    return () => {
      alive = false;
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, ...deps]);
  return { rows, loading, error, refetch };
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
