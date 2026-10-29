import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Code2, LockKeyhole, LogOut, RefreshCw, ShieldCheck } from "lucide-react";
import { HOME_IMAGES } from "@/components/home/home-images";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { getFinnAccess } from "@/lib/finn-agent/access.functions";
import {
  finnGoogleError,
  finnGoogleOptions,
  hasFinnOAuthError,
  verifiedGoogleAuthorizeUrl,
  withFinnDeadline,
} from "@/lib/finn-agent/native-google";
import "@/styles/fnn-workspace.css";

const FinnChat = lazy(() => import("./FinnChat"));

class PrivateChatBoundary extends Component<
  { children: ReactNode; ar: boolean },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="fnn-notice" role="alert">
        <p>
          {this.props.ar
            ? "تعذّر تحميل المحادثة. أعد تحميل الصفحة للمحاولة مجددًا."
            : "Chat could not load. Reload the page to retry."}
        </p>
        <button
          type="button"
          className="fnn-button min-h-11!"
          onClick={() => window.location.reload()}
        >
          {this.props.ar ? "إعادة التحميل" : "Reload"}
        </button>
      </div>
    );
  }
}

function GoogleSignIn({ ar, signedIn }: { ar: boolean; signedIn: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const attempt = useRef(0);
  const active = useRef(true);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => {
    active.current = true;
    const reset = () => {
      attempt.current++;
      abort.current?.abort();
      setBusy(false);
    };
    window.addEventListener("pageshow", reset);
    return () => {
      active.current = false;
      attempt.current++;
      abort.current?.abort();
      window.removeEventListener("pageshow", reset);
    };
  }, []);

  const signIn = async () => {
    if (busy) return;
    const id = ++attempt.current;
    const current = () => active.current && id === attempt.current;
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setError(null);
    try {
      if (!isSupabaseConfigured) throw new Error("google_not_configured");
      const health = await withFinnDeadline(
        (async () => {
          const res = await fetch("/api/fnn/auth-health", {
            cache: "no-store",
            signal: controller.signal,
          });
          if (!res.ok) throw new Error("auth_unavailable");
          return (await res.json()) as { checked?: boolean; googleEnabled?: boolean };
        })(),
      );
      if (!current()) return;
      if (health.checked !== true) throw new Error("auth_unavailable");
      if (health.googleEnabled !== true) throw new Error("google_not_configured");
      // Keep the existing session until Google authenticates the chosen account.
      // The owner workspace is keyed by user ID and cannot retain another user's draft.
      const result = await withFinnDeadline(
        supabase.auth.signInWithOAuth(finnGoogleOptions(window.location.origin)),
      );
      if (!current()) return;
      if (result.error) throw new Error("oauth_failed");
      const url = verifiedGoogleAuthorizeUrl(result.data.url, window.location.origin);
      window.location.assign(url);
    } catch (cause) {
      if (current()) setError(finnGoogleError(cause, ar));
    } finally {
      controller.abort();
      if (current()) setBusy(false);
    }
  };
  return (
    <div className="fnn-signin">
      <button
        type="button"
        className="fnn-google min-h-11!"
        disabled={busy}
        onClick={() => void signIn()}
      >
        <span className="fnn-google-mark" aria-hidden>
          G
        </span>
        {busy
          ? ar
            ? "جارٍ تجهيز الدخول…"
            : "Preparing sign-in…"
          : signedIn
            ? ar
              ? "اختيار حساب Google آخر"
              : "Choose another Google account"
            : ar
              ? "المتابعة باستخدام Google"
              : "Continue with Google"}
      </button>
      {error && (
        <p className="fnn-notice" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function OwnerWorkspace({ userId, ar }: { userId: string; ar: boolean }) {
  const { data, isPending, isError, isFetching, refetch } = useQuery({
    queryKey: ["finn-access", userId, "standalone"],
    queryFn: () => withFinnDeadline(getFinnAccess()),
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: true,
  });
  // Do not use cached permission on a failed refresh. The API gate remains authoritative.
  if (isError)
    return (
      <div className="fnn-notice" role="alert">
        <p>
          {ar
            ? "تعذّر التحقق من صلاحية المالك. لم تُفتح المحادثة."
            : "Owner access could not be verified. Chat remains locked."}
        </p>
        <button
          type="button"
          className="fnn-button min-h-11!"
          disabled={isFetching}
          onClick={() => void refetch()}
        >
          <RefreshCw size={18} aria-hidden />
          {ar ? "إعادة التحقق" : "Retry verification"}
        </button>
      </div>
    );
  if (isPending || !data)
    return (
      <p className="fnn-notice" role="status">
        {ar ? "جارٍ التحقق من صلاحية المالك…" : "Verifying owner access…"}
      </p>
    );
  if (!data.allowed)
    return (
      <div className="fnn-notice" role="status">
        <LockKeyhole aria-hidden />
        <h2>{ar ? "هذا الحساب غير مخوّل لاستخدام فنن" : "This account cannot access FNN"}</h2>
        <p>
          {ar
            ? "نجاح تسجيل الدخول لا يمنح صلاحية المالك. اختر الحساب المعتمد؛ المحادثة وبياناتها محمية."
            : "Signing in does not grant owner access. Choose the authorized account; chat and its data remain protected."}
        </p>
        <GoogleSignIn ar={ar} signedIn />
      </div>
    );
  return (
    <PrivateChatBoundary ar={ar}>
      <Suspense
        fallback={
          <p className="fnn-notice" role="status">
            {ar ? "جارٍ تحميل مساحة فنن…" : "Loading FNN…"}
          </p>
        }
      >
        <FinnChat key={userId} engine={data.engine} />
      </Suspense>
    </PrivateChatBoundary>
  );
}

export function FnnWorkspace() {
  const { user, loading } = useAuth();
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [notice, setNotice] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [locked, setLocked] = useState(false);
  const portrait = HOME_IMAGES.finn;
  useEffect(() => {
    if (hasFinnOAuthError(window.location.href)) {
      setNotice(
        ar
          ? "لم يكتمل تسجيل الدخول عبر Google. يمكنك المحاولة مجددًا."
          : "Google sign-in did not finish. You can try again.",
      );
      // Only remove error parameters; successful Auth tokens belong to the SDK.
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(url.hash.slice(1));
      for (const key of ["error", "error_code", "error_description"]) {
        url.searchParams.delete(key);
        hash.delete(key);
      }
      url.hash = hash.toString();
      window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    }
  }, [ar]);
  useEffect(() => {
    setLocked(false);
  }, [user?.id]);
  const signOut = async () => {
    if (leaving) return;
    setLeaving(true);
    setLocked(true); // Unmount private state immediately, including when sign-out is slow.
    setNotice(null);
    try {
      const result = await withFinnDeadline(supabase.auth.signOut({ scope: "local" }));
      if (result.error) throw result.error;
    } catch {
      setNotice(
        ar
          ? "تعذّر تأكيد الخروج. بقيت المحادثة مقفلة؛ أعد المحاولة."
          : "Sign-out could not be confirmed. Chat stays locked; retry.",
      );
    } finally {
      setLeaving(false);
    }
  };
  return (
    <main className="fnn-workspace" dir={ar ? "rtl" : "ltr"} data-fnn-workspace>
      <header className="fnn-top">
        <Link to="/" className="fnn-back min-h-11!">
          <ArrowRight size={18} aria-hidden />
          {ar ? "العودة إلى سديد" : "Back to SADEED"}
        </Link>
        <span className="fnn-badge">
          <ShieldCheck size={16} aria-hidden />
          {ar ? "مساحة المالك" : "Owner workspace"}
        </span>
        {user && (
          <button
            type="button"
            className="fnn-back min-h-11!"
            disabled={leaving}
            onClick={() => void signOut()}
          >
            <LogOut size={18} aria-hidden />
            {ar ? "تسجيل الخروج" : "Sign out"}
          </button>
        )}
      </header>
      <section className="fnn-hero" aria-labelledby="fnn-title">
        <div>
          <span className="fnn-eyebrow" dir="ltr">
            FNN · OWNER WORKSPACE
          </span>
          <h1 id="fnn-title">
            {ar ? "فنن. مساحة عملك المستقلة." : "FNN. Your independent workspace."}
          </h1>
          <p>
            {ar
              ? "مساعدك لمراجعة الكود وتحليل الأخطاء وتصميم خطط الأتمتة. دخول موحّد عبر Google، ومحادثة مستقلة عن سديد."
              : "Your assistant for code review, debugging and automation planning. Google sign-in, with a conversation separate from SADEED."}
          </p>
          <div className="fnn-features">
            <span>
              <Code2 size={18} aria-hidden />
              {ar ? "مراجعة وبرمجة" : "Code assistance"}
            </span>
            <span>
              <LockKeyhole size={18} aria-hidden />
              {ar ? "تحقق المالك من الخادم" : "Server-verified owner access"}
            </span>
          </div>
        </div>
        <img
          src={portrait.src}
          alt={ar ? "الهوية البصرية لمساعد فنن" : "FNN assistant portrait"}
          width={portrait.width}
          height={portrait.height}
          decoding="async"
          className="fnn-portrait"
        />
      </section>
      {notice && (
        <p className="fnn-notice" role="alert">
          {notice}
        </p>
      )}
      {loading ? (
        <p className="fnn-notice" role="status">
          {ar ? "جارٍ التحقق من جلسة الدخول…" : "Checking your session…"}
        </p>
      ) : !user ? (
        <section className="fnn-entry" aria-label={ar ? "الدخول إلى فنن" : "FNN sign-in"}>
          <LockKeyhole aria-hidden size={28} />
          <h2>{ar ? "ادخل بحساب Google المعتمد" : "Use your authorized Google account"}</h2>
          <p>
            {ar
              ? "لا تحتاج إلى كلمة مرور منفصلة لفنن. بعد العودة نتحقق من صلاحية المالك قبل فتح المحادثة."
              : "No separate FNN password. Owner permission is checked after you return, before chat opens."}
          </p>
          <GoogleSignIn ar={ar} signedIn={false} />
          <small>
            {ar
              ? "Google يثبت الهوية؛ صلاحيات فنن يحددها الخادم، ولا تُمنح تلقائيًا."
              : "Google verifies identity. FNN permissions are assigned by the server, never automatically."}
          </small>
        </section>
      ) : locked ? (
        <p className="fnn-notice" role="status">
          {ar ? "المحادثة مقفلة أثناء تسجيل الخروج." : "Chat is locked while signing out."}
        </p>
      ) : (
        <OwnerWorkspace key={user.id} userId={user.id} ar={ar} />
      )}
      <footer className="fnn-footer">
        {ar
          ? "مساعدة نصية فقط: لا تنفيذ ذاتي أو نشر أو تعديل للمستودع أو قاعدة البيانات من هذه المحادثة."
          : "Text assistance only: this chat does not execute, deploy or modify repositories or databases."}
      </footer>
    </main>
  );
}
