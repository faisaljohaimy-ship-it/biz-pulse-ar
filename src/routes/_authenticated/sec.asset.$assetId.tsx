import { useEffect, useId, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import QRCode from "react-qr-code";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { SecPageHeader } from "@/components/sec/sec-shell";
import { SecLiveBadge } from "@/components/sec/SecLiveBadge";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import {
  getAuthorizedAsset,
  isAssetId,
  type AssetDetailResult,
} from "@/lib/sec/asset-detail.functions";

class AssetReadFailure extends Error {
  constructor(readonly code: "session_changed" | "timeout" | "cancelled") {
    super(`AssetRead:${code}`);
  }
}

export const Route = createFileRoute("/_authenticated/sec/asset/$assetId")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: AssetDetailPage,
});

function AssetDetailPage() {
  const { assetId } = Route.useParams();
  const { user, loading } = useAuth();
  // Remounting on account/record changes also closes any previously displayed QR.
  return (
    <AssetRecord
      key={`${user?.id ?? "guest"}:${assetId}`}
      assetId={assetId}
      loading={loading}
      userId={user?.id}
    />
  );
}

function AssetRecord({
  assetId,
  loading,
  userId,
}: {
  assetId: string;
  loading: boolean;
  userId?: string;
}) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const qrId = useId();
  const [showQr, setShowQr] = useState(false);
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);
  const fetchAsset = useServerFn(getAuthorizedAsset);
  const valid = isAssetId(assetId);
  const query = useQuery<AssetDetailResult>({
    queryKey: ["authorized-asset-detail", userId ?? "guest", assetId],
    queryFn: async ({ signal }) => {
      const expectedUserId = userId;
      if (!expectedUserId) throw new AssetReadFailure("session_changed");
      const controller = new AbortController();
      const cancel = () => controller.abort(new AssetReadFailure("cancelled"));
      const deadline = window.setTimeout(
        () => controller.abort(new AssetReadFailure("timeout")),
        15_000,
      );
      signal.addEventListener("abort", cancel, { once: true });
      if (signal.aborted) cancel();
      let rejectAbort: () => void = () => {};
      const aborted = new Promise<never>((_, reject) => {
        rejectAbort = () => reject(controller.signal.reason);
        controller.signal.addEventListener("abort", rejectAbort, { once: true });
        if (controller.signal.aborted) rejectAbort();
      });
      try {
        // The race also bounds getSession/getClaims waiting. The transport receives
        // the same signal, so an auth-attacher that resumes late cannot start a fetch.
        const value = await Promise.race([
          fetchAsset({ data: { assetId }, signal: controller.signal }),
          aborted,
        ]);
        if (controller.signal.aborted) throw controller.signal.reason;
        if (value.status === "ok" && value.authorizedUserId !== expectedUserId)
          throw new AssetReadFailure("session_changed");
        return value;
      } finally {
        window.clearTimeout(deadline);
        signal.removeEventListener("abort", cancel);
        controller.signal.removeEventListener("abort", rejectAbort);
      }
    },
    enabled: !loading && !!userId && valid && online,
    gcTime: 0,
    staleTime: 0,
    retry: false,
    networkMode: "always",
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
  const result = query.data;
  const current: Extract<AssetDetailResult, { status: "ok" }> | null =
    online &&
    !query.isError &&
    !query.isFetching &&
    result?.status === "ok" &&
    result.authorizedUserId === userId
      ? result
      : null;
  const time = (value?: string | null) => {
    const date = value ? new Date(value) : null;
    return date && Number.isFinite(date.getTime())
      ? date.toLocaleString(ar ? "ar-SA" : "en-GB")
      : ar
        ? "غير متاح من المصدر"
        : "Not available from source";
  };
  const authError = query.error instanceof Error && /^Unauthorized:/.test(query.error.message);
  const readFailure = query.error instanceof AssetReadFailure ? query.error.code : null;
  const needsSignIn = !loading && (!userId || authError);
  let message: string | null = null;
  if (!valid) message = ar ? "معرّف الأصل غير صالح." : "Invalid asset identifier.";
  else if (loading) message = ar ? "جارٍ التحقق من الجلسة…" : "Checking your session…";
  else if (needsSignIn)
    message = ar
      ? "سجّل الدخول، ثم افتح رابط الأصل من جديد."
      : "Sign in, then reopen the asset link.";
  else if (!online)
    message = ar
      ? "الجهاز غير متصل. لا تُعرض بيانات أصل أو رمز QR من نسخة محفوظة."
      : "The device is offline. No saved asset data or QR is displayed.";
  else if (readFailure === "session_changed")
    message = ar
      ? "تغيّر الحساب أثناء القراءة. أعد القراءة للتحقق من صلاحيات الحساب الحالي."
      : "The account changed during the read. Retry to verify the current account's permissions.";
  else if (readFailure === "timeout")
    message = ar
      ? "استغرقت القراءة أكثر من المهلة المحددة. حاول مجددًا؛ لا تُعرض نسخة محفوظة."
      : "The read exceeded its time limit. Try again; no saved copy is displayed.";
  else if (query.isError || result?.status === "source_error")
    message = ar
      ? "تعذّر قراءة الأصل من المصدر. لا تُعرض نسخة محفوظة."
      : "The source could not be read. No saved copy is displayed.";
  else if (query.isFetching || query.isPending)
    message = ar ? "جارٍ قراءة الأصل ضمن صلاحياتك…" : "Reading the asset within your permissions…";
  else if (result?.status === "forbidden")
    message = ar
      ? "صلاحيات حسابك لا تسمح بقراءة هذا السجل."
      : "Your account is not permitted to read this record.";
  else if (result?.status === "not_available")
    message = ar
      ? "الأصل غير موجود ضمن نطاق القراءة المسموح لحسابك، أو أُزيل من المصدر."
      : "The asset is unavailable within your authorized scope or has been removed.";

  return (
    <div className="space-y-4" dir={ar ? "rtl" : "ltr"}>
      <SecPageHeader
        title={ar ? "سجل الأصل" : "Asset record"}
        subtitle={
          ar
            ? "قراءة متصلة فقط، وفق صلاحيات الحساب والمؤسسة"
            : "Online read only, subject to account and organization permissions"
        }
      >
        <SecLiveBadge
          dataUpdatedAt={current ? query.dataUpdatedAt : 0}
          isFetching={query.isFetching}
          source="sec_assets"
        />
      </SecPageHeader>
      <p className="text-sm text-muted-foreground">
        {ar
          ? "يتطلب اتصالًا بالإنترنت وتسجيل الدخول. لا يتيح الرمز وصولًا دون اتصال، ولا يمنح صلاحيات إضافية."
          : "Requires an internet connection and sign-in. The QR provides no offline access or additional permissions."}
      </p>
      {message && (
        <p role="status" className="rounded-xl border border-border bg-card p-4">
          {message}
        </p>
      )}
      {needsSignIn && (
        <Link
          to="/auth"
          className="nx-focus-ring inline-flex min-h-[44px]! min-w-[44px]! items-center rounded-xl border border-border px-4"
        >
          {ar ? "تسجيل الدخول" : "Sign in"}
        </Link>
      )}
      {userId && valid && !authError && (query.isError || result?.status === "source_error") && (
        <button
          type="button"
          onClick={() => void query.refetch()}
          className="nx-focus-ring min-h-[44px]! min-w-[44px]! rounded-xl border border-border px-4"
        >
          {ar ? "إعادة القراءة" : "Retry read"}
        </button>
      )}
      {current &&
        (() => {
          const { asset, fetchedAt } = current;
          const assetUrl =
            typeof window === "undefined"
              ? null
              : new URL(`/sec/asset/${asset.id}`, window.location.origin).href;
          return (
            <section
              className="space-y-4 rounded-xl border border-border bg-card p-4"
              data-evidence-source="public.sec_assets"
            >
              <h2 className="text-xl font-semibold">
                {ar ? asset.name_ar || asset.name_en : asset.name_en || asset.name_ar}
              </h2>
              <dl className="grid gap-4 sm:grid-cols-2">
                {[
                  [ar ? "رمز الأصل" : "Asset code", asset.code],
                  [ar ? "النوع" : "Kind", asset.kind],
                  [ar ? "الحالة المسجلة" : "Recorded status", asset.status],
                  [ar ? "الصحة المسجلة" : "Recorded health", `${asset.health}%`],
                  [ar ? "تحديث السجل في المصدر" : "Source record updated", time(asset.updated_at)],
                  [ar ? "آخر اتصال مسجل" : "Last recorded contact", time(asset.last_seen_at)],
                  [ar ? "وقت هذه القراءة" : "This read fetched at", time(fetchedAt)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-sm text-muted-foreground">{label}</dt>
                    <dd className="mt-1 break-words">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-sm text-muted-foreground">
                {ar
                  ? "وقت الجلب وشارة المزامنة يصفان القراءة فقط؛ لا يثبتان حداثة بيانات الأصل أو اتصاله الآن."
                  : "The fetch time and sync badge describe this read only; they do not prove that the asset data is current or that the asset is connected now."}
              </p>
              {assetUrl && (
                <>
                  <button
                    type="button"
                    aria-expanded={showQr}
                    aria-controls={qrId}
                    onClick={() => setShowQr((value) => !value)}
                    className="nx-focus-ring min-h-[44px]! min-w-[44px]! rounded-xl border border-border px-4"
                  >
                    {showQr
                      ? ar
                        ? "إغلاق رمز الأصل"
                        : "Close asset QR"
                      : ar
                        ? "رمز QR للأصل"
                        : "Asset QR"}
                  </button>
                  {showQr && (
                    <div
                      id={qrId}
                      className="space-y-3"
                      role="region"
                      aria-label={ar ? "رابط الأصل المحمي" : "Protected asset link"}
                    >
                      <div className="w-fit rounded-xl bg-white p-[24px]">
                        <QRCode
                          value={assetUrl}
                          size={180}
                          level="M"
                          bgColor="#ffffff"
                          fgColor="#000000"
                          aria-label={ar ? "رمز رابط هذا الأصل" : "QR link to this asset"}
                        />
                      </div>
                      <a
                        className="nx-focus-ring inline-flex min-h-[44px]! items-center break-all text-primary underline"
                        href={assetUrl}
                      >
                        {ar ? "فتح رابط هذا الأصل" : "Open this asset link"}
                      </a>
                      <p className="text-sm text-muted-foreground">
                        {ar
                          ? "يحتوي الرمز رابط السجل فقط، دون جلسة دخول. يُعاد التحقق من الصلاحيات عند فتحه."
                          : "The code contains only the record link, without a sign-in session. Permissions are checked again when it is opened."}
                      </p>
                    </div>
                  )}
                </>
              )}
            </section>
          );
        })()}
    </div>
  );
}
