/** Read-only view over the existing account/org-scoped presence reader. */
import { useId } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import {
  comparePresenceSnapshots,
  PRESENCE_METRICS,
  PresenceSnapshotSchema,
  type PresenceMetric,
} from "@/lib/sadeed/presence/change-comparison";

const ResponseSchema = z
  .object({
    accountId: z.string(),
    organizationId: z.string(),
    durableBaseline: z.literal(false),
    delta: z.object({ snapshot: PresenceSnapshotSchema }),
  })
  .refine(
    (x) =>
      x.accountId === x.delta.snapshot.accountId &&
      x.organizationId === x.delta.snapshot.organizationId &&
      x.delta.snapshot.source === "presence-updated-record-state:v1",
  );

const LABELS: Record<PresenceMetric, { ar: string; en: string; to?: string }> = {
  incidentsResolved: {
    ar: "بلاغات مغلقة أو محلولة جرى تحديثها",
    en: "Updated closed or resolved incidents",
    to: "/sec/incidents",
  },
  risksEscalated: {
    ar: "مخاطر مصعّدة جرى تحديثها",
    en: "Updated escalated risks",
    to: "/sec/risks",
  },
  inspectionCompletionPct: {
    ar: "اكتمال عينة التفتيش",
    en: "Inspection sample completion",
  },
  newCriticalAlerts: {
    ar: "تنبيهات حرجة أُنشئت",
    en: "Critical alerts created",
  },
};

async function readChanges(accountId: string, sessionId: string, signal: AbortSignal) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) controller.abort();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error("read_unavailable"));
    }, 4_000);
  });
  try {
    return await Promise.race([
      deadline,
      (async () => {
        const { data } = await supabase.auth.getSession();
        if (controller.signal.aborted || data.session?.user.id !== accountId)
          throw new Error("scope_changed");
        const response = await fetch(
          `/api/public/sadeed-presence?view=changes&sid=${encodeURIComponent(sessionId)}`,
          {
            headers: { Authorization: `Bearer ${data.session.access_token}` },
            signal: controller.signal,
            cache: "no-store",
          },
        );
        if (!response.ok) throw new Error("read_unavailable");
        const parsed = ResponseSchema.safeParse(await response.json());
        if (!parsed.success || parsed.data.accountId !== accountId)
          throw new Error("scope_changed");
        return parsed.data.delta.snapshot;
      })(),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
    signal.removeEventListener("abort", abort);
    controller.abort();
  }
}

export function PresenceChangesCard() {
  const { user } = useAuth();
  const { locale } = useI18n();
  const ar = locale === "ar";
  const sessionId = useId();
  const accountId = user?.id ?? null;
  const query = useQuery({
    queryKey: ["presence-changes", accountId, sessionId],
    queryFn: ({ signal }) => (accountId ? readChanges(accountId, sessionId, signal) : null),
    staleTime: 30_000,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const snapshot = accountId && query.data?.accountId === accountId ? query.data : null;
  // There is no verified durable metric snapshot store. A visit cursor is not one.
  const comparison = comparePresenceSnapshots(null, snapshot);
  const fmt = (iso: string) =>
    new Intl.DateTimeFormat(ar ? "ar-SA-u-ca-gregory" : "en-GB", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "Asia/Riyadh",
    }).format(new Date(iso));

  return (
    <section
      className="rounded-xl border border-border bg-card p-4 space-y-3"
      dir={ar ? "rtl" : "ltr"}
      aria-labelledby={`${sessionId}-title`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={`${sessionId}-title`} className="font-semibold">
          {ar ? "ما الذي تغيّر؟" : "What changed?"}
        </h2>
        {accountId && (
          <button
            type="button"
            className="min-h-[44px] rounded-lg border border-border px-4 nx-focus-ring"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            {ar ? "تحديث القراءة" : "Refresh reading"}
          </button>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        {ar
          ? "قراءة للسجلات داخل المؤسسة المصرح بها، لجميع مناطقها. السجل المحدّث ليس سجلًا تاريخيًا لكل انتقال حالة."
          : "An authorized organization-wide record reading across its regions. Updated records are not a complete history of state transitions."}
      </p>
      {!accountId ? (
        <p className="text-sm">
          {ar
            ? "سجّل الدخول لقراءة السجلات المصرح بها؛ لا توجد مقارنة محفوظة للزائر."
            : "Sign in to read authorized records; no saved guest comparison exists."}
        </p>
      ) : query.isPending || query.isFetching ? (
        <p role="status" aria-busy="true" className="text-sm">
          {ar ? "جارٍ التحقق من القراءة…" : "Checking the reading…"}
        </p>
      ) : query.isError || !snapshot ? (
        <p role="status" className="text-sm">
          {ar
            ? "تعذرت القراءة المصرح بها. أعد المحاولة؛ لا يعني ذلك عدم وجود تغييرات."
            : "The authorized reading is unavailable. Retry; this does not mean there were no changes."}
        </p>
      ) : (
        <>
          <p className="text-sm">
            {ar ? "نافذة القراءة (توقيت الرياض): " : "Reading window (Riyadh time): "}
            {fmt(snapshot.window.from)} — {fmt(snapshot.window.to)}
          </p>
          <dl className="grid gap-3 sm:grid-cols-2">
            {PRESENCE_METRICS.map((key) => {
              const item = comparison.metrics[key];
              return (
                <div key={key} className="rounded-lg border border-border p-3 min-w-0">
                  <dt>
                    {LABELS[key].to ? (
                      <Link to={LABELS[key].to} className="text-sm underline nx-focus-ring">
                        {ar ? LABELS[key].ar : LABELS[key].en}
                      </Link>
                    ) : ar ? (
                      LABELS[key].ar
                    ) : (
                      LABELS[key].en
                    )}
                  </dt>
                  <dd className="mt-1 font-semibold">
                    {item.current === null
                      ? ar
                        ? "لم يُقَس"
                        : "Not measured"
                      : `${item.current}${key === "inspectionCompletionPct" ? "%" : ""}`}
                  </dd>
                  <dd className="text-xs text-muted-foreground">
                    {key === "inspectionCompletionPct" && item.current !== null
                      ? ar
                        ? "عينة محدودة؛ ليست نسبة جميع سجلات المؤسسة."
                        : "Bounded sample; not an organization-wide completion rate."
                      : ar
                        ? "عدد داخل النافذة والنطاق المعلنين."
                        : "Count within the declared window and scope."}
                  </dd>
                </div>
              );
            })}
          </dl>
          <p className="text-sm" role="status">
            {ar
              ? "المقارنة الزمنية لم تُقَس: لا يتوفر خط أساس محفوظ ومتوافق في الحساب والمؤسسة والنطاق والنافذة والمصدر. لا تُعرض نسبة تحسن أو تراجع."
              : "Change is not measured: no saved baseline matches this account, organization, scope, window and source. No improvement or decline is inferred."}
          </p>
        </>
      )}
    </section>
  );
}
