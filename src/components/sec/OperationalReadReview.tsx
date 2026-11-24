import { useId, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { listMyOrgs } from "@/lib/org/org.functions";
import {
  getOperationalReadReview,
  type OperationalReadReviewResult,
} from "@/lib/exec/operational-read-review.functions";
import {
  reviewDataQuality,
  type ReviewCoverage,
  type ReviewFinding,
  type ReviewSource,
} from "@/lib/exec/operational-read-review";

const LABELS: Record<string, { ar: string; en: string }> = {
  expired: { ar: "انتهت الصلاحية", en: "Expired" },
  expires_within_window: { ar: "انتهاء ضمن نافذة المراجعة", en: "Expires within review window" },
  active_after_expiry: { ar: "حالة نشطة بعد الانتهاء", en: "Active status after expiry" },
  active_before_start: { ar: "حالة نشطة قبل البداية", en: "Active status before start" },
  reversed_window: { ar: "نهاية تسبق البداية", en: "End is not after start" },
  missing_date: { ar: "تاريخ غير متاح", en: "Date unavailable" },
  invalid_date: { ar: "تاريخ غير صالح", en: "Invalid date" },
  missing_status: { ar: "حالة غير متاحة", en: "Status unavailable" },
  missing_field: { ar: "حقل غير متاح", en: "Missing field" },
  invalid_timestamp: { ar: "وقت مصدر غير صالح", en: "Invalid source time" },
  future_timestamp: { ar: "وقت مصدر في المستقبل", en: "Source time is in the future" },
  older_than_review_threshold: {
    ar: "أقدم من حد المراجعة المختار",
    en: "Older than selected review threshold",
  },
  duplicate_id: { ar: "معرّف مكرر", en: "Duplicate identifier" },
  conflicting_duplicate: {
    ar: "قيم متعارضة للمعرّف نفسه",
    en: "Conflicting values for the same identifier",
  },
};
const SOURCES: Record<
  ReviewSource,
  { ar: string; en: string; to: "/sec/incidents" | "/sec/permits" | "/sec/contractors" }
> = {
  sec_incidents: { ar: "البلاغات", en: "Incidents", to: "/sec/incidents" },
  sec_permits: { ar: "التصاريح", en: "Permits", to: "/sec/permits" },
  sec_contractors: { ar: "المقاولون", en: "Contractors", to: "/sec/contractors" },
};

async function boundedRead<T>(
  run: (signal: AbortSignal) => Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  const cancel = () => controller.abort(new Error("Review cancelled"));
  const timer = setTimeout(() => controller.abort(new Error("Review deadline")), 12000);
  signal.addEventListener("abort", cancel, { once: true });
  if (signal.aborted) cancel();
  let rejectAbort = () => {};
  const aborted = new Promise<never>((_, reject) => {
    rejectAbort = () => reject(controller.signal.reason);
    controller.signal.addEventListener("abort", rejectAbort, { once: true });
    if (controller.signal.aborted) rejectAbort();
  });
  try {
    return await Promise.race([run(controller.signal), aborted]);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", cancel);
    controller.signal.removeEventListener("abort", rejectAbort);
  }
}

function Coverage({ value, ar }: { value: ReviewCoverage; ar: boolean }) {
  return (
    <p className="text-xs text-muted-foreground">
      {value.state === "unavailable"
        ? ar
          ? "المصدر غير متاح؛ النتيجة غير معروفة."
          : "Source unavailable; result unknown."
        : `${ar ? "الصفوف المفحوصة" : "Rows reviewed"}: ${value.evaluated} / ${value.total ?? (ar ? "إجمالي غير معلوم" : "unknown total")}. ${value.state === "partial" ? (ar ? "عينة محدودة؛ ليست فحصًا شاملًا." : "Bounded sample; not an exhaustive scan.") : ar ? "تغطية الصفوف المرئية حسب الصلاحيات." : "Coverage of rows visible to this account."}`}{" "}
      {ar ? "وقت جلب المصدر" : "Source fetched at"}: <span dir="ltr">{value.scope.fetchedAt}</span>
    </p>
  );
}

function Findings({ findings, ar }: { findings: readonly ReviewFinding[] | null; ar: boolean }) {
  if (findings === null) return <p>{ar ? "نتيجة غير معروفة." : "Result unknown."}</p>;
  if (!findings.length)
    return (
      <p>
        {ar
          ? "لا ملاحظات ضمن الصفوف والقواعد المفحوصة."
          : "No findings within the reviewed rows and rules."}
      </p>
    );
  return (
    <>
      <p>
        {ar ? "عدد الملاحظات" : "Findings"}: {findings.length}
      </p>
      <ul className="space-y-2 text-sm">
        {findings.slice(0, 30).map((item, index) => (
          <li
            key={`${item.rule}:${item.ids.join()}:${item.field}:${index}`}
            className="rounded-lg border border-border p-2"
          >
            <span>{LABELS[item.rule]?.[ar ? "ar" : "en"] ?? item.rule}</span>
            {" · "}
            <code>{item.field}</code>
            <div className="break-all" dir="ltr">
              {item.ids.join(", ") || (ar ? "معرّف غير متاح" : "Identifier unavailable")}
            </div>
            <div className="text-xs text-muted-foreground" dir="ltr">
              {item.sourceTimes
                .map((time) => time ?? (ar ? "وقت غير متاح" : "Time unavailable"))
                .join(" · ")}
            </div>
          </li>
        ))}
      </ul>
      {findings.length > 30 && (
        <p className="text-xs">
          {ar
            ? "تظهر أول 30 ملاحظة؛ العدد أعلاه يشمل كل الملاحظات المحسوبة."
            : "Showing the first 30 findings; the count includes all computed findings."}
        </p>
      )}
    </>
  );
}

function ReviewForAccount({ userId }: { userId: string | null }) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const selectId = useId();
  const [orgId, setOrgId] = useState("");
  const [staleHours, setStaleHours] = useState(24);
  const fetchOrgs = useServerFn(listMyOrgs);
  const fetchReview = useServerFn(getOperationalReadReview);
  const orgs = useQuery({
    queryKey: ["operational-review-orgs", userId],
    enabled: Boolean(userId),
    retry: false,
    gcTime: 0,
    queryFn: ({ signal }) =>
      boundedRead((requestSignal) => fetchOrgs({ signal: requestSignal }), signal),
  });
  const selected = orgs.data?.some((org) => org.id === orgId) === true;
  const query = useQuery<OperationalReadReviewResult>({
    queryKey: ["operational-read-review", userId, orgId],
    enabled: Boolean(userId && selected),
    retry: false,
    gcTime: 0,
    queryFn: ({ signal }) =>
      boundedRead(async (requestSignal) => {
        const result = await fetchReview({
          data: { organizationId: orgId },
          signal: requestSignal,
        });
        if (
          result.status === "ok" &&
          (result.accountId !== userId || result.organizationId !== orgId)
        )
          throw new Error("Review scope changed");
        return result;
      }, signal),
  });
  const response = query.data;
  const snapshot: Extract<OperationalReadReviewResult, { status: "ok" }> | null =
    response?.status === "ok" &&
    selected &&
    response.accountId === userId &&
    response.organizationId === orgId
      ? response
      : null;

  return (
    <section
      className="min-w-0 space-y-4 rounded-xl border border-border bg-card p-4"
      dir={ar ? "rtl" : "ltr"}
      aria-label={ar ? "مراجعة تسليم الوردية" : "Shift handover review"}
    >
      <h2 className="font-semibold">
        {ar ? "مراجعة تسليم الوردية وصلاحية البيانات" : "Shift handover and data review"}
      </h2>
      <p className="text-sm text-muted-foreground">
        {ar
          ? "قراءة فقط لصفوف الجهة المتاحة لحسابك؛ لا اعتماد أو تنفيذ أو بيانات بديلة. فحوص التواريخ والحالة وصفية، وليست حكم امتثال أو تقييم مخاطر."
          : "Read-only review of your organization's permitted rows; no approval, execution or fallback data. Date and status checks are descriptive, not compliance or risk decisions."}
      </p>
      {!userId ? (
        <p>
          {ar
            ? "سجّل الدخول لعرض مراجعة الجهة المصرح بها."
            : "Sign in to review your authorized organization."}
        </p>
      ) : (
        <>
          <label className="block text-sm" htmlFor={selectId}>
            {ar ? "الجهة المختارة" : "Selected organization"}
          </label>
          <select
            id={selectId}
            className="min-h-[44px] w-full rounded-lg border border-border bg-background px-3"
            value={orgId}
            onChange={(event) => setOrgId(event.target.value)}
          >
            <option value="">{ar ? "اختر جهة" : "Choose an organization"}</option>
            {orgs.data?.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
          {orgs.isPending && (
            <p role="status">{ar ? "جارٍ تحميل الجهات…" : "Loading organizations…"}</p>
          )}
          {orgs.isError && (
            <button
              type="button"
              className="min-h-[44px] underline"
              onClick={() => void orgs.refetch()}
            >
              {ar ? "تعذر تحميل الجهات. أعد المحاولة" : "Organizations unavailable. Retry"}
            </button>
          )}
          {orgs.isSuccess && !orgs.data.length && (
            <p>
              {ar
                ? "لا توجد جهة متاحة لهذا الحساب."
                : "No organization is available to this account."}
            </p>
          )}
          {selected && query.isPending && (
            <p role="status">{ar ? "جارٍ قراءة المصادر…" : "Reading sources…"}</p>
          )}
          {selected && (query.isError || query.data?.status === "unavailable") && (
            <button
              type="button"
              className="min-h-[44px] underline"
              onClick={() => void query.refetch()}
            >
              {ar ? "تعذرت القراءة المصرح بها. أعد المحاولة" : "Authorized read unavailable. Retry"}
            </button>
          )}
          {snapshot && (
            <>
              <p className="text-xs">
                {ar ? "وقت المراجعة" : "As of"}: <span dir="ltr">{snapshot.asOf} · UTC</span>
              </p>
              <div className="space-y-3 rounded-lg border border-border p-3">
                <h3 className="font-semibold">
                  {ar
                    ? "كل البلاغات الحرجة المفتوحة في القراءة"
                    : "Every open critical incident in this read"}
                </h3>
                <Coverage value={snapshot.handover.coverage} ar={ar} />
                {!snapshot.handover.invariant || snapshot.handover.cases === null ? (
                  <p>
                    {ar
                      ? "تعذر إثبات اكتمال معرّفات التسليم؛ النتيجة غير معروفة."
                      : "The handover ID invariant could not be verified; result unknown."}
                  </p>
                ) : (
                  <>
                    <p>
                      {ar ? "عدد الحالات" : "Cases"}: {snapshot.handover.caseCount}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ar
                        ? "معرّفات المصدر محفوظة بلا حذف أو دمج. لا يحتوي مصدر البلاغات الحالي على حقل موعد نهائي؛ يُعرض ذلك كمعلومة غير متاحة."
                        : "Source identifiers are retained without omission or merging. The current incident source has no deadline field; deadlines are unavailable."}
                    </p>
                    <ul className="space-y-2">
                      {snapshot.handover.cases.map((item) => (
                        <li
                          key={item.id}
                          className="break-all rounded-lg border border-border p-2 text-sm"
                        >
                          <code dir="ltr">{item.id}</code>
                          <div>
                            {ar ? "الحالة" : "Status"}:{" "}
                            {item.status ?? (ar ? "غير معروفة" : "Unknown")}
                          </div>
                          <div>
                            {ar ? "المسؤول" : "Owner"}:{" "}
                            {item.ownerRecorded
                              ? ar
                                ? "مسجل في المصدر"
                                : "Recorded in source"
                              : ar
                                ? "غير متاح"
                                : "Unavailable"}
                          </div>
                          <div>
                            {ar ? "الموعد النهائي" : "Deadline"}:{" "}
                            {item.deadline ?? (ar ? "غير متاح" : "Unavailable")}
                          </div>
                          <time className="text-xs" dir="ltr">
                            {item.sourceUpdatedAt ??
                              (ar ? "وقت تحديث غير متاح" : "Update time unavailable")}
                          </time>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {!!snapshot.handover.missingClassification?.length && (
                  <p>
                    {ar
                      ? "بعض صفوف المصدر تفتقد الحالة أو الشدة؛ اكتمال التصنيف غير مثبت."
                      : "Some source rows lack status or severity; classification completeness is unverified."}
                  </p>
                )}
                <Link
                  to="/sec/incidents"
                  className="inline-flex min-h-[44px] items-center underline"
                >
                  {ar ? "عرض قائمة البلاغات" : "Open incident list"}
                </Link>
              </div>
              {(["permits", "contractors"] as const).map((key) => (
                <div key={key} className="space-y-2 rounded-lg border border-border p-3">
                  <h3 className="font-semibold">
                    {ar
                      ? key === "permits"
                        ? "تواريخ التصاريح وحالاتها"
                        : "تواريخ العقود والتأمين وحالاتها"
                      : key === "permits"
                        ? "Permit dates and status"
                        : "Contract and insurance dates and status"}
                  </h3>
                  <Coverage value={snapshot[key].coverage} ar={ar} />
                  <p className="text-xs">
                    {ar
                      ? "نافذة وصفية: 30 يومًا؛ التاريخ دون ساعة ينتهي بنهاية يومه بتوقيت UTC."
                      : "Descriptive window: 30 days; a date without a time expires at the end of its UTC day."}
                  </p>
                  <Findings findings={snapshot[key].findings} ar={ar} />
                  <Link
                    to={key === "permits" ? "/sec/permits" : "/sec/contractors"}
                    className="inline-flex min-h-[44px] items-center underline"
                  >
                    {ar ? "عرض قائمة المصدر" : "Open source list"}
                  </Link>
                </div>
              ))}
              <div className="space-y-3 rounded-lg border border-border p-3">
                <h3 className="font-semibold">{ar ? "فحص جودة الصفوف" : "Row-quality review"}</h3>
                <label className="flex flex-wrap items-center gap-2 text-sm">
                  {ar
                    ? "حد مراجعة عمر التحديث بالساعات (ليس معيارًا تشغيليًا)"
                    : "Update-age review threshold in hours (not an operational standard)"}
                  <input
                    type="number"
                    min={1}
                    max={8760}
                    value={staleHours}
                    onChange={(event) => setStaleHours(Number(event.target.value))}
                    className="min-h-[44px] w-28 rounded border border-border bg-background px-2"
                  />
                </label>
                {snapshot.reads.map((read) => {
                  const review = reviewDataQuality(read, snapshot.asOf, staleHours);
                  return (
                    <details key={read.scope.source} className="rounded border border-border p-2">
                      <summary className="min-h-[44px] cursor-pointer">
                        {SOURCES[read.scope.source][ar ? "ar" : "en"]} ·{" "}
                        {review.findingCount ?? (ar ? "غير معلوم" : "Unknown")}
                      </summary>
                      <Coverage value={review.coverage} ar={ar} />
                      <Findings findings={review.findings} ar={ar} />
                    </details>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}

export function OperationalReadReview() {
  const { user } = useAuth();
  return <ReviewForAccount key={user?.id ?? "guest"} userId={user?.id ?? null} />;
}
