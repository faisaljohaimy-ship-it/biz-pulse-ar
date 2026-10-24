/**
 * Public FNN entry, private owner chat. Visibility is not authorization.
 * Owner request 2026-10-24: keep FNN visible on the home screen.
 * The server owner gate, separate chat state and provider/spend limits stay intact.
 */
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, ChevronDown, TriangleAlert } from "lucide-react";
import { lazy, Suspense, useId, useState, type ReactNode } from "react";
import { HOME_IMAGES } from "@/components/home/home-images";
import { useAuth } from "@/lib/auth-context";
import { getFinnAccess } from "@/lib/finn-agent/access.functions";
import { FINN_BANNER_AR, FINN_COPY } from "@/lib/finn-agent/copy";
import {
  FINN_HOME_CAPABILITIES,
  finnHomeState,
  type FinnHomeState,
} from "@/lib/finn-agent/home-access";
import type { FinnEngineStatus } from "@/lib/finn-agent/status";
import { useI18n } from "@/lib/i18n";
import "@/styles/home/home-finn.css";
import "@/styles/home/home-finn-identity.css";

// No chat code is loaded for visitors or users denied by the server guard.
const FinnChat = lazy(() => import("@/components/finn/FinnChat"));

const OPEN_AR = "افتح محادثة فِن";
const OPEN_EN = "Open the Finn chat";
const SUBTITLE_EN = "Owner's coding and automation assistant";
const HIDE_AR = "إخفاء المحادثة";
const SHOW_AR = "إظهار المحادثة";
const HIDE_EN = "Hide the chat";
const SHOW_EN = "Show the chat";

function InlineChat({ engine, ar }: { engine: FinnEngineStatus; ar: boolean }) {
  const [open, setOpen] = useState(true);
  const panelId = useId();
  return (
    <div className="nx-fn-chat">
      <button
        type="button"
        className="nx-fn-fold min-h-11!"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{open ? (ar ? HIDE_AR : HIDE_EN) : ar ? SHOW_AR : SHOW_EN}</span>
        <ChevronDown aria-hidden className="nx-fn-fold-ico" data-open={open || undefined} />
      </button>
      {/* Folding preserves this user's draft; a different user remounts the card. */}
      <div id={panelId} hidden={!open}>
        <Suspense
          fallback={
            <p dir="rtl" role="status" className="nx-fn-chat-loading">
              {FINN_COPY.loadingPage}
            </p>
          }
        >
          <FinnChat engine={engine} variant="inline" />
        </Suspense>
      </div>
    </div>
  );
}

function CardFrame({
  ar,
  state,
  children,
}: {
  ar: boolean;
  state: FinnHomeState;
  children: ReactNode;
}) {
  const img = HOME_IMAGES.finn;
  return (
    <section
      id="fnn"
      aria-labelledby="nx-home-finn-title"
      aria-describedby="nx-home-finn-separation"
      dir={ar ? "rtl" : "ltr"}
      className="nx-home-panel nx-home-finn scroll-mt-32"
      data-finn-home-card
      data-finn-access={state}
      data-agent="fnn"
    >
      <div className="nx-fn-head">
        <img
          src={img.src}
          width={img.width}
          height={img.height}
          alt={img.alt}
          loading={img.loading}
          decoding="async"
          className="nx-fn-portrait"
        />
        <div className="nx-fn-id">
          <span className="nx-fn-agent-badge" dir="ltr">
            FNN
          </span>
          <h2 id="nx-home-finn-title" className="nx-fn-title">
            {ar ? FINN_COPY.title : "Finn"}
          </h2>
          <p className="nx-fn-sub">{ar ? FINN_COPY.subtitle : SUBTITLE_EN}</p>
          <p id="nx-home-finn-separation" className="nx-fn-separation">
            {ar ? "محادثة مستقلة عن سديد · للمالك فقط" : "Separate from SADEED · Owner only"}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Capabilities({ ar, owner }: { ar: boolean; owner: boolean }) {
  return (
    <details className="mx-4 my-3 rounded-xl border border-[color:var(--hairline)] p-3">
      <summary className="min-h-11 cursor-pointer font-semibold text-[color:var(--ink)]">
        {ar ? "الصلاحيات والإمكانيات" : "Permissions and capabilities"}
      </summary>
      <p className="py-2 text-sm text-[color:var(--ink-2)]" data-finn-permission>
        {owner
          ? ar
            ? "تم التحقق من صلاحية المالك."
            : "Owner access verified."
          : ar
            ? "استخدام المحادثة للمالك بعد التحقق من الحساب."
            : "Chat requires verified owner access."}
      </p>
      <ul className="list-inside list-disc space-y-1 text-sm text-[color:var(--ink)]">
        {FINN_HOME_CAPABILITIES.map((item) => (
          <li key={item.en}>{ar ? item.ar : item.en}</li>
        ))}
      </ul>
      <p
        className="mt-2 text-sm leading-6 text-[color:var(--ink-2)]"
        data-finn-execution="advisory"
      >
        {ar
          ? "القدرات نصية: لا تنفيذ أو نشر أو تعديل مستودع أو قاعدة بيانات من هذه المحادثة."
          : "Text assistance only: this chat does not execute, deploy, or modify repositories or databases."}
      </p>
    </details>
  );
}

function AccessNotice({
  ar,
  state,
  retry,
  busy = false,
}: {
  ar: boolean;
  state: Exclude<FinnHomeState, "owner">;
  retry?: () => void;
  busy?: boolean;
}) {
  const messages = {
    guest: ar
      ? "سجّل الدخول بحساب المالك لبدء محادثة فنن."
      : "Sign in with the owner account to start FNN.",
    checking: ar ? "جارٍ التحقق من صلاحية الحساب…" : "Checking account access…",
    denied: ar
      ? "هذا الحساب لا يملك صلاحية استخدام فنن. لن تُفتح المحادثة أو أدواتها."
      : "This account cannot use FNN. Chat and tools remain locked.",
    error: ar
      ? "تعذّر التحقق من صلاحية فنن الآن. أعد المحاولة؛ لم تُمنح صلاحيات إضافية."
      : "FNN access could not be checked. Retry; no additional access was granted.",
  };
  return (
    <CardFrame ar={ar} state={state}>
      <p role={state === "error" ? "alert" : "status"} className="nx-fn-banner">
        {messages[state]}
      </p>
      <Capabilities ar={ar} owner={false} />
      {state === "guest" ? (
        <Link
          to="/auth"
          search={{ mode: "signin", redirect: "/#fnn" }}
          className="nx-fn-open min-h-11!"
        >
          {ar ? "دخول المالك إلى فنن" : "Owner sign-in for FNN"}
        </Link>
      ) : retry ? (
        <button type="button" className="nx-fn-open min-h-11!" onClick={retry} disabled={busy}>
          {ar ? "إعادة التحقق من الصلاحية" : "Recheck access"}
        </button>
      ) : null}
    </CardFrame>
  );
}

function FinnCard({ userId }: { userId: string }) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { data, isError, isFetching, refetch } = useQuery({
    queryKey: ["finn-access", userId],
    queryFn: () => getFinnAccess(),
    staleTime: 30_000,
    retry: false,
    refetchOnWindowFocus: true,
  });
  const state = finnHomeState({ signedIn: true, allowed: data?.allowed, failed: isError });
  if (state !== "owner" || !data?.allowed) {
    return (
      <AccessNotice
        ar={ar}
        state={state === "owner" ? "checking" : state}
        retry={() => {
          void refetch();
        }}
        busy={isFetching}
      />
    );
  }
  const Arrow = ar ? ArrowLeft : ArrowRight;
  return (
    <CardFrame ar={ar} state="owner">
      <p role="note" className="nx-fn-banner">
        <TriangleAlert aria-hidden className="nx-fn-banner-ico" />
        <span dir="rtl">{FINN_BANNER_AR}</span>
      </p>
      <Capabilities ar={ar} owner />
      <InlineChat engine={data.engine} ar={ar} />
      <Link to="/finn" className="nx-fn-open min-h-11!">
        <span>{ar ? OPEN_AR : OPEN_EN}</span>
        <Arrow aria-hidden className="nx-fn-open-ico" />
      </Link>
    </CardFrame>
  );
}

export function HomeFinnCard() {
  const { user } = useAuth();
  const { locale } = useI18n();
  // Public identity only: no access request, chat import or model call for guests.
  if (!user) return <AccessNotice ar={locale === "ar"} state="guest" />;
  // Never retain a previous signed-in user's draft in a reused component tree.
  return <FinnCard key={user.id} userId={user.id} />;
}
